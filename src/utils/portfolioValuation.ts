import type { PortfolioAsset } from '../types/crypto';

const QUOTE_ASSETS = [
  'USDT',
  'USDC',
  'FDUSD',
  'TUSD',
  'USD1',
  'PYUSD',
  'RLUSD',
  'BUSD',
  'DAI',
  'TRY',
  'EUR',
  'USD',
  'BTC',
  'ETH',
  'BNB',
] as const;

const USD_PEgged_QUOTES = new Set(['USDT', 'USDC', 'FDUSD', 'TUSD', 'USD1', 'PYUSD', 'RLUSD', 'BUSD', 'DAI', 'USD']);
const STABLE_BASES = new Set([
  'USDT',
  'USDC',
  'FDUSD',
  'TUSD',
  'USD1',
  'PYUSD',
  'RLUSD',
  'BUSD',
  'DAI',
  'USDP',
  'USDG',
  'USDE',
  'USDF',
  'EURI',
  'AEUR',
  'XUSD',
]);

export interface PriceLookup {
  [symbol: string]: number | { readonly price: number } | undefined;
}

export interface ConversionRates {
  tryRate?: number;
  eurRate?: number;
}

export interface PairParts {
  baseAsset: string;
  quoteAsset: string;
}

export const parseTradingPair = (symbol: string): PairParts => {
  const upper = symbol.trim().toUpperCase();
  if (STABLE_BASES.has(upper)) return { baseAsset: upper, quoteAsset: 'USD' };

  for (const quote of QUOTE_ASSETS) {
    if (upper.endsWith(quote) && upper.length > quote.length) {
      return {
        baseAsset: upper.slice(0, -quote.length),
        quoteAsset: quote,
      };
    }
  }

  return { baseAsset: upper, quoteAsset: 'USDT' };
};

export const isStableAsset = (symbolOrBase: string): boolean => {
  const { baseAsset } = parseTradingPair(symbolOrBase);
  return STABLE_BASES.has(baseAsset);
};

const getNumericPrice = (value: PriceLookup[string]): number | undefined => {
  if (typeof value === 'number') return value;
  return value?.price;
};

const isPositiveFinite = (value: number | undefined): value is number =>
  value !== undefined && Number.isFinite(value) && value > 0;

export const quoteToUsd = (
  quoteAsset: string,
  prices: PriceLookup,
  rates: ConversionRates = {}
): number => {
  const quote = quoteAsset.toUpperCase();
  if (USD_PEgged_QUOTES.has(quote)) return 1;
  if (quote === 'TRY') {
    const usdTryRate = getNumericPrice(prices.USDTTRY);
    const tryRate = isPositiveFinite(usdTryRate) ? usdTryRate : rates.tryRate;
    return isPositiveFinite(tryRate) ? 1 / tryRate : 0;
  }
  if (quote === 'EUR') {
    const usdEurRate = getNumericPrice(prices.EURUSDT);
    const eurRate = isPositiveFinite(usdEurRate) ? usdEurRate : rates.eurRate;
    return isPositiveFinite(eurRate) ? 1 / eurRate : 0;
  }

  const directRate = getNumericPrice(prices[`${quote}USDT`]);
  if (isPositiveFinite(directRate)) return directRate;

  const inversePair = getNumericPrice(prices[`USDT${quote}`]);
  if (isPositiveFinite(inversePair)) return 1 / inversePair;
  return 0;
};

export const priceToUsd = (
  symbol: string,
  price: number,
  prices: PriceLookup,
  rates: ConversionRates = {}
): number => {
  if (!Number.isFinite(price) || price <= 0) return 0;
  const { quoteAsset } = parseTradingPair(symbol);
  return price * quoteToUsd(quoteAsset, prices, rates);
};

export interface PortfolioPositionValuation {
  asset: PortfolioAsset;
  baseAsset: string;
  quoteAsset: string;
  isStable: boolean;
  currentUnitPriceUsd: number;
  currentValueUsd: number;
  costBasisUsd: number;
  costValueUsd: number;
  pnlUsd: number;
  pnlPercent: number;
}

export const valuePortfolioPosition = (
  asset: PortfolioAsset,
  currentPrice: number,
  prices: PriceLookup,
  rates: ConversionRates = {}
): PortfolioPositionValuation => {
  const { baseAsset, quoteAsset } = parseTradingPair(asset.symbol);
  const currentUnitPriceUsd = priceToUsd(asset.symbol, currentPrice, prices, rates);
  const derivedCostBasisUsd = priceToUsd(asset.symbol, asset.buyPrice, prices, rates);
  const costBasisUsd = isPositiveFinite(asset.costBasisUsd) ? asset.costBasisUsd : derivedCostBasisUsd;
  const currentValueUsd = asset.amount * currentUnitPriceUsd;
  const costValueUsd = asset.amount * costBasisUsd;
  const pnlUsd = currentValueUsd - costValueUsd;

  return {
    asset,
    baseAsset,
    quoteAsset,
    isStable: isStableAsset(baseAsset),
    currentUnitPriceUsd,
    currentValueUsd,
    costBasisUsd,
    costValueUsd,
    pnlUsd,
    pnlPercent: costValueUsd > 0 ? (pnlUsd / costValueUsd) * 100 : 0,
  };
};

export interface PortfolioValuationSummary {
  positions: PortfolioPositionValuation[];
  totalValueUsd: number;
  totalCostUsd: number;
  pnlUsd: number;
  pnlPercent: number;
  stableValueUsd: number;
  stableWeightPercent: number;
}

export const buildPortfolioValuation = (
  portfolio: readonly PortfolioAsset[],
  currentPrices: PriceLookup,
  fallbackPrices: PriceLookup = {},
  rates: ConversionRates = {}
): PortfolioValuationSummary => {
  const prices: PriceLookup = { ...fallbackPrices, ...currentPrices };
  const positions = portfolio.map((asset) => {
    const currentPrice =
      getNumericPrice(currentPrices[asset.symbol]) ??
      getNumericPrice(fallbackPrices[asset.symbol]) ??
      asset.buyPrice;
    return valuePortfolioPosition(asset, currentPrice, prices, rates);
  });

  const totalValueUsd = positions.reduce((sum, position) => sum + position.currentValueUsd, 0);
  const totalCostUsd = positions.reduce((sum, position) => sum + position.costValueUsd, 0);
  const pnlUsd = totalValueUsd - totalCostUsd;
  const stableValueUsd = positions
    .filter((position) => position.isStable)
    .reduce((sum, position) => sum + position.currentValueUsd, 0);

  return {
    positions,
    totalValueUsd,
    totalCostUsd,
    pnlUsd,
    pnlPercent: totalCostUsd > 0 ? (pnlUsd / totalCostUsd) * 100 : 0,
    stableValueUsd,
    stableWeightPercent: totalValueUsd > 0 ? (stableValueUsd / totalValueUsd) * 100 : 0,
  };
};
