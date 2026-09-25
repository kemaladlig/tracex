import type { MarketAnalyticsData } from '../types/crypto';
import {
  calculateAtr,
  classifyVolatility,
  fetchMarketBreadth,
  fetchStablecoinLiquidity,
} from './marketConditionsApi';
import { getStorageCacheWithTs, setStorageCache } from './storageCache';
import {
  exponentialMovingAverage,
  relativeStrengthIndex,
} from '../utils/technicalIndicators';

let cachedAnalytics: MarketAnalyticsData | null = null;
let cacheTimestamp = 0;
const DERIVATIVES_MEM_CACHE_MS = 3 * 60 * 1000; // 3 mins memory cache for live futures flow
const MACRO_FNG_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours for Fear & Greed Index (updates only once daily at 00:00 UTC)
const MACRO_MVRV_TTL_MS = 55 * 60 * 1000; // Slightly shorter than the UI refresh interval so each hourly check reaches the source
const MACRO_MVRV_STALE_MS = 3 * 24 * 60 * 60 * 1000; // Allow normal provider lag, but expose genuinely old data
const MACRO_DOMINANCE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours for Global Market Dominance & Cap

type MvrvSource = 'Coin Metrics Community' | 'bitcoin-data.com';

interface MvrvSnapshot {
  value: number;
  observedAt: number;
  source: MvrvSource;
}

interface CoinMetricsMvrvResponse {
  data?: Array<{
    time?: string;
    CapMVRVCur?: string | number;
  }>;
}

type BitcoinDataMvrvResponse = Array<{
  d?: string;
  unixTs?: number;
  mvrv?: string | number;
}>;

const toFiniteNumber = (value: unknown): number | null => {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const isMvrvSnapshot = (value: unknown): value is MvrvSnapshot => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<MvrvSnapshot>;
  return (
    typeof candidate.value === 'number' &&
    Number.isFinite(candidate.value) &&
    typeof candidate.observedAt === 'number' &&
    Number.isFinite(candidate.observedAt) &&
    (candidate.source === 'Coin Metrics Community' || candidate.source === 'bitcoin-data.com')
  );
};

const isMvrvStale = (snapshot: MvrvSnapshot, now: number): boolean =>
  snapshot.observedAt <= 0 || now - snapshot.observedAt > MACRO_MVRV_STALE_MS;

const parseCoinMetricsMvrv = (payload: CoinMetricsMvrvResponse): MvrvSnapshot | null => {
  let latest: MvrvSnapshot | null = null;

  for (const point of payload.data ?? []) {
    const value = toFiniteNumber(point.CapMVRVCur);
    const observedAt = Date.parse(point.time ?? '');
    if (value === null || !Number.isFinite(observedAt)) continue;

    if (!latest || observedAt > latest.observedAt) {
      latest = { value, observedAt, source: 'Coin Metrics Community' };
    }
  }

  return latest;
};

const parseBitcoinDataMvrv = (payload: BitcoinDataMvrvResponse): MvrvSnapshot | null => {
  let latest: MvrvSnapshot | null = null;

  for (const point of payload) {
    const value = toFiniteNumber(point.mvrv);
    const unixObservedAt = typeof point.unixTs === 'number' ? point.unixTs * 1000 : Number.NaN;
    const dateObservedAt = Date.parse(point.d ?? '');
    const observedAt = Number.isFinite(unixObservedAt) ? unixObservedAt : dateObservedAt;
    if (value === null || !Number.isFinite(observedAt)) continue;

    if (!latest || observedAt > latest.observedAt) {
      latest = { value, observedAt, source: 'bitcoin-data.com' };
    }
  }

  return latest;
};

const MVRV_COIN_METRICS_URL =
  'https://community-api.coinmetrics.io/v4/timeseries/asset-metrics?assets=btc&metrics=CapMVRVCur&frequency=1d&page_size=7';
const MVRV_BITCOIN_DATA_URL = 'https://bitcoin-data.com/api/v1/mvrv';

const fetchMvrvSnapshot = async (): Promise<MvrvSnapshot> => {
  const candidates = [MVRV_COIN_METRICS_URL];

  // The dev proxy remains a fallback for localhost, but it is not required for the CORS-enabled primary source.
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    candidates.push('/api/mvrv');
  }
  candidates.push(MVRV_BITCOIN_DATA_URL);

  for (const url of candidates) {
    try {
      const response = await fetch(url);
      if (!response.ok) continue;

      if (url === MVRV_COIN_METRICS_URL) {
        const payload = (await response.json()) as CoinMetricsMvrvResponse;
        const snapshot = parseCoinMetricsMvrv(payload);
        if (snapshot) return snapshot;
      } else {
        const payload = (await response.json()) as BitcoinDataMvrvResponse;
        const snapshot = parseBitcoinDataMvrv(payload);
        if (snapshot) return snapshot;
      }
    } catch {
      // Try the next source.
    }
  }

  throw new Error('No usable MVRV source');
};

/** FNG skorunu etikete çevirir — kartlardaki 4 kutunun her biri kendi değerinden sınıflanmalı. */
export const classifyFng = (v: number): string => {
  if (v >= 75) return 'Aşırı Açgözlülük';
  if (v >= 55) return 'Açgözlülük';
  if (v <= 25) return 'Aşırı Korku';
  if (v <= 45) return 'Korku';
  return 'Nötr';
};

