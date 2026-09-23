import React, { useEffect, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Flame } from 'lucide-react';
import { fetchAllUsdtPairs } from '../../services/binanceApi';
import type { CoinSearchResult } from '../../services/binanceApi';
import { useCryptoStore } from '../../store/useCryptoStore';
import { formatCurrency, formatPercentage } from '../../utils/formatters';

export const MarketTrendsBanner: React.FC = () => {
  const [gainers, setGainers] = useState<CoinSearchResult[]>([]);
  const [losers, setLosers] = useState<CoinSearchResult[]>([]);
  const [activeTrend, setActiveTrend] = useState<'gainers' | 'losers'>('gainers');
  const [isLoading, setIsLoading] = useState(true);

  const setSelectedCoinForChart = useCryptoStore((state) => state.setSelectedCoinForChart);
  const addToWatchlist = useCryptoStore((state) => state.addToWatchlist);

  useEffect(() => {
    let isMounted = true;

    fetchAllUsdtPairs().then((coins) => {
      if (!isMounted) return;

      // Filter coins with decent volume to avoid scam/dormant coins
      const activeCoins = coins.filter((c) => c.quoteVolume > 50000);

      // Sort by gainers
      const sortedGainers = [...activeCoins]
        .sort((a, b) => b.changePercent24h - a.changePercent24h)
        .slice(0, 6);

      // Sort by losers
      const sortedLosers = [...activeCoins]
        .sort((a, b) => a.changePercent24h - b.changePercent24h)
        .slice(0, 6);

      setGainers(sortedGainers);
      setLosers(sortedLosers);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const items = activeTrend === 'gainers' ? gainers : losers;

  const handleCardClick = (coin: CoinSearchResult) => {
    addToWatchlist(coin.symbol);
    setSelectedCoinForChart(coin.symbol);
  };

  return (
    <div className="p-2.5 bg-[#ede7d8] border-2 border-stone-900 rounded-lg shadow-hard-xs">
      {/* Header Tabs */}
      <div className="flex items-center justify-between pb-2 border-b border-stone-900/40 mb-2">
        <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-stone-900">
          <Flame className="w-3.5 h-3.5 text-amber-600" />
          <span>24S Piyasa Bülteni</span>
        </div>

        <div className="flex items-center gap-1" role="tablist" aria-label="Trend yönü">
          <button
            role="tab"
            aria-selected={activeTrend === 'gainers'}
            onClick={() => setActiveTrend('gainers')}
            className={`h-7 px-2 rounded text-[10px] font-mono font-bold border border-stone-900 btn-hard cursor-pointer ${
              activeTrend === 'gainers'
                ? 'bg-emerald-300 text-emerald-950 shadow-hard-xs'
                : 'bg-white/80 text-stone-700'
            }`}
          >
            YÜKSELENLER
          </button>
          <button
            role="tab"
            aria-selected={activeTrend === 'losers'}
            onClick={() => setActiveTrend('losers')}
            className={`h-7 px-2 rounded text-[10px] font-mono font-bold border border-stone-900 btn-hard cursor-pointer ${
              activeTrend === 'losers'
                ? 'bg-rose-300 text-rose-950 shadow-hard-xs'
                : 'bg-white/80 text-stone-700'
            }`}
          >
            DÜŞENLER
          </button>
        </div>
      </div>

      {/* Horizontal Scroll Cards */}
      {isLoading ? (
        <div className="py-4 text-center text-xs font-mono text-stone-600 animate-pulse">
          Borsa verileri taranıyor...
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 md:flex-wrap md:overflow-visible">
          {items.map((coin) => {
            const isPositive = coin.changePercent24h >= 0;
            return (
              <button
                key={coin.symbol}
                onClick={() => handleCardClick(coin)}
                className="flex-shrink-0 w-28 md:w-32 lg:w-40 p-2 bg-white border-2 border-stone-900 rounded-md shadow-hard-xs btn-hard text-left cursor-pointer transition-transform hover:-translate-y-0.5 hover:shadow-hard"
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="font-mono font-extrabold text-xs text-stone-900 truncate">
                    {coin.baseAsset}
                  </span>
                  <span
                    className={`inline-flex items-center shrink-0 text-[10px] font-mono font-black tabular-nums ${
                      isPositive ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {formatPercentage(coin.changePercent24h)}
                  </span>
                </div>
                <div className="font-mono font-bold text-xs text-stone-800 tabular-nums truncate">
                  {formatCurrency(coin.price, 'USD', 1)}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
