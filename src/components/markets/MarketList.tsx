import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Plus, Search, BookmarkCheck, ArrowUpDown, Star, Compass, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useCryptoStore } from '../../store/useCryptoStore';
import { MarketItem } from './MarketItem';
import { AddWatchlistModal } from './AddWatchlistModal';
import { MarketTrendsBanner } from './MarketTrendsBanner';
import {
  getCategoryCoins,
  fetchAllUsdtPairs,
  type MarketCategory,
  type CoinSearchResult,
} from '../../services/binanceApi';
import { triggerHaptic } from '../../utils/haptics';

type SortOption = 'default' | 'gainers' | 'losers' | 'volume' | 'name';

const CATEGORY_TABS: { id: MarketCategory; label: string; hasStar?: boolean }[] = [
  { id: 'favorites', label: 'FAVORİLER', hasStar: true },
  { id: 'all', label: 'TÜMÜ' },
  { id: 'l1', label: 'LAYER 1' },
  { id: 'l2', label: 'LAYER 2' },
  { id: 'meme', label: 'MEME' },
  { id: 'ai', label: 'YAPAY ZEKA' },
  { id: 'defi', label: 'DEFI' },
];

const SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: 'default', label: 'Varsayılan' },
  { id: 'gainers', label: 'En Çok Artan' },
  { id: 'losers', label: 'En Çok Düşen' },
  { id: 'volume', label: 'Hacim' },
  { id: 'name', label: 'A-Z' },
];

const TRENDS_COLLAPSE_KEY = 'tracex-trends-collapsed';
const EMPTY_TICKER_SORT_VALUES: Readonly<Record<string, string>> = {};

interface MarketListProps {
  refreshNonce?: number;
}

