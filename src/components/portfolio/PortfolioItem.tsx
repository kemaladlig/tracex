import React from 'react';
import { ArrowDownRight, ArrowUpRight, BarChart2, Trash2 } from 'lucide-react';
import type { PortfolioAsset } from '../../types/crypto';
import { useCryptoStore } from '../../store/useCryptoStore';
import { cleanSymbol, formatCurrency, formatNumber, formatPercentage } from '../../utils/formatters';

interface PortfolioItemProps {
  asset: PortfolioAsset;
}

export const PortfolioItem: React.FC<PortfolioItemProps> = ({ asset }) => {
  const ticker = useCryptoStore((state) => state.tickers[asset.symbol]);
  const removePortfolioAsset = useCryptoStore((state) => state.removePortfolioAsset);
  const setSelectedCoinForChart = useCryptoStore((state) => state.setSelectedCoinForChart);

  const currentPrice = ticker?.price ?? asset.buyPrice;
  const currentValue = asset.amount * currentPrice;
  const costValue = asset.amount * asset.buyPrice;
  const pnlAmount = currentValue - costValue;
  const pnlPercent = costValue > 0 ? (pnlAmount / costValue) * 100 : 0;
  const isProfit = pnlAmount >= 0;

  const { base, quote } = cleanSymbol(asset.symbol);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`${base} pozisyonunu portföyünüzden silmek istediğinize emin misiniz?`)) {
      removePortfolioAsset(asset.id);
    }
  };

  const handleOpenChart = () => {
    setSelectedCoinForChart(asset.symbol);
  };

  return (
    <div className="relative flex flex-col p-4 mb-3 rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700/80 transition-all duration-150 shadow-sm">
      {/* Top Row: Symbol, Quantity & Current Total Value */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-800 to-indigo-950/40 border border-indigo-500/20 flex items-center justify-center font-bold text-sm text-indigo-400">
            {base.substring(0, 3)}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-white text-base tracking-tight">{base}</span>
              <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded font-medium">
                {quote}
              </span>
            </div>
            <div className="text-xs text-slate-400 font-mono mt-0.5">
              {formatNumber(asset.amount, 6)} {base}
            </div>
          </div>
        </div>

        {/* Current Total Value */}
        <div className="text-right">
          <div className="text-base font-bold text-white font-mono tracking-tight">
            {formatCurrency(currentValue)}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Birim: {ticker ? formatCurrency(currentPrice) : '...'}
          </div>
        </div>
      </div>

      {/* Bottom Row: Cost, Net PnL and Actions */}
      <div className="flex items-center justify-between pt-2.5">
        <div className="flex items-center gap-4 text-xs">
          <div>
            <span className="text-[10px] text-slate-500 block uppercase font-medium">Alış Fiyatı</span>
            <span className="text-slate-300 font-mono font-medium">{formatCurrency(asset.buyPrice)}</span>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 block uppercase font-medium">Net Kâr/Zarar</span>
            <span
              className={`inline-flex items-center font-mono font-bold text-xs ${
                isProfit ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isProfit ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              {formatCurrency(pnlAmount)} ({formatPercentage(pnlPercent)})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleOpenChart}
            title="Grafiği Görüntüle"
            className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
          >
            <BarChart2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleDelete}
            title="Pozisyonu Sil"
            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
