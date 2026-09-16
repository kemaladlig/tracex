import type { MarketAnalyticsData } from '../types/crypto';

let cachedAnalytics: MarketAnalyticsData | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION_MS = 60 * 1000; // 1 minute cache

let cachedMvrv: number = 1.48;
let lastMvrvFetchTime = 0;
const MVRV_CACHE_MS = 30 * 60 * 1000; // 30 mins macro cache to respect rate limits

/**
 * Standard Wilder's RSI calculation from candle closes
 */
const computeRSI = (closes: number[], period: number = 14): number => {
  if (closes.length <= period) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) {
      avgGain = (avgGain * (period - 1) + diff) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.abs(diff)) / period;
    }
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return parseFloat((100 - 100 / (1 + rs)).toFixed(1));
};

/**
 * Algorithmic Decision Engine
 * Computes dynamic insights and actionable strategies based on live on-chain and derivative inputs.
 */
const deriveMarketIntelligence = (
  fng: number,
  lsRatio: number,
  longPct: number,
  shortPct: number,
  fundingRate: number,
  mvrvVal: number,
  btcD: number,
  takerRatio: number,
  rsi14: number
) => {
  // 1. Calculate dynamic risk score (1 to 10)
  let riskScore = 4;
  if (fng >= 80) riskScore += 3;
  else if (fng >= 70) riskScore += 1;
  else if (fng <= 20) riskScore += 2; // Capitulation volatility

  if (lsRatio > 2.0) riskScore += 2;
  if (fundingRate > 0.025) riskScore += 2;
  if (rsi14 > 70) riskScore += 1;
  if (mvrvVal > 3.0) riskScore += 2;
  riskScore = Math.max(1, Math.min(10, riskScore));

  // 2. Derive Macro Phase & Strategy dynamically
  let macroTitle = 'SAĞLIKLI BİRİKTİRME & BOĞA EVRESİ';
  let macroVerdict = 'KONTROLLÜ YÜKSELİŞ // DENGELİ PİYASA';
  let macroStrategy = '';

  if (fng <= 25) {
    macroTitle = '⚠️ AŞIRI KORKU & TESLİMİYET EVRESİ';
    macroVerdict = 'DİP AKÜMÜLASYON FIRSATI';
    macroStrategy =
      `Korku endeksi dip seviyede (${fng}/100). Yatırımcılar panik halindeyken tarihsel olarak akıllı sermaye bu bölgelerde kademeli DCA alımları yapar.`;
  } else if (fng >= 75 && (fundingRate > 0.02 || lsRatio > 2.1)) {
    macroTitle = '🔥 AŞIRI ISINMA & LİKİDASYON RİSKİ';
    macroVerdict = 'DİKKAT // KÂR ALMA BÖLGESİ';
    macroStrategy =
      `Piyasada aşırı coşku (${fng}/100) ve Long pozisyon yığılması var. Borsaların kaldıraçlı hesapları temizlemek için sert aşağı iğneler (Long Squeeze) atma riski çok yüksek.`;
  } else if (fng >= 55) {
    macroTitle = '🟢 KONTROLLÜ BOĞA & AKÜMÜLASYON';
    macroVerdict = 'YÜKSELİŞ TRENDİ KORUNUYOR';
    macroStrategy =
      `Piyasa duyarlılığı pozitif (${fng}/100), türev fonlama oranları (%${fundingRate}) henüz patlama seviyesinde değil. Trend yukarı yönlü sağlıklı bir ivmeyle devam ediyor.`;
  } else {
    macroTitle = '⚖️ NÖTR KONSOLİDASYON DÖNEMİ';
    macroVerdict = 'YÖN ARAYIŞI & TEST';
    macroStrategy =
      `Piyasa kararsız bir yatay bantta seyrediyor. Ne boğalar ne de ayılar tam kontrolü ele geçirebilmiş değil. Kırılım yönü netleşene kadar yüksek kaldıraçtan uzak durulmalıdır.`;
  }

  // 3. Dynamic Long/Short interpretation
  let lsSignal = 'Dengeli Boğa Pozisyonlanması';
  let lsDesc = `Hesapların %${longPct}'i Long, %${shortPct}'i Short pozisyonda.`;
  if (lsRatio > 2.2) {
    lsSignal = '⚠️ Tehlikeli Long Yığılması';
    lsDesc = `Long oranı %${longPct} ile aşırı kalabalık. Ani aşağı iğnelerle (Flash Crash) long tasfiyesi yaratma riski taşır.`;
  } else if (lsRatio < 1.0) {
    lsSignal = '⚡ Ayı Baskısı & Short Squeeze İhtimali';
    lsDesc = `Short pozisyonlar (%${shortPct}) üstünlük kurmuş durumda. Beklenmedik bir yukarı hareket sert bir Short Squeeze tetikleyebilir.`;
  } else {
    lsDesc += ' Türev piyasada sağlıklı bir yön dengesi var, ani tasfiye riski düşük.';
  }

  // 4. Dynamic Funding Rate interpretation
  let fundingStatus: 'bullish' | 'neutral' | 'overheated' | 'bearish' = 'bullish';
  let fundingInterp = '';
  if (fundingRate > 0.03) {
    fundingStatus = 'overheated';
    fundingInterp =
      `Fonlama oranı kritik eşiğin üstünde (%${fundingRate}). Long açanlar yüksek prim ödüyor; kaldıraç şişkin, ani düzeltme ihtimali var.`;
  } else if (fundingRate > 0) {
    fundingStatus = 'bullish';
    fundingInterp =
      `Long pozisyonlar Short pozisyonlara prim ödüyor (%${fundingRate}). Yükseliş beklentisi var ancak piyasa aşırı ısınmış değil.`;
  } else {
    fundingStatus = 'bearish';
    fundingInterp =
      `Fonlama negatif (%${fundingRate}). Short pozisyonlar prim ödüyor; piyasa aşırı temkinli veya düşüş bekliyor.`;
  }

  // 5. Dynamic MVRV interpretation
  let mvrvStatus: 'dip' | 'fair' | 'heated' = 'fair';
  let mvrvInterp = '';
  if (mvrvVal < 1.0) {
    mvrvStatus = 'dip';
    mvrvInterp =
      `MVRV ${mvrvVal} (1.0 altında): Yatırımcıların büyük çoğunluğu zararda. Tarihsel büyük döngü dipleri bu bölgede oluşur.`;
  } else if (mvrvVal >= 3.5) {
    mvrvStatus = 'heated';
    mvrvInterp =
      `MVRV ${mvrvVal} (3.5 üzerinde): Cüzdanlar devasa kârda. Tarihsel boğa tepeleri bu seviyelerde oluşur; kademeli kâr satışı için uygundur.`;
  } else {
    mvrvStatus = 'fair';
    mvrvInterp =
      `MVRV ${mvrvVal} ile döngünün orta aşamasında (1.0 - 2.5 bandı). Boğa tepesi aşırı ısınması görülmüyor; kâr realizasyonu için erken bir evredeyiz.`;
  }

  // 6. Dynamic Market Dominance interpretation
  let domInterp = '';
  if (btcD > 58) {
    domInterp = `Bitcoin pazar payı (%${btcD}) çok yüksek. Likidite altcoinlerden çekilip BTC'ye sığınıyor. Altcoin rallisi için BTC hakimiyetinin gerilemesi beklenir.`;
  } else if (btcD < 45) {
    domInterp = `Bitcoin hakimiyeti %${btcD} seviyesine gerilemiş durumda. Sermaye altcoinlere akıyor; tam teşekküllü bir Altcoin Sezonu yaşanıyor.`;
  } else {
    domInterp = `Bitcoin hakimiyeti %${btcD} ile dengeli seviyede. Hem majör kripto paralar hem de Bitcoin eşzamanlı hareket ediyor.`;
  }

  // 7. Dynamic Taker Volume signal
  let takerSignal = 'Dengeli İşlem Hacmi';
  if (takerRatio > 1.15) {
    takerSignal = `🟢 Alıcılar Agresif (Oran: ${takerRatio})`;
  } else if (takerRatio < 0.9) {
    takerSignal = `🔴 Satıcılar Agresif (Oran: ${takerRatio})`;
  } else {
    takerSignal = `⚖️ Alıcı / Satıcı Dengede (${takerRatio})`;
  }

  // 8. Dynamic Technical RSI interpretation
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
    },
    longShortRatio: {
      longPercent: longPct,
      shortPercent: shortPct,
      ratio: lsRatio,
      signal: lsSignal,
      description: lsDesc,
    },
    fundingRate: {
      ratePercent: fundingRate,
      hourlyCost: `8 Saatte bir %${fundingRate}`,
      status: fundingStatus,
      interpretation: fundingInterp,
    },
    mvrvRatio: {
      value: mvrvVal,
      status: mvrvStatus,
      label: mvrvVal < 1.2 ? `TARİHİ DİP BÖLGESİ (${mvrvVal})` : `DÖNGÜ ORTASI SAĞLIKLI BÖLGE (${mvrvVal})`,
      interpretation: mvrvInterp,
    },
    domInterp,
    takerSignal,
    rsiStatus,
    rsiLabel,
  };
};

