import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  ConnectionStatus,
  Currency,
  MarketAnalyticsData,
  PortfolioAsset,
  PortfolioBackupData,
  PortfolioGroup,
  TabType,
  TickerData,
} from '../types/crypto';

interface CryptoState {
  // Watchlist & Portfolio Groups (Persisted)
  watchlist: string[];
  portfolioGroups: PortfolioGroup[];
  activeGroupId: string;
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

  // Group Management Actions
  createPortfolioGroup: (name: string) => string;
  switchPortfolioGroup: (groupId: string) => void;
  renamePortfolioGroup: (groupId: string, newName: string) => void;
  deletePortfolioGroup: (groupId: string) => boolean;

  // Backup & Restore Actions
  exportBackupData: () => PortfolioBackupData;
  importBackupData: (backup: PortfolioBackupData) => { success: boolean; message: string };

  // Asset Actions (Operate on Active Group)
  setCurrency: (c: Currency) => void;
  setAnalyticsData: (data: MarketAnalyticsData) => void;
  addToWatchlist: (symbol: string) => void;
  removeFromWatchlist: (symbol: string) => void;
  moveWatchlistItem: (symbol: string, direction: 'up' | 'down') => void;
  reorderWatchlist: (sourceIndex: number, targetIndex: number) => void;
  addPortfolioAsset: (asset: Omit<PortfolioAsset, 'id' | 'timestamp'>) => void;
  sellPortfolioAsset: (id: string, sellAmount: number, sellPrice: number) => { pnl: number; success: boolean };
  removePortfolioAsset: (id: string) => void;
  updateTicker: (data: Partial<TickerData> & { symbol: string; price: number }) => void;
  updateTickersBatch: (dataList: (Partial<TickerData> & { symbol: string; price: number })[]) => void;
  setActiveTab: (tab: TabType) => void;
  setSelectedCoinForChart: (symbol: string | null) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  toggleHideBalances: () => void;
}

const DEFAULT_WATCHLIST = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'USDTTRY'];

const DEFAULT_INITIAL_ASSETS: PortfolioAsset[] = [
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
];

const DEFAULT_GROUPS: PortfolioGroup[] = [
  {
    id: 'group-main',
    name: 'Ana Kasa',
    assets: DEFAULT_INITIAL_ASSETS,
    realizedPnL: 0,
    createdAt: Date.now() - 86400000 * 30,
  },
  {
    id: 'group-spot',
    name: 'Spot / Al-Sat',
    assets: [],
    realizedPnL: 0,
    createdAt: Date.now() - 86400000 * 10,
  },
];

