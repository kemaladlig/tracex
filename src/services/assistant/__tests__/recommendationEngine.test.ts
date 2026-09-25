import { describe, expect, it } from 'vitest';
import type { MarketAnalyticsData, PortfolioAsset } from '../../../types/crypto';
import type { AssetAssistantSnapshot, AssistantSettings, TechnicalFeatures } from '../../../types/assistant';
import { DEFAULT_ASSISTANT_SETTINGS } from '../../../store/useAssistantStore';
import { valuePortfolioPosition } from '../../../utils/portfolioValuation';
import { buildAssistantResult } from '../recommendationEngine';

const fresh = (source: string) => ({ isStale: false, updatedAt: Date.now(), source });

const createAnalytics = (): MarketAnalyticsData => ({
  meta: { updatedAt: Date.now(), isPartiallyStale: false, staleSections: [] },
  macroPhase: {
    title: 'Kontrollü piyasa',
    riskScore: 4,
    verdict: 'Pozitif',
    strategy: 'Kademeli ilerle.',
    confidence: 'high',
    signals: ['Trend', 'Genişlik'],
  },
  fearAndGreed: {
    current: 55,
    classification: 'Greed',
    yesterday: 52,
    lastWeek: 50,
    lastMonth: 48,
    history: [],
    freshness: fresh('FNG'),
  },
  marketDominance: {
    btcD: 52,
    ethD: 12,
    altD: 36,
    totalMarketCapUsd: 2_500_000_000_000,
    mcapChange24h: 1,
    totalVolume24hUsd: 80_000_000_000,
    interpretation: 'Dengeli',
    freshness: fresh('Dominance'),
  },
  longShortRatio: {
    longPercent: 52,
    shortPercent: 48,
    ratio: 1.08,
    signal: 'Dengeli',
    description: 'Dengeli',
    freshness: fresh('Long short'),
  },
  fundingRate: {
    ratePercent: 0.01,
    intervalLabel: '8 saatte bir',
    status: 'neutral',
    interpretation: 'Nötr',
    freshness: fresh('Funding'),
  },
  mvrvRatio: {
    value: 2,
    status: 'fair',
    label: 'Döngü ortası',
    interpretation: 'Normal',
    freshness: fresh('MVRV'),
  },
  takerVolume: {
    buyVolBtc: 1_000,
    sellVolBtc: 990,
    buyPercent: 50.25,
    sellPercent: 49.75,
    ratio: 1.01,
    signal: 'Dengeli',
    freshness: fresh('Taker'),
  },
  openInterest: {
    amountBtc: 1_000,
    valueUsd: 60_000_000,
    change24hUsd: 0,
    interpretation: 'Nötr',
    bias: 'neutral',
    freshness: fresh('OI'),
  },
  technicalIndicator: {
    symbol: 'BTC/USDT',
    rsi14: 55,
    rsiStatus: 'neutral',
    rsiLabel: 'Nötr',
    sma20Price: 95,
    ema50Price: 90,
    sma200Price: 80,
    currentPrice: 100,
    trendLabel: 'Pozitif',
    freshness: fresh('Klines'),
  },
  marketBreadth: {
    sampleSize: 20,
    aboveSma20Percent: 60,
    aboveSma50Percent: 55,
    label: 'Geniş pazar',
    interpretation: 'Geniş',
    freshness: fresh('Breadth'),
  },
  volatilityRegime: {
    atr14: 2,
    atrPercent: 2,
    status: 'calm',
    label: 'Sakin',
    interpretation: 'Sakin',
    freshness: fresh('ATR'),
  },
  stablecoinLiquidity: {
    totalSupplyUsd: 300_000_000_000,
    change7dPercent: 1,
    change30dPercent: 3,
    status: 'expanding',
    label: 'Genişliyor',
    interpretation: 'Genişliyor',
    freshness: fresh('Stablecoin'),
  },
  marketGate: {
    status: 'open',
    label: 'Piyasa açık',
    score: 4,
    summary: 'Olumlu',
    positiveChecks: 4,
    riskChecks: 0,
  },
});

const createTechnical = (overrides: Partial<TechnicalFeatures> = {}): TechnicalFeatures => ({
  symbol: 'BTCUSDT',
  currentPriceUsd: 100,
  dailyReturn30Percent: 12,
  relativeStrength30Percent: 8,
  rsi14: 55,
  ema20: 95,
  ema50: 90,
  sma200: 80,
  atrPercent: 2,
  macdHistogram: 1,
  supportPriceUsd: 94,
  resistancePriceUsd: 108,
  volumeRatio20: 1.2,
  maximumDrawdown30Percent: -8,
  candleCount: 260,
  lastUpdated: Date.now(),
  isFresh: true,
  ...overrides,
});

