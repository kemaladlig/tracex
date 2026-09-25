import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AssistantResult } from '../types/assistant';
import { fetchComprehensiveAnalytics } from '../services/onChainApi';
import { buildAssistantSnapshots, getAssistantAnalysisSymbol } from '../services/assistant/marketData';
import { buildAssistantResult } from '../services/assistant/recommendationEngine';
import { useAssistantStore, DEFAULT_ASSISTANT_SETTINGS } from '../store/useAssistantStore';
import { useCryptoStore } from '../store/useCryptoStore';
import { getPortfolioValuationNow } from './usePortfolioPrices';
import type { PriceLookup } from '../utils/portfolioValuation';

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export interface SmartAssistantState {
  result: AssistantResult | null;
  settings: typeof DEFAULT_ASSISTANT_SETTINGS;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const useSmartAssistant = (groupId: string): SmartAssistantState => {
  const portfolio = useCryptoStore((state) => state.portfolio);
  const settings = useAssistantStore(
    (state) => state.profilesByGroup[groupId] ?? DEFAULT_ASSISTANT_SETTINGS
  );
  const setAnalyticsData = useCryptoStore((state) => state.setAnalyticsData);
  const addLogEntries = useAssistantStore((state) => state.addLogEntries);
  const [result, setResult] = useState<AssistantResult | null>(null);
  const [isLoading, setIsLoading] = useState(settings.enabled && portfolio.length > 0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const runIdRef = useRef(0);

  const portfolioSignature = useMemo(
    () =>
      portfolio
        .map((asset) => `${asset.id}:${asset.symbol}:${asset.amount}:${asset.buyPrice}:${asset.costBasisUsd ?? 0}`)
        .sort()
        .join('|'),
    [portfolio]
  );
  const settingsSignature = [
    settings.enabled,
    settings.riskProfile,
    settings.horizon,
    settings.availableCashUsd,
    settings.monthlyContributionUsd,
    settings.maxAssetPercent,
    settings.maxAltPercent,
    settings.stableReservePercent,
    settings.riskPerIdeaPercent,
    settings.dcaTranches,
    settings.minimumTradeUsd,
  ].join('|');

  const runAnalysis = useCallback(
    async (forceFresh = false) => {
      const runId = ++runIdRef.current;
      const state = useCryptoStore.getState();
      if (state.activeGroupId !== groupId || state.portfolio.length === 0) {
        setResult(null);
        setIsLoading(false);
        return;
      }

      if (forceFresh) setIsRefreshing(true);
      else setIsLoading(true);
      setError(null);

      const prices: PriceLookup = {};
      const quoteVolumes: Record<string, number> = {};
      for (const asset of state.portfolio) {
        const symbol = asset.symbol;
        const analysisSymbol = getAssistantAnalysisSymbol(asset.symbol);
        prices[symbol] = state.tickers[symbol]?.price;
        prices[analysisSymbol] = state.tickers[analysisSymbol]?.price;
        quoteVolumes[symbol] = state.tickers[symbol]?.quoteVolume ?? 0;
        quoteVolumes[analysisSymbol] = state.tickers[analysisSymbol]?.quoteVolume ?? 0;
      }
      prices.USDTTRY = state.tickers.USDTTRY?.price ?? state.tryRate;
      prices.EURUSDT = state.tickers.EURUSDT?.price ?? state.eurRate;
      prices.BTCUSDT = state.tickers.BTCUSDT?.price;
      prices.ETHUSDT = state.tickers.ETHUSDT?.price;
      prices.BNBUSDT = state.tickers.BNBUSDT?.price;

      try {
        const [analytics, snapshots] = await Promise.all([
          fetchComprehensiveAnalytics(forceFresh).then((data) => {
            if (useCryptoStore.getState().activeGroupId === groupId) setAnalyticsData(data);
            return data;
          }),
          buildAssistantSnapshots({
            portfolio: state.portfolio,
            prices,
            quoteVolumes,
            rates: { tryRate: state.tryRate, eurRate: state.eurRate },
            forceFresh,
          }),
        ]);

        if (runId !== runIdRef.current || useCryptoStore.getState().activeGroupId !== groupId) return;
        const valuation = getPortfolioValuationNow();
        const currentSettings = useAssistantStore.getState().profilesByGroup[groupId] ?? DEFAULT_ASSISTANT_SETTINGS;
        const nextResult = buildAssistantResult({
          groupId,
          snapshots,
          holdingsValueUsd: valuation.totalValueUsd,
          stableValueUsd: valuation.stableValueUsd,
          availableCashUsd: currentSettings.availableCashUsd,
          settings: currentSettings,
          marketAnalytics: analytics,
          updatedAt: Date.now(),
        });

        setResult(nextResult);
        addLogEntries(
          groupId,
          nextResult.recommendations
            .filter((recommendation) => recommendation.action !== 'hold' && recommendation.suggestedAmountUsd > 0)
            .map((recommendation) => ({
              id: recommendation.id,
              groupId,
              symbol: recommendation.symbol,
              action: recommendation.action,
              score: recommendation.score,
              amountUsd: recommendation.suggestedAmountUsd,
              priceUsd: recommendation.currentPriceUsd,
              reasons: recommendation.reasons,
              createdAt: nextResult.updatedAt,
            }))
        );
      } catch (caught) {
        if (runId !== runIdRef.current) return;
        console.warn('Smart assistant analysis failed:', caught);
        setError('Asistan verileri analiz edemedi. Önbellekli öneriler gösteriliyor.');
      } finally {
        if (runId === runIdRef.current && useCryptoStore.getState().activeGroupId === groupId) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [addLogEntries, groupId, setAnalyticsData]
  );

  useEffect(() => {
    if (!settings.enabled || portfolio.length === 0) {
      runIdRef.current += 1;
      return;
    }

    let alive = true;
    const initial = () => {
      if (alive) void runAnalysis(false);
    };
    initial();

    const interval = window.setInterval(() => {
      if (alive && !document.hidden) void runAnalysis(false);
    }, REFRESH_INTERVAL_MS);
    const handleVisibility = () => {
      if (alive && !document.hidden) void runAnalysis(false);
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      alive = false;
      runIdRef.current += 1;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [portfolio.length, portfolioSignature, runAnalysis, settings.enabled, settingsSignature]);

  const assistantEnabled = settings.enabled && portfolio.length > 0;
  const resultForGroup = result?.groupId === groupId ? result : null;

  return {
    result: assistantEnabled ? resultForGroup : null,
    settings,
    isLoading: assistantEnabled && (isLoading || resultForGroup === null),
    isRefreshing: assistantEnabled && isRefreshing,
    error: assistantEnabled ? error : null,
    refresh: () => runAnalysis(true),
  };
};
