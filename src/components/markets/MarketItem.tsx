import React, { useEffect, useState, useRef } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronRight,
  GripVertical,
  PlusCircle,
  Star,
} from 'lucide-react';
import { useCryptoStore } from '../../store/useCryptoStore';
import { cleanSymbol, formatCurrency, formatPercentage } from '../../utils/formatters';
import { triggerHaptic } from '../../utils/haptics';

interface MarketItemProps {
  symbol: string;
  index: number;
  onQuickAdd?: (symbol: string) => void;
  canReorder?: boolean;
  isDragging?: boolean;
  isDragOver?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onTouchStartHandle?: (e: React.TouchEvent, index: number) => void;
}

export const MarketItem: React.FC<MarketItemProps> = ({
  symbol,
  index,
  onQuickAdd,
  canReorder = false,
  isDragging = false,
  isDragOver = false,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onTouchStartHandle,
}) => {
  const ticker = useCryptoStore((state) => state.tickers[symbol]);
  const setSelectedCoinForChart = useCryptoStore((state) => state.setSelectedCoinForChart);
  const watchlist = useCryptoStore((state) => state.watchlist);
  const toggleWatchlist = useCryptoStore((state) => state.toggleWatchlist);
  const isFavorite = watchlist.includes(symbol);
  const currency = useCryptoStore((state) => state.currency);
  const tryRate = useCryptoStore((state) => state.tryRate);

  const activeRate = currency === 'TRY' ? tryRate : 1;

  const [flashClass, setFlashClass] = useState<string>('');
  const prevPriceRef = useRef<number | undefined>(ticker?.price);

  useEffect(() => {
    if (ticker?.price && prevPriceRef.current !== undefined) {
      if (ticker.price > prevPriceRef.current) {
        setFlashClass('flash-up font-black');
        const timer = setTimeout(() => setFlashClass(''), 650);
        return () => clearTimeout(timer);
      } else if (ticker.price < prevPriceRef.current) {
        setFlashClass('flash-down font-black');
        const timer = setTimeout(() => setFlashClass(''), 650);
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

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('light');
    toggleWatchlist(symbol);
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onQuickAdd) onQuickAdd(symbol);
  };

  return (
    <div
      onClick={handleItemClick}
      draggable={canReorder}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      data-drag-index={index}
      style={{ '--stagger-idx': Math.min(index, 10) } as React.CSSProperties}
      className={`group relative flex items-center justify-between p-3 mb-2.5 bg-white border-2 border-stone-900 rounded-lg shadow-hard hover:bg-stone-50 active:scale-[0.99] btn-hard cursor-pointer transition-all duration-150 select-none stagger-item ${
        isDragging
          ? 'opacity-40 scale-[0.98] border-dashed border-amber-500 bg-amber-50/60'
          : isDragOver
          ? 'border-t-4 border-t-amber-500 bg-amber-50/40 -translate-y-0.5 shadow-hard-lg'
          : ''
      }`}
    >
      {/* Left: Grip Handle (if custom order) + Symbol stamp & Volume */}
      <div className="flex items-center gap-2.5">
        {canReorder && (
          <div
            onTouchStart={(e) => {
              e.stopPropagation();
              onTouchStartHandle?.(e, index);
            }}
            className="touch-none cursor-grab active:cursor-grabbing p-1 -ml-1 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded transition-colors shrink-0"
            title="Sıralamak için tutup sürükleyin"
          >
            <GripVertical className="w-4 h-4 stroke-[2.5]" />
          </div>
        )}
        <div className="w-10 h-10 rounded-md bg-stone-100 border-2 border-stone-900 flex items-center justify-center font-mono font-black text-sm text-stone-900 shadow-hard-sm group-hover:scale-105 transition-transform shrink-0">
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

      {/* Right: Price, Micro-Sparkline Accent & Actions */}
      <div className="flex items-center gap-2 shrink-0">
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
          <div className="flex items-center justify-end gap-1.5 mt-0.5">
            {/* Compact Micro-Sparkline Accent */}
            {ticker && (
              <svg viewBox="0 0 28 12" className="w-7 h-3 opacity-70 shrink-0">
                <path
                  d={
                    isPositive
                      ? 'M 1,10 Q 8,11 14,5 T 27,2'
                      : 'M 1,2 Q 8,1 14,7 T 27,10'
                  }
                  fill="none"
                  stroke={isPositive ? '#16a34a' : '#dc2626'}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            )}

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

        {/* Favorite (Star) Button */}
        <button
          onClick={handleToggleFavorite}
          title={isFavorite ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}
          className={`p-1.5 rounded transition-all cursor-pointer ${
            isFavorite
              ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-100/70'
              : 'text-stone-300 hover:text-amber-500 hover:bg-stone-100'
          }`}
        >
          <Star
            className={`w-4 h-4 transition-transform active:scale-125 ${
              isFavorite
                ? 'fill-amber-400 stroke-stone-900 stroke-[2]'
                : 'stroke-stone-400 stroke-[2] hover:stroke-amber-500'
            }`}
          />
        </button>

        <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-stone-900 transition-colors" />
      </div>
    </div>
  );
};
