import { useEffect } from 'react';
import { useCryptoStore } from '../store/useCryptoStore';
import { formatCurrency } from '../utils/formatters';

export function useDynamicPwaTitle() {
  // Per-symbol selector: App must NOT subscribe the whole tickers map (it changes every WS flush)
  const btcTicker = useCryptoStore((state) => state.tickers['BTCUSDT']);

  useEffect(() => {
    if (!btcTicker || !btcTicker.price) {
      document.title = 'TraceX - Kripto & Portföy';
      return;
    }

    const priceFormatted = formatCurrency(btcTicker.price, 'USD', 1);
    const arrow = btcTicker.changePercent24h >= 0 ? '↗' : '↘';
    const percent = Math.abs(btcTicker.changePercent24h).toFixed(1);

    document.title = `${priceFormatted} ${arrow}%${percent} | TraceX`;

    // Modern PWA Badging API for Android / Chrome / Desktop
    if ('setAppBadge' in navigator) {
      try {
        if (btcTicker.changePercent24h !== 0) {
          navigator.setAppBadge(Math.min(99, Math.round(Math.abs(btcTicker.changePercent24h))));
        } else {
          navigator.clearAppBadge();
        }
      } catch {}
    }

    return () => {
      document.title = 'TraceX - Kripto & Portföy';
    };
  }, [btcTicker]);
}
