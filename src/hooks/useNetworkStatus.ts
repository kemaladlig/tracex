import { useState, useEffect, useRef } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  /** Increments on every offline→online reconnect event (0 until first reconnect). */
  reconnectNonce: number;
}

export const useNetworkStatus = (): NetworkStatus => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [reconnectNonce, setReconnectNonce] = useState<number>(0);
  const wasOfflineRef = useRef<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Only count a reconnect after a real offline event (spurious 'online' pings are ignored)
      if (wasOfflineRef.current) {
        wasOfflineRef.current = false;
        setReconnectNonce((n) => n + 1);
      }
    };

    const handleOffline = () => {
      wasOfflineRef.current = true;
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, reconnectNonce };
};
