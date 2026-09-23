import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export type ModalSize = 'sm' | 'md' | 'lg';
export type ModalVariant = 'sheet' | 'centered';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: string;
  headerRight?: React.ReactNode;
  size?: ModalSize;
  /** `sheet`: bottom sheet on mobile, centered from sm. `centered`: always centered. */
  variant?: ModalVariant;
  showClose?: boolean;
  children: React.ReactNode;
}

const SIZE_CLASS: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md lg:max-w-lg',
  lg: 'max-w-lg lg:max-w-2xl',
};

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Shared overlay: portal + Esc/backdrop close + body scroll lock + focus trap/restore.
 * Mobile-first sheet by default; all dialogs must use this (no hand-rolled overlays).
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  headerRight,
  size = 'md',
  variant = 'sheet',
  showClose = true,
  children,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Capture the trigger element so focus returns to it after close
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusRaf = window.requestAnimationFrame(() => {
      const card = cardRef.current;
      if (!card) return;
      const first = card.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (first ?? card).focus();
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const card = cardRef.current;
      if (!card) return;
      const nodes = Array.from(card.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => !el.hasAttribute('disabled') && el.offsetParent !== null
      );
      if (nodes.length === 0) {
        e.preventDefault();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      const inside = active instanceof Node && card.contains(active);

      if (e.shiftKey) {
        if (!inside || active === first || active === card) {
          e.preventDefault();
          last.focus();
        }
      } else if (!inside || active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusRaf);
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      const prev = previousFocusRef.current;
      if (prev && document.contains(prev)) prev.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isSheet = variant === 'sheet';

  return createPortal(
    <div
      className={`fixed inset-0 z-100 flex justify-center bg-stone-900/60 backdrop-blur-xs animate-backdrop ${
        isSheet ? 'items-end sm:items-center p-0 sm:p-4' : 'items-center p-4'
      }`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        aria-label={typeof title === 'string' ? title : undefined}
        className={`w-full ${SIZE_CLASS[size]} bg-[#faf7f0] border-2 border-stone-900 flex flex-col max-h-[85dvh] shadow-hard-lg animate-sheetUp overflow-hidden font-mono ${
          isSheet ? 'rounded-t-xl sm:rounded-xl pb-safe' : 'rounded-xl'
        }`}
      >
        {(title || showClose) && (
          <div className="flex items-center justify-between gap-2 p-4 border-b-2 border-stone-900 bg-[#ede8dd] shrink-0">
            <div className="min-w-0">
              {title && (
                <h2 className="text-base font-mono font-black text-stone-900 uppercase tracking-tight truncate">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="text-[11px] font-mono text-stone-600 truncate">{subtitle}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {headerRight}
              {showClose && (
                <button
                  onClick={onClose}
                  aria-label="Kapat"
                  className="p-1.5 rounded-md border-2 border-stone-900 bg-white hover:bg-stone-200 shadow-hard-sm btn-hard cursor-pointer"
                >
                  <X className="w-4 h-4 stroke-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {children}
      </div>
    </div>,
    document.body
  );
};
