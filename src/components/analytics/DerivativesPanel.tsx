import type { FC } from 'react';
import { BarChart3, Flame, Layers, TrendingDown, TrendingUp } from 'lucide-react';
import type { MarketAnalyticsData } from '../../types/crypto';
import { AnalyticsCard, SourceFooter } from './AnalyticsPrimitives';

type LongShortData = MarketAnalyticsData['longShortRatio'];
type FundingData = MarketAnalyticsData['fundingRate'];
type TakerData = MarketAnalyticsData['takerVolume'];
type OpenInterestData = MarketAnalyticsData['openInterest'];

interface DerivativesPanelProps {
  longShortRatio: LongShortData;
  fundingRate: FundingData;
  takerVolume: TakerData;
  openInterest: OpenInterestData;
}

const FUNDING_META = {
  bullish: { label: 'Longlar ödüyor', badge: 'bg-emerald-200 text-emerald-950' },
  neutral: { label: 'Nötr', badge: 'bg-amber-200 text-amber-950' },
  overheated: { label: 'Aşırı ısınma', badge: 'bg-rose-200 text-rose-950' },
  bearish: { label: 'Shortlar ödüyor', badge: 'bg-emerald-200 text-emerald-950' },
} as const;

const OPEN_INTEREST_META = {
  'long-buildup': 'Long birikimi',
  'short-buildup': 'Short birikimi',
  unwinding: 'Kaldıraç çözülüyor',
  neutral: 'Yatay pozisyon',
} as const;

const PositioningCard: FC<{ longShortRatio: LongShortData; fundingRate: FundingData }> = ({
  longShortRatio,
  fundingRate,
}) => {
  const funding = FUNDING_META[fundingRate.status];
  const oldestTimestamp = Math.min(
    longShortRatio.freshness.updatedAt || Number.MAX_SAFE_INTEGER,
    fundingRate.freshness.updatedAt || Number.MAX_SAFE_INTEGER,
  );

  return (
    <AnalyticsCard
      eyebrow="[05 // Vadeli konumlanma]"
      title="Long / short & fonlama"
      icon={<Flame className="h-4 w-4" />}
      isStale={longShortRatio.freshness.isStale || fundingRate.freshness.isStale}
      action={
        <span className="rounded border-2 border-stone-900 bg-stone-100 px-2 py-1 text-[10px] font-black shadow-hard-xs">
          {longShortRatio.ratio.toFixed(2)}x
        </span>
      }
      infoTitle="Vadeli konumlanma"
      infoContent={`${longShortRatio.description} ${fundingRate.interpretation}`}
      className="lg:col-span-7"
    >
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
        <div>
          <div className="mb-2 flex items-end justify-between gap-3">
            <div>
              <p className="text-[9px] font-black uppercase text-stone-500">Hesap oranı</p>
              <p className="mt-1 text-4xl font-black leading-none text-stone-950">{longShortRatio.ratio.toFixed(2)}</p>
            </div>
            {longShortRatio.trendDelta !== undefined && (
              <span
                className={`rounded border border-stone-900 px-2 py-1 text-[9px] font-black ${
                  longShortRatio.trendDelta >= 0 ? 'bg-emerald-100 text-emerald-950' : 'bg-rose-100 text-rose-950'
                }`}
              >
                2.5S {longShortRatio.trendDelta >= 0 ? '+' : ''}{longShortRatio.trendDelta}
              </span>
            )}
          </div>
          <div className="flex h-4 overflow-hidden rounded-sm border-2 border-stone-900 shadow-hard-xs">
            <div style={{ width: `${longShortRatio.longPercent}%` }} className="border-r border-stone-900 bg-emerald-300" />
            <div style={{ width: `${longShortRatio.shortPercent}%` }} className="bg-rose-300" />
          </div>
          <div className="mt-2 flex justify-between text-[9px] font-black">
            <span className="inline-flex items-center gap-1 text-emerald-800">
              <TrendingUp className="h-3 w-3" /> Long %{longShortRatio.longPercent}
            </span>
            <span className="inline-flex items-center gap-1 text-rose-800">
              Short %{longShortRatio.shortPercent} <TrendingDown className="h-3 w-3" />
            </span>
          </div>
          <p className="mt-4 font-sans text-xs leading-relaxed text-stone-600">{longShortRatio.description}</p>
        </div>

        <div className="border-2 border-stone-900 bg-stone-900 p-3 text-stone-100 shadow-hard-sm">
          <p className="text-[8px] font-black uppercase tracking-[0.16em] text-stone-500">Fonlama oranı</p>
          <p className="mt-2 text-3xl font-black leading-none text-amber-300">%{fundingRate.ratePercent}</p>
          <p className="mt-1 text-[9px] font-bold text-stone-400">{fundingRate.intervalLabel}</p>
          <span className={`mt-4 inline-flex rounded border border-stone-900 px-2 py-1 text-[9px] font-black ${funding.badge}`}>
            {funding.label}
          </span>
          <p className="mt-3 font-sans text-[10px] leading-relaxed text-stone-300">{fundingRate.interpretation}</p>
        </div>
      </div>

      <SourceFooter
        source={`${longShortRatio.freshness.source} // ${fundingRate.freshness.source}`}
        updatedAt={oldestTimestamp === Number.MAX_SAFE_INTEGER ? 0 : oldestTimestamp}
        isStale={longShortRatio.freshness.isStale || fundingRate.freshness.isStale}
      />
    </AnalyticsCard>
  );
};

