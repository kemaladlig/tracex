import React, { useState, useMemo } from 'react';
import { ArrowUpDown, Coins, Plus, Zap } from 'lucide-react';
import type { PortfolioAsset } from '../../types/crypto';
import { useCryptoStore } from '../../store/useCryptoStore';
import { PortfolioSummary } from './PortfolioSummary';
import { PortfolioGroupSwitcher } from './PortfolioGroupSwitcher';
import { PortfolioItem } from './PortfolioItem';
import { AddAssetModal } from './AddAssetModal';
import { SellAssetModal } from './SellAssetModal';
import { SmartImportModal } from './SmartImportModal';

type SortOption = 'value' | 'pnl' | 'name';

export const PortfolioList: React.FC = () => {
  const portfolio = useCryptoStore((state) => state.portfolio);
  const tickers = useCryptoStore((state) => state.tickers);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSmartImportOpen, setIsSmartImportOpen] = useState(false);
  const [selectedSymbolForBuy, setSelectedSymbolForBuy] = useState<string>('');
  const [assetToSell, setAssetToSell] = useState<PortfolioAsset | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('value');

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

  const handleBuyMore = (symbol: string) => {
    setSelectedSymbolForBuy(symbol);
    setIsAddModalOpen(true);
  };

  const handleOpenAdd = () => {
    setSelectedSymbolForBuy('');
    setIsAddModalOpen(true);
  };

  return (
    <div className="flex flex-col pb-28 px-4 max-w-lg mx-auto w-full font-mono">
      {/* Multi-Portfolio Group Tabs & Backup Toolbar */}
      <div className="mt-3 stagger-item" style={{ '--stagger-idx': 0 } as React.CSSProperties}>
        <PortfolioGroupSwitcher />
      </div>

      {/* Portfolio Top PnL Summary */}
      <div className="stagger-item" style={{ '--stagger-idx': 1 } as React.CSSProperties}>
        <PortfolioSummary
          onAddClick={handleOpenAdd}
          onSmartImportClick={() => setIsSmartImportOpen(true)}
        />
      </div>

      {/* Assets List Section Header & Sorter */}
      <div
        className="flex items-center justify-between px-1 mb-2.5 stagger-item"
        style={{ '--stagger-idx': 2 } as React.CSSProperties}
      >
        <div className="flex items-center gap-1.5 text-xs font-black text-stone-900 uppercase tracking-wider">
          <Coins className="w-3.5 h-3.5" />
          <span>VARLIKLARIM ({portfolio.length})</span>
        </div>

        {portfolio.length > 1 && (
          <div className="flex items-center gap-1 bg-white border-2 border-stone-900 px-2 py-0.5 rounded shadow-hard-sm">
            <ArrowUpDown className="w-3 h-3 text-stone-600" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-transparent text-[10px] font-bold text-stone-900 focus:outline-none cursor-pointer"
            >
              <option value="value">DEĞERE GÖRE</option>
              <option value="pnl">K/Z GÖRE</option>
              <option value="name">İSME GÖRE</option>
            </select>
          </div>
        )}
      </div>

      {/* Assets Items */}
      {sortedPortfolio.length > 0 ? (
        <div className="flex flex-col">
          {sortedPortfolio.map((asset, idx) => (
            <PortfolioItem
              key={asset.id}
              asset={asset}
              index={3 + idx}
              onBuyMoreClick={handleBuyMore}
              onSellClick={(item) => setAssetToSell(item)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-10 px-4 rounded-lg bg-white border-2 border-dashed border-stone-900/60 shadow-hard-sm mt-2">
          <div className="w-12 h-12 rounded-md bg-amber-200 border-2 border-stone-900 text-stone-900 flex items-center justify-center mx-auto mb-3 shadow-hard-sm">
            <Coins className="w-6 h-6 stroke-[2.5]" />
          </div>
          <h3 className="text-sm font-black text-stone-900 mb-1">HENÜZ VARLIK BULUNMUYOR</h3>
          <p className="text-xs text-stone-600 mb-4 max-w-xs mx-auto">
            Portföyünüzü ve anlık kâr/zarar durumunuzu takip etmek için ilk varlığınızı ekleyin veya borsa listenizi yapıştırın.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => setIsSmartImportOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-stone-100 hover:bg-stone-200 border-2 border-stone-900 text-stone-900 text-xs font-black rounded shadow-hard-sm btn-hard cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-amber-400 text-stone-900" /> Akıllı İçe Aktar
            </button>
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-300 border-2 border-stone-900 text-stone-900 text-xs font-black rounded shadow-hard-sm btn-hard cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" /> Tek Varlık Ekle
            </button>
          </div>
        </div>
      )}

      {/* Add Modal */}
      <AddAssetModal
        isOpen={isAddModalOpen}
        initialSymbol={selectedSymbolForBuy}
        onClose={() => {
          setIsAddModalOpen(false);
          setSelectedSymbolForBuy('');
        }}
      />

      {/* Smart Import Modal */}
      <SmartImportModal
        isOpen={isSmartImportOpen}
        onClose={() => setIsSmartImportOpen(false)}
      />

      {/* Sell Modal */}
      <SellAssetModal
        asset={assetToSell}
        isOpen={!!assetToSell}
        onClose={() => setAssetToSell(null)}
      />
    </div>
  );
};
