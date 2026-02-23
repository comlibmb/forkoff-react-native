import { create } from 'zustand';
import { SubscriptionLimits, LimitCheckResult, LimitType } from '@/types';
import { analyticsService } from '@/services/analytics.service';

// Open source: all limits are unlimited
const UNLIMITED: SubscriptionLimits = {
  messagesPerDay: Infinity,
  sessionsPerMonth: Infinity,
  maxProjects: Infinity,
  maxDevices: Infinity,
  repairsPerMonth: Infinity,
  historyRetentionDays: Infinity,
};

interface UsageState {
  // Local counters (analytics only, no enforcement)
  messagesUsedToday: number;
  sessionsUsedThisMonth: number;
  repairsUsedThisMonth: number;
  activeProjectCount: number;
  pairedDeviceCount: number;

  // Loading state (kept for interface compatibility)
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchUsage: () => Promise<void>;
  incrementMessages: () => boolean;
  incrementSessions: () => boolean;
  incrementRepairs: () => boolean;

  // Limit checks (always return true — no limits in open source)
  canSendMessage: () => boolean;
  canStartSession: () => boolean;
  canAddProject: () => boolean;
  canPairDevice: () => boolean;
  canRepairDevice: () => boolean;

  getLimits: () => SubscriptionLimits;
  checkLimit: (limitType: LimitType) => LimitCheckResult;

  setActiveProjectCount: (count: number) => void;
  setPairedDeviceCount: (count: number) => void;
  setServerLimits: (limits: any) => void;

  clearError: () => void;
  reset: () => void;
}

export const useUsageStore = create<UsageState>((set, get) => ({
  messagesUsedToday: 0,
  sessionsUsedThisMonth: 0,
  repairsUsedThisMonth: 0,
  activeProjectCount: 0,
  pairedDeviceCount: 0,
  isLoading: false,
  error: null,

  // No-op — no server to fetch from
  fetchUsage: async () => {},

  getLimits: () => UNLIMITED,

  // All limits are unlimited
  canSendMessage: () => true,
  canStartSession: () => true,
  canAddProject: () => true,
  canPairDevice: () => true,
  canRepairDevice: () => true,

  incrementMessages: () => {
    set((s) => ({ messagesUsedToday: s.messagesUsedToday + 1 }));
    analyticsService.track('message_sent_local');
    return true;
  },

  incrementSessions: () => {
    set((s) => ({ sessionsUsedThisMonth: s.sessionsUsedThisMonth + 1 }));
    return true;
  },

  incrementRepairs: () => {
    set((s) => ({ repairsUsedThisMonth: s.repairsUsedThisMonth + 1 }));
    return true;
  },

  checkLimit: (): LimitCheckResult => ({ allowed: true }),

  setActiveProjectCount: (count) => set({ activeProjectCount: count }),
  setPairedDeviceCount: (count) => set({ pairedDeviceCount: count }),

  // No-op — no server limits in open source
  setServerLimits: () => {},

  clearError: () => set({ error: null }),

  reset: () =>
    set({
      messagesUsedToday: 0,
      sessionsUsedThisMonth: 0,
      repairsUsedThisMonth: 0,
      activeProjectCount: 0,
      pairedDeviceCount: 0,
      isLoading: false,
      error: null,
    }),
}));

export default useUsageStore;
