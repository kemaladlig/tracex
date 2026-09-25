import { useShallow } from 'zustand/react/shallow';
import { useCryptoStore } from '../store/useCryptoStore';

/**
 * Returns only the prices needed by the active portfolio. A raw ticker-map
 * subscription would re-render the whole portfolio/home view on every WS flush.
 */
export const usePortfolioPrices = (): Readonly<Record<string, number | undefined>> => {
  const portfolio = useCryptoStore((state) => state.portfolio);

  return useCryptoStore(
    useShallow((state) => {
      const prices: Record<string, number | undefined> = {};
      for (const asset of portfolio) {
        prices[asset.symbol] = state.tickers[asset.symbol]?.price;
      }
      return prices;
    })
  );
};
