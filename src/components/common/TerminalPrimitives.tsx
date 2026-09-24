import type { FC, ReactNode } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import type { DataFreshness } from '../../types/crypto';
import { formatDateTime } from '../../utils/formatters';
import { InfoBadge } from './InfoBadge';
import { TERMINAL_TONE_CLASSES, type TerminalTone } from './terminalTokens';

export type { TerminalTone } from './terminalTokens';

export const StaleBadge: FC<{ label?: string }> = ({ label = 'Bayat' }) => (
  <span className="inline-flex min-h-5 items-center gap-1 rounded border border-amber-800 bg-amber-100 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-amber-950">
    <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
    {label}
  </span>
);

export const SourceFooter: FC<DataFreshness> = ({ source, updatedAt, isStale }) => (
  <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-dashed border-stone-300 pt-2 text-[8px] font-bold uppercase text-stone-500">
    <span className="min-w-0 truncate">Kaynak // {source}</span>
    <span className="flex items-center gap-1.5 whitespace-nowrap">
      {isStale && <StaleBadge />}
      <span>{formatDateTime(updatedAt)}</span>
    </span>
  </div>
);

interface TerminalCardProps {
  eyebrow: string;
  title: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
  isStale?: boolean;
  compact?: boolean;
  action?: ReactNode;
  infoTitle?: string;
  infoContent?: string;
}

export const TerminalCard: FC<TerminalCardProps> = ({
  eyebrow,
  title,
  icon,
  children,
  className = '',
  isStale = false,
  compact = false,
  action,
  infoTitle,
  infoContent,
}) => (
  <section
    className={`border-2 ${compact ? 'p-3' : 'p-3.5 sm:p-5'} transition-colors duration-200 ${
      isStale
        ? 'border-stone-500 bg-stone-100/80 shadow-none'
        : 'border-stone-900 bg-white shadow-hard'
    } ${className}`}
  >
    <header className={`${compact ? 'mb-2 pb-2' : 'mb-4 pb-3'} flex items-start justify-between gap-3 border-b-2 border-stone-900/15`}>
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded border-2 border-stone-900 bg-amber-200 text-stone-900 shadow-hard-xs">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="mb-0.5 text-[8px] font-black uppercase tracking-[0.2em] text-stone-500">{eyebrow}</p>
          <h2 className="text-xs font-black uppercase leading-tight tracking-wide text-stone-950 sm:text-sm">{title}</h2>
        </div>
      </div>
      <div className="flex max-w-[55%] shrink-0 flex-wrap items-center justify-end gap-1.5">
        {isStale && <StaleBadge />}
        {action}
        {infoContent && <InfoBadge title={infoTitle} content={infoContent} />}
      </div>
    </header>
    {children}
  </section>
);

interface TerminalPageHeaderProps {
  kicker: string;
  title: string;
  subtitle: string;
  icon: ReactNode;
  status?: ReactNode;
  action?: ReactNode;
}

export const TerminalPageHeader: FC<TerminalPageHeaderProps> = ({
  kicker,
  title,
  subtitle,
  icon,
  status,
  action,
}) => (
  <header className="mb-4 flex items-end justify-between gap-4 border-b-2 border-stone-900 pb-3">
    <div className="min-w-0">
      <p className="mb-1 text-[9px] font-black uppercase tracking-[0.2em] text-amber-700">{kicker}</p>
      <h1 className="flex items-center gap-2 text-lg font-black uppercase tracking-tight text-stone-950 sm:text-xl">
        <span className="shrink-0 text-amber-600">{icon}</span>
        {title}
      </h1>
      <p className="mt-0.5 text-[10px] font-bold text-stone-500">{subtitle}</p>
    </div>
    {(status || action) && (
      <div className="flex shrink-0 items-center gap-2">
        {status}
        {action}
      </div>
    )}
  </header>
);

interface MetricTileProps {
  label: string;
  value: string;
  detail: string;
  tone?: TerminalTone;
  onClick?: () => void;
  ariaLabel?: string;
  className?: string;
}

