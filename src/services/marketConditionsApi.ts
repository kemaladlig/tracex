import type { MarketAnalyticsData } from '../types/crypto';
import { fetchUsdtMarketSnapshot } from './binanceApi';
import { getStorageCacheWithTs, setStorageCache } from './storageCache';

const CACHE_NAMESPACE = 'tracex_market_conditions';
const BREADTH_CACHE_TTL_MS = 60 * 60 * 1000;
const LIQUIDITY_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const BREADTH_SAMPLE_SIZE = 20;

const STABLE_ASSETS = new Set([
  'USDT', 'USDC', 'FDUSD', 'TUSD', 'DAI', 'USDP', 'USD1', 'PYUSD', 'RLUSD', 'USDG', 'BUSD', 'USDE', 'USDF',
  'EUR', 'EURI', 'AEUR', 'XUSD',
]);

interface BreadthCachePayload {
  sampleSize: number;
  aboveSma20Percent: number;
  aboveSma50Percent: number;
  observedAt: number;
}

interface LiquidityCachePayload {
  totalSupplyUsd: number;
  change7dPercent: number;
  change30dPercent: number;
  observedAt: number;
}

const buildBreadthResult = (
  payload: BreadthCachePayload,
  isStale: boolean
): MarketAnalyticsData['marketBreadth'] => {
  const { aboveSma20Percent, aboveSma50Percent } = payload;
  const strongBreadth = aboveSma20Percent >= 60 && aboveSma50Percent >= 50;
  const weakBreadth = aboveSma20Percent < 40 || aboveSma50Percent < 35;
  const label = strongBreadth ? 'Geniş pazar' : weakBreadth ? 'Zayıf pazar' : 'Karışık pazar';
  const interpretation = strongBreadth
    ? `Yüksek hacimli ${payload.sampleSize} pariteden büyük kısmı 20G ve 50G ortalamalarının üzerinde; yükseliş geniş tabana yayılıyor.`
    : weakBreadth
      ? `Yüksek hacimli ${payload.sampleSize} paritede ortalama üstü oranı düşük; hareket daha çok BTC veya birkaç büyük paritede yoğunlaşabilir.`
      : `Pazar katılımı seçici; 20G üstü ${aboveSma20Percent}%, 50G üstü ${aboveSma50Percent}%. Trend yönü için fiyat teyidi gerekir.`;

  return {
    sampleSize: payload.sampleSize,
    aboveSma20Percent,
    aboveSma50Percent,
    label,
    interpretation,
    freshness: {
      isStale,
      updatedAt: payload.observedAt,
      source: `Binance Spot (en hacimli ${BREADTH_SAMPLE_SIZE} parite)`,
    },
  };
};

const buildLiquidityResult = (
  payload: LiquidityCachePayload,
  isStale: boolean
): MarketAnalyticsData['stablecoinLiquidity'] => {
  const change = payload.change30dPercent;
  const status = change > 0.5 ? 'expanding' : change < -0.5 ? 'contracting' : 'stable';
  const label = status === 'expanding' ? 'Likidite genişliyor' : status === 'contracting' ? 'Likidite daralıyor' : 'Likidite dengede';
  const direction = change >= 0 ? 'arttı' : 'azaldı';
  const interpretation = `USD-pegged stablecoin arzı son 30 günde %${Math.abs(change).toFixed(2)} ${direction}. Bu hareket serbest kripto likiditesinin genel eğilimini gösterir; tek başına fiyat yönü belirlemez.`;

  return {
    totalSupplyUsd: payload.totalSupplyUsd,
    change7dPercent: payload.change7dPercent,
    change30dPercent: payload.change30dPercent,
    status,
    label,
    interpretation,
    freshness: {
      isStale,
      updatedAt: payload.observedAt,
      source: 'DefiLlama Stablecoins',
    },
  };
};

const getBreadthLabel = (baseAsset: string): boolean =>
  !STABLE_ASSETS.has(baseAsset) &&
  !baseAsset.includes('UP') &&
  !baseAsset.includes('DOWN') &&
  !baseAsset.includes('BULL') &&
  !baseAsset.includes('BEAR');

export const fetchMarketBreadth = async (
  forceFresh = false
): Promise<MarketAnalyticsData['marketBreadth']> => {
  const cached = getStorageCacheWithTs<BreadthCachePayload>('breadth-v1', BREADTH_CACHE_TTL_MS, CACHE_NAMESPACE);
  if (!forceFresh && cached) return buildBreadthResult(cached.data, false);

  try {
    const snapshot = await fetchUsdtMarketSnapshot(forceFresh);
    const symbols = snapshot.coins
      .filter((coin) => getBreadthLabel(coin.baseAsset))
      .slice(0, BREADTH_SAMPLE_SIZE)
      .map((coin) => coin.symbol);
    const results = await Promise.allSettled(
      symbols.map(async (symbol) => {
        const response = await fetch(
          `https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=1d&limit=51`
        );
        if (!response.ok) throw new Error(`Breadth kline failed: ${symbol}`);
        const raw: unknown = await response.json();
        if (!Array.isArray(raw)) throw new Error(`Invalid breadth klines: ${symbol}`);
        const closes = raw.flatMap((item) => {
          if (!Array.isArray(item) || item.length < 5) return [];
          const close = Number(item[4]);
          return Number.isFinite(close) ? [close] : [];
        });
        if (closes.length < 50) throw new Error(`Insufficient breadth klines: ${symbol}`);
        const current = closes[closes.length - 1];
        const sma20 = closes.slice(-20).reduce((sum, close) => sum + close, 0) / 20;
        const sma50 = closes.slice(-50).reduce((sum, close) => sum + close, 0) / 50;
        return { above20: current > sma20, above50: current > sma50 };
      })
    );
    const valid = results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
    if (valid.length < 8 || snapshot.isFallback) throw new Error('Insufficient breadth sample');

    const payload: BreadthCachePayload = {
      sampleSize: valid.length,
      aboveSma20Percent: Number(((valid.filter((item) => item.above20).length / valid.length) * 100).toFixed(0)),
      aboveSma50Percent: Number(((valid.filter((item) => item.above50).length / valid.length) * 100).toFixed(0)),
      observedAt: Date.now(),
    };
    setStorageCache('breadth-v1', payload, CACHE_NAMESPACE);
    return buildBreadthResult(payload, false);
  } catch (error) {
    console.warn('Market breadth fallback:', error);
    return buildBreadthResult(
      cached?.data ?? {
        sampleSize: BREADTH_SAMPLE_SIZE,
        aboveSma20Percent: 50,
        aboveSma50Percent: 45,
        observedAt: 0,
      },
      true
    );
  }
};

