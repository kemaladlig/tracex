import React, { useEffect, useState } from 'react';
import { useCryptoStore } from '../../store/useCryptoStore';
import { NAV_ITEMS } from './navItems';
import { triggerHaptic } from '../../utils/haptics';
import { formatCurrency, formatPercentage } from '../../utils/formatters';
import { fetchFearGreed, type FearGreedSnapshot } from '../../services/onChainApi';

export const Sidebar: React.FC = () => {
  const activeTab = useCryptoStore((state) => state.activeTab);
  const setActiveTab = useCryptoStore((state) => state.setActiveTab);
  const connectionStatus = useCryptoStore((state) => state.connectionStatus);
  // Per-symbol selector — sidebar must not re-render on every whole-map WS flush
  const btcTicker = useCryptoStore((state) => state.tickers['BTCUSDT']);
  const [fng, setFng] = useState<FearGreedSnapshot | null>(null);

  useEffect(() => {
    let alive = true;
    fetchFearGreed().then((snapshot) => {
      if (alive && snapshot) setFng(snapshot);
    });
    return () => {
      alive = false;
    };
  }, []);

  const statusText =
    connectionStatus === 'connected'
      ? 'CANLI AKIŞ'
      : connectionStatus === 'connecting'
      ? 'BAĞLANIYOR'
      : 'ÇEVRİMDIŞI';

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 z-40 h-screen w-56 flex-col bg-[#faf8f5] border-r-2 border-stone-900 font-mono select-text">
      {/* Brand Stamp */}
      <div className="px-4 py-4 border-b-2 border-stone-900">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-md bg-stone-900 text-amber-300 border-2 border-stone-900 flex items-center justify-center font-black text-sm shadow-hard-sm tracking-tighter shrink-0">
            TX
          </div>
          <div>
            <div className="font-extrabold text-stone-900 tracking-tight text-base leading-none">
              TRACEX
            </div>
            <p className="text-[9px] text-stone-600 font-bold uppercase tracking-widest mt-0.5">
              Terminal
            </p>
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 flex flex-col gap-1.5 p-3 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => {
                triggerHaptic('light');
                setActiveTab(item.id);
              }}
              className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-md border-2 text-xs font-black tracking-wider transition-all cursor-pointer ${
                isActive
                  ? 'bg-amber-300 text-stone-900 border-stone-900 shadow-hard-sm'
                  : 'bg-white/80 text-stone-600 border-transparent hover:border-stone-900/30 hover:text-stone-900'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Live Mini Widget: BTC + Fear & Greed */}
      <div className="mx-3 mb-3 p-2.5 bg-white border-2 border-stone-900 rounded-md shadow-hard-sm">
        <div className="flex items-center justify-between gap-1.5 mb-1">
          <span className="text-[9px] font-black uppercase tracking-widest text-stone-500">
            BTC/USDT
          </span>
          {btcTicker && (
            <span
              className={`text-[9px] font-black px-1 py-px rounded border border-stone-900 ${
                btcTicker.changePercent24h >= 0
                  ? 'bg-emerald-200 text-emerald-950'
                  : 'bg-rose-200 text-rose-950'
              }`}
            >
              {formatPercentage(btcTicker.changePercent24h)}
            </span>
          )}
        </div>
        <div className="text-lg font-black text-stone-900 tabular-nums leading-none tracking-tight">
          {btcTicker ? formatCurrency(btcTicker.price, 'USD', 1) : '—'}
        </div>
        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-dashed border-stone-300 text-[9px] font-black uppercase tracking-wider text-stone-500">
          <span>Korku & Açgözlülük</span>
          <span className="text-stone-900" title={fng?.classification ?? undefined}>
            {fng ? fng.value : '—'}
          </span>
        </div>
      </div>

      {/* Status Footer */}
      <div className="px-4 py-3 border-t-2 border-stone-900 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-stone-500">
        <span
          className={`w-2 h-2 rounded-full border border-stone-900 shrink-0 ${
            connectionStatus === 'connected'
              ? 'bg-emerald-500 animate-livePulse'
              : connectionStatus === 'connecting'
              ? 'bg-amber-400 animate-livePulse'
              : 'bg-rose-500'
          }`}
        />
        <span>{statusText}</span>
        <span className="ml-auto text-stone-400">[1-4]</span>
      </div>
    </aside>
  );
};
