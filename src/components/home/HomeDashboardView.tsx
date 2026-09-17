import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  LineChart,
  Activity,
  Plus,
  Compass,
  PieChart,
  TrendingUp,
  ArrowRightLeft,
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
}

const DEFAULT_4H_CANDLES: Candle[] = [
  { time: 1, open: 93800, high: 94400, low: 93500, close: 94200 },
  { time: 2, open: 94200, high: 94800, low: 94000, close: 94650 },
  { time: 3, open: 94650, high: 95100, low: 94300, close: 94900 },
  { time: 4, open: 94900, high: 95300, low: 94600, close: 94800 },
  { time: 5, open: 94800, high: 95500, low: 94700, close: 95350 },
  { time: 6, open: 95350, high: 95800, low: 95100, close: 95600 },
  { time: 7, open: 95600, high: 96200, low: 95400, close: 95900 },
  { time: 8, open: 95900, high: 96400, low: 95700, close: 96100 },
  { time: 9, open: 96100, high: 96600, low: 95800, close: 95950 },
  { time: 10, open: 95950, high: 96300, low: 95500, close: 95800 },
  { time: 11, open: 95800, high: 96500, low: 95700, close: 96400 },
  { time: 12, open: 96400, high: 96900, low: 96200, close: 96750 },
  { time: 13, open: 96750, high: 97200, low: 96500, close: 96600 },
  { time: 14, open: 96600, high: 97000, low: 96300, close: 96850 },
  { time: 15, open: 96850, high: 97400, low: 96700, close: 97100 },
  { time: 16, open: 97100, high: 97600, low: 96900, close: 97350 },
  { time: 17, open: 97350, high: 97800, low: 97100, close: 97500 },
  { time: 18, open: 97500, high: 98100, low: 97300, close: 97800 },
];

