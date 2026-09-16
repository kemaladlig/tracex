import React, { useState } from 'react';
import { Plus, Search, BookmarkCheck } from 'lucide-react';
import { useCryptoStore } from '../../store/useCryptoStore';
import { MarketItem } from './MarketItem';
import { AddWatchlistModal } from './AddWatchlistModal';
import { MarketTrendsBanner } from './MarketTrendsBanner';

export const MarketList: React.FC = () => {
  const watchlist = useCryptoStore((state) => state.watchlist);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const filteredWatchlist = watchlist.filter((symbol) =>
    symbol.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

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

      {/* List Header */}
      <div className="flex items-center justify-between px-1 my-2">
        <div className="flex items-center gap-1.5 text-xs font-mono font-black text-stone-900 uppercase tracking-wider">
          <BookmarkCheck className="w-3.5 h-3.5" />
          <span>TAKİP LİSTESİ ({filteredWatchlist.length})</span>
        </div>
        <div className="text-[10px] font-mono text-stone-600 font-bold uppercase">
          FİYAT / 24S DEĞİŞİM
        </div>
      </div>

      {/* Market Items List */}
      {filteredWatchlist.length > 0 ? (
        <div className="flex flex-col">
          {filteredWatchlist.map((symbol) => (
            <MarketItem key={symbol} symbol={symbol} />
          ))}
        </div>
      ) : (
        <div className="text-center py-10 px-4 rounded-lg bg-white border-2 border-dashed border-stone-900/60 shadow-hard-sm my-3 font-mono">
          <p className="text-stone-700 text-xs font-bold mb-3">
            {searchQuery
              ? `"${searchQuery}" ile eşleşen takip edilen coin bulunamadı.`
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

      {/* Add Modal */}
      <AddWatchlistModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
};
