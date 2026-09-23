import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  GripVertical,
  Star,
} from 'lucide-react';
import { useCryptoStore } from '../../store/useCryptoStore';
import { cleanSymbol, formatCurrency, formatPercentage } from '../../utils/formatters';
import { triggerHaptic } from '../../utils/haptics';

interface MarketItemProps {
  symbol: string;
  index: number;
  /** Kept for API compatibility — no longer rendered inline (star-only rail). */
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

const MarketItemInner: React.FC<MarketItemProps> = ({
  symbol,
  index,
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
  const connectionStatus = useCryptoStore((state) => state.connectionStatus);
  const setSelectedCoinForChart = useCryptoStore((state) => state.setSelectedCoinForChart);
  const watchlist = useCryptoStore((state) => state.watchlist);
  const toggleWatchlist = useCryptoStore((state) => state.toggleWatchlist);
  const isFavorite = watchlist.includes(symbol);
  // Stale signal without layout shift: dot indicator only, border stays solid.
  const isStale = !ticker || ticker.isLive !== true || connectionStatus !== 'connected';

  const [flashClass, setFlashClass] = useState<string>('');
  const prevPriceRef = useRef<number | undefined>(ticker?.price);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const prev = prevPriceRef.current;
    const next = ticker?.price;
    prevPriceRef.current = next;
    if (next === undefined || prev === undefined || next === prev) return;
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    setFlashClass(next > prev ? 'flash-up' : 'flash-down');
    flashTimerRef.current = setTimeout(() => setFlashClass(''), 450);
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, [ticker?.price]);

  const { base, quote } = cleanSymbol(symbol);
  const isPositive = (ticker?.changePercent24h ?? 0) >= 0;

  const handleItemClick = () => {
    setSelectedCoinForChart(symbol);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleItemClick();
    }
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('light');
    toggleWatchlist(symbol);
  };

  return (
    <div
      onClick={handleItemClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`${base} grafiğini aç`}
      draggable={canReorder}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      data-drag-index={index}
      className={`group grid grid-cols-[auto_1fr_auto_44px] items-center gap-3 min-h-[60px] px-3 py-2 bg-white border-2 border-stone-900 rounded-lg shadow-hard-sm cursor-pointer select-none transition-colors duration-150 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-amber-500 focus-visible:outline-offset-2 ${
        isDragging
          ? 'opacity-40 border-dashed border-amber-500 bg-amber-50/60'
          : isDragOver
          ? 'bg-amber-50/60 outline-2 outline-amber-500 outline-offset-[-2px]'
          : ''
      }`}
    >
      {/* Col 1: Grip (favorites reorder only) + avatar */}
      <div className="flex items-center gap-1.5">
        {canReorder && (
          <div
            onTouchStart={(e) => {
              e.stopPropagation();
              onTouchStartHandle?.(e, index);
            }}
            onClick={(e) => e.stopPropagation()}
            className="touch-none cursor-grab active:cursor-grabbing p-1.5 -ml-1.5 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded transition-colors shrink-0"
            title="Sıralamak için tutup sürükleyin"
            aria-hidden="true"
          >
            <GripVertical className="w-4 h-4 stroke-[2.5]" />
          </div>
        )}
        <div className="relative w-9 h-9 rounded-md bg-stone-100 border-2 border-stone-900 flex items-center justify-center font-mono font-black text-[13px] text-stone-900 shadow-hard-xs shrink-0">
          {base.substring(0, 3)}
          {isStale && !isDragging && !isDragOver && (
            <span
              aria-hidden="true"
              title="Canlı veri bekleniyor"
              className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border border-stone-900 animate-livePulse"
            />
          )}
        </div>
      </div>

      {/* Col 2: Symbol + volume (truncates, never pushes price) */}
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-mono font-black text-stone-900 text-[15px] tracking-tight truncate">
            {base}
          </span>
          <span className="text-[10px] font-mono font-bold text-stone-600 bg-stone-200 border border-stone-900 px-1 rounded-xs shrink-0">
            {quote}
          </span>
        </div>
        <div className="text-[11px] font-mono text-stone-500 truncate tabular-nums">
          {ticker?.quoteVolume
            ? `HACİM $${(ticker.quoteVolume / 1_000_000).toFixed(1)}M`
            : 'CANLI VERİ BEKLENİYOR'}
        </div>
      </div>

      {/* Col 3: Fixed-width price block, right aligned */}
      <div
        className={`min-w-[112px] text-right tabular-nums transition-opacity duration-500 ${
          isStale ? 'opacity-60 saturate-[.65]' : 'opacity-100'
        }`}
      >
        <div
          className={`font-mono font-black text-[15px] text-stone-900 tracking-tight px-1 rounded ${flashClass}`}
        >
          {ticker ? (
            formatCurrency(ticker.price, 'USD', 1)
          ) : (
            <span className="text-xs text-stone-400">Yükleniyor...</span>
          )}
        </div>
        <div className="flex items-center justify-end mt-0.5">
          {ticker ? (
            <span
              className={`inline-flex items-center justify-center gap-0.5 min-w-[72px] text-xs font-mono font-black px-1.5 py-0.5 rounded border border-stone-900 ${
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

      {/* Col 4: Fixed 44px star rail — identical x-position on every row */}
      <button
        onClick={handleToggleFavorite}
        title={isFavorite ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}
        aria-label={isFavorite ? `${base} favorilerden çıkar` : `${base} favorilere ekle`}
        aria-pressed={isFavorite}
        className={`w-11 h-11 grid place-items-center rounded-md transition-colors cursor-pointer shrink-0 ${
          isFavorite
            ? 'text-amber-500 hover:bg-amber-100/70'
            : 'text-stone-300 hover:text-amber-500 hover:bg-stone-100'
        }`}
      >
        <Star
          className={`w-5 h-5 transition-transform active:scale-125 ${
            isFavorite
              ? 'fill-amber-400 stroke-stone-900 stroke-[2]'
              : 'stroke-stone-400 stroke-[2] hover:stroke-amber-500'
          }`}
        />
      </button>
    </div>
  );
};

export const MarketItem = React.memo(MarketItemInner);
