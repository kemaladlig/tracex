import type { FC } from 'react';
import { BarChart3, RefreshCw } from 'lucide-react';

export const AnalyticsSkeleton: FC = () => (
  <div className="px-3 pb-24 pt-3 font-mono md:px-6 lg:pb-10" aria-busy="true" aria-label="Analiz verileri yükleniyor">
    <div className="mb-4 flex items-center justify-between gap-3 border-b-2 border-stone-900 pb-3">
      <div>
        <div className="mb-2 h-2.5 w-32 animate-pulse rounded bg-stone-300" />
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-amber-600" />
          <div className="h-5 w-44 animate-pulse rounded bg-stone-300" />
        </div>
      </div>
      <div className="flex h-11 w-11 items-center justify-center rounded border-2 border-stone-900 bg-stone-100">
        <RefreshCw className="h-4 w-4 animate-spin" />
      </div>
    </div>

    <div className="border-2 border-stone-900 bg-stone-900 p-5 shadow-hard">
      <div className="h-2.5 w-36 animate-pulse rounded bg-stone-700" />
      <div className="mt-4 h-7 w-4/5 animate-pulse rounded bg-stone-700" />
      <div className="mt-3 h-3 w-full animate-pulse rounded bg-stone-800" />
      <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-stone-800" />
      <div className="mt-5 h-2 overflow-hidden rounded bg-stone-800">
        <div className="h-full w-1/2 animate-pulse bg-amber-400/60" />
      </div>
    </div>

    <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="h-20 animate-pulse rounded border-2 border-stone-900 bg-white shadow-hard-sm" />
      ))}
    </div>

    <div className="mt-4 grid gap-4 lg:grid-cols-12">
      <div className="h-80 animate-pulse rounded border-2 border-stone-900 bg-white shadow-hard lg:col-span-8" />
      <div className="h-64 animate-pulse rounded border-2 border-stone-900 bg-white shadow-hard lg:col-span-4" />
    </div>
  </div>
);
