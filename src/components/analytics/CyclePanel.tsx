import { useState } from 'react';
import type { FC } from 'react';
import { Gauge, LineChart, PieChart, TrendingDown, TrendingUp } from 'lucide-react';
import type { MarketAnalyticsData } from '../../types/crypto';
import { classifyFng } from '../../services/onChainApi';
import { AnalyticsCard, SourceFooter } from './AnalyticsPrimitives';

type FearAndGreedData = MarketAnalyticsData['fearAndGreed'];
type MarketDominanceData = MarketAnalyticsData['marketDominance'];
type MvrvData = MarketAnalyticsData['mvrvRatio'];

interface CyclePanelProps {
  fearAndGreed: FearAndGreedData;
  marketDominance: MarketDominanceData;
  mvrvRatio: MvrvData;
}

interface HoveredPoint {
  date: string;
  value: number;
}

const SentimentCard: FC<{ data: FearAndGreedData }> = ({ data }) => {
  const [hovered, setHovered] = useState<HoveredPoint | null>(null);
  const points = data.history;
  const values = points.map((point) => point.value);
  const minimum = values.length ? Math.min(...values) : 0;
  const maximum = values.length ? Math.max(...values) : 100;
  const delta = points.length >= 2 ? points[points.length - 1].value - points[0].value : 0;
  const isPositive = delta >= 0;
  const sentimentPositive = data.current >= 55;
  const sentimentNegative = data.current <= 45;
  const lineColor = sentimentPositive ? '#16a34a' : sentimentNegative ? '#dc2626' : '#d97706';

  const width = 360;
  const height = 116;
  const padding = { top: 10, right: 8, bottom: 18, left: 25 };
  const chartBottom = height - padding.bottom;
  const rangeBuffer = Math.max(Math.ceil((maximum - minimum) * 0.18), 4);
  const chartMin = Math.max(0, minimum - rangeBuffer);
  const chartMax = Math.min(100, maximum + rangeBuffer);
  const chartRange = chartMax - chartMin || 1;
  const getX = (index: number) =>
    padding.left + (points.length <= 1 ? 0 : (index / (points.length - 1)) * (width - padding.left - padding.right));
  const getY = (value: number) =>
    padding.top + ((chartMax - value) / chartRange) * (chartBottom - padding.top);
  const gridValues = Array.from(new Set([
    minimum,
    maximum,
    ...[25, 50, 75].filter((value) => value >= chartMin && value <= chartMax),
  ])).sort((a, b) => a - b);
  const coordinates = points.map((point, index) => ({
    x: getX(index),
    y: getY(point.value),
    point,
  }));
  const linePath = coordinates
    .map(({ x, y }, index) => `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(' ');
  const areaPath = coordinates.length
    ? `${linePath} L ${coordinates[coordinates.length - 1].x.toFixed(1)} ${chartBottom} L ${coordinates[0].x.toFixed(1)} ${chartBottom} Z`
    : '';
  const periods = [
    { label: 'Dün', value: data.yesterday },
    { label: '1 hafta', value: data.lastWeek },
    { label: '1 ay', value: data.lastMonth },
  ];

  return (
    <AnalyticsCard
      eyebrow="[02 // Duygu radarı]"
      title="Korku & açgözlülük"
      icon={<Gauge className="h-4 w-4" />}
      isStale={data.freshness.isStale}
      action={
        <span
          className={`rounded border-2 border-stone-900 px-2 py-1 text-[10px] font-black shadow-hard-xs ${
            sentimentPositive ? 'bg-emerald-200' : sentimentNegative ? 'bg-rose-200' : 'bg-amber-200'
          }`}
        >
          {data.current} · {data.classification}
        </span>
      }
      infoTitle="Korku & Açgözlülük"
      infoContent="Aşırı korku panik alım fırsatı, aşırı açgözlülük ise düzeltme riski olarak okunur. Tek başına işlem sinyali değildir."
      className="lg:col-span-8"
    >
      <div className="grid gap-3 sm:grid-cols-[150px_minmax(0,1fr)] sm:items-center">
        <div className="border-b-2 border-stone-900 pb-3 sm:border-b-0 sm:border-r-2 sm:pb-0 sm:pr-4">
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-stone-500">Bugünkü skor</p>
          <div className="mt-1 flex items-end gap-2">
            <span className={`text-5xl font-black leading-none ${sentimentPositive ? 'text-emerald-700' : sentimentNegative ? 'text-rose-700' : 'text-amber-700'}`}>
              {data.current}
            </span>
            <span className="pb-1 text-[10px] font-black text-stone-400">/ 100</span>
          </div>
          <div
            className={`mt-3 inline-flex items-center gap-1 rounded border border-stone-900 px-2 py-1 text-[9px] font-black ${
              isPositive ? 'bg-emerald-100 text-emerald-950' : 'bg-rose-100 text-rose-950'
            }`}
          >
            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            14G {delta >= 0 ? '+' : ''}{delta} puan
          </div>
        </div>

        <div className="min-w-0">
          <div className="mb-2 flex items-center justify-between gap-2 text-[8px] font-bold uppercase text-stone-500">
            <span>14 günlük duygu dalgası</span>
            <span className="text-stone-700">
              {hovered ? `${hovered.date} // ${hovered.value}` : `Min ${minimum} · Max ${maximum}`}
            </span>
          </div>
          <div className="h-32 overflow-hidden rounded border-2 border-stone-900 bg-[#faf7f0] p-1 shadow-inner sm:h-36">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="h-full w-full"
              preserveAspectRatio="none"
              role="img"
              aria-label="Son 14 günlük korku ve açgözlülük grafiği"
              onMouseLeave={() => setHovered(null)}
            >
              <defs>
                <linearGradient id="sentiment-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={lineColor} stopOpacity="0.28" />
                  <stop offset="100%" stopColor={lineColor} stopOpacity="0.02" />
                </linearGradient>
              </defs>
              {gridValues.map((tick) => (
                <g key={tick}>
                  <line
                    x1={padding.left}
                    x2={width - padding.right}
                    y1={getY(tick)}
                    y2={getY(tick)}
                    stroke="#1c1917"
                    strokeWidth="0.8"
                    strokeDasharray={tick === 50 ? '4 3' : '2 4'}
                    strokeOpacity="0.22"
                  />
                  <text x="2" y={getY(tick) + 3} fill="#78716c" fontSize="7" fontWeight="700">
                    {tick}
                  </text>
                </g>
              ))}
              {areaPath && <path d={areaPath} fill="url(#sentiment-area)" />}
              {linePath && (
                <path d={linePath} fill="none" stroke={lineColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              )}
              {coordinates.map(({ x, y, point }, index) => {
                const isHovered = hovered?.date === point.date;
                const dotColor = point.value >= 55 ? '#16a34a' : point.value <= 45 ? '#dc2626' : '#d97706';
                return (
                  <g key={`${point.date}-${index}`}>
                    <circle
                      cx={x}
                      cy={y}
                      r="11"
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setHovered(point)}
                      onTouchStart={() => setHovered(point)}
                    />
                    <circle
                      cx={x}
                      cy={y}
                      r={isHovered ? 5 : 3.2}
                      fill={dotColor}
                      stroke="#1c1917"
                      strokeWidth="1.4"
                      className="pointer-events-none transition-all"
                    />
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {periods.map((period) => (
          <div key={period.label} className="border border-stone-300 bg-stone-50 px-2 py-2 text-center">
            <p className="text-[8px] font-black uppercase text-stone-500">{period.label}</p>
            <p className="mt-0.5 text-base font-black text-stone-900">{period.value}</p>
            <p className="truncate text-[8px] font-bold text-stone-500">{classifyFng(period.value)}</p>
          </div>
        ))}
      </div>

      <SourceFooter {...data.freshness} />
    </AnalyticsCard>
  );
};

const MvrvCard: FC<{ data: MvrvData }> = ({ data }) => {
  const status = {
    dip: { label: 'Tarihî dip', badge: 'bg-emerald-200 text-emerald-950' },
    fair: { label: 'Döngü ortası', badge: 'bg-amber-200 text-amber-950' },
    heated: { label: 'Aşırı ısınma', badge: 'bg-rose-200 text-rose-950' },
  }[data.status];
  const markerPosition = Math.max(2, Math.min(98, ((data.value - 0.5) / 3.5) * 100));

  return (
    <AnalyticsCard
      eyebrow="[03 // On-chain]"
      title="MVRV döngü ısıtıcısı"
      icon={<LineChart className="h-4 w-4" />}
      isStale={data.freshness.isStale}
      action={<span className={`rounded border-2 border-stone-900 px-2 py-1 text-[10px] font-black shadow-hard-xs ${status.badge}`}>{status.label}</span>}
      infoTitle="MVRV oranı"
      infoContent={data.interpretation}
    >
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-stone-500">Piyasa / gerçekleşen değer</p>
          <p className="mt-1 text-5xl font-black leading-none text-stone-950">{data.value.toFixed(2)}</p>
        </div>
        <div className="text-right text-[8px] font-bold uppercase leading-relaxed text-stone-500">
          <p>0.8 // Dip</p>
          <p>1.0–3.5 // Sağlıklı</p>
          <p>3.7+ // Tepe</p>
        </div>
      </div>
      <div className="relative mt-5 h-4 overflow-visible rounded-sm border-2 border-stone-900 bg-[linear-gradient(90deg,#86efac_0%,#fde68a_48%,#fda4af_100%)] shadow-hard-xs">
        <span
          className="absolute -top-1 bottom-[-4px] w-1.5 -translate-x-1/2 bg-stone-950 shadow-md"
          style={{ left: `${markerPosition}%` }}
          title={`MVRV ${data.value}`}
        />
      </div>
      <p className="mt-4 font-sans text-xs leading-relaxed text-stone-600">{data.interpretation}</p>
      <SourceFooter {...data.freshness} />
    </AnalyticsCard>
  );
};

const DominanceCard: FC<{ data: MarketDominanceData }> = ({ data }) => (
  <AnalyticsCard
    eyebrow="[04 // Pazar yapısı]"
    title="Hakimiyet radarı"
    icon={<PieChart className="h-4 w-4" />}
    isStale={data.freshness.isStale}
    action={<span className="rounded border-2 border-stone-900 bg-indigo-100 px-2 py-1 text-[10px] font-black shadow-hard-xs">BTC %{data.btcD}</span>}
    infoTitle="Pazar hakimiyeti"
    infoContent={data.interpretation}
  >
    <div>
      <div className="mb-2 flex justify-between gap-2 text-[9px] font-black">
        <span className="text-amber-800">BTC %{data.btcD}</span>
        <span className="text-indigo-800">ETH %{data.ethD}</span>
        <span className="text-emerald-800">DİĞER %{data.altD}</span>
      </div>
      <div className="flex h-4 overflow-hidden rounded-sm border-2 border-stone-900 shadow-hard-xs">
        <div style={{ width: `${data.btcD}%` }} className="border-r border-stone-900 bg-amber-300" />
        <div style={{ width: `${data.ethD}%` }} className="border-r border-stone-900 bg-indigo-300" />
        <div style={{ width: `${data.altD}%` }} className="bg-emerald-300" />
      </div>
    </div>

    <div className="mt-4 grid grid-cols-2 gap-2">
      <div className="border border-stone-300 bg-stone-50 p-2.5">
        <p className="text-[8px] font-black uppercase text-stone-500">Toplam değer</p>
        <p className="mt-1 text-lg font-black text-stone-950">${data.totalMarketCapUsd}T</p>
        <p className={`text-[9px] font-black ${data.mcapChange24h >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
          24S {data.mcapChange24h >= 0 ? '+' : ''}{data.mcapChange24h}%
        </p>
      </div>
      <div className="border border-stone-300 bg-stone-50 p-2.5">
        <p className="text-[8px] font-black uppercase text-stone-500">24S hacim</p>
        <p className="mt-1 text-lg font-black text-stone-950">${data.totalVolume24hUsd}B</p>
        <p className="text-[9px] font-bold text-stone-500">Tüm borsalar</p>
      </div>
    </div>
    <p className="mt-3 font-sans text-[11px] leading-relaxed text-stone-600">
      “Diğerleri” stablecoin’leri de içerir; tek başına altcoin sezonu sinyali değildir.
    </p>
    <SourceFooter {...data.freshness} />
  </AnalyticsCard>
);

export const CyclePanel: FC<CyclePanelProps> = ({ fearAndGreed, marketDominance, mvrvRatio }) => (
  <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start">
    <SentimentCard data={fearAndGreed} />
    <div className="grid gap-4 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-1">
      <MvrvCard data={mvrvRatio} />
      <DominanceCard data={marketDominance} />
    </div>
  </div>
);
