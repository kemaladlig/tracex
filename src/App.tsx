import React, { Suspense, lazy } from 'react';
import { useCryptoStore } from './store/useCryptoStore';
import { useBinanceWebSocket } from './hooks/useBinanceWebSocket';
import { Header } from './components/common/Header';
import { BottomNav } from './components/common/BottomNav';
import { OfflineBanner } from './components/common/OfflineBanner';
import { PullToRefresh } from './components/common/PullToRefresh';
import { MarketList } from './components/markets/MarketList';
import { PortfolioList } from './components/portfolio/PortfolioList';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { fetchComprehensiveAnalytics } from './services/onChainApi';

// Code-split heavyweight lightweight-charts bundle (~250kb) to accelerate First Contentful Paint
const DetailChartModal = lazy(() =>
  import('./components/chart/DetailChartModal').then((m) => ({ default: m.DetailChartModal }))
);

export const App: React.FC = () => {
  // Activate continuous single combined WebSocket stream with 120ms batching & visibility pause
  useBinanceWebSocket();

  const activeTab = useCryptoStore((state) => state.activeTab);
  const selectedCoinForChart = useCryptoStore((state) => state.selectedCoinForChart);
  const setAnalyticsData = useCryptoStore((state) => state.setAnalyticsData);

  const handlePullRefresh = async () => {
    if (activeTab === 'analytics') {
      try {
        const fresh = await fetchComprehensiveAnalytics();
        setAnalyticsData(fresh);
      } catch (err) {
        console.warn('Refresh error:', err);
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  };

  return (
    <div className="min-h-screen bg-[#f4f0e6] text-stone-900 flex flex-col selection:bg-amber-200">
      {/* Top Mobile Header */}
      <Header />

      {/* Network Disconnection / Reconnection Banner */}
      <OfflineBanner />

      {/* Main Content View with Pull-to-Refresh */}
      <PullToRefresh onRefresh={handlePullRefresh}>
        <main className="flex-1 w-full max-w-lg mx-auto flex flex-col min-h-[calc(100vh-130px)]">
          {activeTab === 'markets' && <MarketList />}
          {activeTab === 'analytics' && <AnalyticsView />}
          {activeTab === 'portfolio' && <PortfolioList />}
        </main>
      </PullToRefresh>

      {/* Lazy-loaded Fullscreen Chart Modal with Skeleton Fallback */}
      {selectedCoinForChart && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-50 flex flex-col bg-[#f4f0e6] font-mono animate-pulse p-4">
              <div className="flex justify-between items-center pb-3 border-b-2 border-stone-900 mb-3">
                <div className="h-6 w-36 bg-stone-300 rounded" />
                <div className="h-7 w-7 bg-stone-300 border border-stone-900 rounded" />
              </div>
              <div className="h-8 w-44 bg-stone-300 rounded mb-4" />
              <div className="flex-1 w-full bg-stone-200/80 border-2 border-stone-900 rounded-lg shadow-hard" />
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
