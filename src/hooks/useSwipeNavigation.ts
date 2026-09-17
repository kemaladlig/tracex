import { useEffect, useRef } from 'react';
import { useCryptoStore } from '../store/useCryptoStore';
import type { TabType } from '../types/crypto';
import { triggerHaptic } from '../utils/haptics';

const TABS: TabType[] = ['home', 'markets', 'analytics', 'portfolio'];

interface TouchCoord {
  x: number;
  y: number;
  time: number;
}

export function useSwipeNavigation(containerRef: React.RefObject<HTMLElement | null>) {
  const activeTab = useCryptoStore((state) => state.activeTab);
  const setActiveTab = useCryptoStore((state) => state.setActiveTab);
  const selectedCoinForChart = useCryptoStore((state) => state.selectedCoinForChart);

  const startCoord = useRef<TouchCoord | null>(null);
  const isHorizontalSwipe = useRef<boolean | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Don't intercept if full-screen chart modal is open
      if (selectedCoinForChart) return;

      const target = e.target as HTMLElement | null;
      // Don't intercept if touching horizontal chips, charts or canvas
      if (target?.closest('.no-swipe, .overflow-x-auto, [data-no-swipe="true"], canvas')) {
        startCoord.current = null;
        return;
      }

      if (e.touches.length === 1) {
        const touch = e.touches[0];
        startCoord.current = {
          x: touch.clientX,
          y: touch.clientY,
          time: Date.now(),
        };
        isHorizontalSwipe.current = null;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!startCoord.current || e.touches.length !== 1) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - startCoord.current.x;
      const deltaY = touch.clientY - startCoord.current.y;

      // Lock gesture axis once 10px of movement has occurred
      if (isHorizontalSwipe.current === null) {
        if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
          isHorizontalSwipe.current = Math.abs(deltaX) > Math.abs(deltaY) * 1.2;
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!startCoord.current) return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - startCoord.current.x;
      const deltaY = touch.clientY - startCoord.current.y;
      const elapsed = Date.now() - startCoord.current.time;

      startCoord.current = null;

      // Only process fast, intentional horizontal swipes
      if (
        isHorizontalSwipe.current &&
        Math.abs(deltaX) >= 50 &&
        Math.abs(deltaY) <= 80 &&
        elapsed <= 600
      ) {
        const currentIndex = TABS.indexOf(activeTab);
        if (currentIndex === -1) return;

        if (deltaX < 0 && currentIndex < TABS.length - 1) {
          // Swipe Left -> Go to Next Tab
          triggerHaptic('light');
          setActiveTab(TABS[currentIndex + 1]);
        } else if (deltaX > 0 && currentIndex > 0) {
          // Swipe Right -> Go to Previous Tab
          triggerHaptic('light');
          setActiveTab(TABS[currentIndex - 1]);
        }
      }

      isHorizontalSwipe.current = null;
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [activeTab, setActiveTab, selectedCoinForChart, containerRef]);
}
