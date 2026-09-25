import type { PortfolioAsset } from '../../types/crypto';
import type { AssetAssistantSnapshot, TechnicalFeatures } from '../../types/assistant';
import { fetchHistoricalKlines, fetchUsdtMarketSnapshot } from '../binanceApi';
import {
  averageTrueRange,
  clamp,
  maximumDrawdown,
  movingAverageConvergenceDivergence,
  periodReturn,
  relativeStrengthIndex,
  simpleMovingAverage,
  exponentialMovingAverage,
} from '../../utils/technicalIndicators';
import {
  buildPortfolioValuation,
  isStableAsset,
  parseTradingPair,
  quoteToUsd,
  type ConversionRates,
  type PriceLookup,
} from '../../utils/portfolioValuation';

interface CandleCacheEntry {
  fetchedAt: number;
  candles: Awaited<ReturnType<typeof fetchHistoricalKlines>>;
}

const candleCache = new Map<string, CandleCacheEntry>();
const inFlightCandles = new Map<string, Promise<Awaited<ReturnType<typeof fetchHistoricalKlines>>>>();

const CACHE_TTL_MS = {
  daily: 15 * 60 * 1000,
  intraday: 5 * 60 * 1000,
} as const;

const getCachedKlines = async (
  symbol: string,
  interval: '1d' | '4h',
  limit: number,
  forceFresh: boolean
) => {
  const key = `${symbol}:${interval}:${limit}`;
  const cached = candleCache.get(key);
  const ttl = interval === '1d' ? CACHE_TTL_MS.daily : CACHE_TTL_MS.intraday;
  if (!forceFresh && cached && Date.now() - cached.fetchedAt < ttl) return cached.candles;

  const existing = inFlightCandles.get(key);
  if (existing) return existing;

  const request = fetchHistoricalKlines(symbol, interval, limit)
    .then((candles) => {
      if (candles.length > 0) candleCache.set(key, { fetchedAt: Date.now(), candles });
      return candles;
    })
    .finally(() => inFlightCandles.delete(key));

  inFlightCandles.set(key, request);
  return request;
};

export const getAssistantAnalysisSymbol = (symbol: string): string => {
  const { baseAsset, quoteAsset } = parseTradingPair(symbol);
  if (quoteAsset === 'USDT') return `${baseAsset}USDT`;
  return `${baseAsset}USDT`;
};

const averageVolume = (candles: NonNullable<Awaited<ReturnType<typeof fetchHistoricalKlines>>>, start: number, end: number): number => {
  const selected = candles.slice(start, end).map((candle) => candle.volume ?? 0).filter((value) => value > 0);
  if (selected.length === 0) return 0;
  return selected.reduce((sum, value) => sum + value, 0) / selected.length;
};

const buildTechnicalFeatures = (
  symbol: string,
  daily: Awaited<ReturnType<typeof fetchHistoricalKlines>>,
  intraday: Awaited<ReturnType<typeof fetchHistoricalKlines>>,
  fallbackPriceUsd: number,
  benchmarkReturn30: number | null
): TechnicalFeatures | null => {
  if (daily.length < 35) return null;
  const closes = daily.map((candle) => candle.close);
  const currentPriceUsd = fallbackPriceUsd > 0 ? fallbackPriceUsd : closes[closes.length - 1];
  const atr = averageTrueRange(daily, 14);
  const recentCandles = daily.slice(-20);
  const previousVolume = averageVolume(daily, Math.max(0, daily.length - 40), Math.max(0, daily.length - 20));
  const recentVolume = averageVolume(daily, Math.max(0, daily.length - 20), daily.length);
  const dailyReturn30 = periodReturn(closes, 30);
  const levelSource = intraday.length >= 20 ? intraday.slice(-20) : recentCandles;
  const latestCandleTime = daily[daily.length - 1].time * 1000;
  const maxAge = 3 * 24 * 60 * 60 * 1000;

  return {
    symbol,
    currentPriceUsd,
    dailyReturn30Percent: dailyReturn30,
    relativeStrength30Percent:
      dailyReturn30 !== null && benchmarkReturn30 !== null ? dailyReturn30 - benchmarkReturn30 : null,
    rsi14: relativeStrengthIndex(closes, 14),
    ema20: exponentialMovingAverage(closes, 20),
    ema50: exponentialMovingAverage(closes, 50),
    sma200: simpleMovingAverage(closes, 200),
    atrPercent: atr !== null && currentPriceUsd > 0 ? (atr / currentPriceUsd) * 100 : null,
    macdHistogram: movingAverageConvergenceDivergence(closes).histogram,
    supportPriceUsd: levelSource.length > 0 ? Math.min(...levelSource.map((candle) => candle.low)) : null,
    resistancePriceUsd: levelSource.length > 0 ? Math.max(...levelSource.map((candle) => candle.high)) : null,
    volumeRatio20: previousVolume > 0 && recentVolume > 0 ? recentVolume / previousVolume : null,
    maximumDrawdown30Percent: maximumDrawdown(closes.slice(-30)),
    candleCount: daily.length,
    lastUpdated: latestCandleTime,
    isFresh: latestCandleTime > 0 && Date.now() - latestCandleTime < maxAge,
  };
};