export interface FearGreedSnapshot {
  value: number;
  classification: string;
}

const FNG_QUICK_KEY = 'tracex_fng_quick';
const FNG_QUICK_TTL_MS = 12 * 60 * 60 * 1000;

/**
 * Single latest Fear & Greed value with localStorage TTL cache —
 * lightweight enough for the sidebar mini widget (no full analytics run).
 */
export const fetchFearGreed = async (): Promise<FearGreedSnapshot | null> => {
  try {
    const raw = localStorage.getItem(FNG_QUICK_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.snapshot?.value && Date.now() - (parsed.t ?? 0) < FNG_QUICK_TTL_MS) {
        return parsed.snapshot as FearGreedSnapshot;
      }
    }
  } catch {
    // fall through to network
  }

  try {
    const res = await fetch('https://api.alternative.me/fng/?limit=1');
    const data = await res.json();
    const item = data?.data?.[0];
    if (!item?.value) return null;
    const snapshot: FearGreedSnapshot = {
      value: parseInt(item.value, 10),
      classification: typeof item.value_classification === 'string' ? item.value_classification : classifyFng(parseInt(item.value, 10)),
    };
    try {
      localStorage.setItem(FNG_QUICK_KEY, JSON.stringify({ t: Date.now(), snapshot }));
    } catch {
      // quota — next call refetches
    }
    return snapshot;
  } catch {
    return null;
  }
};

/**
 * Algorithmic Decision Engine
 * Computes dynamic insights and actionable strategies based on live on-chain and derivative inputs.
 * staleCount: çekilemeyen bölüm sayısı arttıkça güven düşer, risk skoru nötre çekilir.
 */
