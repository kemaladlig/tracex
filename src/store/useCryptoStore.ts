import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ConnectionStatus, Currency, MarketAnalyticsData, PortfolioAsset, TabType, TickerData } from '../types/crypto';

interface CryptoState {
  // Watchlist & Portfolio (Persisted)
  watchlist: string[];
  portfolio: PortfolioAsset[];
  hideBalances: boolean;
  realizedPnL: number;
  currency: Currency;
  
  // Realtime Data (Memory only)
  tickers: Record<string, TickerData>;
  tryRate: number;
  eurRate: number;
  analyticsData: MarketAnalyticsData | null;
  activeTab: TabType;
  selectedCoinForChart: string | null;
  connectionStatus: ConnectionStatus;

  // Actions
  setCurrency: (c: Currency) => void;
  setAnalyticsData: (data: MarketAnalyticsData) => void;
  addToWatchlist: (symbol: string) => void;
  removeFromWatchlist: (symbol: string) => void;
  addPortfolioAsset: (asset: Omit<PortfolioAsset, 'id' | 'timestamp'>) => void;
  sellPortfolioAsset: (id: string, sellAmount: number, sellPrice: number) => { pnl: number; success: boolean };
  removePortfolioAsset: (id: string) => void;
  updateTicker: (data: Partial<TickerData> & { symbol: string; price: number }) => void;
  setActiveTab: (tab: TabType) => void;
  setSelectedCoinForChart: (symbol: string | null) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  toggleHideBalances: () => void;
}

const DEFAULT_WATCHLIST = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'USDTTRY'];

export const useCryptoStore = create<CryptoState>()(
  persist(
    (set, get) => ({
      watchlist: DEFAULT_WATCHLIST,
      portfolio: [
        {
          id: 'default-btc',
          symbol: 'BTCUSDT',
          amount: 0.15,
          buyPrice: 85000,
          timestamp: Date.now() - 86400000 * 7,
        },
        {
          id: 'default-eth',
          symbol: 'ETHUSDT',
          amount: 1.5,
          buyPrice: 2800,
          timestamp: Date.now() - 86400000 * 3,
        },
      ],
      hideBalances: false,
      realizedPnL: 0,
      currency: 'USD',
      tickers: {},
      tryRate: 38.65,
      eurRate: 1.08,
      analyticsData: null,
      activeTab: 'markets',
      selectedCoinForChart: null,
      connectionStatus: 'connecting',

      setCurrency: (currency) => set({ currency }),
      setAnalyticsData: (analyticsData) => set({ analyticsData }),
      toggleHideBalances: () => set((state) => ({ hideBalances: !state.hideBalances })),

      addToWatchlist: (rawSymbol: string) => {
        const symbol = rawSymbol.trim().toUpperCase();
        if (!symbol) return;
        const current = get().watchlist;
        if (!current.includes(symbol)) {
          set({ watchlist: [...current, symbol] });
        }
      },

      removeFromWatchlist: (symbol: string) => {
        const current = get().watchlist;
        set({ watchlist: current.filter((s) => s !== symbol) });
      },

      addPortfolioAsset: (assetData) => {
        const cleanSymbol = assetData.symbol.trim().toUpperCase();
        const currentPortfolio = get().portfolio;
        const currentWatchlist = get().watchlist;

        const existingIndex = currentPortfolio.findIndex((p) => p.symbol === cleanSymbol);

        let updatedPortfolio: PortfolioAsset[];
        if (existingIndex > -1) {
          const existing = currentPortfolio[existingIndex];
          const totalAmount = existing.amount + assetData.amount;
          const weightedBuyPrice =
            (existing.amount * existing.buyPrice + assetData.amount * assetData.buyPrice) / totalAmount;

          const updatedAsset: PortfolioAsset = {
            ...existing,
            amount: totalAmount,
            buyPrice: weightedBuyPrice,
            timestamp: Date.now(),
          };

          updatedPortfolio = [...currentPortfolio];
          updatedPortfolio[existingIndex] = updatedAsset;
        } else {
          const newAsset: PortfolioAsset = {
            ...assetData,
            id: `asset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            symbol: cleanSymbol,
            timestamp: Date.now(),
          };
          updatedPortfolio = [newAsset, ...currentPortfolio];
        }

        if (!currentWatchlist.includes(cleanSymbol)) {
          set({
            watchlist: [...currentWatchlist, cleanSymbol],
            portfolio: updatedPortfolio,
          });
        } else {
          set({ portfolio: updatedPortfolio });
        }
      },

      sellPortfolioAsset: (id, sellAmount, sellPrice) => {
        const currentPortfolio = get().portfolio;
        const asset = currentPortfolio.find((p) => p.id === id);
        if (!asset || sellAmount <= 0) return { pnl: 0, success: false };

        const actualSellAmount = Math.min(sellAmount, asset.amount);
        const pnl = actualSellAmount * (sellPrice - asset.buyPrice);
        const remainingAmount = asset.amount - actualSellAmount;

        let updatedPortfolio: PortfolioAsset[];
        if (remainingAmount <= 0.00000001) {
          updatedPortfolio = currentPortfolio.filter((p) => p.id !== id);
        } else {
          updatedPortfolio = currentPortfolio.map((p) =>
            p.id === id ? { ...p, amount: remainingAmount } : p
          );
        }

        set((state) => ({
          portfolio: updatedPortfolio,
          realizedPnL: state.realizedPnL + pnl,
        }));

        return { pnl, success: true };
      },

      removePortfolioAsset: (id: string) => {
        set((state) => ({
          portfolio: state.portfolio.filter((asset) => asset.id !== id),
        }));
      },

      updateTicker: (incoming) => {
        set((state) => {
          const prev = state.tickers[incoming.symbol];
          let direction: 'up' | 'down' | null = null;

          if (prev && prev.price !== incoming.price) {
            direction = incoming.price > prev.price ? 'up' : 'down';
          } else if (prev) {
            direction = prev.direction;
          }

          const updated: TickerData = {
            symbol: incoming.symbol,
            price: incoming.price,
            changePercent24h: incoming.changePercent24h ?? prev?.changePercent24h ?? 0,
            changeAmount24h: incoming.changeAmount24h ?? prev?.changeAmount24h ?? 0,
            high24h: incoming.high24h ?? prev?.high24h ?? incoming.price,
            low24h: incoming.low24h ?? prev?.low24h ?? incoming.price,
            volume: incoming.volume ?? prev?.volume ?? 0,
            quoteVolume: incoming.quoteVolume ?? prev?.quoteVolume ?? 0,
            direction,
            lastUpdated: Date.now(),
          };

          let tryRate = state.tryRate;
          let eurRate = state.eurRate;
          if (incoming.symbol === 'USDTTRY') {
            tryRate = incoming.price;
          } else if (incoming.symbol === 'EURUSDT') {
            eurRate = incoming.price;
          }

          return {
            tickers: {
              ...state.tickers,
              [incoming.symbol]: updated,
            },
            tryRate,
            eurRate,
          };
        });
      },

      setActiveTab: (tab) => set({ activeTab: tab }),
      setSelectedCoinForChart: (symbol) => set({ selectedCoinForChart: symbol }),
      setConnectionStatus: (status) => set({ connectionStatus: status }),
    }),
    {
      name: 'tracex-storage-v3',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        watchlist: state.watchlist,
        portfolio: state.portfolio,
        hideBalances: state.hideBalances,
        realizedPnL: state.realizedPnL,
        currency: state.currency,
      }),
    }
  )
);
