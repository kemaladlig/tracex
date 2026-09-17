import React, { useState, useEffect } from 'react';
import {
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  LineChart,
  Activity,
  Plus,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { useCryptoStore } from '../../store/useCryptoStore';
import { formatCurrency, formatPercentage, cleanSymbol } from '../../utils/formatters';
import { triggerHaptic } from '../../utils/haptics';
import { AddAssetModal } from '../portfolio/AddAssetModal';

interface FngMini {
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

  // 0ms Instant Macro Sentiment from LocalStorage
  const [fngData, setFngData] = useState<FngMini>(() => {
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
    } catch {
      // ignore
    }
    return { value: 65, classification: 'Açgözlülük' };
  });

  // Background non-blocking fetch for Fear & Greed if not fresh
  useEffect(() => {
    fetch('https://api.alternative.me/fng/?limit=1')
      .then((res) => res.json())
      .then((data) => {
        if (data?.data?.[0]) {
          const val = parseInt(data.data[0].value, 10);
          const cls = data.data[0].value_classification;
          setFngData({ value: val, classification: cls });
        }
      })
      .catch(() => {
        // Silently use cached fallback
      });
  }, []);

  const activeRate = currency === 'TRY' ? tryRate : 1;
  const oppositeRate = currency === 'TRY' ? 1 : tryRate;
  const oppositeCurrency = currency === 'TRY' ? 'USD' : 'TRY';

  // Portfolio Totals (Calculates in 0ms using memory/cached tickers)
  let totalCurrentValue = 0;
  let totalCost = 0;

  const sortedHoldings = [...portfolio]
    .map((asset) => {
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
    })
    .sort((a, b) => b.currentValue - a.currentValue);

  const totalPnL = totalCurrentValue - totalCost;
  const totalPnLPct = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;
  const isPortfolioProfit = totalPnL >= 0;

  // BTC Live Focus Data
  const btcTicker = tickers['BTCUSDT'];
  const btcPrice = btcTicker?.price ?? 96500;
  const btcChange = btcTicker?.changePercent24h ?? 0;
  const btcIsPositive = btcChange >= 0;

  const getFngColor = (val: number) => {
    if (val >= 75) return 'text-emerald-700 bg-emerald-100 border-emerald-900';
    if (val >= 55) return 'text-emerald-600 bg-emerald-50 border-emerald-900';
    if (val <= 25) return 'text-rose-700 bg-rose-100 border-rose-900';
    if (val <= 45) return 'text-amber-700 bg-amber-100 border-amber-900';
    return 'text-stone-800 bg-stone-100 border-stone-900';
  };

  return (
    <div className="flex-1 w-full px-4 py-3 space-y-3 font-mono">
      {/* Top Welcome & Quick Glance Bar */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse border border-stone-900 shrink-0" />
          <h1 className="text-xs font-black uppercase text-stone-800 tracking-wider">
            HIZLI BAKIŞ PANELİ
          </h1>
        </div>
        <span className="text-[10px] font-bold text-stone-500 uppercase tracking-tight">
          0MS ANINDA YÜKLENDİ
        </span>
      </div>

      {/* ========================================================================= */}
      {/* HERO CARD 1: CÜZDAN TOPLAM DEĞERİ                                         */}
      {/* ========================================================================= */}
      <div
        onClick={() => {
          triggerHaptic('medium');
          setActiveTab('portfolio');
        }}
        className="bg-white border-2 border-stone-900 rounded-lg p-4 shadow-hard btn-hard cursor-pointer relative overflow-hidden transition-all"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-stone-700">
            <Wallet className="w-4 h-4 stroke-[2.5]" />
            <span className="text-xs font-black uppercase tracking-wider">
              NET PORTFÖYÜM
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs font-black text-amber-700 hover:text-stone-900 transition-colors">
            <span>CÜZDANA GİT</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
          </div>
        </div>

        {/* Primary Portfolio Value */}
        <div className="mb-2">
          <div className="text-3xl font-black text-stone-900 tracking-tight">
            {hideBalances
              ? '••••••••'
              : formatCurrency(totalCurrentValue, currency, activeRate)}
          </div>
          {!hideBalances && (
            <p className="text-xs font-bold text-stone-500 mt-0.5">
              ≈ {formatCurrency(totalCurrentValue, oppositeCurrency, oppositeRate)}
            </p>
          )}
        </div>

        {/* Open PnL & Cost Summary Row */}
        {!hideBalances && totalCost > 0 && (
          <div className="flex items-center justify-between pt-2.5 border-t-2 border-stone-900/15 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-stone-500 font-bold uppercase">
                Açık K/Z:
              </span>
              <span
                className={`inline-flex items-center gap-0.5 font-black px-1.5 py-0.2 rounded border border-stone-900 ${
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
                {formatPercentage(totalPnLPct)}
              </span>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-stone-500 font-bold uppercase mr-1">
                Maliyet:
              </span>
              <span className="font-black text-stone-800">
                {formatCurrency(totalCost, currency, activeRate)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* HERO CARD 2: BITCOIN (BTC) CANLI ODAK KARTI                               */}
      {/* ========================================================================= */}
      <div
        onClick={() => {
          triggerHaptic('medium');
          setSelectedCoinForChart('BTCUSDT');
        }}
        className="bg-[#faf7f0] border-2 border-stone-900 rounded-lg p-4 shadow-hard btn-hard cursor-pointer relative overflow-hidden transition-all"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-stone-900 text-amber-300 border-2 border-stone-900 flex items-center justify-center font-black text-xs shadow-hard-xs">
              BTC
            </div>
            <div>
              <div className="flex items-baseline gap-1">
                <h2 className="text-sm font-black text-stone-900">BITCOIN</h2>
                <span className="text-[11px] font-bold text-stone-500">/ USDT</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs font-black text-stone-900 bg-amber-300 border-2 border-stone-900 px-2 py-1 rounded shadow-hard-xs">
            <LineChart className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>GRAFİĞİ AÇ</span>
          </div>
        </div>

        {/* BTC Price & 24h Change */}
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <div className="text-3xl font-black text-stone-900 tracking-tight">
              {formatCurrency(btcPrice, currency, activeRate)}
            </div>
            <p className="text-xs font-bold text-stone-500 mt-0.5">
              ≈ {formatCurrency(btcPrice, oppositeCurrency, oppositeRate)}
            </p>
          </div>

          <div
            className={`inline-flex items-center gap-0.5 text-xs font-black px-2 py-1 rounded border-2 border-stone-900 shadow-hard-xs ${
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
          </div>
        </div>

        {/* BTC 24s High / Low Stats Strip */}
        <div className="grid grid-cols-3 gap-2 text-xs pt-2.5 border-t-2 border-stone-900/15">
          <div className="bg-white border-2 border-stone-900 rounded p-1.5 shadow-hard-xs">
            <span className="text-[9px] text-stone-500 block font-bold uppercase">
              24s En Yüksek
            </span>
            <span className="text-stone-900 font-black text-[11px] truncate block">
              {btcTicker ? formatCurrency(btcTicker.high24h, currency, activeRate) : '--'}
            </span>
          </div>
          <div className="bg-white border-2 border-stone-900 rounded p-1.5 shadow-hard-xs">
            <span className="text-[9px] text-stone-500 block font-bold uppercase">
              24s En Düşük
            </span>
            <span className="text-stone-900 font-black text-[11px] truncate block">
              {btcTicker ? formatCurrency(btcTicker.low24h, currency, activeRate) : '--'}
            </span>
          </div>
          <div className="bg-white border-2 border-stone-900 rounded p-1.5 shadow-hard-xs">
            <span className="text-[9px] text-stone-500 block font-bold uppercase">
              24s Hacim
            </span>
            <span className="text-stone-900 font-black text-[11px] truncate block">
              {btcTicker?.quoteVolume ? `${(btcTicker.quoteVolume / 1_000_000).toFixed(0)}M$` : '--'}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* HERO CARD 3: PİYASA DUYGU NABZI (FEAR & GREED MINI GAUGE)                  */}
      {/* ========================================================================= */}
      <div
        onClick={() => {
          triggerHaptic('light');
          setActiveTab('analytics');
        }}
        className="bg-white border-2 border-stone-900 rounded-lg p-3 shadow-hard-sm btn-hard cursor-pointer transition-all"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-stone-700">
            <Activity className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="text-[11px] font-black uppercase tracking-wider">
              PİYASA DUYGU NABZI (FEAR & GREED)
            </span>
          </div>
          <span className="text-[10px] font-black text-amber-700 hover:text-stone-900">
            DETAY ➔
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div
              className={`text-xl font-black px-2 py-0.5 rounded border-2 ${getFngColor(
                fngData.value
              )}`}
            >
              {fngData.value}
            </div>
            <div>
              <span className="text-xs font-black text-stone-900 uppercase block">
                {fngData.classification}
              </span>
              <span className="text-[10px] text-stone-500 font-bold">
                100 ÜZERİNDEN MAKRO DUYARLILIK
              </span>
            </div>
          </div>

          {/* Mini progress gauge bar */}
          <div className="w-24 h-3 bg-stone-200 border-2 border-stone-900 rounded-full overflow-hidden shrink-0">
            <div
              className={`h-full transition-all ${
                fngData.value >= 50 ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, fngData.value))}%` }}
            />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* HERO CARD 4: İLK 3-4 VARLIĞIM (HIZLI BAKIŞ)                                */}
      {/* ========================================================================= */}
      {sortedHoldings.length > 0 && (
        <div className="bg-white border-2 border-stone-900 rounded-lg p-3 shadow-hard-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-stone-700">
              <TrendingUp className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="text-[11px] font-black uppercase tracking-wider">
                LİDER VARLIKLARIM ({Math.min(4, sortedHoldings.length)})
              </span>
            </div>
            <button
              onClick={() => {
                triggerHaptic('light');
                setActiveTab('portfolio');
              }}
              className="text-[10px] font-black text-stone-600 hover:text-stone-900 uppercase cursor-pointer"
            >
              TÜMÜNÜ GÖR ({sortedHoldings.length}) ➔
            </button>
          </div>

          <div className="divide-y divide-stone-900/10">
            {sortedHoldings.slice(0, 4).map((item) => {
              const { base } = cleanSymbol(item.symbol);
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    triggerHaptic('light');
                    setSelectedCoinForChart(item.symbol);
                  }}
                  className="flex items-center justify-between py-2 hover:bg-stone-50 cursor-pointer rounded px-1 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded bg-stone-900 text-amber-300 border border-stone-900 flex items-center justify-center font-black text-[11px]">
                      {base.substring(0, 3)}
                    </div>
                    <div>
                      <span className="text-xs font-black text-stone-900 block">
                        {base}
                      </span>
                      <span className="text-[10px] text-stone-500 font-bold block">
                        {hideBalances ? '••••' : item.amount} {base}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-black text-stone-900 block">
                      {hideBalances
                        ? '••••••'
                        : formatCurrency(item.currentValue, currency, activeRate)}
                    </span>
                    <span
                      className={`text-[10px] font-black block ${
                        item.pnl >= 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {formatPercentage(item.pnlPct)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Action Shortcuts Bar */}
      <div className="grid grid-cols-2 gap-2 pt-1 pb-4">
        <button
          onClick={() => {
            triggerHaptic('medium');
            setActiveTab('markets');
          }}
          className="p-2.5 bg-[#ede8dd] border-2 border-stone-900 rounded-md text-xs font-black text-stone-900 shadow-hard-sm btn-hard flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <TrendingUp className="w-4 h-4 stroke-[2.5]" />
          <span>TÜM PİYASALAR</span>
        </button>

        <button
          onClick={() => {
            triggerHaptic('medium');
            setIsAddModalOpen(true);
          }}
          className="p-2.5 bg-amber-300 border-2 border-stone-900 rounded-md text-xs font-black text-stone-900 shadow-hard-sm btn-hard flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>VARLIK EKLE</span>
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
