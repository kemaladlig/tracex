import React, { Suspense, lazy, useRef, useState, useEffect } from 'react';
import { useCryptoStore } from './store/useCryptoStore';
import { useBinanceWebSocket } from './hooks/useBinanceWebSocket';
import { useSwipeNavigation } from './hooks/useSwipeNavigation';
import { useDynamicPwaTitle } from './hooks/useDynamicPwaTitle';
import { useTabHotkeys } from './hooks/useTabHotkeys';
import { Header } from './components/common/Header';
import { BottomNav } from './components/common/BottomNav';
import { Sidebar } from './components/common/Sidebar';
import { OfflineBanner } from './components/common/OfflineBanner';
import { PullToRefresh } from './components/common/PullToRefresh';
import { MarketList } from './components/markets/MarketList';
import { PortfolioList } from './components/portfolio/PortfolioList';
import { HomeDashboardView } from './components/home/HomeDashboardView';
import { fetchComprehensiveAnalytics } from './services/onChainApi';

// Code-split heavyweight lightweight-charts bundle (~250kb) to accelerate First Contentful Paint
const DetailChartModal = lazy(() =>
  import('./components/chart/DetailChartModal').then((m) => ({ default: m.DetailChartModal }))
);

// Analytics bento is heavy too — pull it into its own chunk, fetched only when the tab opens
const AnalyticsView = lazy(() =>
  import('./components/analytics/AnalyticsView').then((m) => ({ default: m.AnalyticsView }))
);

import type { TabType } from './types/crypto';

const TABS: TabType[] = ['home', 'markets', 'analytics', 'portfolio'];

export const App: React.FC = () => {
  // Activate continuous single combined WebSocket stream with 120ms batching & visibility pause
  useBinanceWebSocket();

  // Activate dynamic live BTC price title and PWA Badging
  useDynamicPwaTitle();

  // Desktop: keys 1-4 switch tabs
  useTabHotkeys();

  const mainContainerRef = useRef<HTMLElement | null>(null);
  // Activate smooth horizontal swipe gestures between tabs
  useSwipeNavigation(mainContainerRef);

  const activeTab = useCryptoStore((state) => state.activeTab);
  const prevTabRef = useRef<TabType>(activeTab);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('left');

  useEffect(() => {
    const prevIdx = TABS.indexOf(prevTabRef.current);
    const currIdx = TABS.indexOf(activeTab);
    if (currIdx !== prevIdx) {
      setSlideDirection(currIdx >= prevIdx ? 'left' : 'right');
      prevTabRef.current = activeTab;
    }
  }, [activeTab]);

  const selectedCoinForChart = useCryptoStore((state) => state.selectedCoinForChart);
  const setAnalyticsData = useCryptoStore((state) => state.setAnalyticsData);

  const handlePullRefresh = async () => {
    if (activeTab === 'analytics') {
      try {
        const fresh = await fetchComprehensiveAnalytics(true);
        setAnalyticsData(fresh);
      } catch (err) {
        console.warn('Refresh error:', err);
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  };

  return (
    <div className="min-h-screen bg-[#f4f0e6] text-stone-900 flex flex-col lg:flex-row selection:bg-amber-200">
      {/* Desktop Left Sidebar (≥1024px) */}
      <Sidebar />

      {/* Content Column */}
      <div className="flex-1 min-w-0 flex flex-col lg:pl-56">
        {/* Top Header */}
        <Header />

        {/* Network Disconnection / Reconnection Banner */}
        <OfflineBanner />

        {/* Main Content View with Pull-to-Refresh & Swipe Navigation */}
        <PullToRefresh onRefresh={handlePullRefresh}>
          <main
            ref={mainContainerRef}
            className="flex-1 w-full max-w-lg md:max-w-none 2xl:max-w-[1600px] mx-auto flex flex-col touch-pan-y"
          >
            <div
              key={activeTab}
              className={`w-full flex flex-col flex-1 ${
                slideDirection === 'left' ? 'animate-slide-left' : 'animate-slide-right'
              }`}
            >
              {activeTab === 'home' && <HomeDashboardView />}
              {activeTab === 'markets' && <MarketList />}
              {activeTab === 'analytics' && (
                <Suspense
                  fallback={
                    <div className="p-10 flex justify-center font-mono">
                      <div className="w-6 h-6 border-2 border-stone-900 border-t-amber-400 rounded-full animate-spin" />
                    </div>
                  }
                >
                  <AnalyticsView />
                </Suspense>
              )}
              {activeTab === 'portfolio' && <PortfolioList />}
            </div>
          </main>
        </PullToRefresh>
      </div>

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

      {/* Mobile Bottom Navigation Bar (<1024px) */}
      <BottomNav />
    </div>
  );
};

export default App;
