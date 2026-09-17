import type { Currency } from '../types/crypto';

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

export const formatNumber = (value: number, maxDecimals: number = 4): string => {
  if (value === undefined || value === null || isNaN(value)) {
    return '0';
  }
  return value.toLocaleString('en-US', {
    maximumFractionDigits: maxDecimals,
  });
};

export const cleanSymbol = (symbol: string): { base: string; quote: string } => {
  const upper = symbol.toUpperCase();
  if (upper.endsWith('USDT')) {
    return { base: upper.replace('USDT', ''), quote: 'USDT' };
  }
  if (upper.endsWith('BUSD')) {
    return { base: upper.replace('BUSD', ''), quote: 'BUSD' };
  }
  if (upper.endsWith('TRY')) {
    return { base: upper.replace('TRY', ''), quote: 'TRY' };
  }
  return { base: upper, quote: 'USDT' };
};
