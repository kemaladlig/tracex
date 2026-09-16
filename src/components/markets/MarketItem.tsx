import React, { useEffect, useState, useRef } from 'react';
import { ArrowDownRight, ArrowUpRight, ChevronRight, Trash2 } from 'lucide-react';
import { useCryptoStore } from '../../store/useCryptoStore';
import { cleanSymbol, formatCurrency, formatPercentage } from '../../utils/formatters';

interface MarketItemProps {
  symbol: string;
}

export const MarketItem: React.FC<MarketItemProps> = ({ symbol }) => {
  const ticker = useCryptoStore((state) => state.tickers[symbol]);
  const setSelectedCoinForChart = useCryptoStore((state) => state.setSelectedCoinForChart);
  const removeFromWatchlist = useCryptoStore((state) => state.removeFromWatchlist);
  const currency = useCryptoStore((state) => state.currency);
  const tryRate = useCryptoStore((state) => state.tryRate);
  const eurRate = useCryptoStore((state) => state.eurRate);

  const activeRate = currency === 'TRY' ? tryRate : eurRate;

  const [flashClass, setFlashClass] = useState<string>('');
  const prevPriceRef = useRef<number | undefined>(ticker?.price);

  useEffect(() => {
    if (ticker?.price && prevPriceRef.current !== undefined) {
      if (ticker.price > prevPriceRef.current) {
        setFlashClass('flash-up font-black');
        const timer = setTimeout(() => setFlashClass(''), 1000);
        return () => clearTimeout(timer);
      } else if (ticker.price < prevPriceRef.current) {
        setFlashClass('flash-down font-black');
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
      className="group relative flex items-center justify-between p-3.5 mb-2.5 bg-white border-2 border-stone-900 rounded-lg shadow-hard hover:bg-stone-50 btn-hard cursor-pointer transition-colors"
    >
      {/* Left: Symbol stamp */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-md bg-stone-100 border-2 border-stone-900 flex items-center justify-center font-mono font-black text-sm text-stone-900 shadow-hard-sm">
          {base.substring(0, 3)}
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-black text-stone-900 text-base tracking-tight">{base}</span>
            <span className="text-[10px] font-mono font-bold text-stone-600 bg-stone-200 border border-stone-900 px-1 py-0.2 rounded-xs">
              {quote}
            </span>
          </div>
          <span className="text-[11px] font-mono text-stone-500">
            {ticker?.volume ? `Hacim: ${ticker.volume.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : 'Canlı veri bekleniyor'}
          </span>
        </div>
      </div>

      {/* Right: Price & 24h Change badge */}
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div
            className={`font-mono font-black text-base text-stone-900 tracking-tight transition-all duration-300 px-1 rounded ${flashClass}`}
          >
            {ticker ? formatCurrency(ticker.price, currency, activeRate) : <span className="text-xs text-stone-400 font-mono">Yükleniyor...</span>}
          </div>
          <div className="flex justify-end mt-0.5">
            {ticker ? (
              <span
                className={`inline-flex items-center gap-0.5 text-xs font-mono font-black px-1.5 py-0.5 rounded border border-stone-900 ${
                  isPositive
                    ? 'bg-emerald-200 text-emerald-950'
                    : 'bg-rose-200 text-rose-950'
                }`}
              >
                {isPositive ? <ArrowUpRight className="w-3 h-3 stroke-[3]" /> : <ArrowDownRight className="w-3 h-3 stroke-[3]" />}
                {formatPercentage(ticker.changePercent24h)}
              </span>
            ) : (
              <span className="text-xs font-mono text-stone-400">--</span>
            )}
          </div>
        </div>

        {/* Remove button */}
        <button
          onClick={handleRemove}
          title="Takip Listesinden Çıkar"
          className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-100 rounded border border-transparent hover:border-stone-900 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-stone-900 transition-colors" />
      </div>
    </div>
  );
};
