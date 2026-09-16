import React from 'react';
import { Eye, EyeOff, Radio, DollarSign } from 'lucide-react';
import { useCryptoStore } from '../../store/useCryptoStore';
import type { Currency } from '../../types/crypto';

const CURRENCIES: Currency[] = ['USD', 'TRY', 'EUR'];

export const Header: React.FC = () => {
  const connectionStatus = useCryptoStore((state) => state.connectionStatus);
  const hideBalances = useCryptoStore((state) => state.hideBalances);
  const toggleHideBalances = useCryptoStore((state) => state.toggleHideBalances);
  const currency = useCryptoStore((state) => state.currency);
  const setCurrency = useCryptoStore((state) => state.setCurrency);

  const cycleCurrency = () => {
    const nextIdx = (CURRENCIES.indexOf(currency) + 1) % CURRENCIES.length;
    setCurrency(CURRENCIES[nextIdx]);
  };

  const getCurrencySymbol = (c: Currency) => {
    if (c === 'TRY') return '₺ TRY';
    if (c === 'EUR') return '€ EUR';
    return '$ USD';
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-[#fbf9f4]/95 backdrop-blur-sm border-b-2 border-stone-900 px-4 py-2.5 pt-safe transition-colors font-mono">
      <div className="flex items-center justify-between max-w-lg mx-auto">
        {/* Brand Stamp */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-stone-900 text-amber-300 border-2 border-stone-900 flex items-center justify-center font-black text-sm shadow-hard-sm tracking-tighter">
            TX
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-stone-900 tracking-tight text-base">
                TRACEX
              </span>
              <span className="text-[9px] font-bold uppercase tracking-widest bg-amber-200 border border-stone-900 px-1 py-0.2 rounded-xs">
                V2.5
              </span>
            </div>
            <p className="text-[10px] text-stone-600 font-medium -mt-0.5">
              CANLI PİYASA & PORTFÖY
            </p>
          </div>
        </div>

        {/* Action Stamps */}
        <div className="flex items-center gap-1.5">
          {/* Currency Toggle Stamp */}
          <button
            onClick={cycleCurrency}
            title="Para Birimini Değiştir ($ / ₺ / €)"
            className="flex items-center gap-1 px-2 py-1 rounded-md border-2 border-stone-900 text-xs font-bold bg-amber-200 hover:bg-amber-300 text-stone-900 shadow-hard-sm btn-hard cursor-pointer"
          >
            <DollarSign className="w-3 h-3 stroke-[3]" />
            <span className="text-[10px]">{getCurrencySymbol(currency)}</span>
          </button>

          {/* Privacy Toggle Stamp */}
          <button
            onClick={toggleHideBalances}
            title={hideBalances ? 'Bakiyeleri Göster' : 'Bakiyeleri Gizle'}
            className={`flex items-center gap-1 px-2 py-1 rounded-md border-2 border-stone-900 text-xs font-bold shadow-hard-sm btn-hard cursor-pointer ${
              hideBalances
                ? 'bg-amber-300 text-stone-900'
                : 'bg-white text-stone-800'
            }`}
          >
            {hideBalances ? (
              <>
                <EyeOff className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="text-[10px]">GİZLİ</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="text-[10px]">AÇIK</span>
              </>
            )}
          </button>

          {/* Connection Status Stamp */}
          <div
            className={`flex items-center gap-1 px-1.5 py-1 rounded-md border-2 border-stone-900 text-[10px] font-bold shadow-hard-sm ${
              connectionStatus === 'connected'
                ? 'bg-emerald-200 text-emerald-950'
                : connectionStatus === 'connecting'
                ? 'bg-amber-200 text-amber-950'
                : 'bg-rose-200 text-rose-950'
            }`}
          >
            <Radio className={`w-3 h-3 ${connectionStatus === 'connected' ? 'animate-pulse' : ''}`} />
            <span>
              {connectionStatus === 'connected' ? 'CANLI' : 'KOPUK'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
