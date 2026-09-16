import React, { useState, useEffect, useMemo } from 'react';
import { Plus, X, Sparkles, Search, Check } from 'lucide-react';
import { useCryptoStore } from '../../store/useCryptoStore';
import { fetchAllUsdtPairs } from '../../services/binanceApi';
import type { CoinSearchResult } from '../../services/binanceApi';
import { formatCurrency } from '../../utils/formatters';

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddAssetModal: React.FC<AddAssetModalProps> = ({ isOpen, onClose }) => {
  const [symbol, setSymbol] = useState('');
  const [amount, setAmount] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [error, setError] = useState('');
  const [allCoins, setAllCoins] = useState<CoinSearchResult[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const tickers = useCryptoStore((state) => state.tickers);
  const addPortfolioAsset = useCryptoStore((state) => state.addPortfolioAsset);

  useEffect(() => {
    if (isOpen) {
      fetchAllUsdtPairs().then(setAllCoins);
    }
  }, [isOpen]);

  const currentFormattedSymbol = useMemo(() => {
    let s = symbol.trim().toUpperCase();
    if (s && !s.endsWith('USDT') && !s.endsWith('BUSD')) {
      s = `${s}USDT`;
    }
    return s;
  }, [symbol]);

  const filteredCoins = useMemo(() => {
    const s = symbol.trim().toUpperCase();
    if (!s) return allCoins.slice(0, 15);
    return allCoins
      .filter((c) => c.baseAsset.includes(s) || c.symbol.includes(s))
      .slice(0, 15);
  }, [allCoins, symbol]);

  const liveTicker = tickers[currentFormattedSymbol];

  const handleSelectCoin = (coin: CoinSearchResult) => {
    setSymbol(coin.baseAsset);
    setBuyPrice(coin.price.toString());
    setIsDropdownOpen(false);
  };

  const handleUseCurrentPrice = () => {
    if (liveTicker && liveTicker.price) {
      setBuyPrice(liveTicker.price.toString());
    } else {
      const found = allCoins.find((c) => c.symbol === currentFormattedSymbol);
      if (found) {
        setBuyPrice(found.price.toString());
      }
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const formattedSymbol = currentFormattedSymbol;
    if (!formattedSymbol) {
      setError('Lütfen bir coin seçin veya girin.');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Lütfen geçerli bir adet / miktar girin (0\'dan büyük).');
      return;
    }

    const numPrice = parseFloat(buyPrice);
    if (isNaN(numPrice) || numPrice <= 0) {
      setError('Lütfen geçerli bir alış fiyatı girin (0\'dan büyük).');
      return;
    }

    addPortfolioAsset({
      symbol: formattedSymbol,
      amount: numAmount,
      buyPrice: numPrice,
    });

    setSymbol('');
    setAmount('');
    setBuyPrice('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#10141d] border border-slate-800 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl pb-safe">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
              <Plus className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-white tracking-tight">Yeni Varlık / İşlem Ekle</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Symbol Input with Autocomplete */}
          <div className="relative">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Coin Sembolü (Binance)
            </label>
            <div className="relative flex items-center">
              <Search className="absolute left-3 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Örn: BTC, ETH, SOL, PEPE, SUI..."
                value={symbol}
                onFocus={() => setIsDropdownOpen(true)}
                onChange={(e) => {
                  setSymbol(e.target.value);
                  setIsDropdownOpen(true);
                }}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 uppercase font-mono"
              />
            </div>

            {/* Dropdown Suggestions */}
            {isDropdownOpen && filteredCoins.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-[#141924] border border-slate-700/80 rounded-xl shadow-2xl max-h-48 overflow-y-auto z-50 divide-y divide-slate-800/60 no-scrollbar">
                {filteredCoins.map((coin) => (
                  <button
                    key={coin.symbol}
                    type="button"
                    onClick={() => handleSelectCoin(coin)}
                    className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-indigo-600/20 transition"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-xs font-mono">{coin.baseAsset}</span>
                      <span className="text-[10px] text-slate-400">/USDT</span>
                    </div>
                    <span className="text-xs text-slate-300 font-mono">
                      {formatCurrency(coin.price)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Alınan Miktar (Adet)
            </label>
            <input
              type="number"
              step="any"
              placeholder="Örn: 0.5 veya 100"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          {/* Buy Price Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Birim Alış Fiyatı ($)
              </label>
              {(liveTicker || allCoins.some((c) => c.symbol === currentFormattedSymbol)) && (
                <button
                  type="button"
                  onClick={handleUseCurrentPrice}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition"
                >
                  <Sparkles className="w-3 h-3" /> Canlı Fiyatı Kullan
                </button>
              )}
            </div>
            <input
              type="number"
              step="any"
              placeholder="Örn: 65000 veya 180.50"
              value={buyPrice}
              onChange={(e) => setBuyPrice(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          {error && <p className="text-xs text-rose-400 font-medium">{error}</p>}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
            >
              İptal
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" /> Portföye Kaydet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
