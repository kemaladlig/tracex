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
} from 'lucide-react';
import { useCryptoStore } from '../../store/useCryptoStore';
import { formatCurrency, formatPercentage, cleanSymbol } from '../../utils/formatters';
import { triggerHaptic } from '../../utils/haptics';
import { AddAssetModal } from '../portfolio/AddAssetModal';

interface FngState {
  value: number;
  classification: string;
}

export const HomeDashboardView: React.FC = () => {
  const portfolio = useCryptoStore((state) => state.portfolio);
  const tickers = useCryptoStore((state) => state.tickers);
  const currency = useCryptoStore((state) => state.currency);
  const tryRate = useCryptoStore((state) => state.tryRate);
  const hideBalances = useCryptoStore((state) => state.hideBalances);
  const setActiveTab = useCryptoStore((state) => state.setActiveTab);
  const setSelectedCoinForChart = useCryptoStore((state) => state.setSelectedCoinForChart);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [btcSparklinePoints, setBtcSparklinePoints] = useState<number[]>(() => {
    try {
      const saved = sessionStorage.getItem('tracex_btc_mini_sparkline');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [94500, 94800, 94600, 95100, 95400, 95200, 95800, 96200, 96500];
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

  // Background non-blocking fetch for 24h mini BTC trend (24 candles, ~1KB payload)
  useEffect(() => {
    fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=24')
      .then((res) => res.json())
      .then((data: [number, string, string, string, string][]) => {
        if (Array.isArray(data) && data.length > 0) {
          const closes = data.map((d) => parseFloat(d[4]));
          setBtcSparklinePoints(closes);
          sessionStorage.setItem('tracex_btc_mini_sparkline', JSON.stringify(closes));
        }
      })
      .catch(() => {
        // Silently preserve pre-cached points
      });

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

  const activeRate = currency === 'TRY' ? tryRate : 1;
  const oppositeRate = currency === 'TRY' ? 1 : tryRate;
  const oppositeCurrency = currency === 'TRY' ? 'USD' : 'TRY';

  // Calculate Net Portfolio Value & DCA Stats
  let totalCurrentValue = 0;
  let totalCost = 0;

  const enrichedHoldings = portfolio.map((asset) => {
    const livePrice = tickers[asset.symbol]?.price ?? asset.buyPrice;
    const val = asset.amount * livePrice;
    const cost = asset.amount * asset.buyPrice;
    totalCurrentValue += val;
    totalCost += cost;
    return {
      ...asset,
      livePrice,
      currentValue: val,
      pnl: val - cost,
      pnlPct: cost > 0 ? ((val - cost) / cost) * 100 : 0,
    };
  });

  const totalPnL = totalCurrentValue - totalCost;
  const totalPnLPct = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;
  const isPortfolioProfit = totalPnL >= 0;

  // Sort holdings by valuation descending
  const sortedHoldings = useMemo(() => {
    return [...enrichedHoldings].sort((a, b) => b.currentValue - a.currentValue);
  }, [enrichedHoldings]);

  // BTC Live Focus Data
  const btcTicker = tickers['BTCUSDT'];
  const btcPrice = btcTicker?.price ?? 96500;
  const btcChange = btcTicker?.changePercent24h ?? 0;
  const btcIsPositive = btcChange >= 0;

  // Pure SVG Sparkline Path Generator (Zero JS chart engine overhead)
  const sparklineSvgPath = useMemo(() => {
    if (btcSparklinePoints.length < 2) return { path: '', area: '' };
    const width = 140;
    const height = 42;
    const min = Math.min(...btcSparklinePoints);
    const max = Math.max(...btcSparklinePoints);
    const range = max - min || 1;

    const points = btcSparklinePoints.map((val, idx) => {
      const x = (idx / (btcSparklinePoints.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 8) - 4;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const pathD = `M ${points.join(' L ')}`;
    const areaD = `${pathD} L ${width},${height} L 0,${height} Z`;

    return { path: pathD, area: areaD };
  }, [btcSparklinePoints]);

  return (
    <div className="flex-1 w-full px-4 py-3 space-y-3 font-mono">
      {/* ========================================================================= */}
      {/* 1. MASTER COCKPIT: UNIFIED CÜZDAN & BITCOIN COMMAND CENTER                */}
      {/* ========================================================================= */}
      <div className="bg-[#ede8dd] border-2 border-stone-900 rounded-lg shadow-hard overflow-hidden">
        {/* Terminal Header Banner */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-stone-900 text-amber-300 text-[10px] font-black tracking-wider">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>TRACEX // CANLI KOMUTA KOKPİTİ</span>
          </div>
          <span className="text-stone-400">0MS ANINDA HAZIR</span>
        </div>

        {/* Dual Cockpit Grid: Cüzdan (Sol) & Bitcoin (Sağ) */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y-2 md:divide-y-0 md:divide-x-2 divide-stone-900 bg-white">
          {/* LEFT MASTER: PORTFÖY NET DEĞERİ */}
          <div
            onClick={() => {
              triggerHaptic('medium');
              setActiveTab('portfolio');
            }}
            className="p-3.5 hover:bg-stone-50 cursor-pointer transition-colors relative group"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-stone-700">
                <Wallet className="w-4 h-4 stroke-[2.5]" />
                <span className="text-xs font-black uppercase tracking-wider">
                  CÜZDANIM
                </span>
              </div>
              <span className="text-[10px] font-black text-amber-800 bg-amber-200 border border-stone-900 px-1.5 py-0.2 rounded-xs group-hover:bg-stone-900 group-hover:text-amber-300 transition-colors">
                DETAY ➔
              </span>
            </div>

            {/* Total Balance */}
            <div className="mb-2">
              <div className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                {hideBalances
                  ? '••••••••'
                  : formatCurrency(totalCurrentValue, currency, activeRate)}
              </div>
              {!hideBalances && (
                <p className="text-[11px] font-bold text-stone-500 mt-0.5">
                  ≈ {formatCurrency(totalCurrentValue, oppositeCurrency, oppositeRate)}
                </p>
              )}
            </div>

            {/* Daily / Open PnL Badge */}
            {!hideBalances && (
              <div className="flex items-center gap-2 pt-2 border-t border-stone-900/15 text-xs">
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
                  Maliyet: {formatCurrency(totalCost, currency, activeRate)}
                </span>
              </div>
            )}
          </div>

          {/* RIGHT MASTER: BITCOIN (BTC) CANLI ODAK & PURE SVG SPARKLINE */}
          <div
            onClick={() => {
              triggerHaptic('medium');
              setSelectedCoinForChart('BTCUSDT');
            }}
            className="p-3.5 hover:bg-stone-50 cursor-pointer transition-colors relative group"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded bg-stone-900 text-amber-300 flex items-center justify-center font-black text-[10px] border border-stone-900">
                  ₿
                </div>
                <span className="text-xs font-black text-stone-900 uppercase tracking-wider">
                  BİTCOİN (BTC)
                </span>
              </div>
              <span className="text-[10px] font-black text-stone-900 bg-amber-300 border border-stone-900 px-1.5 py-0.2 rounded-xs group-hover:bg-stone-900 group-hover:text-amber-300 transition-colors flex items-center gap-0.5">
                <LineChart className="w-3 h-3 stroke-[2.5]" />
                GRAFİK
              </span>
            </div>

            {/* Price & Sparkline Row */}
            <div className="flex items-end justify-between gap-2 mb-2">
              <div>
                <div className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                  {formatCurrency(btcPrice, currency, activeRate)}
                </div>
                <p className="text-[11px] font-bold text-stone-500 mt-0.5">
                  ≈ {formatCurrency(btcPrice, oppositeCurrency, oppositeRate)}
                </p>
              </div>

              {/* Zero-Latency Pure SVG Sparkline */}
              <div className="w-[120px] h-[40px] shrink-0 relative overflow-hidden pointer-events-none">
                <svg
                  viewBox="0 0 140 42"
                  className="w-full h-full overflow-visible"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="btcGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor={btcIsPositive ? '#16a34a' : '#dc2626'}
                        stopOpacity="0.3"
                      />
                      <stop
                        offset="100%"
                        stopColor={btcIsPositive ? '#16a34a' : '#dc2626'}
                        stopOpacity="0.0"
                      />
                    </linearGradient>
                  </defs>
                  {sparklineSvgPath.area && (
                    <path d={sparklineSvgPath.area} fill="url(#btcGrad)" />
                  )}
                  {sparklineSvgPath.path && (
                    <path
                      d={sparklineSvgPath.path}
                      fill="none"
                      stroke={btcIsPositive ? '#16a34a' : '#dc2626'}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                </svg>
              </div>
            </div>

            {/* 24h Change & Range */}
            <div className="flex items-center justify-between pt-2 border-t border-stone-900/15 text-xs">
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
                {btcTicker ? `H: ${formatCurrency(btcTicker.high24h, currency, activeRate)}` : '--'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. PİYASA BAROMETRESİ: 3 METRİKLİ BRUTALİST GÖSTERGE BANDI                */}
      {/* ========================================================================= */}
      <div
        onClick={() => {
          triggerHaptic('light');
          setActiveTab('analytics');
        }}
        className="grid grid-cols-3 gap-2 text-stone-900 cursor-pointer"
        title="Tüm On-Chain ve Vadeli Analizleri Görüntüle"
      >
        {/* Metrik 1: Fear & Greed */}
        <div className="bg-white border-2 border-stone-900 rounded-md p-2 shadow-hard-xs hover:bg-stone-50 transition-colors">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[9px] font-bold text-stone-500 uppercase">
              DUYGU (F&G)
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

        {/* Metrik 2: BTC Dominance */}
        <div className="bg-white border-2 border-stone-900 rounded-md p-2 shadow-hard-xs hover:bg-stone-50 transition-colors">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[9px] font-bold text-stone-500 uppercase">
              BTC DOMİNANS
            </span>
            <PieChart className="w-3 h-3 text-stone-500" />
          </div>
          <div className="text-xs font-black text-stone-900">
            %{btcDomi.toFixed(1)}
          </div>
        </div>

        {/* Metrik 3: Vadeli Fonlama Durumu */}
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
      {/* 3. PORTFÖY VARLIKLARI: MÜREKKEP FİŞİ & AĞIRLIK CETVELİ                   */}
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
              className="p-1 rounded bg-amber-300 border border-stone-900 hover:bg-amber-400 text-stone-900 text-[10px] font-black shadow-hard-xs btn-hard flex items-center gap-0.5 cursor-pointer"
            >
              <Plus className="w-3 h-3 stroke-[3]" />
              <span>EKLE</span>
            </button>

            <button
              onClick={() => {
                triggerHaptic('light');
                setActiveTab('portfolio');
              }}
              className="p-1 px-1.5 rounded bg-white border border-stone-900 hover:bg-stone-200 text-stone-900 text-[10px] font-black shadow-hard-xs btn-hard cursor-pointer"
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
                totalCurrentValue > 0 ? (item.currentValue / totalCurrentValue) * 100 : 0;

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    triggerHaptic('light');
                    setSelectedCoinForChart(item.symbol);
                  }}
                  className="px-3.5 py-2.5 hover:bg-stone-50 cursor-pointer flex items-center justify-between transition-colors group"
                >
                  {/* Left: Avatar & Amount */}
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
                          {formatCurrency(item.livePrice, currency, activeRate)}
                        </span>
                      </div>
                      <div className="text-[11px] font-bold text-stone-600 truncate">
                        {hideBalances ? '••••' : item.amount} {base}
                      </div>
                    </div>
                  </div>

                  {/* Right: Total Value & Allocation Bar */}
                  <div className="text-right shrink-0">
                    <div className="text-xs font-black text-stone-900">
                      {hideBalances
                        ? '••••••'
                        : formatCurrency(item.currentValue, currency, activeRate)}
                    </div>
                    <div className="flex items-center justify-end gap-1.5 mt-0.5">
                      <div className="w-12 h-1.5 bg-stone-200 border border-stone-900 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-stone-900"
                          style={{ width: `${Math.min(100, Math.max(3, assetAllocationPercent))}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-stone-500 min-w-[28px] text-right">
                        %{assetAllocationPercent.toFixed(1)}
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
      {/* 4. HIZLI ERİŞİM KESTİRMELERİ                                              */}
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
