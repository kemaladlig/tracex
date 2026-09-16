import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ConnectionStatus, PortfolioAsset, TabType, TickerData } from '../types/crypto';

interface CryptoState {
  // Watchlist & Portfolio (Persisted)
  watchlist: string[];
  portfolio: PortfolioAsset[];
  
  // Realtime Data (Memory only)
  tickers: Record<string, TickerData>;
  activeTab: TabType;
  selectedCoinForChart: string | null;
  connectionStatus: ConnectionStatus;

  // Actions
  addToWatchlist: (symbol: string) => void;
  removeFromWatchlist: (symbol: string) => void;
  addPortfolioAsset: (asset: Omit<PortfolioAsset, 'id' | 'timestamp'>) => void;
  removePortfolioAsset: (id: string) => void;
  updateTicker: (data: Partial<TickerData> & { symbol: string; price: number }) => void;
  setActiveTab: (tab: TabType) => void;
  setSelectedCoinForChart: (symbol: string | null) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
}

const DEFAULT_WATCHLIST = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];

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
      tickers: {},
      activeTab: 'markets',
      selectedCoinForChart: null,
      connectionStatus: 'connecting',

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
        const newAsset: PortfolioAsset = {
          ...assetData,
          id: `asset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          symbol: assetData.symbol.trim().toUpperCase(),
          timestamp: Date.now(),
        };

        // Also ensure it is in the watchlist for live stream
        const currentWatchlist = get().watchlist;
        if (!currentWatchlist.includes(newAsset.symbol)) {
          set((state) => ({
            watchlist: [...state.watchlist, newAsset.symbol],
            portfolio: [newAsset, ...state.portfolio],
          }));
        } else {
          set((state) => ({
            portfolio: [newAsset, ...state.portfolio],
          }));
        }
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

          return {
            tickers: {
              ...state.tickers,
              [incoming.symbol]: updated,
            },
          };
        });
      },

      setActiveTab: (tab) => set({ activeTab: tab }),
      setSelectedCoinForChart: (symbol) => set({ selectedCoinForChart: symbol }),
      setConnectionStatus: (status) => set({ connectionStatus: status }),
    }),
    {
      name: 'tracex-storage-v1',
      storage: createJSONStorage(() => localStorage),
      // Only persist watchlist and portfolio, keep realtime tickers in memory
      partialize: (state) => ({
        watchlist: state.watchlist,
        portfolio: state.portfolio,
      }),
    }
  )
);
