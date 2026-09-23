import React, { useState, useMemo } from 'react';
import { ArrowRight, Check, Trash2, HelpCircle, FileText, Zap } from 'lucide-react';
import { useCryptoStore } from '../../store/useCryptoStore';
import { parsePortfolioText, type ParsedAssetDraft } from '../../utils/portfolioParser';
import { formatCurrency } from '../../utils/formatters';
import { Modal } from '../common/Modal';

interface SmartImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface EditableDraftAsset extends ParsedAssetDraft {
  priceInput: string;
}

export const SmartImportModal: React.FC<SmartImportModalProps> = ({ isOpen, onClose }) => {
  const [rawText, setRawText] = useState('');
  // User edits layered over the parse result: price overrides + removals, both keyed by symbol.
  // This keeps edits alive across textarea keystrokes and lets live prices fill in purely by derivation —
  // no effects, so no sync setState and no missed ticker updates.
  const [priceOverrides, setPriceOverrides] = useState<Record<string, string>>({});
  const [removedSymbols, setRemovedSymbols] = useState<string[]>([]);
  const [useLivePriceDefault, setUseLivePriceDefault] = useState(true);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const tickers = useCryptoStore((state) => state.tickers);
  const bulkAddPortfolioAssets = useCryptoStore((state) => state.bulkAddPortfolioAssets);
  const currency = useCryptoStore((state) => state.currency);
  const tryRate = useCryptoStore((state) => state.tryRate);
  const activeRate = currency === 'TRY' ? tryRate : 1;

  // Parse + price resolution derived from raw text, edits, toggle, and live tickers
  const drafts: EditableDraftAsset[] = useMemo(() => {
    if (!rawText.trim()) return [];
    return parsePortfolioText(rawText)
      .filter((p) => !removedSymbols.includes(p.symbol))
      .map((p) => {
        const override = priceOverrides[p.symbol];
        let priceInput = override ?? (p.buyPrice !== undefined ? String(p.buyPrice) : '');
        if (!priceInput && useLivePriceDefault) {
          const livePrice = tickers[p.symbol]?.price;
          if (livePrice) priceInput = String(livePrice);
        }
        return { ...p, priceInput };
      });
  }, [rawText, removedSymbols, priceOverrides, useLivePriceDefault, tickers]);

  if (!isOpen) return null;

  const handlePriceChange = (index: number, val: string) => {
    const symbol = drafts[index]?.symbol;
    if (!symbol) return;
    setPriceOverrides((prev) => ({ ...prev, [symbol]: val }));
  };

  const handleRemoveItem = (index: number) => {
    const symbol = drafts[index]?.symbol;
    if (!symbol) return;
    setRemovedSymbols((prev) => (prev.includes(symbol) ? prev : [...prev, symbol]));
  };

  const totalCalculatedValue = drafts.reduce((sum, item) => {
    const price = parseFloat(item.priceInput) || tickers[item.symbol]?.price || 0;
    return sum + item.amount * price;
  }, 0);

  const handleImportAll = () => {
    if (drafts.length === 0) return;

    const payload = drafts.map((item) => {
      const livePrice = tickers[item.symbol]?.price || 0;
      const parsedPrice = parseFloat(item.priceInput);
      const buyPrice = !isNaN(parsedPrice) && parsedPrice > 0 ? parsedPrice : (livePrice > 0 ? livePrice : 1);

      return {
        symbol: item.symbol,
        amount: item.amount,
        buyPrice,
      };
    });

    bulkAddPortfolioAssets(payload);
    setFeedbackMessage(`${payload.length} varlık başarıyla portföyünüze aktarıldı!`);

    setTimeout(() => {
      setFeedbackMessage(null);
      setRawText('');
      setPriceOverrides({});
      setRemovedSymbols([]);
      onClose();
    }, 900);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      variant="centered"
      title={
        <span className="flex items-center gap-2">
          <Zap className="w-5 h-5 fill-stone-900 shrink-0" />
          AKILLI PORTFÖY İÇE AKTAR
        </span>
      }
      subtitle="Binance TR / Web Kopyasını Yapıştırın"
    >
        {/* Scrollable Body */}
        <div className="p-3.5 overflow-y-auto space-y-3.5 text-xs flex-1">
          {/* Info Hint */}
          <div className="p-2.5 rounded bg-white border-2 border-stone-900 shadow-hard-sm">
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-stone-900 shrink-0 mt-0.5" />
              <div className="text-[11px] text-stone-700 leading-tight">
                <span className="font-black text-stone-900 uppercase">Nasıl Kullanılır? </span>
                Binance TR veya herhangi bir borsadaki varlık tablonuzu mouse ile seçip kopyalayın ve aşağıdaki kutuya yapıştırın. Sistem coinleri ve bakiyeleri otomatik ayıklar.
              </div>
            </div>
          </div>

          {/* Text Input Box */}
          <div>
            <div className="flex items-center justify-between mb-1 text-[11px] font-bold text-stone-900">
              <span>Borsa Metnini veya Listeyi Yapıştırın:</span>
              {drafts.length > 0 && (
                <span className="text-emerald-700 font-black">
                  ✓ {drafts.length} Varlık Tespit Edildi
                </span>
              )}
            </div>
            <textarea
              rows={4}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Örnek: Binance TR bakiyelerini buraya yapıştırın veya:&#10;BTC 0.05&#10;ETH 1.2&#10;SOL 15"
              className="w-full p-2.5 bg-white border-2 border-stone-900 rounded text-xs font-mono focus:outline-none focus:bg-amber-50/50 shadow-hard-sm resize-none placeholder:text-stone-400"
            />
          </div>

          {/* Pricing Policy Toggle */}
          <div className="p-2 bg-stone-100 border-2 border-stone-900 rounded flex items-center justify-between shadow-hard-sm">
            <div className="flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-stone-700 shrink-0" />
              <span className="text-[10px] font-bold text-stone-800">
                Alış fiyatı bilinmeyenleri canlı piyasa fiyatından başlat
              </span>
            </div>
            <input
              type="checkbox"
              checked={useLivePriceDefault}
              onChange={(e) => setUseLivePriceDefault(e.target.checked)}
              className="w-4 h-4 accent-amber-500 cursor-pointer"
            />
          </div>

          {/* Parsed Assets Preview Table */}
          {drafts.length > 0 ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-black text-stone-900 uppercase">
                <span>Algılanan Varlıklar ({drafts.length})</span>
                <span className="text-stone-600">
                  Tahmini Toplam: {formatCurrency(totalCalculatedValue, currency, activeRate)}
                </span>
              </div>

              <div className="border-2 border-stone-900 rounded bg-white divide-y max-h-56 overflow-y-auto shadow-hard-sm">
                {drafts.map((asset, idx) => {
                  const livePrice = tickers[asset.symbol]?.price;
                  return (
                    <div
                      key={asset.symbol}
                      className="p-2 flex items-center justify-between gap-2 hover:bg-stone-50 text-[11px]"
                    >
                      <div className="w-24 shrink-0">
                        <span className="font-black text-stone-900 block text-xs">{asset.baseAsset}</span>
                        <span className="text-[9px] text-stone-500 font-bold block truncate">
                          Miktar: {asset.amount}
                        </span>
                      </div>

                      <div className="flex-1 flex items-center gap-1.5 justify-end">
                        <div className="text-right">
                          <label className="block text-[8px] font-bold uppercase text-stone-500">
                            Maliyet ($)
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={asset.priceInput}
                            onChange={(e) => handlePriceChange(idx, e.target.value)}
                            placeholder={livePrice ? String(livePrice) : 'Maliyet'}
                            className="w-24 px-1.5 py-0.5 bg-stone-50 border border-stone-900 rounded text-right font-bold text-stone-900 focus:outline-none focus:bg-white text-[11px]"
                          />
                        </div>

                        <button
                          onClick={() => handleRemoveItem(idx)}
                          title="Listeden Kaldır"
                          className="p-1 text-stone-400 hover:text-rose-600 cursor-pointer ml-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : rawText.trim().length > 0 ? (
            <div className="p-3 bg-amber-100/70 border-2 border-stone-900 rounded text-center text-xs text-stone-700">
              Metin içerisinde uygun bir bakiye formatı bulunamadı. Lütfen coin sembolü ve miktar içerdiğinden emin olun.
            </div>
          ) : null}

          {feedbackMessage && (
            <div className="p-2.5 bg-emerald-100 border-2 border-stone-900 rounded text-center font-bold text-xs text-emerald-900 flex items-center justify-center gap-1.5 shadow-hard-sm">
              <Check className="w-4 h-4 stroke-3" />
              <span>{feedbackMessage}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t-2 border-stone-900 bg-white flex items-center justify-between gap-2">
          <button
            onClick={onClose}
            className="px-3 py-2 border-2 border-stone-900 rounded text-xs font-black text-stone-700 hover:bg-stone-100 cursor-pointer"
          >
            İptal
          </button>

          <button
            onClick={handleImportAll}
            disabled={drafts.length === 0}
            className={`flex items-center gap-1.5 px-4 py-2 border-2 border-stone-900 text-xs font-black rounded shadow-hard-sm btn-hard cursor-pointer ${
              drafts.length > 0
                ? 'bg-amber-300 hover:bg-amber-400 text-stone-900'
                : 'bg-stone-200 text-stone-400 cursor-not-allowed border-stone-400 shadow-none'
            }`}
          >
            <span>{drafts.length} Varlığı Portföye Aktar</span>
            <ArrowRight className="w-4 h-4 stroke-2.5" />
          </button>
        </div>
    </Modal>
  );
};