const deriveMarketIntelligence = (
  fng: number,
  lsRatio: number,
  longPct: number,
  shortPct: number,
  fundingRatePct: number,
  mvrvVal: number,
  btcD: number,
  takerRatio: number,
  rsi14: number,
  staleCount: number
) => {
  // 1. Dengeli risk skoru (1-10): aşırı ısınma artırır, dip sinyalleri düşürür.
  // fundingRatePct % birimindedir (örn. 0.01 = %0.01). Eşikler bu birime göredir.
  let riskScore = 5;
  if (fng >= 80) riskScore += 3;
  else if (fng >= 70) riskScore += 1;
  else if (fng <= 20) riskScore += 1; // teslimiyet volatilitesi (eski +2 çok cezalandırıcıydı)

  if (lsRatio > 2.0) riskScore += 2;
  if (fundingRatePct > 0.03) riskScore += 2;
  else if (fundingRatePct > 0.02) riskScore += 1;
  if (rsi14 > 70) riskScore += 1;
  if (mvrvVal > 3.0) riskScore += 2;

  // Fırsat indirimi: dipler riski değil fırsatı gösterir
  if (fng <= 25) riskScore -= 1;
  if (mvrvVal < 1.0) riskScore -= 1;
  if (rsi14 <= 30) riskScore -= 1;
  // Stale girdi varsa skoru nötre çek (aşırı hüküm verme)
  if (staleCount >= 3) riskScore = Math.round((riskScore + 5) / 2);
  riskScore = Math.max(1, Math.min(10, riskScore));

  const confidence: 'low' | 'medium' | 'high' =
    staleCount >= 3 ? 'low' : staleCount >= 1 ? 'medium' : 'high';

  // 2. Makro faz: sinyal birleşimi (confluence) — tek gösterge tek başına hüküm vermez.
  // Dip: korku / MVRV / RSI'dan en az biri ateşlenir, metin SADECE ateşlenenleri sayar.
  // Isınma: aşağıdaki ısı sinyallerinden en az 2'si gerekir (tek başına FNG yetmez).
  const dipSignals: string[] = [];
  if (fng <= 25) dipSignals.push(`Aşırı korku (${fng}/100)`);
  if (mvrvVal < 1.0) dipSignals.push(`MVRV dip (${mvrvVal})`);
  if (rsi14 <= 30) dipSignals.push(`RSI aşırı satım (${rsi14})`);

  const heatSignals: string[] = [];
  if (fng >= 75) heatSignals.push(`Aşırı coşku (${fng}/100)`);
  else if (fng >= 70) heatSignals.push(`Yüksek coşku (${fng}/100)`);
  if (fundingRatePct > 0.02) heatSignals.push(`Fonlama yüksek (%${fundingRatePct})`);
  if (lsRatio > 2.1) heatSignals.push(`Long yığılması (oran ${lsRatio})`);
  if (mvrvVal >= 3.5) heatSignals.push(`MVRV tepe (${mvrvVal})`);
  if (rsi14 >= 70) heatSignals.push(`RSI aşırı alım (${rsi14})`);

  let macroTitle = 'SAĞLIKLI BİRİKTİRME & BOĞA EVRESİ';
  let macroVerdict = 'KONTROLLÜ YÜKSELİŞ // DENGELİ PİYASA';
  let macroStrategy = '';
  let macroSignals: string[] = [];

  if (heatSignals.length >= 2) {
    macroTitle = 'AŞIRI ISINMA // LİKİDASYON RİSKİ';
    macroVerdict = 'DİKKAT // KÂR ALMA BÖLGESİ';
    macroSignals = heatSignals;
    macroStrategy =
      `Ateşlenen sinyaller: ${heatSignals.join(' + ')}. Kaldıraçlı long'ların tasfiye iğnelerine (long squeeze) karşı kaldıraç düşürmek ve kademeli kâr almak tarihsel olarak daha güvenlidir. Yatırım tavsiyesi değildir.`;
  } else if (dipSignals.length > 0) {
    macroTitle = 'AŞIRI KORKU // TESLİMİYET EVRESİ';
    macroVerdict = dipSignals.length >= 2 ? 'GÜÇLÜ DİP SİNYALİ // KADEMELİ DCA' : 'DİP AKÜMÜLASYON FIRSATI';
    macroSignals = dipSignals;
    macroStrategy =
      `Ateşlenen sinyaller: ${dipSignals.join(' + ')}. Panik dönemlerinde tarihsel olarak kademeli DCA öne çıkar; tek seferlik all-in yerine dilimli alım ve stop disiplini önerilir.${dipSignals.length < 2 ? ' Tek sinyal teyitsizdir, acele edilmemelidir.' : ''} Yatırım tavsiyesi değildir.`;
  } else if (fng >= 55) {
    macroTitle = 'KONTROLLÜ BOĞA // AKÜMÜLASYON';
    macroVerdict = 'YÜKSELİŞ TRENDİ KORUNUYOR';
    macroSignals = [`Duyarlılık pozitif (${fng}/100)`, `Fonlama sakin (%${fundingRatePct})`, `MVRV ${mvrvVal}`, `RSI ${rsi14}`];
    macroStrategy =
      `Duyarlılık pozitif (${fng}/100), fonlama (%${fundingRatePct}) patlama seviyesinde değil, MVRV ${mvrvVal} ve RSI ${rsi14} ile tepe ısınması yok. Trend sağlıklı ivmeyle sürüyor; kırılım teyidi olmadan yüksek kaldıraçtan kaçınılmalıdır.`;
  } else {
    macroTitle = 'KONSOLİDASYON // NÖTR DÖNEM';
    macroVerdict = 'YÖN ARAYIŞI & TEST';
    macroSignals = [`FNG ${fng}/100`, `MVRV ${mvrvVal}`, `RSI ${rsi14}`, `Fonlama %${fundingRatePct}`];
    macroStrategy =
      `Piyasa yatay bantta (FNG ${fng}, MVRV ${mvrvVal}, RSI ${rsi14}); ne boğalar ne ayılar tam kontrolde. Kırılım yönü netleşene kadar yüksek kaldıraçtan uzak durulmalı, MVRV ve fonlama birlikte izlenmelidir.`;
  }

  // 3. Long/Short: hesap sayısı bazlı olduğu açıkça belirtilir
  let lsSignal = 'Dengeli Boğa Pozisyonlanması';
  let lsDesc = `Hesap sayısı bazlı: %${longPct} Long, %${shortPct} Short (sermaye büyüklüğü değil, hesap adedi oranıdır).`;
  if (lsRatio > 2.2) {
    lsSignal = 'Tehlikeli Long Yığılması';
    lsDesc += ` Long oranı aşırı kalabalık; ani aşağı iğnelerle long tasfiyesi riski taşır.`;
  } else if (lsRatio < 1.0) {
    lsSignal = 'Ayı Baskısı // Short Squeeze İhtimali';
    lsDesc += ` Short hesaplar üstün; yukarı sürpriz sert short squeeze tetikleyebilir.`;
  } else {
    lsDesc += ' Türev piyasada sağlıklı yön dengesi var, ani tasfiye riski düşük.';
  }

  // 4. Funding yorumu (% biriminde)
  let fundingStatus: 'bullish' | 'neutral' | 'overheated' | 'bearish' = 'bullish';
  let fundingInterp = '';
  if (fundingRatePct > 0.03) {
    fundingStatus = 'overheated';
    fundingInterp =
      `Fonlama kritik eşiğin üstünde (%${fundingRatePct}, 8 saatte bir ödenir). Long açanlar yüksek prim ödüyor; kaldıraç şişkin, düzeltme ihtimali var.`;
  } else if (fundingRatePct > 0.01) {
    fundingStatus = 'bullish';
    fundingInterp =
      `Long'lar Short'lara prim ödüyor (%${fundingRatePct}, 8 saatte bir). Yükseliş beklentisi var, ısınma kritik değil.`;
  } else if (fundingRatePct > 0) {
    fundingStatus = 'neutral';
    fundingInterp =
      `Fonlama hafif pozitif (%${fundingRatePct}, 8 saatte bir). Yönsüz-sakin türev iştahı; tek başına sinyal üretmez.`;
  } else {
    fundingStatus = 'bearish';
    fundingInterp =
      `Fonlama negatif (%${fundingRatePct}). Short'lar prim ödüyor; piyasa temkinli veya düşüş bekliyor.`;
  }

  // 5. MVRV yorumu (1.0 altı dip, 3.5 üstü tepe)
  let mvrvStatus: 'dip' | 'fair' | 'heated' = 'fair';
  let mvrvInterp = '';
  let mvrvLabel = '';
  if (mvrvVal < 1.0) {
    mvrvStatus = 'dip';
    mvrvLabel = `TARİHİ DİP BÖLGESİ (${mvrvVal})`;
    mvrvInterp =
      `MVRV ${mvrvVal} (1.0 altında): Çoğunluk zararda. Tarihsel döngü dipleri genelde bu bölgede oluşur; kademeli birikim alanı olarak izlenir.`;
  } else if (mvrvVal >= 3.5) {
    mvrvStatus = 'heated';
    mvrvLabel = `BOĞA TEPESİ / AŞIRI ISINMA (${mvrvVal})`;
    mvrvInterp =
      `MVRV ${mvrvVal} (3.5 üzerinde): Cüzdanlar yüksek kârda. Tarihsel tepeler bu seviyelerde oluşur; kademeli kâr satışı gündeme gelir.`;
  } else {
    mvrvStatus = 'fair';
    mvrvLabel = `DÖNGÜ ORTASI SAĞLIKLI BÖLGE (${mvrvVal})`;
    mvrvInterp =
      `MVRV ${mvrvVal} ile döngünün orta aşamasında (1.0 - 3.5 bandı). Tepe ısınması görülmüyor; kâr realizasyonu için erken evre.`;
  }

  // 6. Dominance yorumu (stablecoin notu ile)
  let domInterp = '';
  if (btcD > 58) {
    domInterp = `Bitcoin payı (%${btcD}) yüksek. Likidite BTC'ye sığınıyor; altcoin rallisi için hakimiyetin gerilemesi beklenir. "Diğerleri" dilimi stablecoin'leri de içerir, tek başına alt-sezon sinyali değildir.`;
  } else if (btcD < 45) {
    domInterp = `Bitcoin hakimiyeti %${btcD} seviyesinde. Sermaye altcoin'lere akıyor; altcoin sezonuna benzer yapı var (stablecoin etkisi hariç tutulmalıdır).`;
  } else {
    domInterp = `Bitcoin hakimiyeti %${btcD} ile dengeli. Majörler ve BTC eşzamanlı hareket ediyor.`;
  }

  // 7. Taker sinyali
  let takerSignal = 'Dengeli İşlem Hacmi';
  if (takerRatio > 1.15) {
    takerSignal = `Alıcı Baskısı (Oran: ${takerRatio})`;
  } else if (takerRatio < 0.9) {
    takerSignal = `Satıcı Baskısı (Oran: ${takerRatio})`;
  } else {
    takerSignal = `Alıcı / Satıcı Dengede (${takerRatio})`;
  }

  // 8. RSI yorumu
  let rsiStatus: 'oversold' | 'neutral' | 'overbought' = 'neutral';
  let rsiLabel = `Nötr Bölge (${rsi14})`;
  if (rsi14 <= 30) {
    rsiStatus = 'oversold';
    rsiLabel = `Aşırı Satım / İndirim (${rsi14})`;
  } else if (rsi14 >= 70) {
    rsiStatus = 'overbought';
    rsiLabel = `Aşırı Alım / Şişkin (${rsi14})`;
  }

  return {
    macroPhase: {
      title: macroTitle,
      riskScore,
      verdict: macroVerdict,
      strategy: macroStrategy,
      confidence,
      signals: macroSignals,
    },
    longShortRatio: {
      longPercent: longPct,
      shortPercent: shortPct,
      ratio: lsRatio,
      signal: lsSignal,
      description: lsDesc,
    },
    fundingRate: {
      ratePercent: fundingRatePct,
      intervalLabel: `8 saatte bir %${fundingRatePct}`,
      status: fundingStatus,
      interpretation: fundingInterp,
    },
    mvrvRatio: {
      value: mvrvVal,
      status: mvrvStatus,
      label: mvrvLabel,
      interpretation: mvrvInterp,
    },
    domInterp,
    takerSignal,
    rsiStatus,
    rsiLabel,
  };
};

