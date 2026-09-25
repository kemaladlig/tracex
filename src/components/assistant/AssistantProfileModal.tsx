import { useState } from 'react';
import { BrainCircuit, Save, SlidersHorizontal } from 'lucide-react';
import type {
  AssistantHorizon,
  AssistantRiskProfile,
  AssistantSettings,
} from '../../types/assistant';
import { ASSISTANT_RISK_PRESETS } from '../../store/useAssistantStore';
import { Modal } from '../common/Modal';
import { SegmentedControl } from '../common/TerminalPrimitives';

interface AssistantProfileModalProps {
  isOpen: boolean;
  settings: AssistantSettings;
  onClose: () => void;
  onSave: (settings: AssistantSettings) => void;
}

const HORIZONS: Array<{ id: AssistantHorizon; label: string }> = [
  { id: 'short', label: 'Kısa vade' },
  { id: 'medium', label: 'Orta vade' },
  { id: 'long', label: 'Uzun vade' },
];

const RISK_OPTIONS: Array<{
  id: AssistantRiskProfile;
  label: string;
  detail: string;
}> = [
  { id: 'conservative', label: 'Korumalı', detail: 'Düşük tek varlık payı ve yüksek nakit payı.' },
  { id: 'balanced', label: 'Dengeli', detail: 'Kademeli birikim ve orta risk sınırları.' },
  { id: 'aggressive', label: 'Agresif', detail: 'Daha geniş altcoin payı ve yüksek volatilite toleransı.' },
];

const clampNumber = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const NumericField = ({
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix: string;
  onChange: (value: number) => void;
}) => (
  <label className="block border border-stone-300 bg-stone-50 p-2.5">
    <span className="flex items-center justify-between gap-2 text-[9px] font-black uppercase text-stone-600">
      {label}
      <span className="text-stone-500">{suffix}</span>
    </span>
    <input
      type="number"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(event) => onChange(clampNumber(Number(event.target.value) || min, min, max))}
      className="mt-1.5 w-full border-2 border-stone-900 bg-white px-2.5 py-2 text-sm font-black text-stone-900 shadow-hard-xs focus:outline-none"
    />
  </label>
);

