export type PriceDirection = 'up' | 'down' | null;
export type Currency = 'USD' | 'TRY' | 'EUR';
export type TabType = 'markets' | 'analytics' | 'portfolio';
export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

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
}

export interface PortfolioAsset {
  id: string;
  symbol: string;
  amount: number;
  buyPrice: number;
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

export interface MarketAnalyticsData {
  macroPhase: {
    title: string;
    riskScore: number;
    verdict: string;
    strategy: string;
  };
  fearAndGreed: {
    current: number;
    classification: string;
    yesterday: number;
    lastWeek: number;
    lastMonth: number;
    history: { date: string; value: number }[];
  };
  marketDominance: {
    btcD: number;
    ethD: number;
    altD: number;
    totalMarketCapUsd: number;
    mcapChange24h: number;
    totalVolume24hUsd: number;
    interpretation: string;
  };
  longShortRatio: {
    longPercent: number;
    shortPercent: number;
    ratio: number;
    signal: string;
    description: string;
  };
  fundingRate: {
    ratePercent: number;
    hourlyCost: string;
    status: 'bullish' | 'neutral' | 'overheated' | 'bearish';
    interpretation: string;
  };
  mvrvRatio: {
    value: number;
    status: 'dip' | 'fair' | 'heated';
    label: string;
    interpretation: string;
  };
  takerVolume: {
    buyVolBtc: number;
    sellVolBtc: number;
    buyPercent: number;
    sellPercent: number;
    ratio: number;
    signal: string;
  };
  openInterest: {
    amountBtc: number;
    valueUsd: number;
    change24hUsd: number;
    interpretation: string;
  };
  technicalIndicator: {
    symbol: string;
    rsi14: number;
    rsiStatus: 'oversold' | 'neutral' | 'overbought';
    rsiLabel: string;
    sma20Price: number;
    currentPrice: number;
    trendLabel: string;
  };
}
