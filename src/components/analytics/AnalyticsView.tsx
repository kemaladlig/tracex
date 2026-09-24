import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { AlertTriangle, BarChart3, RefreshCw } from 'lucide-react';
import { fetchComprehensiveAnalytics } from '../../services/onChainApi';
import { useCryptoStore } from '../../store/useCryptoStore';
import { triggerHaptic } from '../../utils/haptics';
import { formatDateTime } from '../../utils/formatters';
import { MetricTile, SegmentedControl, StatusBanner, TerminalPageHeader } from '../common/TerminalPrimitives';
import type { TerminalTone } from '../common/terminalTokens';
import { AnalyticsSkeleton } from './AnalyticsSkeleton';
import { CyclePanel } from './CyclePanel';
import { DerivativesPanel } from './DerivativesPanel';
import { MarketConditionsPanel } from './MarketConditionsPanel';
import { MarketGateCard } from './MarketGateCard';
import { TechnicalPanel } from './TechnicalPanel';

const ANALYTICS_AUTO_REFRESH_MS = 60 * 60 * 1000;

type AnalyticsSection = 'cycle' | 'derivatives' | 'technical';

interface QuickSignal {
  section: AnalyticsSection;
  label: string;
  value: string;
  detail: string;
  tone: TerminalTone;
}

const SECTION_TABS: Array<{ id: AnalyticsSection; label: string }> = [
  { id: 'cycle', label: 'Döngü & duygu' },
  { id: 'derivatives', label: 'Vadeli akış' },
  { id: 'technical', label: 'Pazar & teknik' },
];

const selectSection = (section: AnalyticsSection) => {
  triggerHaptic('light');
  return section;
};

