import { BrainCircuit } from 'lucide-react';
import type { AssistantRecommendation } from '../../types/assistant';
import { useWalletDisplay } from '../../hooks/useWalletDisplay';
import { ACTION_META } from './assistantUi';

interface RecommendationBadgeProps {
  recommendation: AssistantRecommendation;
  hideBalances: boolean;
  onClick: () => void;
}

export const RecommendationBadge = ({
  recommendation,
  hideBalances,
  onClick,
}: RecommendationBadgeProps) => {
  const meta = ACTION_META[recommendation.action];
  const { formatBalance, formatUsd } = useWalletDisplay();
  const amount = recommendation.suggestedAmountUsd;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`mb-2 flex w-full cursor-pointer items-center justify-between gap-2 border-2 border-stone-900 px-2.5 py-2 text-left shadow-hard-xs btn-hard ${
        meta.tone === 'positive'
          ? 'bg-emerald-100'
          : meta.tone === 'negative'
            ? 'bg-rose-100'
            : meta.tone === 'warning'
              ? 'bg-amber-100'
              : 'bg-stone-100'
      }`}
      aria-label={`${recommendation.baseAsset} için ${meta.label} önerisini aç`}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <BrainCircuit className="h-3.5 w-3.5 shrink-0 text-stone-800" />
        <span className="text-[9px] font-black uppercase text-stone-900">{meta.shortLabel}</span>
        <span className="truncate text-[8px] font-bold text-stone-500">
          Skor {recommendation.score > 0 ? '+' : ''}{recommendation.score}
        </span>
      </span>
      {amount > 0 && (
        <span className="shrink-0 text-right">
          <span className="block text-[9px] font-black text-stone-950">
            {hideBalances ? '••••' : formatBalance(amount)}
          </span>
          <span className="block text-[8px] font-bold text-stone-500">
            {hideBalances ? '••' : formatUsd(amount)}
          </span>
        </span>
      )}
    </button>
  );
};
