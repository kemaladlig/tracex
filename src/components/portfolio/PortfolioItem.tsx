import React, { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ArrowDownRight, ArrowUpRight, BarChart2, Minus, Plus, Trash2 } from 'lucide-react';
import type { PortfolioAsset } from '../../types/crypto';
import { useCryptoStore } from '../../store/useCryptoStore';
import { cleanSymbol, formatNumber, formatPercentage } from '../../utils/formatters';
import { useWalletDisplay } from '../../hooks/useWalletDisplay';
import { valuePortfolioPosition, type PriceLookup } from '../../utils/portfolioValuation';
import { CashReserveBadge } from './CashReserveBadge';

interface PortfolioItemProps {
  asset: PortfolioAsset;
  index?: number;
  showPnL?: boolean;
  onSellClick: (asset: PortfolioAsset) => void;
  onBuyMoreClick: (symbol: string) => void;
}

const PortfolioItemInner: React.FC<PortfolioItemProps> = ({
  asset,
  index = 0,
  showPnL = false,
  onSellClick,
  onBuyMoreClick,
}) => {
  const { base, quote } = cleanSymbol(asset.symbol);
  const ticker = useCryptoStore((state) => state.tickers[asset.symbol]);
  const quotePrices = useCryptoStore(
    useShallow((state) => {
      const prices: PriceLookup = {};
      if (quote === 'TRY') prices.USDTTRY = state.tickers.USDTTRY ?? state.tryRate;
      if (quote === 'EUR') prices.EURUSDT = state.tickers.EURUSDT ?? state.eurRate;
      if (!['USD', 'USDT', 'TRY', 'EUR'].includes(quote)) {
        prices[`${quote}USDT`] = state.tickers[`${quote}USDT`];
        prices[`USDT${quote}`] = state.tickers[`USDT${quote}`];
      }
      return prices;
    })
  );
  const removePortfolioAsset = useCryptoStore((state) => state.removePortfolioAsset);
  const setSelectedCoinForChart = useCryptoStore((state) => state.setSelectedCoinForChart);
  const hideBalances = useCryptoStore((state) => state.hideBalances);
  const tryRate = useCryptoStore((state) => state.tryRate);
  const eurRate = useCryptoStore((state) => state.eurRate);
  const { formatBalance, formatUsd } = useWalletDisplay();
  // PnL de fiyattan türediği için aynı yazısız stale dili: soluk + amber bar, ekstra yazı yok.
  // Solukluk SADECE açılışta cache'ten gelen veri içindir; fiyat akışı soldurmaz.
  const isStale = !ticker || ticker.source === 'cache';
  const valuation = useMemo(() => {
    const prices: PriceLookup = { ...quotePrices, [asset.symbol]: ticker };
    return valuePortfolioPosition(asset, ticker?.price ?? asset.buyPrice, prices, { tryRate, eurRate });
  }, [asset, eurRate, quotePrices, ticker, tryRate]);
  const currentPrice = valuation.currentUnitPriceUsd;
  const currentValue = valuation.currentValueUsd;
  const pnlAmount = valuation.pnlUsd;
  const pnlPercent = valuation.pnlPercent;
  const isProfit = pnlAmount >= 0;

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
    <div
      style={{ '--stagger-idx': Math.min(index, 8) } as React.CSSProperties}
      className={`relative flex flex-col p-3.5 bg-white border-2 border-stone-900 rounded-lg shadow-hard font-mono transition-[box-shadow,transform] duration-150 stagger-item lg:hover:-translate-y-0.5 lg:hover:shadow-hard-lg ${isStale ? 'border-dashed' : ''}`}
    >
      {isStale && (
        <span
          aria-hidden="true"
          className="absolute left-1.5 top-2.5 bottom-2.5 w-1 rounded-full bg-amber-400 animate-pulse"
        />
      )}
      {/* Top Row: Symbol, quantity and current total value (TRY primary, USD secondary) */}
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

        {/* Current total value in TRY with a smaller USD reference */}
        <div className={`text-right transition-opacity duration-500 ${isStale ? 'opacity-60 saturate-[.65]' : 'opacity-100'}`}>
          <div className="text-base font-black text-stone-900 tracking-tight">
            {hideBalances ? '••••••' : formatBalance(currentValue)}
          </div>
          <div className="text-[10px] font-bold text-stone-500">
            {hideBalances ? '••' : `≈ ${formatUsd(currentValue)}`}
          </div>
          <div className="mt-0.5 text-[11px] font-bold text-stone-500">
            Birim (USD): {ticker ? formatUsd(currentPrice) : '...'}
          </div>
        </div>
      </div>

      {/* Cost and PnL are balance values in TRY; unit prices stay in USD. */}
      {showPnL && (
        <div className={`flex items-center justify-between py-2 border-b border-stone-200 animate-in fade-in transition-opacity duration-500 ${isStale ? 'opacity-60 saturate-[.65]' : 'opacity-100'}`}>
          <div className="text-xs">
            <span className="text-[10px] text-stone-500 block uppercase font-bold">Ort. Alış Maliyeti</span>
            <span className="text-stone-900 font-bold">
              {hideBalances ? '••••' : formatBalance(valuation.costBasisUsd)}
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
                {isProfit ? <ArrowUpRight className="w-3.5 h-3.5 stroke-3" /> : <ArrowDownRight className="w-3.5 h-3.5 stroke-3" />}
                {formatBalance(pnlAmount)} ({formatPercentage(pnlPercent)})
              </span>
            )}
          </div>
        </div>
      )}

      {valuation.isStable && (
        <CashReserveBadge
          valueUsd={valuation.currentValueUsd}
          hideBalances={hideBalances}
        />
      )}

      {/* Bottom Action Bar: [Al +], [Sat -], [Grafik], [Sil] */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          {/* Quick Buy More Button */}
          <button
            onClick={() => onBuyMoreClick(asset.symbol)}
            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-200 hover:bg-emerald-300 border-2 border-stone-900 text-stone-900 text-xs font-bold rounded shadow-hard-sm btn-hard cursor-pointer"
            title="DCA ile pozisyona ek alım yap"
          >
            <Plus className="w-3.5 h-3.5 stroke-3" /> Al
          </button>

          {/* Sell Button */}
          <button
            onClick={() => onSellClick(asset)}
            className="flex items-center gap-1 px-2.5 py-1 bg-rose-200 hover:bg-rose-300 border-2 border-stone-900 text-stone-900 text-xs font-bold rounded shadow-hard-sm btn-hard cursor-pointer"
            title="Kısmi veya tam satış yap"
          >
            <Minus className="w-3.5 h-3.5 stroke-3" /> Sat
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleOpenChart}
            title="Canlı Grafiği Aç"
            className="p-1.5 text-stone-700 hover:text-stone-950 bg-stone-100 hover:bg-stone-200 border-2 border-stone-900 rounded shadow-hard-sm btn-hard cursor-pointer"
          >
            <BarChart2 className="w-4 h-4 stroke-2.5" />
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

export const PortfolioItem = React.memo(PortfolioItemInner);
