import React, { useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Check, MinusCircle } from 'lucide-react';
import type { PortfolioAsset } from '../../types/crypto';
import { useCryptoStore } from '../../store/useCryptoStore';
import { cleanSymbol, formatPercentage } from '../../utils/formatters';
import { usePortfolioValuation } from '../../hooks/usePortfolioPrices';
import { useWalletDisplay } from '../../hooks/useWalletDisplay';
import { Modal } from '../common/Modal';

interface SellAssetModalProps {
  asset: PortfolioAsset | null;
  isOpen: boolean;
  onClose: () => void;
}

export const SellAssetModal: React.FC<SellAssetModalProps> = ({ asset, isOpen, onClose }) => {
  const [sellAmount, setSellAmount] = useState<string>('');
  const [error, setError] = useState<string>('');

  const ticker = useCryptoStore((state) => (asset ? state.tickers[asset.symbol] : undefined));
  const { formatBalance, formatUsd } = useWalletDisplay();
  const sellPortfolioAsset = useCryptoStore((state) => state.sellPortfolioAsset);
  const valuation = usePortfolioValuation();

  if (!isOpen || !asset) return null;

  const { base } = cleanSymbol(asset.symbol);
  const livePrice = ticker?.price ?? asset.buyPrice;
  const position = valuation.positions.find((item) => item.asset.id === asset.id);
  const currentUnitPriceUsd = position?.currentUnitPriceUsd ?? 0;
  const costBasisUsd = position?.costBasisUsd ?? 0;

  const numSellAmount = parseFloat(sellAmount) || 0;
  const totalSellValue = numSellAmount * currentUnitPriceUsd;
  const costValue = numSellAmount * costBasisUsd;
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      variant="centered"
      title={
        <span className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-md bg-rose-200 border-2 border-stone-900 text-stone-900 flex items-center justify-center shadow-hard-sm shrink-0">
            <MinusCircle className="w-5 h-5 stroke-2.5" />
          </span>
          POZİSYON SATIŞI // {base}
        </span>
      }
      subtitle={`Mevcut: ${asset.amount} ${base}`}
    >
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 font-mono">
          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 no-scrollbar">
            {/* Live Price and Cost Overview Box */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-white border-2 border-stone-900 rounded-md shadow-hard-sm">
                <span className="text-[10px] text-stone-500 font-bold uppercase block">Ort. Alış Değeri (TRY)</span>
                <span className="block font-mono font-bold text-stone-900">{formatBalance(costBasisUsd)}</span>
              </div>
              <div className="p-2.5 bg-amber-100 border-2 border-stone-900 rounded-md shadow-hard-sm">
                <span className="text-[10px] text-stone-600 font-bold uppercase block">Canlı Satış Fiyatı (USD)</span>
                <span className="block font-mono font-bold text-stone-900">{formatUsd(currentUnitPriceUsd)}</span>
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
                  <span className="font-bold text-stone-900">{formatBalance(totalSellValue)}</span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-stone-200">
                  <span className="text-stone-600 font-bold">Gerçekleşecek K/Z:</span>
                  <span
                    className={`inline-flex items-center gap-0.5 font-bold ${
                      isProfit ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {isProfit ? <ArrowUpRight className="w-3.5 h-3.5 stroke-3" /> : <ArrowDownRight className="w-3.5 h-3.5 stroke-3" />}
                    {formatBalance(pnlAmount)} ({formatPercentage(pnlPercent)})
                  </span>
                </div>
              </div>
            )}

            {error && <p className="text-xs text-rose-700 font-bold">{error}</p>}
          </div>

          {/* Sticky Bottom Action Bar (Always visible above virtual keyboard) */}
          <div className="p-4 pt-2.5 pb-safe border-t-2 border-stone-900 bg-[#faf7f0] shrink-0 z-10 flex items-center gap-2">
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
              <Check className="w-4 h-4 stroke-3" /> Satışı Gerçekleştir
            </button>
          </div>
        </form>
    </Modal>
  );
};
