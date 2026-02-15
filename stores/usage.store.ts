import { create } from 'zustand';
import { SubscriptionUsage, LimitCheckResult, LimitType, SubscriptionLimits, ServerSubscriptionLimits } from '@/types';
import { apiClient } from '@/services/api.client';
import { useAuthStore } from './auth.store';
import { sentryService } from '@/services/sentry.service';
import { analyticsService } from '@/services/analytics.service';

// Hardcoded fallback limits (used when server limits haven't loaded yet)
export const FREE_LIMITS: SubscriptionLimits = {
  messagesPerDay: 10,
  sessionsPerMonth: 10,
  maxProjects: 2,
  maxDevices: 1,
  repairsPerMonth: 3,
  historyRetentionDays: 7,
};

export const PRO_LIMITS: SubscriptionLimits = {
  messagesPerDay: Infinity,
  sessionsPerMonth: Infinity,
  maxProjects: Infinity,
  maxDevices: Infinity,
  repairsPerMonth: Infinity,
  historyRetentionDays: Infinity,
  maxPhoneSessions: 1,
};

/** Map -1 → Infinity for server-provided limits */
function mapServerLimits(limits: SubscriptionLimits): SubscriptionLimits {
  const map = (v: number) => (v === -1 ? Infinity : v);
  return {
    messagesPerDay: map(limits.messagesPerDay),
    sessionsPerMonth: map(limits.sessionsPerMonth),
    maxProjects: map(limits.maxProjects),
    maxDevices: map(limits.maxDevices),
    repairsPerMonth: map(limits.repairsPerMonth),
    historyRetentionDays: map(limits.historyRetentionDays),
    maxPhoneSessions: limits.maxPhoneSessions != null ? map(limits.maxPhoneSessions) : undefined,
  };
}

interface UsageState {
  // Daily (reset at midnight UTC)
  messagesUsedToday: number;
  messageLimitResetAt: string;

  // Monthly (reset on billing cycle)
  sessionsUsedThisMonth: number;
  repairsUsedThisMonth: number;
  monthlyLimitResetAt: string;

  // Real-time counts
  activeProjectCount: number;
  pairedDeviceCount: number;

  // Server-provided limits (null = not yet loaded, uses hardcoded fallback)
  serverLimits: ServerSubscriptionLimits | null;

  // Loading state
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchUsage: () => Promise<void>;
  incrementMessages: () => boolean;
  incrementSessions: () => boolean;
  incrementRepairs: () => boolean;

  // Limit checks
  canSendMessage: () => boolean;
  canStartSession: () => boolean;
  canAddProject: () => boolean;
  canPairDevice: () => boolean;
  canRepairDevice: () => boolean;

  // Get current limits based on tier
  getLimits: () => SubscriptionLimits;

  // Check limit and return result
  checkLimit: (limitType: LimitType) => LimitCheckResult;

  // Update counts
  setActiveProjectCount: (count: number) => void;
  setPairedDeviceCount: (count: number) => void;

  // Server limits
  setServerLimits: (limits: ServerSubscriptionLimits) => void;

  // Clear
  clearError: () => void;
  reset: () => void;
}

// Helper to get midnight UTC for today
function getMidnightUTC(): string {
  const now = new Date();
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));
  return tomorrow.toISOString();
}

// Helper to get end of current month UTC
function getEndOfMonthUTC(): string {
  const now = new Date();
  const endOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  return endOfMonth.toISOString();
}

// Helper to check if reset time has passed
function hasResetTimePassed(resetAt: string): boolean {
  return new Date(resetAt).getTime() <= Date.now();
}

