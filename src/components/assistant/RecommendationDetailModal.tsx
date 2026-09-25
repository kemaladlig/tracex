import {
  BarChart3,
  BrainCircuit,
  CircleAlert,
  Gauge,
  Layers3,
  ShieldCheck,
  Target,
} from 'lucide-react';
import type { AssistantRecommendation } from '../../types/assistant';
import { useCryptoStore } from '../../store/useCryptoStore';
import { formatNumber } from '../../utils/formatters';
import { useWalletDisplay } from '../../hooks/useWalletDisplay';
import { Modal } from '../common/Modal';
import { TERMINAL_TONE_CLASSES } from '../common/terminalTokens';
import { ACTION_META, CONFIDENCE_LABELS } from './assistantUi';

interface RecommendationDetailModalProps {
  recommendation: AssistantRecommendation | null;
  isOpen: boolean;
  onClose: () => void;
}

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <div className="border border-stone-300 bg-stone-50 p-2.5">
    <p className="text-[8px] font-black uppercase tracking-wide text-stone-500">{label}</p>
    <p className="mt-1 text-xs font-black text-stone-950">{value}</p>
  </div>
);

export const RecommendationDetailModal = ({
  recommendation,
  isOpen,
  onClose,
}: RecommendationDetailModalProps) => {
  const hideBalances = useCryptoStore((state) => state.hideBalances);
  const setSelectedCoinForChart = useCryptoStore((state) => state.setSelectedCoinForChart);
  const { formatBalance, formatUsd } = useWalletDisplay();

  if (!recommendation) return null;
  const action = ACTION_META[recommendation.action];
  const tone = TERMINAL_TONE_CLASSES[action.tone];
  const balance = (value: number, decimals?: number) =>
    hideBalances ? '••••••' : formatBalance(value, decimals);
  const usd = (value: number, decimals?: number) =>
    hideBalances ? '••••••' : formatUsd(value, decimals);

  const openChart = () => {
    setSelectedCoinForChart(recommendation.symbol);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      variant="centered"
      title={
        <span className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center border-2 border-stone-900 bg-amber-300 shadow-hard-xs">
            <BrainCircuit className="h-4 w-4" />
          </span>
          {recommendation.baseAsset} // AKILLI ÖNERİ
        </span>
      }
      subtitle={`${action.label} · Skor ${recommendation.score} · ${CONFIDENCE_LABELS[recommendation.confidence]}`}
    >
      <div className="min-h-0 flex-1 overflow-y-auto p-4 font-mono">
        <section className={`border-2 p-3 shadow-hard-xs ${tone}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.18em] opacity-70">Öneri</p>
              <h3 className="mt-1 text-lg font-black uppercase">{action.label}</h3>
              <p className="mt-1 max-w-xl font-sans text-xs leading-relaxed text-stone-700">
                {action.description}
              </p>
            </div>
            <div className="border-2 border-stone-900 bg-white px-3 py-2 text-center shadow-hard-xs">
              <p className="text-[8px] font-black uppercase text-stone-500">Veri uyumu</p>
              <p className="text-xl font-black text-stone-950">%{recommendation.dataQualityPercent}</p>
            </div>
          </div>
        </section>

        <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
          <DetailRow label="Önerilen tutar (TRY)" value={balance(recommendation.suggestedAmountUsd)} />
          <DetailRow
            label="Token miktarı"
            value={
              hideBalances
                ? '••••••'
                : `${formatNumber(recommendation.suggestedTokenAmount, 8)} ${recommendation.baseAsset}`
            }
          />
          <DetailRow label="Tahmini risk (TRY)" value={balance(recommendation.estimatedRiskUsd)} />
          <DetailRow
            label="Portföy payı"
            value={`%${recommendation.currentWeightPercent.toFixed(1)} → %${recommendation.targetWeightPercent.toFixed(1)}`}
          />
        </div>

        <section className="mt-3 border-2 border-stone-900 bg-white p-3 shadow-hard-xs">
          <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wide text-stone-700">
            <Target className="h-4 w-4" /> Fiyat Planı
          </h3>
          <div className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-4">
            <DetailRow label="Mevcut fiyat (USD)" value={usd(recommendation.currentPriceUsd)} />
            <DetailRow
              label="İzleme aralığı (USD)"
              value={`${usd(recommendation.entryLowUsd)} – ${usd(recommendation.entryHighUsd)}`}
            />
            <DetailRow label="Geçersizleşme (USD)" value={usd(recommendation.invalidationPriceUsd)} />
            <DetailRow label="Yatırım ufku" value={recommendation.horizon.toUpperCase()} />
          </div>
        </section>

        {recommendation.dcaTranches.length > 0 && (
          <section className="mt-3 border-2 border-stone-900 bg-white p-3 shadow-hard-xs">
            <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wide text-stone-700">
              <Layers3 className="h-4 w-4" /> Kademeli Plan
            </h3>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {recommendation.dcaTranches.map((tranche) => (
                <div key={tranche.index} className="flex items-center justify-between gap-2 border border-stone-300 bg-stone-50 p-2.5">
                  <div>
                    <p className="text-[8px] font-black uppercase text-stone-500">Dilim {tranche.index}</p>
                    <p className="text-[9px] font-bold text-stone-700">{tranche.condition}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-stone-950">{balance(tranche.amountUsd)}</p>
                    <p className="text-[8px] font-bold text-stone-500">
                      {hideBalances ? '••••' : formatNumber(tranche.tokenAmount, 8)} {recommendation.baseAsset}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <section className="border-2 border-emerald-700 bg-emerald-50 p-3">
            <h3 className="flex items-center gap-2 text-[10px] font-black uppercase text-emerald-900">
              <ShieldCheck className="h-4 w-4" /> Nedenleri
            </h3>
            <ul className="mt-2 space-y-1.5 font-sans text-[11px] leading-relaxed text-emerald-950">
              {recommendation.reasons.map((reason) => (
                <li key={reason} className="border-l-2 border-emerald-600 pl-2">{reason}</li>
              ))}
            </ul>
          </section>
          <section className="border-2 border-amber-700 bg-amber-50 p-3">
            <h3 className="flex items-center gap-2 text-[10px] font-black uppercase text-amber-900">
              <CircleAlert className="h-4 w-4" /> Riskler
            </h3>
            <ul className="mt-2 space-y-1.5 font-sans text-[11px] leading-relaxed text-amber-950">
              {recommendation.risks.length > 0 ? (
                recommendation.risks.map((risk) => (
                  <li key={risk} className="border-l-2 border-amber-600 pl-2">{risk}</li>
                ))
              ) : (
                <li className="border-l-2 border-amber-600 pl-2">Kurallar belirgin bir ek risk işaretlemiyor.</li>
              )}
            </ul>
          </section>
        </div>

        <div className="mt-3 flex items-center gap-2 border-2 border-stone-900 bg-stone-100 p-2.5 text-[9px] font-bold text-stone-600">
          <Gauge className="h-4 w-4 shrink-0 text-stone-800" />
          Bu ekran yalnızca öneri üretir; emir göndermez ve borsa hesabına bağlanmaz.
        </div>
      </div>

      <div className="flex gap-2 border-t-2 border-stone-900 bg-white p-3">
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 flex-1 cursor-pointer border-2 border-stone-900 bg-stone-100 px-3 text-xs font-black uppercase text-stone-700 shadow-hard-xs btn-hard"
        >
          Kapat
        </button>
        <button
          type="button"
          onClick={openChart}
          className="flex min-h-11 flex-[1.4] cursor-pointer items-center justify-center gap-2 border-2 border-stone-900 bg-amber-300 px-3 text-xs font-black uppercase text-stone-950 shadow-hard btn-hard"
        >
          <BarChart3 className="h-4 w-4" /> Grafiği Aç
        </button>
      </div>
    </Modal>
  );
};
