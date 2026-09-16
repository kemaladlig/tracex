import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RefreshCw, ArrowDown } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
}

const PULL_THRESHOLD = 60;
const MAX_PULL = 85;

export const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, children }) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef(0);
  const isPullingRef = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY <= 2 && !isRefreshing) {
      startYRef.current = e.touches[0].clientY;
      isPullingRef.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPullingRef.current || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const rawDelta = currentY - startYRef.current;

    if (rawDelta > 0 && window.scrollY <= 2) {
      // Damped pull distance
      const distance = Math.min(MAX_PULL, Math.pow(rawDelta, 0.85) * 0.45);
      setPullDistance(distance);
    } else {
      setPullDistance(0);
      isPullingRef.current = false;
    }
  };

  const handleTouchEnd = useCallback(async () => {
    if (!isPullingRef.current || isRefreshing) return;
    isPullingRef.current = false;

    if (pullDistance >= PULL_THRESHOLD) {
      setIsRefreshing(true);
      setPullDistance(45); // Keep refresh indicator visible during fetch
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, isRefreshing, onRefresh]);

  useEffect(() => {
    if (!isRefreshing && pullDistance === 0) {
      isPullingRef.current = false;
    }
  }, [isRefreshing, pullDistance]);

  const rotation = Math.min(360, (pullDistance / PULL_THRESHOLD) * 360);

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative w-full"
    >
      {/* Pull indicator stamp */}
      <div
        style={{
          height: `${pullDistance}px`,
          opacity: pullDistance > 10 ? 1 : 0,
        }}
        className="overflow-hidden flex items-center justify-center transition-[height] duration-75 ease-out font-mono"
      >
        <div className="flex items-center gap-1.5 px-3 py-1 bg-white border-2 border-stone-900 rounded-md shadow-hard-sm text-xs font-black text-stone-900">
          {isRefreshing ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" />
              <span>GÜNCELLENİYOR...</span>
            </>
          ) : pullDistance >= PULL_THRESHOLD ? (
            <>
              <RefreshCw
                className="w-3.5 h-3.5 text-emerald-700 transition-transform"
                style={{ transform: `rotate(${rotation}deg)` }}
              />
              <span>BIRAKIN VE YENİLENSİN</span>
            </>
          ) : (
            <>
              <ArrowDown
                className="w-3.5 h-3.5 text-stone-600 transition-transform"
                style={{ transform: `rotate(${rotation / 2}deg)` }}
              />
              <span>AŞAĞI ÇEKİN</span>
            </>
          )}
        </div>
      </div>

      {children}
    </div>
  );
};