export const useUsageStore = create<UsageState>((set, get) => ({
  // Initial state
  messagesUsedToday: 0,
  messageLimitResetAt: getMidnightUTC(),
  sessionsUsedThisMonth: 0,
  repairsUsedThisMonth: 0,
  monthlyLimitResetAt: getEndOfMonthUTC(),
  activeProjectCount: 0,
  pairedDeviceCount: 0,
  serverLimits: null,
  isLoading: false,
  error: null,

  fetchUsage: async () => {
    try {
      set({ isLoading: true, error: null });

      const usage = await apiClient.get<SubscriptionUsage>('/subscription/usage');

      // Check if daily reset has passed
      const dailyResetPassed = hasResetTimePassed(usage.messageLimitResetAt);
      const monthlyResetPassed = hasResetTimePassed(usage.monthlyLimitResetAt);

      set({
        messagesUsedToday: dailyResetPassed ? 0 : usage.messagesUsedToday,
        messageLimitResetAt: dailyResetPassed ? getMidnightUTC() : usage.messageLimitResetAt,
        sessionsUsedThisMonth: monthlyResetPassed ? 0 : usage.sessionsUsedThisMonth,
        repairsUsedThisMonth: monthlyResetPassed ? 0 : usage.repairsUsedThisMonth,
        monthlyLimitResetAt: monthlyResetPassed ? getEndOfMonthUTC() : usage.monthlyLimitResetAt,
        activeProjectCount: usage.activeProjectCount,
        pairedDeviceCount: usage.pairedDeviceCount,
        isLoading: false,
      });
    } catch (error) {
      sentryService.captureException(error, { context: 'fetch_usage' });
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch usage',
      });
    }
  },

  getLimits: () => {
    const user = useAuthStore.getState().user;
    const tier = user?.subscription || 'free';
    const { serverLimits } = get();

    if (serverLimits) {
      const tierKey = tier === 'pro' ? 'pro' : 'free';
      return mapServerLimits(serverLimits[tierKey]);
    }

    // Fallback to hardcoded limits
    return tier === 'pro' ? PRO_LIMITS : FREE_LIMITS;
  },

  canSendMessage: () => {
    const state = get();
    const limits = state.getLimits();

    // Check if daily reset has passed
    if (hasResetTimePassed(state.messageLimitResetAt)) {
      set({
        messagesUsedToday: 0,
        messageLimitResetAt: getMidnightUTC(),
      });
      return true;
    }

    return state.messagesUsedToday < limits.messagesPerDay;
  },

  canStartSession: () => {
    const state = get();
    const limits = state.getLimits();

    // Check if monthly reset has passed
    if (hasResetTimePassed(state.monthlyLimitResetAt)) {
      set({
        sessionsUsedThisMonth: 0,
        monthlyLimitResetAt: getEndOfMonthUTC(),
      });
      return true;
    }

    return state.sessionsUsedThisMonth < limits.sessionsPerMonth;
  },

  canAddProject: () => {
    const state = get();
    const limits = state.getLimits();
    return state.activeProjectCount < limits.maxProjects;
  },

  canPairDevice: () => {
    const state = get();
    const limits = state.getLimits();
    return state.pairedDeviceCount < limits.maxDevices;
  },

  canRepairDevice: () => {
    const state = get();
    const limits = state.getLimits();

    // Check if monthly reset has passed
    if (hasResetTimePassed(state.monthlyLimitResetAt)) {
      set({
        repairsUsedThisMonth: 0,
        monthlyLimitResetAt: getEndOfMonthUTC(),
      });
      return true;
    }

    return state.repairsUsedThisMonth < limits.repairsPerMonth;
  },

  incrementMessages: () => {
    const state = get();
    if (!state.canSendMessage()) {
      analyticsService.track('limit_reached', { limitType: 'messages_daily' });
      return false;
    }

    // Only increment locally - server tracks via WebSocket gateway
    set((s) => ({ messagesUsedToday: s.messagesUsedToday + 1 }));

    return true;
  },

  incrementSessions: () => {
    const state = get();
    if (!state.canStartSession()) {
      analyticsService.track('limit_reached', { limitType: 'sessions_monthly' });
      return false;
    }

    set((s) => ({ sessionsUsedThisMonth: s.sessionsUsedThisMonth + 1 }));

    // Record on server (fire and forget)
    apiClient.post('/subscription/usage/session', {}).catch((error) => {
      sentryService.captureException(error, { context: 'record_session_usage' });
    });

    return true;
  },

  incrementRepairs: () => {
    const state = get();
    if (!state.canRepairDevice()) {
      analyticsService.track('limit_reached', { limitType: 'repairs_monthly' });
      return false;
    }

    set((s) => ({ repairsUsedThisMonth: s.repairsUsedThisMonth + 1 }));

    // Record on server (fire and forget)
    apiClient.post('/subscription/usage/repair', {}).catch((error) => {
      sentryService.captureException(error, { context: 'record_repair_usage' });
    });

    return true;
  },

  checkLimit: (limitType: LimitType): LimitCheckResult => {
    const state = get();
    const limits = state.getLimits();

    switch (limitType) {
      case 'messages_daily':
        return {
          allowed: state.canSendMessage(),
          limitType,
          currentUsage: state.messagesUsedToday,
          limit: limits.messagesPerDay,
          resetAt: state.messageLimitResetAt,
        };

      case 'sessions_monthly':
        return {
          allowed: state.canStartSession(),
          limitType,
          currentUsage: state.sessionsUsedThisMonth,
          limit: limits.sessionsPerMonth,
          resetAt: state.monthlyLimitResetAt,
        };

      case 'projects_max':
        return {
          allowed: state.canAddProject(),
          limitType,
          currentUsage: state.activeProjectCount,
          limit: limits.maxProjects,
        };

      case 'devices_max':
        return {
          allowed: state.canPairDevice(),
          limitType,
          currentUsage: state.pairedDeviceCount,
          limit: limits.maxDevices,
        };

      case 'repairs_monthly':
        return {
          allowed: state.canRepairDevice(),
          limitType,
          currentUsage: state.repairsUsedThisMonth,
          limit: limits.repairsPerMonth,
          resetAt: state.monthlyLimitResetAt,
        };

      case 'phone_session':
        // Pro feature - always allowed for Pro, never for free
        const user = useAuthStore.getState().user;
        const isPro = user?.subscription === 'pro';
        return {
          allowed: isPro,
          limitType,
          limit: isPro ? 1 : 0,
        };

      default:
        return { allowed: true };
    }
  },

  setActiveProjectCount: (count) => set({ activeProjectCount: count }),
  setPairedDeviceCount: (count) => set({ pairedDeviceCount: count }),

  setServerLimits: (limits) => set({ serverLimits: limits }),

  clearError: () => set({ error: null }),

  reset: () =>
    set({
      messagesUsedToday: 0,
      messageLimitResetAt: getMidnightUTC(),
      sessionsUsedThisMonth: 0,
      repairsUsedThisMonth: 0,
      monthlyLimitResetAt: getEndOfMonthUTC(),
      activeProjectCount: 0,
      pairedDeviceCount: 0,
      isLoading: false,
      error: null,
    }),
}));

export default useUsageStore;
