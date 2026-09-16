import React, { useState, useMemo } from 'react';
import { Plus, Search, BookmarkCheck, ArrowUpDown } from 'lucide-react';
import { useCryptoStore } from '../../store/useCryptoStore';
import { MarketItem } from './MarketItem';
import { AddWatchlistModal } from './AddWatchlistModal';
import { MarketTrendsBanner } from './MarketTrendsBanner';
import { AddAssetModal } from '../portfolio/AddAssetModal';

type SortOption = 'default' | 'gainers' | 'losers' | 'volume' | 'name';
type CategoryOption = 'all' | 'l1' | 'meme' | 'ai' | 'defi';

const CATEGORY_TAGS: Record<CategoryOption, string[]> = {
  all: [],
  l1: ['BTC', 'ETH', 'SOL', 'BNB', 'ADA', 'AVAX', 'SUI', 'TON', 'DOT', 'NEAR', 'TRX', 'APT', 'SEI', 'ATOM', 'FTM'],
  meme: ['DOGE', 'SHIB', 'PEPE', 'FLOKI', 'BONK', 'WIF', 'BOME', 'MEME', 'POPCAT', 'NEIRO', 'BRETT'],
  ai: ['FET', 'RENDER', 'NEAR', 'TAO', 'GRT', 'AGIX', 'WLD', 'OCEAN', 'ARKM', 'AI', 'IO'],
  defi: ['UNI', 'AAVE', 'MKR', 'LINK', 'INJ', 'CRV', 'SNX', 'LDO', 'PENDLE', 'RUNE', 'DYDX'],
};

export const MarketList: React.FC = () => {
  const watchlist = useCryptoStore((state) => state.watchlist);
  const tickers = useCryptoStore((state) => state.tickers);

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [quickAddSymbol, setQuickAddSymbol] = useState<string | null>(null);

  const [category, setCategory] = useState<CategoryOption>('all');
  const [sortBy, setSortBy] = useState<SortOption>('default');

  const filteredAndSortedWatchlist = useMemo(() => {
    // 1. Search Query filter
    let result = watchlist.filter((symbol) =>
      symbol.toLowerCase().includes(searchQuery.toLowerCase().trim())
    );

    // 2. Category filter
    if (category !== 'all') {
      const allowedBases = CATEGORY_TAGS[category];
      result = result.filter((sym) => {
        const base = sym.replace('USDT', '');
        return allowedBases.includes(base);
      });
    }

    // 3. Sorting
    if (sortBy === 'gainers') {
      result = [...result].sort(
        (a, b) => (tickers[b]?.changePercent24h ?? 0) - (tickers[a]?.changePercent24h ?? 0)
      );
    } else if (sortBy === 'losers') {
      result = [...result].sort(
        (a, b) => (tickers[a]?.changePercent24h ?? 0) - (tickers[b]?.changePercent24h ?? 0)
      );
    } else if (sortBy === 'volume') {
      result = [...result].sort(
        (a, b) => (tickers[b]?.quoteVolume ?? 0) - (tickers[a]?.quoteVolume ?? 0)
      );
    } else if (sortBy === 'name') {
      result = [...result].sort((a, b) => a.localeCompare(b));
    }

    return result;
  }, [watchlist, searchQuery, category, sortBy, tickers]);

  return (
    <div className="flex flex-col pb-28 px-4 max-w-lg mx-auto w-full">
      {/* 24h Top Gainers & Losers Banner */}
      <MarketTrendsBanner />

      {/* Search & Add Action Bar */}
      <div className="flex items-center gap-2.5 my-2">
        <div className="relative flex-1 flex items-center">
          <Search className="absolute left-3 w-4 h-4 text-stone-500" />
          <input
            type="text"
            placeholder="Takip listemde ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border-2 border-stone-900 rounded-md text-stone-900 text-xs font-mono placeholder-stone-400 shadow-hard-sm focus:outline-none focus:bg-stone-50"
          />
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-300 hover:bg-amber-400 border-2 border-stone-900 text-stone-900 text-xs font-mono font-bold rounded-md shadow-hard btn-hard cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" /> Coin Ekle
        </button>
      </div>

      {/* Category Pills Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 mb-1 font-mono text-[11px]">
        {(
          [
            { id: 'all', label: 'TÜMÜ' },
            { id: 'l1', label: '⚡ LAYER 1' },
            { id: 'meme', label: '🐸 MEME' },
            { id: 'ai', label: '🤖 AI' },
            { id: 'defi', label: '🏦 DEFI' },
          ] as { id: CategoryOption; label: string }[]
        ).map((item) => (
          <button
            key={item.id}
            onClick={() => setCategory(item.id)}
            className={`px-2.5 py-1 rounded-md font-bold whitespace-nowrap border cursor-pointer transition-all ${
              category === item.id
                ? 'bg-stone-900 text-amber-300 border-stone-900 shadow-hard-sm'
                : 'bg-white text-stone-700 border-stone-900/40 hover:bg-stone-100'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Sort Chips Bar */}
      <div className="flex items-center justify-between px-1 my-1.5 font-mono text-[10px]">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          <ArrowUpDown className="w-3 h-3 text-stone-500 mr-0.5 shrink-0" />
          {(
            [
              { id: 'default', label: 'Varsayılan' },
              { id: 'gainers', label: '🔥 En Çok Artan' },
              { id: 'losers', label: '🔻 En Çok Düşen' },
              { id: 'volume', label: '📊 Hacim' },
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
      <div className="flex items-center justify-between px-1 my-2">
        <div className="flex items-center gap-1.5 text-xs font-mono font-black text-stone-900 uppercase tracking-wider">
          <BookmarkCheck className="w-3.5 h-3.5" />
          <span>TAKİP LİSTESİ ({filteredAndSortedWatchlist.length})</span>
        </div>
        <div className="text-[10px] font-mono text-stone-600 font-bold uppercase">
          FİYAT / 24S DEĞİŞİM
        </div>
      </div>

      {/* Market Items List */}
      {filteredAndSortedWatchlist.length > 0 ? (
        <div className="flex flex-col">
          {filteredAndSortedWatchlist.map((symbol) => (
            <MarketItem
              key={symbol}
              symbol={symbol}
              onQuickAdd={(sym) => setQuickAddSymbol(sym)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-10 px-4 rounded-lg bg-white border-2 border-dashed border-stone-900/60 shadow-hard-sm my-3 font-mono">
          <p className="text-stone-700 text-xs font-bold mb-3">
            {searchQuery || category !== 'all'
              ? 'Seçili filtre ile eşleşen takip edilen coin bulunamadı.'
              : 'Takip listeniz şu anda boş.'}
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-300 border-2 border-stone-900 text-stone-900 text-xs font-bold rounded-md shadow-hard-sm btn-hard cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" /> Listeye Coin Ekle
          </button>
        </div>
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