const createSnapshot = ({
  symbol = 'BTCUSDT',
  baseAsset = 'BTC',
  valueUsd,
  priceUsd = baseAsset === 'BTC' ? 60_000 : 100,
  quoteVolume24hUsd = 1_000_000_000,
  technical = createTechnical(),
}: {
  symbol?: string;
  baseAsset?: string;
  valueUsd: number;
  priceUsd?: number;
  quoteVolume24hUsd?: number;
  technical?: TechnicalFeatures | null;
}): AssetAssistantSnapshot => {
  const portfolioAsset: PortfolioAsset = {
    id: `asset-${baseAsset}`,
    symbol,
    amount: valueUsd / priceUsd,
    buyPrice: priceUsd * 0.8,
    costBasisUsd: priceUsd * 0.8,
    timestamp: 1,
  };
  return {
    position: valuePortfolioPosition(portfolioAsset, priceUsd, { [symbol]: priceUsd }),
    quoteVolume24hUsd,
    technical,
  };
};

const settings = (overrides: Partial<AssistantSettings> = {}): AssistantSettings => ({
  ...DEFAULT_ASSISTANT_SETTINGS,
  enabled: true,
  ...overrides,
});

const build = (
  snapshots: AssetAssistantSnapshot[],
  availableCashUsd: number,
  customSettings: AssistantSettings = settings(),
  stableValueUsd = 0
) =>
  buildAssistantResult({
    groupId: 'group-test',
    snapshots,
    holdingsValueUsd:
      snapshots.reduce((sum, snapshot) => sum + snapshot.position.currentValueUsd, 0) + stableValueUsd,
    stableValueUsd,
    availableCashUsd,
    settings: customSettings,
    marketAnalytics: createAnalytics(),
    updatedAt: 1_700_000_000_000,
  });

describe('buildAssistantResult amount-aware sizing', () => {
  it('creates a viable staged amount for a $100 portfolio', () => {
    const result = build([createSnapshot({ valueUsd: 20 })], 80);
    const recommendation = result.recommendations[0];

    expect(recommendation.action).toBe('accumulate');
    expect(recommendation.suggestedAmountUsd).toBeCloseTo(15, 2);
    expect(recommendation.dcaTranches).toHaveLength(4);
  });

  it('uses a stricter liquidity cap and more tranches for a $100,000 portfolio', () => {
    const result = build(
      [createSnapshot({ symbol: 'SOLUSDT', baseAsset: 'SOL', valueUsd: 5_000, quoteVolume24hUsd: 1_000_000 })],
      95_000
    );
    const recommendation = result.recommendations[0];

    expect(recommendation.action).toBe('accumulate');
    expect(recommendation.suggestedAmountUsd).toBe(500);
    expect(recommendation.dcaTranches).toHaveLength(5);
  });

  it('holds when risk sizing falls below the minimum viable trade', () => {
    const snapshot = createSnapshot({
      valueUsd: 20,
      technical: createTechnical({ atrPercent: 18 }),
    });
    const recommendation = build([snapshot], 80).recommendations[0];

    expect(recommendation.action).toBe('hold');
    expect(recommendation.suggestedAmountUsd).toBe(0);
  });

  it('holds when no cash is available', () => {
    const recommendation = build(
      [createSnapshot({ valueUsd: 20 })],
      0,
      settings({ maxAssetPercent: 100 })
    ).recommendations[0];
    expect(recommendation.action).toBe('hold');
  });

  it('treats stablecoin or TRY balances as usable cash', () => {
    const result = build([createSnapshot({ valueUsd: 20 })], 0, settings(), 100);
    const recommendation = result.recommendations[0];

    expect(result.cashPoolUsd).toBe(100);
    expect(result.deployableCashUsd).toBeGreaterThan(0);
    expect(recommendation.action).toBe('accumulate');
    expect(recommendation.suggestedAmountUsd).toBeGreaterThan(0);
  });

  it('holds when technical candles are stale', () => {
    const snapshot = createSnapshot({
      valueUsd: 20,
      technical: createTechnical({ isFresh: false }),
    });
    expect(build([snapshot], 80).recommendations[0].action).toBe('hold');
  });

  it('rebalances an overweight position even when momentum is positive', () => {
    const recommendation = build([createSnapshot({ valueUsd: 90 })], 10).recommendations[0];
    expect(recommendation.action).toBe('rebalance');
    expect(recommendation.suggestedAmountUsd).toBeGreaterThan(0);
  });

  it('does not recommend accumulation without market context', () => {
    const result = buildAssistantResult({
      groupId: 'group-test',
      snapshots: [createSnapshot({ valueUsd: 20 })],
      holdingsValueUsd: 20,
      stableValueUsd: 0,
      availableCashUsd: 80,
      settings: settings(),
      marketAnalytics: null,
      updatedAt: 1_700_000_000_000,
    });
    expect(result.recommendations[0].action).toBe('hold');
  });
});
