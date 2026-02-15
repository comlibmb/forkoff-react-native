/**
 * Tests for UsageStore - subscription usage tracking and limit enforcement.
 *
 * Tests getLimits, canX checks, incrementX actions, checkLimit, fetchUsage,
 * server limits, and reset time logic.
 */

jest.mock('@/services/api.client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

jest.mock('@/stores/auth.store', () => ({
  useAuthStore: {
    getState: jest.fn(() => ({
      user: { subscription: 'free' },
    })),
  },
}));

jest.mock('@/services/sentry.service', () => ({
  sentryService: { captureException: jest.fn() },
}));

jest.mock('@/services/analytics.service', () => ({
  analyticsService: { track: jest.fn() },
}));

import { useUsageStore, FREE_LIMITS, PRO_LIMITS } from '@/stores/usage.store';
import { useAuthStore } from '@/stores/auth.store';
import { apiClient } from '@/services/api.client';
import { sentryService } from '@/services/sentry.service';
import { analyticsService } from '@/services/analytics.service';
import { ServerSubscriptionLimits } from '@/types';

const mockGet = apiClient.get as jest.Mock;
const mockPost = apiClient.post as jest.Mock;

/** Helper: return an ISO string for a date in the past */
function pastDate(): string {
  return new Date(Date.now() - 60_000).toISOString();
}

/** Helper: return an ISO string for a date in the future */
function futureDate(): string {
  return new Date(Date.now() + 86_400_000).toISOString();
}

describe('UsageStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // reset() does not clear serverLimits, so we clear it explicitly
    useUsageStore.setState({ serverLimits: null });
    useUsageStore.getState().reset();

    // Default to free user
    (useAuthStore.getState as jest.Mock).mockReturnValue({
      user: { subscription: 'free' },
    });
  });

  // ---------------------------------------------------------------------------
  // getLimits
  // ---------------------------------------------------------------------------

  describe('getLimits', () => {
    it('returns FREE_LIMITS for a free user when no server limits are set', () => {
      const limits = useUsageStore.getState().getLimits();
      expect(limits).toEqual(FREE_LIMITS);
    });

    it('returns PRO_LIMITS for a pro user when no server limits are set', () => {
      (useAuthStore.getState as jest.Mock).mockReturnValue({
        user: { subscription: 'pro' },
      });

      const limits = useUsageStore.getState().getLimits();
      expect(limits).toEqual(PRO_LIMITS);
    });

    it('uses server limits when set and maps -1 to Infinity', () => {
      const serverLimits: ServerSubscriptionLimits = {
        free: {
          messagesPerDay: 15,
          sessionsPerMonth: 20,
          maxProjects: 3,
          maxDevices: 2,
          repairsPerMonth: -1,
          historyRetentionDays: 14,
        },
        pro: {
          messagesPerDay: -1,
          sessionsPerMonth: -1,
          maxProjects: -1,
          maxDevices: -1,
          repairsPerMonth: -1,
          historyRetentionDays: -1,
          maxPhoneSessions: 1,
        },
      };

      useUsageStore.getState().setServerLimits(serverLimits);

      // Free user should get the free tier from server limits
      const freeLimits = useUsageStore.getState().getLimits();
      expect(freeLimits.messagesPerDay).toBe(15);
      expect(freeLimits.sessionsPerMonth).toBe(20);
      expect(freeLimits.maxProjects).toBe(3);
      expect(freeLimits.maxDevices).toBe(2);
      expect(freeLimits.repairsPerMonth).toBe(Infinity); // -1 mapped to Infinity
      expect(freeLimits.historyRetentionDays).toBe(14);

      // Pro user should get the pro tier from server limits
      (useAuthStore.getState as jest.Mock).mockReturnValue({
        user: { subscription: 'pro' },
      });
      const proLimits = useUsageStore.getState().getLimits();
      expect(proLimits.messagesPerDay).toBe(Infinity);
      expect(proLimits.sessionsPerMonth).toBe(Infinity);
      expect(proLimits.maxPhoneSessions).toBe(1);
    });

    it('treats missing subscription as free tier', () => {
      (useAuthStore.getState as jest.Mock).mockReturnValue({
        user: { subscription: undefined },
      });

      const limits = useUsageStore.getState().getLimits();
      expect(limits).toEqual(FREE_LIMITS);
    });
  });

  // ---------------------------------------------------------------------------
  // canSendMessage
  // ---------------------------------------------------------------------------

  describe('canSendMessage', () => {
    it('returns true when messages used is under the limit', () => {
      useUsageStore.setState({ messagesUsedToday: 5 });
      expect(useUsageStore.getState().canSendMessage()).toBe(true);
    });

    it('returns false when messages used equals the limit', () => {
      useUsageStore.setState({
        messagesUsedToday: FREE_LIMITS.messagesPerDay,
        messageLimitResetAt: futureDate(),
      });
      expect(useUsageStore.getState().canSendMessage()).toBe(false);
    });

    it('resets counter and returns true when the reset time has passed', () => {
      useUsageStore.setState({
        messagesUsedToday: FREE_LIMITS.messagesPerDay,
        messageLimitResetAt: pastDate(),
      });

      expect(useUsageStore.getState().canSendMessage()).toBe(true);
      expect(useUsageStore.getState().messagesUsedToday).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // canStartSession
  // ---------------------------------------------------------------------------

  describe('canStartSession', () => {
    it('returns true when sessions used is under the limit', () => {
      useUsageStore.setState({ sessionsUsedThisMonth: 3 });
      expect(useUsageStore.getState().canStartSession()).toBe(true);
    });

    it('returns false when sessions used equals the limit', () => {
      useUsageStore.setState({
        sessionsUsedThisMonth: FREE_LIMITS.sessionsPerMonth,
        monthlyLimitResetAt: futureDate(),
      });
      expect(useUsageStore.getState().canStartSession()).toBe(false);
    });

    it('resets counter and returns true when monthly reset time has passed', () => {
      useUsageStore.setState({
        sessionsUsedThisMonth: FREE_LIMITS.sessionsPerMonth,
        monthlyLimitResetAt: pastDate(),
      });

      expect(useUsageStore.getState().canStartSession()).toBe(true);
      expect(useUsageStore.getState().sessionsUsedThisMonth).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // canAddProject
  // ---------------------------------------------------------------------------

  describe('canAddProject', () => {
    it('returns true when active project count is under the limit', () => {
      useUsageStore.setState({ activeProjectCount: 1 });
      expect(useUsageStore.getState().canAddProject()).toBe(true);
    });

    it('returns false when active project count equals the limit', () => {
      useUsageStore.setState({ activeProjectCount: FREE_LIMITS.maxProjects });
      expect(useUsageStore.getState().canAddProject()).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // canPairDevice
  // ---------------------------------------------------------------------------

  describe('canPairDevice', () => {
    it('returns true when paired device count is under the limit', () => {
      useUsageStore.setState({ pairedDeviceCount: 0 });
      expect(useUsageStore.getState().canPairDevice()).toBe(true);
    });

    it('returns false when paired device count equals the limit', () => {
      useUsageStore.setState({ pairedDeviceCount: FREE_LIMITS.maxDevices });
      expect(useUsageStore.getState().canPairDevice()).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // canRepairDevice
  // ---------------------------------------------------------------------------

  describe('canRepairDevice', () => {
    it('returns true when repairs used is under the limit', () => {
      useUsageStore.setState({ repairsUsedThisMonth: 1 });
      expect(useUsageStore.getState().canRepairDevice()).toBe(true);
    });

    it('returns false when repairs used equals the limit', () => {
      useUsageStore.setState({
        repairsUsedThisMonth: FREE_LIMITS.repairsPerMonth,
        monthlyLimitResetAt: futureDate(),
      });
      expect(useUsageStore.getState().canRepairDevice()).toBe(false);
    });

    it('resets counter and returns true when monthly reset time has passed', () => {
      useUsageStore.setState({
        repairsUsedThisMonth: FREE_LIMITS.repairsPerMonth,
        monthlyLimitResetAt: pastDate(),
      });

      expect(useUsageStore.getState().canRepairDevice()).toBe(true);
      expect(useUsageStore.getState().repairsUsedThisMonth).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // incrementMessages
  // ---------------------------------------------------------------------------

  describe('incrementMessages', () => {
    it('increments the counter and returns true when under the limit', () => {
      useUsageStore.setState({ messagesUsedToday: 0 });
      const result = useUsageStore.getState().incrementMessages();
      expect(result).toBe(true);
      expect(useUsageStore.getState().messagesUsedToday).toBe(1);
    });

    it('returns false and tracks analytics when at the limit', () => {
      useUsageStore.setState({
        messagesUsedToday: FREE_LIMITS.messagesPerDay,
        messageLimitResetAt: futureDate(),
      });

      const result = useUsageStore.getState().incrementMessages();
      expect(result).toBe(false);
      expect(analyticsService.track).toHaveBeenCalledWith('limit_reached', {
        limitType: 'messages_daily',
      });
    });
  });

  // ---------------------------------------------------------------------------
  // incrementSessions
  // ---------------------------------------------------------------------------

  describe('incrementSessions', () => {
    it('increments the counter, fires API call, and returns true when under the limit', () => {
      mockPost.mockResolvedValue({});
      useUsageStore.setState({ sessionsUsedThisMonth: 0 });

      const result = useUsageStore.getState().incrementSessions();
      expect(result).toBe(true);
      expect(useUsageStore.getState().sessionsUsedThisMonth).toBe(1);
      expect(mockPost).toHaveBeenCalledWith('/subscription/usage/session', {});
    });

    it('returns false and tracks analytics when at the limit', () => {
      useUsageStore.setState({
        sessionsUsedThisMonth: FREE_LIMITS.sessionsPerMonth,
        monthlyLimitResetAt: futureDate(),
      });

      const result = useUsageStore.getState().incrementSessions();
      expect(result).toBe(false);
      expect(analyticsService.track).toHaveBeenCalledWith('limit_reached', {
        limitType: 'sessions_monthly',
      });
      expect(mockPost).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // incrementRepairs
  // ---------------------------------------------------------------------------

  describe('incrementRepairs', () => {
    it('increments the counter, fires API call, and returns true when under the limit', () => {
      mockPost.mockResolvedValue({});
      useUsageStore.setState({ repairsUsedThisMonth: 0 });

      const result = useUsageStore.getState().incrementRepairs();
      expect(result).toBe(true);
      expect(useUsageStore.getState().repairsUsedThisMonth).toBe(1);
      expect(mockPost).toHaveBeenCalledWith('/subscription/usage/repair', {});
    });

    it('returns false and tracks analytics when at the limit', () => {
      useUsageStore.setState({
        repairsUsedThisMonth: FREE_LIMITS.repairsPerMonth,
        monthlyLimitResetAt: futureDate(),
      });

      const result = useUsageStore.getState().incrementRepairs();
      expect(result).toBe(false);
      expect(analyticsService.track).toHaveBeenCalledWith('limit_reached', {
        limitType: 'repairs_monthly',
      });
      expect(mockPost).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // checkLimit
  // ---------------------------------------------------------------------------

  describe('checkLimit', () => {
    it('returns correct result for messages_daily', () => {
      useUsageStore.setState({ messagesUsedToday: 5 });
      const result = useUsageStore.getState().checkLimit('messages_daily');

      expect(result.allowed).toBe(true);
      expect(result.limitType).toBe('messages_daily');
      expect(result.currentUsage).toBe(5);
      expect(result.limit).toBe(FREE_LIMITS.messagesPerDay);
      expect(result.resetAt).toBeDefined();
    });

    it('returns allowed: false for messages_daily when at limit', () => {
      useUsageStore.setState({
        messagesUsedToday: FREE_LIMITS.messagesPerDay,
        messageLimitResetAt: futureDate(),
      });

      const result = useUsageStore.getState().checkLimit('messages_daily');
      expect(result.allowed).toBe(false);
    });

    it('returns correct result for sessions_monthly', () => {
      useUsageStore.setState({ sessionsUsedThisMonth: 7 });
      const result = useUsageStore.getState().checkLimit('sessions_monthly');

      expect(result.allowed).toBe(true);
      expect(result.limitType).toBe('sessions_monthly');
      expect(result.currentUsage).toBe(7);
      expect(result.limit).toBe(FREE_LIMITS.sessionsPerMonth);
    });

    it('returns correct result for projects_max', () => {
      useUsageStore.setState({ activeProjectCount: 1 });
      const result = useUsageStore.getState().checkLimit('projects_max');

      expect(result.allowed).toBe(true);
      expect(result.limitType).toBe('projects_max');
      expect(result.currentUsage).toBe(1);
      expect(result.limit).toBe(FREE_LIMITS.maxProjects);
      expect(result.resetAt).toBeUndefined();
    });

    it('returns correct result for devices_max', () => {
      useUsageStore.setState({ pairedDeviceCount: FREE_LIMITS.maxDevices });
      const result = useUsageStore.getState().checkLimit('devices_max');

      expect(result.allowed).toBe(false);
      expect(result.limitType).toBe('devices_max');
      expect(result.currentUsage).toBe(FREE_LIMITS.maxDevices);
      expect(result.limit).toBe(FREE_LIMITS.maxDevices);
    });

    it('returns correct result for repairs_monthly', () => {
      useUsageStore.setState({ repairsUsedThisMonth: 2 });
      const result = useUsageStore.getState().checkLimit('repairs_monthly');

      expect(result.allowed).toBe(true);
      expect(result.limitType).toBe('repairs_monthly');
      expect(result.currentUsage).toBe(2);
      expect(result.limit).toBe(FREE_LIMITS.repairsPerMonth);
    });

    it('returns allowed: false for phone_session when user is free', () => {
      const result = useUsageStore.getState().checkLimit('phone_session');
      expect(result.allowed).toBe(false);
      expect(result.limitType).toBe('phone_session');
      expect(result.limit).toBe(0);
    });

    it('returns allowed: true for phone_session when user is pro', () => {
      (useAuthStore.getState as jest.Mock).mockReturnValue({
        user: { subscription: 'pro' },
      });

      const result = useUsageStore.getState().checkLimit('phone_session');
      expect(result.allowed).toBe(true);
      expect(result.limitType).toBe('phone_session');
      expect(result.limit).toBe(1);
    });

    it('returns allowed: true for unknown limit type', () => {
      const result = useUsageStore.getState().checkLimit('unknown_type' as any);
      expect(result.allowed).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // fetchUsage
  // ---------------------------------------------------------------------------

  describe('fetchUsage', () => {
    it('populates store from API response', async () => {
      const futureReset = futureDate();
      const futureMonthly = futureDate();

      mockGet.mockResolvedValue({
        messagesUsedToday: 3,
        messageLimitResetAt: futureReset,
        sessionsUsedThisMonth: 5,
        repairsUsedThisMonth: 1,
        monthlyLimitResetAt: futureMonthly,
        activeProjectCount: 2,
        pairedDeviceCount: 1,
      });

      await useUsageStore.getState().fetchUsage();

      const state = useUsageStore.getState();
      expect(state.messagesUsedToday).toBe(3);
      expect(state.messageLimitResetAt).toBe(futureReset);
      expect(state.sessionsUsedThisMonth).toBe(5);
      expect(state.repairsUsedThisMonth).toBe(1);
      expect(state.monthlyLimitResetAt).toBe(futureMonthly);
      expect(state.activeProjectCount).toBe(2);
      expect(state.pairedDeviceCount).toBe(1);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('resets daily counters when daily reset time has passed', async () => {
      mockGet.mockResolvedValue({
        messagesUsedToday: 8,
        messageLimitResetAt: pastDate(),
        sessionsUsedThisMonth: 5,
        repairsUsedThisMonth: 1,
        monthlyLimitResetAt: futureDate(),
        activeProjectCount: 1,
        pairedDeviceCount: 1,
      });

      await useUsageStore.getState().fetchUsage();

      const state = useUsageStore.getState();
      expect(state.messagesUsedToday).toBe(0);
      // messageLimitResetAt should have been recalculated (not the past date)
      expect(new Date(state.messageLimitResetAt).getTime()).toBeGreaterThan(Date.now());
    });

    it('resets monthly counters when monthly reset time has passed', async () => {
      mockGet.mockResolvedValue({
        messagesUsedToday: 3,
        messageLimitResetAt: futureDate(),
        sessionsUsedThisMonth: 10,
        repairsUsedThisMonth: 3,
        monthlyLimitResetAt: pastDate(),
        activeProjectCount: 1,
        pairedDeviceCount: 1,
      });

      await useUsageStore.getState().fetchUsage();

      const state = useUsageStore.getState();
      expect(state.sessionsUsedThisMonth).toBe(0);
      expect(state.repairsUsedThisMonth).toBe(0);
      expect(new Date(state.monthlyLimitResetAt).getTime()).toBeGreaterThan(Date.now());
    });

    it('sets error on API failure', async () => {
      mockGet.mockRejectedValue(new Error('Network error'));

      await useUsageStore.getState().fetchUsage();

      const state = useUsageStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Network error');
      expect(sentryService.captureException).toHaveBeenCalled();
    });

    it('sets generic error message for non-Error exceptions', async () => {
      mockGet.mockRejectedValue('something went wrong');

      await useUsageStore.getState().fetchUsage();

      const state = useUsageStore.getState();
      expect(state.error).toBe('Failed to fetch usage');
    });

    it('sets isLoading to true while fetching', async () => {
      let resolvePromise: (value: any) => void;
      mockGet.mockReturnValue(
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
      );

      const fetchPromise = useUsageStore.getState().fetchUsage();
      expect(useUsageStore.getState().isLoading).toBe(true);

      resolvePromise!({
        messagesUsedToday: 0,
        messageLimitResetAt: futureDate(),
        sessionsUsedThisMonth: 0,
        repairsUsedThisMonth: 0,
        monthlyLimitResetAt: futureDate(),
        activeProjectCount: 0,
        pairedDeviceCount: 0,
      });

      await fetchPromise;
      expect(useUsageStore.getState().isLoading).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // setters and reset
  // ---------------------------------------------------------------------------

  describe('setters and reset', () => {
    it('setServerLimits stores server limits', () => {
      const serverLimits: ServerSubscriptionLimits = {
        free: { ...FREE_LIMITS },
        pro: { ...PRO_LIMITS },
      };
      useUsageStore.getState().setServerLimits(serverLimits);
      expect(useUsageStore.getState().serverLimits).toEqual(serverLimits);
    });

    it('setActiveProjectCount updates the count', () => {
      useUsageStore.getState().setActiveProjectCount(5);
      expect(useUsageStore.getState().activeProjectCount).toBe(5);
    });

    it('setPairedDeviceCount updates the count', () => {
      useUsageStore.getState().setPairedDeviceCount(3);
      expect(useUsageStore.getState().pairedDeviceCount).toBe(3);
    });

    it('clearError clears the error state', () => {
      useUsageStore.setState({ error: 'some error' });
      useUsageStore.getState().clearError();
      expect(useUsageStore.getState().error).toBeNull();
    });

    it('reset restores all state to defaults', () => {
      // Set various state to non-default values
      useUsageStore.setState({
        messagesUsedToday: 10,
        sessionsUsedThisMonth: 5,
        repairsUsedThisMonth: 3,
        activeProjectCount: 2,
        pairedDeviceCount: 1,
        isLoading: true,
        error: 'some error',
      });

      useUsageStore.getState().reset();

      const state = useUsageStore.getState();
      expect(state.messagesUsedToday).toBe(0);
      expect(state.sessionsUsedThisMonth).toBe(0);
      expect(state.repairsUsedThisMonth).toBe(0);
      expect(state.activeProjectCount).toBe(0);
      expect(state.pairedDeviceCount).toBe(0);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('reset does not clear serverLimits', () => {
      const serverLimits: ServerSubscriptionLimits = {
        free: { ...FREE_LIMITS },
        pro: { ...PRO_LIMITS },
      };
      useUsageStore.getState().setServerLimits(serverLimits);
      useUsageStore.getState().reset();

      // serverLimits is NOT included in the reset() call in the store,
      // so it should be preserved
      expect(useUsageStore.getState().serverLimits).toEqual(serverLimits);
    });
  });

  // ---------------------------------------------------------------------------
  // initial state
  // ---------------------------------------------------------------------------

  describe('initial state', () => {
    it('has correct default values after reset', () => {
      const state = useUsageStore.getState();
      expect(state.messagesUsedToday).toBe(0);
      expect(state.sessionsUsedThisMonth).toBe(0);
      expect(state.repairsUsedThisMonth).toBe(0);
      expect(state.activeProjectCount).toBe(0);
      expect(state.pairedDeviceCount).toBe(0);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('messageLimitResetAt is set to a future date', () => {
      const state = useUsageStore.getState();
      expect(new Date(state.messageLimitResetAt).getTime()).toBeGreaterThan(Date.now());
    });

    it('monthlyLimitResetAt is set to a future date', () => {
      const state = useUsageStore.getState();
      expect(new Date(state.monthlyLimitResetAt).getTime()).toBeGreaterThan(Date.now());
    });
  });
});