export const AnalyticsView: FC = () => {
  const analyticsData = useCryptoStore((state) => state.analyticsData);
  const setAnalyticsData = useCryptoStore((state) => state.setAnalyticsData);
  const hasCurrentAnalyticsShape = Boolean(
    analyticsData?.marketGate &&
    analyticsData.marketBreadth &&
    analyticsData.volatilityRegime &&
    analyticsData.stablecoinLiquidity
  );
  const [activeSection, setActiveSection] = useState<AnalyticsSection>('cycle');
  const [isLoading, setIsLoading] = useState(!hasCurrentAnalyticsShape);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const loadData = async (forceFresh = false) => {
    if (forceFresh) setIsRefreshing(true);
    setLoadError(false);
    try {
      const data = await fetchComprehensiveAnalytics(forceFresh);
      setAnalyticsData(data);
      setIsLoading(false);
    } catch (error) {
      console.warn('Analytics refresh failed:', error);
      setLoadError(true);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    let alive = true;
    const refreshVisible = () => {
      if (!alive || document.visibilityState !== 'visible') return;
      void fetchComprehensiveAnalytics(false)
        .then((data) => {
          if (!alive) return;
          setAnalyticsData(data);
          setLoadError(false);
        })
        .catch((error) => {
          console.warn('Analytics auto-refresh failed:', error);
          if (alive) setLoadError(true);
        });
    };

    void fetchComprehensiveAnalytics(false)
      .then((data) => {
        if (!alive) return;
        setAnalyticsData(data);
        setIsLoading(false);
      })
      .catch((error) => {
        console.warn('Analytics initial load failed:', error);
        if (alive) {
          setLoadError(true);
          setIsLoading(false);
        }
      });

    const refreshTimer = window.setInterval(refreshVisible, ANALYTICS_AUTO_REFRESH_MS);
    document.addEventListener('visibilitychange', refreshVisible);
    return () => {
      alive = false;
      window.clearInterval(refreshTimer);
      document.removeEventListener('visibilitychange', refreshVisible);
    };
  }, [setAnalyticsData]);

  if (isLoading || (!analyticsData && !loadError)) {
    return <AnalyticsSkeleton />;
  }

  if (!analyticsData || !hasCurrentAnalyticsShape) {
    return (
      <div className="px-3 pb-24 pt-6 font-mono md:px-6 lg:pb-10">
        <section className="border-2 border-stone-900 bg-white p-5 shadow-hard">
          <div className="flex items-center gap-2 text-rose-700">
            <AlertTriangle className="h-5 w-5" />
            <h1 className="text-sm font-black uppercase">Analiz verileri alınamadı</h1>
          </div>
          <p className="mt-2 font-sans text-sm text-stone-600">Bağlantını kontrol edip analiz terminalini yeniden yükle.</p>
          <button
            type="button"
            onClick={() => void loadData(true)}
            className="mt-4 min-h-11 cursor-pointer rounded border-2 border-stone-900 bg-amber-300 px-4 text-xs font-black uppercase shadow-hard-sm btn-hard"
          >
            Tekrar dene
          </button>
        </section>
      </div>
    );
  }

  const {
    meta,
    macroPhase,
    fearAndGreed,
    marketDominance,
    longShortRatio,
    fundingRate,
    mvrvRatio,
    takerVolume,
    openInterest,
    technicalIndicator,
    marketBreadth,
    volatilityRegime,
    stablecoinLiquidity,
    marketGate,
  } = analyticsData;

  const quickSignals: QuickSignal[] = [
    {
      section: 'cycle',
      label: 'Duygu',
      value: String(fearAndGreed.current),
      detail: fearAndGreed.classification,
      tone: fearAndGreed.current >= 55 ? 'positive' : fearAndGreed.current <= 45 ? 'negative' : 'neutral',
    },
    {
      section: 'cycle',
      label: 'MVRV',
      value: mvrvRatio.value.toFixed(2),
      detail: mvrvRatio.status === 'dip' ? 'Tarihî dip' : mvrvRatio.status === 'heated' ? 'Aşırı ısınma' : 'Döngü ortası',
      tone: mvrvRatio.status === 'dip' ? 'positive' : mvrvRatio.status === 'heated' ? 'negative' : 'warning',
    },
    {
      section: 'derivatives',
      label: 'Fonlama',
      value: `%${fundingRate.ratePercent}`,
      detail: fundingRate.status === 'overheated' ? 'Aşırı ısınma' : '8 saatlik',
      tone: fundingRate.status === 'overheated' ? 'negative' : 'neutral',
    },
    {
      section: 'technical',
      label: 'RSI 14',
      value: String(technicalIndicator.rsi14),
      detail: technicalIndicator.rsiStatus === 'oversold' ? 'Aşırı satım' : technicalIndicator.rsiStatus === 'overbought' ? 'Aşırı alım' : 'Nötr',
      tone: technicalIndicator.rsiStatus === 'oversold' ? 'positive' : technicalIndicator.rsiStatus === 'overbought' ? 'negative' : 'warning',
    },
  ];

  return (
    <div className="px-3 pb-24 pt-3 font-mono md:px-6 lg:pb-10">
      <TerminalPageHeader
        kicker="[TX // Market intelligence]"
        title="Analiz terminali"
        subtitle="Pazar kapısı, duygu, türev ve pazar koşulları."
        icon={<BarChart3 className="h-5 w-5" />}
        status={
          <div className="hidden text-right sm:block">
            <p className="text-[8px] font-black uppercase text-stone-400">Son tarama</p>
            <p className="text-[9px] font-bold text-stone-700">{formatDateTime(meta.updatedAt)}</p>
          </div>
        }
        action={
          <button
            type="button"
            onClick={() => void loadData(true)}
            disabled={isRefreshing}
            aria-label="Analiz verilerini yenile"
            title="Verileri yenile"
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded border-2 border-stone-900 bg-amber-300 shadow-hard-sm btn-hard disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 text-stone-950 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        }
      />

      {loadError && (
        <StatusBanner
          title="Son yenileme tamamlanamadı"
          detail="Görünen önbellek değerleri kullanılıyor."
          tone="error"
          className="mb-3"
        />
      )}

      {meta.isPartiallyStale && (
        <StatusBanner
          title={`${meta.staleSections.length} kaynak gecikti`}
          detail={`${meta.staleSections.join(' · ')} — ilgili kartlar soluk gösteriliyor.`}
          className="mb-3"
        />
      )}

      <MarketGateCard
        marketGate={marketGate}
        macroPhase={macroPhase}
        technicalIndicator={technicalIndicator}
        marketBreadth={marketBreadth}
        volatilityRegime={volatilityRegime}
        stablecoinLiquidity={stablecoinLiquidity}
      />

      <section className="mt-4" aria-labelledby="quick-scan-title">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 id="quick-scan-title" className="text-[9px] font-black uppercase tracking-[0.18em] text-stone-500">Hızlı tarama</h2>
          <span className="text-[8px] font-bold uppercase text-stone-400">Detaya git</span>
        </div>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {quickSignals.map((signal) => (
            <MetricTile
              key={signal.label}
              label={signal.label}
              value={signal.value}
              detail={signal.detail}
              tone={signal.tone}
              onClick={() => setActiveSection(selectSection(signal.section))}
              ariaLabel={`${signal.label} detayını aç`}
            />
          ))}
        </div>
      </section>

      <SegmentedControl
        ariaLabel="Analiz bölümleri"
        idPrefix="analytics-section"
        options={SECTION_TABS}
        activeId={activeSection}
        onChange={(section) => setActiveSection(selectSection(section))}
        className="mt-4"
      />

      <div
        key={activeSection}
        id={`analytics-section-${activeSection}-panel`}
        role="tabpanel"
        aria-labelledby={`analytics-section-${activeSection}`}
        className="mt-4 animate-tabEnter"
      >
        {activeSection === 'cycle' && (
          <CyclePanel fearAndGreed={fearAndGreed} marketDominance={marketDominance} mvrvRatio={mvrvRatio} />
        )}
        {activeSection === 'derivatives' && (
          <DerivativesPanel
            longShortRatio={longShortRatio}
            fundingRate={fundingRate}
            takerVolume={takerVolume}
            openInterest={openInterest}
          />
        )}
        {activeSection === 'technical' && (
          <div className="grid gap-4">
            <TechnicalPanel technicalIndicator={technicalIndicator} />
            <MarketConditionsPanel
              marketBreadth={marketBreadth}
              volatilityRegime={volatilityRegime}
              stablecoinLiquidity={stablecoinLiquidity}
            />
          </div>
        )}
      </div>

      <footer className="mt-4 border-2 border-stone-900 bg-white px-3 py-2.5 font-sans text-[10px] leading-relaxed text-stone-600 shadow-hard-xs">
        Bu ekran bilgilendirme amaçlıdır; yatırım tavsiyesi değildir. On-chain ve vadeli göstergeler gecikmeli ya da önbellekten gelebilir.
      </footer>
    </div>
  );
};