const mapWithConcurrency = async <T, R>(
  items: readonly T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> => {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      const item = items[index];
      results[index] = await mapper(item, index);
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
};

export interface BuildAssistantSnapshotsOptions {
  portfolio: readonly PortfolioAsset[];
  prices: PriceLookup;
  quoteVolumes: Readonly<Record<string, number>>;
  rates: ConversionRates;
  forceFresh?: boolean;
}

export const buildAssistantSnapshots = async ({
  portfolio,
  prices,
  quoteVolumes,
  rates,
  forceFresh = false,
}: BuildAssistantSnapshotsOptions): Promise<AssetAssistantSnapshot[]> => {
  if (!portfolio.some((asset) => !isStableAsset(asset.symbol))) return [];

  const [benchmarkDaily, marketSnapshot] = await Promise.all([
    getCachedKlines('BTCUSDT', '1d', 260, forceFresh),
    fetchUsdtMarketSnapshot(forceFresh),
  ]);
  const benchmarkReturn30 = periodReturn(benchmarkDaily.map((candle) => candle.close), 30);
  const marketBySymbol = new Map(marketSnapshot.coins.map((coin) => [coin.symbol, coin]));
  const resolvedPrices: PriceLookup = { ...prices };
  if (!marketSnapshot.isFallback) {
    for (const coin of marketSnapshot.coins) resolvedPrices[coin.symbol] = coin.price;
  }

  for (const asset of portfolio) {
    if (resolvedPrices[asset.symbol] !== undefined) continue;
    const { quoteAsset } = parseTradingPair(asset.symbol);
    const usdPerQuote = quoteToUsd(quoteAsset, resolvedPrices, rates);
    if (!(usdPerQuote > 0)) continue;
    if (isStableAsset(asset.symbol)) {
      resolvedPrices[asset.symbol] = 1 / usdPerQuote;
      continue;
    }
    const usdPrice = marketBySymbol.get(getAssistantAnalysisSymbol(asset.symbol))?.price;
    if (usdPrice !== undefined && usdPrice > 0) {
      resolvedPrices[asset.symbol] = usdPrice / usdPerQuote;
    }
  }

  const valuation = buildPortfolioValuation(portfolio, resolvedPrices, {}, rates);
  const analyzable = valuation.positions
    .filter((position) => !position.isStable && position.currentValueUsd > 0)
    .sort((a, b) => b.currentValueUsd - a.currentValueUsd);
  if (analyzable.length === 0) return [];

  return mapWithConcurrency(analyzable, 3, async (position, index) => {
    const analysisSymbol = getAssistantAnalysisSymbol(position.asset.symbol);
    const shouldFetchIntraday = index < 10;
    const [daily, intraday] = await Promise.all([
      getCachedKlines(analysisSymbol, '1d', 260, forceFresh),
      shouldFetchIntraday
        ? getCachedKlines(analysisSymbol, '4h', 180, forceFresh)
        : Promise.resolve([]),
    ]);
    const technical = buildTechnicalFeatures(
      analysisSymbol,
      daily,
      intraday,
      position.currentUnitPriceUsd,
      benchmarkReturn30
    );
    const websocketQuoteVolume =
      quoteVolumes[position.asset.symbol] ?? quoteVolumes[analysisSymbol] ?? 0;
    const marketQuoteVolume = marketSnapshot.isFallback
      ? 0
      : marketBySymbol.get(analysisSymbol)?.quoteVolume ?? 0;
    return {
      position,
      quoteVolume24hUsd:
        websocketQuoteVolume > 0 ? websocketQuoteVolume : marketQuoteVolume,
      technical,
    };
  });
};

export const getTechnicalFeatureScore = (technical: TechnicalFeatures): number => {
  let score = 0;
  const price = technical.currentPriceUsd;

  if (technical.ema20 !== null) score += price >= technical.ema20 ? 8 : -8;
  if (technical.ema50 !== null) score += price >= technical.ema50 ? 10 : -10;
  if (technical.sma200 !== null) score += price >= technical.sma200 ? 10 : -10;
  if (technical.ema20 !== null && technical.ema50 !== null) {
    score += technical.ema20 >= technical.ema50 ? 8 : -8;
  }
  if (technical.rsi14 !== null) {
    if (technical.rsi14 >= 72) score -= 14;
    else if (technical.rsi14 <= 28) score += 8;
    else if (technical.rsi14 >= 45 && technical.rsi14 <= 65) score += 5;
    else score -= 3;
  }
  if (technical.macdHistogram !== null) {
    score += technical.macdHistogram > 0 ? 7 : -7;
  }
  if (technical.relativeStrength30Percent !== null) {
    score += clamp(technical.relativeStrength30Percent / 2, -12, 12);
  }
  if (technical.dailyReturn30Percent !== null) {
    score += clamp(technical.dailyReturn30Percent / 5, -10, 10);
  }
  if (technical.volumeRatio20 !== null && technical.volumeRatio20 > 1.25) score += 5;
  if (technical.atrPercent !== null && technical.atrPercent > 8) score -= 8;

  return Math.round(score);
};

export const clearAssistantCandleCache = (): void => candleCache.clear();
