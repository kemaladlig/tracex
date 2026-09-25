import type { FC, ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BrainCircuit,
  CalendarClock,
  CheckCircle2,
  Gauge,
  ShieldAlert,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import type { MarketAnalyticsData } from '../../types/crypto';

type MarketData = MarketAnalyticsData;
type Tone = 'positive' | 'warning' | 'negative' | 'neutral';
type Horizon = 'short' | 'mid' | 'long';

interface HorizonPlan {
  horizon: Horizon;
  label: string;
  timeframe: string;
  stance: string;
  action: string;
  reason: string;
  trigger: string;
  tone: Tone;
}

interface DecisionBriefProps {
  data: MarketData;
}

const TONE_CLASSES: Record<Tone, { card: string; label: string; icon: string }> = {
  positive: {
    card: 'border-emerald-500 bg-emerald-50',
    label: 'bg-emerald-200 text-emerald-950',
    icon: 'text-emerald-700',
  },
  warning: {
    card: 'border-amber-500 bg-amber-50',
    label: 'bg-amber-200 text-amber-950',
    icon: 'text-amber-700',
  },
  negative: {
    card: 'border-rose-500 bg-rose-50',
    label: 'bg-rose-200 text-rose-950',
    icon: 'text-rose-700',
  },
  neutral: {
    card: 'border-stone-400 bg-stone-50',
    label: 'bg-stone-200 text-stone-900',
    icon: 'text-stone-600',
  },
};

const percent = (value: number): string => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;

const horizonMeta: Record<Horizon, { label: string; timeframe: string; icon: typeof Gauge }> = {
  short: { label: 'Kısa vade', timeframe: 'Saatler / 1-3 gün', icon: Gauge },
  mid: { label: 'Orta vade', timeframe: '1-4 hafta', icon: CalendarClock },
  long: { label: 'Uzun vade', timeframe: '1-12 ay', icon: Target },
};

const isRiskEnvironment = (data: MarketData): boolean =>
  data.marketGate.status === 'risk' ||
  data.volatilityRegime.status === 'high' ||
  data.marketBreadth.aboveSma20Percent < 35;

const buildPlans = (data: MarketData): HorizonPlan[] => {
  const { technicalIndicator, takerVolume, marketGate, marketBreadth, stablecoinLiquidity, mvrvRatio, fearAndGreed, macroPhase } = data;
  const shortBull =
    technicalIndicator.currentPrice >= technicalIndicator.sma20Price &&
    takerVolume.ratio >= 1.05 &&
    technicalIndicator.rsiStatus !== 'overbought' &&
    marketGate.status !== 'risk';
  const shortBear =
    technicalIndicator.currentPrice < technicalIndicator.sma20Price ||
    takerVolume.ratio < 0.9 ||
    technicalIndicator.rsiStatus === 'overbought' ||
    isRiskEnvironment(data);
  const midBull =
    (marketGate.status === 'open' || marketGate.status === 'caution') &&
    marketBreadth.aboveSma20Percent >= 50 &&
    stablecoinLiquidity.change30dPercent > -2;
  const midBear = marketGate.status === 'risk' || marketBreadth.aboveSma20Percent < 35 || stablecoinLiquidity.change30dPercent < -5;
  const longOpportunity = mvrvRatio.status === 'dip' || fearAndGreed.current <= 30;
  const longRisk = mvrvRatio.status === 'heated' || fearAndGreed.current >= 75;

  return [
    {
      horizon: 'short',
      ...horizonMeta.short,
      stance: shortBear ? 'TEMKİNLİ KAL' : shortBull ? 'TEYİTLİ İVME' : 'YÖN BEKLE',
      action: shortBear
        ? 'Yeni pozisyon açmayı hızlandırma; mevcut riski azalt.'
        : shortBull
          ? 'Teyit gelen seçeneklerde kademeli pozisyon düşün.'
          : 'Fiyat kırılımını bekle; kaldıraçlı girişten kaçın.',
      reason: shortBear
        ? `BTC ${technicalIndicator.rsiStatus === 'overbought' ? 'aşırı alım' : '20G altında'} ve taker akışı zayıf.`
        : `BTC 20G ${shortBull ? 'üstünde' : 'çevresinde'}, taker oranı ${takerVolume.ratio.toFixed(2)}.`,
      trigger: shortBear ? 'RSI düşüşü + alıcı taker geri geliş' : '20G üzerinde kalıcılık + taker oranı > 1',
      tone: shortBear ? 'negative' : shortBull ? 'positive' : 'warning',
    },
    {
      horizon: 'mid',
      ...horizonMeta.mid,
      stance: midBear ? 'RİSKİ AZALT' : midBull ? 'BİRİKTİRME LEHİNE' : 'KADEMELİ TEST',
      action: midBear
        ? 'Yeni sermayeyi böl ve mevcut kırılgan pozisyonları korumaya al.'
        : midBull
          ? 'Pozisyonları kademeli büyüt; tek seferde yoğunlaşma.'
          : 'Genişlik teyitini bekle; DCA planını küçük dilimlerle sürdür.',
      reason: `20G üstü parite %${marketBreadth.aboveSma20Percent}, stablecoin 30G ${percent(stablecoinLiquidity.change30dPercent)}.`,
      trigger: 'Pazar genişliği %50 üstü + stablecoin likiditesi toparlanıyor',
      tone: midBear ? 'negative' : midBull ? 'positive' : 'warning',
    },
    {
      horizon: 'long',
      ...horizonMeta.long,
      stance: longRisk ? 'KÂR KORU' : longOpportunity ? 'BİRİM TOPLA' : 'PLANDA KAL',
      action: longRisk
        ? 'Yeni tepe peşinde koşma; kârı kademeli realize et.'
        : longOpportunity
          ? 'Düşen korku veya MVRV bölgesinde planlı DCA fırsatı olarak değerlendir.'
          : 'Döngü ortasındaysan; düzenli katkı ve pozisyon sınırına uyum sürdür.',
      reason: `MVRV ${mvrvRatio.value.toFixed(2)}, FNG ${fearAndGreed.current}, genel risk ${macroPhase.riskScore}/10.`,
      trigger: 'Döngü verisi dip bölgesinden çıkış + likidite teyidi',
      tone: longRisk ? 'negative' : longOpportunity ? 'positive' : 'neutral',
    },
  ];
};

const buildSummary = (data: MarketData): { label: string; detail: string; tone: Tone } => {
  if (data.marketGate.status === 'risk' || isRiskEnvironment(data)) {
    return {
      label: 'ÖNCE KORUMA',
      detail: 'Risk dağılımı veya piyasa genişliği zayıf. Yeni risk eklemeden önce mevcut pozisyonları ve kaldıraç oranını gözden geçir.',
      tone: 'negative',
    };
  }
  if (data.marketGate.status === 'open') {
    return {
      label: 'KONTROLLÜ FIRSAT',
      detail: 'Kapı açık görünüyor. Kısa vadede teyit, orta vadede genişlik ve uzun vadede döngü disiplini birlikte kullanılmalı.',
      tone: 'positive',
    };
  }
  return {
    label: 'BEKLE VE DOĞRULA',
    detail: 'Sinyaller henüz tek yönlü değil. Kırılım, genişlik veya likidite teyidi gelene kadar kademeli kalmak daha kontrollü.',
    tone: 'warning',
  };
};

const WatchItem: FC<{ icon: ReactNode; label: string; value: string; tone: Tone }> = ({ icon, label, value, tone }) => (
  <div className="flex min-w-0 items-center gap-2 border border-stone-300 bg-stone-50 px-2.5 py-2">
    <span className={TONE_CLASSES[tone].icon}>{icon}</span>
    <div className="min-w-0">
      <p className="text-[8px] font-black uppercase tracking-wide text-stone-500">{label}</p>
      <p className="truncate text-[10px] font-black text-stone-900">{value}</p>
    </div>
  </div>
);

export const DecisionBrief: FC<DecisionBriefProps> = ({ data }) => {
  const plans = buildPlans(data);
  const summary = buildSummary(data);
  const staleCount = data.meta.staleSections.length;
  const confidenceTone: Tone = data.macroPhase.confidence === 'high' ? 'positive' : data.macroPhase.confidence === 'medium' ? 'warning' : 'negative';
  const btcTone = data.technicalIndicator.currentPrice >= data.technicalIndicator.sma20Price ? 'positive' : 'negative';
  const liquidityTone = data.stablecoinLiquidity.change30dPercent >= 0 ? 'positive' : 'negative';
  const flowTone = data.takerVolume.ratio >= 1 ? 'positive' : 'negative';

  return (
    <section aria-labelledby="decision-brief-title" className="mt-4 border-2 border-stone-900 bg-white shadow-hard animate-tabEnter">
      <header className="border-b-2 border-stone-900 bg-stone-900 p-4 text-stone-100 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-amber-300">
              <BrainCircuit className="h-3.5 w-3.5" />
              [TX // Karar masası]
            </p>
            <h2 id="decision-brief-title" className="mt-1 text-lg font-black uppercase tracking-tight text-white sm:text-xl">
              Şu an ne yapmalı?
            </h2>
            <p className="mt-1 max-w-2xl font-sans text-xs leading-relaxed text-stone-300">
              Sinyalleri tek bir yatırım tavsiyesine çevirmek yerine; kısa, orta ve uzun vade için karar çerçevesi kurar.
            </p>
          </div>
          <span className={`rounded border px-2 py-1 text-[8px] font-black uppercase ${TONE_CLASSES[confidenceTone].label}`}>
            Güven // {data.macroPhase.confidence}
          </span>
        </div>
      </header>

      <div className="p-3 sm:p-4">
        <div className={`border-2 p-3 ${TONE_CLASSES[summary.tone].card}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-2.5">
              {summary.tone === 'negative' ? <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />}
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-stone-600">Genel yönlendirme</p>
                <p className="mt-0.5 text-base font-black uppercase text-stone-950">{summary.label}</p>
                <p className="mt-1 max-w-3xl font-sans text-xs leading-relaxed text-stone-700">{summary.detail}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[8px] font-black uppercase text-stone-500">Risk skoru</p>
              <p className="text-2xl font-black leading-none text-stone-950">{data.macroPhase.riskScore}<span className="text-xs text-stone-500">/10</span></p>
            </div>
          </div>
        </div>

        <div className="mt-3 grid gap-2 lg:grid-cols-3">
          {plans.map((plan) => {
            const Icon = plan.horizon === 'short' ? horizonMeta.short.icon : plan.horizon === 'mid' ? horizonMeta.mid.icon : horizonMeta.long.icon;
            const classes = TONE_CLASSES[plan.tone];
            return (
              <article key={plan.horizon} className={`flex min-w-0 flex-col border-2 p-3 ${classes.card}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${classes.icon}`} />
                    <div>
                      <h3 className="text-xs font-black uppercase text-stone-950">{plan.label}</h3>
                      <p className="text-[8px] font-bold uppercase text-stone-500">{plan.timeframe}</p>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded border border-stone-900 px-1.5 py-1 text-[8px] font-black ${classes.label}`}>{plan.stance}</span>
                </div>
                <p className="mt-3 font-sans text-xs font-bold leading-relaxed text-stone-800">{plan.action}</p>
                <p className="mt-2 font-sans text-[10px] leading-relaxed text-stone-600">{plan.reason}</p>
                <div className="mt-auto border-t border-stone-900/15 pt-2.5">
                  <p className="text-[8px] font-black uppercase tracking-wide text-stone-500">Teyit arayın</p>
                  <p className="mt-0.5 text-[10px] font-black leading-relaxed text-stone-800">{plan.trigger}</p>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-[9px] font-black uppercase tracking-[0.16em] text-stone-500">İzlenecek teyitler</h3>
            <span className="text-[8px] font-bold uppercase text-stone-400">canlı sinyal radarı</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <WatchItem
              icon={data.technicalIndicator.currentPrice >= data.technicalIndicator.sma20Price ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              label="BTC trend"
              value={`20G ${data.technicalIndicator.currentPrice >= data.technicalIndicator.sma20Price ? 'üstü' : 'altı'} · RSI ${data.technicalIndicator.rsi14}`}
              tone={btcTone}
            />
            <WatchItem
              icon={flowTone === 'positive' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              label="Taker akışı"
              value={`${data.takerVolume.signal} · ${data.takerVolume.ratio.toFixed(2)} oran`}
              tone={flowTone}
            />
            <WatchItem
              icon={<Gauge className="h-4 w-4" />}
              label="Likidite / 30G"
              value={`${data.stablecoinLiquidity.label} · ${percent(data.stablecoinLiquidity.change30dPercent)}`}
              tone={liquidityTone}
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-dashed border-stone-300 pt-3 text-[9px] font-bold text-stone-500">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-700" />
          <span>{staleCount > 0 ? `${staleCount} kaynak gecikti; karar güveni düşüktür.` : 'Tüm kaynaklar güncel görünüyor.'}</span>
          <span className="ml-auto">Son tarama: {data.meta.updatedAt ? new Date(data.meta.updatedAt).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }) : 'bilinmiyor'}</span>
        </div>
      </div>
    </section>
  );
};
