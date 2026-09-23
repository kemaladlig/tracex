import React from 'react';

interface SparklineProps {
  values: number[] | null;
  positive: boolean;
}

/** Tiny 24h trend polyline for desktop market rows — SVG transform-free, GPU-safe. */
export const Sparkline: React.FC<SparklineProps> = ({ values, positive }) => {
  if (!values || values.length < 2) {
    return (
      <div
        className="w-16 h-6 rounded bg-stone-100 border border-stone-300/70 animate-pulse"
        aria-hidden="true"
      />
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * 100;
      const y = 30 - ((v - min) / range) * 26;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');

  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="w-16 h-6" aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke={positive ? '#16a34a' : '#dc2626'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
};
