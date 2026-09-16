import type { CandleData } from '../types/crypto';

const BINANCE_REST_BASE = 'https://api.binance.com/api/v3';

export interface Binance24hRaw {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
}

export interface CoinSearchResult {
  symbol: string;
  baseAsset: string;
  price: number;
  changePercent24h: number;
  quoteVolume: number;
}

let cachedCoinList: CoinSearchResult[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache

/**
 * Fetch historical Kline / Candlestick data for lightweight-charts
 */
export const fetchHistoricalKlines = async (
  symbol: string,
  interval: string = '1h',
  limit: number = 100
): Promise<CandleData[]> => {
  try {
    const formattedSymbol = symbol.toUpperCase().replace('/', '');
    const url = `${BINANCE_REST_BASE}/klines?symbol=${formattedSymbol}&interval=${interval}&limit=${limit}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status} ${response.statusText}`);
    }

    const rawData = await response.json();

    const candles: CandleData[] = rawData.map((item: (number | string)[]) => ({
      time: Math.floor(Number(item[0]) / 1000),
      open: parseFloat(item[1] as string),
      high: parseFloat(item[2] as string),
      low: parseFloat(item[3] as string),
      close: parseFloat(item[4] as string),
      volume: parseFloat(item[5] as string),
    }));

    candles.sort((a, b) => a.time - b.time);

    return candles;
  } catch (err) {
    console.error(`Failed to fetch klines for ${symbol}:`, err);
    return [];
  }
};

/**
 * Fetch all USDT trading pairs on Binance with live prices and volume
 */
export const fetchAllUsdtPairs = async (): Promise<CoinSearchResult[]> => {
  const now = Date.now();
  if (cachedCoinList && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedCoinList;
  }

  try {
    const response = await fetch(`${BINANCE_REST_BASE}/ticker/24hr`);
    if (!response.ok) throw new Error('Failed to fetch 24h ticker data');

    const data: Binance24hRaw[] = await response.json();

    const usdtCoins: CoinSearchResult[] = data
      .filter((item) => item.symbol.endsWith('USDT') && !item.symbol.includes('UPUSDT') && !item.symbol.includes('DOWNUSDT'))
      .map((item) => ({
        symbol: item.symbol,
        baseAsset: item.symbol.replace('USDT', ''),
        price: parseFloat(item.lastPrice),
        changePercent24h: parseFloat(item.priceChangePercent),
        quoteVolume: parseFloat(item.quoteVolume),
      }))
      .sort((a, b) => b.quoteVolume - a.quoteVolume); // Top volume first

    cachedCoinList = usdtCoins;
    cacheTimestamp = now;
    return usdtCoins;
  } catch (err) {
    console.warn('Fallback to popular symbols list:', err);
    return [
      { symbol: 'BTCUSDT', baseAsset: 'BTC', price: 90000, changePercent24h: 1.5, quoteVolume: 1000000 },
      { symbol: 'ETHUSDT', baseAsset: 'ETH', price: 2700, changePercent24h: -0.8, quoteVolume: 800000 },
      { symbol: 'SOLUSDT', baseAsset: 'SOL', price: 180, changePercent24h: 3.2, quoteVolume: 500000 },
      { symbol: 'BNBUSDT', baseAsset: 'BNB', price: 620, changePercent24h: 0.4, quoteVolume: 300000 },
      { symbol: 'AVAXUSDT', baseAsset: 'AVAX', price: 28, changePercent24h: -1.2, quoteVolume: 200000 },
      { symbol: 'XRPUSDT', baseAsset: 'XRP', price: 2.3, changePercent24h: 5.1, quoteVolume: 400000 },
      { symbol: 'DOGEUSDT', baseAsset: 'DOGE', price: 0.25, changePercent24h: 2.8, quoteVolume: 250000 },
      { symbol: 'SUIUSDT', baseAsset: 'SUI', price: 3.2, changePercent24h: 4.5, quoteVolume: 220000 },
      { symbol: 'PEPEUSDT', baseAsset: 'PEPE', price: 0.00001, changePercent24h: 6.7, quoteVolume: 180000 },
      { symbol: 'NEARUSDT', baseAsset: 'NEAR', price: 5.5, changePercent24h: -0.5, quoteVolume: 150000 },
    ];
  }
};
