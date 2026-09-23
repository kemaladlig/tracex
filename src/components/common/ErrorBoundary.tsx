import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('TraceX ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearAndReset = async () => {
    try {
      // Clear service worker caches
      if ('caches' in window) {
        const cacheKeys = await window.caches.keys();
        await Promise.all(cacheKeys.map((key) => window.caches.delete(key)));
      }
      // Unregister service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((r) => r.unregister()));
      }
    } catch (e) {
      console.warn('Clear cache error:', e);
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#f4f0e6] text-stone-900 flex flex-col items-center justify-center p-4 font-mono">
          <div className="w-full max-w-md bg-white border-2 border-stone-900 rounded-lg p-6 shadow-hard text-center">
            {/* Stamp */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-100 border border-stone-900 rounded shadow-hard-xs mb-4">
              <AlertTriangle className="w-4 h-4 text-rose-600 stroke-2.5" />
              <span className="text-[11px] font-black tracking-wider text-stone-900 uppercase">
                SİSTEM // KURTARMA MODU
              </span>
            </div>

            <h1 className="text-base font-black text-stone-900 mb-2 uppercase tracking-tight">
              Arayüz Yüklenirken Bir Hata Oluştu
            </h1>

            <p className="text-xs text-stone-600 font-sans font-medium mb-4 leading-relaxed">
              Önbellekte eski sürüm dosyaları kalmış veya geçici bir veri uyumsuzluğu yaşanmış olabilir. Portföy verileriniz yerel depolamada güvendedir.
            </p>

            {this.state.error && (
              <div className="p-2.5 bg-stone-100 border border-stone-900 rounded text-left mb-5 overflow-x-auto text-[10px] text-stone-800 font-mono">
                {this.state.error.message || 'Bilinmeyen çalışma zamanı hatası.'}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                onClick={this.handleReload}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 bg-amber-300 hover:bg-amber-400 border-2 border-stone-900 rounded-md shadow-hard-sm font-black text-xs btn-hard cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 stroke-2.5" />
                <span>Yeniden Başlat</span>
              </button>

              <button
                onClick={this.handleClearAndReset}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 bg-stone-100 hover:bg-stone-200 border-2 border-stone-900 rounded-md shadow-hard-sm font-bold text-xs btn-hard cursor-pointer text-stone-800"
              >
                <Trash2 className="w-3.5 h-3.5 stroke-2.5" />
                <span>Önbelleği Temizle</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