export const AssistantProfileModal = ({
  isOpen,
  settings,
  onClose,
  onSave,
}: AssistantProfileModalProps) => {
  const [draft, setDraft] = useState<AssistantSettings>({ ...settings });

  const patch = <K extends keyof AssistantSettings>(key: K, value: AssistantSettings[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const chooseRisk = (riskProfile: AssistantRiskProfile) => {
    setDraft((current) => ({
      ...current,
      riskProfile,
      ...ASSISTANT_RISK_PRESETS[riskProfile],
    }));
  };

  const handleSave = () => {
    onSave({
      ...draft,
      availableCashUsd: Math.max(0, draft.availableCashUsd),
      monthlyContributionUsd: Math.max(0, draft.monthlyContributionUsd),
      maxAssetPercent: clampNumber(draft.maxAssetPercent, 5, 80),
      maxAltPercent: clampNumber(draft.maxAltPercent, 0, 90),
      stableReservePercent: clampNumber(draft.stableReservePercent, 0, 80),
      riskPerIdeaPercent: clampNumber(draft.riskPerIdeaPercent, 0.1, 3),
      dcaTranches: Math.round(clampNumber(draft.dcaTranches, 2, 6)),
      minimumTradeUsd: Math.max(1, draft.minimumTradeUsd),
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      variant="centered"
      title={
        <span className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center border-2 border-stone-900 bg-amber-300 shadow-hard-xs">
            <SlidersHorizontal className="h-4 w-4" />
          </span>
          ASİSTAN PROFİLİ
        </span>
      }
      subtitle="Öneriler yalnızca bu cihazdaki ayarlar ve verilerle hesaplanır"
    >
      <div className="min-h-0 flex-1 overflow-y-auto p-4 font-mono">
        <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 border-2 border-stone-900 bg-stone-100 px-3 py-2 shadow-hard-xs">
          <span className="flex items-center gap-2 text-xs font-black uppercase text-stone-900">
            <BrainCircuit className="h-4 w-4 text-amber-600" />
            Akıllı öneriler
          </span>
          <input
            type="checkbox"
            checked={draft.enabled}
            onChange={(event) => patch('enabled', event.target.checked)}
            className="h-5 w-5 accent-amber-500"
          />
        </label>

        <fieldset className="mt-4">
          <legend className="text-[9px] font-black uppercase tracking-[0.18em] text-stone-500">
            Risk profili
          </legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {RISK_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => chooseRisk(option.id)}
                className={`min-h-20 cursor-pointer border-2 p-2.5 text-left shadow-hard-xs btn-hard ${
                  draft.riskProfile === option.id
                    ? 'border-stone-900 bg-amber-200'
                    : 'border-stone-400 bg-white hover:bg-stone-50'
                }`}
              >
                <span className="block text-xs font-black uppercase text-stone-950">{option.label}</span>
                <span className="mt-1 block font-sans text-[10px] leading-relaxed text-stone-600">
                  {option.detail}
                </span>
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-4">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-stone-500">Yatırım ufku</p>
          <SegmentedControl
            ariaLabel="Yatırım ufku"
            idPrefix="assistant-horizon"
            options={HORIZONS}
            activeId={draft.horizon}
            onChange={(horizon) => patch('horizon', horizon)}
            className="mt-2"
          />
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <NumericField
            label="Portföy dışı nakit"
            value={draft.availableCashUsd}
            min={0}
            max={10_000_000}
            step={10}
            suffix="USD"
            onChange={(availableCashUsd) => patch('availableCashUsd', availableCashUsd)}
          />
          <NumericField
            label="Aylık planlı katkı"
            value={draft.monthlyContributionUsd}
            min={0}
            max={1_000_000}
            step={10}
            suffix="USD / ay"
            onChange={(monthlyContributionUsd) => patch('monthlyContributionUsd', monthlyContributionUsd)}
          />
          <NumericField
            label="Tek varlık sınırı"
            value={draft.maxAssetPercent}
            min={5}
            max={80}
            suffix="%"
            onChange={(maxAssetPercent) => patch('maxAssetPercent', maxAssetPercent)}
          />
          <NumericField
            label="Altcoin toplam sınırı"
            value={draft.maxAltPercent}
            min={0}
            max={90}
            suffix="%"
            onChange={(maxAltPercent) => patch('maxAltPercent', maxAltPercent)}
          />
          <NumericField
            label="Nakit / stable rezervi"
            value={draft.stableReservePercent}
            min={0}
            max={80}
            suffix="%"
            onChange={(stableReservePercent) => patch('stableReservePercent', stableReservePercent)}
          />
          <NumericField
            label="Fikir başına risk bütçesi"
            value={draft.riskPerIdeaPercent}
            min={0.1}
            max={3}
            step={0.05}
            suffix="% portföy"
            onChange={(riskPerIdeaPercent) => patch('riskPerIdeaPercent', riskPerIdeaPercent)}
          />
          <NumericField
            label="DCA dilimi"
            value={draft.dcaTranches}
            min={2}
            max={6}
            suffix="kademe"
            onChange={(dcaTranches) => patch('dcaTranches', dcaTranches)}
          />
          <NumericField
            label="Minimum uygulanabilir işlem"
            value={draft.minimumTradeUsd}
            min={1}
            max={100_000}
            step={1}
            suffix="USD"
            onChange={(minimumTradeUsd) => patch('minimumTradeUsd', minimumTradeUsd)}
          />
        </div>

        <p className="mt-3 border-2 border-stone-300 bg-stone-50 p-2.5 font-sans text-[10px] leading-relaxed text-stone-700">
          Portföyde kayıtlı stablecoin ve Türk lirası bakiyeleri otomatik olarak nakit havuzuna eklenir. Bu alana
          yalnızca portföyde görünmeyen ek nakit miktarını gir.
        </p>

        <p className="mt-4 border-2 border-amber-700 bg-amber-100 p-2.5 font-sans text-[10px] leading-relaxed text-amber-950">
          Bu ayarlar yatırım tavsiyesi değildir. Asistan işlem yapmaz; yalnızca yerel kurallarla açıklanabilir
          öneriler üretir.
        </p>
      </div>

      <div className="flex gap-2 border-t-2 border-stone-900 bg-white p-3">
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 flex-1 cursor-pointer border-2 border-stone-900 bg-stone-100 px-3 text-xs font-black uppercase text-stone-700 shadow-hard-xs btn-hard"
        >
          İptal
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="flex min-h-11 flex-[1.4] cursor-pointer items-center justify-center gap-2 border-2 border-stone-900 bg-amber-300 px-3 text-xs font-black uppercase text-stone-950 shadow-hard btn-hard"
        >
          <Save className="h-4 w-4" /> Ayarları Kaydet
        </button>
      </div>
    </Modal>
  );
};
