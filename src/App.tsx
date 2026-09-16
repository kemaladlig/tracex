import React from 'react';
import { useCryptoStore } from './store/useCryptoStore';
import { useBinanceWebSocket } from './hooks/useBinanceWebSocket';
import { Header } from './components/common/Header';
import { BottomNav } from './components/common/BottomNav';
import { MarketList } from './components/markets/MarketList';
import { PortfolioList } from './components/portfolio/PortfolioList';
import { DetailChartModal } from './components/chart/DetailChartModal';

export const App: React.FC = () => {
  // Activate continuous single combined WebSocket stream for all symbols
  useBinanceWebSocket();

  const activeTab = useCryptoStore((state) => state.activeTab);
  const selectedCoinForChart = useCryptoStore((state) => state.selectedCoinForChart);

  return (
    <div className="min-h-screen bg-[#0b0e14] text-slate-100 flex flex-col selection:bg-indigo-500/30">
      {/* Top Mobile Bar */}
      <Header />

      {/* Main Content View (Switchable tabs) */}
      <main className="flex-1 w-full max-w-lg mx-auto flex flex-col">
        {activeTab === 'markets' ? <MarketList /> : <PortfolioList />}
      </main>

      {/* Fullscreen / Modal Interactive Chart */}
      {selectedCoinForChart && <DetailChartModal />}

      {/* Mobile-First Bottom Navigation Bar */}
      <BottomNav />
    </div>
  );
};

export default App;
