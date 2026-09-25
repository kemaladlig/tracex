import React, { useState, useMemo, useCallback, Suspense, lazy } from 'react';
import { ArrowUpDown, Coins, Plus, Zap } from 'lucide-react';
import type { PortfolioAsset } from '../../types/crypto';
import { useCryptoStore } from '../../store/useCryptoStore';
import { usePortfolioPrices } from '../../hooks/usePortfolioPrices';
import { PortfolioSummary } from './PortfolioSummary';
import { PortfolioGroupSwitcher } from './PortfolioGroupSwitcher';
import { PortfolioItem } from './PortfolioItem';

// Portfolio dialogs are heavy — load their chunks only when the user actually opens them
const AddAssetModal = lazy(() =>
  import('./AddAssetModal').then((m) => ({ default: m.AddAssetModal }))
);
const SellAssetModal = lazy(() =>
  import('./SellAssetModal').then((m) => ({ default: m.SellAssetModal }))
);
const SmartImportModal = lazy(() =>
  import('./SmartImportModal').then((m) => ({ default: m.SmartImportModal }))
);

type SortOption = 'value' | 'pnl' | 'name';

export const PortfolioList: React.FC = () => {
  const portfolio = useCryptoStore((state) => state.portfolio);
  const portfolioPrices = usePortfolioPrices();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSmartImportOpen, setIsSmartImportOpen] = useState(false);
  const [selectedSymbolForBuy, setSelectedSymbolForBuy] = useState<string>('');
  const [assetToSell, setAssetToSell] = useState<PortfolioAsset | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('value');

  const [showDetails, setShowDetails] = useState<boolean>(() => {
    try {
      return localStorage.getItem('tracex-portfolio-details') === 'true';
    } catch {
      return false;
    }
  });

  const toggleDetails = () => {
    setShowDetails((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('tracex-portfolio-details', String(next));
      } catch {}
      return next;
    });
  };

  const sortedPortfolio = useMemo(() => {
    const list = [...portfolio];
    if (sortBy === 'name') {
      return list.sort((a, b) => a.symbol.localeCompare(b.symbol));
    }
    if (sortBy === 'value') {
      return list.sort((a, b) => {
        const valA = a.amount * (portfolioPrices[a.symbol] ?? a.buyPrice);
        const valB = b.amount * (portfolioPrices[b.symbol] ?? b.buyPrice);
        return valB - valA;
      });
    }
    if (sortBy === 'pnl') {
      return list.sort((a, b) => {
        const pnlA = a.amount * ((portfolioPrices[a.symbol] ?? a.buyPrice) - a.buyPrice);
        const pnlB = b.amount * ((portfolioPrices[b.symbol] ?? b.buyPrice) - b.buyPrice);
        return pnlB - pnlA;
      });
    }
    return list;
  }, [portfolio, portfolioPrices, sortBy]);

  // Stable identities so React.memo on PortfolioItem survives every WS flush re-render
  const handleBuyMore = useCallback((symbol: string) => {
    setSelectedSymbolForBuy(symbol);
    setIsAddModalOpen(true);
  }, []);

  const handleOpenAdd = useCallback(() => {
    setSelectedSymbolForBuy('');
    setIsAddModalOpen(true);
  }, []);

  const handleSell = useCallback((item: PortfolioAsset) => setAssetToSell(item), []);

  const handleAddClose = useCallback(() => {
    setIsAddModalOpen(false);
    setSelectedSymbolForBuy('');
  }, []);

  const handleSmartImportClose = useCallback(() => setIsSmartImportOpen(false), []);
  const handleSellClose = useCallback(() => setAssetToSell(null), []);

  return (
    <div className="flex flex-col pb-36 lg:pb-10 px-4 md:px-6 w-full font-mono">
      {/* Multi-Portfolio Group Tabs & Backup Toolbar */}
      <div className="mt-3 stagger-item" style={{ '--stagger-idx': 0 } as React.CSSProperties}>
        <PortfolioGroupSwitcher />
      </div>

      {/* Desktop: sticky summary beside the asset grid */}
      <div className="lg:flex lg:items-start lg:gap-4">
        {/* Portfolio Top PnL Summary */}
        <div
          className="stagger-item lg:w-80 lg:shrink-0 lg:sticky lg:top-17.5"
          style={{ '--stagger-idx': 1 } as React.CSSProperties}
        >
          <PortfolioSummary
            onAddClick={handleOpenAdd}
            onSmartImportClick={() => setIsSmartImportOpen(true)}
            showDetails={showDetails}
            onToggleDetails={toggleDetails}
          />
        </div>

        {/* Assets List Section */}
        <div className="flex-1 min-w-0">
          {/* Assets List Section Header & Sorter */}
          <div
            className="flex items-center justify-between px-1 mb-2.5 mt-4 lg:mt-0 stagger-item"
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 content-start">
              {sortedPortfolio.map((asset, idx) => (
                <PortfolioItem
                  key={asset.id}
                  asset={asset}
                  index={3 + idx}
                  showPnL={showDetails}
                  onBuyMoreClick={handleBuyMore}
                  onSellClick={handleSell}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-10 px-4 rounded-lg bg-white border-2 border-dashed border-stone-900/60 shadow-hard-sm mt-2">
              <div className="w-12 h-12 rounded-md bg-amber-200 border-2 border-stone-900 text-stone-900 flex items-center justify-center mx-auto mb-3 shadow-hard-sm">
                <Coins className="w-6 h-6 stroke-2.5" />
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
                  <Plus className="w-4 h-4 stroke-3" /> Tek Varlık Ekle
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Modal — mounted (and chunk fetched) only while open */}
      {isAddModalOpen && (
        <Suspense fallback={null}>
          <AddAssetModal
            isOpen
            initialSymbol={selectedSymbolForBuy}
            onClose={handleAddClose}
          />
        </Suspense>
      )}

      {/* Smart Import Modal */}
      {isSmartImportOpen && (
        <Suspense fallback={null}>
          <SmartImportModal isOpen onClose={handleSmartImportClose} />
        </Suspense>
      )}

      {/* Sell Modal */}
      {assetToSell && (
        <Suspense fallback={null}>
          <SellAssetModal asset={assetToSell} isOpen onClose={handleSellClose} />
        </Suspense>
      )}
    </div>
  );
};
