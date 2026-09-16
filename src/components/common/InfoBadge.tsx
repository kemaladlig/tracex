import React, { useState, useRef, useEffect } from 'react';
import { Info, X } from 'lucide-react';

interface InfoBadgeProps {
  title?: string;
  content: string;
  className?: string;
}

export const InfoBadge: React.FC<InfoBadgeProps> = ({ title, content, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
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
        <Info className="w-3.5 h-3.5 stroke-[2.5]" />
      </button>

      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-full mt-1.5 z-40 w-64 p-3 bg-[#faf7f0] border-2 border-stone-900 rounded-lg shadow-hard-lg font-mono text-left animate-sheetUp"
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-stone-300 mb-2">
            <div className="flex items-center gap-1.5 text-xs font-black text-stone-900 uppercase">
              <Info className="w-3.5 h-3.5 text-amber-600 stroke-[2.5]" />
              <span>{title || 'BİLGİ'}</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-0.5 rounded text-stone-600 hover:text-stone-900 hover:bg-stone-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          </div>
          <p className="text-[11px] text-stone-700 leading-relaxed font-sans font-medium">
            {content}
          </p>
        </div>
      )}
    </div>
  );
};
