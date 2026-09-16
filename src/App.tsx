import React, { Suspense, lazy } from 'react';
import { useCryptoStore } from './store/useCryptoStore';
import { useBinanceWebSocket } from './hooks/useBinanceWebSocket';
import { Header } from './components/common/Header';
import { BottomNav } from './components/common/BottomNav';
import { MarketList } from './components/markets/MarketList';
import { PortfolioList } from './components/portfolio/PortfolioList';
import { AnalyticsView } from './components/analytics/AnalyticsView';

// Code-split heavyweight lightweight-charts bundle (~250kb) to accelerate First Contentful Paint
const DetailChartModal = lazy(() =>
  import('./components/chart/DetailChartModal').then((m) => ({ default: m.DetailChartModal }))
);

export const App: React.FC = () => {
  // Activate continuous single combined WebSocket stream with 120ms batching & visibility pause
  useBinanceWebSocket();

  const activeTab = useCryptoStore((state) => state.activeTab);
  const selectedCoinForChart = useCryptoStore((state) => state.selectedCoinForChart);

  return (
    <div className="min-h-screen bg-[#f4f0e6] text-stone-900 flex flex-col selection:bg-amber-200">
      {/* Top Mobile Bar */}
      <Header />

      {/* Main Content View (Switchable 3 tabs) */}
      <main className="flex-1 w-full max-w-lg mx-auto flex flex-col">
        {activeTab === 'markets' && <MarketList />}
        {activeTab === 'analytics' && <AnalyticsView />}
        {activeTab === 'portfolio' && <PortfolioList />}
      </main>

      {/* Lazy-loaded Fullscreen Interactive Chart Modal */}
      {selectedCoinForChart && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#f4f0e6]/80 backdrop-blur-xs font-mono">
              <div className="w-8 h-8 border-2 border-stone-900 border-t-amber-400 rounded-full animate-spin" />
            </div>
          }
        >
          <DetailChartModal />
        </Suspense>
      )}

      {/* Mobile-First Bottom Navigation Bar */}
      <BottomNav />
    </div>
  );
};

export default App;
