import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, X, Check, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { useCryptoStore } from '../../store/useCryptoStore';
import { fetchAllUsdtPairs } from '../../services/binanceApi';
import type { CoinSearchResult } from '../../services/binanceApi';
import { formatCurrency, formatPercentage } from '../../utils/formatters';

interface AddWatchlistModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddWatchlistModal: React.FC<AddWatchlistModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [coins, setCoins] = useState<CoinSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const watchlist = useCryptoStore((state) => state.watchlist);
  const addToWatchlist = useCryptoStore((state) => state.addToWatchlist);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);

    fetchAllUsdtPairs().then((res) => {
      if (isMounted) {
        setCoins(res);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const filteredCoins = useMemo(() => {
    const clean = query.trim().toUpperCase();
    if (!clean) {
      // Return top 25 by volume when empty
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
    setNotification(`${symbolToAdd.replace('USDT', '')} takip listenize eklendi!`);
    setTimeout(() => setNotification(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#10141d] border border-slate-800 rounded-t-3xl sm:rounded-2xl flex flex-col max-h-[85vh] shadow-2xl pb-safe">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 shrink-0">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Kripto Takip Listesi Ekle</h2>
            <p className="text-[11px] text-slate-400">Binance'teki 400+ işlem çifti arasından arayın</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Notification Banner */}
        {notification && (
          <div className="bg-emerald-500/20 border-b border-emerald-500/30 px-4 py-2 text-xs text-emerald-300 flex items-center gap-1.5 animate-in slide-in-from-top duration-150">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{notification}</span>
          </div>
        )}

        {/* Search Bar Input */}
        <div className="p-4 pb-2 shrink-0">
          <div className="relative flex items-center">
            <Search className="absolute left-3 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Coin adı veya sembolü yazın (örn: PEPE, SOL, SUI, TIA)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              className="w-full pl-9 pr-8 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 uppercase font-mono"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 p-0.5 text-slate-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Coin List / Autocomplete Results */}
        <div className="flex-1 overflow-y-auto px-4 py-2 divide-y divide-slate-800/60 no-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
              <span className="text-xs">Binance pariteleri taranıyor...</span>
            </div>
          ) : filteredCoins.length > 0 ? (
            filteredCoins.map((coin) => {
              const isAdded = watchlist.includes(coin.symbol);
              const isPositive = coin.changePercent24h >= 0;

              return (
                <div
                  key={coin.symbol}
                  className="flex items-center justify-between py-2.5 px-2 hover:bg-slate-800/40 rounded-xl transition"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-400">
                      {coin.baseAsset.substring(0, 3)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-white text-sm">{coin.baseAsset}</span>
                        <span className="text-[10px] text-slate-400 bg-slate-800/80 px-1 py-0.2 rounded font-mono">
                          USDT
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {formatCurrency(coin.price)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div
                      className={`flex items-center gap-0.5 text-xs font-bold font-mono ${
                        isPositive ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isPositive ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {formatPercentage(coin.changePercent24h)}
                    </div>

                    {isAdded ? (
                      <span className="flex items-center gap-1 px-2.5 py-1 bg-slate-800/80 text-slate-400 text-xs font-medium rounded-lg border border-slate-700/50">
                        <Check className="w-3.5 h-3.5 text-emerald-400" /> Eklendi
                      </span>
                    ) : (
                      <button
                        onClick={() => handleAdd(coin.symbol)}
                        className="flex items-center gap-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold rounded-lg shadow-sm shadow-indigo-600/30 transition"
                      >
                        <Plus className="w-3.5 h-3.5" /> Ekle
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-10 text-slate-400 text-xs">
              "{query}" ile eşleşen bir Binance USDT paritesi bulunamadı.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
