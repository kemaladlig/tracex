import {
  BrainCircuit,
  Power,
  RefreshCw,
  Settings2,
  ShieldAlert,
  Sparkles,
  WalletCards,
} from 'lucide-react';
import type { AssistantResult, AssistantSettings } from '../../types/assistant';
import { useCryptoStore } from '../../store/useCryptoStore';
import { useWalletDisplay } from '../../hooks/useWalletDisplay';
import { formatDateTime } from '../../utils/formatters';
import { MetricTile, StatusBanner, TerminalCard } from '../common/TerminalPrimitives';
import { ACTION_META, CONFIDENCE_LABELS } from './assistantUi';

interface AssistantPanelProps {
  result: AssistantResult | null;
  settings: AssistantSettings;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  onRefresh: () => void;
  onToggleEnabled: () => void;
  onOpenProfile: () => void;
  onOpenRecommendation: (recommendationId: string) => void;
}

export const AssistantPanel = ({
  result,
  settings,
  isLoading,
  isRefreshing,
  error,
  onRefresh,
  onToggleEnabled,
  onOpenProfile,
  onOpenRecommendation,
}: AssistantPanelProps) => {
  const hideBalances = useCryptoStore((state) => state.hideBalances);
  const { formatBalance } = useWalletDisplay();
  const money = (value: number) => (hideBalances ? '••••••' : formatBalance(value));
  const topRecommendation = result?.recommendations[0];
  const activeRecommendations = result?.recommendations.filter((item) => item.action !== 'hold').slice(0, 3) ?? [];
  const visibleRecommendations = activeRecommendations.length > 0 ? activeRecommendations : result?.recommendations.slice(0, 3) ?? [];

  return (
    <TerminalCard
      eyebrow="[TX // Akıllı portföy asistanı]"
      title="Akıllı Asistan"
      icon={<BrainCircuit className="h-4 w-4" />}
      isStale={!settings.enabled || !result}
      action={
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={onToggleEnabled}
            aria-pressed={settings.enabled}
            className={`flex h-11 w-11 cursor-pointer items-center justify-center border-2 border-stone-900 shadow-hard-xs btn-hard ${
              settings.enabled ? 'bg-emerald-200 text-emerald-900' : 'bg-stone-200 text-stone-600'
            }`}
            aria-label={settings.enabled ? 'Akıllı analizi kapat' : 'Akıllı analizi aç'}
            title={settings.enabled ? 'Akıllı analizi kapat' : 'Akıllı analizi aç'}
          >
            <Power className="h-4 w-4" strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={onOpenProfile}
            className="flex h-11 w-11 cursor-pointer items-center justify-center border-2 border-stone-900 bg-white text-stone-800 shadow-hard-xs btn-hard"
            aria-label="Asistan profilini aç"
            title="Asistan profili"
          >
            <Settings2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing || !settings.enabled}
            className="flex h-11 w-11 cursor-pointer items-center justify-center border-2 border-stone-900 bg-amber-300 text-stone-950 shadow-hard-xs btn-hard disabled:cursor-wait disabled:opacity-50"
            aria-label="Asistanı yenile"
            title="Asistanı yenile"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      }
    >
      {!settings.enabled ? (
        <StatusBanner
          title="Akıllı öneriler kapalı"
          detail="Analiz kapalı. Yukarıdaki güç düğmesine basarak açabilir veya profil ayarlarını düzenleyebilirsin."
          tone="info"
        />
      ) : isLoading && !result ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="min-h-20 animate-pulse border-2 border-stone-300 bg-stone-100 p-3" />
          ))}
        </div>
      ) : result ? (
        <>
          {error && (
            <StatusBanner
              title="Son analiz tamamlanamadı"
              detail="Son başarılı yerel öneriler gösteriliyor."
              tone="warning"
              className="mb-3"
            />
          )}

          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <MetricTile
              label="Toplam sermaye (TRY)"
              value={money(result.portfolioValueUsd)}
              detail="Varlıklar + portföy dışı nakit"
              tone="neutral"
            />
            <MetricTile
              label="Eklenebilir nakit (TRY)"
              value={money(result.deployableCashUsd)}
              detail={`Stable/TL + manuel: ${money(result.cashPoolUsd)}`}
              tone={result.deployableCashUsd > 0 ? 'positive' : 'warning'}
              onClick={onOpenProfile}
              ariaLabel="Kullanılabilir nakit ayarını aç"
            />
            <MetricTile
              label="Rezerv payı"
              value={`%${result.reserveWeightPercent.toFixed(0)}`}
              detail={`Hedef %${settings.stableReservePercent}`}
              tone={result.reserveWeightPercent >= settings.stableReservePercent ? 'positive' : 'warning'}
            />
            <MetricTile
              label="Portföy riski"
              value={`${result.portfolioRiskScore}/10`}
              detail={`En büyük pozisyon %${result.largestPositionWeightPercent.toFixed(0)}`}
              tone={result.portfolioRiskScore >= 7 ? 'negative' : result.portfolioRiskScore >= 5 ? 'warning' : 'positive'}
            />
          </div>

          {result.cashPoolUsd <= 0 && (
            <div className="mt-3">
              <StatusBanner
                title="Portföyde kullanılabilir nakit yok"
                detail="Stablecoin, Türk lirası veya ayarlardaki nakit girilmeden alış tutarı önerilemez."
                tone="info"
              />
            </div>
          )}

          {topRecommendation ? (
            <section className="mt-3 grid gap-3 border-2 border-stone-900 bg-stone-950 p-3 text-stone-100 shadow-hard-sm lg:grid-cols-[minmax(0,1fr)_230px]">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.2em] text-amber-300">
                  <Sparkles className="h-3.5 w-3.5" /> En yüksek öncelikli karar
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-black uppercase text-white">{topRecommendation.baseAsset}</h3>
                  <span className="border border-amber-300 bg-amber-300 px-2 py-0.5 text-[8px] font-black uppercase text-stone-950">
                    {ACTION_META[topRecommendation.action].label}
                  </span>
                </div>
                <p className="mt-1 max-w-3xl font-sans text-xs leading-relaxed text-stone-300">
                  {topRecommendation.reasons[0] ?? ACTION_META[topRecommendation.action].description}
                </p>
                <button
                  type="button"
                  onClick={() => onOpenRecommendation(topRecommendation.id)}
                  className="mt-2 min-h-11 cursor-pointer border-2 border-amber-300 bg-amber-300 px-3 text-[10px] font-black uppercase text-stone-950 shadow-hard-xs btn-hard"
                >
                  Gerekçeyi İncele
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 border-t border-stone-700 pt-3 lg:grid-cols-1 lg:border-l lg:border-t-0 lg:pl-3 lg:pt-0">
                <div>
                  <p className="text-[8px] font-black uppercase text-stone-500">Önerilen tutar (TRY)</p>
                  <p className="mt-0.5 text-xl font-black text-amber-300">
                    {money(topRecommendation.suggestedAmountUsd)}
                  </p>
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase text-stone-500">Güven / veri</p>
                  <p className="mt-0.5 text-xs font-black text-white">
                    {CONFIDENCE_LABELS[topRecommendation.confidence]} · %{topRecommendation.dataQualityPercent}
                  </p>
                </div>
              </div>
            </section>
          ) : (
            <div className="mt-3 border-2 border-stone-900 bg-stone-100 p-3 text-center font-sans text-xs text-stone-600">
              Analiz edilecek uygun bir portföy pozisyonu bulunamadı.
            </div>
          )}

          {visibleRecommendations.length > 0 && (
            <div className="mt-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-[9px] font-black uppercase tracking-[0.18em] text-stone-500">Öneri sırası</h3>
                <span className="text-[8px] font-bold uppercase text-stone-400">AL = alış · SAT = satış önerisi</span>
              </div>
              <div className="grid gap-2 md:grid-cols-3">
                {visibleRecommendations.map((recommendation) => (
                  <button
                    key={recommendation.id}
                    type="button"
                    onClick={() => onOpenRecommendation(recommendation.id)}
                    className="flex min-h-20 cursor-pointer flex-col justify-between border-2 border-stone-900 bg-white p-2.5 text-left shadow-hard-xs btn-hard"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-xs font-black uppercase text-stone-950">{recommendation.baseAsset}</span>
                      <span className="text-[8px] font-black uppercase text-stone-500">
                        {ACTION_META[recommendation.action].shortLabel}
                      </span>
                    </span>
                    <span className="mt-2 text-sm font-black text-stone-900">
                      {recommendation.suggestedAmountUsd > 0 ? money(recommendation.suggestedAmountUsd) : 'Tutar yok'}
                    </span>
                    <span className="mt-1 text-[8px] font-bold text-stone-500">
                      Skor {recommendation.score > 0 ? '+' : ''}{recommendation.score} · Güven {recommendation.confidence}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <footer className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-dashed border-stone-300 pt-2 text-[8px] font-bold uppercase text-stone-500">
            <span className="flex items-center gap-1">
              <WalletCards className="h-3.5 w-3.5" /> yerel kasa
            </span>
            <span className="flex items-center gap-1">
              <ShieldAlert className="h-3.5 w-3.5" /> tavsiye değildir
            </span>
            <span className="ml-auto">Kurallar {result.rulesVersion} · {formatDateTime(result.updatedAt)}</span>
          </footer>
        </>
      ) : (
        <StatusBanner
          title="Asistan için portföy verisi gerekli"
          detail="En az bir varlık ekle veya akıllı içe aktarı kullan."
          tone="info"
        />
      )}
    </TerminalCard>
  );
};
