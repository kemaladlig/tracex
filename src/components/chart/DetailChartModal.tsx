import React, { useEffect, useRef, useState, useTransition } from 'react';
import {
  createChart,
  ColorType,
  CandlestickSeries,
  AreaSeries,
  HistogramSeries,
  LineSeries,
  LineStyle,
} from 'lightweight-charts';
import type {
  IChartApi,
  ISeriesApi,
  CandlestickData,
  AreaData,
  HistogramData,
  LineData,
  UTCTimestamp,
} from 'lightweight-charts';
import {
  X,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  BarChart2,
  LineChart,
  Layers,
  Activity,
  Tag,
} from 'lucide-react';
import { useCryptoStore } from '../../store/useCryptoStore';
import { fetchHistoricalKlines } from '../../services/binanceApi';
import { cleanSymbol, formatCurrency, formatPercentage } from '../../utils/formatters';

const INTERVALS = [
  { label: '1dk', value: '1m' },
  { label: '15dk', value: '15m' },
  { label: '1s', value: '1h' },
  { label: '4s', value: '4h' },
  { label: '1g', value: '1d' },
  { label: '1h', value: '1w' },
];

const calculateEMA = (data: { time: UTCTimestamp; close: number }[], period: number) => {
  if (data.length < period) return [];
  const k = 2 / (period + 1);
  const result: { time: UTCTimestamp; value: number }[] = [];
  let ema = data.slice(0, period).reduce((sum, d) => sum + d.close, 0) / period;
  result.push({ time: data[period - 1].time, value: parseFloat(ema.toFixed(4)) });
  for (let i = period; i < data.length; i++) {
    ema = data[i].close * k + ema * (1 - k);
    result.push({ time: data[i].time, value: parseFloat(ema.toFixed(4)) });
  }
  return result;
};

const calculateSMA = (data: { time: UTCTimestamp; close: number }[], period: number) => {
  if (data.length < period) return [];
  const result: { time: UTCTimestamp; value: number }[] = [];
  for (let i = period - 1; i < data.length; i++) {
    const sum = data.slice(i - period + 1, i + 1).reduce((acc, d) => acc + d.close, 0);
    result.push({ time: data[i].time, value: parseFloat((sum / period).toFixed(4)) });
  }
  return result;
};

