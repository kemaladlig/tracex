import React from 'react';
import { ArrowDownRight, ArrowUpRight, BarChart2, Minus, Plus, Trash2 } from 'lucide-react';
import type { PortfolioAsset } from '../../types/crypto';
import { useCryptoStore } from '../../store/useCryptoStore';
import { cleanSymbol, formatCurrency, formatNumber, formatPercentage } from '../../utils/formatters';

interface PortfolioItemProps {
  asset: PortfolioAsset;
  onSellClick: (asset: PortfolioAsset) => void;
  onBuyMoreClick: (symbol: string) => void;
}

export const PortfolioItem: React.FC<PortfolioItemProps> = ({
  asset,
  onSellClick,
  onBuyMoreClick,
}) => {
  const ticker = useCryptoStore((state) => state.tickers[asset.symbol]);
  const removePortfolioAsset = useCryptoStore((state) => state.removePortfolioAsset);
  const setSelectedCoinForChart = useCryptoStore((state) => state.setSelectedCoinForChart);
  const hideBalances = useCryptoStore((state) => state.hideBalances);
  const currency = useCryptoStore((state) => state.currency);
  const tryRate = useCryptoStore((state) => state.tryRate);
  const eurRate = useCryptoStore((state) => state.eurRate);

  const activeRate = currency === 'TRY' ? tryRate : eurRate;

  const currentPrice = ticker?.price ?? asset.buyPrice;
  const currentValue = asset.amount * currentPrice;
  const costValue = asset.amount * asset.buyPrice;
  const pnlAmount = currentValue - costValue;
  const pnlPercent = costValue > 0 ? (pnlAmount / costValue) * 100 : 0;
  const isProfit = pnlAmount >= 0;

  const { base, quote } = cleanSymbol(asset.symbol);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`${base} pozisyonunu silmek istediğinize emin misiniz?`)) {
      removePortfolioAsset(asset.id);
    }
  };

  const handleOpenChart = () => {
    setSelectedCoinForChart(asset.symbol);
  };

  return (
    <div className="relative flex flex-col p-3.5 mb-3 bg-white border-2 border-stone-900 rounded-lg shadow-hard font-mono transition-transform">
      {/* Top Row: Symbol, Quantity & Current Total Value */}
      <div className="flex items-center justify-between pb-2.5 border-b-2 border-stone-900/40">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-md bg-stone-900 text-amber-300 border-2 border-stone-900 flex items-center justify-center font-black text-sm shadow-hard-sm">
            {base.substring(0, 3)}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-stone-900 text-base">{base}</span>
              <span className="text-[10px] font-bold text-stone-600 bg-stone-200 border border-stone-900 px-1 py-0.2 rounded-xs">
                {quote}
              </span>
            </div>
            <div className="text-xs text-stone-600 font-bold mt-0.5">
              {hideBalances ? '••••' : formatNumber(asset.amount, 6)} {base}
            </div>
          </div>
        </div>

        {/* Current Total Value */}
        <div className="text-right">
          <div className="text-base font-black text-stone-900 tracking-tight">
            {hideBalances ? '••••••' : formatCurrency(currentValue, currency, activeRate)}
          </div>
          <div className="text-[11px] text-stone-500 font-bold">
            Birim: {ticker ? formatCurrency(currentPrice, currency, activeRate) : '...'}
          </div>
        </div>
      </div>

      {/* Middle Row: Cost & Net PnL */}
      <div className="flex items-center justify-between py-2 border-b border-stone-200">
        <div className="text-xs">
          <span className="text-[10px] text-stone-500 block uppercase font-bold">Ort. Alış Maliyeti</span>
          <span className="text-stone-900 font-bold">
            {hideBalances ? '••••' : formatCurrency(asset.buyPrice, currency, activeRate)}
          </span>
        </div>

        <div className="text-right text-xs">
          <span className="text-[10px] text-stone-500 block uppercase font-bold">Açık Kâr / Zarar</span>
          {hideBalances ? (
            <span className="text-xs font-bold text-stone-600">••••••</span>
          ) : (
            <span
              className={`inline-flex items-center gap-0.5 font-black px-1.5 py-0.2 rounded border border-stone-900 ${
                isProfit ? 'bg-emerald-200 text-emerald-950' : 'bg-rose-200 text-rose-950'
              }`}
            >
              {isProfit ? <ArrowUpRight className="w-3.5 h-3.5 stroke-[3]" /> : <ArrowDownRight className="w-3.5 h-3.5 stroke-[3]" />}
              {formatCurrency(pnlAmount, currency, activeRate)} ({formatPercentage(pnlPercent)})
            </span>
          )}
        </div>
      </div>

      {/* Bottom Action Bar: [Al +], [Sat -], [Grafik], [Sil] */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          {/* Quick Buy More Button */}
          <button
            onClick={() => onBuyMoreClick(asset.symbol)}
            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-200 hover:bg-emerald-300 border-2 border-stone-900 text-stone-900 text-xs font-bold rounded shadow-hard-sm btn-hard cursor-pointer"
            title="DCA ile pozisyona ek alım yap"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" /> Al
          </button>

          {/* Sell Button */}
          <button
            onClick={() => onSellClick(asset)}
            className="flex items-center gap-1 px-2.5 py-1 bg-rose-200 hover:bg-rose-300 border-2 border-stone-900 text-stone-900 text-xs font-bold rounded shadow-hard-sm btn-hard cursor-pointer"
            title="Kısmi veya tam satış yap"
          >
            <Minus className="w-3.5 h-3.5 stroke-[3]" /> Sat
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleOpenChart}
            title="Canlı Grafiği Aç"
            className="p-1.5 text-stone-700 hover:text-stone-950 bg-stone-100 hover:bg-stone-200 border-2 border-stone-900 rounded shadow-hard-sm btn-hard cursor-pointer"
          >
            <BarChart2 className="w-4 h-4 stroke-[2.5]" />
          </button>
          <button
            onClick={handleDelete}
            title="Pozisyonu Tamamen Kaldır"
            className="p-1.5 text-rose-700 hover:text-rose-950 bg-stone-100 hover:bg-rose-100 border-2 border-stone-900 rounded shadow-hard-sm btn-hard cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
