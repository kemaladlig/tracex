import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronRight,
  PlusCircle,
  Trash2,
} from 'lucide-react';
import { useCryptoStore } from '../../store/useCryptoStore';
import { cleanSymbol, formatCurrency, formatPercentage } from '../../utils/formatters';

interface MarketItemProps {
  symbol: string;
  onQuickAdd?: (symbol: string) => void;
}

export const MarketItem: React.FC<MarketItemProps> = ({ symbol, onQuickAdd }) => {
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

  // Generate lightweight 24h trend sparkline curve
  const sparklinePath = useMemo(() => {
    if (!ticker) return '';
    const pct = ticker.changePercent24h ?? 0;
    const h = 22;
    const isUp = pct >= 0;

    const startY = isUp ? h * 0.75 : h * 0.25;
    const midY = isUp ? h * 0.45 : h * 0.55;
    const endY = isUp ? h * 0.15 : h * 0.85;

    return `M 2,${startY.toFixed(1)} Q 16,${(isUp ? h * 0.8 : h * 0.2).toFixed(1)} 28,${midY.toFixed(
      1
    )} T 52,${endY.toFixed(1)}`;
  }, [ticker?.changePercent24h]);

  const handleItemClick = () => {
    setSelectedCoinForChart(symbol);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeFromWatchlist(symbol);
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onQuickAdd) onQuickAdd(symbol);
  };

  return (
    <div
      onClick={handleItemClick}
      className="group relative flex items-center justify-between p-3.5 mb-2.5 bg-white border-2 border-stone-900 rounded-lg shadow-hard hover:bg-stone-50 btn-hard cursor-pointer transition-colors"
    >
      {/* Left: Symbol stamp & Volume */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-md bg-stone-100 border-2 border-stone-900 flex items-center justify-center font-mono font-black text-sm text-stone-900 shadow-hard-sm">
          {base.substring(0, 3)}
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-black text-stone-900 text-base tracking-tight">
              {base}
            </span>
            <span className="text-[10px] font-mono font-bold text-stone-600 bg-stone-200 border border-stone-900 px-1 py-0.2 rounded-xs">
              {quote}
            </span>
          </div>
          <span className="text-[11px] font-mono text-stone-500">
            {ticker?.quoteVolume
              ? `Hacim: $${(ticker.quoteVolume / 1_000_000).toFixed(1)}M`
              : 'Canlı veri bekleniyor'}
          </span>
        </div>
      </div>

      {/* Middle: Mini 24s Sparkline Trend */}
      <div className="hidden xs:block sm:block w-13 h-6 shrink-0 opacity-85 group-hover:opacity-100 transition-opacity">
        {ticker && sparklinePath && (
          <svg viewBox="0 0 54 22" className="w-full h-full overflow-visible">
            <path
              d={sparklinePath}
              fill="none"
              stroke={isPositive ? '#16a34a' : '#dc2626'}
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
        )}
      </div>

      {/* Right: Price & 24h Change badge & Actions */}
      <div className="flex items-center gap-2">
        <div className="text-right">
          <div
            className={`font-mono font-black text-base text-stone-900 tracking-tight transition-all duration-300 px-1 rounded ${flashClass}`}
          >
            {ticker ? (
              formatCurrency(ticker.price, currency, activeRate)
            ) : (
              <span className="text-xs text-stone-400 font-mono">Yükleniyor...</span>
            )}
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
                {isPositive ? (
                  <ArrowUpRight className="w-3 h-3 stroke-[3]" />
                ) : (
                  <ArrowDownRight className="w-3 h-3 stroke-[3]" />
                )}
                {formatPercentage(ticker.changePercent24h)}
              </span>
            ) : (
              <span className="text-xs font-mono text-stone-400">--</span>
            )}
          </div>
        </div>

        {/* Quick Add to Portfolio */}
        {onQuickAdd && (
          <button
            onClick={handleQuickAdd}
            title="Cüzdana Varlık Olarak Ekle"
            className="p-1.5 text-stone-400 hover:text-amber-700 hover:bg-amber-100 rounded border border-transparent hover:border-stone-900 transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
          </button>
        )}

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