export const MarketList: React.FC<MarketListProps> = ({ refreshNonce = 0 }) => {
  const watchlist = useCryptoStore((state) => state.watchlist);
  const reorderWatchlist = useCryptoStore((state) => state.reorderWatchlist);
  const updateTickersBatch = useCryptoStore((state) => state.updateTickersBatch);
  const setActiveMarketSymbols = useCryptoStore((state) => state.setActiveMarketSymbols);

  const [category, setCategory] = useState<MarketCategory>('favorites');
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const tickerSortValues = useCryptoStore(
    useShallow((state) => {
      if (sortBy === 'default') return EMPTY_TICKER_SORT_VALUES;
      const values: Record<string, string> = {};
      for (const [symbol, ticker] of Object.entries(state.tickers)) {
        values[symbol] = `${ticker.changePercent24h}|${ticker.quoteVolume}`;
      }
      return values;
    })
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [isTrendsCollapsed, setIsTrendsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(TRENDS_COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const sortMenuRef = useRef<HTMLDivElement>(null);

  // Market coins cache & active category 25-coin list
  const [allMarketCoins, setAllMarketCoins] = useState<CoinSearchResult[]>([]);
  const [categoryCoins, setCategoryCoins] = useState<CoinSearchResult[]>([]);
  // Derived loading: true only while the requested category has not been loaded yet (no sync setState in effects)
  const [loadedCategory, setLoadedCategory] = useState<string | null>(null);
  const isLoadingCategory = category !== 'favorites' && loadedCategory !== category;

  // Drag and drop state for custom favorites reordering
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  // Close sort menu on outside click
  useEffect(() => {
    if (!isSortMenuOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setIsSortMenuOpen(false);
      }
    };
    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [isSortMenuOpen]);

  const toggleTrends = () => {
    setIsTrendsCollapsed((prev) => {
      try {
        localStorage.setItem(TRENDS_COLLAPSE_KEY, prev ? '0' : '1');
      } catch {
        // ignore
      }
      return !prev;
    });
  };

  // Preload all Binance USDT pairs for instant searching and categorization
  useEffect(() => {
    fetchAllUsdtPairs(refreshNonce > 0).then((coins) => {
      setAllMarketCoins(coins);
    });
  }, [refreshNonce]);

  // Fetch top coins when category changes (async setState only inside .then)
  useEffect(() => {
    if (category === 'favorites') {
      setActiveMarketSymbols([]);
      return;
    }

    let cancelled = false;
    getCategoryCoins(category, undefined, refreshNonce > 0).then((coins) => {
      if (cancelled) return;
      setCategoryCoins(coins);
      setLoadedCategory(category);

      // Subscribe live WebSocket stream to these symbols
      const symbols = coins.map((c) => c.symbol);
      setActiveMarketSymbols(symbols);

      // Prepopulate tickers immediately with full 24h snapshot so there is zero flash.
      // source='rest': fills only unseen symbols, NEVER overwrites live WS data (Binance match).
      // All fields come from the same REST snapshot, so price/%/high/low/volume stay internally consistent.
      const initialBatch = coins.map((c) => ({
        symbol: c.symbol,
        price: c.price,
        changePercent24h: c.changePercent24h,
        changeAmount24h: c.changeAmount24h,
        high24h: c.high24h,
        low24h: c.low24h,
        volume: c.volume,
        quoteVolume: c.quoteVolume,
      }));
      updateTickersBatch(initialBatch, 'rest');
    });
    return () => {
      cancelled = true;
    };
  }, [category, refreshNonce, setActiveMarketSymbols, updateTickersBatch]);

  // Compute final filtered and sorted symbols
  const displaySymbols = useMemo(() => {
    const getChange = (symbol: string) =>
      Number.parseFloat(tickerSortValues[symbol]?.split('|')[0] ?? '0') || 0;
    const getVolume = (symbol: string) =>
      Number.parseFloat(tickerSortValues[symbol]?.split('|')[1] ?? '0') || 0;
    const query = searchQuery.toLowerCase().trim();

    // 1. Determine base symbol candidates (Search is ALWAYS global across all pairs)
    let baseSymbols: string[] = [];

    if (query) {
      const filtered = allMarketCoins
        .filter(
          (c) =>
            c.symbol.toLowerCase().includes(query) ||
            c.baseAsset.toLowerCase().includes(query)
        )
        .slice(0, 25);
      baseSymbols = filtered.map((c) => c.symbol);
    } else if (category === 'favorites') {
      baseSymbols = watchlist;
    } else {
      baseSymbols = categoryCoins.map((c) => c.symbol);
    }

    // 2. Sorting
    if (sortBy === 'gainers') {
      return [...baseSymbols].sort((a, b) => getChange(b) - getChange(a));
    }
    if (sortBy === 'losers') {
      return [...baseSymbols].sort((a, b) => getChange(a) - getChange(b));
    }
    if (sortBy === 'volume') {
      return [...baseSymbols].sort((a, b) => getVolume(b) - getVolume(a));
    }
    if (sortBy === 'name') {
      return [...baseSymbols].sort((a, b) => a.localeCompare(b));
    }

    // Default sorting
    return baseSymbols;
  }, [category, watchlist, categoryCoins, allMarketCoins, searchQuery, sortBy, tickerSortValues]);

  const isCustomOrder = category === 'favorites' && sortBy === 'default' && !searchQuery.trim();

  // Desktop Drag & Drop Handlers (Only active in custom Favorites order)
  // Stable identities (useCallback + index-passing props) so React.memo on MarketItem actually works
  const handleDragStart = useCallback(
    (idx: number, e: React.DragEvent) => {
      if (!isCustomOrder) return;
      e.dataTransfer.setData('text/plain', String(idx));
      e.dataTransfer.effectAllowed = 'move';
      setDraggedIndex(idx);
    },
    [isCustomOrder]
  );

  const handleDragOver = useCallback(
    (idx: number, e: React.DragEvent) => {
      if (!isCustomOrder) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setOverIndex((prev) => (prev === idx ? prev : idx));
    },
    [isCustomOrder]
  );

  const handleDrop = useCallback(
    (targetIdx: number, e: React.DragEvent) => {
      if (!isCustomOrder) return;
      e.preventDefault();
      const sourceIdxStr = e.dataTransfer.getData('text/plain');
      const sourceIdx = parseInt(sourceIdxStr, 10);
      if (!isNaN(sourceIdx) && sourceIdx !== targetIdx) {
        reorderWatchlist(sourceIdx, targetIdx);
      }
      setDraggedIndex(null);
      setOverIndex(null);
    },
    [isCustomOrder, reorderWatchlist]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setOverIndex(null);
  }, []);

  // Mobile Touch Drag & Drop Handler
  const handleTouchStartHandle = useCallback(
    (_e: React.TouchEvent, startIndex: number) => {
      if (!isCustomOrder) return;
      setDraggedIndex(startIndex);
      let currentTargetIdx = startIndex;

      const handleTouchMove = (moveEvt: TouchEvent) => {
        if (moveEvt.cancelable) {
          moveEvt.preventDefault();
        }
        const touch = moveEvt.touches[0];
        const el = document.elementFromPoint(touch.clientX, touch.clientY);
        const itemEl = el?.closest('[data-drag-index]') as HTMLElement | null;
        if (itemEl && itemEl.dataset.dragIndex !== undefined) {
          const hoverIdx = parseInt(itemEl.dataset.dragIndex, 10);
          if (!isNaN(hoverIdx) && hoverIdx !== currentTargetIdx) {
            currentTargetIdx = hoverIdx;
            setOverIndex(hoverIdx);
          }
        }
      };

      const handleTouchEnd = () => {
        if (currentTargetIdx !== startIndex) {
          reorderWatchlist(startIndex, currentTargetIdx);
        }
        setDraggedIndex(null);
        setOverIndex(null);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
      };

      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
    },
    [isCustomOrder, reorderWatchlist]
  );

  const currentTabInfo = CATEGORY_TABS.find((t) => t.id === category);
  const activeSortLabel = SORT_OPTIONS.find((o) => o.id === sortBy)?.label ?? 'Varsayılan';

  return (
    <div className="flex flex-col pb-28 lg:pb-10 px-4 md:px-6 w-full font-mono animate-tabEnter">
      {/* 24h Top Gainers & Losers Banner (collapsible) */}
      <div className="my-2">
        <button
          onClick={toggleTrends}
          aria-expanded={!isTrendsCollapsed}
          className="flex items-center gap-1 text-[10px] font-mono font-bold text-stone-500 hover:text-stone-900 uppercase tracking-wider px-1 py-1 cursor-pointer"
        >
          {isTrendsCollapsed ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5" />
          )}
          <span>24S Piyasa Bülteni</span>
        </button>
        {!isTrendsCollapsed && <MarketTrendsBanner refreshNonce={refreshNonce} />}
      </div>

      {/* Sticky slim toolbar: search + sort menu + add */}
      <div className="sticky top-0 z-10 -mx-4 px-4 py-2 bg-[#f4f0e6]/95 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 flex items-center">
            <Search className="absolute left-3 w-4 h-4 text-stone-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Tüm piyasada coin veya sembol ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Coin ara"
              className="w-full h-11 pl-9 pr-3 py-2 bg-white border-2 border-stone-900 rounded-md text-stone-900 text-xs font-mono placeholder-stone-400 shadow-hard-sm focus:outline-none focus:bg-stone-50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 text-[10px] bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold px-1.5 py-0.5 rounded cursor-pointer"
              >
                TEMİZLE
              </button>
            )}
          </div>
          <div ref={sortMenuRef} className="relative shrink-0">
            <button
              onClick={() => setIsSortMenuOpen((v) => !v)}
              aria-haspopup="listbox"
              aria-expanded={isSortMenuOpen}
              title={`Sıralama: ${activeSortLabel}`}
              className={`flex items-center gap-1 h-11 px-2.5 bg-white border-2 border-stone-900 text-stone-900 text-[11px] font-mono font-bold rounded-md shadow-hard-sm btn-hard cursor-pointer ${
                sortBy !== 'default' ? 'bg-amber-200' : ''
              }`}
            >
              <ArrowUpDown className="w-4 h-4 stroke-2.5" />
              <span className="hidden min-[380px]:inline max-w-20 truncate">{activeSortLabel}</span>
            </button>
            {isSortMenuOpen && (
              <div
                role="listbox"
                aria-label="Sıralama seç"
                className="absolute right-0 mt-1.5 w-44 bg-white border-2 border-stone-900 rounded-md shadow-hard overflow-hidden z-20 animate-popIn"
              >
                {SORT_OPTIONS.map((item) => (
                  <button
                    key={item.id}
                    role="option"
                    aria-selected={sortBy === item.id}
                    onClick={() => {
                      triggerHaptic('light');
                      setSortBy(item.id);
                      setIsSortMenuOpen(false);
                    }}
                    className={`flex items-center justify-between w-full px-3 h-11 text-xs font-mono font-bold cursor-pointer transition-colors ${
                      sortBy === item.id
                        ? 'bg-amber-200 text-stone-950'
                        : 'text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <span>{item.label}</span>
                    {sortBy === item.id && <Check className="w-4 h-4 stroke-3" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            aria-label="Coin ekle"
            className="flex items-center justify-center gap-1 h-11 min-w-11 px-2.5 bg-amber-300 hover:bg-amber-400 border-2 border-stone-900 text-stone-900 text-xs font-mono font-bold rounded-md shadow-hard-sm btn-hard cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 stroke-3" />
            <span className="hidden min-[380px]:inline">Ekle</span>
          </button>
        </div>

        {/* Category Pills Bar (Favorites, All, L1, L2, Meme, AI, DeFi) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-2 font-mono text-[11px] md:flex-wrap md:overflow-visible">
          {CATEGORY_TABS.map((item) => {
            const isActive = category === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  triggerHaptic('light');
                  setCategory(item.id);
                }}
                aria-pressed={isActive}
                className={`flex items-center gap-1.5 px-2.5 h-9 rounded-md font-bold whitespace-nowrap border-2 cursor-pointer transition-all shrink-0 ${
                  isActive
                    ? 'bg-stone-900 text-amber-300 border-stone-900 shadow-hard-xs'
                    : 'bg-white text-stone-700 border-stone-900/30 hover:bg-stone-100'
                }`}
              >
                {item.hasStar && (
                  <Star
                    className={`w-3.5 h-3.5 ${
                      isActive
                        ? 'fill-amber-300 stroke-amber-300'
                        : 'fill-amber-400 stroke-stone-600 stroke-1.5'
                    }`}
                  />
                )}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* List count line */}
      <div className="flex items-center gap-1.5 px-1 pt-1 pb-2 text-xs font-mono font-black text-stone-900 uppercase tracking-wider">
        {searchQuery.trim() ? (
          <>
            <Search className="w-3.5 h-3.5 text-amber-600" />
            <span className="tabular-nums">Arama Sonuçları • {displaySymbols.length}</span>
          </>
        ) : category === 'favorites' ? (
          <>
            <BookmarkCheck className="w-3.5 h-3.5" />
            <span className="tabular-nums">Favorilerim • {displaySymbols.length}</span>
          </>
        ) : (
          <>
            <Compass className="w-3.5 h-3.5 text-amber-600" />
            <span className="tabular-nums">
              {currentTabInfo?.label} • {displaySymbols.length}
            </span>
          </>
        )}
      </div>

      {/* Loading indicator for category switch */}
      {isLoadingCategory && displaySymbols.length === 0 && (
        <div className="p-8 text-center bg-white border-2 border-stone-900 rounded-lg shadow-hard-sm my-2">
          <div className="w-6 h-6 border-2 border-stone-900 border-t-amber-400 rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs font-bold text-stone-700">Piyasa verileri yükleniyor...</p>
        </div>
      )}

      {/* Market Items List */}
      {displaySymbols.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2 md:gap-3 content-start">
          {displaySymbols.map((symbol, idx) => (
            <MarketItem
              key={symbol}
              symbol={symbol}
              index={idx}
              canReorder={isCustomOrder}
              isDragging={draggedIndex === idx}
              isDragOver={overIndex === idx}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragLeave={handleDragEnd}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              onTouchStartHandle={handleTouchStartHandle}
            />
          ))}
        </div>
      ) : (
        !isLoadingCategory && (
          <div className="text-center py-10 px-4 rounded-lg bg-white border-2 border-dashed border-stone-900/60 shadow-hard-sm my-3 font-mono">
            {category === 'favorites' ? (
              <>
                <Star className="w-8 h-8 mx-auto text-amber-400 stroke-stone-900 mb-2 stroke-1.5" />
                <p className="text-stone-900 text-xs font-black uppercase mb-1">
                  Henüz favori coin eklenmedi
                </p>
                <p className="text-stone-500 text-[11px] max-w-xs mx-auto mb-4 font-sans font-medium">
                  <strong>TÜMÜ</strong> veya diğer kategorilerden beğendiğiniz coinlerin yanındaki yıldıza dokunarak buraya anında ekleyebilirsiniz.
                </p>
                <button
                  onClick={() => setCategory('all')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-300 border-2 border-stone-900 text-stone-900 text-xs font-bold rounded-md shadow-hard-sm btn-hard cursor-pointer"
                >
                  <Compass className="w-4 h-4" /> Tüm Piyasayı Keşfet
                </button>
              </>
            ) : (
              <>
                <p className="text-stone-700 text-xs font-bold mb-3">
                  Seçili filtre veya arama ile eşleşen coin bulunamadı.
                </p>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-300 border-2 border-stone-900 text-stone-900 text-xs font-bold rounded-md shadow-hard-sm btn-hard cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-3" /> Coin Ekle
                </button>
              </>
            )}
          </div>
        )
      )}

      {/* Add to Watchlist Modal */}
      <AddWatchlistModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
};
