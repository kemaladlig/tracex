import { useEffect, useRef } from 'react';
import { useCryptoStore } from '../store/useCryptoStore';
import type { TickerData } from '../types/crypto';

export const useBinanceWebSocket = () => {
  const watchlist = useCryptoStore((state) => state.watchlist);
  const portfolio = useCryptoStore((state) => state.portfolio);
  const activeMarketSymbols = useCryptoStore((state) => state.activeMarketSymbols);
  const updateTickersBatch = useCryptoStore((state) => state.updateTickersBatch);
  const setConnectionStatus = useCryptoStore((state) => state.setConnectionStatus);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const tickerBufferRef = useRef<Map<string, Partial<TickerData> & { symbol: string; price: number }>>(
    new Map()
  );
  const flushIntervalRef = useRef<number | null>(null);

  // Combine unique symbols from watchlist, portfolio, and currently active category in markets
  const allSymbols = Array.from(
    new Set([
      ...watchlist.map((s) => s.toUpperCase()),
      ...portfolio.map((p) => p.symbol.toUpperCase()),
      ...activeMarketSymbols.map((m) => m.toUpperCase()),
    ])
  ).filter(Boolean);

  const symbolsKey = allSymbols.sort().join(',');

  useEffect(() => {
    if (allSymbols.length === 0) {
      setConnectionStatus('disconnected');
      return;
    }

    let isDestroyed = false;

    // Flush buffered ticker messages every 120ms (8.3 fps instead of 50 fps) to optimize CPU/battery
    flushIntervalRef.current = window.setInterval(() => {
      if (tickerBufferRef.current.size > 0) {
        const batch = Array.from(tickerBufferRef.current.values());
        tickerBufferRef.current.clear();
        updateTickersBatch(batch);
      }
    }, 120);

    const connect = () => {
      if (isDestroyed) return;

      // Close previous socket if open
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }

      setConnectionStatus('connecting');

      // Create stream query params: e.g. btcusdt@ticker/ethusdt@ticker
      const streams = allSymbols
        .map((s) => `${s.toLowerCase()}@ticker`)
        .join('/');

      const wsUrl = `wss://stream.binance.com:9443/stream?streams=${streams}`;
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        if (!isDestroyed) {
          setConnectionStatus('connected');
        }
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload && payload.data && payload.data.s) {
            const data = payload.data;
            const price = parseFloat(data.c);
            const changePercent24h = parseFloat(data.P);
            const changeAmount24h = parseFloat(data.p);
            const high24h = parseFloat(data.h);
            const low24h = parseFloat(data.l);
            const volume = parseFloat(data.v);
            const quoteVolume = parseFloat(data.q);
            const sym = data.s.toUpperCase();

            // Buffer the update in map
            tickerBufferRef.current.set(sym, {
              symbol: sym,
              price,
              changePercent24h,
              changeAmount24h,
              high24h,
              low24h,
              volume,
              quoteVolume,
            });
          }
        } catch {
          // Ignore JSON parse errors or ping/pong frame noise
        }
      };

      ws.onerror = () => {
        if (!isDestroyed) {
          setConnectionStatus('disconnected');
        }
      };

      ws.onclose = () => {
        if (!isDestroyed) {
          setConnectionStatus('disconnected');
          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = window.setTimeout(() => {
            connect();
          }, 3000);
        }
      };
    };

    connect();

    // Page Visibility API: Pause/resume WebSocket to save battery when screen is locked or tab is hidden
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (socketRef.current) {
          socketRef.current.close();
          socketRef.current = null;
        }
      } else {
        if (!socketRef.current) {
          connect();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Proper cleanup on unmount or when symbol list changes
    return () => {
      isDestroyed = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (flushIntervalRef.current) {
        clearInterval(flushIntervalRef.current);
        flushIntervalRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [symbolsKey, allSymbols.length, setConnectionStatus, updateTickersBatch]);
};
