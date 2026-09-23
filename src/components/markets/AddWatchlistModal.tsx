import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, X, Check, ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react';
import { useCryptoStore } from '../../store/useCryptoStore';
import { fetchAllUsdtPairs } from '../../services/binanceApi';
import type { CoinSearchResult } from '../../services/binanceApi';
import { formatCurrency, formatPercentage } from '../../utils/formatters';
import { Modal } from '../common/Modal';

interface AddWatchlistModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddWatchlistModal: React.FC<AddWatchlistModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [coins, setCoins] = useState<CoinSearchResult[]>([]);
  const [coinsLoaded, setCoinsLoaded] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const watchlist = useCryptoStore((state) => state.watchlist);
  const addToWatchlist = useCryptoStore((state) => state.addToWatchlist);

  // Fetch the coin universe once per session (service also caches 1min) — loading is derived, never set synchronously in the effect
  useEffect(() => {
    if (!isOpen || coinsLoaded) return;

    let isMounted = true;
    fetchAllUsdtPairs().then((res) => {
      if (isMounted) {
        setCoins(res);
        setCoinsLoaded(true);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen, coinsLoaded]);

  const loading = isOpen && !coinsLoaded;

  const filteredCoins = useMemo(() => {
    const clean = query.trim().toUpperCase();
    if (!clean) {
      return coins.slice(0, 25);
    }
    return coins
      .filter((c) => c.baseAsset.includes(clean) || c.symbol.includes(clean))
      .slice(0, 50);
  }, [coins, query]);

  if (!isOpen) return null;

  const handleAdd = (symbolToAdd: string) => {
    if (watchlist.includes(symbolToAdd)) return;

    addToWatchlist(symbolToAdd);
    setNotification(`${symbolToAdd.replace('USDT', '')} takibe eklendi!`);
    setTimeout(() => setNotification(null), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Coin Ekle"
      subtitle="Binance 400+ spot paritesi"
      size="lg"
    >
      {/* Live Notification Banner */}
      {notification && (
        <div className="bg-emerald-200 border-b-2 border-stone-900 px-4 py-2 text-xs font-mono font-bold text-emerald-950 flex items-center gap-1.5 animate-feedback">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{notification}</span>
        </div>
      )}

        {/* Search Bar Input */}
        <div className="p-4 pb-2 shrink-0">
          <div className="relative flex items-center">
            <Search className="absolute left-3 w-4 h-4 text-stone-500" />
            <input
              type="text"
              placeholder="Coin veya sembol ara..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              className="w-full pl-9 pr-8 py-2.5 bg-white border-2 border-stone-900 rounded-md text-stone-900 text-xs font-mono placeholder-stone-400 uppercase shadow-hard-sm focus:outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 p-0.5 text-stone-500 hover:text-stone-900 cursor-pointer"
              >
                <X className="w-4 h-4 stroke-[3]" />
              </button>
            )}
          </div>
        </div>

        {/* Coin List */}
        <div className="flex-1 overflow-y-auto px-4 py-2 divide-y-2 divide-stone-900/15 no-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-stone-600 gap-2 font-mono">
              <Loader2 className="w-6 h-6 animate-spin text-stone-900" />
              <span className="text-xs">Borsa listesi taranıyor...</span>
            </div>
          ) : filteredCoins.length > 0 ? (
            filteredCoins.map((coin) => {
              const isAdded = watchlist.includes(coin.symbol);
              const isPositive = coin.changePercent24h >= 0;

              return (
                <div
                  key={coin.symbol}
                  className="flex items-center justify-between py-2.5 px-2 hover:bg-stone-200/50 rounded-md transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-md bg-stone-900 text-amber-300 border-2 border-stone-900 flex items-center justify-center text-xs font-mono font-black shadow-hard-sm">
                      {coin.baseAsset.substring(0, 3)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-black text-stone-900 text-sm">{coin.baseAsset}</span>
                        <span className="text-[10px] font-mono font-bold text-stone-600 bg-stone-200 border border-stone-900 px-1 rounded-xs">
                          USDT
                        </span>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-stone-700">
                        {formatCurrency(coin.price)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div
                      className={`flex items-center gap-0.5 text-xs font-mono font-black px-1.5 py-0.5 rounded border border-stone-900 ${
                        isPositive ? 'bg-emerald-200 text-emerald-950' : 'bg-rose-200 text-rose-950'
                      }`}
                    >
                      {isPositive ? (
                        <ArrowUpRight className="w-3 h-3 stroke-[3]" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3 stroke-[3]" />
                      )}
                      {formatPercentage(coin.changePercent24h)}
                    </div>

                    {isAdded ? (
                      <span className="flex items-center gap-1 px-2 py-1 bg-stone-200 text-stone-700 text-xs font-mono font-bold rounded border border-stone-900">
                        <Check className="w-3.5 h-3.5 stroke-[3]" /> EKLENDİ
                      </span>
                    ) : (
                      <button
                        onClick={() => handleAdd(coin.symbol)}
                        className="flex items-center gap-1 px-3 py-1 bg-amber-300 hover:bg-amber-400 active:scale-95 border-2 border-stone-900 text-stone-900 text-xs font-mono font-black rounded shadow-hard-sm btn-hard cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" /> EKLE
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-10 text-stone-600 text-xs font-mono">
              "{query}" ile eşleşen bir Binance USDT paritesi bulunamadı.
            </div>
          )}
        </div>
    </Modal>
  );
};
