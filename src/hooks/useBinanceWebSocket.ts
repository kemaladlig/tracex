import { useEffect, useMemo, useRef } from 'react';
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

  // Combine unique symbols from watchlist, portfolio, and currently active category in markets.
  // useMemo keeps identity stable across renders so the effect below only re-runs on real changes.
  const allSymbols = useMemo(
    () =>
      Array.from(
        new Set([
          ...watchlist.map((s) => s.toUpperCase()),
          ...portfolio.map((p) => p.symbol.toUpperCase()),
          ...activeMarketSymbols.map((m) => m.toUpperCase()),
        ])
      ).filter(Boolean),
    [watchlist, portfolio, activeMarketSymbols]
  );

  useEffect(() => {
    if (allSymbols.length === 0) {
      setConnectionStatus('disconnected');
      return;
    }

    let isDestroyed = false;
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

      let loggedWindowProbe = false;
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

            // Test probe: rolling-24h window proof (O -> C must be ~24h, not midnight).
            // Compare with Binance spot UI at the same second to verify % match.
            if (!loggedWindowProbe && (sym === 'BTCUSDT' || tickerBufferRef.current.size === 0)) {
              loggedWindowProbe = true;
              try {
                const openT = Number(data.O);
                const closeT = Number(data.C);
                if (openT && closeT) {
                  const windowH = (closeT - openT) / 3600000;
                  console.info(
                    `[TraceX][24h-probe] ${sym} P=${data.P}% o=${data.o} c=${data.c} window=${windowH.toFixed(2)}h O=${new Date(openT).toLocaleTimeString()} C=${new Date(closeT).toLocaleTimeString()}`
                  );
                }
              } catch {
                // ignore probe errors
              }
            }

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
  }, [allSymbols, setConnectionStatus, updateTickersBatch]);
};
