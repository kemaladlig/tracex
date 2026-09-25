import type { MarketAnalyticsData } from '../../types/crypto';
import type {
  AssetAssistantSnapshot,
  AssistantAction,
  AssistantConfidence,
  AssistantRecommendation,
  AssistantResult,
  AssistantSettings,
  DcaTranche,
} from '../../types/assistant';
import { clamp } from '../../utils/technicalIndicators';
import { getTechnicalFeatureScore } from './marketData';

export const ASSISTANT_RULES_VERSION = 'tracex-rules-v1.0.0';

export interface BuildAssistantResultInput {
  groupId: string;
  snapshots: readonly AssetAssistantSnapshot[];
  holdingsValueUsd: number;
  stableValueUsd: number;
  availableCashUsd: number;
  settings: AssistantSettings;
  marketAnalytics: MarketAnalyticsData | null;
  updatedAt: number;
}

interface MarketScore {
  score: number;
  reasons: string[];
  risks: string[];
}

const getMarketScore = (analytics: MarketAnalyticsData): MarketScore => {
  let score = 0;
  const reasons: string[] = [];
  const risks: string[] = [];

  if (analytics.marketGate.status === 'open') {
    score += 20;
    reasons.push('Pazar kapısı trend, genişlik ve likidite birlikte olumlu.');
  } else if (analytics.marketGate.status === 'risk') {
    score -= 30;
    risks.push('Pazar kapısı yüksek risk bölgesinde.');
  } else if (analytics.marketGate.status === 'wait') {
    score -= 12;
    risks.push('Yeni yön için piyasa teyidi bekleniyor.');
  }

  if (analytics.marketBreadth.aboveSma20Percent >= 55) {
    score += 8;
    reasons.push(`Pazar genişliği güçlü: %${analytics.marketBreadth.aboveSma20Percent} 20G üstünde.`);
  } else if (analytics.marketBreadth.aboveSma20Percent < 40) {
    score -= 10;
    risks.push(`Pazar genişliği zayıf: yalnızca %${analytics.marketBreadth.aboveSma20Percent} 20G üstünde.`);
  }

  if (analytics.stablecoinLiquidity.change30dPercent > 0.5) {
    score += 6;
    reasons.push('Stablecoin arzı son 30 günde genişliyor.');
  } else if (analytics.stablecoinLiquidity.change30dPercent < -0.5) {
    score -= 8;
    risks.push('Stablecoin arzı son 30 günde daralıyor.');
  }

  if (analytics.volatilityRegime.status === 'high') {
    score -= 15;
    risks.push('Günlük ATR yüksek risk rejiminde.');
  } else if (analytics.volatilityRegime.status === 'active') {
    score -= 6;
  } else if (analytics.volatilityRegime.status === 'calm') {
    score += 4;
  }

  if (analytics.fearAndGreed.current <= 25) {
    score += 5;
    reasons.push('Aşırı korku, uzun vadeli birikim alanı olarak izleniyor.');
  } else if (analytics.fearAndGreed.current >= 75) {
    score -= 10;
    risks.push('Aşırı coşku ve crowding riski yüksek.');
  }

  if (analytics.mvrvRatio.status === 'dip') {
    score += 6;
    reasons.push('Bitcoin MVRV tarihî dip bölgesinde.');
  } else if (analytics.mvrvRatio.status === 'heated') {
    score -= 10;
    risks.push('Bitcoin MVRV aşırı ısınma bölgesinde.');
  }

  if (analytics.fundingRate.status === 'overheated') {
    score -= 10;
    risks.push('Fonlama oranı aşırı ısınmış.');
  } else if (analytics.takerVolume.ratio >= 1.08) {
    score += 5;
    reasons.push('Taker akışı alıcı tarafında.');
  } else if (analytics.takerVolume.ratio <= 0.92) {
    score -= 6;
    risks.push('Taker akışı satıcı tarafında.');
  }

  if (analytics.marketDominance.btcD > 58) {
    score -= 3;
    risks.push('BTC hakimiyeti yüksek; altcoin katılımı baskılanabilir.');
  } else if (analytics.marketDominance.btcD < 48) {
    score += 4;
    reasons.push('BTC hakimiyeti gerileyerek serbest kripto risk iştahına alan açıyor.');
  }

  return { score: Math.round(score), reasons, risks };
};

const targetWeightFor = (
  snapshot: AssetAssistantSnapshot,
  settings: AssistantSettings,
  nonStableCount: number
): number => {
  const { baseAsset } = snapshot.position;
  if (baseAsset === 'BTC') return clamp(settings.maxAssetPercent, 25, 50);
  if (baseAsset === 'ETH') return Math.min(30, settings.maxAssetPercent);

  const altTarget = settings.maxAltPercent / Math.max(1, nonStableCount - 2);
  return clamp(altTarget, 3, Math.min(15, settings.maxAssetPercent));
};