export const MetricTile: FC<MetricTileProps> = ({
  label,
  value,
  detail,
  tone = 'neutral',
  onClick,
  ariaLabel,
  className = '',
}) => {
  const content = (
    <>
      <span className="block text-[8px] font-black uppercase tracking-wide opacity-70">{label}</span>
      <span className="mt-1 block text-xl font-black leading-none">{value}</span>
      <span className="mt-1.5 block truncate text-[8px] font-bold uppercase opacity-70">{detail}</span>
    </>
  );
  const classes = `min-h-20 rounded border-2 p-2.5 text-left shadow-hard-xs ${TERMINAL_TONE_CLASSES[tone]} ${className}`;

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={`${label}, ${value}, ${detail}${ariaLabel ? `. ${ariaLabel}` : ''}`}
        className={`${classes} cursor-pointer transition-transform duration-150 hover:-translate-y-0.5`}
      >
        {content}
      </button>
    );
  }

  return <div className={classes}>{content}</div>;
};

interface SegmentedControlProps<T extends string> {
  ariaLabel: string;
  options: ReadonlyArray<{ id: T; label: string }>;
  activeId: T;
  onChange: (id: T) => void;
  className?: string;
  idPrefix?: string;
}

export const SegmentedControl = <T extends string>({
  ariaLabel,
  options,
  activeId,
  onChange,
  className = '',
  idPrefix,
}: SegmentedControlProps<T>) => {
  const controlIdPrefix = idPrefix ?? ariaLabel.toLowerCase().replaceAll(' ', '-');
  return (
    <div
    role="tablist"
    aria-label={ariaLabel}
    className={`grid border-2 border-stone-900 bg-stone-200 p-1 shadow-hard-xs ${className}`}
    style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
  >
    {options.map((option) => {
      const isActive = activeId === option.id;
      return (
        <button
          key={option.id}
          id={`${controlIdPrefix}-${option.id}`}
          type="button"
          role="tab"
          aria-selected={isActive}
          aria-controls={`${controlIdPrefix}-${option.id}-panel`}
          onClick={() => onChange(option.id)}
          onKeyDown={(event) => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            const currentIndex = options.findIndex((item) => item.id === option.id);
            const nextIndex = event.key === 'Home'
              ? 0
              : event.key === 'End'
                ? options.length - 1
                : (currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + options.length) % options.length;
            const nextOption = options[nextIndex];
            if (!nextOption) return;
            onChange(nextOption.id);
            const tablist = event.currentTarget.closest('[role="tablist"]');
            const buttons = tablist?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
            buttons?.[nextIndex]?.focus();
          }}
          tabIndex={isActive ? 0 : -1}
          className={`min-h-11 cursor-pointer rounded-sm px-1 text-[9px] font-black uppercase tracking-wide transition-colors sm:text-[10px] ${
            isActive ? 'bg-stone-900 text-amber-300 shadow-hard-xs' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-950'
          }`}
        >
          {option.label}
        </button>
      );
    })}
    </div>
  );
};

interface StatusBannerProps {
  title: string;
  detail?: string;
  tone?: 'warning' | 'error' | 'info';
  className?: string;
}

export const StatusBanner: FC<StatusBannerProps> = ({ title, detail, tone = 'warning', className = '' }) => {
  const toneClass =
    tone === 'error'
      ? 'border-rose-700 bg-rose-100 text-rose-950'
      : tone === 'info'
        ? 'border-stone-700 bg-stone-100 text-stone-800'
        : 'border-amber-700 bg-amber-100 text-amber-950';
  const Icon = tone === 'info' ? Info : AlertTriangle;

  return (
    <div role="status" className={`flex items-start gap-2 border-2 px-3 py-2.5 ${toneClass} ${className}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="text-[10px] font-black uppercase">{title}</p>
        {detail && <p className="mt-0.5 text-[9px] font-bold">{detail}</p>}
      </div>
    </div>
  );
};
