import { useEffect, useMemo, useRef } from 'react';
import { useCryptoStore } from '../store/useCryptoStore';
import type { TickerData } from '../types/crypto';

export const useBinanceWebSocket = () => {
  const watchlist = useCryptoStore((state) => state.watchlist);
  const portfolio = useCryptoStore((state) => state.portfolio);
  const activeMarketSymbols = useCryptoStore((state) => state.activeMarketSymbols);
  const selectedCoinForChart = useCryptoStore((state) => state.selectedCoinForChart);
  const updateTickersBatch = useCryptoStore((state) => state.updateTickersBatch);
  const setConnectionStatus = useCryptoStore((state) => state.setConnectionStatus);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const tickerBufferRef = useRef<Map<string, Partial<TickerData> & { symbol: string; price: number }>>(
    new Map()
  );
  const flushIntervalRef = useRef<number | null>(null);

  // A string signature reconnects only when the subscribed symbol set changes,
  // not when portfolio amounts or watchlist ordering mutate.
  const symbolSignature = Array.from(
    new Set([
      'BTCUSDT',
      ...(selectedCoinForChart ? [selectedCoinForChart] : []),
      ...watchlist,
      ...portfolio.map((position) => position.symbol),
      ...activeMarketSymbols,
    ])
  )
    .map((symbol) => symbol.toUpperCase())
    .filter(Boolean)
    .sort()
    .join('|');

  const allSymbols = useMemo(
    () => symbolSignature.split('|').filter(Boolean),
    [symbolSignature]
  );

  useEffect(() => {
    if (allSymbols.length === 0) {
      setConnectionStatus('disconnected');
      return;
    }

    let isDestroyed = false;
    let isPaused = document.hidden;
    let reconnectAttempt = 0;
    // Last raw WS packet arrival; used by the stall watchdog below.
    const lastMessageAtRef = { current: Date.now() };

    // Flush buffered ticker messages every 1000ms (1 second) for calm readability, smooth color transitions and battery efficiency
    // NOTE: source='ws' wins over REST prefill in the store, so Binance % always matches spot.
    flushIntervalRef.current = window.setInterval(() => {
      if (tickerBufferRef.current.size > 0) {
        const batch = Array.from(tickerBufferRef.current.values());
        tickerBufferRef.current.clear();
        updateTickersBatch(batch, 'ws');
      }
      // Stall watchdog: socket "connected" görünüp 25sn paket gelmezse sessizce ölmüştür.
      // Gizli sekmede bilerek kapalı olabilir, o durumda dokunma (visibility handler yönetir).
      if (!document.hidden && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        if (Date.now() - lastMessageAtRef.current > 25000) {
          try {
            socketRef.current.close();
          } catch {
            // onclose akışı reconnect'i tetikler
          }
          lastMessageAtRef.current = Date.now();
        }
      }
    }, 1000);

    const connect = () => {
      if (isDestroyed || isPaused || !navigator.onLine) return;

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
          reconnectAttempt = 0;
          setConnectionStatus('connected');
        }
      };

      ws.onmessage = (event: MessageEvent) => {
        lastMessageAtRef.current = Date.now();
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
        if (isDestroyed || isPaused) return;
        setConnectionStatus('disconnected');
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        const delay = Math.min(30000, 1000 * 2 ** reconnectAttempt);
        reconnectAttempt += 1;
        reconnectTimeoutRef.current = window.setTimeout(() => {
          reconnectTimeoutRef.current = null;
          connect();
        }, delay);
      };
    };

    connect();

    // Page Visibility API: Pause/resume WebSocket to save battery when screen is locked or tab is hidden
    const handleVisibilityChange = () => {
      isPaused = document.hidden;
      if (isPaused) {
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
        if (socketRef.current) {
          socketRef.current.close();
          socketRef.current = null;
        }
      } else if (!socketRef.current) {
        reconnectAttempt = 0;
        connect();
      }
    };

    const handleOnline = () => {
      if (!isPaused && !socketRef.current) {
        reconnectAttempt = 0;
        setConnectionStatus('connecting');
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    // Proper cleanup on unmount or when symbol list changes
    return () => {
      isDestroyed = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
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
  }, [allSymbols, setConnectionStatus, updateTickersBatch]);
};
