import { useCallback } from 'react';
import { useCryptoStore } from '../store/useCryptoStore';
import { formatCurrency } from '../utils/formatters';

export interface WalletDisplay {
  /** Holdings, balances, costs and recommendation amounts are shown in TRY. */
  formatBalance: (value: number, decimals?: number) => string;
  /** Individual crypto prices and technical levels are always shown in USD. */
  formatUsd: (value: number, decimals?: number) => string;
}

export const useWalletDisplay = (): WalletDisplay => {
  const tryRate = useCryptoStore((state) => state.tryRate);

  const formatBalance = useCallback(
    (value: number, decimals?: number) => formatCurrency(value, 'TRY', tryRate, decimals),
    [tryRate]
  );
  const formatUsd = useCallback(
    (value: number, decimals?: number) => formatCurrency(value, 'USD', 1, decimals),
    []
  );

  return { formatBalance, formatUsd };
};
