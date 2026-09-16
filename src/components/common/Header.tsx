import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  Radio,
  DollarSign,
  Download,
  Smartphone,
  X,
  Share,
  PlusSquare,
} from 'lucide-react';
import { useCryptoStore } from '../../store/useCryptoStore';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import type { Currency } from '../../types/crypto';

const CURRENCIES: Currency[] = ['USD', 'TRY', 'EUR'];

export const Header: React.FC = () => {
  const connectionStatus = useCryptoStore((state) => state.connectionStatus);
  const hideBalances = useCryptoStore((state) => state.hideBalances);
  const toggleHideBalances = useCryptoStore((state) => state.toggleHideBalances);
  const currency = useCryptoStore((state) => state.currency);
  const setCurrency = useCryptoStore((state) => state.setCurrency);

  const { isInstallable, isStandalone, installApp } = usePWAInstall();
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  const cycleCurrency = () => {
    const nextIdx = (CURRENCIES.indexOf(currency) + 1) % CURRENCIES.length;
    setCurrency(CURRENCIES[nextIdx]);
  };

  const getCurrencySymbol = (c: Currency) => {
    if (c === 'TRY') return '₺ TRY';
    if (c === 'EUR') return '€ EUR';
    return '$ USD';
  };

  const handleInstallClick = () => {
    setShowInstallGuide(true);
  };

  return (
    <>
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
            {/* PWA Install / Home Screen Shortcut Button (Hidden when running as standalone app) */}
            {!isStandalone && (
              <button
                onClick={handleInstallClick}
                title="TraceX'i Ana Ekrana Ekle / İndir"
                className="flex items-center justify-center p-1.5 rounded-md border-2 border-stone-900 bg-amber-300 hover:bg-amber-400 text-stone-900 shadow-hard-sm btn-hard cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 stroke-[3]" />
              </button>
            )}

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
              <Radio className={`w-3 h-3 ${connectionStatus === 'connected' ? 'animate-livePulse' : ''}`} />
              <span>
                {connectionStatus === 'connected' ? 'CANLI' : 'KOPUK'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* PWA Home Screen Install Modal Guide */}
      {showInstallGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs font-mono animate-backdrop">
          <div className="bg-[#faf7f0] border-2 border-stone-900 rounded-lg p-4 max-w-sm w-full shadow-hard-lg animate-sheetUp">
            {/* Modal Top Bar */}
            <div className="flex items-center justify-between pb-2 border-b-2 border-stone-900 mb-3">
              <div className="flex items-center gap-1.5 text-xs font-black text-stone-900 uppercase">
                <Smartphone className="w-4 h-4 stroke-[2.5]" />
                <span>ANA EKRANA EKLE (PWA)</span>
              </div>
              <button
                onClick={() => setShowInstallGuide(false)}
                className="p-1 rounded hover:bg-stone-200 border border-stone-900 text-stone-900 cursor-pointer"
              >
                <X className="w-3.5 h-3.5 stroke-[3]" />
              </button>
            </div>

            {/* App Branding Info */}
            <div className="flex items-center gap-3 p-2.5 bg-white border-2 border-stone-900 rounded-md mb-3 shadow-hard-xs">
              <img
                src="/icon.png"
                alt="TraceX Icon"
                className="w-12 h-12 rounded-lg border-2 border-stone-900 object-cover shadow-hard-xs"
              />
              <div>
                <h4 className="text-xs font-black text-stone-900">TraceX Terminal</h4>
                <p className="text-[10px] text-stone-600">
                  Yerel uygulama deneyimi, ultra hızlı açılış ve tam ekran kullanım.
                </p>
              </div>
            </div>

            {/* How-to Instructions */}
            <div className="space-y-2 mb-4 text-[11px] text-stone-800">
              <div className="p-2 bg-amber-50 border border-stone-900 rounded">
                <div className="flex items-center gap-1.5 font-black text-stone-900 mb-1">
                  <Share className="w-3.5 h-3.5 text-amber-700 stroke-[2.5]" />
                  <span>iOS Safari Kullanıcıları:</span>
                </div>
                <p className="text-[10px] text-stone-700 leading-relaxed">
                  Alt kısımdaki <strong>Paylaş (Share)</strong> butonuna dokunun, ardından{' '}
                  <strong>&quot;Ana Ekrana Ekle&quot;</strong> seçeneğini seçin.
                </p>
              </div>

              <div className="p-2 bg-emerald-50 border border-stone-900 rounded">
                <div className="flex items-center gap-1.5 font-black text-stone-900 mb-1">
                  <PlusSquare className="w-3.5 h-3.5 text-emerald-700 stroke-[2.5]" />
                  <span>Android / Chrome Kullanıcıları:</span>
                </div>
                <p className="text-[10px] text-stone-700 leading-relaxed">
                  Tarayıcı menüsünden (üç nokta) <strong>&quot;Uygulamayı Yükle&quot;</strong> veya{' '}
                  <strong>&quot;Ana Ekrana Ekle&quot;</strong> butonuna dokunun.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {isInstallable && (
                <button
                  onClick={async () => {
                    await installApp();
                    setShowInstallGuide(false);
                  }}
                  className="flex-1 py-2 bg-amber-300 hover:bg-amber-400 text-stone-900 text-xs font-black rounded border-2 border-stone-900 shadow-hard-sm btn-hard cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 stroke-[3]" />
                  <span>HEMEN YÜKLE</span>
                </button>
              )}

              <button
                onClick={() => setShowInstallGuide(false)}
                className={`py-2 px-4 bg-stone-200 hover:bg-stone-300 text-stone-900 text-xs font-black rounded border-2 border-stone-900 shadow-hard-sm btn-hard cursor-pointer ${
                  !isInstallable ? 'w-full' : ''
                }`}
              >
                ANLADIM
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