export const HomeDashboardView: React.FC = () => {
  const portfolio = useCryptoStore((state) => state.portfolio);
  const tickers = useCryptoStore((state) => state.tickers);
  const tryRate = useCryptoStore((state) => state.tryRate);
  const hideBalances = useCryptoStore((state) => state.hideBalances);
  const toggleHideBalances = useCryptoStore((state) => state.toggleHideBalances);
  const setActiveTab = useCryptoStore((state) => state.setActiveTab);
  const setSelectedCoinForChart = useCryptoStore((state) => state.setSelectedCoinForChart);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  // Default wallet collapsible state: collapsed by default for public privacy
  const [isWalletExpanded, setIsWalletExpanded] = useState<boolean>(false);
  // Default wallet currency preference: User wants TRY (₺) 95% of the time, can flip on tap
  const [walletPrimaryTRY, setWalletPrimaryTRY] = useState<boolean>(() => {
    const saved = localStorage.getItem('tracex_home_wallet_pref');
    return saved !== null ? saved === 'true' : true;
  });

  // 4-Hour Candlestick Data for BTC (Read from cache or initialize with default)
  const [candles4h, setCandles4h] = useState<Candle[]>(() => {
    try {
      const raw = localStorage.getItem('tracex_btc_4h_candles');
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

  // Fetch 18 candles of 4-hour Klines for BTC from Binance Public API
  useEffect(() => {
    fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=4h&limit=18')
      .then((res) => res.json())
      .then((data: [number, string, string, string, string][]) => {
        if (Array.isArray(data) && data.length > 0) {
          const parsed: Candle[] = data.map((d) => ({
            time: d[0],
            open: parseFloat(d[1]),
            high: parseFloat(d[2]),
            low: parseFloat(d[3]),
            close: parseFloat(d[4]),
          }));
          setCandles4h(parsed);
          try {
            localStorage.setItem('tracex_btc_4h_candles', JSON.stringify(parsed));
          } catch {}
        }
      })
      .catch(() => {});

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

  const toggleWalletCurrency = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('light');
    setWalletPrimaryTRY((prev) => {
      const next = !prev;
      localStorage.setItem('tracex_home_wallet_pref', String(next));
      return next;
    });
  };

  // BTC Live Focus Data
  const btcTicker = tickers['BTCUSDT'];
  const btcPriceUSD = btcTicker?.price ?? 96500;
  const btcChange = btcTicker?.changePercent24h ?? 0;
  const btcIsPositive = btcChange >= 0;

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

  // Geometric Candlestick SVG Calculations
  const { candleElements, minPrice, maxPrice, currentPriceY } = useMemo(() => {
    const width = 320;
    const height = 120;
    const padTop = 10;
    const padBottom = 12;
    const padLeft = 8;
    const padRight = 50;

    if (liveCandles.length === 0) {
      return { candleElements: [], minPrice: 0, maxPrice: 0, currentPriceY: height / 2 };
    }

    let min = Math.min(...liveCandles.map((c) => c.low));
    let max = Math.max(...liveCandles.map((c) => c.high));
    if (min === max) {
      min -= 100;
      max += 100;
    }
    const buffer = (max - min) * 0.05;
    const effMin = min - buffer;
    const effMax = max + buffer;
    const effRange = effMax - effMin;

    const chartWidth = width - padLeft - padRight;
    const chartHeight = height - padTop - padBottom;
    const step = chartWidth / liveCandles.length;
    const candleWidth = Math.max(step * 0.62, 5);

    const getY = (val: number) => padTop + ((effMax - val) / effRange) * chartHeight;

    const elements = liveCandles.map((c, i) => {
      const cx = padLeft + (i + 0.5) * step;
      const yHigh = getY(c.high);
      const yLow = getY(c.low);
      const yOpen = getY(c.open);
      const yClose = getY(c.close);
      const isBull = c.close >= c.open;
      const top = Math.min(yOpen, yClose);
      const h = Math.max(Math.abs(yClose - yOpen), 2.5);

      return {
        key: c.time || i,
        cx,
        yHigh,
        yLow,
        xRect: cx - candleWidth / 2,
        yRect: top,
        width: candleWidth,
        height: h,
        isBull,
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
  }, [liveCandles]);

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
    <div className="flex-1 w-full px-4 py-3 space-y-3 font-mono">
      {/* ========================================================================= */}
      {/* 1. HERO COCKPIT: BİTCOİN (BTC) VE 24S BÜYÜTÜLMÜŞ CANLI SPARKLINE          */}
      {/* ========================================================================= */}
      <div
        onClick={() => {
          triggerHaptic('medium');
          setSelectedCoinForChart('BTCUSDT');
        }}
        className="bg-[#faf7f0] border-2 border-stone-900 rounded-lg p-3.5 shadow-hard btn-hard cursor-pointer relative transition-all animate-sheetUp flex flex-col justify-between"
      >
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded bg-stone-900 text-amber-300 flex items-center justify-center font-black text-[10px] border border-stone-900">
                ₿
              </div>
              <span className="text-xs font-black text-stone-900 uppercase tracking-wider">
                BITCOIN (BTC)
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-0.5 font-black px-1.5 py-0.5 rounded border border-stone-900 text-[11px] ${
                  btcIsPositive
                    ? 'bg-emerald-200 text-emerald-950'
                    : 'bg-rose-200 text-rose-950'
                }`}
              >
                {btcIsPositive ? (
                  <ArrowUpRight className="w-3 h-3 stroke-[3]" />
                ) : (
                  <ArrowDownRight className="w-3 h-3 stroke-[3]" />
                )}
                {formatPercentage(btcChange)} (24s)
              </span>

              <span className="text-[10px] font-black text-stone-900 bg-amber-300 border border-stone-900 px-1.5 py-0.5 rounded-xs flex items-center gap-0.5 shadow-hard-xs">
                <LineChart className="w-3 h-3 stroke-[2.5]" />
                GRAFİK ➔
              </span>
            </div>
          </div>

          {/* Price & Range Overview */}
          <div className="flex items-baseline justify-between gap-2 mb-1.5">
            <div>
              <span className="text-3xl sm:text-4xl font-black text-stone-900 tracking-tight">
                {formatCurrency(btcPriceUSD, 'USD', 1, 0)}
              </span>
              <span className="text-xs sm:text-sm font-bold text-stone-500 ml-2">
                ≈ {formatCurrency(btcPriceUSD, 'TRY', tryRate, 0)}
              </span>
            </div>

            <div className="text-[10px] font-bold text-stone-600 text-right leading-tight">
              <div>Y: {formatCurrency(maxPrice || btcTicker?.high24h || btcPriceUSD, 'USD', 1, 0)}</div>
              <div>D: {formatCurrency(minPrice || btcTicker?.low24h || btcPriceUSD, 'USD', 1, 0)}</div>
            </div>
          </div>

          {/* 4-Hour Japanese Candlestick Chart in a More Square & Prominent Frame */}
          <div className="w-full h-[126px] relative pointer-events-none my-2 bg-stone-100/60 rounded border-2 border-stone-900 p-1 overflow-hidden shadow-inner">
            <svg
              viewBox="0 0 320 120"
              className="w-full h-full"
              preserveAspectRatio="none"
            >
              {/* Subtle Horizontal Price Guidelines */}
              <line
                x1="8"
                y1="10"
                x2="270"
                y2="10"
                stroke="#1c1917"
                strokeWidth="1"
                strokeDasharray="3 3"
                strokeOpacity="0.15"
              />
              <line
                x1="8"
                y1="59"
                x2="270"
                y2="59"
                stroke="#1c1917"
                strokeWidth="1"
                strokeDasharray="3 3"
                strokeOpacity="0.12"
              />
              <line
                x1="8"
                y1="108"
                x2="270"
                y2="108"
                stroke="#1c1917"
                strokeWidth="1"
                strokeDasharray="3 3"
                strokeOpacity="0.15"
              />

              {/* Price Scale Text on the Right Axis */}
              <text
                x="274"
                y="13"
                fill="#57534e"
                fontSize="8"
                fontWeight="bold"
                fontFamily="monospace"
              >
                ${Math.round(maxPrice).toLocaleString()}
              </text>
              <text
                x="274"
                y="110"
                fill="#57534e"
                fontSize="8"
                fontWeight="bold"
                fontFamily="monospace"
              >
                ${Math.round(minPrice).toLocaleString()}
              </text>

              {/* Live Price Horizontal Guideline */}
              <line
                x1="8"
                y1={currentPriceY}
                x2="268"
                y2={currentPriceY}
                stroke="#1c1917"
                strokeWidth="1"
                strokeDasharray="2 2"
                strokeOpacity="0.35"
              />

              {/* Live Price Stamp on Right Axis */}
              <rect
                x="271"
                y={Math.max(2, Math.min(106, currentPriceY - 7))}
                width="46"
                height="14"
                rx="2"
                fill="#1c1917"
              />
              <text
                x="294"
                y={Math.max(2, Math.min(106, currentPriceY - 7)) + 10}
                textAnchor="middle"
                fill="#fbbf24"
                fontSize="8"
                fontWeight="900"
                fontFamily="monospace"
              >
                ${Math.round(btcPriceUSD).toLocaleString()}
              </text>

              {/* Candlesticks: Wicks & Bodies */}
              {candleElements.map((el) => (
                <g key={el.key}>
                  {/* Candle Wick (High to Low) */}
                  <line
                    x1={el.cx}
                    y1={el.yHigh}
                    x2={el.cx}
                    y2={el.yLow}
                    stroke="#1c1917"
                    strokeWidth="1.5"
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
                    strokeWidth="1.5"
                    rx="1"
                  />
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Clean Technical Footer - Zero Marketing Slogans */}
        <div className="flex items-center justify-between text-[10px] text-stone-600 font-bold uppercase pt-0.5">
          <span>4S MUM // 18 PERİYOT</span>
          <span>BTC / USDT</span>
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
              {isWalletExpanded ? 'GİZLE ▴' : 'GÖSTER ▾'}
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

                  {/* Actions: Privacy Toggle & Currency Swap Quick Toggle */}
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

                    <button
                      type="button"
                      onClick={toggleWalletCurrency}
                      title="Birincil Para Birimini Değiştir (₺ / $)"
                      className="flex items-center gap-1 text-[10px] font-black px-1.5 py-1 rounded bg-[#ede8dd] border border-stone-900 hover:bg-stone-200 shadow-hard-xs transition-colors cursor-pointer"
                    >
                      <span>{walletPrimaryTRY ? '₺ > $' : '$ > ₺'}</span>
                      <ArrowRightLeft className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>

                {/* Primary & Secondary Clean Balances */}
                <div className="py-2.5">
                  <div className="text-3xl sm:text-4xl font-black text-stone-900 tracking-tight">
                    {hideBalances
                      ? '••••••••'
                      : walletPrimaryTRY
                      ? formatCurrency(totalUSD, 'TRY', tryRate, 0)
                      : formatCurrency(totalUSD, 'USD', 1, 0)}
                  </div>
                  <p className="text-sm font-bold text-stone-500 mt-1">
                    {hideBalances
                      ? '••••••'
                      : `≈ ${
                          walletPrimaryTRY
                            ? formatCurrency(totalUSD, 'USD', 1, 0)
                            : formatCurrency(totalUSD, 'TRY', tryRate, 0)
                        }`}
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

                        {/* Right: Holding Total Value */}
                        <div className="text-right shrink-0">
                          <div className="text-xs font-black text-stone-900">
                            {hideBalances
                              ? '••••••'
                              : walletPrimaryTRY
                              ? formatCurrency(item.valUSD, 'TRY', tryRate)
                              : formatCurrency(item.valUSD, 'USD', 1)}
                          </div>
                          <div className="flex items-center justify-end gap-1.5 mt-0.5">
                            <span className="text-[10px] font-bold text-stone-500">
                              {hideBalances
                                ? '••'
                                : walletPrimaryTRY
                                ? `≈ ${formatCurrency(item.valUSD, 'USD', 1)}`
                                : `≈ ${formatCurrency(item.valUSD, 'TRY', tryRate)}`}
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

      {/* ========================================================================= */}
      {/* 4. HIZLI ERİŞİM BUTONLARI                                                 */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 gap-2 pt-1 pb-4 animate-sheetUp [animation-delay:180ms]">
        <button
          onClick={() => {
            triggerHaptic('medium');
            setActiveTab('markets');
          }}
          className="p-2.5 bg-[#ede8dd] border-2 border-stone-900 rounded-md text-xs font-black text-stone-900 shadow-hard btn-hard flex items-center justify-center gap-2 cursor-pointer"
        >
          <Compass className="w-4 h-4 stroke-[2.5]" />
          <span>TÜM PİYASALAR</span>
        </button>

        <button
          onClick={() => {
            triggerHaptic('medium');
            setActiveTab('portfolio');
          }}
          className="p-2.5 bg-amber-300 border-2 border-stone-900 rounded-md text-xs font-black text-stone-900 shadow-hard btn-hard flex items-center justify-center gap-2 cursor-pointer"
        >
          <Wallet className="w-4 h-4 stroke-[2.5]" />
          <span>DETAYLI CÜZDAN</span>
        </button>
      </div>

      {/* Add Asset Modal */}
      <AddAssetModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
};
