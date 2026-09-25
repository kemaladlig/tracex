import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type {
  AssistantSettings,
  RecommendationLogEntry,
  RiskPreset,
} from '../types/assistant';

export const DEFAULT_ASSISTANT_SETTINGS: AssistantSettings = {
  enabled: false,
  riskProfile: 'balanced',
  horizon: 'medium',
  availableCashUsd: 0,
  monthlyContributionUsd: 0,
  maxAssetPercent: 35,
  maxAltPercent: 45,
  stableReservePercent: 15,
  riskPerIdeaPercent: 0.75,
  dcaTranches: 4,
  minimumTradeUsd: 5,
};

export const ASSISTANT_RISK_PRESETS: Record<AssistantSettings['riskProfile'], RiskPreset> = {
  conservative: {
    maxAssetPercent: 25,
    maxAltPercent: 25,
    stableReservePercent: 30,
    riskPerIdeaPercent: 0.5,
  },
  balanced: {
    maxAssetPercent: 35,
    maxAltPercent: 45,
    stableReservePercent: 15,
    riskPerIdeaPercent: 0.75,
  },
  aggressive: {
    maxAssetPercent: 45,
    maxAltPercent: 65,
    stableReservePercent: 5,
    riskPerIdeaPercent: 1,
  },
};

interface AssistantState {
  profilesByGroup: Record<string, AssistantSettings>;
  recommendationLogByGroup: Record<string, RecommendationLogEntry[]>;
  setSettings: (groupId: string, patch: Partial<AssistantSettings>) => void;
  addLogEntries: (groupId: string, entries: RecommendationLogEntry[]) => void;
}

export const useAssistantStore = create<AssistantState>()(
  persist(
    (set) => ({
      profilesByGroup: {},
      recommendationLogByGroup: {},
      setSettings: (groupId, patch) =>
        set((state) => {
          const current = state.profilesByGroup[groupId] ?? DEFAULT_ASSISTANT_SETTINGS;
          return {
            profilesByGroup: {
              ...state.profilesByGroup,
              [groupId]: { ...current, ...patch },
            },
          };
        }),
      addLogEntries: (groupId, entries) =>
        set((state) => {
          const current = state.recommendationLogByGroup[groupId] ?? [];
          const incomingIds = new Set(entries.map((entry) => entry.id));
          return {
            recommendationLogByGroup: {
              ...state.recommendationLogByGroup,
              [groupId]: [
                ...entries,
                ...current.filter((entry) => !incomingIds.has(entry.id)),
              ].slice(0, 40),
            },
          };
        }),
    }),
    {
      name: 'tracex-assistant-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        profilesByGroup: state.profilesByGroup,
        recommendationLogByGroup: state.recommendationLogByGroup,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        for (const [groupId, profile] of Object.entries(state.profilesByGroup)) {
          state.profilesByGroup[groupId] = {
            ...DEFAULT_ASSISTANT_SETTINGS,
            ...profile,
            availableCashUsd: Number.isFinite(profile.availableCashUsd) ? Math.max(0, profile.availableCashUsd) : 0,
            monthlyContributionUsd: Number.isFinite(profile.monthlyContributionUsd)
              ? Math.max(0, profile.monthlyContributionUsd)
              : 0,
            dcaTranches: Math.min(6, Math.max(2, Math.round(profile.dcaTranches))),
          };
        }
      },
    }
  )
);
