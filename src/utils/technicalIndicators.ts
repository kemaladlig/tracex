import type { CandleData } from '../types/crypto';

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const simpleMovingAverage = (values: readonly number[], period: number): number | null => {
  if (period <= 0 || values.length < period) return null;
  const window = values.slice(-period);
  const average = window.reduce((sum, value) => sum + value, 0) / period;
  return Number.isFinite(average) ? average : null;
};

export const exponentialMovingAverageSeries = (
  values: readonly number[],
  period: number
): Array<number | null> => {
  if (period <= 0 || values.length < period) return values.map(() => null);

  const result: Array<number | null> = values.map(() => null);
  const multiplier = 2 / (period + 1);
  let average = values.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
  result[period - 1] = average;

  for (let index = period; index < values.length; index += 1) {
    average = values[index] * multiplier + average * (1 - multiplier);
    result[index] = average;
  }

  return result;
};

export const exponentialMovingAverage = (values: readonly number[], period: number): number | null => {
  const series = exponentialMovingAverageSeries(values, period);
  return series[series.length - 1] ?? null;
};

export const relativeStrengthIndex = (values: readonly number[], period = 14): number | null => {
  if (period <= 0 || values.length <= period) return null;

  let averageGain = 0;
  let averageLoss = 0;
  for (let index = 1; index <= period; index += 1) {
    const difference = values[index] - values[index - 1];
    averageGain += Math.max(difference, 0);
    averageLoss += Math.max(-difference, 0);
  }
  averageGain /= period;
  averageLoss /= period;

  for (let index = period + 1; index < values.length; index += 1) {
    const difference = values[index] - values[index - 1];
    averageGain = (averageGain * (period - 1) + Math.max(difference, 0)) / period;
    averageLoss = (averageLoss * (period - 1) + Math.max(-difference, 0)) / period;
  }

  if (averageLoss === 0) return averageGain === 0 ? 50 : 100;
  const relativeStrength = averageGain / averageLoss;
  return Number((100 - 100 / (1 + relativeStrength)).toFixed(2));
};

export const averageTrueRange = (candles: readonly CandleData[], period = 14): number | null => {
  if (candles.length <= period) return null;

  const trueRanges: number[] = [];
  for (let index = 1; index < candles.length; index += 1) {
    const candle = candles[index];
    const previousClose = candles[index - 1].close;
    trueRanges.push(
      Math.max(
        candle.high - candle.low,
        Math.abs(candle.high - previousClose),
        Math.abs(candle.low - previousClose)
      )
    );
  }

  const atr = simpleMovingAverage(trueRanges, period);
  return atr !== null && Number.isFinite(atr) ? atr : null;
};

export interface MacdResult {
  macd: number | null;
  signal: number | null;
  histogram: number | null;
}

export const movingAverageConvergenceDivergence = (
  values: readonly number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): MacdResult => {
  if (values.length < slowPeriod + signalPeriod) {
    return { macd: null, signal: null, histogram: null };
  }

  const fast = exponentialMovingAverageSeries(values, fastPeriod);
  const slow = exponentialMovingAverageSeries(values, slowPeriod);
  const macdSeries: number[] = [];

  for (let index = 0; index < values.length; index += 1) {
    const fastValue = fast[index];
    const slowValue = slow[index];
    if (fastValue !== null && slowValue !== null) macdSeries.push(fastValue - slowValue);
  }

  const signal = exponentialMovingAverage(macdSeries, signalPeriod);
  const macd = macdSeries[macdSeries.length - 1] ?? null;
  return {
    macd,
    signal,
    histogram: macd !== null && signal !== null ? macd - signal : null,
  };
};

export const periodReturn = (values: readonly number[], periods: number): number | null => {
  if (values.length <= periods || periods <= 0) return null;
  const start = values[values.length - periods - 1];
  const end = values[values.length - 1];
  if (!(start > 0) || !Number.isFinite(end)) return null;
  return ((end - start) / start) * 100;
};

export const maximumDrawdown = (values: readonly number[]): number | null => {
  if (values.length < 2) return null;
  let peak = values[0];
  let worstDrawdown = 0;

  for (const value of values) {
    peak = Math.max(peak, value);
    if (peak > 0) worstDrawdown = Math.min(worstDrawdown, (value - peak) / peak);
  }

  return Number((worstDrawdown * 100).toFixed(2));
};
