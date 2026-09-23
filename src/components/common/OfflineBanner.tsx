import React, { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

export const OfflineBanner: React.FC = () => {
  const { isOnline, reconnectNonce } = useNetworkStatus();
  const [dismissedNonce, setDismissedNonce] = useState(0);

  // Derived visibility: no sync setState in effects — hide runs purely from the timeout callback
  const showRestored = isOnline && reconnectNonce > 0 && reconnectNonce !== dismissedNonce;

  useEffect(() => {
    if (!showRestored) return;
    const timer = setTimeout(() => setDismissedNonce(reconnectNonce), 3500);
    return () => clearTimeout(timer);
  }, [showRestored, reconnectNonce]);

  if (!isOnline) {
    return (
      <div className="w-full bg-stone-900 text-amber-300 border-b-2 border-stone-900 px-3 py-1.5 font-mono text-[11px] flex items-center justify-between shadow-hard-sm animate-in slide-in-from-top duration-200">
        <div className="flex items-center gap-1.5 font-bold">
          <WifiOff className="w-3.5 h-3.5 text-amber-400" />
          <span>[AĞ ÇEVRİMDIŞI]</span>
        </div>
        <span className="text-[10px] text-stone-300">
          Önbellekteki son fiyatlar aktif
        </span>
      </div>
    );
  }

  if (showRestored) {
    return (
      <div className="w-full bg-emerald-700 text-white border-b-2 border-stone-900 px-3 py-1.5 font-mono text-[11px] flex items-center justify-between shadow-hard-sm animate-in slide-in-from-top duration-200">
        <div className="flex items-center gap-1.5 font-bold">
          <Wifi className="w-3.5 h-3.5 text-emerald-200" />
          <span>[BAĞLANTI YENİLENDİ]</span>
        </div>
        <span className="text-[10px] text-emerald-100">
          Canlı akış senkronize edildi
        </span>
      </div>
    );
  }

  return null;
};
