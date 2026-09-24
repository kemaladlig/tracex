export type TerminalTone = 'positive' | 'negative' | 'neutral' | 'warning';

export const TERMINAL_TONE_CLASSES: Record<TerminalTone, string> = {
  positive: 'border-emerald-700 bg-emerald-100 text-emerald-950',
  negative: 'border-rose-700 bg-rose-100 text-rose-950',
  warning: 'border-amber-700 bg-amber-100 text-amber-950',
  neutral: 'border-stone-700 bg-stone-100 text-stone-900',
};