const actionPriority: Record<AssistantAction, number> = {
  reduce: 5,
  rebalance: 4,
  accumulate: 3,
  avoid: 2,
  hold: 1,
};

const confidenceFrom = (dataQuality: number, scoreAbs: number): AssistantConfidence => {
  if (dataQuality >= 78 && scoreAbs >= 42) return 'high';
  if (dataQuality >= 52 && scoreAbs >= 28) return 'medium';
  return 'low';
};

const getLiquidityCap = (
  capitalUsd: number,
  quoteVolume24hUsd: number
): number => {
  if (quoteVolume24hUsd <= 0) return 0;
  const participationRate = capitalUsd >= 100_000 ? 0.0005 : capitalUsd >= 25_000 ? 0.001 : capitalUsd >= 1_000 ? 0.002 : 0.004;
  return quoteVolume24hUsd * participationRate;
};

const getDynamicMinimumTrade = (capitalUsd: number, configuredMinimum: number): number => {
  const portfolioMinimum = capitalUsd < 1_000 ? capitalUsd * 0.05 : capitalUsd < 25_000 ? capitalUsd * 0.01 : capitalUsd * 0.001;
  return Math.max(1, configuredMinimum, portfolioMinimum);
};

const makeDcaTranches = (
  amountUsd: number,
  priceUsd: number,
  configuredTranches: number,
  volatilityPercent: number | null,
  capitalUsd: number
): DcaTranche[] => {
  const extra = (capitalUsd >= 25_000 ? 1 : 0) + ((volatilityPercent ?? 0) > 6 ? 1 : 0);
  const count = Math.min(6, Math.max(2, Math.round(configuredTranches + extra)));
  const baseAmount = amountUsd / count;

  return Array.from({ length: count }, (_, index) => {
    const trancheAmount = index === count - 1
      ? Math.max(0, amountUsd - baseAmount * (count - 1))
      : baseAmount;
    return {
      index: index + 1,
      amountUsd: Number(trancheAmount.toFixed(2)),
      tokenAmount: priceUsd > 0 ? Number((trancheAmount / priceUsd).toFixed(8)) : 0,
      condition: index === 0 ? 'Mevcut bölgede ilk dilim' : `Teyit veya daha iyi fiyat · dilim ${index + 1}`,
    };
  });
};

const getActionLabel = (action: AssistantAction): string => {
  switch (action) {
    case 'accumulate':
      return 'Alış';
    case 'reduce':
      return 'Kısmi satış';
    case 'rebalance':
      return 'Kısmi satış';
    case 'avoid':
      return 'Yeni alım yapma';
    default:
      return 'Bekle';
  }
};

