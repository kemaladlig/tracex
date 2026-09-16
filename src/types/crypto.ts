export type PriceDirection = 'up' | 'down' | null;

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

export interface CandleData {
  time: number; // in seconds for lightweight-charts
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export type TabType = 'markets' | 'portfolio';
export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';
