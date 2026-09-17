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
  ArrowLeft,
  X,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  BarChart2,
  LineChart,
  Layers,
  Activity,
  Tag,
  SlidersHorizontal,
} from 'lucide-react';
import { useCryptoStore } from '../../store/useCryptoStore';
import { fetchHistoricalKlines } from '../../services/binanceApi';
import { cleanSymbol, formatCurrency, formatPercentage } from '../../utils/formatters';
import { triggerHaptic } from '../../utils/haptics';

export type ModalChartType = 'candlestick' | 'heikin' | 'area';

const INTERVALS = [
  { label: '1dk', value: '1m' },
  { label: '5dk', value: '5m' },
  { label: '15dk', value: '15m' },
  { label: '1s', value: '1h' },
  { label: '4s', value: '4h' },
  { label: '1g', value: '1d' },
  { label: '1h', value: '1w' },
];

const INTERVAL_SECONDS: Record<string, number> = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '1h': 3600,
  '4h': 14400,
  '1d': 86400,
  '1w': 604800,
};

const ZOOM_STORAGE_KEY = 'tracex_chart_zoom_bars';
const CHART_INTERVAL_KEY = 'tracex_chart_interval';
const CHART_COST_LINE_KEY = 'tracex_chart_show_cost_line';

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

const calculateHeikinAshi = (
  data: CandlestickData<UTCTimestamp>[]
): CandlestickData<UTCTimestamp>[] => {
  if (data.length === 0) return [];
  const haData: CandlestickData<UTCTimestamp>[] = [];
  for (let i = 0; i < data.length; i++) {
    const curr = data[i];
    const haClose = (curr.open + curr.high + curr.low + curr.close) / 4;
    let haOpen: number;
    if (i === 0) {
      haOpen = (curr.open + curr.close) / 2;
    } else {
      haOpen = (haData[i - 1].open + haData[i - 1].close) / 2;
    }
    const haHigh = Math.max(curr.high, haOpen, haClose);
    const haLow = Math.min(curr.low, haOpen, haClose);
    haData.push({
      time: curr.time,
      open: parseFloat(haOpen.toFixed(4)),
      high: parseFloat(haHigh.toFixed(4)),
      low: parseFloat(haLow.toFixed(4)),
      close: parseFloat(haClose.toFixed(4)),
    });
  }
  return haData;
};

type PriceLineHandle = ReturnType<ISeriesApi<'Candlestick'>['createPriceLine']>;

