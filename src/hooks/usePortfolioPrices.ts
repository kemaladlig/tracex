import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useCryptoStore } from '../store/useCryptoStore';
import {
  buildPortfolioValuation,
  type PortfolioValuationSummary,
  type PriceLookup,
} from '../utils/portfolioValuation';

const CONVERSION_SYMBOLS = ['USDTTRY', 'EURUSDT', 'BTCUSDT', 'ETHUSDT', 'BNBUSDT'];

/**
 * Returns only prices needed to value the active portfolio and its quote currencies.
 * A raw ticker-map subscription would re-render the whole portfolio on every WS flush.
 */
export const usePortfolioPrices = (): Readonly<Record<string, number | undefined>> => {
  const portfolio = useCryptoStore((state) => state.portfolio);

  return useCryptoStore(
    useShallow((state) => {
      const prices: Record<string, number | undefined> = {};
      for (const symbol of [...portfolio.map((asset) => asset.symbol), ...CONVERSION_SYMBOLS]) {
        prices[symbol] = state.tickers[symbol]?.price;
      }
      return prices;
    })
  );
};

export const usePortfolioValuation = (): PortfolioValuationSummary => {
  const portfolio = useCryptoStore((state) => state.portfolio);
  const tryRate = useCryptoStore((state) => state.tryRate);
  const eurRate = useCryptoStore((state) => state.eurRate);
  const prices = usePortfolioPrices();

  return useMemo(
    () => buildPortfolioValuation(portfolio, prices, {}, { tryRate, eurRate }),
    [eurRate, portfolio, prices, tryRate]
  );
};

export const getPortfolioValuationNow = (): PortfolioValuationSummary => {
  const state = useCryptoStore.getState();
  const prices: PriceLookup = {};
  for (const symbol of new Set([...state.portfolio.map((asset) => asset.symbol), ...CONVERSION_SYMBOLS])) {
    prices[symbol] = state.tickers[symbol]?.price;
  }
  return buildPortfolioValuation(state.portfolio, prices, {}, {
    tryRate: state.tryRate,
    eurRate: state.eurRate,
  });
};
