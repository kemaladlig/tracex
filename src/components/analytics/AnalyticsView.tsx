import React, { useEffect, useState } from 'react';
import {
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
  Zap,
} from 'lucide-react';
import { fetchComprehensiveAnalytics } from '../../services/onChainApi';
import { useCryptoStore } from '../../store/useCryptoStore';

export const AnalyticsView: React.FC = () => {
  const analyticsData = useCryptoStore((state) => state.analyticsData);
  const setAnalyticsData = useCryptoStore((state) => state.setAnalyticsData);
  const [isLoading, setIsLoading] = useState<boolean>(!analyticsData);
  const [hoveredFng, setHoveredFng] = useState<{ date: string; value: number } | null>(null);

  const loadData = () => {
    setIsLoading(true);
    fetchComprehensiveAnalytics().then((data) => {
      setAnalyticsData(data);
      setIsLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  if (isLoading || !analyticsData) {
    return (
      <div className="pb-24 pt-2 px-3 font-mono max-w-2xl mx-auto animate-pulse">
        {/* Skeleton Title */}
        <div className="flex items-center justify-between mb-3 border-b-2 border-stone-900 pb-2">
          <div className="h-4 w-44 bg-stone-300 rounded" />
          <div className="h-6 w-6 bg-stone-200 border border-stone-400 rounded" />
        </div>

        {/* Skeleton 1: Macro Phase Card */}
        <div className="p-4 bg-stone-800 border-2 border-stone-900 rounded-lg shadow-hard mb-3.5">
          <div className="flex justify-between mb-3">
            <div className="h-3.5 w-36 bg-stone-700 rounded" />
            <div className="h-4 w-16 bg-stone-700 rounded" />
          </div>
          <div className="h-3 w-48 bg-stone-600 rounded mb-2" />
          <div className="h-2.5 w-full bg-stone-700 rounded mb-1" />
          <div className="h-2.5 w-3/4 bg-stone-700 rounded" />
        </div>

        {/* Skeleton 2: FNG 4-boxes */}
        <div className="p-4 bg-white border-2 border-stone-900 rounded-lg shadow-hard mb-3.5">
          <div className="h-3.5 w-40 bg-stone-200 rounded mb-3" />
          <div className="grid grid-cols-4 gap-1.5 mb-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-stone-100 border border-stone-300 rounded" />
            ))}
          </div>
          <div className="h-14 bg-stone-50 border border-stone-200 rounded" />
        </div>

        {/* Skeleton 3: Dominance Bar */}
        <div className="p-4 bg-white border-2 border-stone-900 rounded-lg shadow-hard mb-3.5">
          <div className="h-3.5 w-48 bg-stone-200 rounded mb-3" />
          <div className="h-3.5 w-full bg-stone-200 rounded mb-2" />
          <div className="h-10 bg-stone-100 border border-stone-200 rounded" />
        </div>

        {/* Skeleton 4: Long/Short & MVRV */}
        <div className="p-4 bg-white border-2 border-stone-900 rounded-lg shadow-hard mb-3.5">
          <div className="h-3.5 w-36 bg-stone-200 rounded mb-3" />
          <div className="h-3 w-full bg-stone-200 rounded" />
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

  // SVG parameters for 14-day FNG trendline
  const fngPoints = fearAndGreed.history;
  const svgWidth = 280;
  const svgHeight = 65;
  const padding = 8;
  const minVal = 0;
  const maxVal = 100;

  const pointsString = fngPoints
    .map((pt, idx) => {
      const x = padding + (idx / (fngPoints.length - 1)) * (svgWidth - 2 * padding);
      const y =
        svgHeight - padding - ((pt.value - minVal) / (maxVal - minVal)) * (svgHeight - 2 * padding);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="pb-24 pt-2 px-3 font-mono max-w-2xl mx-auto">
      {/* Title & Refresh */}
      <div className="flex items-center justify-between mb-3 border-b-2 border-stone-900 pb-2">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wider text-stone-950 flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-600 fill-amber-400" />
            RADAR // PİYASA & ZİNCİR İSTİHBARATI
          </h2>
          <p className="text-[10px] text-stone-500 font-bold">
            100% CANLI VERİLERLE OTOMATİK MAKRO STRATEJİ MOTORU
          </p>
        </div>
        <button
          onClick={loadData}
          className="p-1.5 bg-stone-100 border border-stone-900 rounded shadow-hard-sm hover:bg-stone-200 active:translate-x-[1px] active:translate-y-[1px] transition-all"
          title="Verileri Güncelle"
        >
          <RefreshCw className="w-3.5 h-3.5 text-stone-900" />
        </button>
      </div>

      {/* 1. MAKRO FAZ & RİSK SKORU KARTI */}
      <div
        className="p-4 bg-stone-900 text-stone-100 border-2 border-stone-900 rounded-lg shadow-hard mb-3.5 stagger-item"
        style={{ '--stagger-idx': 0 } as React.CSSProperties}
      >
        <div className="flex items-center justify-between pb-2 border-b border-stone-800 mb-3">
          <span className="text-[10px] tracking-widest text-amber-400 font-bold uppercase">
            {macroPhase.title}
          </span>
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
        </div>

        <div className="mb-2.5">
          <div className="text-xs font-bold text-amber-300 uppercase mb-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block shrink-0" />
            <span>{macroPhase.verdict}</span>
          </div>
          <p className="text-xs text-stone-300 leading-relaxed font-sans">
            {macroPhase.strategy}
          </p>
        </div>

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
      </div>

      {/* 2. KORKU & AÇGÖZLÜLÜK // ÇOKLU ZAMAN KIYASLAMASI & 14 GÜNLÜK TREND */}
      <div
        className="p-4 bg-white border-2 border-stone-900 rounded-lg shadow-hard mb-3.5 stagger-item"
        style={{ '--stagger-idx': 1 } as React.CSSProperties}
      >
        <div className="flex items-center justify-between pb-2 border-b-2 border-stone-900/40 mb-3">
          <div className="flex items-center gap-1.5 text-xs font-black text-stone-900 uppercase">
            <Gauge className="w-4 h-4 text-amber-600" />
            <span>KORKU & AÇGÖZLÜLÜK ENDEKSİ</span>
          </div>
          <span className="text-[10px] font-bold text-stone-500">
            KAYNAK: ALTERNATIVE.ME (CANLI)
          </span>
        </div>

        {/* 4 Multi-period Comparison Boxes (Today, Yesterday, Last Week, Last Month) */}
        <div className="grid grid-cols-4 gap-1.5 mb-3.5">
          {/* Today */}
          <div className="p-2 bg-amber-50 border-2 border-stone-900 rounded shadow-hard-sm text-center">
            <span className="text-[9px] font-bold text-stone-600 uppercase block">ŞU AN (BUGÜN)</span>
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
              {fearAndGreed.classification}
            </span>
          </div>

          {/* Last Week */}
          <div className="p-2 bg-stone-50 border border-stone-900 rounded text-center">
            <span className="text-[9px] font-bold text-stone-500 uppercase block">GEÇEN HAFTA</span>
            <div className="text-base font-black text-stone-800 mt-0.5">{fearAndGreed.lastWeek}</div>
            <span className="text-[8px] font-bold uppercase text-stone-600 block truncate">
              {fearAndGreed.classification}
            </span>
          </div>

          {/* Last Month */}
          <div className="p-2 bg-stone-50 border border-stone-900 rounded text-center">
            <span className="text-[9px] font-bold text-stone-500 uppercase block">GEÇEN AY</span>
            <div className="text-base font-black text-stone-800 mt-0.5">{fearAndGreed.lastMonth}</div>
            <span className="text-[8px] font-bold uppercase text-stone-600 block truncate">
              {fearAndGreed.classification}
            </span>
          </div>
        </div>

        {/* 14-Day Micro Historical Trend Chart with hover inspection */}
        <div className="mt-2 pt-2 border-t border-stone-200">
          <div className="flex items-center justify-between text-[10px] text-stone-600 font-bold mb-1">
            <span>14 GÜNLÜK DUYGU DALGASI</span>
            <span>
              {hoveredFng ? (
                <strong className="text-amber-800">
                  {hoveredFng.date}: Skor {hoveredFng.value}
                </strong>
              ) : (
                'Son 14 Gün Eğilimi'
              )}
            </span>
          </div>

          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-16 bg-stone-50 rounded border border-stone-900/60 p-1"
            onMouseLeave={() => setHoveredFng(null)}
          >
            {/* Guide line at 50 */}
            <line
              x1="0"
              y1={svgHeight / 2}
              x2={svgWidth}
              y2={svgHeight / 2}
              stroke="#d6d3d1"
              strokeDasharray="3,3"
            />
            {/* The SVG Trendline */}
            <polyline
              fill="none"
              stroke="#d97706"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={pointsString}
            />
            {/* Interactive Data Dots */}
            {fngPoints.map((pt, idx) => {
              const x = padding + (idx / (fngPoints.length - 1)) * (svgWidth - 2 * padding);
              const y =
                svgHeight -
                padding -
                ((pt.value - minVal) / (maxVal - minVal)) * (svgHeight - 2 * padding);
              return (
                <circle
                  key={pt.date}
                  cx={x}
                  cy={y}
                  r="3.5"
                  fill="#f59e0b"
                  stroke="#1c1917"
                  strokeWidth="1.5"
                  className="cursor-pointer hover:r-5 transition-all"
                  onMouseEnter={() => setHoveredFng(pt)}
                />
              );
            })}
          </svg>
        </div>
      </div>

      {/* 3. KRİPTO PAZAR HAKİMİYETİ & ALTCOİN RADARI */}
      <div
        className="p-4 bg-white border-2 border-stone-900 rounded-lg shadow-hard mb-3.5 stagger-item"
        style={{ '--stagger-idx': 2 } as React.CSSProperties}
      >
        <div className="flex items-center justify-between pb-2 border-b-2 border-stone-900/40 mb-3">
          <div className="flex items-center gap-1.5 text-xs font-black text-stone-900 uppercase">
            <PieChart className="w-4 h-4 text-indigo-600" />
            <span>PAZAR HAKİMİYETİ (BTC DOMINANCE)</span>
          </div>
          <span className="text-[10px] font-black bg-indigo-50 border border-stone-900 px-1.5 py-0.5 rounded shadow-hard-sm">
            BTC.D: %{marketDominance.btcD}
          </span>
        </div>

        {/* 3-Segment Stacked Bar */}
        <div className="mb-2">
          <div className="flex justify-between text-[11px] font-black mb-1">
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

        {/* Global Market Overview */}
        <div className="grid grid-cols-2 gap-2 mt-2.5 p-2 bg-stone-50 border border-stone-900 rounded text-xs">
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

        <p className="text-[10px] text-stone-600 mt-2 leading-relaxed">
          {marketDominance.interpretation}
        </p>
      </div>

      {/* 4. VADELİ PİYASA LONG / SHORT DENGESİ & FONLAMA ORANI */}
      <div
        className="p-4 bg-white border-2 border-stone-900 rounded-lg shadow-hard mb-3.5 stagger-item"
        style={{ '--stagger-idx': 3 } as React.CSSProperties}
      >
        <div className="flex items-center justify-between pb-2 border-b-2 border-stone-900/40 mb-3">
          <div className="flex items-center gap-1.5 text-xs font-black text-stone-900 uppercase">
            <Flame className="w-4 h-4 text-amber-600" />
            <span>BİNANCE VADELİ: LONG / SHORT ÇEKİŞMESİ</span>
          </div>
          <span className="text-[10px] font-black bg-stone-100 border border-stone-900 px-1.5 py-0.5 rounded shadow-hard-sm">
            ORAN: {longShortRatio.ratio}
          </span>
        </div>

        {/* Dual Bar (Long vs Short) */}
        <div className="mb-2">
          <div className="flex justify-between text-xs font-black mb-1">
            <span className="text-emerald-700 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 stroke-[3]" /> %{longShortRatio.longPercent} LONG
            </span>
            <span className="text-rose-700 flex items-center gap-1">
              %{longShortRatio.shortPercent} SHORT <TrendingDown className="w-3.5 h-3.5 stroke-[3]" />
            </span>
          </div>
          <div className="w-full h-3 rounded border-2 border-stone-900 overflow-hidden flex shadow-hard-sm">
            <div
              style={{ width: `${longShortRatio.longPercent}%` }}
              className="bg-emerald-300 border-r border-stone-900"
            />
            <div style={{ width: `${longShortRatio.shortPercent}%` }} className="bg-rose-300" />
          </div>
        </div>

        <p className="text-[10px] text-stone-600 mt-2 leading-relaxed">
          {longShortRatio.description}
        </p>

        {/* Funding Rate Box */}
        <div className="mt-3 p-2.5 bg-stone-50 border border-stone-900 rounded flex items-center justify-between text-xs">
          <div>
            <span className="text-[9px] text-stone-500 uppercase font-bold block">
              Fonlama Oranı (Funding Rate)
            </span>
            <span className="font-black text-stone-900">%{fundingRate.ratePercent}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-black bg-amber-200 border border-stone-900 px-1.5 py-0.5 rounded">
              {fundingRate.hourlyCost}
            </span>
          </div>
        </div>
      </div>

      {/* 5. MVRV ORANI (DÖNGÜ TEPE / DİP CETVELİ) */}
      <div
        className="p-4 bg-white border-2 border-stone-900 rounded-lg shadow-hard mb-3.5 stagger-item"
        style={{ '--stagger-idx': 4 } as React.CSSProperties}
      >
        <div className="flex items-center justify-between pb-2 border-b-2 border-stone-900/40 mb-3">
          <div className="flex items-center gap-1.5 text-xs font-black text-stone-900 uppercase">
            <LineChart className="w-4 h-4 text-purple-600" />
            <span>MVRV ORANI // DÖNGÜ ISITICISI</span>
          </div>
          <span className="text-xs font-black bg-stone-900 text-amber-300 px-2 py-0.5 rounded shadow-hard-sm">
            SKOR: {mvrvRatio.value} (CANLI)
          </span>
        </div>

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
          <div className="flex justify-between text-[9px] font-bold text-stone-500 mt-1">
            <span>0.8 (Tarihi Ayı Dibi)</span>
            <span className="text-stone-900 font-black">[ŞU AN: {mvrvRatio.value}]</span>
            <span>3.7+ (Boğa Tepesi/Satış)</span>
          </div>
        </div>

        <p className="text-[10px] text-stone-600 mt-2 leading-relaxed">
          {mvrvRatio.interpretation}
        </p>
      </div>

      {/* 6. GERÇEK EMİR AKIŞI (TAKER VOLUME) & AÇIK POZİSYON (OPEN INTEREST) */}
      <div
        className="grid grid-cols-2 gap-2.5 text-xs mb-3.5 stagger-item"
        style={{ '--stagger-idx': 5 } as React.CSSProperties}
      >
        {/* Taker Buy vs Sell Volume */}
        <div className="p-3 bg-white border-2 border-stone-900 rounded-lg shadow-hard flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1 text-[9px] text-stone-500 font-bold uppercase mb-1">
              <BarChart3 className="w-3 h-3 text-emerald-600" /> Taker Emir Akışı
            </div>
            <div className="text-xs font-black text-stone-900">
              %{takerVolume.buyPercent} Alış / %{takerVolume.sellPercent} Satış
            </div>
            <div className="w-full h-2 rounded border border-stone-900 overflow-hidden flex my-1.5">
              <div style={{ width: `${takerVolume.buyPercent}%` }} className="bg-emerald-400" />
              <div style={{ width: `${takerVolume.sellPercent}%` }} className="bg-rose-400" />
            </div>
            <span className="inline-block mt-0.5 bg-stone-100 border border-stone-900 text-stone-900 text-[8px] font-black px-1 rounded-xs">
              {takerVolume.signal}
            </span>
          </div>
          <p className="text-[9px] text-stone-500 mt-2 leading-tight">
            Piyasa emriyle anlık agresif işlem yapan hacim dağılımı.
          </p>
        </div>

        {/* Open Interest */}
        <div className="p-3 bg-white border-2 border-stone-900 rounded-lg shadow-hard flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1 text-[9px] text-stone-500 font-bold uppercase mb-1">
              <Layers className="w-3 h-3 text-indigo-600" /> Açık Pozisyon (OI)
            </div>
            <div className="text-xs font-black text-stone-900">
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
          </div>
          <p className="text-[9px] text-stone-500 mt-2 leading-tight">
            {openInterest.interpretation}
          </p>
        </div>
      </div>

      {/* 7. BİTCOİN GÜNLÜK TEKNİK GÖSTERGE (RSI 14 & 20G ORTALAMA) */}
      <div
        className="p-4 bg-white border-2 border-stone-900 rounded-lg shadow-hard stagger-item"
        style={{ '--stagger-idx': 6 } as React.CSSProperties}
      >
        <div className="flex items-center justify-between pb-2 border-b-2 border-stone-900/40 mb-3">
          <div className="flex items-center gap-1.5 text-xs font-black text-stone-900 uppercase">
            <Target className="w-4 h-4 text-rose-600" />
            <span>BTC TEKNİK RADAR (RSI 14 & ORTALAMALAR)</span>
          </div>
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
        </div>

        {/* RSI Meter Bar */}
        <div className="mb-2">
          <div className="relative w-full h-3 rounded border-2 border-stone-900 bg-stone-100 overflow-hidden flex shadow-hard-sm">
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

        {/* Trend summary */}
        <p className="text-[10px] text-stone-600 mt-2 font-medium">
          {technicalIndicator.trendLabel} (20G SMA: ${technicalIndicator.sma20Price.toLocaleString()})
        </p>
      </div>
    </div>
  );
};
