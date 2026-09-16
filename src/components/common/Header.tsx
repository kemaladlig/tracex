import React from 'react';
import { Activity, Wifi, WifiOff } from 'lucide-react';
import { useCryptoStore } from '../../store/useCryptoStore';

export const Header: React.FC = () => {
  const connectionStatus = useCryptoStore((state) => state.connectionStatus);

  return (
    <header className="sticky top-0 z-30 w-full bg-[#0b0e14]/85 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 pt-safe transition-colors">
      <div className="flex items-center justify-between max-w-lg mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-500 p-[1.5px] shadow-lg shadow-indigo-500/20">
            <div className="w-full h-full bg-[#0f131a] rounded-[10px] flex items-center justify-center">
              <span className="text-base font-black tracking-tighter bg-gradient-to-br from-amber-400 to-indigo-400 bg-clip-text text-transparent">
                TX
              </span>
            </div>
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white leading-none">
              Trace<span className="text-indigo-400">X</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-medium tracking-wide">
              Kripto & Portföy
            </p>
          </div>
        </div>

        {/* Live Status Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/60 border border-slate-700/60 text-xs">
          {connectionStatus === 'connected' ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-emerald-400 font-medium text-[11px] flex items-center gap-1">
                <Activity className="w-3 h-3" /> Canlı
              </span>
            </>
          ) : connectionStatus === 'connecting' ? (
            <>
              <Wifi className="w-3 h-3 text-amber-400 animate-pulse" />
              <span className="text-amber-400 font-medium text-[11px]">Bağlanıyor</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3 text-rose-400" />
              <span className="text-rose-400 font-medium text-[11px]">Çevrimdışı</span>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
