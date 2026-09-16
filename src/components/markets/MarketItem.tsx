import React, { useEffect, useState, useRef } from 'react';
import { ChevronRight, Trash2 } from 'lucide-react';
import { useCryptoStore } from '../../store/useCryptoStore';
import { cleanSymbol, formatCurrency, formatPercentage } from '../../utils/formatters';

interface MarketItemProps {
  symbol: string;
}

export const MarketItem: React.FC<MarketItemProps> = ({ symbol }) => {
  const ticker = useCryptoStore((state) => state.tickers[symbol]);
  const setSelectedCoinForChart = useCryptoStore((state) => state.setSelectedCoinForChart);
  const removeFromWatchlist = useCryptoStore((state) => state.removeFromWatchlist);

  const [flashClass, setFlashClass] = useState<string>('');
  const prevPriceRef = useRef<number | undefined>(ticker?.price);

  useEffect(() => {
    if (ticker?.price && prevPriceRef.current !== undefined) {
      if (ticker.price > prevPriceRef.current) {
        setFlashClass('flash-up text-emerald-400');
        const timer = setTimeout(() => setFlashClass(''), 1000);
        return () => clearTimeout(timer);
      } else if (ticker.price < prevPriceRef.current) {
        setFlashClass('flash-down text-rose-400');
        const timer = setTimeout(() => setFlashClass(''), 1000);
        return () => clearTimeout(timer);
      }
    }
    prevPriceRef.current = ticker?.price;
  }, [ticker?.price]);

  const { base, quote } = cleanSymbol(symbol);
  const isPositive = (ticker?.changePercent24h ?? 0) >= 0;

  const handleItemClick = () => {
    setSelectedCoinForChart(symbol);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeFromWatchlist(symbol);
  };

  return (
    <div
      onClick={handleItemClick}
      className="group relative flex items-center justify-between p-3.5 mb-2.5 rounded-2xl bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800/80 active:scale-[0.99] transition-all duration-150 cursor-pointer shadow-sm"
    >
      {/* Left: Symbol & Pair */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/60 flex items-center justify-center font-bold text-sm text-indigo-400 shadow-inner">
          {base.substring(0, 3)}
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-white text-base tracking-tight">{base}</span>
            <span className="text-[11px] font-medium text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded">
              {quote}
            </span>
          </div>
          <span className="text-xs text-slate-400">
            {ticker?.volume ? `Hacim: ${ticker.volume.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : 'Bekleniyor...'}
          </span>
        </div>
      </div>

      {/* Right: Price & 24h Change */}
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div
            className={`font-semibold text-[15px] font-mono tracking-tight transition-colors duration-300 rounded px-1 -mr-1 ${
              flashClass || 'text-white'
            }`}
          >
            {ticker ? formatCurrency(ticker.price) : <span className="text-slate-500 text-xs animate-pulse">Yükleniyor...</span>}
          </div>
          <div className="flex justify-end mt-0.5">
            {ticker ? (
              <span
                className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-md font-mono ${
                  isPositive
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                }`}
              >
                {formatPercentage(ticker.changePercent24h)}
              </span>
            ) : (
              <span className="text-xs text-slate-500">--</span>
            )}
          </div>
        </div>

        {/* Delete button (shown on hover or subtle) */}
        <button
          onClick={handleRemove}
          title="Listeden Kaldır"
          className="opacity-40 hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
      </div>
    </div>
  );
};
