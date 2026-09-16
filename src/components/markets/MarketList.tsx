import React, { useState } from 'react';
import { Plus, Search, TrendingUp } from 'lucide-react';
import { useCryptoStore } from '../../store/useCryptoStore';
import { MarketItem } from './MarketItem';
import { AddWatchlistModal } from './AddWatchlistModal';

export const MarketList: React.FC = () => {
  const watchlist = useCryptoStore((state) => state.watchlist);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const filteredWatchlist = watchlist.filter((symbol) =>
    symbol.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <div className="flex flex-col pb-24 px-4 max-w-lg mx-auto w-full">
      {/* Search & Add Action Bar */}
      <div className="flex items-center gap-2.5 my-3.5">
        <div className="relative flex-1 flex items-center">
          <Search className="absolute left-3 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Takip listemde ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-900/90 border border-slate-800 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 active:scale-95 transition-all duration-150 shrink-0"
        >
          <Plus className="w-4 h-4" /> Coin Ekle
        </button>
      </div>

      {/* List Header */}
      <div className="flex items-center justify-between px-1 mb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
          <span>Piyasalar ({filteredWatchlist.length})</span>
        </div>
        <div className="text-[11px] text-slate-400 font-medium">
          Fiyat / 24s Değişim
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
        <div className="text-center py-12 px-4 rounded-2xl bg-slate-900/40 border border-slate-800/60 mt-2">
          <p className="text-slate-400 text-sm mb-3">
            {searchQuery
              ? `"${searchQuery}" ile eşleşen takip edilen coin bulunamadı.`
              : 'Takip listeniz şu anda boş.'}
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition"
          >
            <Plus className="w-3.5 h-3.5" /> Listeye Coin Ekle
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