const TakerFlowCard: FC<{ data: TakerData }> = ({ data }) => (
  <AnalyticsCard
    eyebrow="[06 // Gerçek emir akışı]"
    title="Taker baskısı"
    icon={<BarChart3 className="h-4 w-4" />}
    isStale={data.freshness.isStale}
    action={<span className="rounded border-2 border-stone-900 bg-emerald-100 px-2 py-1 text-[10px] font-black shadow-hard-xs">%{data.buyPercent} alış</span>}
    infoTitle="Taker emir akışı"
    infoContent="Piyasa emriyle gerçekleşen agresif alış ve satış hacminin dağılımıdır."
  >
    <div className="flex items-end justify-between gap-3">
      <div>
        <p className="text-[8px] font-black uppercase text-stone-500">Alış / satış</p>
        <p className="mt-1 text-2xl font-black text-stone-950">{data.buyPercent} / {data.sellPercent}</p>
      </div>
      <p className="text-right text-[9px] font-black uppercase text-stone-500">
        Oran<br /><span className="text-base text-stone-900">{data.ratio.toFixed(2)}</span>
      </p>
    </div>
    <div className="mt-4 flex h-4 overflow-hidden rounded-sm border-2 border-stone-900 shadow-hard-xs">
      <div style={{ width: `${data.buyPercent}%` }} className="border-r border-stone-900 bg-emerald-300" />
      <div style={{ width: `${data.sellPercent}%` }} className="bg-rose-300" />
    </div>
    <p className="mt-3 inline-flex rounded border border-stone-900 bg-stone-100 px-2 py-1 text-[9px] font-black uppercase text-stone-900">
      {data.signal}
    </p>
    <SourceFooter {...data.freshness} />
  </AnalyticsCard>
);

const OpenInterestCard: FC<{ data: OpenInterestData }> = ({ data }) => {
  const bias = data.bias ? OPEN_INTEREST_META[data.bias] : OPEN_INTEREST_META.neutral;
  const isPositive = data.change24hUsd >= 0;

  return (
    <AnalyticsCard
      eyebrow="[07 // Açık pozisyon]"
      title="Open interest"
      icon={<Layers className="h-4 w-4" />}
      isStale={data.freshness.isStale}
      action={<span className="rounded border-2 border-stone-900 bg-indigo-100 px-2 py-1 text-[10px] font-black shadow-hard-xs">${data.valueUsd}B</span>}
      infoTitle="Açık pozisyon"
      infoContent={data.interpretation}
    >
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[8px] font-black uppercase text-stone-500">24S değişim</p>
          <p className={`mt-1 text-3xl font-black ${isPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
            {isPositive ? '+' : ''}${data.change24hUsd}M
          </p>
        </div>
        <p className="text-right text-[8px] font-black uppercase text-stone-500">
          BTC miktarı<br /><span className="text-sm text-stone-900">{Math.round(data.amountBtc).toLocaleString('tr-TR')}</span>
        </p>
      </div>
      <p className="mt-4 inline-flex rounded border border-stone-900 bg-stone-900 px-2 py-1 text-[9px] font-black uppercase text-amber-300">
        {bias}
      </p>
      <p className="mt-3 font-sans text-xs leading-relaxed text-stone-600">{data.interpretation}</p>
      <SourceFooter {...data.freshness} />
    </AnalyticsCard>
  );
};

export const DerivativesPanel: FC<DerivativesPanelProps> = ({
  longShortRatio,
  fundingRate,
  takerVolume,
  openInterest,
}) => (
  <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start">
    <PositioningCard longShortRatio={longShortRatio} fundingRate={fundingRate} />
    <div className="grid gap-4 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-1">
      <TakerFlowCard data={takerVolume} />
      <OpenInterestCard data={openInterest} />
    </div>
  </div>
);
