import React, { useEffect, useState } from 'react';
import {
  Activity,
  Compass,
  Flame,
  Fuel,
  Gauge,
  LineChart,
  RefreshCw,
  TrendingDown,
  TrendingUp,
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center font-mono">
        <div className="w-9 h-9 border-2 border-stone-900 border-t-amber-400 rounded-full animate-spin mb-3 shadow-hard-sm" />
        <h3 className="text-sm font-black text-stone-900 uppercase">
          ZİNCİR VE PİYASA VERİLERİ İŞLENİYOR
        </h3>
        <p className="text-xs text-stone-600 mt-1">
          Binance Vadeli, Mempool ve Duygu endeksleri taranıyor...
        </p>
      </div>
    );
  }

  const {
    macroPhase,
    fearAndGreed,
    longShortRatio,
    fundingRate,
    mvrvRatio,
    exchangeNetflow,
    gasTracker,
  } = analyticsData;

  // SVG Chart Calculation for 14-day Fear & Greed
  const fngPoints = fearAndGreed.history;
  const svgWidth = 320;
  const svgHeight = 70;
  const padding = 10;
  const minVal = 0;
  const maxVal = 100;

  const pointsString = fngPoints
    .map((p, i) => {
      const x = padding + (i / (fngPoints.length - 1)) * (svgWidth - 2 * padding);
      const y = svgHeight - padding - ((p.value - minVal) / (maxVal - minVal)) * (svgHeight - 2 * padding);
      return `${x},${y}`;
    })
    .join(' ');

  const areaPointsString = `${padding},${svgHeight} ${pointsString} ${svgWidth - padding},${svgHeight}`;

  return (
    <div className="flex flex-col pb-28 px-4 max-w-lg mx-auto w-full font-mono">
      {/* Top Header of the Intel Desk */}
      <div className="flex items-center justify-between my-3 pb-2 border-b-2 border-stone-900">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <h2 className="text-base font-black text-stone-900 uppercase tracking-tight">
              PİYASA & ZİNCİR İSTİHBARATI
            </h2>
          </div>
          <p className="text-[10px] text-stone-600 font-bold">
            GERÇEK ZAMANLI ON-CHAIN, VADELİ VE DUYGU ANALİZİ
          </p>
        </div>

        <button
          onClick={loadData}
          title="Verileri Yenile"
          className="p-1.5 bg-white hover:bg-stone-100 border-2 border-stone-900 rounded shadow-hard-sm btn-hard cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>
      </div>

      {/* 1. MAKRO PİYASA PUSULASI (Günün Kararı & Strateji) */}
      <div className="p-4 bg-white border-2 border-stone-900 rounded-lg shadow-hard mb-3.5">
        <div className="flex items-center justify-between pb-2 border-b-2 border-stone-900/40 mb-2">
          <div className="flex items-center gap-1.5 text-xs font-black text-stone-900 uppercase">
            <Compass className="w-4 h-4 text-amber-600" />
            <span>MAKRO PİYASA PUSULASI</span>
          </div>
          <span className="text-[10px] font-black bg-emerald-200 border border-stone-900 text-emerald-950 px-2 py-0.5 rounded shadow-hard-sm">
            {macroPhase.verdict}
          </span>
        </div>

        <div className="my-2">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-stone-600 font-bold">Genel Piyasa Risk Puanı:</span>
            <span className="font-black text-stone-900">{macroPhase.riskScore} / 10 (Orta-Düşük)</span>
          </div>
          {/* Risk Level Bar */}
          <div className="w-full h-2.5 rounded border border-stone-900 bg-stone-100 overflow-hidden flex shadow-hard-sm">
            <div
              style={{ width: `${macroPhase.riskScore * 10}%` }}
              className="bg-emerald-400 border-r border-stone-900"
            />
          </div>
        </div>

        <div className="p-2.5 bg-stone-50 border-2 border-stone-900/60 rounded mt-3 text-xs leading-relaxed text-stone-800">
          <strong className="text-stone-900 block mb-0.5">📌 Eylem / Strateji Tavsiyesi:</strong>
          {macroPhase.strategy}
        </div>
      </div>

      {/* 2. KORKU & AÇGÖZLÜLÜK ENDEKSİ + 14 GÜNLÜK TREND ÇİZGİSİ */}
      <div className="p-4 bg-white border-2 border-stone-900 rounded-lg shadow-hard mb-3.5">
        <div className="flex items-center justify-between pb-2 border-b-2 border-stone-900/40 mb-2.5">
          <div className="flex items-center gap-1.5 text-xs font-black text-stone-900 uppercase">
            <Gauge className="w-4 h-4 text-rose-600" />
            <span>KORKU & AÇGÖZLÜLÜK (SON 14 GÜN)</span>
          </div>
          <span className="text-xs font-black bg-amber-200 border border-stone-900 px-2 py-0.5 rounded shadow-hard-sm">
            {fearAndGreed.current} // {fearAndGreed.classification}
          </span>
        </div>

        {/* Hover label */}
        <div className="text-[11px] text-stone-600 mb-1 flex items-center justify-between">
          <span>{hoveredFng ? `${hoveredFng.date}: ${hoveredFng.value} Puan` : 'Duygu Değişim Eğrisi:'}</span>
          <span className="text-[10px] text-stone-500 font-bold">0 (Aşırı Korku) ➔ 100 (Coşku)</span>
        </div>

        {/* SVG Mini Trend Chart */}
        <div className="w-full bg-[#fbf9f4] border-2 border-stone-900 rounded p-2 overflow-hidden shadow-hard-sm relative">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-16 overflow-visible">
            {/* Background 50 Neutral Reference Line */}
            <line
              x1="0"
              y1={svgHeight / 2}
              x2={svgWidth}
              y2={svgHeight / 2}
              stroke="#d6d3d1"
              strokeDasharray="3 3"
              strokeWidth="1"
            />
            {/* Area Fill */}
            <polygon points={areaPointsString} fill="rgba(245, 158, 11, 0.15)" />
            {/* Main Trend Line */}
            <polyline
              fill="none"
              stroke="#1c1917"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={pointsString}
            />
            {/* Interactive Data Dots */}
            {fngPoints.map((pt, idx) => {
              const x = padding + (idx / (fngPoints.length - 1)) * (svgWidth - 2 * padding);
              const y =
                svgHeight - padding - ((pt.value - minVal) / (maxVal - minVal)) * (svgHeight - 2 * padding);
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

        <p className="text-[10px] text-stone-600 mt-2 font-medium">
          Duygu skoru 14 gün boyunca 50'nin üzerinde seyrederek piyasanın boğa iştahını koruduğunu teyit ediyor.
        </p>
      </div>

      {/* 3. VADELİ PİYASA LONG / SHORT DENGESİ & FONLAMA ORANI */}
      <div className="p-4 bg-white border-2 border-stone-900 rounded-lg shadow-hard mb-3.5">
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
            <span className="text-[9px] text-stone-500 uppercase font-bold block">Fonlama Oranı (Funding Rate)</span>
            <span className="font-black text-stone-900">%{fundingRate.ratePercent}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-black bg-amber-200 border border-stone-900 px-1.5 py-0.5 rounded">
              SAĞLIKLI KALDIRAÇ
            </span>
          </div>
        </div>
      </div>

      {/* 4. MVRV ORANI (DÖNGÜ TEPE / DİP CETVELİ) */}
      <div className="p-4 bg-white border-2 border-stone-900 rounded-lg shadow-hard mb-3.5">
        <div className="flex items-center justify-between pb-2 border-b-2 border-stone-900/40 mb-3">
          <div className="flex items-center gap-1.5 text-xs font-black text-stone-900 uppercase">
            <LineChart className="w-4 h-4 text-purple-600" />
            <span>MVRV ORANI // DÖNGÜ ISITICISI</span>
          </div>
          <span className="text-xs font-black bg-stone-900 text-amber-300 px-2 py-0.5 rounded shadow-hard-sm">
            SKOR: {mvrvRatio.value}
          </span>
        </div>

        {/* The Cycle Ruler Indicator */}
        <div className="my-2">
          <div className="relative w-full h-4 rounded border-2 border-stone-900 bg-gradient-to-r from-emerald-200 via-amber-200 to-rose-300 shadow-hard-sm overflow-hidden flex items-center">
            {/* Current Position Needle */}
            <div
              style={{ left: `${((mvrvRatio.value - 0.5) / (4.0 - 0.5)) * 100}%` }}
              className="absolute top-0 bottom-0 w-1.5 bg-stone-950 shadow-md"
              title={`Şu anki MVRV: ${mvrvRatio.value}`}
            />
          </div>
          <div className="flex justify-between text-[9px] font-bold text-stone-500 mt-1">
            <span>0.8 (Tarihi Ayı Dibi)</span>
            <span className="text-stone-900 font-black">▲ ŞU AN ({mvrvRatio.value})</span>
            <span>3.7+ (Boğa Tepesi/Satış)</span>
          </div>
        </div>

        <p className="text-[10px] text-stone-600 mt-2 leading-relaxed">
          {mvrvRatio.interpretation}
        </p>
      </div>

      {/* 5. BALİNA BORSA AKIŞI & AĞ GAZI */}
      <div className="grid grid-cols-2 gap-2.5 text-xs">
        {/* Whale Netflow */}
        <div className="p-3 bg-white border-2 border-stone-900 rounded-lg shadow-hard flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1 text-[9px] text-stone-500 font-bold uppercase mb-1">
              <Activity className="w-3 h-3 text-emerald-600" /> Borsa Rezervi
            </div>
            <div className="text-sm font-black text-stone-900">
              -{exchangeNetflow.amountBtc.toLocaleString()} BTC
            </div>
            <span className="inline-block mt-1 bg-emerald-200 border border-stone-900 text-emerald-950 text-[9px] font-black px-1 rounded-xs">
              ARZ KIKTLIĞI
            </span>
          </div>
          <p className="text-[9px] text-stone-600 mt-2 leading-tight">
            {exchangeNetflow.interpretation}
          </p>
        </div>

        {/* Gas & Fee Timing */}
        <div className="p-3 bg-white border-2 border-stone-900 rounded-lg shadow-hard flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1 text-[9px] text-stone-500 font-bold uppercase mb-1">
              <Fuel className="w-3 h-3 text-indigo-600" /> Transfer Gazı
            </div>
            <div className="text-sm font-black text-stone-900">
              {gasTracker.ethGwei} Gwei <span className="text-[10px] text-stone-500 font-normal">/ ETH</span>
            </div>
            <span className="inline-block mt-1 bg-emerald-200 border border-stone-900 text-emerald-950 text-[9px] font-black px-1 rounded-xs">
              MÜKEMMEL ZAMAN
            </span>
          </div>
          <p className="text-[9px] text-stone-600 mt-2 leading-tight">
            {gasTracker.timingAdvice}
          </p>
        </div>
      </div>
    </div>
  );
};