export const fetchComprehensiveAnalytics = async (): Promise<MarketAnalyticsData> => {
  const now = Date.now();
  if (cachedAnalytics && now - cacheTimestamp < CACHE_DURATION_MS) {
    return cachedAnalytics;
  }

  // 1. Fetch Alternative.me Fear & Greed 31-day history (gives today, yesterday, last week, last month)
  let currentFng = 51;
  let fngYesterday = 69;
  let fngLastWeek = 63;
  let fngLastMonth = 58;
  let fngClass = 'Nötr';
  const fngHistory: { date: string; value: number }[] = [];

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

        if (currentFng >= 75) fngClass = 'Aşırı Açgözlülük';
        else if (currentFng >= 55) fngClass = 'Açgözlülük';
        else if (currentFng <= 25) fngClass = 'Aşırı Korku';
        else if (currentFng <= 45) fngClass = 'Korku';
        else fngClass = 'Nötr';

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

  // 2. Fetch Binance Global Long/Short Ratio
  let longPct = 63.8;
  let shortPct = 36.2;
  let lsRatio = 1.76;

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
      }
    }
  } catch (err) {
    console.warn('Binance Long/Short API fallback:', err);
  }

  // 3. Fetch Binance Funding Rate
  let fundingRatePercent = 0.0058;
  try {
    const fundRes = await fetch('https://fapi.binance.com/fapi/v1/fundingRate?symbol=BTCUSDT&limit=1');
    if (fundRes.ok) {
      const fundData = await fundRes.json();
      if (Array.isArray(fundData) && fundData[0]) {
        fundingRatePercent = parseFloat((parseFloat(fundData[0].fundingRate) * 100).toFixed(4));
      }
    }
  } catch (err) {
    console.warn('Binance Funding Rate API fallback:', err);
  }

  // 4. Fetch Bitcoin MVRV (Market Value to Realized Value)
  let mvrvVal = cachedMvrv;
  if (now - lastMvrvFetchTime > MVRV_CACHE_MS) {
    try {
      const mvrvUrl =
        typeof window !== 'undefined' && window.location.hostname === 'localhost'
          ? '/api/mvrv'
          : 'https://bitcoin-data.com/api/v1/mvrv';
      const mvrvRes = await fetch(mvrvUrl);
      if (mvrvRes.ok) {
        const mvrvData = await mvrvRes.json();
        if (Array.isArray(mvrvData) && mvrvData.length > 0) {
          const latestPoint = mvrvData[mvrvData.length - 1];
          if (latestPoint && typeof latestPoint.mvrv === 'number') {
            mvrvVal = parseFloat(latestPoint.mvrv.toFixed(2));
            cachedMvrv = mvrvVal;
            lastMvrvFetchTime = now;
          }
        }
      }
    } catch (err) {
      console.warn('MVRV fetch fallback:', err);
    }
  }

  // 5. Fetch Coinlore Global Market Dominance & Cap
  let btcD = 59.04;
  let ethD = 11.46;
  let totalMcapTrillion = 2.57;
  let mcapChange24h = -2.85;
  let volume24hBillion = 148.6;

  try {
    const clRes = await fetch('https://api.coinlore.net/api/global/');
    if (clRes.ok) {
      const clData = await clRes.json();
      if (Array.isArray(clData) && clData[0]) {
        const item = clData[0];
        btcD = parseFloat(parseFloat(item.btc_d).toFixed(2));
        ethD = parseFloat(parseFloat(item.eth_d).toFixed(2));
        totalMcapTrillion = parseFloat((item.total_mcap / 1e12).toFixed(2));
        mcapChange24h = parseFloat(parseFloat(item.mcap_change).toFixed(2));
        volume24hBillion = parseFloat((item.total_volume / 1e9).toFixed(1));
      }
    }
  } catch (err) {
    console.warn('Coinlore Global API fallback:', err);
  }
  const altD = parseFloat((100 - (btcD + ethD)).toFixed(2));

  // 6. Fetch Binance Taker Buy/Sell Volume Ratio
  let takerBuyVol = 116080;
  let takerSellVol = 122154;
  let takerRatio = 0.95;

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
      }
    }
  } catch (err) {
    console.warn('Binance Taker Volume API fallback:', err);
  }
  const totalTaker = Math.max(1, takerBuyVol + takerSellVol);
  const buyPercent = parseFloat(((takerBuyVol / totalTaker) * 100).toFixed(1));
  const sellPercent = parseFloat((100 - buyPercent).toFixed(1));

  // 7. Fetch Binance Open Interest
  let oiBtc = 107491;
  let oiUsdBillion = 8.12;
  let oiChangeMillion = 33.5;

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
      }
    }
  } catch (err) {
    console.warn('Binance Open Interest API fallback:', err);
  }

  // 8. Fetch Binance Spot Klines for BTC Technical Indicators (RSI 14 & SMA 20)
  let btcCurrentPrice = 75900;
  let sma20Price = 78200;
  let rsi14 = 44.8;

  try {
    const klineRes = await fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=25');
    if (klineRes.ok) {
      const klineData = await klineRes.json();
      if (Array.isArray(klineData) && klineData.length >= 15) {
        const closes: number[] = klineData.map((k: (string | number)[]) => parseFloat(k[4] as string));
        btcCurrentPrice = closes[closes.length - 1];
        rsi14 = computeRSI(closes, 14);

        // 20 SMA
        const last20 = closes.slice(-20);
        sma20Price = Math.round(last20.reduce((a, b) => a + b, 0) / last20.length);
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
    rsi14
  );

  const result: MarketAnalyticsData = {
    macroPhase: derived.macroPhase,
    fearAndGreed: {
      current: currentFng,
      classification: fngClass,
      yesterday: fngYesterday,
      lastWeek: fngLastWeek,
      lastMonth: fngLastMonth,
      history: fngHistory,
    },
    marketDominance: {
      btcD,
      ethD,
      altD,
      totalMarketCapUsd: totalMcapTrillion,
      mcapChange24h,
      totalVolume24hUsd: volume24hBillion,
      interpretation: derived.domInterp,
    },
    longShortRatio: derived.longShortRatio,
    fundingRate: derived.fundingRate,
    mvrvRatio: derived.mvrvRatio,
    takerVolume: {
      buyVolBtc: takerBuyVol,
      sellVolBtc: takerSellVol,
      buyPercent,
      sellPercent,
      ratio: takerRatio,
      signal: derived.takerSignal,
    },
    openInterest: {
      amountBtc: oiBtc,
      valueUsd: oiUsdBillion,
      change24hUsd: oiChangeMillion,
      interpretation:
        oiChangeMillion >= 0
          ? `Son 24 saatte vadeli piyasaya +$${oiChangeMillion}M yeni fon girdi. Pozisyon hacmi genişliyor.`
          : `Son 24 saatte vadeli piyasadan -$${Math.abs(oiChangeMillion)}M pozisyon kapandı. Risk azaltımı var.`,
    },
    technicalIndicator: {
      symbol: 'BTC/USDT',
      rsi14,
      rsiStatus: derived.rsiStatus,
      rsiLabel: derived.rsiLabel,
      sma20Price,
      currentPrice: btcCurrentPrice,
      trendLabel,
    },
  };

  cachedAnalytics = result;
  cacheTimestamp = now;
  return result;
};