export const DetailChartModal: React.FC = () => {
  const selectedSymbol = useCryptoStore((state) => state.selectedCoinForChart);
  const setSelectedSymbol = useCryptoStore((state) => state.setSelectedCoinForChart);
  const ticker = useCryptoStore((state) => (selectedSymbol ? state.tickers[selectedSymbol] : undefined));
  const portfolio = useCryptoStore((state) => state.portfolio);
  const currency = useCryptoStore((state) => state.currency);
  const tryRate = useCryptoStore((state) => state.tryRate);
  const eurRate = useCryptoStore((state) => state.eurRate);

  const activeRate = currency === 'TRY' ? tryRate : eurRate;
  const userAsset = portfolio.find((a) => a.symbol === selectedSymbol);

  const [interval, setInterval] = useState<string>('1h');
  const [chartType, setChartType] = useState<'candlestick' | 'area'>('candlestick');
  const [showVolume, setShowVolume] = useState<boolean>(true);
  const [showEMA, setShowEMA] = useState<boolean>(false);
  const [showCostLine, setShowCostLine] = useState<boolean>(true);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [hoveredData, setHoveredData] = useState<{
    open: number;
    high: number;
    low: number;
    close: number;
    time: string;
  } | null>(null);

  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const areaSeriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const lastCandleRef = useRef<CandlestickData<UTCTimestamp> | null>(null);
  const lastAreaPointRef = useRef<AreaData<UTCTimestamp> | null>(null);

  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!selectedSymbol || !chartContainerRef.current) return;

    let isCancelled = false;
    setIsLoading(true);
    setError(null);
    setHoveredData(null);

    const container = chartContainerRef.current;
    container.innerHTML = '';

    // Blueprint / Paper styled chart
    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: '#faf7f0' },
        textColor: '#1c1917',
      },
      grid: {
        vertLines: { color: 'rgba(28, 25, 23, 0.08)' },
        horzLines: { color: 'rgba(28, 25, 23, 0.08)' },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: '#1c1917',
        autoScale: true,
      },
      timeScale: {
        borderColor: '#1c1917',
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: true,
      handleScale: true,
      autoSize: true,
    });

    chartRef.current = chart;

    let candleSeries: ISeriesApi<'Candlestick'> | null = null;
    let areaSeries: ISeriesApi<'Area'> | null = null;

    if (chartType === 'candlestick') {
      try {
        candleSeries = chart.addSeries(CandlestickSeries, {
          upColor: '#16a34a',
          downColor: '#dc2626',
          borderVisible: true,
          borderColor: '#1c1917',
          wickUpColor: '#16a34a',
          wickDownColor: '#dc2626',
        });
      } catch {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error fallback
        candleSeries = chart.addCandlestickSeries();
      }
      candleSeriesRef.current = candleSeries;
    } else {
      try {
        areaSeries = chart.addSeries(AreaSeries, {
          lineColor: '#1c1917',
          topColor: 'rgba(217, 119, 6, 0.35)',
          bottomColor: 'rgba(217, 119, 6, 0.02)',
          lineWidth: 3,
          crosshairMarkerVisible: true,
          crosshairMarkerRadius: 5,
          crosshairMarkerBorderColor: '#1c1917',
          crosshairMarkerBackgroundColor: '#d97706',
        });
      } catch {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error fallback
        areaSeries = chart.addAreaSeries();
      }
      areaSeriesRef.current = areaSeries;
    }

    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData) {
        setHoveredData(null);
        return;
      }
      const activeSeries = candleSeries || areaSeries;
      if (activeSeries) {
        const data = param.seriesData.get(activeSeries);
        if (data && 'open' in data) {
          const candle = data as CandlestickData<UTCTimestamp>;
          const date = new Date(Number(candle.time) * 1000);
          setHoveredData({
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
            time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          });
        } else if (data && 'value' in data) {
          const area = data as AreaData<UTCTimestamp>;
          const date = new Date(Number(area.time) * 1000);
          setHoveredData({
            open: area.value,
            high: area.value,
            low: area.value,
            close: area.value,
            time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          });
        }
      }
    });

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0 || !chartRef.current) return;
      const { width, height } = entries[0].contentRect;
      chartRef.current.applyOptions({ width, height });
    });

    resizeObserver.observe(container);

    fetchHistoricalKlines(selectedSymbol, interval, 120)
      .then((data) => {
        if (isCancelled) return;
        if (data.length === 0) {
          setError('Grafik verisi alınamadı.');
          setIsLoading(false);
          return;
        }

        const primarySeries = candleSeries || areaSeries;

        if (chartType === 'candlestick' && candleSeries) {
          const formattedData: CandlestickData<UTCTimestamp>[] = data.map((d) => ({
            time: d.time as UTCTimestamp,
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
          }));
          candleSeries.setData(formattedData);
          lastCandleRef.current = formattedData[formattedData.length - 1];
        } else if (areaSeries) {
          const formattedArea: AreaData<UTCTimestamp>[] = data.map((d) => ({
            time: d.time as UTCTimestamp,
            value: d.close,
          }));
          areaSeries.setData(formattedArea);
          lastAreaPointRef.current = formattedArea[formattedArea.length - 1];
        }

        // 1. Optional Volume Sub-Series
        if (showVolume) {
          try {
            const volumeSeries = chart.addSeries(HistogramSeries, {
              priceFormat: { type: 'volume' },
              priceScaleId: '',
            });
            volumeSeries.priceScale().applyOptions({
              scaleMargins: {
                top: 0.82,
                bottom: 0,
              },
            });
            const volumeData: HistogramData<UTCTimestamp>[] = data.map((d) => ({
              time: d.time as UTCTimestamp,
              value: d.volume ?? 0,
              color: d.close >= d.open ? 'rgba(22, 163, 74, 0.45)' : 'rgba(220, 38, 38, 0.45)',
            }));
            volumeSeries.setData(volumeData);
          } catch (e) {
            console.warn('Volume series fallback:', e);
          }
        }

        // 2. Optional EMA 20 & SMA 50 Trend Lines
        if (showEMA) {
          try {
            const closes = data.map((d) => ({ time: d.time as UTCTimestamp, close: d.close }));
            const ema20 = calculateEMA(closes, 20);
            const sma50 = calculateSMA(closes, 50);

            if (ema20.length > 0) {
              const emaSeries = chart.addSeries(LineSeries, {
                color: '#d97706',
                lineWidth: 2,
                title: 'EMA20',
                crosshairMarkerVisible: false,
              });
              emaSeries.setData(ema20 as LineData<UTCTimestamp>[]);
            }

            if (sma50.length > 0) {
              const smaSeries = chart.addSeries(LineSeries, {
                color: '#2563eb',
                lineWidth: 2,
                title: 'SMA50',
                crosshairMarkerVisible: false,
              });
              smaSeries.setData(sma50 as LineData<UTCTimestamp>[]);
            }
          } catch (e) {
            console.warn('EMA series fallback:', e);
          }
        }

        // 3. Optional Portfolio Entry Cost Line
        if (showCostLine && userAsset && primarySeries) {
          try {
            const convertedCost =
              currency === 'TRY'
                ? userAsset.buyPrice * tryRate
                : currency === 'EUR'
                ? userAsset.buyPrice * eurRate
                : userAsset.buyPrice;

            primarySeries.createPriceLine({
              price: convertedCost,
              color: '#1c1917',
              lineWidth: 2,
              lineStyle: LineStyle.Dashed,
              axisLabelVisible: true,
              title: `MALİYETİM (${formatCurrency(userAsset.buyPrice, currency, activeRate)})`,
            });
          } catch (e) {
            console.warn('Cost line fallback:', e);
          }
        }

        chart.timeScale().fitContent();
        setIsLoading(false);
      })
      .catch((err) => {
        if (isCancelled) return;
        console.error('Error fetching candles:', err);
        setError('Grafik yüklenirken bir hata oluştu.');
        setIsLoading(false);
      });

    return () => {
      isCancelled = true;
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      areaSeriesRef.current = null;
      lastCandleRef.current = null;
      lastAreaPointRef.current = null;
    };
  }, [
    selectedSymbol,
    interval,
    chartType,
    showVolume,
    showEMA,
    showCostLine,
    currency,
    tryRate,
    eurRate,
    activeRate,
    userAsset,
  ]);

  // Handle live WebSocket price updates on the active chart
  useEffect(() => {
    if (!ticker) return;
    const currentPrice = ticker.price;

    if (chartType === 'candlestick' && candleSeriesRef.current && lastCandleRef.current) {
      const prev = lastCandleRef.current;
      const updatedCandle: CandlestickData<UTCTimestamp> = {
        time: prev.time,
        open: prev.open,
        high: Math.max(prev.high, currentPrice),
        low: Math.min(prev.low, currentPrice),
        close: currentPrice,
      };
      lastCandleRef.current = updatedCandle;
      candleSeriesRef.current.update(updatedCandle);
    } else if (chartType === 'area' && areaSeriesRef.current && lastAreaPointRef.current) {
      const updatedArea: AreaData<UTCTimestamp> = {
        time: lastAreaPointRef.current.time,
        value: currentPrice,
      };
      lastAreaPointRef.current = updatedArea;
      areaSeriesRef.current.update(updatedArea);
    }
  }, [ticker, chartType]);

  if (!selectedSymbol) return null;

  const { base, quote } = cleanSymbol(selectedSymbol);
  const isPositive = (ticker?.changePercent24h ?? 0) >= 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#f4f0e6] animate-in fade-in duration-150 font-mono">
      {/* Top Bar / Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b-2 border-stone-900 bg-[#ede8dd] pt-safe">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-md bg-stone-900 text-amber-300 border-2 border-stone-900 flex items-center justify-center font-black text-sm shadow-hard-sm">
            {base.substring(0, 3)}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-black text-stone-900">{base}</h2>
              <span className="text-[10px] text-stone-700 bg-stone-200 border border-stone-900 px-1 rounded-xs font-bold">
                /{quote}
              </span>
            </div>
            <p className="text-[10px] text-stone-600 font-bold">BİNANCE CANLI GRAFİK</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Chart Type Toggle Button */}
          <div className="flex items-center bg-white p-0.5 rounded border-2 border-stone-900 shadow-hard-sm">
            <button
              onClick={() => setChartType('candlestick')}
              title="Mum Grafiği"
              className={`p-1.5 rounded transition cursor-pointer ${
                chartType === 'candlestick'
                  ? 'bg-amber-300 text-stone-900 font-bold'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              <BarChart2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setChartType('area')}
              title="Çizgi Grafiği"
              className={`p-1.5 rounded transition cursor-pointer ${
                chartType === 'area'
                  ? 'bg-amber-300 text-stone-900 font-bold'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              <LineChart className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setSelectedSymbol(null)}
            className="p-1.5 rounded-md bg-white border-2 border-stone-900 hover:bg-stone-200 shadow-hard-sm btn-hard cursor-pointer"
          >
            <X className="w-4 h-4 stroke-[3]" />
          </button>
        </div>
      </div>

      {/* Ticker Price & Stats Overview */}
      <div className="px-4 py-2.5 bg-[#faf7f0] border-b-2 border-stone-900">
        <div className="flex items-baseline justify-between mb-2">
          <div className="flex items-baseline gap-2.5">
            <span className="text-2xl font-black text-stone-900 tracking-tight">
              {ticker ? formatCurrency(ticker.price, currency, activeRate) : '...'}
            </span>
            {ticker && (
              <span
                className={`inline-flex items-center gap-0.5 text-xs font-black px-1.5 py-0.5 rounded border border-stone-900 ${
                  isPositive
                    ? 'bg-emerald-200 text-emerald-950'
                    : 'bg-rose-200 text-rose-950'
                }`}
              >
                {isPositive ? (
                  <ArrowUpRight className="w-3 h-3 stroke-[3]" />
                ) : (
                  <ArrowDownRight className="w-3 h-3 stroke-[3]" />
                )}
                {formatPercentage(ticker.changePercent24h)}
              </span>
            )}
          </div>
        </div>

        {/* Hovered OHLC Details Bar OR 24h Stats Bar */}
        {hoveredData ? (
          <div className="flex items-center gap-3 text-[10px] text-stone-900 bg-white px-2.5 py-1 rounded border-2 border-stone-900 shadow-hard-sm mb-1 overflow-x-auto no-scrollbar">
            <span className="text-stone-500 font-bold">{hoveredData.time}</span>
            <span>
              A:{' '}
              <strong className="text-stone-900">
                {formatCurrency(hoveredData.open, currency, activeRate)}
              </strong>
            </span>
            <span>
              Y:{' '}
              <strong className="text-emerald-700">
                {formatCurrency(hoveredData.high, currency, activeRate)}
              </strong>
            </span>
            <span>
              D:{' '}
              <strong className="text-rose-700">
                {formatCurrency(hoveredData.low, currency, activeRate)}
              </strong>
            </span>
            <span>
              K:{' '}
              <strong className="text-stone-900">
                {formatCurrency(hoveredData.close, currency, activeRate)}
              </strong>
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-white border-2 border-stone-900 rounded p-1.5 shadow-hard-sm">
              <span className="text-[9px] text-stone-500 block font-bold uppercase">24s En Yüksek</span>
              <span className="text-stone-900 font-black">
                {ticker ? formatCurrency(ticker.high24h, currency, activeRate) : '--'}
              </span>
            </div>
            <div className="bg-white border-2 border-stone-900 rounded p-1.5 shadow-hard-sm">
              <span className="text-[9px] text-stone-500 block font-bold uppercase">24s En Düşük</span>
              <span className="text-stone-900 font-black">
                {ticker ? formatCurrency(ticker.low24h, currency, activeRate) : '--'}
              </span>
            </div>
            <div className="bg-white border-2 border-stone-900 rounded p-1.5 shadow-hard-sm">
              <span className="text-[9px] text-stone-500 block font-bold uppercase">24s Hacim</span>
              <span className="text-stone-900 font-black">
                {ticker?.quoteVolume ? `${(ticker.quoteVolume / 1_000_000).toFixed(1)}M` : '--'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Interval Selector Tabs & Feature Toggles Bar */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-[#ede8dd] border-b-2 border-stone-900">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          <Clock className="w-3.5 h-3.5 text-stone-600 mr-1 shrink-0" />
          {INTERVALS.map((item) => (
            <button
              key={item.value}
              onClick={() => {
                startTransition(() => {
                  setInterval(item.value);
                });
              }}
              className={`px-2 py-0.5 rounded text-xs font-bold transition-all shrink-0 border cursor-pointer ${
                interval === item.value
                  ? 'bg-stone-900 text-white border-stone-900 shadow-hard-sm'
                  : 'bg-white text-stone-700 border-stone-900/40 hover:bg-stone-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Feature Toggles (Volume, EMA, Cost Line) */}
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {/* Volume Toggle */}
          <button
            onClick={() => setShowVolume(!showVolume)}
            className={`px-1.5 py-0.5 rounded text-[10px] font-black border border-stone-900 transition flex items-center gap-0.5 cursor-pointer ${
              showVolume
                ? 'bg-amber-300 text-stone-900 shadow-hard-sm'
                : 'bg-white text-stone-500 hover:text-stone-900'
            }`}
            title="Hacim Barlarını Aç/Kapa"
          >
            <Layers className="w-3 h-3" /> VOL
          </button>

          {/* EMA Toggle */}
          <button
            onClick={() => setShowEMA(!showEMA)}
            className={`px-1.5 py-0.5 rounded text-[10px] font-black border border-stone-900 transition flex items-center gap-0.5 cursor-pointer ${
              showEMA
                ? 'bg-amber-300 text-stone-900 shadow-hard-sm'
                : 'bg-white text-stone-500 hover:text-stone-900'
            }`}
            title="EMA 20 ve SMA 50 Trend Çizgilerini Aç/Kapa"
          >
            <Activity className="w-3 h-3" /> EMA
          </button>

          {/* My Cost Line Toggle (Only if user owns this asset) */}
          {userAsset && (
            <button
              onClick={() => setShowCostLine(!showCostLine)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-black border border-stone-900 transition flex items-center gap-0.5 cursor-pointer ${
                showCostLine
                  ? 'bg-emerald-300 text-stone-950 shadow-hard-sm'
                  : 'bg-white text-stone-500 hover:text-stone-900'
              }`}
              title="Cüzdan Alış Maliyeti Seviyesini Göster/Gizle"
            >
              <Tag className="w-3 h-3" /> MALİYET
            </button>
          )}
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div className="relative flex-1 w-full bg-[#faf7f0] overflow-hidden min-h-[300px]">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#faf7f0]/80 backdrop-blur-xs">
            <div className="w-7 h-7 border-2 border-stone-900 border-t-amber-400 rounded-full animate-spin mb-2" />
            <p className="text-xs text-stone-700 font-bold">Grafik verisi yükleniyor...</p>
          </div>
        )}

        {error && !isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4 text-center">
            <p className="text-xs text-rose-700 font-bold mb-2">{error}</p>
            <button
              onClick={() => setInterval((prev) => prev)}
              className="px-3 py-1 bg-amber-300 border-2 border-stone-900 text-stone-900 rounded text-xs font-bold shadow-hard-sm btn-hard cursor-pointer"
            >
              Tekrar Dene
            </button>
          </div>
        )}

        <div ref={chartContainerRef} className="w-full h-full" />
      </div>

      <div className="pb-safe bg-[#ede8dd] border-t-2 border-stone-900" />
    </div>
  );
};
