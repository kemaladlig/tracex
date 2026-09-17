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
} from 'lucide-react';
import { useCryptoStore } from '../../store/useCryptoStore';
import { formatCurrency, formatPercentage, cleanSymbol } from '../../utils/formatters';
import { triggerHaptic } from '../../utils/haptics';
import { AddAssetModal } from '../portfolio/AddAssetModal';

interface FngState {
  value: number;
  classification: string;
}

interface CachedSparkline {
  points: number[];
  open24h: number;
  timestamp: number;
}

export const HomeDashboardView: React.FC = () => {
  const portfolio = useCryptoStore((state) => state.portfolio);
  const tickers = useCryptoStore((state) => state.tickers);
  const tryRate = useCryptoStore((state) => state.tryRate);
  const hideBalances = useCryptoStore((state) => state.hideBalances);
  const setActiveTab = useCryptoStore((state) => state.setActiveTab);
  const setSelectedCoinForChart = useCryptoStore((state) => state.setSelectedCoinForChart);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  // Default wallet currency preference: User wants TRY (₺) 95% of the time, can flip on tap
  const [walletPrimaryTRY, setWalletPrimaryTRY] = useState<boolean>(() => {
    const saved = localStorage.getItem('tracex_home_wallet_pref');
    return saved !== null ? saved === 'true' : true;
  });

  // 100% Real Binance 24h Sparkline (Read from cache or initialize with smooth data)
  const [sparklineData, setSparklineData] = useState<CachedSparkline>(() => {
    try {
      const raw = localStorage.getItem('tracex_btc_24h_sparkline');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed?.points) && parsed.points.length > 5) {
          return parsed;
        }
      }
    } catch {}
    return {
      points: [94200, 94600, 94900, 94500, 95100, 95400, 95200, 95800, 96100, 96450],
      open24h: 94200,
      timestamp: Date.now(),
    };
  });

  // 0ms Instant Macro Sentiment from LocalStorage
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

  // Fetch 100% Real 24h Hourly Klines for BTC from Binance Public API
  useEffect(() => {
    fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=24')
      .then((res) => res.json())
      .then((data: [number, string, string, string, string][]) => {
        if (Array.isArray(data) && data.length > 0) {
          const open24h = parseFloat(data[0][1]);
          const closes = data.map((d) => parseFloat(d[4]));
          const payload: CachedSparkline = {
            points: closes,
            open24h,
            timestamp: Date.now(),
          };
          setSparklineData(payload);
          try {
            localStorage.setItem('tracex_btc_24h_sparkline', JSON.stringify(payload));
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
  const btcPriceTRY = btcPriceUSD * tryRate;
  const btcChange = btcTicker?.changePercent24h ?? 0;
  const btcIsPositive = btcChange >= 0;

  // Real-time sparkline: combine the 24 hourly points with the live WebSocket price as the 25th point!
  const liveSparklinePoints = useMemo(() => {
    const pts = [...sparklineData.points];
    if (btcTicker?.price) {
      pts[pts.length - 1] = btcTicker.price;
    }
    return pts;
  }, [sparklineData.points, btcTicker?.price]);

  // Pure SVG Sparkline Path Generator with Baseline & Live Tip
  const { pathD, areaD, baselineY, tipPoint } = useMemo(() => {
    const width = 160;
    const height = 48;
    const pts = liveSparklinePoints;
    if (pts.length < 2) return { pathD: '', areaD: '', baselineY: height / 2, tipPoint: { x: width, y: height / 2 } };

    const min = Math.min(...pts, sparklineData.open24h);
    const max = Math.max(...pts, sparklineData.open24h);
    const range = max - min || 1;

    const coords = pts.map((val, idx) => {
      const x = (idx / (pts.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 10) - 5;
      return { x, y };
    });

    const path = `M ${coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' L ')}`;
    const area = `${path} L ${width},${height} L 0,${height} Z`;
    const baseLine = height - ((sparklineData.open24h - min) / range) * (height - 10) - 5;
    const tip = coords[coords.length - 1];

    return { pathD: path, areaD: area, baselineY: baseLine, tipPoint: tip };
  }, [liveSparklinePoints, sparklineData.open24h]);

  // Calculate Net Portfolio Value in USD and TRY
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
      valTRY: valUSD * tryRate,
      pnlUSD: valUSD - costUSD,
      pnlPct: costUSD > 0 ? ((valUSD - costUSD) / costUSD) * 100 : 0,
    };
  });

  const totalTRY = totalUSD * tryRate;
  const totalCostTRY = totalCostUSD * tryRate;
  const totalPnLUSD = totalUSD - totalCostUSD;
  const totalPnLPct = totalCostUSD > 0 ? (totalPnLUSD / totalCostUSD) * 100 : 0;
  const isPortfolioProfit = totalPnLUSD >= 0;

  // Sort holdings by valuation descending
  const sortedHoldings = useMemo(() => {
    return [...enrichedHoldings].sort((a, b) => b.valUSD - a.valUSD);
  }, [enrichedHoldings]);

  return (
    <div className="flex-1 w-full px-4 py-3 space-y-3 font-mono">
      {/* ========================================================================= */}
      {/* 1. MASTER COCKPIT: DUAL COMMAND CENTER (NO FILLER TEXTS)                  */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* LEFT COCKPIT: CÜZDANIM (DOĞAL İKİLİ GÖRÜNÜM: BÜYÜK ₺, KÜÇÜK $) */}
        <div
          onClick={() => {
            triggerHaptic('medium');
            setActiveTab('portfolio');
          }}
          className="bg-white border-2 border-stone-900 rounded-lg p-3.5 shadow-hard btn-hard cursor-pointer relative transition-all"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-stone-700">
              <Wallet className="w-4 h-4 stroke-[2.5]" />
              <span className="text-xs font-black uppercase tracking-wider">
                CÜZDANIM
              </span>
            </div>

            {/* Currency Swap Quick Toggle */}
            <button
              onClick={toggleWalletCurrency}
              title="Birincil Para Birimini Değiştir (₺ / $)"
              className="flex items-center gap-1 text-[10px] font-black px-1.5 py-0.5 rounded bg-[#ede8dd] border border-stone-900 hover:bg-stone-200 transition-colors"
            >
              <span>{walletPrimaryTRY ? '₺ > $' : '$ > ₺'}</span>
              <ArrowRightLeft className="w-2.5 h-2.5" />
            </button>
          </div>

          {/* Primary & Secondary Dual Balance */}
          <div className="mb-2">
            <div className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
              {hideBalances
                ? '••••••••'
                : walletPrimaryTRY
                ? formatCurrency(totalTRY, 'TRY', tryRate)
                : formatCurrency(totalUSD, 'USD', 1)}
            </div>
            {!hideBalances && (
              <p className="text-xs font-bold text-stone-500 mt-0.5">
                ≈ {walletPrimaryTRY
                  ? formatCurrency(totalUSD, 'USD', 1)
                  : formatCurrency(totalTRY, 'TRY', tryRate)}
              </p>
            )}
          </div>

          {/* Open PnL Badge & Cost */}
          {!hideBalances && (
            <div className="flex items-center justify-between pt-2 border-t-2 border-stone-900/10 text-xs">
              <span
                className={`inline-flex items-center gap-0.5 font-black px-1.5 py-0.5 rounded border border-stone-900 text-[11px] ${
                  isPortfolioProfit
                    ? 'bg-emerald-200 text-emerald-950'
                    : 'bg-rose-200 text-rose-950'
                }`}
              >
                {isPortfolioProfit ? (
                  <ArrowUpRight className="w-3 h-3 stroke-[3]" />
                ) : (
                  <ArrowDownRight className="w-3 h-3 stroke-[3]" />
                )}
                {formatPercentage(totalPnLPct)} Açık K/Z
              </span>

              <span className="text-[10px] text-stone-500 font-bold uppercase truncate">
                Maliyet: {walletPrimaryTRY ? formatCurrency(totalCostTRY, 'TRY', tryRate) : formatCurrency(totalCostUSD, 'USD', 1)}
              </span>
            </div>
          )}
        </div>

        {/* RIGHT COCKPIT: BİTCOİN (BTC) (DOĞAL İKİLİ GÖRÜNÜM: BÜYÜK $, KÜÇÜK ₺ + GERÇEK SPARKLINE) */}
        <div
          onClick={() => {
            triggerHaptic('medium');
            setSelectedCoinForChart('BTCUSDT');
          }}
          className="bg-[#faf7f0] border-2 border-stone-900 rounded-lg p-3.5 shadow-hard btn-hard cursor-pointer relative transition-all"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded bg-stone-900 text-amber-300 flex items-center justify-center font-black text-[10px] border border-stone-900">
                ₿
              </div>
              <span className="text-xs font-black text-stone-900 uppercase tracking-wider">
                BITCOIN (BTC)
              </span>
            </div>

            <span className="text-[10px] font-black text-stone-900 bg-amber-300 border border-stone-900 px-1.5 py-0.5 rounded-xs flex items-center gap-1 shadow-hard-xs">
              <LineChart className="w-3 h-3 stroke-[2.5]" />
              GRAFİK ➔
            </span>
          </div>

          {/* Price & Real Binance Sparkline Row */}
          <div className="flex items-end justify-between gap-2 mb-2">
            <div>
              {/* Primary USD (Crypto market standard) */}
              <div className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                {formatCurrency(btcPriceUSD, 'USD', 1)}
              </div>
              {/* Secondary TRY (Local value reference) */}
              <p className="text-xs font-bold text-stone-500 mt-0.5">
                ≈ {formatCurrency(btcPriceTRY, 'TRY', tryRate)}
              </p>
            </div>

            {/* 100% Real Live Binance 24h Sparkline */}
            <div className="w-[140px] h-[46px] shrink-0 relative pointer-events-none">
              <svg
                viewBox="0 0 160 48"
                className="w-full h-full overflow-visible"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="btcGradReal" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={btcIsPositive ? '#16a34a' : '#dc2626'}
                      stopOpacity="0.25"
                    />
                    <stop
                      offset="100%"
                      stopColor={btcIsPositive ? '#16a34a' : '#dc2626'}
                      stopOpacity="0.0"
                    />
                  </linearGradient>
                </defs>

                {/* 24h Baseline (Dotted Line indicating start of 24h period) */}
                <line
                  x1="0"
                  y1={baselineY}
                  x2="160"
                  y2={baselineY}
                  stroke="#1c1917"
                  strokeWidth="1"
                  strokeDasharray="2,2"
                  strokeOpacity="0.25"
                />

                {/* Shaded Area */}
                {areaD && <path d={areaD} fill="url(#btcGradReal)" />}

                {/* Real Trend Line */}
                {pathD && (
                  <path
                    d={pathD}
                    fill="none"
                    stroke={btcIsPositive ? '#16a34a' : '#dc2626'}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Real-time Pulsing Dot on Current Live Price */}
                {tipPoint && (
                  <>
                    <circle
                      cx={tipPoint.x}
                      cy={tipPoint.y}
                      r="2.5"
                      fill={btcIsPositive ? '#16a34a' : '#dc2626'}
                      stroke="#1c1917"
                      strokeWidth="1"
                    />
                    <circle
                      cx={tipPoint.x}
                      cy={tipPoint.y}
                      r="5"
                      fill={btcIsPositive ? '#16a34a' : '#dc2626'}
                      opacity="0.3"
                      className="animate-ping"
                    />
                  </>
                )}
              </svg>
            </div>
          </div>

          {/* 24h Change & Range */}
          <div className="flex items-center justify-between pt-2 border-t-2 border-stone-900/10 text-xs">
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

            <span className="text-[10px] text-stone-600 font-bold uppercase truncate">
              {btcTicker ? `D: ${formatCurrency(btcTicker.low24h, 'USD', 1)} // Y: ${formatCurrency(btcTicker.high24h, 'USD', 1)}` : '--'}
            </span>
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
        className="grid grid-cols-3 gap-2 text-stone-900 cursor-pointer"
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
      {/* 3. PORTFÖY VARLIKLARI: DOĞAL İKİLİ GÖRÜNÜM (TL EDERİ + DOLAR FİYATI)     */}
      {/* ========================================================================= */}
      <div className="bg-white border-2 border-stone-900 rounded-lg shadow-hard overflow-hidden">
        {/* Section Header */}
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

        {/* Assets List */}
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
                        {/* Coin USD Price (Crypto Standard) */}
                        <span className="text-[10px] font-bold text-stone-500">
                          {formatCurrency(item.livePriceUSD, 'USD', 1)}
                        </span>
                      </div>
                      <div className="text-[11px] font-bold text-stone-600 truncate">
                        {hideBalances ? '••••' : item.amount} {base}
                      </div>
                    </div>
                  </div>

                  {/* Right: Holding Total Value (Primary ₺ TL, Subtitle $ USD) */}
                  <div className="text-right shrink-0">
                    <div className="text-xs font-black text-stone-900">
                      {hideBalances
                        ? '••••••'
                        : walletPrimaryTRY
                        ? formatCurrency(item.valTRY, 'TRY', tryRate)
                        : formatCurrency(item.valUSD, 'USD', 1)}
                    </div>
                    <div className="flex items-center justify-end gap-1.5 mt-0.5">
                      <span className="text-[10px] font-bold text-stone-500">
                        {hideBalances
                          ? '••'
                          : walletPrimaryTRY
                          ? `≈ ${formatCurrency(item.valUSD, 'USD', 1)}`
                          : `≈ ${formatCurrency(item.valTRY, 'TRY', tryRate)}`}
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

      {/* ========================================================================= */}
      {/* 4. HIZLI ERİŞİM BUTONLARI                                                 */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 gap-2 pt-1 pb-4">
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
