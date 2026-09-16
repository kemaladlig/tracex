import React, { useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Check, MinusCircle, X } from 'lucide-react';
import type { PortfolioAsset } from '../../types/crypto';
import { useCryptoStore } from '../../store/useCryptoStore';
import { cleanSymbol, formatCurrency, formatPercentage } from '../../utils/formatters';

interface SellAssetModalProps {
  asset: PortfolioAsset | null;
  isOpen: boolean;
  onClose: () => void;
}

export const SellAssetModal: React.FC<SellAssetModalProps> = ({ asset, isOpen, onClose }) => {
  const [sellAmount, setSellAmount] = useState<string>('');
  const [error, setError] = useState<string>('');

  const tickers = useCryptoStore((state) => state.tickers);
  const sellPortfolioAsset = useCryptoStore((state) => state.sellPortfolioAsset);

  if (!isOpen || !asset) return null;

  const { base } = cleanSymbol(asset.symbol);
  const livePrice = tickers[asset.symbol]?.price ?? asset.buyPrice;

  const numSellAmount = parseFloat(sellAmount) || 0;
  const totalSellValue = numSellAmount * livePrice;
  const costValue = numSellAmount * asset.buyPrice;
  const pnlAmount = totalSellValue - costValue;
  const pnlPercent = costValue > 0 ? (pnlAmount / costValue) * 100 : 0;
  const isProfit = pnlAmount >= 0;

  const handlePercentageSelect = (percent: number) => {
    const calculated = (asset.amount * percent) / 100;
    // Format to 6 decimals
    setSellAmount(calculated.toFixed(6).replace(/\.?0+$/, ''));
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (numSellAmount <= 0) {
      setError('Lütfen satılacak geçerli bir miktar girin.');
      return;
    }
    if (numSellAmount > asset.amount) {
      setError(`En fazla ${asset.amount} ${base} satabilirsiniz.`);
      return;
    }

    sellPortfolioAsset(asset.id, numSellAmount, livePrice);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-900/60 backdrop-blur-xs animate-backdrop">
      <div className="w-full max-w-md bg-[#faf7f0] border-2 border-stone-900 rounded-t-xl sm:rounded-xl p-5 shadow-hard-lg pb-safe animate-sheetUp">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-stone-900">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-rose-200 border-2 border-stone-900 text-stone-900 flex items-center justify-center shadow-hard-sm">
              <MinusCircle className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-mono font-black text-stone-900 tracking-tight">
                POZİSYON SATIŞI // {base}
              </h2>
              <span className="text-[10px] font-mono text-stone-600 font-bold">
                Mevcut Pozisyon: {asset.amount} {base}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md border-2 border-stone-900 bg-white hover:bg-stone-200 shadow-hard-sm btn-hard cursor-pointer"
          >
            <X className="w-4 h-4 stroke-[3]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 font-mono">
          {/* Live Price and Cost Overview Box */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 bg-white border-2 border-stone-900 rounded-md shadow-hard-sm">
              <span className="text-[10px] text-stone-500 font-bold uppercase block">Ort. Alış Fiyatı</span>
              <span className="font-mono font-bold text-stone-900">{formatCurrency(asset.buyPrice)}</span>
            </div>
            <div className="p-2.5 bg-amber-100 border-2 border-stone-900 rounded-md shadow-hard-sm">
              <span className="text-[10px] text-stone-600 font-bold uppercase block">Canlı Satış Fiyatı</span>
              <span className="font-mono font-bold text-stone-900">{formatCurrency(livePrice)}</span>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-stone-700 uppercase">
                Satılacak Miktar ({base})
              </label>
              <span className="text-[11px] text-stone-500">
                Eldeki: {asset.amount}
              </span>
            </div>

            <div className="relative">
              <input
                type="number"
                step="any"
                placeholder="0.00"
                value={sellAmount}
                onChange={(e) => {
                  setSellAmount(e.target.value);
                  setError('');
                }}
                className="w-full px-3 py-2.5 bg-white border-2 border-stone-900 rounded-md text-stone-900 text-sm font-bold shadow-hard-sm focus:outline-none"
              />
            </div>

            {/* Percentage Chips */}
            <div className="grid grid-cols-4 gap-1.5 mt-2">
              {[25, 50, 75, 100].map((pct) => (
                <button
                  type="button"
                  key={pct}
                  onClick={() => handlePercentageSelect(pct)}
                  className="py-1 bg-stone-100 hover:bg-stone-200 border-2 border-stone-900 rounded text-xs font-bold text-stone-900 shadow-hard-sm btn-hard cursor-pointer"
                >
                  %{pct}
                </button>
              ))}
            </div>
          </div>

          {/* Realized PnL Calculation Box */}
          {numSellAmount > 0 && (
            <div className="p-3 bg-white border-2 border-stone-900 rounded-md shadow-hard-sm">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-stone-600 font-bold">Toplam Tahsilat:</span>
                <span className="font-bold text-stone-900">{formatCurrency(totalSellValue)}</span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-stone-200">
                <span className="text-stone-600 font-bold">Gerçekleşecek Kâr/Zarar:</span>
                <span
                  className={`inline-flex items-center gap-0.5 font-bold ${
                    isProfit ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {isProfit ? <ArrowUpRight className="w-3.5 h-3.5 stroke-[3]" /> : <ArrowDownRight className="w-3.5 h-3.5 stroke-[3]" />}
                  {formatCurrency(pnlAmount)} ({formatPercentage(pnlPercent)})
                </span>
              </div>
            </div>
          )}

          {error && <p className="text-xs text-rose-700 font-bold">{error}</p>}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-stone-200 hover:bg-stone-300 border-2 border-stone-900 text-stone-900 text-xs font-bold rounded-md shadow-hard-sm btn-hard cursor-pointer"
            >
              İptal
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-rose-300 hover:bg-rose-400 border-2 border-stone-900 text-stone-950 text-xs font-black rounded-md shadow-hard btn-hard cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4 stroke-[3]" /> Satışı Gerçekleştir
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