export const DetailChartModal: React.FC = () => {
  const selectedSymbol = useCryptoStore((state) => state.selectedCoinForChart);
  const setSelectedSymbol = useCryptoStore((state) => state.setSelectedCoinForChart);
  const ticker = useCryptoStore((state) => (selectedSymbol ? state.tickers[selectedSymbol] : undefined));
  const portfolio = useCryptoStore((state) => state.portfolio);
  const currency = useCryptoStore((state) => state.currency);
  const tryRate = useCryptoStore((state) => state.tryRate);

  const activeRate = currency === 'TRY' ? tryRate : 1;
  const userAsset = portfolio.find((a) => a.symbol === selectedSymbol);

  const [interval, setInterval] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(CHART_INTERVAL_KEY);
      if (saved && ['1m', '5m', '15m', '1h', '4h', '1d', '1w'].includes(saved)) {
        return saved;
      }
    } catch {
      // ignore
    }
    return '1h';
  });

  const [chartType, setChartType] = useState<ModalChartType>(() => {
    try {
      const saved = localStorage.getItem('tracex_chart_type');
      if (saved === 'candlestick' || saved === 'heikin' || saved === 'area') {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'candlestick';
  });

  const [showVolume, setShowVolume] = useState<boolean>(true);
  const [showEMA, setShowEMA] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [showCostLine, setShowCostLine] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(CHART_COST_LINE_KEY);
      if (saved !== null) {
        return saved === 'true';
      }
    } catch {
      // ignore
    }
    return false;
  });

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
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const emaSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const smaSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const costLineRef = useRef<PriceLineHandle | null>(null);

  const rawCandlesRef = useRef<CandlestickData<UTCTimestamp>[]>([]);
  const lastCandleRef = useRef<CandlestickData<UTCTimestamp> | null>(null);
  const lastAreaPointRef = useRef<AreaData<UTCTimestamp> | null>(null);

  const [, startTransition] = useTransition();

  // 1. Core Chart Lifecycle: ONLY rebuilds when selectedSymbol or interval changes
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

    // Track user zoom adjustments and persist visible bar span
    chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (range) {
        const count = Math.round(range.to - range.from);
        if (count >= 10) {
          sessionStorage.setItem(ZOOM_STORAGE_KEY, String(count));
        }
      }
    });

    let candleSeries: ISeriesApi<'Candlestick'> | null = null;
    let areaSeries: ISeriesApi<'Area'> | null = null;
    let volumeSeries: ISeriesApi<'Histogram'> | null = null;
    let emaSeries: ISeriesApi<'Line'> | null = null;
    let smaSeries: ISeriesApi<'Line'> | null = null;

    // Candlestick Series (Serves both Klasik and Heikin-Ashi)
    try {
      candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#16a34a',
        downColor: '#dc2626',
        borderVisible: true,
        borderColor: '#1c1917',
        wickUpColor: '#16a34a',
        wickDownColor: '#dc2626',
        visible: chartType === 'candlestick' || chartType === 'heikin',
      });
    } catch {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error fallback
      candleSeries = chart.addCandlestickSeries({
        visible: chartType === 'candlestick' || chartType === 'heikin',
      });
    }
    candleSeriesRef.current = candleSeries;

    // Area Series
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
        visible: chartType === 'area',
      });
    } catch {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error fallback
      areaSeries = chart.addAreaSeries({ visible: chartType === 'area' });
    }
    areaSeriesRef.current = areaSeries;

    // Volume Series
    try {
      volumeSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: 'volume' },
        priceScaleId: '',
        visible: showVolume,
      });
      volumeSeries.priceScale().applyOptions({
        scaleMargins: {
          top: 0.82,
          bottom: 0,
        },
      });
      volumeSeriesRef.current = volumeSeries;
    } catch (e) {
      console.warn('Volume series fallback:', e);
    }

    // EMA Series
    try {
      emaSeries = chart.addSeries(LineSeries, {
        color: '#d97706',
        lineWidth: 2,
        title: 'EMA20',
        crosshairMarkerVisible: false,
        visible: showEMA,
      });
      emaSeriesRef.current = emaSeries;

      smaSeries = chart.addSeries(LineSeries, {
        color: '#2563eb',
        lineWidth: 2,
        title: 'SMA50',
        crosshairMarkerVisible: false,
        visible: showEMA,
      });
      smaSeriesRef.current = smaSeries;
    } catch (e) {
      console.warn('EMA series fallback:', e);
    }

    // Crosshair inspection listener
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData) {
        setHoveredData(null);
        return;
      }
      const activeSeries = chartType === 'area' ? areaSeriesRef.current : candleSeriesRef.current;
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

    // Fetch historical klines (1000 candles for maximum historical panning)
    fetchHistoricalKlines(selectedSymbol, interval, 1000)
      .then((data) => {
        if (isCancelled) return;
        if (data.length === 0) {
          setError('Grafik verisi alınamadı.');
          setIsLoading(false);
          return;
        }

        if (candleSeries) {
          const formattedData: CandlestickData<UTCTimestamp>[] = data.map((d) => ({
            time: d.time as UTCTimestamp,
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
          }));
          rawCandlesRef.current = formattedData;
          if (chartType === 'heikin') {
            const ha = calculateHeikinAshi(formattedData);
            candleSeries.setData(ha);
            lastCandleRef.current = ha[ha.length - 1];
          } else {
            candleSeries.setData(formattedData);
            lastCandleRef.current = formattedData[formattedData.length - 1];
          }
        }

        if (areaSeries) {
          const formattedArea: AreaData<UTCTimestamp>[] = data.map((d) => ({
            time: d.time as UTCTimestamp,
            value: d.close,
          }));
          areaSeries.setData(formattedArea);
          lastAreaPointRef.current = formattedArea[formattedArea.length - 1];
        }

        if (volumeSeries) {
          const volumeData: HistogramData<UTCTimestamp>[] = data.map((d) => ({
            time: d.time as UTCTimestamp,
            value: d.volume ?? 0,
            color: d.close >= d.open ? 'rgba(22, 163, 74, 0.45)' : 'rgba(220, 38, 38, 0.45)',
          }));
          volumeSeries.setData(volumeData);
        }

        const closes = data.map((d) => ({ time: d.time as UTCTimestamp, close: d.close }));
        const ema20 = calculateEMA(closes, 20);
        const sma50 = calculateSMA(closes, 50);
        if (emaSeries && ema20.length > 0) emaSeries.setData(ema20 as LineData<UTCTimestamp>[]);
        if (smaSeries && sma50.length > 0) smaSeries.setData(sma50 as LineData<UTCTimestamp>[]);

        // Restore user zoom preference or fit content gracefully
        const savedBarsStr = sessionStorage.getItem(ZOOM_STORAGE_KEY);
        const savedBars = savedBarsStr ? parseFloat(savedBarsStr) : null;
        if (savedBars && savedBars >= 10 && savedBars < data.length) {
          const lastIndex = data.length - 1;
          chart.timeScale().setVisibleLogicalRange({
            from: Math.max(0, lastIndex - savedBars),
            to: lastIndex + 2,
          });
        } else {
          chart.timeScale().fitContent();
        }

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
      volumeSeriesRef.current = null;
      emaSeriesRef.current = null;
      smaSeriesRef.current = null;
      costLineRef.current = null;
      lastCandleRef.current = null;
      lastAreaPointRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSymbol, interval]);

  // 2. Dynamic Series Visibility & Options: Toggles without tearing down the chart
  useEffect(() => {
    if (chartType === 'area') {
      candleSeriesRef.current?.applyOptions({ visible: false });
      areaSeriesRef.current?.applyOptions({ visible: true });
    } else {
      areaSeriesRef.current?.applyOptions({ visible: false });
      candleSeriesRef.current?.applyOptions({ visible: true });
      if (rawCandlesRef.current.length > 0 && candleSeriesRef.current) {
        if (chartType === 'heikin') {
          const ha = calculateHeikinAshi(rawCandlesRef.current);
          candleSeriesRef.current.setData(ha);
          lastCandleRef.current = ha[ha.length - 1];
        } else {
          candleSeriesRef.current.setData(rawCandlesRef.current);
          lastCandleRef.current = rawCandlesRef.current[rawCandlesRef.current.length - 1];
        }
      }
    }
  }, [chartType]);

  useEffect(() => {
    volumeSeriesRef.current?.applyOptions({ visible: showVolume });
  }, [showVolume]);

  useEffect(() => {
    emaSeriesRef.current?.applyOptions({ visible: showEMA });
    smaSeriesRef.current?.applyOptions({ visible: showEMA });
  }, [showEMA]);

  // 3. Independent Portfolio Cost Line: Updates smoothly on currency/rate changes without resetting chart
  useEffect(() => {
    const activeSeries = chartType === 'area' ? areaSeriesRef.current : candleSeriesRef.current;
    if (!activeSeries) return;

    if (costLineRef.current) {
      try {
        activeSeries.removePriceLine(costLineRef.current);
      } catch {
        // Series might have changed
      }
      costLineRef.current = null;
    }

    if (showCostLine && userAsset) {
      try {
        const convertedCost =
          currency === 'TRY'
            ? userAsset.buyPrice * tryRate
            : userAsset.buyPrice;

        costLineRef.current = activeSeries.createPriceLine({
          price: convertedCost,
          color: '#1c1917',
          lineWidth: 2,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `COST (${formatCurrency(userAsset.buyPrice, currency, activeRate)})`,
        });
      } catch (e) {
        console.warn('Cost line update fallback:', e);
      }
    }
  }, [showCostLine, userAsset, chartType, currency, tryRate, activeRate]);

  const handleIntervalChange = (val: string) => {
    startTransition(() => {
      setInterval(val);
    });
    try {
      localStorage.setItem(CHART_INTERVAL_KEY, val);
    } catch {
      // ignore
    }
  };

  const handleToggleCostLine = () => {
    setShowCostLine((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(CHART_COST_LINE_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // 4. Live WebSocket Price Streaming with Bar Rollover & Smooth Flow
  useEffect(() => {
    if (!ticker) return;
    const currentPrice = ticker.price;
    const nowSec = Math.floor(Date.now() / 1000);
    const barSec = INTERVAL_SECONDS[interval] || 3600;
    const currentBarTime = (Math.floor(nowSec / barSec) * barSec) as UTCTimestamp;

    // Update raw candle tracking
    if (rawCandlesRef.current.length > 0) {
      const lastRaw = rawCandlesRef.current[rawCandlesRef.current.length - 1];
      if (currentBarTime > lastRaw.time) {
        rawCandlesRef.current.push({
          time: currentBarTime,
          open: currentPrice,
          high: currentPrice,
          low: currentPrice,
          close: currentPrice,
        });
      } else {
        lastRaw.high = Math.max(lastRaw.high, currentPrice);
        lastRaw.low = Math.min(lastRaw.low, currentPrice);
        lastRaw.close = currentPrice;
      }
    }

    // Candlestick series live update
    if (candleSeriesRef.current && lastCandleRef.current) {
      if (chartType === 'heikin') {
        const len = rawCandlesRef.current.length;
        if (len >= 2) {
          const currRaw = rawCandlesRef.current[len - 1];
          const prevRaw = rawCandlesRef.current[len - 2];
          const haClose = (currRaw.open + currRaw.high + currRaw.low + currRaw.close) / 4;
          const haOpen = (prevRaw.open + prevRaw.close) / 2;
          const haHigh = Math.max(currRaw.high, haOpen, haClose);
          const haLow = Math.min(currRaw.low, haOpen, haClose);
          const updatedHa: CandlestickData<UTCTimestamp> = {
            time: currRaw.time,
            open: parseFloat(haOpen.toFixed(4)),
            high: parseFloat(haHigh.toFixed(4)),
            low: parseFloat(haLow.toFixed(4)),
            close: parseFloat(haClose.toFixed(4)),
          };
          lastCandleRef.current = updatedHa;
          candleSeriesRef.current.update(updatedHa);
        }
      } else if (chartType === 'candlestick') {
        const prev = lastCandleRef.current;
        if (currentBarTime > prev.time) {
          const newCandle: CandlestickData<UTCTimestamp> = {
            time: currentBarTime,
            open: currentPrice,
            high: currentPrice,
            low: currentPrice,
            close: currentPrice,
          };
          lastCandleRef.current = newCandle;
          candleSeriesRef.current.update(newCandle);
        } else {
          const updatedCandle: CandlestickData<UTCTimestamp> = {
            time: prev.time,
            open: prev.open,
            high: Math.max(prev.high, currentPrice),
            low: Math.min(prev.low, currentPrice),
            close: currentPrice,
          };
          lastCandleRef.current = updatedCandle;
          candleSeriesRef.current.update(updatedCandle);
        }
      }
    }

    // Area series live update
    if (areaSeriesRef.current && lastAreaPointRef.current) {
      const prev = lastAreaPointRef.current;
      if (currentBarTime > prev.time) {
        const newPoint: AreaData<UTCTimestamp> = {
          time: currentBarTime,
          value: currentPrice,
        };
        lastAreaPointRef.current = newPoint;
        areaSeriesRef.current.update(newPoint);
      } else {
        const updatedArea: AreaData<UTCTimestamp> = {
          time: prev.time,
          value: currentPrice,
        };
        lastAreaPointRef.current = updatedArea;
        areaSeriesRef.current.update(updatedArea);
      }
    }
  }, [ticker, interval]);

  const handleClose = () => {
    if (window.history.state?.modal === 'chart') {
      window.history.back();
    } else {
      setSelectedSymbol(null);
    }
  };

  // Support device/browser back button (popstate) and Escape key
  useEffect(() => {
    if (!selectedSymbol) return;

    // Push a state into browser history so hardware/browser back button closes modal
    window.history.pushState({ modal: 'chart', symbol: selectedSymbol }, '');

    const handlePopState = () => {
      setSelectedSymbol(null);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSymbol]);

  if (!selectedSymbol) return null;

  const { base, quote } = cleanSymbol(selectedSymbol);
  const isPositive = (ticker?.changePercent24h ?? 0) >= 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#f4f0e6] animate-sheetUp font-mono">
      {/* Top Bar / Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b-2 border-stone-900 bg-[#ede8dd] pt-safe">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Back Button (Primary navigation) */}
          <button
            onClick={handleClose}
            title="Geri Dön"
            className="p-1.5 rounded-md bg-white border-2 border-stone-900 hover:bg-stone-200 shadow-hard-sm btn-hard cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4 stroke-[3]" />
          </button>

          <div className="w-9 h-9 rounded-md bg-stone-900 text-amber-300 border-2 border-stone-900 flex items-center justify-center font-black text-sm shadow-hard-sm shrink-0">
            {base.substring(0, 3)}
          </div>
          <div className="min-w-0">
            <div className="flex items-baseline gap-1 truncate">
              <h2 className="text-base sm:text-lg font-black text-stone-900 tracking-tight">{base}</h2>
              <span className="text-xs font-bold text-stone-500 tracking-wide">
                / {quote}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Quick Settings Drawer Trigger */}
          <button
            onClick={() => {
              triggerHaptic('light');
              setIsSettingsOpen(true);
            }}
            className="px-2.5 py-1 rounded-md bg-white border-2 border-stone-900 hover:bg-stone-100 shadow-hard-sm btn-hard cursor-pointer flex items-center gap-1.5 text-xs font-black text-stone-900"
            title="Grafik ve Gösterge Ayarları"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>AYARLAR</span>
            {(showEMA || !showVolume || showCostLine || chartType !== 'candlestick') && (
              <span className="w-2 h-2 rounded-full bg-amber-400 border border-stone-900" />
            )}
          </button>

          {/* Desktop Close X */}
          <button
            onClick={handleClose}
            title="Kapat"
            className="hidden sm:flex p-1.5 rounded-md bg-white border-2 border-stone-900 hover:bg-stone-200 shadow-hard-sm btn-hard cursor-pointer"
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
              {hoveredData
                ? formatCurrency(hoveredData.close, currency, activeRate)
                : ticker
                ? formatCurrency(ticker.price, currency, activeRate)
                : '...'}
            </span>
            {hoveredData ? (
              <span
                className={`inline-flex items-center gap-0.5 text-xs font-black px-1.5 py-0.5 rounded border border-stone-900 ${
                  hoveredData.close >= hoveredData.open
                    ? 'bg-emerald-200 text-emerald-950'
                    : 'bg-rose-200 text-rose-950'
                }`}
              >
                {hoveredData.close >= hoveredData.open ? (
                  <ArrowUpRight className="w-3 h-3 stroke-[3]" />
                ) : (
                  <ArrowDownRight className="w-3 h-3 stroke-[3]" />
                )}
                {formatPercentage(
                  hoveredData.open > 0
                    ? ((hoveredData.close - hoveredData.open) / hoveredData.open) * 100
                    : 0
                )}
              </span>
            ) : ticker ? (
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
            ) : null}
          </div>

          {hoveredData ? (
            <span className="text-[10px] font-black bg-amber-300 text-stone-950 px-2 py-0.5 rounded border border-stone-900 shadow-hard-xs">
              MUM: {hoveredData.time}
            </span>
          ) : (
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
              24S PİYASA
            </span>
          )}
        </div>

        {/* Stable 4-card Grid: Zero layout shifts whether inspecting candle or viewing 24h stats */}
        {hoveredData ? (
          <div className="grid grid-cols-4 gap-1.5 text-xs">
            <div className="bg-white border-2 border-stone-900 rounded p-1.5 shadow-hard-sm min-w-0">
              <span className="text-[9px] text-stone-500 block font-bold uppercase truncate">Açılış</span>
              <span className="text-stone-900 font-black text-[11px] sm:text-xs truncate block">
                {formatCurrency(hoveredData.open, currency, activeRate)}
              </span>
            </div>
            <div className="bg-white border-2 border-stone-900 rounded p-1.5 shadow-hard-sm min-w-0">
              <span className="text-[9px] text-emerald-700 block font-bold uppercase truncate">Yüksek</span>
              <span className="text-emerald-700 font-black text-[11px] sm:text-xs truncate block">
                {formatCurrency(hoveredData.high, currency, activeRate)}
              </span>
            </div>
            <div className="bg-white border-2 border-stone-900 rounded p-1.5 shadow-hard-sm min-w-0">
              <span className="text-[9px] text-rose-700 block font-bold uppercase truncate">Düşük</span>
              <span className="text-rose-700 font-black text-[11px] sm:text-xs truncate block">
                {formatCurrency(hoveredData.low, currency, activeRate)}
              </span>
            </div>
            <div className="bg-white border-2 border-stone-900 rounded p-1.5 shadow-hard-sm min-w-0">
              <span className="text-[9px] text-stone-500 block font-bold uppercase truncate">Kapanış</span>
              <span
                className={`font-black text-[11px] sm:text-xs truncate block ${
                  hoveredData.close >= hoveredData.open ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {formatCurrency(hoveredData.close, currency, activeRate)}
              </span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-1.5 text-xs">
            <div className="bg-white border-2 border-stone-900 rounded p-1.5 shadow-hard-sm min-w-0">
              <span className="text-[9px] text-stone-500 block font-bold uppercase truncate">24s Yüksek</span>
              <span className="text-stone-900 font-black text-[11px] sm:text-xs truncate block">
                {ticker ? formatCurrency(ticker.high24h, currency, activeRate) : '--'}
              </span>
            </div>
            <div className="bg-white border-2 border-stone-900 rounded p-1.5 shadow-hard-sm min-w-0">
              <span className="text-[9px] text-stone-500 block font-bold uppercase truncate">24s Düşük</span>
              <span className="text-stone-900 font-black text-[11px] sm:text-xs truncate block">
                {ticker ? formatCurrency(ticker.low24h, currency, activeRate) : '--'}
              </span>
            </div>
            <div className="bg-white border-2 border-stone-900 rounded p-1.5 shadow-hard-sm min-w-0">
              <span className="text-[9px] text-stone-500 block font-bold uppercase truncate">24s Hacim</span>
              <span className="text-stone-900 font-black text-[11px] sm:text-xs truncate block">
                {ticker?.quoteVolume ? `${(ticker.quoteVolume / 1_000_000).toFixed(1)}M` : '--'}
              </span>
            </div>
            <div className="bg-white border-2 border-stone-900 rounded p-1.5 shadow-hard-sm min-w-0">
              <span className="text-[9px] text-stone-500 block font-bold uppercase truncate">24s Değişim</span>
              <span
                className={`font-black text-[11px] sm:text-xs truncate block ${
                  isPositive ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {ticker ? formatPercentage(ticker.changePercent24h) : '--'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Interval Selector Bar & Quick Active Indicators Status */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-[#ede8dd] border-b-2 border-stone-900 gap-2">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          <Clock className="w-3.5 h-3.5 text-stone-600 mr-0.5 shrink-0" />
          {INTERVALS.map((item) => (
            <button
              key={item.value}
              onClick={() => handleIntervalChange(item.value)}
              className={`px-2 py-0.5 rounded text-xs font-bold transition-all shrink-0 border cursor-pointer ${
                interval === item.value
                  ? 'bg-stone-900 text-white border-stone-900 shadow-hard-xs'
                  : 'bg-white text-stone-700 border-stone-900/40 hover:bg-stone-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Quick Active Indicators Summary Chips (Tap to open Quick Settings) */}
        <div
          onClick={() => {
            triggerHaptic('light');
            setIsSettingsOpen(true);
          }}
          className="flex items-center gap-1 shrink-0 cursor-pointer hover:opacity-85 transition"
          title="Ayarları ve Göstergeleri Düzenle"
        >
          <span className="text-[9px] font-black bg-stone-200 text-stone-900 px-1.5 py-0.5 rounded border border-stone-900/60 shadow-hard-xs uppercase">
            {chartType === 'heikin' ? 'HEIKIN' : chartType === 'area' ? 'ALAN' : 'MUM'}
          </span>
          {showVolume && (
            <span className="text-[9px] font-black bg-amber-200 text-amber-950 px-1 py-0.5 rounded border border-stone-900/60 shadow-hard-xs">
              VOL
            </span>
          )}
          {showEMA && (
            <span className="text-[9px] font-black bg-blue-200 text-blue-950 px-1 py-0.5 rounded border border-stone-900/60 shadow-hard-xs">
              EMA
            </span>
          )}
          {showCostLine && userAsset && (
            <span className="text-[9px] font-black bg-emerald-200 text-emerald-950 px-1 py-0.5 rounded border border-stone-900/60 shadow-hard-xs">
              COST
            </span>
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

      {/* Quick Settings Bottom Sheet Drawer */}
      {isSettingsOpen && (
        <div
          className="fixed inset-0 z-60 flex items-end justify-center bg-stone-900/60 backdrop-blur-xs p-0 sm:p-4 animate-fadeIn"
          onClick={() => setIsSettingsOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-[#faf7f0] border-t-2 sm:border-2 border-stone-900 rounded-t-xl sm:rounded-xl p-4 shadow-hard flex flex-col gap-3.5 animate-sheetUp max-h-[85dvh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-2 border-b-2 border-stone-900">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-stone-900" />
                <span className="text-xs font-black text-stone-900 uppercase tracking-wider">
                  GRAFİK & GÖSTERGE HIZLI AYARLARI
                </span>
              </div>
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setIsSettingsOpen(false);
                }}
                className="p-1 rounded bg-white border border-stone-900 hover:bg-stone-200 cursor-pointer shadow-hard-xs"
              >
                <X className="w-4 h-4 stroke-[3]" />
              </button>
            </div>

            {/* 1. Grafik Modeli (Chart Style) */}
            <div>
              <span className="text-[10px] font-black text-stone-500 uppercase tracking-wider block mb-1.5">
                // GRAFİK TİPİ
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    triggerHaptic('light');
                    setChartType('candlestick');
                    localStorage.setItem('tracex_chart_type', 'candlestick');
                  }}
                  className={`p-2 rounded border-2 border-stone-900 text-left transition cursor-pointer ${
                    chartType === 'candlestick'
                      ? 'bg-amber-300 text-stone-950 shadow-hard-sm'
                      : 'bg-white text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <BarChart2 className="w-4 h-4 mb-1" />
                  <div className="text-[11px] font-black uppercase">KLASİK MUM</div>
                  <div className="text-[9px] text-stone-600">Standart OHLC</div>
                </button>

                <button
                  onClick={() => {
                    triggerHaptic('light');
                    setChartType('heikin');
                    localStorage.setItem('tracex_chart_type', 'heikin');
                  }}
                  className={`p-2 rounded border-2 border-stone-900 text-left transition cursor-pointer ${
                    chartType === 'heikin'
                      ? 'bg-amber-300 text-stone-950 shadow-hard-sm'
                      : 'bg-white text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <Activity className="w-4 h-4 mb-1" />
                  <div className="text-[11px] font-black uppercase">HEIKIN-ASHI</div>
                  <div className="text-[9px] text-stone-600">Trend akışı</div>
                </button>

                <button
                  onClick={() => {
                    triggerHaptic('light');
                    setChartType('area');
                    localStorage.setItem('tracex_chart_type', 'area');
                  }}
                  className={`p-2 rounded border-2 border-stone-900 text-left transition cursor-pointer ${
                    chartType === 'area'
                      ? 'bg-amber-300 text-stone-950 shadow-hard-sm'
                      : 'bg-white text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <LineChart className="w-4 h-4 mb-1" />
                  <div className="text-[11px] font-black uppercase">ALAN / ÇİZGİ</div>
                  <div className="text-[9px] text-stone-600">Sürekli dalga</div>
                </button>
              </div>
            </div>

            {/* 2. Teknik Göstergeler (Indicators) */}
            <div>
              <span className="text-[10px] font-black text-stone-500 uppercase tracking-wider block mb-1.5">
                // TEKNİK KATMANLAR & GÖSTERGELER
              </span>
              <div className="space-y-1.5">
                {/* Volume Toggle */}
                <div
                  onClick={() => {
                    triggerHaptic('light');
                    setShowVolume(!showVolume);
                  }}
                  className="p-2.5 bg-white border-2 border-stone-900 rounded flex items-center justify-between cursor-pointer hover:bg-stone-50 shadow-hard-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <Layers className="w-4 h-4 text-stone-700 shrink-0" />
                    <div>
                      <div className="text-xs font-black text-stone-900">İŞLEM HACMİ (VOL)</div>
                      <div className="text-[9px] text-stone-500">Alt panelde yeşil/kırmızı hacim barları</div>
                    </div>
                  </div>
                  <div
                    className={`w-10 h-5 rounded-full border-2 border-stone-900 p-0.5 transition-colors shrink-0 ${
                      showVolume ? 'bg-amber-300' : 'bg-stone-200'
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full bg-stone-900 transition-transform ${
                        showVolume ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </div>

                {/* EMA / SMA Toggle */}
                <div
                  onClick={() => {
                    triggerHaptic('light');
                    setShowEMA(!showEMA);
                  }}
                  className="p-2.5 bg-white border-2 border-stone-900 rounded flex items-center justify-between cursor-pointer hover:bg-stone-50 shadow-hard-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <Activity className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <div className="text-xs font-black text-stone-900">HAREKETLİ ORTALAMALAR (EMA 20 & SMA 50)</div>
                      <div className="text-[9px] text-stone-500">Kısa ve orta vadeli trend kılavuzları</div>
                    </div>
                  </div>
                  <div
                    className={`w-10 h-5 rounded-full border-2 border-stone-900 p-0.5 transition-colors shrink-0 ${
                      showEMA ? 'bg-amber-300' : 'bg-stone-200'
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full bg-stone-900 transition-transform ${
                        showEMA ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </div>

                {/* Portfolio Cost Line Toggle */}
                {userAsset && (
                  <div
                    onClick={() => {
                      triggerHaptic('light');
                      handleToggleCostLine();
                    }}
                    className="p-2.5 bg-white border-2 border-stone-900 rounded flex items-center justify-between cursor-pointer hover:bg-stone-50 shadow-hard-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <Tag className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <div className="text-xs font-black text-stone-900">CÜZDAN MALİYETİ (COST)</div>
                        <div className="text-[9px] text-stone-500">
                          {formatCurrency(userAsset.buyPrice, currency, activeRate)} seviyesinde referans çizgisi
                        </div>
                      </div>
                    </div>
                    <div
                      className={`w-10 h-5 rounded-full border-2 border-stone-900 p-0.5 transition-colors shrink-0 ${
                        showCostLine ? 'bg-emerald-300' : 'bg-stone-200'
                      }`}
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded-full bg-stone-900 transition-transform ${
                          showCostLine ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Zaman Dilimleri (Intervals) */}
            <div>
              <span className="text-[10px] font-black text-stone-500 uppercase tracking-wider block mb-1.5">
                // ZAMAN PERİYODU
              </span>
              <div className="grid grid-cols-7 gap-1">
                {INTERVALS.map((item) => (
                  <button
                    key={item.value}
                    onClick={() => {
                      triggerHaptic('light');
                      handleIntervalChange(item.value);
                    }}
                    className={`py-1.5 rounded text-xs font-black border-2 border-stone-900 text-center transition cursor-pointer ${
                      interval === item.value
                        ? 'bg-stone-900 text-white shadow-hard-xs'
                        : 'bg-white text-stone-800 hover:bg-stone-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Close / Confirm Button */}
            <button
              onClick={() => {
                triggerHaptic('medium');
                setIsSettingsOpen(false);
              }}
              className="w-full py-2.5 bg-stone-900 text-amber-300 border-2 border-stone-900 rounded font-black text-xs uppercase shadow-hard btn-hard cursor-pointer tracking-wider mt-1"
            >
              TAMAMLA VE GRAFİĞE DÖN
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
