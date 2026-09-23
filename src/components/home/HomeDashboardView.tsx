import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  LineChart,
  Activity,
  Plus,
  PieChart,
  TrendingUp,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
} from 'lucide-react';
import { useCryptoStore } from '../../store/useCryptoStore';
import { formatCurrency, formatPercentage, cleanSymbol } from '../../utils/formatters';
import { triggerHaptic } from '../../utils/haptics';
import { AddAssetModal } from '../portfolio/AddAssetModal';

interface FngState {
  value: number;
  classification: string;
}

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export type ChartMode = 'candle' | 'heikin' | 'volume';

export type HomeInterval = '15m' | '1h' | '4h' | '1d';

const HOME_INTERVALS: { label: string; value: HomeInterval }[] = [
  { label: '15D', value: '15m' },
  { label: '1S', value: '1h' },
  { label: '4S', value: '4h' },
  { label: '1G', value: '1d' },
];

const DEFAULT_4H_CANDLES: Candle[] = [
  { time: 1, open: 91400, high: 92100, low: 91100, close: 91800, volume: 3100 },
  { time: 2, open: 91800, high: 92400, low: 91500, close: 92200, volume: 2800 },
  { time: 3, open: 92200, high: 92800, low: 92000, close: 92500, volume: 3400 },
  { time: 4, open: 92500, high: 93200, low: 92300, close: 93000, volume: 4200 },
  { time: 5, open: 93000, high: 93600, low: 92700, close: 93300, volume: 2900 },
  { time: 6, open: 93300, high: 93900, low: 93100, close: 93700, volume: 3600 },
  { time: 7, open: 93700, high: 94200, low: 93400, close: 93600, volume: 2200 },
  { time: 8, open: 93600, high: 94100, low: 93200, close: 93950, volume: 3100 },
  { time: 9, open: 93950, high: 94600, low: 93800, close: 94400, volume: 4800 },
  { time: 10, open: 94400, high: 94900, low: 94100, close: 94300, volume: 2600 },
  { time: 11, open: 94300, high: 95200, low: 94200, close: 95050, volume: 5100 },
  { time: 12, open: 95050, high: 95600, low: 94800, close: 95400, volume: 3900 },
  { time: 13, open: 95400, high: 95800, low: 94900, close: 95100, volume: 2700 },
  { time: 14, open: 95100, high: 95700, low: 94850, close: 95550, volume: 3300 },
  { time: 15, open: 95550, high: 96100, low: 95300, close: 95900, volume: 4100 },
  { time: 16, open: 95900, high: 96400, low: 95600, close: 96250, volume: 3700 },
  { time: 17, open: 96250, high: 96800, low: 96000, close: 96500, volume: 3500 },
  { time: 18, open: 96500, high: 96950, low: 96200, close: 96400, volume: 2400 },
  { time: 19, open: 96400, high: 97100, low: 96300, close: 96950, volume: 4600 },
  { time: 20, open: 96950, high: 97500, low: 96700, close: 97200, volume: 5200 },
  { time: 21, open: 97200, high: 97600, low: 96900, close: 97100, volume: 2900 },
  { time: 22, open: 97100, high: 97400, low: 96600, close: 96800, volume: 3100 },
  { time: 23, open: 96800, high: 97300, low: 96500, close: 97150, volume: 3600 },
  { time: 24, open: 97150, high: 97700, low: 96900, close: 97450, volume: 4300 },
  { time: 25, open: 97450, high: 97900, low: 97200, close: 97600, volume: 3800 },
  { time: 26, open: 97600, high: 98100, low: 97400, close: 97850, volume: 4100 },
  { time: 27, open: 97850, high: 98400, low: 97600, close: 98100, volume: 4900 },
  { time: 28, open: 98100, high: 98600, low: 97800, close: 98000, volume: 3300 },
  { time: 29, open: 98000, high: 98300, low: 97400, close: 97650, volume: 2800 },
  { time: 30, open: 97650, high: 97950, low: 97100, close: 97300, volume: 3200 },
  { time: 31, open: 97300, high: 97800, low: 96900, close: 97550, volume: 3700 },
  { time: 32, open: 97550, high: 98200, low: 97400, close: 98000, volume: 4500 },
  { time: 33, open: 98000, high: 98500, low: 97700, close: 98350, volume: 4200 },
  { time: 34, open: 98350, high: 98800, low: 98100, close: 98500, volume: 4700 },
  { time: 35, open: 98500, high: 99100, low: 98300, close: 98850, volume: 5400 },
  { time: 36, open: 98850, high: 99400, low: 98600, close: 99100, volume: 6200 },
  { time: 37, open: 99100, high: 99600, low: 98800, close: 99300, volume: 5800 },
  { time: 38, open: 99300, high: 99800, low: 99000, close: 99200, volume: 4100 },
  { time: 39, open: 99200, high: 99500, low: 98600, close: 98900, volume: 4900 },
  { time: 40, open: 98900, high: 99200, low: 98300, close: 98600, volume: 4400 },
  { time: 41, open: 98600, high: 98900, low: 98100, close: 98400, volume: 3600 },
  { time: 42, open: 98400, high: 98800, low: 97900, close: 98200, volume: 3900 },
  { time: 43, open: 98200, high: 98600, low: 97800, close: 98100, volume: 3200 },
  { time: 44, open: 98100, high: 98500, low: 97700, close: 98300, volume: 3500 },
  { time: 45, open: 98300, high: 98900, low: 98000, close: 98700, volume: 4800 },
  { time: 46, open: 98700, high: 99300, low: 98500, close: 99000, volume: 5300 },
  { time: 47, open: 99000, high: 99500, low: 98800, close: 99250, volume: 5100 },
  { time: 48, open: 99250, high: 99800, low: 99000, close: 99600, volume: 6800 },
];

