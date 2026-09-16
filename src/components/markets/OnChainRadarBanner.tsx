import React, { useEffect, useState } from 'react';
import { Activity, ChevronDown, ChevronUp, Fuel, Gauge, Layers, LineChart } from 'lucide-react';
import { fetchOnChainMetrics } from '../../services/onChainApi';
import { useCryptoStore } from '../../store/useCryptoStore';
import type { OnChainMetrics } from '../../types/crypto';

export const OnChainRadarBanner: React.FC = () => {
  const onChainData = useCryptoStore((state) => state.onChainData);
  const setOnChainData = useCryptoStore((state) => state.setOnChainData);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(!onChainData);

  useEffect(() => {
    fetchOnChainMetrics().then((data: OnChainMetrics) => {
      setOnChainData(data);
      setIsLoading(false);
    });
  }, [setOnChainData]);

  if (isLoading || !onChainData) {
    return (
      <div className="p-3 bg-white border-2 border-stone-900 rounded-lg shadow-hard-sm my-2 text-center text-xs font-mono text-stone-600 animate-pulse">
        Zincir üstü (On-chain) veriler taranıyor...
      </div>
    );
  }

  const { fearAndGreed, exchangeNetflow, mvrvRatio, gasTracker, btcDominance } = onChainData;

  const fngColorClass =
    fearAndGreed.score >= 75
      ? 'bg-amber-300 text-stone-950'
      : fearAndGreed.score >= 50
      ? 'bg-emerald-200 text-emerald-950'
      : fearAndGreed.score >= 25
      ? 'bg-rose-200 text-rose-950'
      : 'bg-rose-300 text-rose-950';

  return (
    <div className="my-2.5 bg-[#fefcf8] border-2 border-stone-900 rounded-lg shadow-hard font-mono">
      {/* Header Bar */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between p-3 bg-[#ede8dd] border-b-2 border-stone-900 cursor-pointer select-none"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-stone-900 text-amber-300 flex items-center justify-center text-xs font-black shadow-hard-sm">
            Ω
          </div>
          <div>
            <h3 className="text-xs font-black text-stone-900 uppercase tracking-tight">
              ZİNCİR ÜSTÜ // ON-CHAIN RADAR
            </h3>
            <p className="text-[9px] text-stone-600 font-bold -mt-0.5">
              CANLI BALİNA, GAS VE DÖNGÜ GÖSTERGELERİ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Fear & Greed Mini Badge in header */}
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded border border-stone-900 text-[10px] font-black ${fngColorClass} shadow-hard-sm`}>
            <Gauge className="w-3 h-3 stroke-[2.5]" />
            <span>{fearAndGreed.score} // {fearAndGreed.classification}</span>
          </div>

          <button className="p-0.5 text-stone-700">
            {isExpanded ? <ChevronUp className="w-4 h-4 stroke-[3]" /> : <ChevronDown className="w-4 h-4 stroke-[3]" />}
          </button>
        </div>
      </div>

      {/* Expanded Metrics Grid */}
      {isExpanded && (
        <div className="p-3 grid grid-cols-2 gap-2 text-xs divide-stone-900">
          {/* 1. Borsa Net Akışı (Whale Netflow) */}
          <div className="p-2.5 bg-white border-2 border-stone-900 rounded-md shadow-hard-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-[9px] text-stone-500 font-bold uppercase mb-1">
                <span className="flex items-center gap-1">
                  <Activity className="w-3 h-3 text-emerald-600" /> Borsa Net Akışı
                </span>
                <span className="bg-emerald-100 text-emerald-950 border border-stone-900 px-1 rounded-xs">
                  BOĞA SİNYALİ
                </span>
              </div>
              <div className="text-sm font-black text-stone-900">
                -{exchangeNetflow.amountBtc.toLocaleString()} BTC
              </div>
            </div>
            <p className="text-[10px] text-stone-600 mt-1 leading-tight font-medium">
              Balinalar borsalardan soğuk cüzdanlara çekim yapıyor (Arz sıkışması).
            </p>
          </div>

          {/* 2. MVRV Oranı (Döngü Tepe/Dip) */}
          <div className="p-2.5 bg-white border-2 border-stone-900 rounded-md shadow-hard-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-[9px] text-stone-500 font-bold uppercase mb-1">
                <span className="flex items-center gap-1">
                  <LineChart className="w-3 h-3 text-amber-600" /> MVRV Oranı
                </span>
                <span className="bg-amber-200 text-stone-900 border border-stone-900 px-1 rounded-xs">
                  DENGELİ
                </span>
              </div>
              <div className="text-sm font-black text-stone-900">
                {mvrvRatio.value} (Döngü İçi)
              </div>
            </div>
            <p className="text-[10px] text-stone-600 mt-1 leading-tight font-medium">
              Aşırı ısınma yok (Tepe &gt; 3.5, Dip &lt; 1.0). Sağlıklı trend.
            </p>
          </div>

          {/* 3. Canlı Ağ Gazı (ETH & BTC) */}
          <div className="p-2.5 bg-white border-2 border-stone-900 rounded-md shadow-hard-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-[9px] text-stone-500 font-bold uppercase mb-1">
                <span className="flex items-center gap-1">
                  <Fuel className="w-3 h-3 text-indigo-600" /> Ağ Gaz Ücreti
                </span>
                <span className="bg-emerald-100 text-emerald-950 border border-stone-900 px-1 rounded-xs">
                  UCUZ
                </span>
              </div>
              <div className="text-sm font-black text-stone-900">
                {gasTracker.ethGwei} Gwei <span className="text-[11px] text-stone-500 font-normal">/ ETH</span>
              </div>
            </div>
            <p className="text-[10px] text-stone-600 mt-1 leading-tight font-medium">
              BTC Mempool: {gasTracker.btcSatVb} sat/vB. Transfer için ideal sakinlik.
            </p>
          </div>

          {/* 4. Bitcoin Dominansı (Altseason Metriği) */}
          <div className="p-2.5 bg-white border-2 border-stone-900 rounded-md shadow-hard-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-[9px] text-stone-500 font-bold uppercase mb-1">
                <span className="flex items-center gap-1">
                  <Layers className="w-3 h-3 text-purple-600" /> BTC Dominansı
                </span>
                <span className="bg-stone-200 text-stone-900 border border-stone-900 px-1 rounded-xs">
                  BTC.D
                </span>
              </div>
              <div className="text-sm font-black text-stone-900">
                %{btcDominance.percent}
              </div>
            </div>
            <p className="text-[10px] text-stone-600 mt-1 leading-tight font-medium">
              {btcDominance.signal}. Altcoin rallisi için %52 altı beklenir.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
