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
    riskScore: number; // 1 to 10
    verdict: string;
    strategy: string;
  };
  fearAndGreed: {
    current: number;
    classification: string;
    history: { date: string; value: number }[];
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
  exchangeNetflow: {
    amountBtc: number;
    type: 'outflow' | 'inflow';
    interpretation: string;
  };
  gasTracker: {
    ethGwei: number;
    btcSatVb: number;
    status: 'low' | 'normal' | 'high';
    timingAdvice: string;
  };
}
