import React, { useEffect, useRef, useState, useTransition } from 'react';
import { createChart, ColorType, CandlestickSeries, AreaSeries } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, CandlestickData, AreaData, UTCTimestamp } from 'lightweight-charts';
import { X, TrendingUp, TrendingDown, Clock, BarChart2, LineChart } from 'lucide-react';
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

export const DetailChartModal: React.FC = () => {
  const selectedSymbol = useCryptoStore((state) => state.selectedCoinForChart);
  const setSelectedSymbol = useCryptoStore((state) => state.setSelectedCoinForChart);
  const ticker = useCryptoStore((state) => (selectedSymbol ? state.tickers[selectedSymbol] : undefined));

  const [interval, setInterval] = useState<string>('1h');
  const [chartType, setChartType] = useState<'candlestick' | 'area'>('candlestick');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Hovered bar state for detailed OHLC display
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

  const [, startTransition] = useTransition();

  // Load chart & historical klines when symbol, interval, or chart type changes
  useEffect(() => {
    if (!selectedSymbol || !chartContainerRef.current) return;

    let isCancelled = false;
    setIsLoading(true);
    setError(null);
    setHoveredData(null);

    const container = chartContainerRef.current;
    container.innerHTML = '';

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: '#0b0e14' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: 'rgba(30, 41, 59, 0.35)' },
        horzLines: { color: 'rgba(30, 41, 59, 0.35)' },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: '#1e293b',
        autoScale: true,
      },
      timeScale: {
        borderColor: '#1e293b',
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
        if (typeof chart.addSeries === 'function' && CandlestickSeries) {
          candleSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#10b981',
            downColor: '#ef4444',
            borderVisible: false,
            wickUpColor: '#10b981',
            wickDownColor: '#ef4444',
          });
        } else {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error fallback
          candleSeries = chart.addCandlestickSeries({
            upColor: '#10b981',
            downColor: '#ef4444',
            borderVisible: false,
            wickUpColor: '#10b981',
            wickDownColor: '#ef4444',
          });
        }
      } catch {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error fallback
        candleSeries = chart.addCandlestickSeries();
      }
      candleSeriesRef.current = candleSeries;
    } else {
      try {
        if (typeof chart.addSeries === 'function' && AreaSeries) {
          areaSeries = chart.addSeries(AreaSeries, {
            lineColor: '#6366f1',
            topColor: 'rgba(99, 102, 241, 0.4)',
            bottomColor: 'rgba(99, 102, 241, 0.0)',
            lineWidth: 2,
          });
        } else {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error fallback
          areaSeries = chart.addAreaSeries({
            lineColor: '#6366f1',
            topColor: 'rgba(99, 102, 241, 0.4)',
            bottomColor: 'rgba(99, 102, 241, 0.0)',
            lineWidth: 2,
          });
        }
      } catch {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error fallback
        areaSeries = chart.addAreaSeries();
      }
      areaSeriesRef.current = areaSeries;
    }

    // Subscribe to crosshair move for OHLC display
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
    };
  }, [selectedSymbol, interval, chartType]);

  // Live WebSocket update on last candle/point
  useEffect(() => {
    if (!ticker) return;

    if (chartType === 'candlestick' && candleSeriesRef.current && lastCandleRef.current) {
      const currentPrice = ticker.price;
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
    } else if (chartType === 'area' && areaSeriesRef.current) {
      const currentPrice = ticker.price;
      const nowSeconds = Math.floor(Date.now() / 1000) as UTCTimestamp;
      areaSeriesRef.current.update({
        time: nowSeconds,
        value: currentPrice,
      });
    }
  }, [ticker?.price, chartType]);

  if (!selectedSymbol) return null;

  const { base, quote } = cleanSymbol(selectedSymbol);
  const isPositive = (ticker?.changePercent24h ?? 0) >= 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0b0e14] animate-in fade-in duration-200">
      {/* Top Bar / Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 bg-[#0e121a]/90 backdrop-blur-md pt-safe">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center font-bold text-sm text-indigo-400">
            {base.substring(0, 3)}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-bold text-white tracking-tight">{base}</h2>
              <span className="text-xs text-slate-400 font-medium bg-slate-800 px-1.5 py-0.5 rounded font-mono">
                /{quote}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Binance Canlı Akış</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Chart Type Toggle Button */}
          <div className="flex items-center bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/60">
            <button
              onClick={() => setChartType('candlestick')}
              title="Mum Grafiği"
              className={`p-1.5 rounded-md transition ${
                chartType === 'candlestick'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setChartType('area')}
              title="Çizgi Grafiği"
              className={`p-1.5 rounded-md transition ${
                chartType === 'area'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LineChart className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setSelectedSymbol(null)}
            className="p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Ticker Price & Stats Overview */}
      <div className="px-4 py-3 bg-[#0d1117] border-b border-slate-800/60">
        <div className="flex items-baseline justify-between mb-2">
          <div className="flex items-baseline gap-2.5">
            <span className="text-2xl font-black text-white font-mono tracking-tight">
              {ticker ? formatCurrency(ticker.price) : '...'}
            </span>
            {ticker && (
              <span
                className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-md font-mono ${
                  isPositive
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                }`}
              >
                {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {formatPercentage(ticker.changePercent24h)}
              </span>
            )}
          </div>
        </div>

        {/* Hovered OHLC Details Bar */}
        {hoveredData ? (
          <div className="flex items-center gap-3 text-[11px] font-mono text-slate-300 bg-slate-800/50 px-2.5 py-1 rounded-lg border border-slate-700/40 mb-2 overflow-x-auto no-scrollbar">
            <span className="text-slate-500">{hoveredData.time}</span>
            <span>A: <strong className="text-white">{formatCurrency(hoveredData.open)}</strong></span>
            <span>Y: <strong className="text-emerald-400">{formatCurrency(hoveredData.high)}</strong></span>
            <span>D: <strong className="text-rose-400">{formatCurrency(hoveredData.low)}</strong></span>
            <span>K: <strong className="text-white">{formatCurrency(hoveredData.close)}</strong></span>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-2">
              <span className="text-[10px] text-slate-400 block font-medium">24s En Yüksek</span>
              <span className="text-slate-200 font-semibold font-mono">
                {ticker ? formatCurrency(ticker.high24h) : '--'}
              </span>
            </div>
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-2">
              <span className="text-[10px] text-slate-400 block font-medium">24s En Düşük</span>
              <span className="text-slate-200 font-semibold font-mono">
                {ticker ? formatCurrency(ticker.low24h) : '--'}
              </span>
            </div>
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-2">
              <span className="text-[10px] text-slate-400 block font-medium">24s Hacim (USDT)</span>
              <span className="text-slate-200 font-semibold font-mono">
                {ticker?.quoteVolume
                  ? `${(ticker.quoteVolume / 1_000_000).toFixed(2)}M`
                  : '--'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Interval Selector Tabs */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#0c1016] border-b border-slate-800/40">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          <Clock className="w-3.5 h-3.5 text-slate-500 mr-1 shrink-0" />
          {INTERVALS.map((item) => (
            <button
              key={item.value}
              onClick={() => {
                startTransition(() => {
                  setInterval(item.value);
                });
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                interval === item.value
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="text-[11px] text-slate-500 font-medium shrink-0 ml-2">
          {chartType === 'candlestick' ? 'Mum' : 'Çizgi'}
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div className="relative flex-1 w-full bg-[#0b0e14] overflow-hidden min-h-[300px]">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0b0e14]/80 backdrop-blur-xs">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-xs text-slate-400 font-medium">Grafik verisi yükleniyor...</p>
          </div>
        )}

        {error && !isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4 text-center">
            <p className="text-sm text-rose-400 mb-2">{error}</p>
            <button
              onClick={() => setInterval((prev) => prev)}
              className="px-3 py-1.5 bg-slate-800 text-slate-200 rounded-lg text-xs font-semibold"
            >
              Tekrar Dene
            </button>
          </div>
        )}

        <div ref={chartContainerRef} className="w-full h-full" />
      </div>

      {/* Mobile Safe Bottom Space */}
      <div className="pb-safe bg-[#0b0e14]" />
    </div>
  );
};
