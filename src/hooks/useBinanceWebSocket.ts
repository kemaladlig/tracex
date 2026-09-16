import { useEffect, useRef } from 'react';
import { useCryptoStore } from '../store/useCryptoStore';

export const useBinanceWebSocket = () => {
  const watchlist = useCryptoStore((state) => state.watchlist);
  const portfolio = useCryptoStore((state) => state.portfolio);
  const updateTicker = useCryptoStore((state) => state.updateTicker);
  const setConnectionStatus = useCryptoStore((state) => state.setConnectionStatus);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  // Combine unique symbols from watchlist and portfolio
  const allSymbols = Array.from(
    new Set([
      ...watchlist.map((s) => s.toUpperCase()),
      ...portfolio.map((p) => p.symbol.toUpperCase()),
    ])
  ).filter(Boolean);

  // Stable key to check if symbols changed
  const symbolsKey = allSymbols.sort().join(',');

  useEffect(() => {
    if (allSymbols.length === 0) {
      setConnectionStatus('disconnected');
      return;
    }

    let isDestroyed = false;

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

            updateTicker({
              symbol: data.s.toUpperCase(),
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
          // Try reconnect after 3 seconds
          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 3000);
        }
      };
    };

    connect();

    // Proper cleanup on unmount or when symbol list changes
    return () => {
      isDestroyed = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      setConnectionStatus('disconnected');
    };
  }, [symbolsKey]); // Re-connect only when symbol set changes
};
