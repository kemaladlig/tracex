import React from 'react';
import { ArrowDownRight, ArrowUpRight, ChevronDown, ChevronUp, Plus, ShieldCheck, WalletCards, Zap } from 'lucide-react';
import { useCryptoStore } from '../../store/useCryptoStore';
import { usePortfolioValuation } from '../../hooks/usePortfolioPrices';
import { formatPercentage } from '../../utils/formatters';
import { useWalletDisplay } from '../../hooks/useWalletDisplay';
import { InfoBadge } from '../common/InfoBadge';

interface PortfolioSummaryProps {
  onAddClick: () => void;
  onSmartImportClick?: () => void;
  showDetails: boolean;
  onToggleDetails: () => void;
}

const ALLOCATION_PALETTE = [
  'bg-amber-300',
  'bg-emerald-300',
  'bg-cyan-300',
  'bg-purple-300',
  'bg-rose-300',
  'bg-stone-300',
];

export const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({
  onAddClick,
  onSmartImportClick,
  showDetails,
  onToggleDetails,
}) => {
  const portfolio = useCryptoStore((state) => state.portfolio);
  const valuation = usePortfolioValuation();
  const hideBalances = useCryptoStore((state) => state.hideBalances);
  const realizedPnL = useCryptoStore((state) => state.realizedPnL);
  const { formatBalance, formatUsd } = useWalletDisplay();

  const totalCurrentValue = valuation.totalValueUsd;
  const totalCost = valuation.totalCostUsd;
  const totalPnL = valuation.pnlUsd;
  const totalPnLPercent = valuation.pnlPercent;
  const isProfit = totalPnL >= 0;
  const assetValues = valuation.positions
    .map((position) => ({
      symbol: position.baseAsset,
      value: position.currentValueUsd,
      percent: totalCurrentValue > 0 ? (position.currentValueUsd / totalCurrentValue) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);
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
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-1 text-[10px] text-stone-900 font-bold bg-stone-100 border border-stone-900 px-1.5 py-0.5 rounded shadow-hard-sm">
            <ShieldCheck className="w-3 h-3 text-emerald-600" /> YEREL KASA
          </div>
          <InfoBadge
            title="Cüzdan Güvenliği"
            content="Tüm varlık kayıtlarınız ve hesaplamalar sadece cihazınızdaki yerel hafızada (LocalStorage) tutulur. Hiçbir sunucuya veri gönderilmez."
          />
        </div>
      </div>

      {/* Main Balance Display with Privacy Mode Support (TRY primary + USD reference) */}
      <div className="mb-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-3xl font-black tracking-tight text-stone-900">
              {hideBalances ? '••••••••' : formatBalance(totalCurrentValue)}
            </div>
            <p className="text-xs font-bold text-stone-500 mt-0.5">
              {hideBalances ? '••••••' : `≈ ${formatUsd(totalCurrentValue)}`}
            </p>
          </div>

          {/* Toggle Details Button */}
          <button
            type="button"
            onClick={onToggleDetails}
            className="inline-flex items-center gap-1 text-[10px] font-black text-stone-800 bg-stone-100 hover:bg-stone-200 active:scale-95 border border-stone-900 px-2 py-1 rounded shadow-hard-xs cursor-pointer transition-colors"
            title={showDetails ? 'Özeti ve varlık K/Z sadeleştir' : 'Açık K/Z ve tüm analiz detaylarını göster'}
          >
            <span>{showDetails ? 'SADE GÖRÜNÜM' : 'DETAYLI ANALİZ'}</span>
            {showDetails ? (
              <ChevronUp className="w-3.5 h-3.5 stroke-2.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 stroke-2.5" />
            )}
          </button>
        </div>
      </div>

      {/* Collapsible Details Section: Open PnL, Realized PnL, Leaders, and Allocation Ruler */}
      {showDetails && (
        <div className="space-y-3 pt-2 border-t border-stone-200 animate-in fade-in duration-150">
          {/* Open PnL & Realized PnL Row */}
          <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
            <div className="flex items-center gap-1.5">
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
                  {isProfit ? <ArrowUpRight className="w-3 h-3 stroke-3" /> : <ArrowDownRight className="w-3 h-3 stroke-3" />}
                  {formatBalance(totalPnL)} ({formatPercentage(totalPnLPercent)})
                </span>
              )}
            </div>

            {realizedPnL !== 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-stone-500 font-bold text-[10px] uppercase">Realize:</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded border border-stone-900 ${
                    isRealizedProfit ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'
                  }`}
                >
                  {formatBalance(realizedPnL)}
                </span>
                <InfoBadge
                  title="Realize Kâr / Zarar"
                  content="Geçmişte satışı tamamlanan işlemlerden elde edilen net nakit kâr veya zararı temsil eder."
                />
              </div>
            )}
          </div>

          {/* Best & Worst Performer Badges */}
          {portfolio.length >= 2 && !hideBalances && (() => {
            const performers = valuation.positions.map((position) => ({
              symbol: position.baseAsset,
              pnlPercent: position.pnlPercent,
              pnlAmount: position.pnlUsd,
            }));
            const sorted = [...performers].sort((a, b) => b.pnlPercent - a.pnlPercent);
            const best = sorted[0];
            const worst = sorted[sorted.length - 1];
            if (!best || !worst || best.symbol === worst.symbol) return null;

            return (
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-emerald-50 border border-stone-900 rounded shadow-hard-sm">
                  <span className="text-[9px] font-bold text-emerald-900 uppercase flex items-center gap-1">
                    <ArrowUpRight className="w-3 h-3 text-emerald-700 stroke-3" /> LİDER VARLIK
                  </span>
                  <div className="flex items-baseline justify-between mt-0.5">
                    <span className="text-xs font-black text-stone-900">{best.symbol}</span>
                    <span className="text-xs font-black text-emerald-700">
                      {best.pnlPercent >= 0 ? '+' : ''}
                      {best.pnlPercent.toFixed(1)}%
                    </span>
                  </div>
                  <span className="text-[9px] text-stone-500 font-bold block">
                    {best.pnlAmount >= 0 ? '+' : ''}
                    {formatBalance(best.pnlAmount)}
                  </span>
                </div>

                <div className="p-2 bg-rose-50 border border-stone-900 rounded shadow-hard-sm">
                  <span className="text-[9px] font-bold text-rose-900 uppercase flex items-center gap-1">
                    <ArrowDownRight className="w-3 h-3 text-rose-700 stroke-3" /> EN ÇOK GERİLEYEN
                  </span>
                  <div className="flex items-baseline justify-between mt-0.5">
                    <span className="text-xs font-black text-stone-900">{worst.symbol}</span>
                    <span
                      className={`text-xs font-black ${
                        worst.pnlPercent >= 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {worst.pnlPercent >= 0 ? '+' : ''}
                      {worst.pnlPercent.toFixed(1)}%
                    </span>
                  </div>
                  <span className="text-[9px] text-stone-500 font-bold block">
                    {worst.pnlAmount >= 0 ? '+' : ''}
                    {formatBalance(worst.pnlAmount)}
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Asset Allocation Ruler Bar */}
          {assetValues.length > 0 && totalCurrentValue > 0 && !hideBalances && (
            <div className="pt-1">
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

              {/* Asset percentage chips (top 7 by value) */}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {assetValues.slice(0, 7).map((asset, idx) => (
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
        </div>
      )}

      {/* Bottom Summary Stats & Add Button */}
      <div className="flex items-center justify-between pt-3 border-t-2 border-stone-900 mt-2">
        <div className="flex items-center gap-3 text-xs">
          <div>
            <span className="text-stone-500 block text-[9px] uppercase font-bold">Toplam Maliyet</span>
            <span className="text-stone-900 font-bold">
              {hideBalances ? '••••' : formatBalance(totalCost)}
            </span>
          </div>
          <div>
            <span className="text-stone-500 block text-[9px] uppercase font-bold">Varlık</span>
            <span className="text-stone-900 font-bold">{portfolio.length} Pozisyon</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onSmartImportClick && (
            <button
              onClick={onSmartImportClick}
              title="Binance TR veya metin ile toplu içe aktar"
              className="flex items-center gap-1 px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 active:scale-95 border-2 border-stone-900 text-stone-900 text-xs font-black rounded shadow-hard-sm btn-hard cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-amber-400 text-stone-900" />
              <span>İçe Aktar</span>
            </button>
          )}

          <button
            onClick={onAddClick}
            className="flex items-center gap-1 px-3 py-1.5 bg-amber-300 hover:bg-amber-400 active:scale-95 border-2 border-stone-900 text-stone-900 text-xs font-black rounded shadow-hard-sm btn-hard cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-3" /> Varlık Ekle
          </button>
        </div>
      </div>
    </div>
  );
};