export const useCryptoStore = create<CryptoState>()(
  persist(
    (set, get) => ({
      watchlist: DEFAULT_WATCHLIST,
      portfolioGroups: DEFAULT_GROUPS,
      activeGroupId: 'group-main',
      portfolio: DEFAULT_INITIAL_ASSETS,
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

      moveWatchlistItem: (symbol: string, direction: 'up' | 'down') => {
        const current = get().watchlist;
        const index = current.indexOf(symbol);
        if (index === -1) return;

        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= current.length) return;

        const nextList = [...current];
        const [removed] = nextList.splice(index, 1);
        nextList.splice(targetIndex, 0, removed);

        set({ watchlist: nextList });
      },

      reorderWatchlist: (sourceIndex: number, targetIndex: number) => {
        const current = [...get().watchlist];
        if (
          sourceIndex < 0 ||
          sourceIndex >= current.length ||
          targetIndex < 0 ||
          targetIndex >= current.length ||
          sourceIndex === targetIndex
        ) {
          return;
        }
        const [moved] = current.splice(sourceIndex, 1);
        current.splice(targetIndex, 0, moved);
        set({ watchlist: current });
      },

      // --- Multi-Portfolio Group Management ---
      createPortfolioGroup: (name: string) => {
        const state = get();
        const trimmed = name.trim();
        const groupName = trimmed || `Portföy ${state.portfolioGroups.length + 1}`;
        const newGroupId = `group-${Date.now()}`;
        const newGroup: PortfolioGroup = {
          id: newGroupId,
          name: groupName,
          assets: [],
          realizedPnL: 0,
          createdAt: Date.now(),
        };

        set({
          portfolioGroups: [...state.portfolioGroups, newGroup],
          activeGroupId: newGroupId,
          portfolio: [],
          realizedPnL: 0,
        });

        return newGroupId;
      },

      switchPortfolioGroup: (groupId: string) => {
        const state = get();
        const target = state.portfolioGroups.find((g) => g.id === groupId);
        if (!target) return;

        set({
          activeGroupId: target.id,
          portfolio: [...target.assets],
          realizedPnL: target.realizedPnL,
        });
      },

      renamePortfolioGroup: (groupId: string, newName: string) => {
        const trimmed = newName.trim();
        if (!trimmed) return;
        set((state) => ({
          portfolioGroups: state.portfolioGroups.map((g) =>
            g.id === groupId ? { ...g, name: trimmed } : g
          ),
        }));
      },

      deletePortfolioGroup: (groupId: string) => {
        const state = get();
        if (state.portfolioGroups.length <= 1) {
          return false; // Cannot delete last remaining portfolio group
        }

        const remaining = state.portfolioGroups.filter((g) => g.id !== groupId);
        let nextActive = remaining[0];
        if (state.activeGroupId === groupId) {
          nextActive = remaining[0];
        } else {
          nextActive = remaining.find((g) => g.id === state.activeGroupId) || remaining[0];
        }

        set({
          portfolioGroups: remaining,
          activeGroupId: nextActive.id,
          portfolio: [...nextActive.assets],
          realizedPnL: nextActive.realizedPnL,
        });

        return true;
      },

      // --- Backup & Restore ---
      exportBackupData: () => {
        const state = get();
        return {
          version: '2.5',
          exportedAt: Date.now(),
          groups: state.portfolioGroups,
          activeGroupId: state.activeGroupId,
          watchlist: state.watchlist,
        };
      },

      importBackupData: (backup: PortfolioBackupData) => {
        if (!backup || !Array.isArray(backup.groups) || backup.groups.length === 0) {
          return { success: false, message: 'Geçersiz veya boş yedek dosyası.' };
        }

        // Validate group schema integrity
        const validGroups: PortfolioGroup[] = backup.groups
          .filter((g) => g && typeof g.id === 'string' && typeof g.name === 'string')
          .map((g) => ({
            id: g.id,
            name: g.name,
            assets: Array.isArray(g.assets)
              ? g.assets.map((a) => ({
                  id: a.id || `asset-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                  symbol: (a.symbol || '').toUpperCase(),
                  amount: Number(a.amount) || 0,
                  buyPrice: Number(a.buyPrice) || 0,
                  timestamp: Number(a.timestamp) || Date.now(),
                }))
              : [],
            realizedPnL: Number(g.realizedPnL) || 0,
            createdAt: Number(g.createdAt) || Date.now(),
          }));

        if (validGroups.length === 0) {
          return { success: false, message: 'Yedek dosyasında geçerli portföy grubu bulunamadı.' };
        }

        const targetActiveId = validGroups.some((g) => g.id === backup.activeGroupId)
          ? backup.activeGroupId
          : validGroups[0].id;

        const activeGroup = validGroups.find((g) => g.id === targetActiveId) || validGroups[0];

        set((state) => ({
          portfolioGroups: validGroups,
          activeGroupId: activeGroup.id,
          portfolio: [...activeGroup.assets],
          realizedPnL: activeGroup.realizedPnL,
          watchlist: Array.isArray(backup.watchlist) && backup.watchlist.length > 0
            ? backup.watchlist
            : state.watchlist,
        }));

        return {
          success: true,
          message: `${validGroups.length} portföy grubu başarıyla geri yüklendi.`,
        };
      },

      // --- Asset Actions on Active Group ---
      addPortfolioAsset: (assetData) => {
        const cleanSymbol = assetData.symbol.trim().toUpperCase();
        const state = get();
        const currentPortfolio = state.portfolio;
        const currentWatchlist = state.watchlist;

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

        const updatedGroups = state.portfolioGroups.map((g) =>
          g.id === state.activeGroupId ? { ...g, assets: updatedPortfolio } : g
        );

        if (!currentWatchlist.includes(cleanSymbol)) {
          set({
            watchlist: [...currentWatchlist, cleanSymbol],
            portfolio: updatedPortfolio,
            portfolioGroups: updatedGroups,
          });
        } else {
          set({
            portfolio: updatedPortfolio,
            portfolioGroups: updatedGroups,
          });
        }
      },

      sellPortfolioAsset: (id, sellAmount, sellPrice) => {
        const state = get();
        const currentPortfolio = state.portfolio;
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

        const newRealizedPnL = state.realizedPnL + pnl;
        const updatedGroups = state.portfolioGroups.map((g) =>
          g.id === state.activeGroupId
            ? { ...g, assets: updatedPortfolio, realizedPnL: newRealizedPnL }
            : g
        );

        set({
          portfolio: updatedPortfolio,
          realizedPnL: newRealizedPnL,
          portfolioGroups: updatedGroups,
        });

        return { pnl, success: true };
      },

      removePortfolioAsset: (id: string) => {
        set((state) => {
          const updatedPortfolio = state.portfolio.filter((asset) => asset.id !== id);
          const updatedGroups = state.portfolioGroups.map((g) =>
            g.id === state.activeGroupId ? { ...g, assets: updatedPortfolio } : g
          );
          return {
            portfolio: updatedPortfolio,
            portfolioGroups: updatedGroups,
          };
        });
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

      updateTickersBatch: (incomingList) => {
        if (!incomingList || incomingList.length === 0) return;
        set((state) => {
          const nextTickers = { ...state.tickers };
          let tryRate = state.tryRate;
          let eurRate = state.eurRate;

          for (let i = 0; i < incomingList.length; i++) {
            const incoming = incomingList[i];
            if (!incoming.symbol || incoming.price === undefined) continue;

            const prev = nextTickers[incoming.symbol];
            let direction: 'up' | 'down' | null = null;
            if (prev && prev.price !== incoming.price) {
              direction = incoming.price > prev.price ? 'up' : 'down';
            } else if (prev) {
              direction = prev.direction;
            }

            nextTickers[incoming.symbol] = {
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

            if (incoming.symbol === 'USDTTRY') {
              tryRate = incoming.price;
            } else if (incoming.symbol === 'EURUSDT') {
              eurRate = incoming.price;
            }
          }

          return {
            tickers: nextTickers,
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
        portfolioGroups: state.portfolioGroups,
        activeGroupId: state.activeGroupId,
        portfolio: state.portfolio,
        hideBalances: state.hideBalances,
        realizedPnL: state.realizedPnL,
        currency: state.currency,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;

        // Auto-migration from flat portfolio to portfolioGroups
        if (!state.portfolioGroups || state.portfolioGroups.length === 0) {
          const assets = state.portfolio && state.portfolio.length > 0
            ? state.portfolio
            : DEFAULT_INITIAL_ASSETS;

          state.portfolioGroups = [
            {
              id: 'group-main',
              name: 'Ana Kasa',
              assets,
              realizedPnL: state.realizedPnL || 0,
              createdAt: Date.now(),
            },
            {
              id: 'group-spot',
              name: 'Spot / Al-Sat',
              assets: [],
              realizedPnL: 0,
              createdAt: Date.now(),
            },
          ];
          state.activeGroupId = 'group-main';
        }

        // Validate active group and synchronize active state
        const active = state.portfolioGroups.find((g) => g.id === state.activeGroupId) || state.portfolioGroups[0];
        state.activeGroupId = active.id;
        state.portfolio = [...active.assets];
        state.realizedPnL = active.realizedPnL || 0;
      },
    }
  )
);
