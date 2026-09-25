import { describe, expect, it } from 'vitest';
import {
  averageTrueRange,
  exponentialMovingAverage,
  maximumDrawdown,
  relativeStrengthIndex,
  simpleMovingAverage,
} from '../technicalIndicators';
import type { CandleData } from '../../types/crypto';

describe('technicalIndicators', () => {
  it('calculates stable moving average and RSI values', () => {
    const closes = Array.from({ length: 40 }, (_, index) => 100 + index);
    expect(simpleMovingAverage(closes, 20)).toBeCloseTo(129.5, 5);
    expect(relativeStrengthIndex(closes, 14)).toBe(100);
    expect(exponentialMovingAverage(closes, 20)).toBeGreaterThan(100);
  });

  it('calculates ATR from candle ranges', () => {
    const candles: CandleData[] = Array.from({ length: 16 }, (_, index) => ({
      time: index + 1,
      open: 100,
      high: 102 + index,
      low: 99,
      close: 101,
    }));
    expect(averageTrueRange(candles, 14)).toBeGreaterThan(0);
  });

  it('returns maximum drawdown as a negative percentage', () => {
    expect(maximumDrawdown([100, 120, 90, 110])).toBe(-25);
  });
});
