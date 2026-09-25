import type { AssistantAction, AssistantConfidence } from '../../types/assistant';
import type { TerminalTone } from '../common/TerminalPrimitives';

export const ACTION_META: Record<
  AssistantAction,
  { label: string; shortLabel: string; tone: TerminalTone; description: string }
> = {
  hold: {
    label: 'BEKLE',
    shortLabel: 'BEKLE',
    tone: 'neutral',
    description: 'Şu an alım veya satış yapma; yeni teyit bekleniyor.',
  },
  accumulate: {
    label: 'ALIŞ ÖNERİSİ',
    shortLabel: 'AL',
    tone: 'positive',
    description: 'Bu varlığa kademeli alım yapmayı önerir.',
  },
  reduce: {
    label: 'SATIŞ ÖNERİSİ',
    shortLabel: 'SAT',
    tone: 'negative',
    description: 'Pozisyonun bir kısmını satmayı önerir.',
  },
  rebalance: {
    label: 'KISMİ SATIŞ ÖNERİSİ',
    shortLabel: 'SAT',
    tone: 'warning',
    description: 'Pozisyon fazla büyük; bir kısmını satmayı önerir.',
  },
  avoid: {
    label: 'YENİ ALIM YAPMA',
    shortLabel: 'ALMA',
    tone: 'negative',
    description: 'Mevcut varlığa yeni alım yapmamanı önerir.',
  },
};

export const CONFIDENCE_LABELS: Record<AssistantConfidence, string> = {
  high: 'Yüksek veri uyumu',
  medium: 'Orta veri uyumu',
  low: 'Düşük veri uyumu',
};
