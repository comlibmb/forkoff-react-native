import { useState, useCallback, useMemo } from 'react';
import { useUsageStore, FREE_LIMITS, PRO_LIMITS } from '@/stores/usage.store';
import { useAuthStore } from '@/stores/auth.store';
import { LimitType, LimitCheckResult, SubscriptionLimits } from '@/types';
import { analyticsService } from '@/services/analytics.service';

export interface UseSubscriptionLimitsReturn {
  // Check + trigger paywall if needed
  checkMessageLimit: () => LimitCheckResult;
  checkSessionLimit: () => LimitCheckResult;
  checkProjectLimit: () => LimitCheckResult;
  checkDeviceLimit: () => LimitCheckResult;
  checkRepairLimit: () => LimitCheckResult;

  // Paywall control
  showPaywall: boolean;
  paywallLimitType: LimitType | null;
  dismissPaywall: () => void;
  triggerPaywall: (limitType: LimitType) => void;

  // Usage info
  limits: SubscriptionLimits;
  usage: {
    messagesUsedToday: number;
    sessionsUsedThisMonth: number;
    repairsUsedThisMonth: number;
    activeProjectCount: number;
    pairedDeviceCount: number;
  };
  tier: 'free' | 'pro' | 'team';
  isPro: boolean;

  // Reset info
  messageLimitResetAt: string;
  monthlyLimitResetAt: string;
}

export function useSubscriptionLimits(): UseSubscriptionLimitsReturn {
  const user = useAuthStore((state) => state.user);
  const tier = user?.subscription || 'free';
  const isPro = tier === 'pro' || tier === 'team';

  const {
    messagesUsedToday,
    messageLimitResetAt,
    sessionsUsedThisMonth,
    repairsUsedThisMonth,
    monthlyLimitResetAt,
    activeProjectCount,
    pairedDeviceCount,
    checkLimit,
    incrementMessages,
    incrementSessions,
    incrementRepairs,
  } = useUsageStore();

  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallLimitType, setPaywallLimitType] = useState<LimitType | null>(null);

  const limits = useMemo(() => (isPro ? PRO_LIMITS : FREE_LIMITS), [isPro]);

  const usage = useMemo(
    () => ({
      messagesUsedToday,
      sessionsUsedThisMonth,
      repairsUsedThisMonth,
      activeProjectCount,
      pairedDeviceCount,
    }),
    [messagesUsedToday, sessionsUsedThisMonth, repairsUsedThisMonth, activeProjectCount, pairedDeviceCount]
  );

  const triggerPaywall = useCallback((limitType: LimitType) => {
    setPaywallLimitType(limitType);
    setShowPaywall(true);

    analyticsService.track('paywall_triggered', {
      limitType,
      tier,
    });
  }, [tier]);

  const dismissPaywall = useCallback(() => {
    setShowPaywall(false);
    setPaywallLimitType(null);

    analyticsService.track('paywall_dismissed', {
      limitType: paywallLimitType,
      tier,
    });
  }, [paywallLimitType, tier]);

  const checkMessageLimit = useCallback((): LimitCheckResult => {
    const result = checkLimit('messages_daily');
    if (!result.allowed) {
      triggerPaywall('messages_daily');
    }
    return result;
  }, [checkLimit, triggerPaywall]);

  const checkSessionLimit = useCallback((): LimitCheckResult => {
    const result = checkLimit('sessions_monthly');
    if (!result.allowed) {
      triggerPaywall('sessions_monthly');
    }
    return result;
  }, [checkLimit, triggerPaywall]);

  const checkProjectLimit = useCallback((): LimitCheckResult => {
    const result = checkLimit('projects_max');
    if (!result.allowed) {
      triggerPaywall('projects_max');
    }
    return result;
  }, [checkLimit, triggerPaywall]);

  const checkDeviceLimit = useCallback((): LimitCheckResult => {
    const result = checkLimit('devices_max');
    if (!result.allowed) {
      triggerPaywall('devices_max');
    }
    return result;
  }, [checkLimit, triggerPaywall]);

  const checkRepairLimit = useCallback((): LimitCheckResult => {
    const result = checkLimit('repairs_monthly');
    if (!result.allowed) {
      triggerPaywall('repairs_monthly');
    }
    return result;
  }, [checkLimit, triggerPaywall]);

  return {
    checkMessageLimit,
    checkSessionLimit,
    checkProjectLimit,
    checkDeviceLimit,
    checkRepairLimit,
    showPaywall,
    paywallLimitType,
    dismissPaywall,
    triggerPaywall,
    limits,
    usage,
    tier,
    isPro,
    messageLimitResetAt,
    monthlyLimitResetAt,
  };
}

export default useSubscriptionLimits;
