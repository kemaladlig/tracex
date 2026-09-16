import React, { useState, useMemo } from 'react';
import { ArrowUpDown, Coins, Plus } from 'lucide-react';
import { useCryptoStore } from '../../store/useCryptoStore';
import { PortfolioSummary } from './PortfolioSummary';
import { PortfolioItem } from './PortfolioItem';
import { AddAssetModal } from './AddAssetModal';

type SortOption = 'value' | 'pnl' | 'name';

export const PortfolioList: React.FC = () => {
  const portfolio = useCryptoStore((state) => state.portfolio);
  const tickers = useCryptoStore((state) => state.tickers);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('value');

  // Sorted assets
  const sortedPortfolio = useMemo(() => {
    const list = [...portfolio];
    if (sortBy === 'name') {
      return list.sort((a, b) => a.symbol.localeCompare(b.symbol));
    }
    if (sortBy === 'value') {
      return list.sort((a, b) => {
        const valA = a.amount * (tickers[a.symbol]?.price ?? a.buyPrice);
        const valB = b.amount * (tickers[b.symbol]?.price ?? b.buyPrice);
        return valB - valA;
      });
    }
    if (sortBy === 'pnl') {
      return list.sort((a, b) => {
        const pnlA = a.amount * ((tickers[a.symbol]?.price ?? a.buyPrice) - a.buyPrice);
        const pnlB = b.amount * ((tickers[b.symbol]?.price ?? b.buyPrice) - b.buyPrice);
        return pnlB - pnlA;
      });
    }
    return list;
  }, [portfolio, tickers, sortBy]);

  return (
    <div className="flex flex-col pb-24 px-4 max-w-lg mx-auto w-full">
      {/* Portfolio Top PnL Summary */}
      <div className="mt-3.5">
        <PortfolioSummary onAddClick={() => setIsAddModalOpen(true)} />
      </div>

      {/* Assets List Section Header & Sorter */}
      <div className="flex items-center justify-between px-1 mb-2.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          <Coins className="w-3.5 h-3.5 text-indigo-400" />
          <span>Varlıklarım ({portfolio.length})</span>
        </div>

        {portfolio.length > 1 && (
          <div className="flex items-center gap-1">
            <ArrowUpDown className="w-3 h-3 text-slate-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-slate-900 border border-slate-800 text-[11px] text-slate-300 rounded-lg px-1.5 py-0.5 focus:outline-none focus:border-indigo-500"
            >
              <option value="value">Değere Göre</option>
              <option value="pnl">Kâr/Zarara Göre</option>
              <option value="name">İsme Göre</option>
            </select>
          </div>
        )}
      </div>

      {/* Assets Items */}
      {sortedPortfolio.length > 0 ? (
        <div className="flex flex-col">
          {sortedPortfolio.map((asset) => (
            <PortfolioItem key={asset.id} asset={asset} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 px-4 rounded-2xl bg-slate-900/40 border border-slate-800/60 mt-2">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-3">
            <Coins className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">Henüz Varlık Eklenmedi</h3>
          <p className="text-xs text-slate-400 mb-4 max-w-xs mx-auto">
            Portföyünüzü ve anlık kâr/zarar durumunuzu takip etmek için ilk kripto varlığınızı ekleyin.
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition active:scale-95"
          >
            <Plus className="w-4 h-4" /> Varlık Ekle
          </button>
        </div>
      )}

      {/* Add Modal */}
      <AddAssetModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
};
