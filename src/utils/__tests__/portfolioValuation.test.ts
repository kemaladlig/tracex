import { describe, expect, it } from 'vitest';
import type { PortfolioAsset } from '../../types/crypto';
import {
  buildPortfolioValuation,
  isStableAsset,
  parseTradingPair,
  priceToUsd,
} from '../portfolioValuation';

const asset = (overrides: Partial<PortfolioAsset> = {}): PortfolioAsset => ({
  id: 'asset-test',
  symbol: 'BTCUSDT',
  amount: 1,
  buyPrice: 50_000,
  costBasisUsd: 50_000,
  timestamp: 1,
  ...overrides,
});

describe('portfolioValuation', () => {
  it('normalizes TRY quoted positions and costs to USD', () => {
    const btcTry = asset({
      symbol: 'BTCTRY',
      amount: 2,
      buyPrice: 1_000,
      costBasisUsd: 50,
    });
    const valuation = buildPortfolioValuation(
      [btcTry],
      { BTCTRY: 2_000, USDTTRY: 40 },
      {},
      { tryRate: 40 }
    );

    expect(parseTradingPair('BTCTRY')).toEqual({ baseAsset: 'BTC', quoteAsset: 'TRY' });
    expect(valuation.positions[0].currentValueUsd).toBe(100);
    expect(valuation.positions[0].costValueUsd).toBe(100);
    expect(valuation.totalValueUsd).toBe(100);
  });

  it('treats USDT TRY balances as stable reserves', () => {
    expect(isStableAsset('USDTTRY')).toBe(true);
    expect(priceToUsd('USDTTRY', 40, { USDTTRY: 40 })).toBe(1);
  });

  it('supports ticker objects without mixing price and metadata values', () => {
    const value = priceToUsd(
      'ETHUSDT',
      3_000,
      { ETHUSDT: { price: 3_000 }, USDTTRY: 50 },
      { tryRate: 50 }
    );
    expect(value).toBe(3_000);
  });
});
