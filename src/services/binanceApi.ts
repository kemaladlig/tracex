import type { CandleData } from '../types/crypto';

const BINANCE_REST_BASE = 'https://api.binance.com/api/v3';

export interface Binance24hRaw {
  symbol: string;
  lastPrice: string;
  priceChange: string;
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
  changeAmount24h: number;
  high24h: number;
  low24h: number;
  volume: number;
  quoteVolume: number;
}

export interface UsdtMarketSnapshot {
  coins: CoinSearchResult[];
  updatedAt: number;
  isFallback: boolean;
}

let cachedCoinList: CoinSearchResult[] | null = null;
let cacheTimestamp = 0;
let inFlightCoinList: Promise<UsdtMarketSnapshot> | null = null;
let marketUpdatedAt = 0;
let marketUsesFallback = false;
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache

/**
 * Fetch historical Kline / Candlestick data for lightweight-charts
 */
export const fetchHistoricalKlines = async (
  symbol: string,
  interval: string = '1h',
  limit: number = 1000
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

const FALLBACK_MARKET_COINS: CoinSearchResult[] = [
  { symbol: 'BTCUSDT', baseAsset: 'BTC', price: 90000, changePercent24h: 1.5, changeAmount24h: 1350, high24h: 91200, low24h: 88800, volume: 11000, quoteVolume: 1000000 },
  { symbol: 'ETHUSDT', baseAsset: 'ETH', price: 2700, changePercent24h: -0.8, changeAmount24h: -21.6, high24h: 2750, low24h: 2680, volume: 296000, quoteVolume: 800000 },
  { symbol: 'SOLUSDT', baseAsset: 'SOL', price: 180, changePercent24h: 3.2, changeAmount24h: 5.76, high24h: 184, low24h: 174, volume: 2777000, quoteVolume: 500000 },
  { symbol: 'BNBUSDT', baseAsset: 'BNB', price: 620, changePercent24h: 0.4, changeAmount24h: 2.48, high24h: 626, low24h: 615, volume: 483000, quoteVolume: 300000 },
  { symbol: 'AVAXUSDT', baseAsset: 'AVAX', price: 28, changePercent24h: -1.2, changeAmount24h: -0.34, high24h: 28.6, low24h: 27.7, volume: 7142000, quoteVolume: 200000 },
  { symbol: 'XRPUSDT', baseAsset: 'XRP', price: 2.3, changePercent24h: 5.1, changeAmount24h: 0.117, high24h: 2.36, low24h: 2.19, volume: 173900000, quoteVolume: 400000 },
  { symbol: 'DOGEUSDT', baseAsset: 'DOGE', price: 0.25, changePercent24h: 2.8, changeAmount24h: 0.007, high24h: 0.256, low24h: 0.243, volume: 1000000000, quoteVolume: 250000 },
  { symbol: 'SUIUSDT', baseAsset: 'SUI', price: 3.2, changePercent24h: 4.5, changeAmount24h: 0.144, high24h: 3.28, low24h: 3.06, volume: 68750000, quoteVolume: 220000 },
  { symbol: 'PEPEUSDT', baseAsset: 'PEPE', price: 0.00001, changePercent24h: 6.7, changeAmount24h: 0.00000067, high24h: 0.0000103, low24h: 0.0000094, volume: 18000000000000, quoteVolume: 180000 },
  { symbol: 'NEARUSDT', baseAsset: 'NEAR', price: 5.5, changePercent24h: -0.5, changeAmount24h: -0.0275, high24h: 5.58, low24h: 5.44, volume: 27270000, quoteVolume: 150000 },
];

export const fetchUsdtMarketSnapshot = async (forceFresh = false): Promise<UsdtMarketSnapshot> => {
  const now = Date.now();
  if (!forceFresh && cachedCoinList && now - cacheTimestamp < CACHE_TTL_MS) {
    return { coins: cachedCoinList, updatedAt: cacheTimestamp, isFallback: marketUsesFallback };
  }
  if (inFlightCoinList) return inFlightCoinList;

  inFlightCoinList = (async () => {
    try {
      const response = await fetch(`${BINANCE_REST_BASE}/ticker/24hr`);
      if (!response.ok) throw new Error('Failed to fetch 24h ticker data');
      const data: Binance24hRaw[] = await response.json();
      const coins = data
        .filter((item) => item.symbol.endsWith('USDT') && !item.symbol.includes('UPUSDT') && !item.symbol.includes('DOWNUSDT'))
        .map((item) => ({
          symbol: item.symbol,
          baseAsset: item.symbol.replace('USDT', ''),
          price: parseFloat(item.lastPrice),
          changePercent24h: parseFloat(item.priceChangePercent),
          changeAmount24h: parseFloat(item.priceChange),
          high24h: parseFloat(item.highPrice),
          low24h: parseFloat(item.lowPrice),
          volume: parseFloat(item.volume),
          quoteVolume: parseFloat(item.quoteVolume),
        }))
        .filter((coin) => Number.isFinite(coin.price) && Number.isFinite(coin.quoteVolume))
        .sort((a, b) => b.quoteVolume - a.quoteVolume);

      cachedCoinList = coins;
      cacheTimestamp = Date.now();
      marketUpdatedAt = cacheTimestamp;
      marketUsesFallback = false;
      return { coins, updatedAt: marketUpdatedAt, isFallback: false };
    } catch (error) {
      console.warn('Binance market snapshot fallback:', error);
      const coins = cachedCoinList ?? FALLBACK_MARKET_COINS;
      marketUpdatedAt = cachedCoinList ? cacheTimestamp : 0;
      marketUsesFallback = true;
      return { coins, updatedAt: marketUpdatedAt, isFallback: true };
    } finally {
      inFlightCoinList = null;
    }
  })();

  return inFlightCoinList;
};

export const fetchAllUsdtPairs = async (forceFresh = false): Promise<CoinSearchResult[]> =>
  (await fetchUsdtMarketSnapshot(forceFresh)).coins;

export type MarketCategory = 'favorites' | 'all' | 'l1' | 'l2' | 'meme' | 'ai' | 'defi';

export const CATEGORY_TAGS: Record<Exclude<MarketCategory, 'favorites' | 'all'>, string[]> = {
  l1: [
    'BTC', 'ETH', 'SOL', 'BNB', 'ADA', 'AVAX', 'SUI', 'TON', 'DOT', 'NEAR',
    'TRX', 'APT', 'SEI', 'ATOM', 'FTM', 'ALGO', 'KAS', 'INJ', 'HBAR', 'ICP',
    'TIA', 'ROSE', 'CELO', 'EOS', 'NEO', 'XTZ', 'KAVA', 'FLOW', 'EGLD', 'ZIL',
  ],
  l2: [
    'ARB', 'OP', 'POL', 'MATIC', 'STRK', 'MNT', 'BLAST', 'ZK', 'IMX', 'MANTA',
    'METIS', 'SCROLL', 'ZRO', 'DYM', 'TAIKO', 'LRC', 'BOBA',
  ],
  meme: [
    'DOGE', 'SHIB', 'PEPE', 'WIF', 'BONK', 'FLOKI', 'BOME', 'POPCAT', 'NEIRO',
    'BRETT', 'MEW', 'TURBO', '1000SATS', 'ORDI', 'MEME', 'PEOPLE', 'NOT', 'PENGU',
    'SLERF', 'MYRO', 'BABYDOGE', 'CAT', 'LADYS',
  ],
  ai: [
    'FET', 'RENDER', 'TAO', 'NEAR', 'GRT', 'WLD', 'ARKM', 'AI', 'IO', 'GLM',
    'THETA', 'AGIX', 'OCEAN', 'PHB', 'NMR', 'RLC', 'LPT', 'ACT', 'VIRTUAL',
  ],
  defi: [
    'UNI', 'AAVE', 'MKR', 'LINK', 'CRV', 'PENDLE', 'LDO', 'SNX', 'RUNE', 'DYDX',
    'JUP', 'CAKE', 'COMP', '1INCH', 'SUSHI', 'ENA', 'RAY', 'COW', 'MORPHO',
    'KAVA', 'BAL', 'YFI', 'CVX', 'RPL', 'GMX', 'AERODROME',
  ],
};

/**
 * Get top coins for a specific category (25 for all, 12 for other groups), sorted by 24h quote volume
 */
export const filterMarketCategory = (
  coins: CoinSearchResult[],
  category: MarketCategory,
  limit?: number
): CoinSearchResult[] => {
  const maxLimit = limit ?? (category === 'all' ? 25 : 12);
  if (category === 'all' || category === 'favorites') return coins.slice(0, maxLimit);
  const categorySymbols = CATEGORY_TAGS[category] ?? [];
  return coins.filter((coin) => categorySymbols.includes(coin.baseAsset)).slice(0, maxLimit);
};

export const getCategoryCoins = async (
  category: MarketCategory,
  limit?: number
): Promise<CoinSearchResult[]> => filterMarketCategory(await fetchAllUsdtPairs(), category, limit);