export const fetchStablecoinLiquidity = async (
  forceFresh = false
): Promise<MarketAnalyticsData['stablecoinLiquidity']> => {
  const cached = getStorageCacheWithTs<LiquidityCachePayload>('liquidity-v1', LIQUIDITY_CACHE_TTL_MS, CACHE_NAMESPACE);
  if (!forceFresh && cached) return buildLiquidityResult(cached.data, false);

  try {
    const response = await fetch('https://stablecoins.llama.fi/stablecoincharts/all');
    if (!response.ok) throw new Error(`DefiLlama stablecoins failed: ${response.status}`);
    const raw: unknown = await response.json();
    if (!Array.isArray(raw)) throw new Error('Invalid DefiLlama stablecoin response');

    const points = raw.flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const row = item as { date?: unknown; totalCirculatingUSD?: { peggedUSD?: unknown } };
      const timestamp = Number(row.date);
      const supply = Number(row.totalCirculatingUSD?.peggedUSD);
      return Number.isFinite(timestamp) && Number.isFinite(supply) && supply > 0
        ? [{ timestamp, supply }]
        : [];
    }).sort((a, b) => a.timestamp - b.timestamp);

    if (points.length < 31) throw new Error('Insufficient stablecoin history');
    const current = points[points.length - 1];
    const sevenDaysAgo = points[Math.max(0, points.length - 8)];
    const thirtyDaysAgo = points[Math.max(0, points.length - 31)];
    const change = (value: number, base: number): number => Number((((value - base) / base) * 100).toFixed(2));
    const payload: LiquidityCachePayload = {
      totalSupplyUsd: current.supply,
      change7dPercent: change(current.supply, sevenDaysAgo.supply),
      change30dPercent: change(current.supply, thirtyDaysAgo.supply),
      observedAt: current.timestamp * 1000,
    };
    setStorageCache('liquidity-v1', payload, CACHE_NAMESPACE);
    return buildLiquidityResult(payload, false);
  } catch (error) {
    console.warn('Stablecoin liquidity fallback:', error);
    return buildLiquidityResult(
      cached?.data ?? {
        totalSupplyUsd: 300_000_000_000,
        change7dPercent: 0,
        change30dPercent: 0,
        observedAt: 0,
      },
      true
    );
  }
};

export const calculateAtr = (rawKlines: unknown, period = 14): number | null => {
  if (!Array.isArray(rawKlines)) return null;
  const candles = rawKlines.flatMap((item) => {
    if (!Array.isArray(item) || item.length < 5) return [];
    const high = Number(item[2]);
    const low = Number(item[3]);
    const close = Number(item[4]);
    return Number.isFinite(high) && Number.isFinite(low) && Number.isFinite(close)
      ? [{ high, low, close }]
      : [];
  });
  if (candles.length < period + 1) return null;

  const trueRanges = candles.slice(1).map((candle, index) => {
    const previousClose = candles[index].close;
    return Math.max(
      candle.high - candle.low,
      Math.abs(candle.high - previousClose),
      Math.abs(candle.low - previousClose)
    );
  });
  const atr = trueRanges.slice(-period).reduce((sum, range) => sum + range, 0) / period;
  return Number.isFinite(atr) ? atr : null;
};

export const classifyVolatility = (
  atrPercent: number
): Pick<MarketAnalyticsData['volatilityRegime'], 'status' | 'label' | 'interpretation'> => {
  if (atrPercent < 2) {
    return {
      status: 'calm',
      label: 'Sakin rejim',
      interpretation: `BTC günlük ATR %${atrPercent.toFixed(2)}. Kısa vadeli hareket sakin; ani genişleme olursa yeni kırılım teyidi gerekir.`,
    };
  }
  if (atrPercent < 3.5) {
    return {
      status: 'normal',
      label: 'Normal rejim',
      interpretation: `BTC günlük ATR %${atrPercent.toFixed(2)}. Risk rejimi normal; kaldıraç yönetimiyle işlem yapılabilir.`,
    };
  }
  if (atrPercent < 5) {
    return {
      status: 'active',
      label: 'Aktif rejim',
      interpretation: `BTC günlük ATR %${atrPercent.toFixed(2)}. Günlük hareketler geniş; pozisyon boyutu ve stop mesafesi uyarlanmalı.`,
    };
  }
  return {
    status: 'high',
    label: 'Yüksek risk',
    interpretation: `BTC günlük ATR %${atrPercent.toFixed(2)}. Oynaklık yüksek; yüksek kaldıraç ve ani ters yön riski öne çıkıyor.`,
  };
};
