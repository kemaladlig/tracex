import type { FC, ReactNode } from 'react';
import { Activity, BarChart3, Droplets, Gauge, TrendingUp } from 'lucide-react';
import type { MarketAnalyticsData } from '../../types/crypto';

type MarketAnalytics = MarketAnalyticsData;

interface MarketGateCardProps {
  marketGate: MarketAnalytics['marketGate'];
  macroPhase: MarketAnalytics['macroPhase'];
  technicalIndicator: MarketAnalytics['technicalIndicator'];
  marketBreadth: MarketAnalytics['marketBreadth'];
  volatilityRegime: MarketAnalytics['volatilityRegime'];
  stablecoinLiquidity: MarketAnalytics['stablecoinLiquidity'];
}

type GateTone = 'positive' | 'warning' | 'negative' | 'neutral';

const TONE_CLASSES: Record<GateTone, { border: string; text: string; dot: string }> = {
  positive: { border: 'border-emerald-500/50', text: 'text-emerald-300', dot: 'bg-emerald-400' },
  warning: { border: 'border-amber-500/50', text: 'text-amber-300', dot: 'bg-amber-300' },
  negative: { border: 'border-rose-500/50', text: 'text-rose-300', dot: 'bg-rose-400' },
  neutral: { border: 'border-stone-600', text: 'text-stone-300', dot: 'bg-stone-400' },
};

const CONFIDENCE_LABELS = {
  high: 'Yüksek güven',
  medium: 'Orta güven',
  low: 'Düşük güven',
} as const;

interface GateCheckProps {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
  tone: GateTone;
}

const GateCheck: FC<GateCheckProps> = ({ icon, label, value, detail, tone }) => {
  const classes = TONE_CLASSES[tone];
  return (
    <div className={`border bg-stone-900/80 p-2.5 ${classes.border}`}>
      <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.14em] text-stone-500">
        {icon}
        {label}
      </div>
      <p className={`mt-1.5 text-lg font-black leading-none ${classes.text}`}>{value}</p>
      <p className="mt-1 text-[8px] font-bold text-stone-400">{detail}</p>
    </div>
  );
};

export const MarketGateCard: FC<MarketGateCardProps> = ({
  marketGate,
  macroPhase,
  technicalIndicator,
  marketBreadth,
  volatilityRegime,
  stablecoinLiquidity,
}) => {
  const statusTone: GateTone =
    marketGate.status === 'open'
      ? 'positive'
      : marketGate.status === 'risk'
        ? 'negative'
        : marketGate.status === 'wait'
          ? 'warning'
          : 'warning';
  const statusClasses = TONE_CLASSES[statusTone];
  const staleSources = [marketBreadth, volatilityRegime, stablecoinLiquidity].filter((item) => item.freshness.isStale).length;
  const trendPositive = technicalIndicator.currentPrice >= technicalIndicator.sma20Price;
  const volatilityTone: GateTone =
    volatilityRegime.status === 'high'
      ? 'negative'
      : volatilityRegime.status === 'active'
        ? 'warning'
        : 'positive';
  const liquidityTone: GateTone =
    stablecoinLiquidity.status === 'expanding'
      ? 'positive'
      : stablecoinLiquidity.status === 'contracting'
        ? 'negative'
        : 'neutral';
  const liquidityChange = `${stablecoinLiquidity.change30dPercent >= 0 ? '+' : ''}${stablecoinLiquidity.change30dPercent.toFixed(2)}%`;
  const statusDescription = {
    open: 'Risk dağıtımı dengeli',
    caution: 'Onay gerektiren karma yapı',
    risk: 'Korunma modu',
    wait: 'Yeni teyit bekleniyor',
  }[marketGate.status];

  return (
    <section className="relative overflow-hidden border-2 border-stone-900 bg-stone-900 p-4 text-stone-100 shadow-hard sm:p-5">
      <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full border-[18px] border-amber-400/10" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_210px] lg:items-stretch">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-stone-400">
              <Activity className="h-3.5 w-3.5 text-amber-300" />
              [01 // Piyasa kapısı]
            </span>
            <div className="flex items-center gap-1.5">
              {staleSources > 0 && (
                <span className="rounded border border-amber-700 bg-amber-950 px-2 py-1 text-[8px] font-black uppercase text-amber-200">
                  {staleSources} kaynak gecikti
                </span>
              )}
              <span className="rounded border border-stone-700 bg-stone-800 px-2 py-1 text-[8px] font-black uppercase text-stone-300">
                Güven // {CONFIDENCE_LABELS[macroPhase.confidence]}
              </span>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-black uppercase leading-none tracking-tight text-white sm:text-2xl">
              {marketGate.label}
            </h1>
            <span className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 text-[8px] font-black uppercase ${statusClasses.border} ${statusClasses.text}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${statusClasses.dot}`} />
              {statusDescription}
            </span>
          </div>
          <p className="mt-2 max-w-3xl font-sans text-xs leading-relaxed text-stone-300 sm:text-sm">
            {marketGate.summary}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
            <GateCheck
              icon={<TrendingUp className="h-3 w-3" />}
              label="Trend"
              value={trendPositive ? 'POZİTİF' : 'BASKILI'}
              detail={trendPositive ? 'BTC 20G üstü' : 'BTC 20G altı'}
              tone={trendPositive ? 'positive' : 'negative'}
            />
            <GateCheck
              icon={<BarChart3 className="h-3 w-3" />}
              label="Pazar genişliği"
              value={`%${marketBreadth.aboveSma20Percent}`}
              detail={`${marketBreadth.sampleSize} paritede 20G üstü`}
              tone={marketBreadth.aboveSma20Percent >= 55 ? 'positive' : marketBreadth.aboveSma20Percent < 40 ? 'negative' : 'warning'}
            />
            <GateCheck
              icon={<Gauge className="h-3 w-3" />}
              label="Volatilite"
              value={`%${volatilityRegime.atrPercent.toFixed(2)}`}
              detail={volatilityRegime.label}
              tone={volatilityTone}
            />
            <GateCheck
              icon={<Droplets className="h-3 w-3" />}
              label="Likidite · 30G"
              value={liquidityChange}
              detail={stablecoinLiquidity.label}
              tone={liquidityTone}
            />
          </div>
        </div>

        <aside className="flex items-center justify-between gap-4 border-t border-stone-700 pt-3 lg:flex-col lg:justify-center lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.18em] text-stone-500">Mevcut risk</p>
            <p className="mt-1 text-3xl font-black leading-none text-stone-100">
              {macroPhase.riskScore}<span className="text-sm text-stone-500"> / 10</span>
            </p>
            <p className="mt-1 text-[8px] font-bold text-stone-500">{macroPhase.title}</p>
          </div>
          <div className="min-w-28 flex-1 lg:flex-none">
            <div className="grid grid-cols-2 gap-1.5 text-center">
              <div className="border border-emerald-800 bg-emerald-950/50 p-2">
                <p className="text-lg font-black text-emerald-300">{marketGate.positiveChecks}</p>
                <p className="text-[7px] font-black uppercase text-emerald-200/70">Açık kapı</p>
              </div>
              <div className="border border-rose-800 bg-rose-950/50 p-2">
                <p className="text-lg font-black text-rose-300">{marketGate.riskChecks}</p>
                <p className="text-[7px] font-black uppercase text-rose-200/70">Risk kapısı</p>
              </div>
            </div>
            <p className="mt-2 text-center text-[8px] font-bold text-stone-500">İşlem sinyali değil, risk kontrolü.</p>
          </div>
        </aside>
      </div>
    </section>
  );
};