interface CachedFngPayload {
  currentFng: number;
  fngYesterday: number;
  fngLastWeek: number;
  fngLastMonth: number;
  fngClass: string;
  fngHistory: { date: string; value: number }[];
}

interface CachedDominancePayload {
  btcD: number;
  ethD: number;
  altD: number;
  totalMcapTrillion: number;
  mcapChange24h: number;
  volume24hBillion: number;
}

export const fetchComprehensiveAnalytics = async (forceFresh: boolean = false): Promise<MarketAnalyticsData> => {
  const now = Date.now();
  if (!forceFresh && cachedAnalytics && now - cacheTimestamp < DERIVATIVES_MEM_CACHE_MS) {
    return cachedAnalytics;
  }

  // Pazar genişliği ve stablecoin likiditesi diğer kaynaklarla paralel hazırlanır.
  const marketConditionsPromise = Promise.all([
    fetchMarketBreadth(forceFresh),
    fetchStablecoinLiquidity(forceFresh),
  ]);

  // 1. Fear & Greed (12h macro cache)
  let currentFng = 51;
  let fngYesterday = 69;
  let fngLastWeek = 63;
  let fngLastMonth = 58;
  let fngClass = 'Nötr';
  let fngHistory: { date: string; value: number }[] = [];
  let fngFresh = false;
  let fngTs = 0;

  const storedFng = !forceFresh ? getStorageCacheWithTs<CachedFngPayload>('fng', MACRO_FNG_TTL_MS) : null;
  if (storedFng) {
    currentFng = storedFng.data.currentFng;
    fngYesterday = storedFng.data.fngYesterday;
    fngLastWeek = storedFng.data.fngLastWeek;
    fngLastMonth = storedFng.data.fngLastMonth;
    fngClass = storedFng.data.fngClass;
    fngHistory = storedFng.data.fngHistory;
    fngFresh = true; // önbellek kabul edilebilir yaştaysa taze sayılır
    fngTs = storedFng.timestamp;
  } else {
    try {
      const res = await fetch('https://api.alternative.me/fng/?limit=31');
      if (res.ok) {
        const data = await res.json();
        if (data && data.data && Array.isArray(data.data)) {
          const rawItems = data.data;
          const latest = rawItems[0];
          currentFng = parseInt(latest.value, 10);
          if (rawItems[1]) fngYesterday = parseInt(rawItems[1].value, 10);
          if (rawItems[7]) fngLastWeek = parseInt(rawItems[7].value, 10);
          if (rawItems[30]) fngLastMonth = parseInt(rawItems[30].value, 10);

          fngClass = classifyFng(currentFng);

          // 14 days trend
          const trendSlice = rawItems.slice(0, 14);
          for (let i = trendSlice.length - 1; i >= 0; i--) {
            const item = trendSlice[i];
            const d = new Date(parseInt(item.timestamp, 10) * 1000);
            fngHistory.push({
              date: `${d.getDate()}/${d.getMonth() + 1}`,
              value: parseInt(item.value, 10),
            });
          }

          setStorageCache<CachedFngPayload>('fng', {
            currentFng,
            fngYesterday,
            fngLastWeek,
            fngLastMonth,
            fngClass,
            fngHistory,
          });
          fngFresh = true;
          fngTs = Date.now();
        }
      }
    } catch (err) {
      console.warn('Alternative.me API fallback:', err);
    }

    if (fngHistory.length === 0) {
      const defaults = [52, 54, 58, 61, 65, 60, 58, 63, 67, 70, 68, 72, 69, 51];
      defaults.forEach((val, idx) => {
        fngHistory.push({ date: `G-${14 - idx}`, value: val });
      });
    }
  }

  // 2. Binance Global Long/Short Ratio (hesap sayısı bazlı) + 5dk trend
  let longPct = 63.8;
  let shortPct = 36.2;
  let lsRatio = 1.76;
  let lsTrendDelta: number | undefined = undefined;
  let lsFresh = false;
  let lsTs = 0;

  try {
    const lsRes = await fetch(
      'https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=BTCUSDT&period=1d&limit=1'
    );
    if (lsRes.ok) {
      const lsData = await lsRes.json();
      if (Array.isArray(lsData) && lsData[0]) {
        longPct = parseFloat((parseFloat(lsData[0].longAccount) * 100).toFixed(1));
        shortPct = parseFloat((parseFloat(lsData[0].shortAccount) * 100).toFixed(1));
        lsRatio = parseFloat(parseFloat(lsData[0].longShortRatio).toFixed(2));
        lsFresh = true;
        lsTs = Date.now();
      }
    }
    // Trend: son 30 x 5dk snapshot
    try {
      const trendRes = await fetch(
        'https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=BTCUSDT&period=5m&limit=30'
      );
      if (trendRes.ok) {
        const trendData = await trendRes.json();
        if (Array.isArray(trendData) && trendData.length >= 2) {
          const first = parseFloat(trendData[0].longShortRatio);
          const last = parseFloat(trendData[trendData.length - 1].longShortRatio);
          if (Number.isFinite(first) && Number.isFinite(last)) {
            lsTrendDelta = parseFloat((last - first).toFixed(2));
          }
        }
      }
    } catch {
      // trend opsiyonel, ana değer etkilenmez
    }
  } catch (err) {
    console.warn('Binance Long/Short API fallback:', err);
  }

  // 3. Binance Funding Rate (% biriminde)
  let fundingRatePercent = 0.0058;
  let fundingFresh = false;
  let fundingTs = 0;
  try {
    const fundRes = await fetch('https://fapi.binance.com/fapi/v1/fundingRate?symbol=BTCUSDT&limit=1');
    if (fundRes.ok) {
      const fundData = await fundRes.json();
      if (Array.isArray(fundData) && fundData[0]) {
        fundingRatePercent = parseFloat((parseFloat(fundData[0].fundingRate) * 100).toFixed(4));
        fundingFresh = true;
        fundingTs = Date.now();
      }
    }
  } catch (err) {
    console.warn('Binance Funding Rate API fallback:', err);
  }

  // 4. Bitcoin MVRV (Coin Metrics primary; hourly cache and source-date freshness)
  const storedMvrv = getStorageCacheWithTs<unknown>('mvrv-v2', MACRO_MVRV_TTL_MS);
  const cachedMvrv = storedMvrv && isMvrvSnapshot(storedMvrv.data) ? storedMvrv.data : null;
  let mvrvSnapshot = forceFresh ? null : cachedMvrv;

  if (forceFresh || mvrvSnapshot === null || isMvrvStale(mvrvSnapshot, now)) {
    try {
      const fetchedSnapshot = await fetchMvrvSnapshot();
      mvrvSnapshot = {
        ...fetchedSnapshot,
        value: parseFloat(fetchedSnapshot.value.toFixed(2)),
      };
      setStorageCache<MvrvSnapshot>('mvrv-v2', mvrvSnapshot);
    } catch (err) {
      mvrvSnapshot = cachedMvrv;
      console.warn('MVRV fetch fallback:', err);
    }
  }

  const mvrvVal = mvrvSnapshot?.value ?? 1.48;
  const mvrvFresh = mvrvSnapshot !== null && !isMvrvStale(mvrvSnapshot, now);
  const mvrvTs = mvrvSnapshot?.observedAt ?? 0;
  const mvrvSource = mvrvSnapshot?.source ?? 'MVRV kaynağı yok';

  // 5. Coinlore Global Dominance (birincil) + CoinGecko (yedek)
  let btcD = 59.04;
  let ethD = 11.46;
  let altD = 29.5;
  let totalMcapTrillion = 2.57;
  let mcapChange24h = -2.85;
  let volume24hBillion = 148.6;
  let domFresh = false;
  let domTs = 0;

  const storedDom = !forceFresh ? getStorageCacheWithTs<CachedDominancePayload>('dominance', MACRO_DOMINANCE_TTL_MS) : null;
  if (storedDom) {
    btcD = storedDom.data.btcD;
    ethD = storedDom.data.ethD;
    altD = storedDom.data.altD;
    totalMcapTrillion = storedDom.data.totalMcapTrillion;
    mcapChange24h = storedDom.data.mcapChange24h;
    volume24hBillion = storedDom.data.volume24hBillion;
    domFresh = true;
    domTs = storedDom.timestamp;
  } else {
    let ok = false;
    try {
      const clRes = await fetch('https://api.coinlore.net/api/global/');
      if (clRes.ok) {
        const clData = await clRes.json();
        if (Array.isArray(clData) && clData[0]) {
          const item = clData[0];
          btcD = parseFloat(parseFloat(item.btc_d).toFixed(2));
          ethD = parseFloat(parseFloat(item.eth_d).toFixed(2));
          altD = parseFloat((100 - (btcD + ethD)).toFixed(2));
          totalMcapTrillion = parseFloat((item.total_mcap / 1e12).toFixed(2));
          mcapChange24h = parseFloat(parseFloat(item.mcap_change).toFixed(2));
          volume24hBillion = parseFloat((item.total_volume / 1e9).toFixed(1));
          ok = true;
        }
      }
    } catch (err) {
      console.warn('Coinlore Global API fallback:', err);
    }
    if (!ok) {
      try {
        const gRes = await fetch('https://api.coingecko.com/api/v3/global');
        if (gRes.ok) {
          const g = await gRes.json();
          const d = g?.data;
          if (d?.market_cap_percentage?.btc != null) {
            btcD = parseFloat(Number(d.market_cap_percentage.btc).toFixed(2));
            ethD = parseFloat(Number(d.market_cap_percentage.eth ?? 0).toFixed(2));
            altD = parseFloat((100 - (btcD + ethD)).toFixed(2));
            totalMcapTrillion = parseFloat((Number(d.total_market_cap?.usd ?? 0) / 1e12).toFixed(2));
            mcapChange24h = parseFloat(Number(d.market_cap_change_percentage_24h_usd ?? 0).toFixed(2));
            volume24hBillion = parseFloat((Number(d.total_volume?.usd ?? 0) / 1e9).toFixed(1));
            ok = true;
          }
        }
      } catch (err) {
        console.warn('CoinGecko Global API fallback:', err);
      }
    }
    if (ok) {
      domFresh = true;
      domTs = Date.now();
      setStorageCache<CachedDominancePayload>('dominance', {
        btcD,
        ethD,
        altD,
        totalMcapTrillion,
        mcapChange24h,
        volume24hBillion,
      });
    }
  }

  // 6. Binance Taker Buy/Sell Volume
  let takerBuyVol = 116080;
  let takerSellVol = 122154;
  let takerRatio = 0.95;
  let takerFresh = false;
  let takerTs = 0;

  try {
    const takerRes = await fetch(
      'https://fapi.binance.com/futures/data/takerlongshortRatio?symbol=BTCUSDT&period=1d&limit=1'
    );
    if (takerRes.ok) {
      const takerData = await takerRes.json();
      if (Array.isArray(takerData) && takerData[0]) {
        takerBuyVol = Math.round(parseFloat(takerData[0].buyVol));
        takerSellVol = Math.round(parseFloat(takerData[0].sellVol));
        takerRatio = parseFloat(parseFloat(takerData[0].buySellRatio).toFixed(2));
        takerFresh = true;
        takerTs = Date.now();
      }
    }
  } catch (err) {
    console.warn('Binance Taker Volume API fallback:', err);
  }
  const totalTaker = Math.max(1, takerBuyVol + takerSellVol);
  const buyPercent = parseFloat(((takerBuyVol / totalTaker) * 100).toFixed(1));
  const sellPercent = parseFloat((100 - buyPercent).toFixed(1));

  // 7. Binance Open Interest
  let oiBtc = 107491;
  let oiUsdBillion = 8.12;
  let oiChangeMillion = 33.5;
  let oiFresh = false;
  let oiTs = 0;

  try {
    const oiRes = await fetch(
      'https://fapi.binance.com/futures/data/openInterestHist?symbol=BTCUSDT&period=1d&limit=2'
    );
    if (oiRes.ok) {
      const oiData = await oiRes.json();
      if (Array.isArray(oiData) && oiData.length >= 2) {
        const prev = oiData[0];
        const curr = oiData[1];
        oiBtc = Math.round(parseFloat(curr.sumOpenInterest));
        oiUsdBillion = parseFloat((parseFloat(curr.sumOpenInterestValue) / 1e9).toFixed(2));
        const prevVal = parseFloat(prev.sumOpenInterestValue);
        const currVal = parseFloat(curr.sumOpenInterestValue);
        oiChangeMillion = parseFloat(((currVal - prevVal) / 1e6).toFixed(1));
        oiFresh = true;
        oiTs = Date.now();
      }
    }
  } catch (err) {
    console.warn('Binance Open Interest API fallback:', err);
  }

  // 8. Binance Spot Klines: RSI14 + SMA20 + EMA50 + SMA200 (günlük, 210 mum)
  let btcCurrentPrice = 75900;
  let sma20Price = 78200;
  let ema50Price: number | undefined = undefined;
  let sma200Price: number | undefined = undefined;
  let crossSignal: string | undefined = undefined;
  let priceChange24hPct = 0;
  let rsi14 = 44.8;
  let atr14 = btcCurrentPrice * 0.025;
  let atrPercent = 2.5;
  let klinesFresh = false;
  let klinesTs = 0;

  try {
    const klineRes = await fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=210');
    if (klineRes.ok) {
      const klineData = await klineRes.json();
      if (Array.isArray(klineData) && klineData.length >= 15) {
        const closes: number[] = klineData.map((k: (string | number)[]) => parseFloat(k[4] as string));
        btcCurrentPrice = closes[closes.length - 1];
        rsi14 = relativeStrengthIndex(closes, 14) ?? 50;
        const calculatedAtr = calculateAtr(klineData, 14);
        if (calculatedAtr !== null) {
          atr14 = calculatedAtr;
          atrPercent = Number(((calculatedAtr / btcCurrentPrice) * 100).toFixed(2));
        }

        const last20 = closes.slice(-20);
        sma20Price = Math.round(last20.reduce((a, b) => a + b, 0) / last20.length);
        ema50Price = Math.round(exponentialMovingAverage(closes, 50) ?? 0);
        if (closes.length >= 200) {
          const last200 = closes.slice(-200);
          sma200Price = Math.round(last200.reduce((a, b) => a + b, 0) / last200.length);
          crossSignal =
            ema50Price > sma200Price
              ? `Golden Cross yapısı (EMA50 > SMA200)`
              : `Death Cross yapısı (EMA50 < SMA200)`;
        }
        if (closes.length >= 2) {
          const prev = closes[closes.length - 2];
          priceChange24hPct = parseFloat((((btcCurrentPrice - prev) / prev) * 100).toFixed(2));
        }
        klinesFresh = true;
        klinesTs = Date.now();
      }
    }
  } catch (err) {
    console.warn('Binance Spot Klines API fallback:', err);
  }

  const priceDiffPct = parseFloat((((btcCurrentPrice - sma20Price) / sma20Price) * 100).toFixed(1));
  const trendLabel =
    priceDiffPct >= 0
      ? `Fiyat 20G ortalamanın %${priceDiffPct} üzerinde (Pozitif eğilim)`
      : `Fiyat 20G ortalamanın %${Math.abs(priceDiffPct)} altında (Kısa vadeli baskı)`;

  const [marketBreadth, stablecoinLiquidity] = await marketConditionsPromise;
  const volatilityRegime = classifyVolatility(atrPercent);
  const trendPositive = priceDiffPct > 0 && btcCurrentPrice > (ema50Price ?? sma20Price);
  const trendRisk = priceDiffPct <= -3;
  const breadthPositive = marketBreadth.aboveSma20Percent >= 55 && marketBreadth.aboveSma50Percent >= 45;
  const breadthRisk = marketBreadth.aboveSma20Percent < 40 || marketBreadth.aboveSma50Percent < 35;
  const volatilityPositive = volatilityRegime.status === 'calm' || volatilityRegime.status === 'normal';
  const volatilityRisk = volatilityRegime.status === 'high';
  const liquidityPositive = stablecoinLiquidity.change30dPercent >= 0;
  const liquidityRisk = stablecoinLiquidity.status === 'contracting';
  const positiveChecks = [trendPositive, breadthPositive, volatilityPositive, liquidityPositive].filter(Boolean).length;
  const riskChecks = [trendRisk, breadthRisk, volatilityRisk, liquidityRisk].filter(Boolean).length;

  let marketGateStatus: MarketAnalyticsData['marketGate']['status'] = 'caution';
  if (volatilityRisk || riskChecks >= 2) marketGateStatus = 'risk';
  else if (trendRisk && riskChecks >= 1) marketGateStatus = 'wait';
  else if (positiveChecks >= 3) marketGateStatus = 'open';

  const marketGateSummary = {
    open: 'Trend, pazar katılımı ve risk sınırları birlikte olumlu. İşlemlerde kaldıracı kontrollü tut ve yön teyidini sürdür.',
    caution: 'Sinyallerin bir kısmı olumlu, bir kısmı temkinli. Yeni pozisyonlarda kademe ve teyit daha önemli.',
    risk: 'Volatilite veya pazar yapısı risk eşiğinde. Kaldıraç düşürmek ve ani ters yönlere hazırlık öne çıkar.',
    wait: 'Trend baskısı risk göstergeleriyle birlikte ilerliyor. Yeni yön arayışında teyit beklenmeli.',
  }[marketGateStatus];
  const marketGateLabel = {
    open: 'PİYASA AÇIK',
    caution: 'TEMKİNLİ İŞLEM',
    risk: 'YÜKSEK RİSK',
    wait: 'TEYİT BEKLE',
  }[marketGateStatus];

  // OI x fiyat birleşimi: OI artışı tek başına "fon girdi" demek değildir
  let oiBias: 'long-buildup' | 'short-buildup' | 'unwinding' | 'neutral' = 'neutral';
  if (oiChangeMillion > 0 && priceChange24hPct > 0.3) oiBias = 'long-buildup';
  else if (oiChangeMillion > 0 && priceChange24hPct < -0.3) oiBias = 'short-buildup';
  else if (oiChangeMillion < 0) oiBias = 'unwinding';
  const oiInterpretation =
    oiBias === 'long-buildup'
      ? `OI +$${oiChangeMillion}M ve fiyat %${priceChange24hPct} yukarıda: yeni long birikimi, trend destekleniyor ama squeeze riski artar.`
      : oiBias === 'short-buildup'
        ? `OI +$${oiChangeMillion}M ama fiyat %${priceChange24hPct} aşağıda: yeni short birikimi; yukarı sürpriz short squeeze tetikleyebilir.`
        : oiBias === 'unwinding'
          ? `Vadeli piyasadan -$${Math.abs(oiChangeMillion)}M pozisyon kapandı. Kaldıraç çözülüyor, volatilite sönümlenebilir.`
          : `OI yatay (+$${oiChangeMillion}M). Yeni pozisyonlanma sınırlı, yön teyidi için fiyatla birlikte izlenmeli.`;

  const staleSections: string[] = [];
  if (!fngFresh) staleSections.push('duygu');
  if (!domFresh) staleSections.push('dominance');
  if (!mvrvFresh) staleSections.push('mvrv');
  if (!lsFresh) staleSections.push('long/short');
  if (!fundingFresh) staleSections.push('fonlama');
  if (!takerFresh) staleSections.push('taker');
  if (!oiFresh) staleSections.push('open-interest');
  if (!klinesFresh) staleSections.push('teknik');
  if (marketBreadth.freshness.isStale) staleSections.push('pazar genişliği');
  if (stablecoinLiquidity.freshness.isStale) staleSections.push('likidite');

  // Run the dynamic intelligence engine
  const derived = deriveMarketIntelligence(
    currentFng,
    lsRatio,
    longPct,
    shortPct,
    fundingRatePercent,
    mvrvVal,
    btcD,
    takerRatio,
    rsi14,
    staleSections.length
  );

  const result: MarketAnalyticsData = {
    meta: {
      updatedAt: now,
      isPartiallyStale: staleSections.length > 0,
      staleSections,
    },
    macroPhase: derived.macroPhase,
    fearAndGreed: {
      current: currentFng,
      classification: fngClass,
      yesterday: fngYesterday,
      lastWeek: fngLastWeek,
      lastMonth: fngLastMonth,
      history: fngHistory,
      freshness: { isStale: !fngFresh, updatedAt: fngTs, source: 'Alternative.me' },
    },
    marketDominance: {
      btcD,
      ethD,
      altD,
      totalMarketCapUsd: totalMcapTrillion,
      mcapChange24h,
      totalVolume24hUsd: volume24hBillion,
      interpretation: derived.domInterp,
      freshness: { isStale: !domFresh, updatedAt: domTs, source: 'Coinlore + CoinGecko yedek' },
    },
    longShortRatio: { ...derived.longShortRatio, trendDelta: lsTrendDelta, freshness: { isStale: !lsFresh, updatedAt: lsTs, source: 'Binance Futures (hesap bazlı)' } },
    fundingRate: { ...derived.fundingRate, freshness: { isStale: !fundingFresh, updatedAt: fundingTs, source: 'Binance Futures' } },
    mvrvRatio: { ...derived.mvrvRatio, freshness: { isStale: !mvrvFresh, updatedAt: mvrvTs, source: mvrvSource } },
    takerVolume: {
      buyVolBtc: takerBuyVol,
      sellVolBtc: takerSellVol,
      buyPercent,
      sellPercent,
      ratio: takerRatio,
      signal: derived.takerSignal,
      freshness: { isStale: !takerFresh, updatedAt: takerTs, source: 'Binance Futures' },
    },
    openInterest: {
      amountBtc: oiBtc,
      valueUsd: oiUsdBillion,
      change24hUsd: oiChangeMillion,
      interpretation: oiFresh ? oiInterpretation : `${oiInterpretation} (Canlı OI çekilemedi, son bilinen değer gösteriliyor.)`,
      bias: oiBias,
      freshness: { isStale: !oiFresh, updatedAt: oiTs, source: 'Binance Futures' },
    },
    technicalIndicator: {
      symbol: 'BTC/USDT',
      rsi14,
      rsiStatus: derived.rsiStatus,
      rsiLabel: derived.rsiLabel,
      sma20Price,
      ema50Price,
      sma200Price,
      crossSignal,
      currentPrice: btcCurrentPrice,
      trendLabel,
      freshness: { isStale: !klinesFresh, updatedAt: klinesTs, source: 'Binance Spot (günlük kapanış)' },
    },
    marketBreadth,
    volatilityRegime: {
      atr14: Math.round(atr14),
      atrPercent,
      ...volatilityRegime,
      freshness: { isStale: !klinesFresh, updatedAt: klinesTs, source: 'Binance Spot (günlük ATR14)' },
    },
    stablecoinLiquidity,
    marketGate: {
      status: marketGateStatus,
      label: marketGateLabel,
      score: positiveChecks - riskChecks,
      summary: marketGateSummary,
      positiveChecks,
      riskChecks,
    },
  };

  cachedAnalytics = result;
  cacheTimestamp = now;
  return result;
};
