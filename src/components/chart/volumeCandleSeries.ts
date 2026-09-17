import type {
  CanvasRenderingTarget2D,
} from 'fancy-canvas';
import {
  customSeriesDefaultOptions,
  type CustomSeriesOptions,
  type ICustomSeriesPaneView,
  type ICustomSeriesPaneRenderer,
  type PaneRendererCustomData,
  type PriceToCoordinateConverter,
  type CustomData,
  type CustomSeriesPricePlotValues,
  type CustomSeriesWhitespaceData,
  type Time,
} from 'lightweight-charts';

export interface VolumeCandleData extends CustomData<Time> {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

class VolumeCandleRenderer implements ICustomSeriesPaneRenderer {
  private _data: PaneRendererCustomData<Time, VolumeCandleData> | null = null;

  update(data: PaneRendererCustomData<Time, VolumeCandleData>) {
    this._data = data;
  }

  draw(
    target: CanvasRenderingTarget2D,
    priceConverter: PriceToCoordinateConverter,
  ): void {
    target.useMediaCoordinateSpace(({ context }) => {
      if (!this._data || !this._data.bars.length) return;
      const bars = this._data.bars;
      const visibleRange = this._data.visibleRange;
      if (!visibleRange) return;

      let minVol = Infinity;
      let maxVol = -Infinity;
      for (let i = visibleRange.from; i < visibleRange.to; i++) {
        const b = bars[i];
        if (b?.originalData?.volume) {
          if (b.originalData.volume < minVol) minVol = b.originalData.volume;
          if (b.originalData.volume > maxVol) maxVol = b.originalData.volume;
        }
      }
      if (!isFinite(minVol)) {
        minVol = 0;
        maxVol = 1;
      }
      const volRange = maxVol - minVol;
      const barSpacing = this._data.barSpacing * this._data.conflationFactor;

      context.save();
      for (let i = visibleRange.from; i < visibleRange.to; i++) {
        const bar = bars[i];
        if (!bar) continue;
        const d = bar.originalData;
        const x = bar.x;
        const yOpen = priceConverter(d.open);
        const yClose = priceConverter(d.close);
        const yHigh = priceConverter(d.high);
        const yLow = priceConverter(d.low);

        if (yOpen === null || yClose === null || yHigh === null || yLow === null) continue;

        const isUp = d.close >= d.open;
        const rawVol = d.volume || 1;
        const normVol = volRange > 0 ? (rawVol - minVol) / volRange : 0.5;

        const minWidth = Math.max(2, barSpacing * 0.22);
        const maxWidth = Math.max(3.5, barSpacing * 0.92);
        const candleWidth = Math.min(maxWidth, Math.max(minWidth, minWidth + normVol * (maxWidth - minWidth)));

        // Draw wick
        context.strokeStyle = isUp ? '#16a34a' : '#dc2626';
        context.lineWidth = 1.5;
        context.beginPath();
        context.moveTo(x, yHigh);
        context.lineTo(x, yLow);
        context.stroke();

        // Draw body
        const bodyTop = Math.min(yOpen, yClose);
        const bodyHeight = Math.max(Math.abs(yClose - yOpen), 1.5);
        const bodyLeft = x - candleWidth / 2;

        context.fillStyle = isUp ? '#16a34a' : '#dc2626';
        context.fillRect(bodyLeft, bodyTop, candleWidth, bodyHeight);

        context.strokeStyle = '#1c1917';
        context.lineWidth = 1;
        context.strokeRect(bodyLeft, bodyTop, candleWidth, bodyHeight);
      }
      context.restore();
    });
  }
}

export class VolumeCandleSeriesView implements ICustomSeriesPaneView<Time, VolumeCandleData, CustomSeriesOptions> {
  private _renderer = new VolumeCandleRenderer();

  renderer(): ICustomSeriesPaneRenderer {
    return this._renderer;
  }

  update(data: PaneRendererCustomData<Time, VolumeCandleData>): void {
    this._renderer.update(data);
  }

  priceValueBuilder(plotRow: VolumeCandleData): CustomSeriesPricePlotValues {
    return [plotRow.high, plotRow.low, plotRow.close];
  }

  isWhitespace(data: VolumeCandleData | CustomSeriesWhitespaceData<Time>): data is CustomSeriesWhitespaceData<Time> {
    return (data as VolumeCandleData).close === undefined;
  }

  defaultOptions(): CustomSeriesOptions {
    return customSeriesDefaultOptions;
  }
}