export const HomeDashboardView: React.FC = () => {
  const portfolio = useCryptoStore((state) => state.portfolio);
  const tickers = useCryptoStore((state) => state.tickers);
  const tryRate = useCryptoStore((state) => state.tryRate);
  const hideBalances = useCryptoStore((state) => state.hideBalances);
  const toggleHideBalances = useCryptoStore((state) => state.toggleHideBalances);
  const setActiveTab = useCryptoStore((state) => state.setActiveTab);
  const setSelectedCoinForChart = useCryptoStore((state) => state.setSelectedCoinForChart);
  const connectionStatus = useCryptoStore((state) => state.connectionStatus);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  // Default wallet collapsible state: collapsed by default for public privacy
  const [isWalletExpanded, setIsWalletExpanded] = useState<boolean>(false);

  // 3-Mode Chart Style Preference: 'candle' (Klasik) | 'heikin' (Trend) | 'volume' (Hacim)
  const [chartMode, setChartMode] = useState<ChartMode>(() => {
    const saved = localStorage.getItem('tracex_home_chart_mode');
    if (saved === 'candle' || saved === 'heikin' || saved === 'volume') {
      return saved;
    }
    return 'candle';
  });

  // Home BTC timeframe: 15m | 1h | 4h | 1d (persisted, default 4h)
  const [homeInterval, setHomeInterval] = useState<HomeInterval>(() => {
    const saved = localStorage.getItem('tracex_home_chart_interval');
    if (saved === '15m' || saved === '1h' || saved === '4h' || saved === '1d') {
      return saved;
    }
    return '4h';
  });

  // Candlestick Data for BTC (Read from per-interval cache or initialize with default)
  const [candles4h, setCandles4h] = useState<Candle[]>(() => {
    try {
      const savedInterval = localStorage.getItem('tracex_home_chart_interval');
      const key =
        savedInterval === '15m' || savedInterval === '1h' || savedInterval === '4h' || savedInterval === '1d'
          ? `tracex_btc_${savedInterval}_candles`
          : 'tracex_btc_4h_candles';
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 5) {
          return parsed;
        }
      }
    } catch {}
    return DEFAULT_4H_CANDLES;
  });

  // Macro Sentiment from LocalStorage
  const [fngData, setFngData] = useState<FngState>(() => {
    try {
      const raw = localStorage.getItem('tracex_macro_fng');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.data?.currentFng) {
          return {
            value: parsed.data.currentFng,
            classification: parsed.data.fngClass || 'Nötr',
          };
        }
      }
    } catch {}
    return { value: 68, classification: 'Açgözlülük' };
  });

  const [btcDomi, setBtcDomi] = useState<number>(() => {
    try {
      const raw = localStorage.getItem('tracex_macro_dominance');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.data?.btcD) return parsed.data.btcD;
      }
    } catch {}
    return 58.4;
  });

  // Fetch 48 candles for selected home interval (15m / 1h / 4h) from Binance Public API
  useEffect(() => {
    let cancelled = false;
    // Instant per-interval cache hit for snappy switching
    try {
      const raw = localStorage.getItem(`tracex_btc_${homeInterval}_candles`);
      if (raw) {
        const cached = JSON.parse(raw);
        if (Array.isArray(cached) && cached.length > 5 && !cancelled) {
          setCandles4h(cached);
        }
      }
    } catch {}
    fetch(`https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${homeInterval}&limit=48`)
      .then((res) => res.json())
      .then((data: [number, string, string, string, string, string][]) => {
        if (cancelled) return;
        if (Array.isArray(data) && data.length > 0) {
          const parsed: Candle[] = data.map((d) => ({
            time: d[0],
            open: parseFloat(d[1]),
            high: parseFloat(d[2]),
            low: parseFloat(d[3]),
            close: parseFloat(d[4]),
            volume: parseFloat(d[5]) || 3000,
          }));
          setCandles4h(parsed);
          try {
            localStorage.setItem(`tracex_btc_${homeInterval}_candles`, JSON.stringify(parsed));
          } catch {}
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [homeInterval]);

  useEffect(() => {
    // Background macro sentiment refresh
    fetch('https://api.alternative.me/fng/?limit=1')
      .then((res) => res.json())
      .then((data) => {
        if (data?.data?.[0]) {
          const val = parseInt(data.data[0].value, 10);
          const cls = data.data[0].value_classification;
          setFngData({ value: val, classification: cls });
        }
      })
      .catch(() => {});

    // Background dominance refresh
    fetch('https://api.coinlore.net/api/global/')
      .then((res) => res.json())
      .then((res) => {
        if (res && res[0]?.btc_d) {
          setBtcDomi(parseFloat(res[0].btc_d));
        }
      })
      .catch(() => {});
  }, []);

  // BTC Live Focus Data
  const btcTicker = tickers['BTCUSDT'];
  const btcPriceUSD = btcTicker?.price ?? 96500;
  const btcChange = btcTicker?.changePercent24h ?? 0;
  const btcIsPositive = btcChange >= 0;
  const btcIsStale = !btcTicker || btcTicker.isLive !== true || connectionStatus !== 'connected';

  // Real-time candle updates: sync last candle's close, high, and low with WebSocket price
  const liveCandles = useMemo(() => {
    if (!candles4h.length) return [];
    const copy = [...candles4h];
    const lastIdx = copy.length - 1;
    const currentPrice = btcTicker?.price;
    if (currentPrice && copy[lastIdx]) {
      const last = { ...copy[lastIdx] };
      last.close = currentPrice;
      if (currentPrice > last.high) last.high = currentPrice;
      if (currentPrice < last.low) last.low = currentPrice;
      copy[lastIdx] = last;
    }
    return copy;
  }, [candles4h, btcTicker?.price]);

  // 1. Heikin-Ashi Trend-Smoothed Candlestick Pipeline
  const heikinCandles = useMemo(() => {
    if (!liveCandles.length) return [];
    const ha: Candle[] = [];
    for (let i = 0; i < liveCandles.length; i++) {
      const curr = liveCandles[i];
      const haClose = (curr.open + curr.high + curr.low + curr.close) / 4;
      let haOpen: number;
      if (i === 0) {
        haOpen = (curr.open + curr.close) / 2;
      } else {
        haOpen = (ha[i - 1].open + ha[i - 1].close) / 2;
      }
      const haHigh = Math.max(curr.high, haOpen, haClose);
      const haLow = Math.min(curr.low, haOpen, haClose);
      ha.push({
        time: curr.time,
        open: haOpen,
        high: haHigh,
        low: haLow,
        close: haClose,
      });
    }
    return ha;
  }, [liveCandles]);

  // Geometric Calculations for All 3 Chart Modes (360x190 Viewport)
  const {
    candleElements,
    minPrice,
    maxPrice,
    currentPriceY,
  } = useMemo(() => {
    const width = 360;
    const height = 190;
    const padTop = 14;
    const padBottom = 16;
    const padLeft = 8;
    const padRight = 64; // Dedicated clear rail for price labels, eliminating any overlap

    if (liveCandles.length === 0) {
      return {
        candleElements: [],
        minPrice: 0,
        maxPrice: 0,
        currentPriceY: height / 2,
      };
    }

    const activeDataset = chartMode === 'heikin' ? heikinCandles : liveCandles;

    let min = Math.min(...activeDataset.map((c) => c.low));
    let max = Math.max(...activeDataset.map((c) => c.high));
    if (min === max) {
      min -= 100;
      max += 100;
    }
    const buffer = (max - min) * 0.04;
    const effMin = min - buffer;
    const effMax = max + buffer;
    const effRange = effMax - effMin;

    const chartWidth = width - padLeft - padRight;
    const chartHeight = height - padTop - padBottom;
    const step = chartWidth / liveCandles.length;

    // Volume calculations for volume-weighted candles
    const volumes = liveCandles.map((c) => c.volume || 3000);
    const minVol = Math.min(...volumes);
    const maxVol = Math.max(...volumes);
    const volRange = maxVol - minVol || 1;

    const isVolMode = chartMode === 'volume';
    const getY = (val: number) => padTop + ((effMax - val) / effRange) * chartHeight;

    // Candlestick Elements (In volume mode: body width scales dynamically with volume)
    const elements = activeDataset.map((c, i) => {
      const cx = padLeft + (i + 0.5) * step;
      const yHigh = getY(c.high);
      const yLow = getY(c.low);
      const yOpen = getY(c.open);
      const yClose = getY(c.close);
      const isBull = c.close >= c.open;
      const top = Math.min(yOpen, yClose);
      const h = Math.max(Math.abs(yClose - yOpen), 2.5);

      const rawVol = c.volume || 3000;
      const normVol = volRange > 0 ? (rawVol - minVol) / volRange : 0.5;
      // In volume mode: thin sticks for low volume (1.6px), thick chunky blocks for high volume (5.5px)
      // Normal / Trend mode: uniform 3.8px width
      const cWidth = isVolMode
        ? Math.max(1.6 + normVol * 3.8, 1.6)
        : Math.max(step * 0.65, 3.8);

      return {
        key: c.time || i,
        cx,
        yHigh,
        yLow,
        xRect: cx - cWidth / 2,
        yRect: top,
        width: cWidth,
        height: h,
        isBull,
        volume: rawVol,
      };
    });

    const lastClose = liveCandles[liveCandles.length - 1].close;
    const curY = getY(lastClose);

    return {
      candleElements: elements,
      minPrice: min,
      maxPrice: max,
      currentPriceY: curY,
    };
  }, [liveCandles, heikinCandles, chartMode]);

  // Calculate Net Portfolio Value in USD
  let totalUSD = 0;
  let totalCostUSD = 0;

  const enrichedHoldings = portfolio.map((asset) => {
    const livePriceUSD = tickers[asset.symbol]?.price ?? asset.buyPrice;
    const valUSD = asset.amount * livePriceUSD;
    const costUSD = asset.amount * asset.buyPrice;
    totalUSD += valUSD;
    totalCostUSD += costUSD;
    return {
      ...asset,
      livePriceUSD,
      valUSD,
      costUSD,
      pnlUSD: valUSD - costUSD,
      pnlPct: costUSD > 0 ? ((valUSD - costUSD) / costUSD) * 100 : 0,
    };
  });



  // Sort holdings by valuation descending
  const sortedHoldings = useMemo(() => {
    return [...enrichedHoldings].sort((a, b) => b.valUSD - a.valUSD);
  }, [enrichedHoldings]);

  return (
    <div className="flex-1 w-full px-4 py-3 space-y-3 pb-36 sm:pb-40 font-mono">
      {/* 1. HERO COCKPIT: BITCOIN PRICE, 4H CANDLESTICK CHART & MARKET MODE */}
      <div
        onClick={() => {
          triggerHaptic('medium');
          setSelectedCoinForChart('BTCUSDT');
        }}
        className="border-2 border-stone-900 rounded-lg p-3.5 shadow-hard btn-hard cursor-pointer relative bg-white animate-sheetUp flex flex-col justify-between"
      >
        <div>
          {/* Header Row: Symbol / Name on Left, Chart Navigation on Right */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded bg-stone-900 text-amber-300 flex items-center justify-center font-black text-[10px] border border-stone-900">
                ₿
              </div>
              <span className="text-xs font-black text-stone-900 uppercase tracking-wider">
                BITCOIN (BTC)
              </span>
            </div>

            <span className="text-[10px] font-black text-stone-900 bg-amber-300 border border-stone-900 px-1.5 py-0.5 rounded-xs flex items-center gap-0.5 shadow-hard-xs">
              <LineChart className="w-3 h-3 stroke-[2.5]" />
              GRAFİK ➔
            </span>
          </div>

          {/* Price & Range Overview: Price + Percentage inline, TRY underneath */}
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div>
              {/* Row 1: USD Price + Percentage Badge right next to it */}
              <div className={`flex items-center gap-2 transition-opacity duration-500 ${btcIsStale ? 'opacity-60 saturate-[.65]' : 'opacity-100'}`}>
                {btcIsStale && (
                  <span aria-hidden="true" className="w-1.5 self-stretch rounded-full bg-amber-400 animate-pulse" />
                )}
                <span className="text-3xl sm:text-4xl font-black text-stone-900 tracking-tight">
                  {formatCurrency(btcPriceUSD, 'USD', 1, 0)}
                </span>
                <span
                  className={`inline-flex items-center gap-0.5 font-black px-1.5 py-0.5 rounded border border-stone-900 text-xs shadow-hard-xs ${
                    btcIsPositive
                      ? 'bg-emerald-200 text-emerald-950'
                      : 'bg-rose-200 text-rose-950'
                  }`}
                >
                  {btcIsPositive ? (
                    <ArrowUpRight className="w-3.5 h-3.5 stroke-[3]" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5 stroke-[3]" />
                  )}
                  {formatPercentage(btcChange)}
                </span>
              </div>

              {/* Row 2: Approximate TRY Price directly underneath */}
              <div className="text-xs sm:text-sm font-bold text-stone-500 mt-0.5">
                ≈ {formatCurrency(btcPriceUSD, 'TRY', tryRate, 0)}
              </div>
            </div>

            {/* Right: 24h High & Low */}
            <div className="text-[10px] font-bold text-stone-600 text-right leading-tight mt-1">
              <div>Y: {formatCurrency(maxPrice || btcTicker?.high24h || btcPriceUSD, 'USD', 1, 0)}</div>
              <div>D: {formatCurrency(minPrice || btcTicker?.low24h || btcPriceUSD, 'USD', 1, 0)}</div>
            </div>
          </div>

          {/* 4-Hour Japanese Candlestick Chart (Clean craft paper background, zero haze) */}
          <div className="w-full h-[205px] relative pointer-events-none my-2 bg-stone-100/70 rounded border-2 border-stone-900 p-0.5 overflow-hidden shadow-inner">
            <svg
              viewBox="0 0 360 190"
              className="w-full h-full"
              preserveAspectRatio="none"
            >
              {/* Subtle Horizontal Price Guidelines */}
              <line
                x1="8"
                y1="14"
                x2="294"
                y2="14"
                stroke="#1c1917"
                strokeWidth="1"
                strokeDasharray="3 3"
                strokeOpacity="0.14"
              />
              <line
                x1="8"
                y1="54"
                x2="294"
                y2="54"
                stroke="#1c1917"
                strokeWidth="1"
                strokeDasharray="3 3"
                strokeOpacity="0.08"
              />
              <line
                x1="8"
                y1="95"
                x2="294"
                y2="95"
                stroke="#1c1917"
                strokeWidth="1"
                strokeDasharray="3 3"
                strokeOpacity="0.12"
              />
              <line
                x1="8"
                y1="135"
                x2="294"
                y2="135"
                stroke="#1c1917"
                strokeWidth="1"
                strokeDasharray="3 3"
                strokeOpacity="0.08"
              />
              <line
                x1="8"
                y1="174"
                x2="294"
                y2="174"
                stroke="#1c1917"
                strokeWidth="1"
                strokeDasharray="3 3"
                strokeOpacity="0.14"
              />

              {/* Price Scale Text on Dedicated Right Rail (No Overlap with Candles) */}
              <text
                x="300"
                y="17"
                fill="#57534e"
                fontSize="8"
                fontWeight="bold"
                fontFamily="monospace"
              >
                ${Math.round(maxPrice).toLocaleString()}
              </text>
              <text
                x="300"
                y="98"
                fill="#78716c"
                fontSize="7.5"
                fontWeight="bold"
                fontFamily="monospace"
              >
                ${Math.round((maxPrice + minPrice) / 2).toLocaleString()}
              </text>
              <text
                x="300"
                y="177"
                fill="#57534e"
                fontSize="8"
                fontWeight="bold"
                fontFamily="monospace"
              >
                ${Math.round(minPrice).toLocaleString()}
              </text>

              {/* Live Price Horizontal Guideline Across Candles */}
              <line
                x1="8"
                y1={currentPriceY}
                x2="294"
                y2={currentPriceY}
                stroke="#1c1917"
                strokeWidth="1"
                strokeDasharray="2 2"
                strokeOpacity="0.25"
              />

              {/* Live Price Stamp on Right Axis Rail (Minimal bordered label, no solid fill) */}
              <rect
                x="304"
                y={Math.max(2, Math.min(174, currentPriceY - 7))}
                width="48"
                height="14"
                rx="2"
                fill="#ffffff"
                stroke="#1c1917"
                strokeWidth="1"
              />
              <text
                x="328"
                y={Math.max(2, Math.min(174, currentPriceY - 7)) + 10}
                textAnchor="middle"
                fill="#1c1917"
                fontSize="7.5"
                fontWeight="900"
                fontFamily="monospace"
              >
                ${Math.round(btcPriceUSD).toLocaleString()}
              </text>

              {/* CANDLESTICKS (Classic, Heikin-Ashi, or Volume-Modulated) */}
              {candleElements.map((el) => (
                <g key={el.key}>
                  {/* Candle Wick (High to Low) */}
                  <line
                    x1={el.cx}
                    y1={el.yHigh}
                    x2={el.cx}
                    y2={el.yLow}
                    stroke="#1c1917"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                  />
                  {/* Candle Body (Open to Close) */}
                  <rect
                    x={el.xRect}
                    y={el.yRect}
                    width={el.width}
                    height={el.height}
                    fill={el.isBull ? '#16a34a' : '#dc2626'}
                    stroke="#1c1917"
                    strokeWidth="1.25"
                    rx="0.75"
                  />
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Footer: Timeframe & Style Toggle Groups */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-900/10">
            <div className="flex items-center bg-stone-100 p-0.5 rounded border border-stone-900 shadow-hard-xs shrink-0">
              {HOME_INTERVALS.map((tf) => (
                <button
                  key={tf.value}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic('light');
                    setHomeInterval(tf.value);
                    localStorage.setItem('tracex_home_chart_interval', tf.value);
                  }}
                  className={`px-2 py-0.5 text-[9px] font-black rounded transition-all cursor-pointer ${
                    homeInterval === tf.value
                      ? 'bg-white text-stone-900 border border-stone-900 shadow-hard-xs'
                      : 'text-stone-500 hover:text-stone-900'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>

            <div className="flex items-center bg-stone-200/90 p-0.5 rounded border border-stone-900 shadow-hard-xs shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic('light');
                setChartMode('candle');
                localStorage.setItem('tracex_home_chart_mode', 'candle');
              }}
              className={`px-2 py-0.5 text-[9px] font-black rounded transition-all cursor-pointer ${
                chartMode === 'candle'
                  ? 'bg-amber-300 text-stone-900 border border-stone-900 shadow-hard-xs'
                  : 'text-stone-700 hover:text-stone-900'
              }`}
            >
              MUM
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic('light');
                setChartMode('heikin');
                localStorage.setItem('tracex_home_chart_mode', 'heikin');
              }}
              className={`px-2 py-0.5 text-[9px] font-black rounded transition-all cursor-pointer ${
                chartMode === 'heikin'
                  ? 'bg-amber-300 text-stone-900 border border-stone-900 shadow-hard-xs'
                  : 'text-stone-700 hover:text-stone-900'
              }`}
            >
              TREND
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic('light');
                setChartMode('volume');
                localStorage.setItem('tracex_home_chart_mode', 'volume');
              }}
              className={`px-2 py-0.5 text-[9px] font-black rounded transition-all cursor-pointer ${
                chartMode === 'volume'
                  ? 'bg-amber-300 text-stone-900 border border-stone-900 shadow-hard-xs'
                  : 'text-stone-700 hover:text-stone-900'
              }`}
            >
              HACİM
            </button>
            </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. PİYASA BAROMETRESİ: 3 SÜTUNLU TEMİZ VE KISA METRİK                     */}
      {/* ========================================================================= */}
      <div
        onClick={() => {
          triggerHaptic('light');
          setActiveTab('analytics');
        }}
        className="grid grid-cols-3 gap-2 text-stone-900 cursor-pointer animate-sheetUp [animation-delay:60ms]"
        title="Tüm Analizleri Aç"
      >
        <div className="bg-white border-2 border-stone-900 rounded-md p-2 shadow-hard-xs hover:bg-stone-50 transition-colors">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[9px] font-bold text-stone-500 uppercase">
              DUYGU
            </span>
            <span
              className={`w-2 h-2 rounded-full border border-stone-900 ${
                fngData.value >= 60 ? 'bg-emerald-500' : fngData.value <= 40 ? 'bg-rose-500' : 'bg-amber-400'
              }`}
            />
          </div>
          <div className="text-xs font-black text-stone-900 truncate">
            {fngData.value} // {fngData.classification.toUpperCase()}
          </div>
        </div>

        <div className="bg-white border-2 border-stone-900 rounded-md p-2 shadow-hard-xs hover:bg-stone-50 transition-colors">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[9px] font-bold text-stone-500 uppercase">
              DOMİNANS
            </span>
            <PieChart className="w-3 h-3 text-stone-500" />
          </div>
          <div className="text-xs font-black text-stone-900">
            %{btcDomi.toFixed(1)}
          </div>
        </div>

        <div className="bg-white border-2 border-stone-900 rounded-md p-2 shadow-hard-xs hover:bg-stone-50 transition-colors">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[9px] font-bold text-stone-500 uppercase">
              FONLAMA
            </span>
            <Activity className="w-3 h-3 text-stone-500" />
          </div>
          <div className="text-xs font-black text-emerald-700 truncate">
            %+0.010 // BOĞA
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. KİŞİSEL CÜZDAN & VARLIKLAR (TOPLULUK KORUMASI / AKORDİYON KASA)         */}
      {/* ========================================================================= */}
      <div className="space-y-2.5 animate-sheetUp [animation-delay:120ms]">
        {/* Accordion Privacy Trigger Bar */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic('medium');
            setIsWalletExpanded((prev) => !prev);
          }}
          className="w-full bg-white border-2 border-stone-900 rounded-lg p-3 shadow-hard btn-hard cursor-pointer flex items-center justify-between transition-all"
        >
          <div className="flex items-center gap-2.5">
            <div className={`p-1.5 rounded border border-stone-900 ${isWalletExpanded ? 'bg-amber-300 text-stone-900' : 'bg-stone-900 text-amber-300'}`}>
              <Wallet className="w-4 h-4 stroke-[2.5]" />
            </div>
            <span className="text-xs font-black text-stone-900 uppercase tracking-wider">
              CÜZDAN & VARLIKLAR
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[#ede8dd] border border-stone-900 text-stone-800">
              {isWalletExpanded ? 'GİZLE' : 'GÖSTER'}
            </span>
            {isWalletExpanded ? (
              <ChevronUp className="w-4 h-4 stroke-[2.5] text-stone-800" />
            ) : (
              <ChevronDown className="w-4 h-4 stroke-[2.5] text-stone-800" />
            )}
          </div>
        </button>

        {/* Collapsible Content: Cüzdanım Kartı + Varlıklarım Listesi */}
        {isWalletExpanded && (
          <div className="space-y-3 animate-sheetUp">
            {/* CÜZDANIM KARTI */}
            <div
              onClick={() => {
                triggerHaptic('medium');
                setActiveTab('portfolio');
              }}
              className="bg-white border-2 border-stone-900 rounded-lg p-3.5 shadow-hard btn-hard cursor-pointer relative transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-stone-700">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                    <span className="text-xs font-black uppercase tracking-wider">
                      NET PORTFÖY DEĞERİ
                    </span>
                  </div>

                  {/* Actions: Privacy Toggle */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerHaptic('light');
                        toggleHideBalances();
                      }}
                      title={hideBalances ? 'Bakiyeleri Göster' : 'Bakiyeleri Gizle'}
                      className={`flex items-center justify-center p-1 rounded border border-stone-900 shadow-hard-xs transition-colors cursor-pointer ${
                        hideBalances
                          ? 'bg-amber-300 text-stone-900'
                          : 'bg-[#ede8dd] hover:bg-stone-200 text-stone-700'
                      }`}
                    >
                      {hideBalances ? (
                        <EyeOff className="w-3.5 h-3.5 stroke-[2.5]" />
                      ) : (
                        <Eye className="w-3.5 h-3.5 stroke-[2.5]" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Primary TRY & Secondary USD Clean Balances */}
                <div className="py-2.5">
                  <div className="text-3xl sm:text-4xl font-black text-stone-900 tracking-tight">
                    {hideBalances
                      ? '••••••••'
                      : formatCurrency(totalUSD, 'TRY', tryRate, 0)}
                  </div>
                  <p className="text-sm font-bold text-stone-500 mt-1">
                    {hideBalances
                      ? '••••••'
                      : `≈ ${formatCurrency(totalUSD, 'USD', 1, 0)}`}
                  </p>
                </div>
              </div>

              <div className="pt-2.5 border-t-2 border-stone-900/10 flex items-center justify-between text-[11px] text-stone-500 font-bold">
                <span>{portfolio.length} Varlık Kayıtlı</span>
                <span className="text-stone-900 font-black">CÜZDAN DETAYI ➔</span>
              </div>
            </div>

            {/* VARLIKLARIM (TOP 5 LİSTE) */}
            <div className="bg-white border-2 border-stone-900 rounded-lg shadow-hard overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b-2 border-stone-900 bg-[#ede8dd]">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 stroke-[2.5]" />
                  <span className="text-xs font-black uppercase tracking-wider">
                    VARLIKLARIM ({sortedHoldings.length})
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      triggerHaptic('medium');
                      setIsAddModalOpen(true);
                    }}
                    className="p-1 px-2 rounded bg-amber-300 border border-stone-900 hover:bg-amber-400 text-stone-900 text-[10px] font-black shadow-hard-xs btn-hard flex items-center gap-0.5 cursor-pointer"
                  >
                    <Plus className="w-3 h-3 stroke-[3]" />
                    <span>EKLE</span>
                  </button>

                  <button
                    onClick={() => {
                      triggerHaptic('light');
                      setActiveTab('portfolio');
                    }}
                    className="p-1 px-2 rounded bg-white border border-stone-900 hover:bg-stone-200 text-stone-900 text-[10px] font-black shadow-hard-xs btn-hard cursor-pointer"
                  >
                    TÜMÜ ➔
                  </button>
                </div>
              </div>

              {/* Assets List Content */}
              {sortedHoldings.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-xs font-bold text-stone-500 mb-2">
                    Henüz portföyünüze varlık eklemediniz.
                  </p>
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="px-3 py-1.5 bg-amber-300 border-2 border-stone-900 rounded text-xs font-black shadow-hard-sm btn-hard cursor-pointer"
                  >
                    + İlk Varlığını Ekle
                  </button>
                </div>
              ) : (
                <div className="divide-y-2 divide-stone-900/10">
                  {sortedHoldings.slice(0, 5).map((item) => {
                    const { base } = cleanSymbol(item.symbol);
                    const assetAllocationPercent =
                      totalUSD > 0 ? (item.valUSD / totalUSD) * 100 : 0;

                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          triggerHaptic('light');
                          setSelectedCoinForChart(item.symbol);
                        }}
                        className="px-3.5 py-2.5 hover:bg-stone-50 cursor-pointer flex items-center justify-between transition-colors group"
                      >
                        {/* Left: Avatar, Name & Coin USD Unit Price */}
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-md bg-stone-900 text-amber-300 border-2 border-stone-900 flex items-center justify-center font-black text-xs shadow-hard-xs shrink-0">
                            {base.substring(0, 3)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-xs font-black text-stone-900 truncate">
                                {base}
                              </span>
                              <span className="text-[10px] font-bold text-stone-500">
                                {formatCurrency(item.livePriceUSD, 'USD', 1)}
                              </span>
                            </div>
                            <div className="text-[11px] font-bold text-stone-600 truncate">
                              {hideBalances ? '••••' : item.amount} {base}
                            </div>
                          </div>
                        </div>

                        {/* Right: Holding Total Value in TRY with USD conversion */}
                        <div className="text-right shrink-0">
                          <div className="text-xs font-black text-stone-900">
                            {hideBalances
                              ? '••••••'
                              : formatCurrency(item.valUSD, 'TRY', tryRate)}
                          </div>
                          <div className="flex items-center justify-end gap-1.5 mt-0.5">
                            <span className="text-[10px] font-bold text-stone-500">
                              {hideBalances
                                ? '••'
                                : `≈ ${formatCurrency(item.valUSD, 'USD', 1)}`}
                            </span>
                            <div className="w-10 h-1.5 bg-stone-200 border border-stone-900 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-stone-900"
                                style={{ width: `${Math.min(100, Math.max(3, assetAllocationPercent))}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-bold text-stone-600 min-w-[26px] text-right">
                              %{assetAllocationPercent.toFixed(0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add Asset Modal */}
      <AddAssetModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
};
