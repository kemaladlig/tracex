import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Search, BookmarkCheck, ArrowUpDown, Star, Compass } from 'lucide-react';
import { useCryptoStore } from '../../store/useCryptoStore';
import { MarketItem } from './MarketItem';
import { AddWatchlistModal } from './AddWatchlistModal';
import { MarketTrendsBanner } from './MarketTrendsBanner';
import { AddAssetModal } from '../portfolio/AddAssetModal';
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

export const MarketList: React.FC = () => {
  const watchlist = useCryptoStore((state) => state.watchlist);
  const tickers = useCryptoStore((state) => state.tickers);
  const reorderWatchlist = useCryptoStore((state) => state.reorderWatchlist);
  const updateTickersBatch = useCryptoStore((state) => state.updateTickersBatch);
  const setActiveMarketSymbols = useCryptoStore((state) => state.setActiveMarketSymbols);

  const [category, setCategory] = useState<MarketCategory>('favorites');
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [quickAddSymbol, setQuickAddSymbol] = useState<string | null>(null);

  // Market coins cache & active category 25-coin list
  const [allMarketCoins, setAllMarketCoins] = useState<CoinSearchResult[]>([]);
  const [categoryCoins, setCategoryCoins] = useState<CoinSearchResult[]>([]);
  const [isLoadingCategory, setIsLoadingCategory] = useState(false);

  // Drag and drop state for custom favorites reordering
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  // Preload all Binance USDT pairs for instant searching and categorization
  useEffect(() => {
    fetchAllUsdtPairs().then((coins) => {
      setAllMarketCoins(coins);
    });
  }, []);

  // Fetch top 25 coins when category changes
  useEffect(() => {
    if (category === 'favorites') {
      setActiveMarketSymbols([]);
      setCategoryCoins([]);
      return;
    }

    setIsLoadingCategory(true);
    getCategoryCoins(category, 25).then((coins) => {
      setCategoryCoins(coins);
      setIsLoadingCategory(false);

      // Subscribe live WebSocket stream to these 25 symbols
      const symbols = coins.map((c) => c.symbol);
      setActiveMarketSymbols(symbols);

      // Prepopulate tickers immediately with 24h stats so there is zero flash
      const initialBatch = coins.map((c) => ({
        symbol: c.symbol,
        price: c.price,
        changePercent24h: c.changePercent24h,
        quoteVolume: c.quoteVolume,
      }));
      updateTickersBatch(initialBatch);
    });
  }, [category, setActiveMarketSymbols, updateTickersBatch]);

  // Compute final filtered and sorted symbols
  const displaySymbols = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    // 1. Determine base symbol candidates
    let baseSymbols: string[] = [];

    if (category === 'favorites') {
      baseSymbols = watchlist;
      if (query) {
        baseSymbols = baseSymbols.filter((sym) => sym.toLowerCase().includes(query));
      }
    } else {
      if (query) {
        // Global search across all pairs if searching
        const filtered = allMarketCoins
          .filter(
            (c) =>
              c.symbol.toLowerCase().includes(query) ||
              c.baseAsset.toLowerCase().includes(query)
          )
          .slice(0, 25);
        baseSymbols = filtered.map((c) => c.symbol);
      } else {
        baseSymbols = categoryCoins.map((c) => c.symbol);
      }
    }

    // 2. Sorting
    if (sortBy === 'gainers') {
      return [...baseSymbols].sort(
        (a, b) => (tickers[b]?.changePercent24h ?? 0) - (tickers[a]?.changePercent24h ?? 0)
      );
    }
    if (sortBy === 'losers') {
      return [...baseSymbols].sort(
        (a, b) => (tickers[a]?.changePercent24h ?? 0) - (tickers[b]?.changePercent24h ?? 0)
      );
    }
    if (sortBy === 'volume') {
      return [...baseSymbols].sort(
        (a, b) => (tickers[b]?.quoteVolume ?? 0) - (tickers[a]?.quoteVolume ?? 0)
      );
    }
    if (sortBy === 'name') {
      return [...baseSymbols].sort((a, b) => a.localeCompare(b));
    }

    // Default sorting
    return baseSymbols;
  }, [category, watchlist, categoryCoins, allMarketCoins, searchQuery, sortBy, tickers]);

  const isCustomOrder = category === 'favorites' && sortBy === 'default' && !searchQuery.trim();

  // Desktop Drag & Drop Handlers (Only active in custom Favorites order)
  const handleDragStart = (idx: number, e: React.DragEvent) => {
    if (!isCustomOrder) return;
    e.dataTransfer.setData('text/plain', String(idx));
    e.dataTransfer.effectAllowed = 'move';
    setDraggedIndex(idx);
  };

  const handleDragOver = (idx: number, e: React.DragEvent) => {
    if (!isCustomOrder) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (overIndex !== idx) {
      setOverIndex(idx);
    }
  };

  const handleDrop = (targetIdx: number, e: React.DragEvent) => {
    if (!isCustomOrder) return;
    e.preventDefault();
    const sourceIdxStr = e.dataTransfer.getData('text/plain');
    const sourceIdx = parseInt(sourceIdxStr, 10);
    if (!isNaN(sourceIdx) && sourceIdx !== targetIdx) {
      reorderWatchlist(sourceIdx, targetIdx);
    }
    setDraggedIndex(null);
    setOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setOverIndex(null);
  };

  // Mobile Touch Drag & Drop Handler
  const handleTouchStartHandle = (_e: React.TouchEvent, startIndex: number) => {
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
  };

  const currentTabInfo = CATEGORY_TABS.find((t) => t.id === category);

  return (
    <div className="flex flex-col pb-28 px-4 max-w-lg mx-auto w-full font-mono">
      {/* 24h Top Gainers & Losers Banner */}
      <div className="stagger-item" style={{ '--stagger-idx': 0 } as React.CSSProperties}>
        <MarketTrendsBanner />
      </div>

      {/* Search & Add Action Bar */}
      <div
        className="flex items-center gap-2.5 my-2 stagger-item"
        style={{ '--stagger-idx': 1 } as React.CSSProperties}
      >
        <div className="relative flex-1 flex items-center">
          <Search className="absolute left-3 w-4 h-4 text-stone-500" />
          <input
            type="text"
            placeholder={category === 'favorites' ? 'Favorilerde ara...' : 'Coin veya sembol ara...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border-2 border-stone-900 rounded-md text-stone-900 text-xs font-mono placeholder-stone-400 shadow-hard-sm focus:outline-none focus:bg-stone-50"
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
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-amber-300 hover:bg-amber-400 border-2 border-stone-900 text-stone-900 text-xs font-mono font-bold rounded-md shadow-hard btn-hard cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" /> Ekle
        </button>
      </div>

      {/* Category Pills Bar (Favorites, All, L1, L2, Meme, AI, DeFi) */}
      <div
        className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 mb-1 font-mono text-[11px] stagger-item"
        style={{ '--stagger-idx': 2 } as React.CSSProperties}
      >
        {CATEGORY_TABS.map((item) => {
          const isActive = category === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                triggerHaptic('light');
                setCategory(item.id);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-bold whitespace-nowrap border cursor-pointer transition-all ${
                isActive
                  ? 'bg-stone-900 text-amber-300 border-stone-900 shadow-hard-sm'
                  : 'bg-white text-stone-700 border-stone-900/40 hover:bg-stone-100'
              }`}
            >
              {item.hasStar && (
                <Star
                  className={`w-3.5 h-3.5 ${
                    isActive
                      ? 'fill-amber-300 stroke-stone-900 stroke-[2]'
                      : 'fill-amber-400 stroke-stone-600 stroke-[1.5]'
                  }`}
                />
              )}
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Sort Chips Bar */}
      <div
        className="flex items-center justify-between px-1 my-1.5 font-mono text-[10px] stagger-item"
        style={{ '--stagger-idx': 3 } as React.CSSProperties}
      >
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          <ArrowUpDown className="w-3 h-3 text-stone-500 mr-0.5 shrink-0" />
          {(
            [
              { id: 'default', label: category === 'favorites' ? 'Varsayılan' : 'Hacim Sıralı' },
              { id: 'gainers', label: 'En Çok Artan' },
              { id: 'losers', label: 'En Çok Düşen' },
              { id: 'volume', label: 'Hacim' },
              { id: 'name', label: 'A-Z' },
            ] as { id: SortOption; label: string }[]
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => setSortBy(item.id)}
              className={`px-2 py-0.5 rounded font-bold border transition-all whitespace-nowrap cursor-pointer ${
                sortBy === item.id
                  ? 'bg-amber-300 text-stone-950 border-stone-900 font-black shadow-hard-sm'
                  : 'bg-white text-stone-600 border-stone-300 hover:bg-stone-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* List Header */}
      <div
        className="flex items-center justify-between px-1 my-2 stagger-item"
        style={{ '--stagger-idx': 4 } as React.CSSProperties}
      >
        <div className="flex items-center gap-1.5 text-xs font-mono font-black text-stone-900 uppercase tracking-wider">
          {category === 'favorites' ? (
            <>
              <BookmarkCheck className="w-3.5 h-3.5" />
              <span>FAVORİLERİM ({displaySymbols.length})</span>
            </>
          ) : (
            <>
              <Compass className="w-3.5 h-3.5 text-amber-600" />
              <span>
                {currentTabInfo?.label} // İLK 25 ({displaySymbols.length})
              </span>
            </>
          )}
        </div>
        <div className="text-[10px] font-mono text-stone-600 font-bold uppercase">
          FİYAT / 24S DEĞİŞİM
        </div>
      </div>

      {/* Loading indicator for category switch */}
      {isLoadingCategory && category !== 'favorites' && displaySymbols.length === 0 && (
        <div className="p-8 text-center bg-white border-2 border-stone-900 rounded-lg shadow-hard my-2">
          <div className="w-6 h-6 border-2 border-stone-900 border-t-amber-400 rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs font-bold text-stone-700">Piyasa verileri yükleniyor...</p>
        </div>
      )}

      {/* Market Items List */}
      {displaySymbols.length > 0 ? (
        <div className="flex flex-col">
          {displaySymbols.map((symbol, idx) => (
            <MarketItem
              key={symbol}
              symbol={symbol}
              index={idx}
              onQuickAdd={(sym) => setQuickAddSymbol(sym)}
              canReorder={isCustomOrder}
              isDragging={draggedIndex === idx}
              isDragOver={overIndex === idx}
              onDragStart={(e) => handleDragStart(idx, e)}
              onDragOver={(e) => handleDragOver(idx, e)}
              onDragLeave={handleDragEnd}
              onDrop={(e) => handleDrop(idx, e)}
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
                <Star className="w-8 h-8 mx-auto text-amber-400 stroke-stone-900 mb-2 stroke-[1.5]" />
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
                  <Plus className="w-4 h-4 stroke-[3]" /> Coin Ekle
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

      {/* Quick Add Asset to Portfolio Modal */}
      <AddAssetModal
        isOpen={Boolean(quickAddSymbol)}
        initialSymbol={quickAddSymbol ?? ''}
        onClose={() => setQuickAddSymbol(null)}
      />
    </div>
  );
};
