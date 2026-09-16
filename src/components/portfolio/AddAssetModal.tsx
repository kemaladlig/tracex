import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Sparkles, Search, Check } from 'lucide-react';
import { useCryptoStore } from '../../store/useCryptoStore';
import { fetchAllUsdtPairs } from '../../services/binanceApi';
import type { CoinSearchResult } from '../../services/binanceApi';
import { formatCurrency } from '../../utils/formatters';

interface AddAssetModalProps {
  isOpen: boolean;
  initialSymbol?: string;
  onClose: () => void;
}

export const AddAssetModal: React.FC<AddAssetModalProps> = ({
  isOpen,
  initialSymbol = '',
  onClose,
}) => {
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
      if (initialSymbol) {
        setSymbol(initialSymbol.replace('USDT', ''));
      }
    } else {
      setSymbol('');
      setAmount('');
      setBuyPrice('');
      setError('');
    }
  }, [isOpen, initialSymbol]);

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
      setError('Lütfen geçerli bir adet girin (0\'dan büyük).');
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

    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-stone-900/70 backdrop-blur-xs animate-backdrop">
      <div className="w-full max-w-md bg-[#faf7f0] border-2 border-stone-900 rounded-lg shadow-hard font-mono animate-sheetUp max-h-[88vh] flex flex-col overflow-hidden">
        {/* Modal Header (Fixed at top) */}
        <div className="flex items-center justify-between p-4 pb-3 border-b-2 border-stone-900 shrink-0 bg-[#faf7f0]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-amber-300 border-2 border-stone-900 text-stone-900 flex items-center justify-center shadow-hard-sm">
              <Plus className="w-5 h-5 stroke-[3]" />
            </div>
            <div>
              <h2 className="text-base font-black text-stone-900 tracking-tight">
                VARLIK GİRİŞİ
              </h2>
              <span className="text-[10px] text-stone-500 font-bold">
                Aynı coin varsa ortalama maliyet (DCA) hesaplanır
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md border-2 border-stone-900 bg-white hover:bg-stone-200 shadow-hard-sm btn-hard cursor-pointer"
          >
            <X className="w-4 h-4 stroke-[3]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 no-scrollbar">
            {/* Symbol Input with Autocomplete */}
            <div className="relative">
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                Coin Sembolü (Binance)
              </label>
              <div className="relative flex items-center">
                <Search className="absolute left-3 w-4 h-4 text-stone-500" />
                <input
                  type="text"
                  placeholder="Örn: BTC, ETH, SOL, PEPE..."
                  value={symbol}
                  onFocus={() => setIsDropdownOpen(true)}
                  onChange={(e) => {
                    setSymbol(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  className="w-full pl-9 pr-3 py-2.5 bg-white border-2 border-stone-900 rounded-md text-stone-900 text-sm font-bold shadow-hard-sm focus:outline-none uppercase"
                />
              </div>

              {/* Dropdown Suggestions */}
              {isDropdownOpen && filteredCoins.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border-2 border-stone-900 rounded-md shadow-hard max-h-40 overflow-y-auto z-50 divide-y border-stone-900/20 no-scrollbar">
                  {filteredCoins.map((coin) => (
                    <button
                      key={coin.symbol}
                      type="button"
                      onClick={() => handleSelectCoin(coin)}
                      className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-amber-100 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-stone-900 text-xs">{coin.baseAsset}</span>
                        <span className="text-[10px] text-stone-500">/USDT</span>
                      </div>
                      <span className="text-xs text-stone-900 font-bold">
                        {formatCurrency(coin.price)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Amount Input */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                Alınan Miktar (Adet)
              </label>
              <input
                type="number"
                step="any"
                placeholder="Örn: 0.25 veya 500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border-2 border-stone-900 rounded-md text-stone-900 text-sm font-bold shadow-hard-sm focus:outline-none"
              />
            </div>

            {/* Buy Price Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-stone-700 uppercase">
                  Birim Alış Fiyatı ($)
                </label>
                {(liveTicker || allCoins.some((c) => c.symbol === currentFormattedSymbol)) && (
                  <button
                    type="button"
                    onClick={handleUseCurrentPrice}
                    className="text-[10px] text-stone-900 bg-amber-200 border border-stone-900 px-1.5 py-0.5 rounded flex items-center gap-1 font-bold cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" /> Canlı Fiyatı Kullan
                  </button>
                )}
              </div>
              <input
                type="number"
                step="any"
                placeholder="Örn: 92000 veya 185.50"
                value={buyPrice}
                onChange={(e) => setBuyPrice(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border-2 border-stone-900 rounded-md text-stone-900 text-sm font-bold shadow-hard-sm focus:outline-none"
              />
            </div>

            {error && <p className="text-xs text-rose-700 font-bold">{error}</p>}
          </div>

          {/* Sticky Bottom Action Bar (Always visible above virtual keyboard) */}
          <div className="p-4 pt-2.5 pb-safe border-t-2 border-stone-900 bg-[#faf7f0] shrink-0 z-10 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-stone-200 hover:bg-stone-300 border-2 border-stone-900 text-stone-900 text-xs font-bold rounded-md shadow-hard-sm btn-hard cursor-pointer"
            >
              İptal
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-amber-300 hover:bg-amber-400 border-2 border-stone-900 text-stone-950 text-xs font-black rounded-md shadow-hard btn-hard cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4 stroke-[3]" /> Portföye Kaydet
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
