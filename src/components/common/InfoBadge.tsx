import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Info, X } from 'lucide-react';

interface InfoBadgeProps {
  title?: string;
  content: string;
  className?: string;
}

interface Coords {
  top?: number;
  bottom?: number;
  right: number;
  maxWidth: number;
}

export const InfoBadge: React.FC<InfoBadgeProps> = ({ title, content, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const right = Math.max(12, window.innerWidth - rect.right);
    const maxWidth = Math.min(300, window.innerWidth - 24);
    const showAbove = rect.bottom + 190 > window.innerHeight && rect.top > 170;

    setCoords({
      top: showAbove ? undefined : rect.bottom + 6,
      bottom: showAbove ? window.innerHeight - rect.top + 6 : undefined,
      right,
      maxWidth,
    });
  };

  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener('scroll', handleScrollOrResize, { passive: true });
    window.addEventListener('resize', handleScrollOrResize, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        title={title || 'Bilgi'}
        className="p-1 rounded-sm text-stone-500 hover:text-stone-900 hover:bg-stone-200/60 transition-colors cursor-pointer inline-flex items-center justify-center"
      >
        <Info className="w-3.5 h-3.5 stroke-2.5" />
      </button>

      {isOpen && coords &&
        createPortal(
          <>
            {/* Backdrop: Outside click closes cleanly */}
            <div
              className="fixed inset-0 z-9998 bg-black/10 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
            />

            {/* Portal Popover: Guaranteed to render on top of all cards, modals and navigation */}
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                top: coords.top !== undefined ? `${coords.top}px` : undefined,
                bottom: coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
                right: `${coords.right}px`,
                width: `${coords.maxWidth}px`,
              }}
              className="fixed z-9999 p-3.5 bg-[#faf7f0] border-2 border-stone-900 rounded-lg shadow-hard-lg font-mono text-left animate-popIn"
            >
              <div className="flex items-center justify-between pb-1.5 border-b-2 border-stone-900/40 mb-2">
                <div className="flex items-center gap-1.5 text-xs font-black text-stone-900 uppercase">
                  <Info className="w-3.5 h-3.5 text-amber-600 stroke-2.5" />
                  <span className="truncate">{title || 'BİLGİ'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-0.5 rounded text-stone-600 hover:text-stone-900 hover:bg-stone-200 cursor-pointer shrink-0 ml-1"
                >
                  <X className="w-3.5 h-3.5 stroke-3" />
                </button>
              </div>
              <p className="text-[11px] text-stone-700 leading-relaxed font-sans font-medium">
                {content}
              </p>
            </div>
          </>,
          document.body
        )}
    </div>
  );
};
