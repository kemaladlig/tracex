import React from 'react';
import { ArrowDownRight, ArrowUpRight, PieChart, Plus, ShieldCheck, Wallet } from 'lucide-react';
import { useCryptoStore } from '../../store/useCryptoStore';
import { formatCurrency, formatPercentage } from '../../utils/formatters';

interface PortfolioSummaryProps {
  onAddClick: () => void;
}

const ALLOCATION_COLORS = [
  'bg-indigo-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-cyan-500',
  'bg-purple-500',
  'bg-rose-500',
];

export const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({ onAddClick }) => {
  const portfolio = useCryptoStore((state) => state.portfolio);
  const tickers = useCryptoStore((state) => state.tickers);

  let totalCurrentValue = 0;
  let totalCost = 0;

  // Compute values per asset for allocation
  const assetValues: { symbol: string; value: number; percent: number }[] = [];

  portfolio.forEach((asset) => {
    const livePrice = tickers[asset.symbol]?.price ?? asset.buyPrice;
    const currentAssetVal = asset.amount * livePrice;
    const costAssetVal = asset.amount * asset.buyPrice;

    totalCurrentValue += currentAssetVal;
    totalCost += costAssetVal;

    assetValues.push({
      symbol: asset.symbol.replace('USDT', ''),
      value: currentAssetVal,
      percent: 0,
    });
  });

  if (totalCurrentValue > 0) {
    assetValues.forEach((a) => {
      a.percent = (a.value / totalCurrentValue) * 100;
    });
  }

  // Sort descending
  assetValues.sort((a, b) => b.value - a.value);

  const totalPnL = totalCurrentValue - totalCost;
  const totalPnLPercent = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;
  const isProfit = totalPnL >= 0;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900/60 via-slate-900/90 to-[#0d121c] border border-indigo-500/20 p-5 mb-4 shadow-xl backdrop-blur-md">
      {/* Background Decorative Glow */}
      <div className="absolute -top-12 -right-12 w-36 h-36 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header Info */}
      <div className="flex items-center justify-between mb-3 relative z-10">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-400/20 text-indigo-300">
            <Wallet className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-slate-300 tracking-wide uppercase">
            Toplam Portföy Değeri
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
          <ShieldCheck className="w-3 h-3" /> Yerel Saklama
        </div>
      </div>

      {/* Main Balance Display */}
      <div className="relative z-10 mb-3">
        <div className="text-3xl font-black tracking-tight text-white font-mono">
          {formatCurrency(totalCurrentValue)}
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-xs text-slate-400">Toplam Kâr / Zarar:</span>
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-lg font-mono ${
              isProfit
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                : 'bg-rose-500/15 text-rose-400 border border-rose-500/25'
            }`}
          >
            {isProfit ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {formatCurrency(totalPnL)} ({formatPercentage(totalPnLPercent)})
          </span>
        </div>
      </div>

      {/* Asset Allocation Bar (if more than 0 assets) */}
      {assetValues.length > 0 && totalCurrentValue > 0 && (
        <div className="relative z-10 my-3.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
            <span className="flex items-center gap-1 font-medium">
              <PieChart className="w-3 h-3 text-indigo-400" /> Varlık Dağılımı
            </span>
          </div>

          {/* Segmented Progress Bar */}
          <div className="w-full h-2 rounded-full overflow-hidden flex bg-slate-800/80">
            {assetValues.map((asset, idx) => (
              <div
                key={asset.symbol}
                style={{ width: `${Math.max(asset.percent, 2)}%` }}
                className={`${ALLOCATION_COLORS[idx % ALLOCATION_COLORS.length]} transition-all duration-300`}
                title={`${asset.symbol}: %${asset.percent.toFixed(1)}`}
              />
            ))}
          </div>

          {/* Asset Percentage Labels */}
          <div className="flex flex-wrap items-center gap-2.5 mt-2">
            {assetValues.slice(0, 4).map((asset, idx) => (
              <div key={asset.symbol} className="flex items-center gap-1 text-[10px]">
                <span
                  className={`w-2 h-2 rounded-full ${ALLOCATION_COLORS[idx % ALLOCATION_COLORS.length]}`}
                />
                <span className="text-slate-300 font-semibold">{asset.symbol}</span>
                <span className="text-slate-400 font-mono">%{asset.percent.toFixed(0)}</span>
              </div>
            ))}
            {assetValues.length > 4 && (
              <span className="text-[10px] text-slate-500">+{assetValues.length - 4} diğer</span>
            )}
          </div>
        </div>
      )}

      {/* Bottom Summary Stats & Add Button */}
      <div className="relative z-10 flex items-center justify-between pt-3 border-t border-slate-800/80">
        <div className="flex items-center gap-4 text-xs">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">Toplam Maliyet</span>
            <span className="text-slate-300 font-medium font-mono">{formatCurrency(totalCost)}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">Varlık Sayısı</span>
            <span className="text-slate-300 font-medium font-mono">{portfolio.length} Pozisyon</span>
          </div>
        </div>

        <button
          onClick={onAddClick}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/30 transition-all duration-150"
        >
          <Plus className="w-3.5 h-3.5" /> Varlık Ekle
        </button>
      </div>
    </div>
  );
};
