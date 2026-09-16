import React from 'react';
import { ArrowDownRight, ArrowUpRight, Plus, ShieldCheck, WalletCards } from 'lucide-react';
import { useCryptoStore } from '../../store/useCryptoStore';
import { formatCurrency, formatPercentage } from '../../utils/formatters';

interface PortfolioSummaryProps {
  onAddClick: () => void;
}

const ALLOCATION_PALETTE = [
  'bg-amber-300',
  'bg-emerald-300',
  'bg-cyan-300',
  'bg-purple-300',
  'bg-rose-300',
  'bg-stone-300',
];

export const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({ onAddClick }) => {
  const portfolio = useCryptoStore((state) => state.portfolio);
  const tickers = useCryptoStore((state) => state.tickers);
  const hideBalances = useCryptoStore((state) => state.hideBalances);
  const realizedPnL = useCryptoStore((state) => state.realizedPnL);
  const currency = useCryptoStore((state) => state.currency);
  const tryRate = useCryptoStore((state) => state.tryRate);
  const eurRate = useCryptoStore((state) => state.eurRate);

  const activeRate = currency === 'TRY' ? tryRate : eurRate;

  let totalCurrentValue = 0;
  let totalCost = 0;

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

  assetValues.sort((a, b) => b.value - a.value);

  const totalPnL = totalCurrentValue - totalCost;
  const totalPnLPercent = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;
  const isProfit = totalPnL >= 0;
  const isRealizedProfit = realizedPnL >= 0;

  return (
    <div className="relative rounded-lg bg-white border-2 border-stone-900 p-4 mb-4 shadow-hard-lg font-mono">
      {/* Top Ledger Header */}
      <div className="flex items-center justify-between pb-2.5 border-b-2 border-stone-900 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-stone-900 text-amber-300 border border-stone-900 shadow-hard-sm">
            <WalletCards className="w-4 h-4" />
          </div>
          <span className="text-xs font-black text-stone-900 uppercase tracking-wider">
            NET PORTFÖY DEĞERİ
          </span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-stone-900 font-bold bg-stone-100 border border-stone-900 px-1.5 py-0.5 rounded shadow-hard-sm">
          <ShieldCheck className="w-3 h-3 text-emerald-600" /> YEREL KASA
        </div>
      </div>

      {/* Main Balance Display with Privacy Mode Support */}
      <div className="mb-3">
        <div className="text-3xl font-black tracking-tight text-stone-900">
          {hideBalances ? '••••••••' : formatCurrency(totalCurrentValue, currency, activeRate)}
        </div>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="text-xs text-stone-600 font-bold">Açık K/Z:</span>
          {hideBalances ? (
            <span className="text-xs font-bold bg-stone-200 border border-stone-900 px-1.5 py-0.2 rounded">
              ••••••
            </span>
          ) : (
            <span
              className={`inline-flex items-center gap-0.5 text-xs font-black px-1.5 py-0.5 rounded border border-stone-900 ${
                isProfit ? 'bg-emerald-200 text-emerald-950' : 'bg-rose-200 text-rose-950'
              }`}
            >
              {isProfit ? <ArrowUpRight className="w-3 h-3 stroke-[3]" /> : <ArrowDownRight className="w-3 h-3 stroke-[3]" />}
              {formatCurrency(totalPnL, currency, activeRate)} ({formatPercentage(totalPnLPercent)})
            </span>
          )}

          {/* Realized PnL badge */}
          {realizedPnL !== 0 && (
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border border-stone-900 ${
                isRealizedProfit ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'
              }`}
              title="Kapanan/satılan pozisyonlardan elde edilen kâr"
            >
              Realize: {formatCurrency(realizedPnL, currency, activeRate)}
            </span>
          )}
        </div>
      </div>

      {/* Asset Allocation Ruler Bar */}
      {assetValues.length > 0 && totalCurrentValue > 0 && !hideBalances && (
        <div className="my-3 pt-2 border-t border-stone-200">
          <div className="flex items-center justify-between text-[10px] text-stone-600 font-bold uppercase mb-1">
            <span>Varlık Dağılımı</span>
            <span>{portfolio.length} Kalem</span>
          </div>

          {/* Segmented Ruler Bar with thick border */}
          <div className="w-full h-3 rounded border-2 border-stone-900 overflow-hidden flex bg-stone-200 shadow-hard-sm">
            {assetValues.map((asset, idx) => (
              <div
                key={asset.symbol}
                style={{ width: `${Math.max(asset.percent, 2)}%` }}
                className={`${ALLOCATION_PALETTE[idx % ALLOCATION_PALETTE.length]} border-r border-stone-900 last:border-r-0`}
                title={`${asset.symbol}: %${asset.percent.toFixed(1)}`}
              />
            ))}
          </div>

          {/* Asset percentage chips */}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {assetValues.slice(0, 4).map((asset, idx) => (
              <div key={asset.symbol} className="flex items-center gap-1 text-[10px] font-bold">
                <span
                  className={`w-2 h-2 border border-stone-900 rounded-xs ${
                    ALLOCATION_PALETTE[idx % ALLOCATION_PALETTE.length]
                  }`}
                />
                <span className="text-stone-900">{asset.symbol}</span>
                <span className="text-stone-500">%{asset.percent.toFixed(0)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Summary Stats & Add Button */}
      <div className="flex items-center justify-between pt-3 border-t-2 border-stone-900 mt-2">
        <div className="flex items-center gap-3 text-xs">
          <div>
            <span className="text-stone-500 block text-[9px] uppercase font-bold">Toplam Maliyet</span>
            <span className="text-stone-900 font-bold">
              {hideBalances ? '••••' : formatCurrency(totalCost, currency, activeRate)}
            </span>
          </div>
          <div>
            <span className="text-stone-500 block text-[9px] uppercase font-bold">Varlık</span>
            <span className="text-stone-900 font-bold">{portfolio.length} Pozisyon</span>
          </div>
        </div>

        <button
          onClick={onAddClick}
          className="flex items-center gap-1 px-3 py-1.5 bg-amber-300 hover:bg-amber-400 active:scale-95 border-2 border-stone-900 text-stone-900 text-xs font-black rounded shadow-hard-sm btn-hard cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" /> Varlık Ekle
        </button>
      </div>
    </div>
  );
};
