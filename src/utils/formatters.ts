import type { Currency } from '../types/crypto';
import { parseTradingPair } from './portfolioValuation';

export const formatCurrency = (
  value: number,
  currency: Currency = 'USD',
  fiatRate: number = 1,
  overrideDecimals?: number
): string => {
  if (value === undefined || value === null || isNaN(value)) {
    const symbol = currency === 'TRY' ? '₺' : '$';
    return `${symbol}0`;
  }

  // Convert value based on selected currency
  let converted = value;
  let symbol = '$';

  if (currency === 'TRY') {
    converted = value * fiatRate;
    symbol = '₺';
  }

  // Determine decimal places dynamically: standard 2 decimals for values >= 1
  let decimals = overrideDecimals ?? 2;
  if (overrideDecimals === undefined) {
    const absVal = Math.abs(converted);
    if (absVal === 0) {
      decimals = 2;
    } else if (absVal < 0.0001) {
      decimals = 8;
    } else if (absVal < 0.01) {
      decimals = 6;
    } else if (absVal < 1) {
      decimals = 4;
    } else {
      decimals = 2;
    }
  }

  const formatted = converted.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return `${symbol}${formatted}`;
};

export const formatPercentage = (value: number): string => {
  if (value === undefined || value === null || isNaN(value)) {
    return '0.00%';
  }
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(2)}%`;
};

export const formatDateTime = (timestamp: number): string => {
  if (!timestamp) return 'bilinmiyor';
  try {
    return new Date(timestamp).toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'bilinmiyor';
  }
};

export const formatCompactCurrency = (value: number): string => {
  if (!Number.isFinite(value)) return '$0';
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (absolute >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (absolute >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
};

export const formatNumber = (value: number, maxDecimals: number = 4): string => {
  if (value === undefined || value === null || isNaN(value)) {
    return '0';
  }
  return value.toLocaleString('en-US', {
    maximumFractionDigits: maxDecimals,
  });
};

export const cleanSymbol = (symbol: string): { base: string; quote: string } => {
  const { baseAsset, quoteAsset } = parseTradingPair(symbol);
  return { base: baseAsset, quote: quoteAsset };
};
