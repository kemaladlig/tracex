import type { MarketAnalyticsData } from './crypto';
import type { PortfolioPositionValuation } from '../utils/portfolioValuation';

export type AssistantRiskProfile = 'conservative' | 'balanced' | 'aggressive';
export type AssistantHorizon = 'short' | 'medium' | 'long';
export type AssistantAction = 'hold' | 'accumulate' | 'reduce' | 'rebalance' | 'avoid';
export type AssistantConfidence = 'low' | 'medium' | 'high';

export interface AssistantSettings {
  enabled: boolean;
  riskProfile: AssistantRiskProfile;
  horizon: AssistantHorizon;
  availableCashUsd: number;
  monthlyContributionUsd: number;
  maxAssetPercent: number;
  maxAltPercent: number;
  stableReservePercent: number;
  riskPerIdeaPercent: number;
  dcaTranches: number;
  minimumTradeUsd: number;
}

export interface RiskPreset {
  maxAssetPercent: number;
  maxAltPercent: number;
  stableReservePercent: number;
  riskPerIdeaPercent: number;
}

export interface TechnicalFeatures {
  symbol: string;
  currentPriceUsd: number;
  dailyReturn30Percent: number | null;
  relativeStrength30Percent: number | null;
  rsi14: number | null;
  ema20: number | null;
  ema50: number | null;
  sma200: number | null;
  atrPercent: number | null;
  macdHistogram: number | null;
  supportPriceUsd: number | null;
  resistancePriceUsd: number | null;
  volumeRatio20: number | null;
  maximumDrawdown30Percent: number | null;
  candleCount: number;
  lastUpdated: number;
  isFresh: boolean;
}

export interface AssetAssistantSnapshot {
  position: PortfolioPositionValuation;
  quoteVolume24hUsd: number;
  technical: TechnicalFeatures | null;
}

export interface DcaTranche {
  index: number;
  amountUsd: number;
  tokenAmount: number;
  condition: string;
}

export interface AssistantRecommendation {
  id: string;
  symbol: string;
  baseAsset: string;
  action: AssistantAction;
  score: number;
  confidence: AssistantConfidence;
  horizon: AssistantHorizon;
  currentPriceUsd: number;
  currentValueUsd: number;
  currentWeightPercent: number;
  targetWeightPercent: number;
  suggestedAmountUsd: number;
  suggestedTokenAmount: number;
  estimatedRiskUsd: number;
  entryLowUsd: number;
  entryHighUsd: number;
  invalidationPriceUsd: number;
  reasons: string[];
  risks: string[];
  dcaTranches: DcaTranche[];
  dataQualityPercent: number;
  updatedAt: number;
}

export interface AssistantResult {
  groupId: string;
  portfolioValueUsd: number;
  availableCashUsd: number;
  cashPoolUsd: number;
  deployableCashUsd: number;
  monthlyContributionUsd: number;
  investableCapitalUsd: number;
  portfolioRiskScore: number;
  reserveWeightPercent: number;
  largestPositionWeightPercent: number;
  marketStatus: MarketAnalyticsData['marketGate']['status'] | 'loading';
  recommendations: AssistantRecommendation[];
  updatedAt: number;
  rulesVersion: string;
}

export interface RecommendationLogEntry {
  id: string;
  groupId: string;
  symbol: string;
  action: AssistantAction;
  score: number;
  amountUsd: number;
  priceUsd: number;
  reasons: string[];
  createdAt: number;
}
