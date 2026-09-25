import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  Download,
  Smartphone,
  Share,
  PlusSquare,
} from 'lucide-react';
import { useCryptoStore } from '../../store/useCryptoStore';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Modal } from './Modal';

export const Header: React.FC = () => {
  const connectionStatus = useCryptoStore((state) => state.connectionStatus);
  const hideBalances = useCryptoStore((state) => state.hideBalances);
  const toggleHideBalances = useCryptoStore((state) => state.toggleHideBalances);
  const activeTab = useCryptoStore((state) => state.activeTab);

  const { isInstallable, isStandalone, installApp } = usePWAInstall();
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  const handleInstallClick = () => {
    setShowInstallGuide(true);
  };

  return (
    <>
      <header className="sticky top-0 z-30 w-full bg-[#fbf9f4]/95 backdrop-blur-sm border-b-2 border-stone-900 px-4 py-2.5 pt-safe transition-colors font-mono">
        <div className="flex items-center justify-between max-w-lg mx-auto md:max-w-none 2xl:max-w-400">
          {/* Brand Stamp (mobile/tablet only — desktop sidebar owns branding) */}
          <div className="flex items-center gap-2.5 lg:hidden">
            <div className="w-8 h-8 rounded-md bg-stone-900 text-amber-300 border-2 border-stone-900 flex items-center justify-center font-black text-sm shadow-hard-sm tracking-tighter shrink-0">
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
                {/* Minimal live dot indicator: no box, no text */}
                <span
                  title={
                    connectionStatus === 'connected'
                      ? 'Canlı Akış Aktif'
                      : connectionStatus === 'connecting'
                      ? 'Bağlantı Kuruluyor...'
                      : 'Bağlantı Kesildi'
                  }
                  className={`inline-block w-2 h-2 rounded-full border border-stone-900 shrink-0 ${
                    connectionStatus === 'connected'
                      ? 'bg-emerald-500 animate-pulse'
                      : connectionStatus === 'connecting'
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-rose-500'
                  }`}
                />
              </div>
              <p className="text-[10px] text-stone-600 font-medium -mt-0.5">
                PİYASA & PORTFÖY
              </p>
            </div>
          </div>

          {/* Action Stamps */}
          <div className="flex items-center gap-2 ml-auto">
            {/* PWA Install / Home Screen Shortcut Button (Hidden when running as standalone app) */}
            {!isStandalone && (
              <button
                onClick={handleInstallClick}
                title="TraceX'i Ana Ekrana Ekle / İndir"
                className="flex min-h-11 min-w-11 items-center justify-center p-2 rounded-md border-2 border-stone-900 bg-amber-300 hover:bg-amber-400 text-stone-900 shadow-hard-xs btn-hard cursor-pointer"
              >
                <Download className="w-4 h-4 stroke-3" />
              </button>
            )}

            {/* Privacy Toggle Stamp - Displayed on Portfolio and Home tabs */}
            {(activeTab === 'portfolio' || activeTab === 'home') && (
              <button
                onClick={toggleHideBalances}
                title={hideBalances ? 'Bakiyeleri Göster' : 'Bakiyeleri Gizle'}
                className={`flex min-h-11 min-w-11 items-center justify-center p-2 rounded-md border-2 border-stone-900 shadow-hard-xs btn-hard cursor-pointer ${
                  hideBalances
                    ? 'bg-amber-300 text-stone-900'
                    : 'bg-white text-stone-800'
                }`}
              >
                {hideBalances ? (
                  <EyeOff className="w-4 h-4 stroke-2.5" />
                ) : (
                  <Eye className="w-4 h-4 stroke-2.5" />
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* PWA Home Screen Install Modal Guide */}
      <Modal
        isOpen={showInstallGuide}
        onClose={() => setShowInstallGuide(false)}
        size="sm"
        variant="centered"
        title={
          <span className="flex items-center gap-1.5">
            <Smartphone className="w-4 h-4 stroke-2.5" />
            ANA EKRANA EKLE (PWA)
          </span>
        }
      >
        <div className="p-4 overflow-y-auto no-scrollbar">
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
                  <Share className="w-3.5 h-3.5 text-amber-700 stroke-2.5" />
                  <span>iOS Safari Kullanıcıları:</span>
                </div>
                <p className="text-[10px] text-stone-700 leading-relaxed">
                  Alt kısımdaki <strong>Paylaş (Share)</strong> butonuna dokunun, ardından{' '}
                  <strong>&quot;Ana Ekrana Ekle&quot;</strong> seçeneğini seçin.
                </p>
              </div>

              <div className="p-2 bg-emerald-50 border border-stone-900 rounded">
                <div className="flex items-center gap-1.5 font-black text-stone-900 mb-1">
                  <PlusSquare className="w-3.5 h-3.5 text-emerald-700 stroke-2.5" />
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
                  <Download className="w-3.5 h-3.5 stroke-3" />
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
      </Modal>
    </>
  );
};
