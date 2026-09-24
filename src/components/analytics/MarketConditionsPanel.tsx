import type { FC } from 'react';
import { BarChart3, Droplets, Gauge } from 'lucide-react';
import type { MarketAnalyticsData } from '../../types/crypto';
import { AnalyticsCard, SourceFooter } from './AnalyticsPrimitives';

type MarketAnalytics = MarketAnalyticsData;

interface MarketConditionsPanelProps {
  marketBreadth: MarketAnalytics['marketBreadth'];
  volatilityRegime: MarketAnalytics['volatilityRegime'];
  stablecoinLiquidity: MarketAnalytics['stablecoinLiquidity'];
}

const percentChange = (value: number): string => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;

export const MarketConditionsPanel: FC<MarketConditionsPanelProps> = ({
  marketBreadth,
  volatilityRegime,
  stablecoinLiquidity,
}) => {
  const volatilityTone =
    volatilityRegime.status === 'high'
      ? 'bg-rose-200 text-rose-950'
      : volatilityRegime.status === 'active'
        ? 'bg-amber-200 text-amber-950'
        : 'bg-emerald-200 text-emerald-950';
  const liquidityTone =
    stablecoinLiquidity.status === 'expanding'
      ? 'bg-emerald-200 text-emerald-950'
      : stablecoinLiquidity.status === 'contracting'
        ? 'bg-rose-200 text-rose-950'
        : 'bg-stone-200 text-stone-950';
  const supplyBillions = stablecoinLiquidity.totalSupplyUsd / 1_000_000_000;
  const volatilityPosition = Math.max(2, Math.min(98, (volatilityRegime.atrPercent / 6) * 100));

  return (
    <AnalyticsCard
      eyebrow="[09 // Pazar koşulları]"
      title="Genişlik, oynaklık ve likidite"
      icon={<BarChart3 className="h-4 w-4" />}
      isStale={marketBreadth.freshness.isStale || volatilityRegime.freshness.isStale || stablecoinLiquidity.freshness.isStale}
      infoTitle="Pazar koşulları nasıl kullanılır?"
      infoContent="Bu üçlü, yükselişin genişliğini, günlük risk bantlarını ve serbest stablecoin likiditesinin yönünü birlikte gösterir. Tek başına alım veya satım sinyali üretmez."
    >
      <div className="grid gap-3 md:grid-cols-3">
        <section className="border border-stone-300 bg-stone-50 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.14em] text-stone-500">
              <BarChart3 className="h-3 w-3" /> Pazar genişliği
            </span>
            <span className="text-[8px] font-black uppercase text-stone-500">Top {marketBreadth.sampleSize}</span>
          </div>
          <p className="mt-2 text-3xl font-black leading-none text-stone-950">%{marketBreadth.aboveSma20Percent}</p>
          <p className="mt-1 text-[8px] font-black uppercase text-stone-500">20 günlük ortalamanın üstünde</p>
          <div className="mt-3 space-y-2">
            <div>
              <div className="mb-1 flex justify-between text-[8px] font-black"><span>20G üstü</span><span>%{marketBreadth.aboveSma20Percent}</span></div>
              <div className="h-2 border border-stone-900 bg-white"><div className="h-full bg-amber-400" style={{ width: `${marketBreadth.aboveSma20Percent}%` }} /></div>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-[8px] font-black"><span>50G üstü</span><span>%{marketBreadth.aboveSma50Percent}</span></div>
              <div className="h-2 border border-stone-900 bg-white"><div className="h-full bg-indigo-400" style={{ width: `${marketBreadth.aboveSma50Percent}%` }} /></div>
            </div>
          </div>
          <p className="mt-3 font-sans text-[10px] leading-relaxed text-stone-600">{marketBreadth.interpretation}</p>
          <SourceFooter {...marketBreadth.freshness} />
        </section>

        <section className="border border-stone-300 bg-stone-50 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.14em] text-stone-500">
              <Gauge className="h-3 w-3" /> BTC volatilite
            </span>
            <span className={`rounded border border-stone-900 px-1.5 py-0.5 text-[8px] font-black uppercase ${volatilityTone}`}>
              {volatilityRegime.label}
            </span>
          </div>
          <p className="mt-2 text-3xl font-black leading-none text-stone-950">%{volatilityRegime.atrPercent.toFixed(2)}</p>
          <p className="mt-1 text-[8px] font-black uppercase text-stone-500">Günlük ATR14 / fiyat</p>
          <div className="relative mt-4 h-3 border-2 border-stone-900 bg-[linear-gradient(90deg,#86efac_0%,#fde68a_55%,#fda4af_100%)]">
            <span className="absolute -top-1 bottom-[-4px] w-1.5 -translate-x-1/2 bg-stone-950" style={{ left: `${volatilityPosition}%` }} />
          </div>
          <div className="mt-1.5 flex justify-between text-[7px] font-black uppercase text-stone-500">
            <span>Sakin</span><span>Normal</span><span>Yüksek</span>
          </div>
          <p className="mt-3 font-sans text-[10px] leading-relaxed text-stone-600">{volatilityRegime.interpretation}</p>
          <SourceFooter {...volatilityRegime.freshness} />
        </section>

        <section className="border border-stone-300 bg-stone-50 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.14em] text-stone-500">
              <Droplets className="h-3 w-3" /> Stablecoin likidite
            </span>
            <span className={`rounded border border-stone-900 px-1.5 py-0.5 text-[8px] font-black uppercase ${liquidityTone}`}>
              {stablecoinLiquidity.label}
            </span>
          </div>
          <p className="mt-2 text-3xl font-black leading-none text-stone-950">${supplyBillions.toFixed(1)}B</p>
          <p className="mt-1 text-[8px] font-black uppercase text-stone-500">Dolaşımdaki USD-pegged arz</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="border border-stone-300 bg-white p-2 text-center">
              <p className="text-[7px] font-black uppercase text-stone-500">7 gün</p>
              <p className={`mt-1 text-sm font-black ${stablecoinLiquidity.change7dPercent >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{percentChange(stablecoinLiquidity.change7dPercent)}</p>
            </div>
            <div className="border border-stone-300 bg-white p-2 text-center">
              <p className="text-[7px] font-black uppercase text-stone-500">30 gün</p>
              <p className={`mt-1 text-sm font-black ${stablecoinLiquidity.change30dPercent >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{percentChange(stablecoinLiquidity.change30dPercent)}</p>
            </div>
          </div>
          <p className="mt-3 font-sans text-[10px] leading-relaxed text-stone-600">{stablecoinLiquidity.interpretation}</p>
          <SourceFooter {...stablecoinLiquidity.freshness} />
        </section>
      </div>
    </AnalyticsCard>
  );
};
