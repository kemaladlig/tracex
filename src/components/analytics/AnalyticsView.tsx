import React, { useEffect, useState } from 'react';
import {
  Activity,
  BarChart3,
  Flame,
  Gauge,
  Layers,
  LineChart,
  PieChart,
  RefreshCw,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { fetchComprehensiveAnalytics, classifyFng } from '../../services/onChainApi';
import { useCryptoStore } from '../../store/useCryptoStore';
import { InfoBadge } from '../common/InfoBadge';

const formatUpdateTime = (ts: number): string => {
  if (!ts) return 'bilinmiyor';
  try {
    return new Date(ts).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'bilinmiyor';
  }
};

const StaleBadge: React.FC<{ label?: string }> = ({ label }) => (
  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-stone-900 bg-stone-800 text-amber-300 text-[8px] font-black uppercase tracking-wide shadow-hard-xs">
    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
    {label ?? 'Önbellek / Güncel değil'}
  </span>
);

const SourceFooter: React.FC<{ source: string; updatedAt: number; isStale: boolean }> = ({ source, updatedAt, isStale }) => (
  <div className="mt-3 pt-2 border-t border-dashed border-stone-300 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[8px] font-bold text-stone-500 uppercase">
    <span className="truncate min-w-0 flex-1">Kaynak: {source}</span>
    <span className="flex flex-wrap items-center justify-end gap-1.5">
      {isStale && <StaleBadge />}
      <span className="whitespace-nowrap">Güncelleme: {formatUpdateTime(updatedAt)}</span>
    </span>
  </div>
);

/** Çekilemeyen bölüm güncelmiş gibi görünmesin: sönük + gri ton. */
const staleCardClass = (isStale: boolean): string =>
  isStale ? 'opacity-70 grayscale-[0.45] saturate-[0.7]' : '';

/** Bento kartları için standart başlık: kicker + ikon + başlık + sağ rozetler. */
const CardHeader: React.FC<{
  kicker: string;
  icon: React.ReactNode;
  title: string;
  right?: React.ReactNode;
  infoTitle?: string;
  infoContent?: string;
}> = ({ kicker, icon, title, right, infoTitle, infoContent }) => (
  <div className="mb-3">
    <div className="text-[9px] font-black tracking-[0.18em] text-stone-400 uppercase mb-1.5">{kicker}</div>
    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 pb-2.5 border-b-2 border-stone-900/40">
      <div className="flex items-center gap-1.5 text-xs font-black text-stone-900 uppercase min-w-0 flex-1">
        {icon}
        <span className="truncate">{title}</span>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        {right}
        {infoContent && <InfoBadge title={infoTitle} content={infoContent} />}
      </div>
    </div>
  </div>
);

export const AnalyticsView: React.FC = () => {
  const analyticsData = useCryptoStore((state) => state.analyticsData);
  const setAnalyticsData = useCryptoStore((state) => state.setAnalyticsData);
  const [isLoading, setIsLoading] = useState<boolean>(!analyticsData);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [hoveredFng, setHoveredFng] = useState<{ date: string; value: number } | null>(null);

  const loadData = (forceFresh: boolean = false) => {
    if (forceFresh) setIsRefreshing(true);
    else setIsLoading(true);
    fetchComprehensiveAnalytics(forceFresh).then((data) => {
      setAnalyticsData(data);
      setIsLoading(false);
      setIsRefreshing(false);
    });
  };

  useEffect(() => {
    loadData(false);
  }, []);

  if (isLoading || !analyticsData) {
    return (
      <div className="pb-24 pt-2 px-3 font-mono max-w-4xl mx-auto">
        {/* Title Bar (Solid frame, zero layout shift) */}
        <div className="flex items-center justify-between mb-3 border-b-2 border-stone-900 pb-2">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-stone-950 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-amber-600" />
              PİYASA & ZİNCİR ANALİZİ
            </h2>
            <p className="text-[10px] text-stone-500 font-bold">
              DÖNGÜ GÖSTERGELERİ, VADELİ EMİR AKIŞI VE DUYGU ANALİZİ
            </p>
          </div>
          <div className="p-1.5 bg-stone-100 border border-stone-900 rounded shadow-hard-sm opacity-60">
            <RefreshCw className="w-3.5 h-3.5 text-stone-900 animate-spin" />
          </div>
        </div>

        {/* Skeleton Bento — final dizilimin iskeleti, kayma olmaz */}
        <div className="p-4 sm:p-5 bg-stone-900 border-2 border-stone-900 rounded-lg shadow-hard mb-3 animate-pulse">
          <div className="h-3 w-40 bg-stone-700 rounded mb-2" />
          <div className="h-5 w-3/4 bg-stone-700 rounded mb-2" />
          <div className="h-3 w-full bg-stone-800 rounded mb-1" />
          <div className="h-3 w-2/3 bg-stone-800 rounded mb-3" />
          <div className="flex gap-1.5 mb-3">
            <div className="h-5 w-24 bg-stone-800 rounded border border-stone-700" />
            <div className="h-5 w-28 bg-stone-800 rounded border border-stone-700" />
            <div className="h-5 w-20 bg-stone-800 rounded border border-stone-700" />
          </div>
          <div className="w-full bg-stone-800 h-2 rounded overflow-hidden border border-stone-700">
            <div className="h-full bg-amber-400/70 w-1/2" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start animate-pulse">
          <div className="lg:col-span-12 h-56 bg-white border-2 border-stone-900 rounded-lg shadow-hard" />
          <div className="lg:col-span-4 h-44 bg-white border-2 border-stone-900 rounded-lg shadow-hard" />
          <div className="lg:col-span-8 h-44 bg-white border-2 border-stone-900 rounded-lg shadow-hard" />
          <div className="lg:col-span-4 h-32 bg-white border-2 border-stone-900 rounded-lg shadow-hard" />
          <div className="lg:col-span-4 h-32 bg-white border-2 border-stone-900 rounded-lg shadow-hard" />
          <div className="lg:col-span-4 h-32 bg-white border-2 border-stone-900 rounded-lg shadow-hard" />
          <div className="lg:col-span-12 h-36 bg-white border-2 border-stone-900 rounded-lg shadow-hard" />
        </div>

        <div className="mt-3 flex items-center justify-center gap-2 text-[9px] font-bold text-stone-500">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-livePulse" />
          <span className="uppercase tracking-wider">Vadeli akış • MVRV • Duygu endeksi derleniyor</span>
        </div>
      </div>
    );
  }

  const {
    macroPhase,
    fearAndGreed,
    marketDominance,
    longShortRatio,
    fundingRate,
    mvrvRatio,
    takerVolume,
    openInterest,
    technicalIndicator,
  } = analyticsData;

  // Adaptive SVG geometry for 14-day Fear & Greed wave
  const fngPoints = fearAndGreed.history;
  const fngValues = fngPoints.map((p) => p.value);
  const fngDataMin = fngValues.length ? Math.min(...fngValues) : 40;
  const fngDataMax = fngValues.length ? Math.max(...fngValues) : 60;

  // Dynamic adaptive scale: pad by 18% of range or min 5 points so wave utilizes full vertical space
  const fngRangeBuffer = Math.max(Math.ceil((fngDataMax - fngDataMin) * 0.18), 5);
  const fngMinVal = Math.max(0, fngDataMin - fngRangeBuffer);
  const fngMaxVal = Math.min(100, fngDataMax + fngRangeBuffer);
  const fngEffectiveRange = fngMaxVal - fngMinVal || 1;

  // Viewport: 360 x 115 (more than double the previous height)
  const svgWidth = 360;
  const svgHeight = 115;
  const padTop = 14;
  const padBottom = 22;
  const padLeft = 14;
  const padRight = 48; // Dedicated rail for Max/Min stamps

  const getFngX = (idx: number) => {
    if (fngPoints.length <= 1) return padLeft;
    return padLeft + (idx / (fngPoints.length - 1)) * (svgWidth - padLeft - padRight);
  };

  const getFngY = (val: number) => {
    return padTop + ((fngMaxVal - val) / fngEffectiveRange) * (svgHeight - padTop - padBottom);
  };

  const fngCoordinates = fngPoints.map((pt, idx) => ({
    x: getFngX(idx),
    y: getFngY(pt.value),
    pt,
  }));

  const pointsString = fngCoordinates.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');

  // Shaded area path
  const areaBottomY = svgHeight - padBottom;
  const areaPathD =
    fngCoordinates.length > 0
      ? `M ${fngCoordinates[0].x.toFixed(1)},${areaBottomY.toFixed(1)} L ${pointsString.replace(/,/g, ' ')} L ${fngCoordinates[fngCoordinates.length - 1].x.toFixed(1)},${areaBottomY.toFixed(1)} Z`
      : '';

  // 14-day net delta (change from 14 days ago to today)
  const fngDelta =
    fngPoints.length >= 2 ? fngPoints[fngPoints.length - 1].value - fngPoints[0].value : 0;
  const isFngBullish = fngDelta >= 0;

  // Primary sentiment color based on current score
  const fngColor =
    fearAndGreed.current >= 55
      ? '#16a34a'
      : fearAndGreed.current <= 45
      ? '#dc2626'
      : '#d97706';

  // Vadeli kartın zaman damgası: iki kaynaktan eski olanı göster (render'da Date.now yok)
  const lsFundingTs = Math.min(
    longShortRatio.freshness.updatedAt || analyticsData.meta.updatedAt,
    fundingRate.freshness.updatedAt || analyticsData.meta.updatedAt
  );

  return (
    <div className="pb-24 pt-2 px-3 font-mono max-w-4xl mx-auto">
      {/* Title & Refresh */}
      <div className="flex items-center justify-between mb-3 border-b-2 border-stone-900 pb-2">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wider text-stone-950 flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-amber-600" />
            PİYASA & ZİNCİR ANALİZİ
          </h2>
          <p className="text-[10px] text-stone-500 font-bold">
            DÖNGÜ GÖSTERGELERİ, VADELİ EMİR AKIŞI VE DUYGU ANALİZİ
          </p>
        </div>
        <button
          onClick={() => loadData(true)}
          disabled={isRefreshing}
          className="p-1.5 bg-stone-100 border border-stone-900 rounded shadow-hard-sm hover:bg-stone-200 active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-wait"
          title="Verileri Güncelle (önbelleği atla)"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-stone-900 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Kısmi stale uyarısı: hangi bölümler önbellek açıkça yazılır */}
      {analyticsData.meta.isPartiallyStale && (
        <div className="mb-3 p-2.5 bg-stone-800 text-amber-200 border-2 border-stone-900 rounded-lg shadow-hard-sm text-[10px] font-bold leading-relaxed">
          <span className="font-black uppercase">Bazı veriler güncellenemedi: </span>
          {analyticsData.meta.staleSections.join(' • ')} önbellekten gösteriliyor ve kartlar sönük bırakıldı. Güncelmiş gibi işlem yapmayın.
        </div>
      )}

      {/* 1. MAKRO FAZ & RİSK SKORU — hero kart, hükmün kanıtları chiplerde */}
      <div
        className="p-4 sm:p-5 bg-stone-900 text-stone-100 border-2 border-stone-900 rounded-lg shadow-hard mb-3 stagger-item"
        style={{ '--stagger-idx': 0 } as React.CSSProperties}
      >
        <div className="flex items-center gap-1.5 text-[9px] font-black tracking-[0.18em] text-stone-500 uppercase mb-2">
          <Activity className="w-3.5 h-3.5 text-amber-400" />
          [01 // GENEL HÜKÜM]
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-stone-800 mb-3">
          <span className="text-sm sm:text-base tracking-wide text-stone-50 font-black uppercase">
            {macroPhase.title}
          </span>
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 bg-stone-800 border border-stone-700 px-2 py-0.5 rounded text-xs font-black">
              <span className="text-stone-400 text-[10px]">RİSK:</span>
              <span
                className={
                  macroPhase.riskScore >= 7
                    ? 'text-rose-400'
                    : macroPhase.riskScore <= 4
                    ? 'text-emerald-400'
                    : 'text-amber-400'
                }
              >
                {macroPhase.riskScore} / 10
              </span>
            </div>
            <span
              className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${
                macroPhase.confidence === 'high'
                  ? 'bg-emerald-900 text-emerald-300 border-emerald-700'
                  : macroPhase.confidence === 'medium'
                  ? 'bg-amber-900 text-amber-300 border-amber-700'
                  : 'bg-rose-900 text-rose-300 border-rose-700'
              }`}
              title="Stale girdi arttıkça güven düşer"
            >
              GÜVEN: {macroPhase.confidence === 'high' ? 'YÜKSEK' : macroPhase.confidence === 'medium' ? 'ORTA' : 'DÜŞÜK'}
            </span>
          </div>
        </div>

        <div className="mb-2.5">
          <div className="mb-1.5 flex items-center gap-1.5 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] font-black uppercase ${
                macroPhase.riskScore >= 7
                  ? 'bg-rose-950 text-rose-300 border-rose-800'
                  : macroPhase.riskScore <= 4
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  : 'bg-amber-950 text-amber-300 border-amber-800'
              }`}
            >
              <span className={`w-2 h-2 rounded-full inline-block shrink-0 ${macroPhase.riskScore >= 7 ? 'bg-rose-400' : macroPhase.riskScore <= 4 ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span>{macroPhase.verdict}</span>
            </span>
          </div>
          <p className="text-xs text-stone-300 leading-relaxed font-sans">
            {macroPhase.strategy}
          </p>
        </div>

        {/* Hükmün dayanakları: hangi sinyaller ateşlendi, hangileri sakin */}
        {macroPhase.signals.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {macroPhase.signals.map((sig) => (
              <span
                key={sig}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-stone-700 bg-stone-800 text-stone-200 text-[9px] font-bold"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                {sig}
              </span>
            ))}
          </div>
        )}

        {/* Dynamic Risk Gauge bar */}
        <div className="w-full bg-stone-800 h-2 rounded overflow-hidden flex border border-stone-700">
          <div
            style={{ width: `${macroPhase.riskScore * 10}%` }}
            className={`transition-all duration-500 ${
              macroPhase.riskScore >= 7
                ? 'bg-rose-500'
                : macroPhase.riskScore <= 4
                ? 'bg-emerald-500'
                : 'bg-amber-400'
            }`}
          />
        </div>
        <div className="flex justify-between text-[8px] font-bold text-stone-500 mt-1">
          <span>1 · DÜŞÜK</span>
          <span>5 · NÖTR</span>
          <span>10 · YÜKSEK</span>
        </div>
      </div>

      {/* BENTO GRID: mobilde tek sütun, desktop'ta 12 kolon */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-start">

      {/* 2. KORKU & AÇGÖZLÜLÜK — grafik genişlik ister: tam boy */}
      <div
        className={`lg:col-span-12 h-full p-4 sm:p-5 bg-white border-2 border-stone-900 rounded-lg shadow-hard stagger-item ${staleCardClass(fearAndGreed.freshness.isStale)}`}
        style={{ '--stagger-idx': 1 } as React.CSSProperties}
      >
        <CardHeader
          kicker="[02 // DUYGU]"
          icon={<Gauge className="w-4 h-4 text-amber-600" />}
          title="KORKU & AÇGÖZLÜLÜK"
          infoTitle="Korku & Açgözlülük (Alternative.me)"
          infoContent="Piyasadaki aşırı korku yatırımcıların gereksiz paniklediğini (alım fırsatı), aşırı açgözlülük ise piyasanın bir düzeltmeye hazır olduğunu (satış uyarısı) gösterir."
        />

        {/* 4 Multi-period Comparison Boxes (Today, Yesterday, Last Week, Last Month) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {/* Today */}
          <div className="p-2 bg-amber-50 border-2 border-stone-900 rounded shadow-hard-sm text-center">
            <span className="text-[9px] font-bold text-stone-600 uppercase block">ŞU AN</span>
            <div className="text-lg font-black text-stone-950 mt-0.5">{fearAndGreed.current}</div>
            <span className="text-[8px] font-black uppercase text-amber-800 block truncate">
              {fearAndGreed.classification}
            </span>
          </div>

          {/* Yesterday */}
          <div className="p-2 bg-stone-50 border border-stone-900 rounded text-center">
            <span className="text-[9px] font-bold text-stone-500 uppercase block">DÜN</span>
            <div className="text-base font-black text-stone-800 mt-0.5">{fearAndGreed.yesterday}</div>
            <span className="text-[8px] font-bold uppercase text-stone-600 block truncate">
              {classifyFng(fearAndGreed.yesterday)}
            </span>
          </div>

          {/* Last Week */}
          <div className="p-2 bg-stone-50 border border-stone-900 rounded text-center">
            <span className="text-[9px] font-bold text-stone-500 uppercase block">GEÇEN HAFTA</span>
            <div className="text-base font-black text-stone-800 mt-0.5">{fearAndGreed.lastWeek}</div>
            <span className="text-[8px] font-bold uppercase text-stone-600 block truncate">
              {classifyFng(fearAndGreed.lastWeek)}
            </span>
          </div>

          {/* Last Month */}
          <div className="p-2 bg-stone-50 border border-stone-900 rounded text-center">
            <span className="text-[9px] font-bold text-stone-500 uppercase block">GEÇEN AY</span>
            <div className="text-base font-black text-stone-800 mt-0.5">{fearAndGreed.lastMonth}</div>
            <span className="text-[8px] font-bold uppercase text-stone-600 block truncate">
              {classifyFng(fearAndGreed.lastMonth)}
            </span>
          </div>
        </div>

        {/* 14-Day Micro Historical Trend Chart with hover inspection */}
        <div className="mt-2 pt-3 border-t border-stone-200">
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 text-[10px] font-bold mb-2">
            <div className="flex flex-wrap items-center gap-1.5 text-stone-700">
              <span className="uppercase">14 GÜNLÜK DUYGU DALGASI</span>
              <span
                className={`inline-flex items-center gap-0.5 px-1 py-0.2 rounded font-black text-[9px] border border-stone-900 shadow-hard-xs ${
                  isFngBullish ? 'bg-emerald-200 text-emerald-950' : 'bg-rose-200 text-rose-950'
                }`}
              >
                {isFngBullish ? (
                  <TrendingUp className="w-2.5 h-2.5 stroke-[3]" />
                ) : (
                  <TrendingDown className="w-2.5 h-2.5 stroke-[3]" />
                )}
                {fngDelta >= 0 ? `+${fngDelta}` : fngDelta} PUAN
              </span>
            </div>

            <span className="text-stone-600">
              {hoveredFng ? (
                <strong className="text-stone-900 bg-amber-200 border border-stone-900 px-1.5 py-0.5 rounded shadow-hard-xs text-[9px]">
                  {hoveredFng.date}: SKOR {hoveredFng.value}
                </strong>
              ) : (
                <span className="text-stone-500 text-[9px]">MİN {fngDataMin} // MAX {fngDataMax}</span>
              )}
            </span>
          </div>

          <div className="w-full h-28 sm:h-32 bg-[#faf7f0] rounded border-2 border-stone-900 p-0.5 shadow-inner overflow-hidden relative">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-full"
              preserveAspectRatio="none"
              onMouseLeave={() => setHoveredFng(null)}
            >
              <defs>
                <linearGradient id="fngAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={fngColor} stopOpacity="0.32" />
                  <stop offset="100%" stopColor={fngColor} stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* Shaded Area Beneath the Wave */}
              {areaPathD && <path d={areaPathD} fill="url(#fngAreaGrad)" />}

              {/* Peak Benchmark Guideline */}
              <line
                x1={padLeft}
                y1={getFngY(fngDataMax)}
                x2={svgWidth - padRight + 6}
                y2={getFngY(fngDataMax)}
                stroke="#1c1917"
                strokeWidth="1"
                strokeDasharray="2 2"
                strokeOpacity="0.25"
              />
              <text
                x={svgWidth - padRight + 8}
                y={getFngY(fngDataMax) + 3}
                fill="#1c1917"
                fontSize="7"
                fontWeight="900"
                fontFamily="monospace"
              >
                {fngDataMax} MAX
              </text>

              {/* 50 Neutral Baseline (If within range) */}
              {fngMinVal <= 50 && fngMaxVal >= 50 && (
                <>
                  <line
                    x1={padLeft}
                    y1={getFngY(50)}
                    x2={svgWidth - padRight + 6}
                    y2={getFngY(50)}
                    stroke="#1c1917"
                    strokeWidth="1.2"
                    strokeDasharray="3 3"
                    strokeOpacity="0.35"
                  />
                  <text
                    x={svgWidth - padRight + 8}
                    y={getFngY(50) + 3}
                    fill="#78716c"
                    fontSize="6.5"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    50 NÖTR
                  </text>
                </>
              )}

              {/* Trough Benchmark Guideline */}
              <line
                x1={padLeft}
                y1={getFngY(fngDataMin)}
                x2={svgWidth - padRight + 6}
                y2={getFngY(fngDataMin)}
                stroke="#1c1917"
                strokeWidth="1"
                strokeDasharray="2 2"
                strokeOpacity="0.25"
              />
              <text
                x={svgWidth - padRight + 8}
                y={getFngY(fngDataMin) + 3}
                fill="#1c1917"
                fontSize="7"
                fontWeight="900"
                fontFamily="monospace"
              >
                {fngDataMin} MİN
              </text>

              {/* The SVG Bold Trendline */}
              <polyline
                fill="none"
                stroke={fngColor}
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={pointsString}
              />

              {/* Interactive Data Dots with Touch Target Hitboxes */}
              {fngCoordinates.map(({ x, y, pt }) => {
                const isPointHovered = hoveredFng?.date === pt.date;
                const dotColor =
                  pt.value >= 55
                    ? '#16a34a'
                    : pt.value <= 45
                    ? '#dc2626'
                    : '#f59e0b';

                return (
                  <g key={pt.date} className="cursor-pointer">
                    {/* Invisible Larger Hit Area for Mobile Touch */}
                    <circle
                      cx={x}
                      cy={y}
                      r="12"
                      fill="transparent"
                      onMouseEnter={() => setHoveredFng(pt)}
                      onTouchStart={() => setHoveredFng(pt)}
                    />
                    {/* Visual Stamp Dot */}
                    <circle
                      cx={x}
                      cy={y}
                      r={isPointHovered ? 5 : 3.5}
                      fill={dotColor}
                      stroke="#1c1917"
                      strokeWidth="1.5"
                      className="transition-all pointer-events-none"
                    />
                  </g>
                );
              })}
            </svg>
          </div>
          <SourceFooter source={fearAndGreed.freshness.source} updatedAt={fearAndGreed.freshness.updatedAt} isStale={fearAndGreed.freshness.isStale} />
        </div>
      </div>

      {/* 3. KRİPTO PAZAR HAKİMİYETİ & ALTCOİN RADARI */}
      <div
        className={`lg:col-span-4 h-full p-4 sm:p-5 bg-white border-2 border-stone-900 rounded-lg shadow-hard stagger-item ${staleCardClass(marketDominance.freshness.isStale)}`}
        style={{ '--stagger-idx': 2 } as React.CSSProperties}
      >
        <CardHeader
          kicker="[03 // HAKİMİYET]"
          icon={<PieChart className="w-4 h-4 text-indigo-600" />}
          title="PAZAR HAKİMİYETİ"
          right={
            <span className="text-[10px] font-black bg-indigo-50 border border-stone-900 px-1.5 py-0.5 rounded shadow-hard-sm">
              BTC.D: %{marketDominance.btcD}
            </span>
          }
          infoTitle="Pazar Hakimiyeti (Dominance)"
          infoContent={marketDominance.interpretation}
        />

        {/* 3-Segment Stacked Bar */}
        <div className="mb-2.5">
          <div className="flex flex-wrap justify-between gap-x-2 gap-y-0.5 text-[11px] font-black mb-1.5">
            <span className="text-amber-800">BTC: %{marketDominance.btcD}</span>
            <span className="text-indigo-800">ETH: %{marketDominance.ethD}</span>
            <span className="text-emerald-800">DİĞERLERİ: %{marketDominance.altD}</span>
          </div>
          <div className="w-full h-3.5 rounded border-2 border-stone-900 overflow-hidden flex shadow-hard-sm">
            <div
              style={{ width: `${marketDominance.btcD}%` }}
              className="bg-amber-300 border-r border-stone-900"
              title={`BTC Payı: %${marketDominance.btcD}`}
            />
            <div
              style={{ width: `${marketDominance.ethD}%` }}
              className="bg-indigo-300 border-r border-stone-900"
              title={`ETH Payı: %${marketDominance.ethD}`}
            />
            <div
              style={{ width: `${marketDominance.altD}%` }}
              className="bg-emerald-300"
              title={`Altcoin Payı: %${marketDominance.altD}`}
            />
          </div>
        </div>

        {/* Global Market Overview — dar kutuda alt alta daha rahat */}
        <div className="grid grid-cols-1 gap-1.5 mt-2.5 p-2 bg-stone-50 border border-stone-900 rounded text-xs">
          <div>
            <span className="text-[9px] text-stone-500 uppercase font-bold block">Toplam Kripto Değeri</span>
            <span className="font-black text-stone-900">
              ${marketDominance.totalMarketCapUsd}T{' '}
              <span
                className={`text-[10px] ${
                  marketDominance.mcapChange24h >= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                ({marketDominance.mcapChange24h >= 0 ? '+' : ''}
                {marketDominance.mcapChange24h}%)
              </span>
            </span>
          </div>
          <div>
            <span className="text-[9px] text-stone-500 uppercase font-bold block">24s Toplam Hacim</span>
            <span className="font-black text-stone-900">${marketDominance.totalVolume24hUsd}B</span>
          </div>
        </div>
        <p className="mt-2 text-[10px] text-stone-500 font-sans leading-relaxed">
          Not: "Diğerleri" dilimi stablecoin'leri de içerir; tek başına alt-sezon sinyali değildir.
        </p>
        <SourceFooter source={marketDominance.freshness.source} updatedAt={marketDominance.freshness.updatedAt} isStale={marketDominance.freshness.isStale} />
      </div>

      {/* 4. VADELİ LONG / SHORT & FONLAMA — barlar + fonlama kutusu yan yana */}
      <div
        className={`lg:col-span-8 h-full p-4 sm:p-5 bg-white border-2 border-stone-900 rounded-lg shadow-hard stagger-item ${staleCardClass(longShortRatio.freshness.isStale || fundingRate.freshness.isStale)}`}
        style={{ '--stagger-idx': 3 } as React.CSSProperties}
      >
        <CardHeader
          kicker="[04 // VADELİ]"
          icon={<Flame className="w-4 h-4 text-amber-600" />}
          title="LONG / SHORT & FONLAMA"
          right={
            <>
              <span className="text-[10px] font-black bg-stone-100 border border-stone-900 px-1.5 py-0.5 rounded shadow-hard-sm">
                ORAN: {longShortRatio.ratio}
              </span>
              {longShortRatio.trendDelta !== undefined && (
                <span className={`text-[9px] font-black border border-stone-900 px-1.5 py-0.5 rounded ${longShortRatio.trendDelta >= 0 ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'}`}>
                  2.5SA TREND: {longShortRatio.trendDelta >= 0 ? '+' : ''}{longShortRatio.trendDelta}
                </span>
              )}
            </>
          }
          infoTitle="Long / Short & Fonlama"
          infoContent={longShortRatio.description}
        />

        {/* Geniş kartta bar ve fonlama yan yana: içerik nefes alır */}
        <div className="grid sm:grid-cols-2 gap-3 items-center">
        {/* Dual Bar (Long vs Short) */}
        <div>
          <div className="flex justify-between text-xs font-black mb-1">
            <span className="text-emerald-700 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 stroke-[3]" /> %{longShortRatio.longPercent} LONG
            </span>
            <span className="text-rose-700 flex items-center gap-1">
              %{longShortRatio.shortPercent} SHORT <TrendingDown className="w-3.5 h-3.5 stroke-[3]" />
            </span>
          </div>
          <div className="w-full h-3.5 rounded border-2 border-stone-900 overflow-hidden flex shadow-hard-sm">
            <div
              style={{ width: `${longShortRatio.longPercent}%` }}
              className="bg-emerald-300 border-r border-stone-900"
            />
            <div style={{ width: `${longShortRatio.shortPercent}%` }} className="bg-rose-300" />
          </div>
          <p className="mt-1.5 text-[10px] text-stone-500 font-sans leading-relaxed">
            Hesap sayısı bazlı oran + 8 saatte bir ödenen fonlama birlikte okunmalıdır.
          </p>
        </div>

        {/* Funding Rate Box */}
        <div className="p-2.5 bg-stone-50 border border-stone-900 rounded text-xs">
          <span className="text-[9px] text-stone-500 uppercase font-bold block mb-0.5">
            Fonlama Oranı (Funding Rate)
          </span>
          <div className="flex items-center justify-between gap-2">
            <span className="text-base font-black text-stone-900">%{fundingRate.ratePercent}</span>
            <span className="text-[10px] font-black bg-amber-200 border border-stone-900 px-1.5 py-0.5 rounded">
              {fundingRate.intervalLabel}
            </span>
          </div>
        </div>
        </div>
        <SourceFooter source={`${longShortRatio.freshness.source} // ${fundingRate.freshness.source}`} updatedAt={lsFundingTs} isStale={longShortRatio.freshness.isStale || fundingRate.freshness.isStale} />
      </div>

      {/* 5. MVRV — kompakt gösterge: dar kutu, dikey istif */}
      <div
        className={`lg:col-span-4 h-full p-4 sm:p-5 bg-white border-2 border-stone-900 rounded-lg shadow-hard stagger-item ${staleCardClass(mvrvRatio.freshness.isStale)}`}
        style={{ '--stagger-idx': 4 } as React.CSSProperties}
      >
        <CardHeader
          kicker="[05 // DÖNGÜ]"
          icon={<LineChart className="w-4 h-4 text-purple-600" />}
          title="MVRV ISITICI"
          right={
            <span className="text-xs font-black bg-stone-900 text-amber-300 px-2 py-0.5 rounded shadow-hard-sm">
              SKOR: {mvrvRatio.value}
            </span>
          }
          infoTitle="MVRV Oranı (Piyasa / Gerçekleşen Değer)"
          infoContent={mvrvRatio.interpretation}
        />

        {/* The Cycle Ruler Indicator */}
        <div className="my-2">
          <div className="relative w-full h-4 rounded border-2 border-stone-900 bg-gradient-to-r from-emerald-200 via-amber-200 to-rose-300 shadow-hard-sm overflow-hidden flex items-center">
            {/* Current Position Needle */}
            <div
              style={{
                left: `${Math.max(2, Math.min(98, ((mvrvRatio.value - 0.5) / (4.0 - 0.5)) * 100))}%`,
              }}
              className="absolute top-0 bottom-0 w-1.5 bg-stone-950 shadow-md"
              title={`Şu anki MVRV: ${mvrvRatio.value}`}
            />
          </div>
          <div className="flex justify-between gap-1 text-[9px] font-bold text-stone-500 mt-1">
            <span>0.8 DİP</span>
            <span className="text-stone-900 font-black">[{mvrvRatio.value}]</span>
            <span>3.7+ TEPE</span>
          </div>
        </div>
        <SourceFooter source={mvrvRatio.freshness.source} updatedAt={mvrvRatio.freshness.updatedAt} isStale={mvrvRatio.freshness.isStale} />
      </div>

      {/* 6a. GERÇEK EMİR AKIŞI (TAKER VOLUME) */}
      <div className={`lg:col-span-4 h-full p-4 bg-white border-2 border-stone-900 rounded-lg shadow-hard flex flex-col justify-between stagger-item text-xs ${staleCardClass(takerVolume.freshness.isStale)}`} style={{ '--stagger-idx': 5 } as React.CSSProperties}>
        <div>
          <div className="text-[9px] font-black tracking-[0.18em] text-stone-400 uppercase mb-1.5">[06A // AKIŞ]</div>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1 text-[10px] text-stone-900 font-black uppercase">
              <BarChart3 className="w-3.5 h-3.5 text-emerald-600" /> Taker Akışı
            </div>
            <InfoBadge
              title="Taker Emir Akışı"
              content="Piyasa emriyle anlık agresif işlem yapan hacim dağılımı. Taker alış baskısı anlık yükseliş gücünü gösterir."
            />
          </div>
          <div className="text-sm font-black text-stone-900">
            %{takerVolume.buyPercent} Alış / %{takerVolume.sellPercent} Satış
          </div>
          <div className="w-full h-2.5 rounded border border-stone-900 overflow-hidden flex my-1.5">
            <div style={{ width: `${takerVolume.buyPercent}%` }} className="bg-emerald-400" />
            <div style={{ width: `${takerVolume.sellPercent}%` }} className="bg-rose-400" />
          </div>
          <span className="inline-block mt-0.5 bg-stone-100 border border-stone-900 text-stone-900 text-[8px] font-black px-1 rounded-xs">
            {takerVolume.signal}
          </span>
          {takerVolume.freshness.isStale && <div className="mt-1.5"><StaleBadge /></div>}
        </div>
      </div>

      {/* 6b. AÇIK POZİSYON (OPEN INTEREST) */}
      <div className={`lg:col-span-4 h-full p-4 bg-white border-2 border-stone-900 rounded-lg shadow-hard flex flex-col justify-between stagger-item text-xs ${staleCardClass(openInterest.freshness.isStale)}`} style={{ '--stagger-idx': 5 } as React.CSSProperties}>
        <div>
          <div className="text-[9px] font-black tracking-[0.18em] text-stone-400 uppercase mb-1.5">[06B // POZİSYON]</div>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1 text-[10px] text-stone-900 font-black uppercase">
              <Layers className="w-3.5 h-3.5 text-indigo-600" /> Açık Poz. (OI)
            </div>
            <InfoBadge
              title="Açık Pozisyon (Open Interest)"
              content={openInterest.interpretation}
            />
          </div>
          <div className="text-sm font-black text-stone-900">
            ${openInterest.valueUsd}B USD
          </div>
          <span
            className={`inline-block mt-1 border border-stone-900 text-[8px] font-black px-1 rounded-xs ${
              openInterest.change24hUsd >= 0
                ? 'bg-emerald-100 text-emerald-950'
                : 'bg-rose-100 text-rose-950'
            }`}
          >
            24S: {openInterest.change24hUsd >= 0 ? '+' : ''}${openInterest.change24hUsd}M
          </span>
          {openInterest.bias && (
            <span className="inline-block mt-1 bg-stone-900 text-amber-300 text-[8px] font-black px-1 rounded-xs uppercase">
              {openInterest.bias === 'long-buildup' ? 'Long birikimi' : openInterest.bias === 'short-buildup' ? 'Short birikimi' : openInterest.bias === 'unwinding' ? 'Kaldıraç çözülüyor' : 'Yatay OI'}
            </span>
          )}
          {openInterest.freshness.isStale && <div className="mt-1.5"><StaleBadge /></div>}
        </div>
      </div>

      {/* 7. BTC TEKNİK RADAR — sayaç genişlik ister: tam boy, içte 2 bölme */}
      <div
        className={`lg:col-span-12 h-full p-4 sm:p-5 bg-white border-2 border-stone-900 rounded-lg shadow-hard stagger-item ${staleCardClass(technicalIndicator.freshness.isStale)}`}
        style={{ '--stagger-idx': 6 } as React.CSSProperties}
      >
        <CardHeader
          kicker="[07 // TEKNİK]"
          icon={<Target className="w-4 h-4 text-rose-600" />}
          title="BTC TEKNİK RADAR"
          right={
            <span
              className={`text-[10px] font-black border border-stone-900 px-1.5 py-0.5 rounded shadow-hard-sm ${
                technicalIndicator.rsiStatus === 'oversold'
                  ? 'bg-emerald-200 text-emerald-950'
                  : technicalIndicator.rsiStatus === 'overbought'
                  ? 'bg-rose-200 text-rose-950'
                  : 'bg-amber-100 text-stone-950'
              }`}
            >
              RSI: {technicalIndicator.rsi14}
            </span>
          }
          infoTitle="BTC Teknik Seviyeler"
          infoContent={`${technicalIndicator.trendLabel} (20 Günlük Basit Hareketli Ortalama: $${technicalIndicator.sma20Price.toLocaleString()}). RSI 30 altı aşırı satım, 70 üzeri aşırı alım bölgesidir.`}
        />

        {/* RSI Meter + Ortalamalar yan yana */}
        <div className="grid sm:grid-cols-5 gap-3 items-center">
        <div className="sm:col-span-3">
          <div className="relative w-full h-3.5 rounded border-2 border-stone-900 bg-stone-100 overflow-hidden flex shadow-hard-sm">
            <div style={{ width: '30%' }} className="bg-emerald-200 border-r border-stone-900" title="Aşırı Satım (0-30)" />
            <div style={{ width: '40%' }} className="bg-amber-100 border-r border-stone-900" title="Dengeli Bölge (30-70)" />
            <div style={{ width: '30%' }} className="bg-rose-200" title="Aşırı Alım (70-100)" />
            {/* Needle */}
            <div
              style={{ left: `${Math.max(2, Math.min(98, technicalIndicator.rsi14))}%` }}
              className="absolute top-0 bottom-0 w-1.5 bg-stone-950 shadow-md"
            />
          </div>
          <div className="flex justify-between text-[8px] font-bold text-stone-500 mt-1">
            <span>0 (Aşırı Satım)</span>
            <span className="text-stone-900 font-black">{technicalIndicator.rsiLabel}</span>
            <span>100 (Aşırı Alım)</span>
          </div>
        </div>

        {(technicalIndicator.ema50Price !== undefined || technicalIndicator.sma200Price !== undefined) && (
          <div className="sm:col-span-2 p-2 bg-stone-50 border border-stone-900 rounded text-[10px] font-bold text-stone-700 flex flex-wrap gap-x-3 gap-y-1">
            {technicalIndicator.ema50Price !== undefined && <span>EMA50: ${technicalIndicator.ema50Price.toLocaleString()}</span>}
            {technicalIndicator.sma200Price !== undefined && <span>SMA200: ${technicalIndicator.sma200Price.toLocaleString()}</span>}
            {technicalIndicator.crossSignal && <span className="text-stone-900 font-black">• {technicalIndicator.crossSignal}</span>}
          </div>
        )}
        </div>
        <SourceFooter source={technicalIndicator.freshness.source} updatedAt={technicalIndicator.freshness.updatedAt} isStale={technicalIndicator.freshness.isStale} />
      </div>
      </div>{/* /BENTO GRID */}

      <p className="mt-4 p-3 bg-white border-2 border-stone-900 rounded-lg shadow-hard-sm text-[10px] text-stone-600 font-sans leading-relaxed">
        Bu ekran bilgilendirme amaçlıdır, <strong>yatırım tavsiyesi değildir</strong>. Türev ve on-chain göstergeler gecikmeli veya önbellekten gelebilir; sönük kartlara dayanarak işlem yapmayın.
      </p>
    </div>
  );
};
