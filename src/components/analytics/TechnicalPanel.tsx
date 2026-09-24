import type { FC } from 'react';
import { Target, TrendingDown, TrendingUp } from 'lucide-react';
import type { MarketAnalyticsData } from '../../types/crypto';
import { AnalyticsCard, SourceFooter } from './AnalyticsPrimitives';

type TechnicalData = MarketAnalyticsData['technicalIndicator'];

interface TechnicalPanelProps {
  technicalIndicator: TechnicalData;
}

interface AverageRow {
  label: string;
  value: number;
}

export const TechnicalPanel: FC<TechnicalPanelProps> = ({ technicalIndicator }) => {
  const rsiTone =
    technicalIndicator.rsiStatus === 'oversold'
      ? 'bg-emerald-200 text-emerald-950'
      : technicalIndicator.rsiStatus === 'overbought'
        ? 'bg-rose-200 text-rose-950'
        : 'bg-amber-200 text-amber-950';
  const averages: AverageRow[] = [
    { label: '20G SMA', value: technicalIndicator.sma20Price },
    ...(technicalIndicator.ema50Price !== undefined
      ? [{ label: '50G EMA', value: technicalIndicator.ema50Price }]
      : []),
    ...(technicalIndicator.sma200Price !== undefined
      ? [{ label: '200G SMA', value: technicalIndicator.sma200Price }]
      : []),
  ];

  return (
    <AnalyticsCard
      eyebrow="[08 // Bitcoin teknik radar]"
      title="Fiyat, RSI ve ortalama yapısı"
      icon={<Target className="h-4 w-4" />}
      isStale={technicalIndicator.freshness.isStale}
      action={
        <span className={`rounded border-2 border-stone-900 px-2 py-1 text-[10px] font-black shadow-hard-xs ${rsiTone}`}>
          RSI {technicalIndicator.rsi14}
        </span>
      }
      infoTitle="BTC teknik seviyeleri"
      infoContent={`${technicalIndicator.trendLabel} RSI 30 altı aşırı satım, 70 üzeri aşırı alım bölgesidir.`}
    >
      <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-stretch">
        <div className="border-b-2 border-stone-900 pb-4 lg:border-b-0 lg:border-r-2 lg:pb-0 lg:pr-5">
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-stone-500">BTC günlük kapanış</p>
          <p className="mt-1 text-4xl font-black leading-none tracking-tight text-stone-950 sm:text-5xl">
            ${Math.round(technicalIndicator.currentPrice).toLocaleString('en-US')}
          </p>
          <p className="mt-3 font-sans text-xs leading-relaxed text-stone-600">{technicalIndicator.trendLabel}</p>
          {technicalIndicator.crossSignal && (
            <div className="mt-4 inline-flex items-center gap-1.5 rounded border border-stone-900 bg-stone-100 px-2 py-1.5 text-[9px] font-black uppercase text-stone-900">
              {technicalIndicator.crossSignal.toLowerCase().includes('golden') ? (
                <TrendingUp className="h-3 w-3 text-emerald-700" />
              ) : (
                <TrendingDown className="h-3 w-3 text-rose-700" />
              )}
              {technicalIndicator.crossSignal}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-stone-500">Relative strength index</p>
              <span className={`rounded border border-stone-900 px-2 py-1 text-[9px] font-black uppercase ${rsiTone}`}>
                {technicalIndicator.rsiLabel}
              </span>
            </div>
            <div className="relative h-5 overflow-visible rounded-sm border-2 border-stone-900 shadow-hard-xs">
              <div className="flex h-full">
                <div className="w-[30%] border-r border-stone-900 bg-emerald-200" />
                <div className="w-[40%] border-r border-stone-900 bg-amber-100" />
                <div className="w-[30%] bg-rose-200" />
              </div>
              <span
                className="absolute -top-1 bottom-[-4px] w-1.5 -translate-x-1/2 bg-stone-950 shadow-md"
                style={{ left: `${Math.max(1, Math.min(99, technicalIndicator.rsi14))}%` }}
                title={`RSI ${technicalIndicator.rsi14}`}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[8px] font-black uppercase text-stone-500">
              <span>0 // Aşırı satım</span>
              <span>50 // Nötr</span>
              <span>100 // Aşırı alım</span>
            </div>
          </div>

          <div className={`mt-5 grid gap-2 ${averages.length >= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
            {averages.map((average) => {
              const distance = ((technicalIndicator.currentPrice - average.value) / average.value) * 100;
              const isAbove = distance >= 0;
              return (
                <div key={average.label} className="border border-stone-300 bg-stone-50 p-3">
                  <p className="text-[8px] font-black uppercase text-stone-500">{average.label}</p>
                  <p className="mt-1 text-base font-black text-stone-950">${Math.round(average.value).toLocaleString('en-US')}</p>
                  <p className={`mt-1 text-[9px] font-black ${isAbove ? 'text-emerald-700' : 'text-rose-700'}`}>
                    Fiyat {isAbove ? 'üstünde' : 'altında'} %{Math.abs(distance).toFixed(1)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <SourceFooter {...technicalIndicator.freshness} />
    </AnalyticsCard>
  );
};