export const buildAssistantResult = ({
  groupId,
  snapshots,
  holdingsValueUsd,
  stableValueUsd,
  availableCashUsd,
  settings,
  marketAnalytics,
  updatedAt,
}: BuildAssistantResultInput): AssistantResult => {
  const capitalUsd = Math.max(0, holdingsValueUsd + availableCashUsd);
  const cashPoolUsd = Math.max(0, stableValueUsd + availableCashUsd);
  const reserveWeightPercent = capitalUsd > 0 ? (cashPoolUsd / capitalUsd) * 100 : 0;
  const largestPositionWeightPercent = capitalUsd > 0
    ? Math.max(0, ...snapshots.map((snapshot) => (snapshot.position.currentValueUsd / capitalUsd) * 100))
    : 0;
  const marketScore = marketAnalytics ? getMarketScore(marketAnalytics) : null;
  const nonStableCount = snapshots.length;

  let portfolioRiskScore = marketAnalytics?.macroPhase.riskScore ?? 5;
  if (largestPositionWeightPercent > settings.maxAssetPercent) {
    portfolioRiskScore += Math.min(3, (largestPositionWeightPercent - settings.maxAssetPercent) / 10);
  }
  if (reserveWeightPercent < settings.stableReservePercent) {
    portfolioRiskScore += Math.min(2, (settings.stableReservePercent - reserveWeightPercent) / 10);
  }
  if (marketAnalytics?.volatilityRegime.status === 'high') portfolioRiskScore += 1;
  portfolioRiskScore = Math.round(clamp(portfolioRiskScore, 1, 10));

  const targetReserveValue = (capitalUsd * settings.stableReservePercent) / 100;
  const reserveGapUsd = Math.max(0, targetReserveValue - cashPoolUsd);
  const deployableCashUsd = Math.max(0, cashPoolUsd - reserveGapUsd);
  const minimumTradeUsd = getDynamicMinimumTrade(capitalUsd, settings.minimumTradeUsd);

  const recommendations = snapshots.map<AssistantRecommendation>((snapshot) => {
    const { position, technical, quoteVolume24hUsd } = snapshot;
    const currentPriceUsd = position.currentUnitPriceUsd || technical?.currentPriceUsd || 0;
    const currentWeightPercent = capitalUsd > 0 ? (position.currentValueUsd / capitalUsd) * 100 : 0;
    const targetWeightPercent = targetWeightFor(snapshot, settings, nonStableCount);
    const technicalScore = technical ? getTechnicalFeatureScore(technical) : 0;
    const allocationGapWeight = targetWeightPercent - currentWeightPercent;
    const allocationScore = clamp(allocationGapWeight * 2.5, -45, 45);
    const rawCombinedScore = technicalScore * 0.55 + (marketScore?.score ?? 0) * 0.3 + allocationScore * 0.15;
    const score = Math.round(clamp(rawCombinedScore, -100, 100));

    let dataQualityPercent = 20;
    if (technical && technical.candleCount >= 60) dataQualityPercent += 35;
    if (technical?.isFresh) dataQualityPercent += 10;
    if (quoteVolume24hUsd > 0) dataQualityPercent += 10;
    if (marketAnalytics && !marketAnalytics.meta.isPartiallyStale) dataQualityPercent += 25;
    else if (marketAnalytics) dataQualityPercent += 12;
    if (currentPriceUsd > 0) dataQualityPercent += 5;
    dataQualityPercent = Math.min(100, dataQualityPercent);

    const reasons: string[] = [];
    const risks: string[] = [];
    if (technical) {
      if (technical.ema20 !== null && currentPriceUsd >= technical.ema20) reasons.push('Fiyat günlük EMA20 üzerinde.');
      if (technical.ema50 !== null && currentPriceUsd >= technical.ema50) reasons.push('EMA50 trendi korunuyor.');
      if (technical.rsi14 !== null && technical.rsi14 >= 45 && technical.rsi14 <= 65) {
        reasons.push(`RSI ${technical.rsi14} ile momentum dengede.`);
      }
      if (technical.rsi14 !== null && technical.rsi14 >= 72) risks.push(`RSI ${technical.rsi14}; kısa vadeli alım yorgunluğu riski.`);
      if (technical.relativeStrength30Percent !== null && technical.relativeStrength30Percent > 5) {
        reasons.push(`BTC'ye göre 30G güçlü: %${technical.relativeStrength30Percent.toFixed(1)}.`);
      }
      if (technical.relativeStrength30Percent !== null && technical.relativeStrength30Percent < -5) {
        risks.push(`BTC'ye göre 30G zayıf: %${technical.relativeStrength30Percent.toFixed(1)}.`);
      }
      if (technical.atrPercent !== null && technical.atrPercent > 6) {
        risks.push(`Günlük ATR %${technical.atrPercent.toFixed(1)}; pozisyon boyutu küçültülmeli.`);
      }
    } else {
      risks.push('Varlık için yeterli günlük grafik verisi alınamadı.');
    }
    reasons.push(...(marketScore?.reasons.slice(0, 2) ?? []));
    risks.push(...(marketScore?.risks.slice(0, 2) ?? []));
    if (currentWeightPercent > settings.maxAssetPercent) {
      risks.push(`Tek varlık payı %${currentWeightPercent.toFixed(1)}; sınır %${settings.maxAssetPercent}.`);
    }
    if (quoteVolume24hUsd <= 0) risks.push('24 saatlik hacim verisi yok; likidite kuralı uygulanamıyor.');

    let action: AssistantAction = 'hold';
    const marketBlocksNewRisk = marketAnalytics?.marketGate.status === 'risk' && position.baseAsset !== 'BTC';
    const signalsConflict =
      technical !== null && marketScore !== null && technicalScore >= 28 && marketScore.score <= -20;
    const isOverweight = currentWeightPercent > settings.maxAssetPercent + 3;

    if (!settings.enabled) action = 'hold';
    else if (!technical || !technical.isFresh || !marketAnalytics) action = 'hold';
    else if (isOverweight) action = 'rebalance';
    else if (signalsConflict) action = 'hold';
    else if (score >= 32) action = marketBlocksNewRisk ? 'hold' : 'accumulate';
    else if (score <= -32) action = 'reduce';
    else if (score <= -20 && technicalScore <= -18) action = 'avoid';
    else action = 'hold';

    const volatilityPercent = technical?.atrPercent ?? null;
    const invalidationDistance = clamp(Math.max((volatilityPercent ?? 3) * 1.5, 3.5), 3.5, 18) / 100;
    const invalidationPriceUsd = currentPriceUsd > 0 ? currentPriceUsd * (1 - invalidationDistance) : 0;
    const entryPaddingPercent = clamp((volatilityPercent ?? 3) * 0.35, 0.8, 3) / 100;
    const entryLowUsd = currentPriceUsd * (1 - entryPaddingPercent);
    const entryHighUsd = currentPriceUsd * (1 + entryPaddingPercent);
    const liquidityCapUsd = getLiquidityCap(capitalUsd, quoteVolume24hUsd);
    const targetGapUsd = Math.max(0, (capitalUsd * targetWeightPercent) / 100 - position.currentValueUsd);
    const riskBudgetUsd = (capitalUsd * settings.riskPerIdeaPercent) / 100;
    const riskCappedAmountUsd = invalidationDistance > 0 ? riskBudgetUsd / invalidationDistance : 0;

    let suggestedAmountUsd = 0;
    if (action === 'accumulate') {
      suggestedAmountUsd = Math.max(
        0,
        Math.min(
          deployableCashUsd,
          targetGapUsd,
          riskCappedAmountUsd,
          liquidityCapUsd,
          (capitalUsd * settings.maxAssetPercent) / 100 - position.currentValueUsd
        )
      );
      if (suggestedAmountUsd < minimumTradeUsd) {
        action = 'hold';
        suggestedAmountUsd = 0;
        reasons.push('Önerilen tutar uygulanabilir minimum seviyenin altında.');
      }
    } else if (action === 'reduce') {
      const signalPortion = clamp(Math.abs(score) / 130, 0.2, 0.45);
      suggestedAmountUsd = Math.min(position.currentValueUsd * signalPortion, liquidityCapUsd);
    } else if (action === 'rebalance') {
      const excessValue = Math.max(0, position.currentValueUsd - (capitalUsd * targetWeightPercent) / 100);
      suggestedAmountUsd = Math.min(excessValue * 0.5, liquidityCapUsd);
    }

    if (
      (action === 'reduce' || action === 'rebalance') &&
      suggestedAmountUsd < minimumTradeUsd
    ) {
      action = 'hold';
      suggestedAmountUsd = 0;
      reasons.push('Önerilen azaltım tutarı uygulanabilir minimum seviyenin altında.');
    }

    suggestedAmountUsd = Number(Math.max(0, suggestedAmountUsd).toFixed(2));
    const suggestedTokenAmount = currentPriceUsd > 0
      ? Number((suggestedAmountUsd / currentPriceUsd).toFixed(8))
      : 0;
    const estimatedRiskUsd = Number((suggestedAmountUsd * invalidationDistance).toFixed(2));
    const dcaTranches = action === 'accumulate'
      ? makeDcaTranches(
          suggestedAmountUsd,
          currentPriceUsd,
          settings.dcaTranches,
          volatilityPercent,
          capitalUsd
        )
      : [];

    if (action === 'hold' && risks.length === 0) reasons.push('Sinyaller henüz tek yönlü değil.');
    if (action === 'accumulate') reasons.unshift(`${getActionLabel(action)} için önerilen toplam ${suggestedAmountUsd.toFixed(2)} USD.`);
    if (action === 'reduce' || action === 'rebalance') {
      reasons.unshift(`${getActionLabel(action)} için ${suggestedAmountUsd.toFixed(2)} USD değerlendirilebilir.`);
    }

    return {
      id: `${groupId}:${position.asset.symbol}:${action}:${Math.floor(updatedAt / 300_000)}`,
      symbol: position.asset.symbol,
      baseAsset: position.baseAsset,
      action,
      score,
      confidence: confidenceFrom(dataQualityPercent, Math.abs(score)),
      horizon: settings.horizon,
      currentPriceUsd,
      currentValueUsd: position.currentValueUsd,
      currentWeightPercent,
      targetWeightPercent,
      suggestedAmountUsd,
      suggestedTokenAmount,
      estimatedRiskUsd,
      entryLowUsd,
      entryHighUsd,
      invalidationPriceUsd,
      reasons: reasons.slice(0, 4),
      risks: risks.slice(0, 4),
      dcaTranches,
      dataQualityPercent,
      updatedAt,
    };
  });

  recommendations.sort((a, b) => {
    const priority = actionPriority[b.action] - actionPriority[a.action];
    return priority !== 0 ? priority : Math.abs(b.score) - Math.abs(a.score);
  });

  return {
    groupId,
    portfolioValueUsd: capitalUsd,
    availableCashUsd,
    cashPoolUsd,
    deployableCashUsd,
    monthlyContributionUsd: Math.max(0, settings.monthlyContributionUsd),
    investableCapitalUsd: Math.max(0, capitalUsd - reserveGapUsd),
    portfolioRiskScore,
    reserveWeightPercent,
    largestPositionWeightPercent,
    marketStatus: marketAnalytics?.marketGate.status ?? 'loading',
    recommendations,
    updatedAt,
    rulesVersion: ASSISTANT_RULES_VERSION,
  };
};
