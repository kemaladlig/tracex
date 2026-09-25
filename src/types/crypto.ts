export type PriceDirection = 'up' | 'down' | null;
export type Currency = 'USD' | 'TRY';
export type TabType = 'home' | 'markets' | 'analytics' | 'portfolio';
export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

export type TickerSource = 'cache' | 'rest' | 'ws';

export interface TickerData {
  symbol: string;
  price: number;
  changePercent24h: number;
  changeAmount24h: number;
  high24h: number;
  low24h: number;
  volume: number;
  quoteVolume: number;
  direction: PriceDirection;
  lastUpdated: number;
  /** true only after a fresh WS packet; cache/REST prefill stays false (no text badge, styling only) */
  isLive: boolean;
  source: TickerSource;
}

export interface PortfolioAsset {
  id: string;
  symbol: string;
  amount: number;
  buyPrice: number;
  /** Purchase price normalized to USD when the position was added. Legacy rows may derive it from the quote currency. */
  costBasisUsd?: number;
  timestamp: number;
}

export interface PortfolioGroup {
  id: string;
  name: string;
  assets: PortfolioAsset[];
  realizedPnL: number;
  createdAt: number;
}

export interface PortfolioBackupData {
  version: '2.5';
  exportedAt: number;
  groups: PortfolioGroup[];
  activeGroupId: string;
  watchlist: string[];
}

export interface SellTransaction {
  id: string;
  symbol: string;
  sellAmount: number;
  sellPrice: number;
  realizedPnL: number;
  timestamp: number;
}

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface DataFreshness {
  /** true ise bu bölüm canlı çekilemedi, fallback/önbellek gösteriliyor */
  isStale: boolean;
  /** verinin çekildiği zaman (ms epoch). Fallback ise son başarılı zaman veya 0 */
  updatedAt: number;
  /** insan-dili kaynak etiketi, örn. "Binance Futures" */
  source: string;
}

export interface MarketAnalyticsData {
  meta: {
    updatedAt: number;
    /** herhangi bir bölüm stale ise true */
    isPartiallyStale: boolean;
    staleSections: string[];
  };
  macroPhase: {
    title: string;
    riskScore: number;
    verdict: string;
    strategy: string;
    /** 1-10 riskin ne kadar güvenilir olduğu: stale girdi varsa düşer */
    confidence: 'low' | 'medium' | 'high';
    /** hükmü üreten ateşlenen sinyaller, örn. "Aşırı korku (18/100)" */
    signals: string[];
  };
  fearAndGreed: {
    current: number;
    classification: string;
    yesterday: number;
    lastWeek: number;
    lastMonth: number;
    history: { date: string; value: number }[];
    freshness: DataFreshness;
  };
  marketDominance: {
    btcD: number;
    ethD: number;
    altD: number;
    totalMarketCapUsd: number;
    mcapChange24h: number;
    totalVolume24hUsd: number;
    interpretation: string;
    freshness: DataFreshness;
  };
  longShortRatio: {
    longPercent: number;
    shortPercent: number;
    ratio: number;
    signal: string;
    description: string;
    /** son 30 x 5dk snapshot'tan yön: pozitif = long'lar artıyor */
    trendDelta?: number;
    freshness: DataFreshness;
  };
  fundingRate: {
    ratePercent: number;
    intervalLabel: string;
    status: 'bullish' | 'neutral' | 'overheated' | 'bearish';
    interpretation: string;
    freshness: DataFreshness;
  };
  mvrvRatio: {
    value: number;
    status: 'dip' | 'fair' | 'heated';
    label: string;
    interpretation: string;
    freshness: DataFreshness;
  };
  takerVolume: {
    buyVolBtc: number;
    sellVolBtc: number;
    buyPercent: number;
    sellPercent: number;
    ratio: number;
    signal: string;
    freshness: DataFreshness;
  };
  openInterest: {
    amountBtc: number;
    valueUsd: number;
    change24hUsd: number;
    interpretation: string;
    /** fiyatla birleştirilmiş yön sinyali */
    bias?: 'long-buildup' | 'short-buildup' | 'unwinding' | 'neutral';
    freshness: DataFreshness;
  };
  technicalIndicator: {
    symbol: string;
    rsi14: number;
    rsiStatus: 'oversold' | 'neutral' | 'overbought';
    rsiLabel: string;
    sma20Price: number;
    ema50Price?: number;
    sma200Price?: number;
    crossSignal?: string;
    currentPrice: number;
    trendLabel: string;
    freshness: DataFreshness;
  };
  marketBreadth: {
    sampleSize: number;
    aboveSma20Percent: number;
    aboveSma50Percent: number;
    label: string;
    interpretation: string;
    freshness: DataFreshness;
  };
  volatilityRegime: {
    atr14: number;
    atrPercent: number;
    status: 'calm' | 'normal' | 'active' | 'high';
    label: string;
    interpretation: string;
    freshness: DataFreshness;
  };
  stablecoinLiquidity: {
    totalSupplyUsd: number;
    change7dPercent: number;
    change30dPercent: number;
    status: 'expanding' | 'stable' | 'contracting';
    label: string;
    interpretation: string;
    freshness: DataFreshness;
  };
  marketGate: {
    status: 'open' | 'caution' | 'risk' | 'wait';
    label: string;
    score: number;
    summary: string;
    positiveChecks: number;
    riskChecks: number;
  };
}
