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
// Static import: AnalyticsView has no heavy deps (no lightweight-charts),
// so bundling it avoids the "Failed to fetch dynamically imported module"
// recovery-mode crash seen with lazy() on dev/Vite + stale chunks.
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { fetchComprehensiveAnalytics } from './services/onChainApi';

// Code-split ONLY the heavyweight lightweight-charts bundle (~250kb) to accelerate First Contentful Paint.
// On a stale-chunk / transient network failure, reload once (fresh HTML points at
// the new chunk filenames) instead of surfacing the recovery screen immediately.
const DetailChartModal = lazy(() => {
  const retryKey = 'tracex-chart-retry';
  return import('./components/chart/DetailChartModal').then(
    (m) => {
      sessionStorage.removeItem(retryKey);
      return { default: m.DetailChartModal };
    },
    (err: Error) => {
      const isChunkError =
        err?.message?.includes('Failed to fetch dynamically imported module') ||
        err?.message?.includes('Importing a module script failed');
      if (isChunkError && sessionStorage.getItem(retryKey) !== '1') {
        sessionStorage.setItem(retryKey, '1');
        window.location.reload();
        // Return a never-resolving promise while the reload happens.
        return new Promise<{ default: React.ComponentType }>(() => {});
      }
      throw err;
    }
  );
});

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
  const [refreshNonce, setRefreshNonce] = useState(0);

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
    } else if (activeTab === 'home' || activeTab === 'markets') {
      setRefreshNonce((nonce) => nonce + 1);
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
            className="flex-1 w-full max-w-lg md:max-w-none 2xl:max-w-400 mx-auto flex flex-col touch-pan-y"
          >
            <div
              key={activeTab}
              className={`w-full flex flex-col flex-1 ${
                slideDirection === 'left' ? 'animate-slide-left' : 'animate-slide-right'
              }`}
            >
              {activeTab === 'home' && <HomeDashboardView refreshNonce={refreshNonce} />}
              {activeTab === 'markets' && <MarketList refreshNonce={refreshNonce} />}
              {activeTab === 'analytics' && <AnalyticsView />}
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
