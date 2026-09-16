export type PriceDirection = 'up' | 'down' | null;
export type Currency = 'USD' | 'TRY' | 'EUR';

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

export interface OnChainMetrics {
  fearAndGreed: {
    score: number;
    classification: string;
  };
  exchangeNetflow: {
    type: 'outflow' | 'inflow' | 'neutral';
    amountBtc: number;
    label: string;
    description: string;
  };
  mvrvRatio: {
    value: number;
    status: 'dip' | 'fair' | 'heated';
    label: string;
  };
  gasTracker: {
    ethGwei: number;
    btcSatVb: number;
    status: 'low' | 'normal' | 'high';
  };
  btcDominance: {
    percent: number;
    signal: string;
  };
}

export type TabType = 'markets' | 'portfolio';
export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';
