import { apiClient } from './api.client';
import { sentryService } from './sentry.service';
import { analyticsService } from './analytics.service';
import { SubscriptionLimits, SubscriptionUsage, ServerPlansResponse, ServerPlan, PromotionBanner } from '@/types';
import { useUsageStore } from '@/stores/usage.store';

export type SubscriptionTier = 'free' | 'pro';
export type SubscriptionStatus = 'active' | 'canceled' | 'expired' | 'trial';

export interface Subscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEnd?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  tier: SubscriptionTier;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  stripePriceId?: string;
  productId: {
    ios: string;
    android: string;
  };
}

export interface UsageStats {
  devices: {
    current: number;
    limit: number;
  };
  projects: {
    current: number;
    limit: number;
  };
  chatMessages: {
    current: number;
    limit: number;
  };
  apiCalls: {
    current: number;
    limit: number;
  };
}

const STRIPE_PRO_PRICE_ID = process.env.EXPO_PUBLIC_STRIPE_PRO_PRICE_ID || '';

const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    tier: 'free',
    price: 0,
    currency: 'USD',
    interval: 'month',
    features: [], // Populated dynamically in getPlans()
    productId: { ios: '', android: '' },
  },
  {
    id: 'pro_monthly',
    name: 'Pro Monthly',
    tier: 'pro',
    price: 9.99,
    currency: 'USD',
    interval: 'month',
    stripePriceId: STRIPE_PRO_PRICE_ID,
    features: [
      'Unlimited messages',
      'Unlimited sessions',
      'Unlimited projects',
      'Unlimited paired PCs',
      'Unlimited re-pairs',
      'Full history retention',
      'Single phone session',
    ],
    productId: { ios: 'com.forkoff.pro.monthly', android: 'com.forkoff.pro.monthly' },
  },
  {
    id: 'pro_yearly',
    name: 'Pro Yearly',
    tier: 'pro',
    price: 99.99,
    currency: 'USD',
    interval: 'year',
    stripePriceId: STRIPE_PRO_PRICE_ID,
    features: ['Everything in Pro Monthly', '2 months free'],
    productId: { ios: 'com.forkoff.pro.yearly', android: 'com.forkoff.pro.yearly' },
  },
];

/** Get the free tier limits (from server if available, otherwise hardcoded fallback) */
function getFreeLimits(): SubscriptionLimits {
  const { serverLimits } = useUsageStore.getState();
  if (serverLimits) {
    const map = (v: number) => (v === -1 ? Infinity : v);
    const f = serverLimits.free;
    return {
      messagesPerDay: map(f.messagesPerDay),
      sessionsPerMonth: map(f.sessionsPerMonth),
      maxProjects: map(f.maxProjects),
      maxDevices: map(f.maxDevices),
      repairsPerMonth: map(f.repairsPerMonth),
      historyRetentionDays: map(f.historyRetentionDays),
      maxPhoneSessions: f.maxPhoneSessions != null ? map(f.maxPhoneSessions) : undefined,
    };
  }
  return { messagesPerDay: 10, sessionsPerMonth: 10, maxProjects: 2, maxDevices: 1, repairsPerMonth: 3, historyRetentionDays: 7 };
}

const PLANS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

class SubscriptionService {
  private isInitialized = false;
  private serverPlans: ServerPlansResponse | null = null;
  private plansFetchedAt = 0;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // In a real app, this would initialize RevenueCat or similar
      // await Purchases.configure({ apiKey: Platform.OS === 'ios' ? IOS_KEY : ANDROID_KEY });
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize purchases:', error);
    }
  }

  getPlans(): SubscriptionPlan[] {
    const free = getFreeLimits();
    // Rebuild free plan features with dynamic limits
    return SUBSCRIPTION_PLANS.map((plan) => {
      if (plan.id !== 'free') return plan;
      return {
        ...plan,
        features: [
          `${free.messagesPerDay} messages/day`,
          `${free.sessionsPerMonth} sessions/month`,
          `${free.maxProjects} active projects`,
          `${free.maxDevices} paired PC`,
          `${free.repairsPerMonth} re-pairs/month`,
          `${free.historyRetentionDays}-day history`,
        ],
      };
    });
  }

  async fetchPlans(): Promise<ServerPlansResponse> {
    const now = Date.now();
    if (this.serverPlans && now - this.plansFetchedAt < PLANS_CACHE_TTL) {
      return this.serverPlans;
    }

    try {
      const response = await apiClient.get<ServerPlansResponse>('/app-config/plans');
      this.serverPlans = response;
      this.plansFetchedAt = Date.now();
      return response;
    } catch (error) {
      console.error('Failed to fetch plans from server:', error);
      // Return cached if available, otherwise build fallback
      if (this.serverPlans) {
        return this.serverPlans;
      }
      return {
        plans: SUBSCRIPTION_PLANS.map((p) => ({
          id: p.id,
          name: p.name,
          tier: p.tier,
          price: p.price,
          currency: p.currency,
          interval: p.interval,
          features: p.features.map((f) => (typeof f === 'string' ? { name: f, included: true } : { name: f, included: true })),
          popular: p.id === 'pro_monthly',
          stripePriceId: p.stripePriceId,
          productId: p.productId,
        })),
        allowPromotionCodes: true,
      };
    }
  }

  async getPlansAsync(): Promise<ServerPlan[]> {
    const response = await this.fetchPlans();
    const free = getFreeLimits();
    return response.plans.map((plan) => {
      if (plan.id !== 'free') return plan;
      return {
        ...plan,
        features: [
          { name: `${free.messagesPerDay} messages/day`, included: true },
          { name: `${free.sessionsPerMonth} sessions/month`, included: true },
          { name: `${free.maxProjects} active projects`, included: true },
          { name: `${free.maxDevices} paired PC`, included: true },
          { name: `${free.repairsPerMonth} re-pairs/month`, included: true },
          { name: `${free.historyRetentionDays}-day history`, included: true },
        ],
      };
    });
  }

  getPromotionBanner(): PromotionBanner | undefined {
    if (!this.serverPlans?.promotionBanner) return undefined;
    const banner = this.serverPlans.promotionBanner;
    if (banner.expiresAt && new Date(banner.expiresAt) <= new Date()) {
      return undefined;
    }
    return banner;
  }

  getCachedPlans(): ServerPlansResponse | null {
    return this.serverPlans;
  }

  getPlanById(planId: string): SubscriptionPlan | undefined {
    return SUBSCRIPTION_PLANS.find((plan) => plan.id === planId);
  }

  getPlansByTier(tier: SubscriptionTier): SubscriptionPlan[] {
    return SUBSCRIPTION_PLANS.filter((plan) => plan.tier === tier);
  }

  async getCurrentSubscription(): Promise<Subscription | null> {
    try {
      return await apiClient.get<Subscription>('/subscription');
    } catch (error) {
      return null;
    }
  }

  async getUsageStats(): Promise<UsageStats> {
    try {
      return await apiClient.get<UsageStats>('/subscription/usage');
    } catch (error) {
      // Return mock data for free tier
      return {
        devices: { current: 1, limit: 1 },
        projects: { current: 1, limit: 1 },
        chatMessages: { current: 50, limit: 100 },
        apiCalls: { current: 100, limit: 500 },
      };
    }
  }

  async createCheckoutSession(priceId: string): Promise<{ success: boolean; url?: string; error?: string }> {
    if (!priceId) {
      return { success: false, error: 'No price ID configured for this plan' };
    }

    try {
      const response = await apiClient.post<{ url: string }>('/stripe/checkout', { priceId });
      analyticsService.track('checkout_session_created', { priceId });
      return { success: true, url: response.url };
    } catch (error: any) {
      sentryService.captureException(error, { context: 'checkout_session', priceId });
      analyticsService.track('checkout_session_failed', { priceId, error: error.message });
      return {
        success: false,
        error: error.message || 'Failed to create checkout session',
      };
    }
  }

  async createPortalSession(): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      const response = await apiClient.post<{ url: string }>('/stripe/portal', {});
      return { success: true, url: response.url };
    } catch (error: any) {
      sentryService.captureException(error, { context: 'portal_session' });
      return {
        success: false,
        error: error.message || 'Failed to create portal session',
      };
    }
  }

  async purchaseSubscription(planId: string): Promise<{ success: boolean; url?: string; error?: string }> {
    const plan = this.getPlanById(planId);
    if (!plan) {
      return { success: false, error: 'Invalid plan' };
    }

    if (!plan.stripePriceId) {
      return { success: false, error: 'No price configured for this plan' };
    }

    return this.createCheckoutSession(plan.stripePriceId);
  }

  async restorePurchases(): Promise<{ success: boolean; subscription?: Subscription; error?: string }> {
    analyticsService.track('subscription_restore_requested');
    try {
      // In a real app, this would restore via RevenueCat
      // const customerInfo = await Purchases.restorePurchases();

      const subscription = await apiClient.post<Subscription>(
        '/subscription/restore',
        {}
      );

      return { success: true, subscription };
    } catch (error: any) {
      sentryService.captureException(error, { context: 'restore_purchases' });
      analyticsService.track('subscription_restore_failed', { error: error.message });
      return {
        success: false,
        error: error.message || 'Restore failed',
      };
    }
  }

  async cancelSubscription(): Promise<{ success: boolean; error?: string }> {
    analyticsService.track('subscription_cancel_requested');
    try {
      await apiClient.post('/subscription/cancel', {});
      return { success: true };
    } catch (error: any) {
      sentryService.captureException(error, { context: 'cancel_subscription' });
      return {
        success: false,
        error: error.message || 'Cancellation failed',
      };
    }
  }

  async reactivateSubscription(): Promise<{ success: boolean; error?: string }> {
    try {
      await apiClient.post('/subscription/reactivate', {});
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Reactivation failed',
      };
    }
  }

  isFeatureAvailable(feature: string, tier: SubscriptionTier): boolean {
    const featureAccess: Record<string, SubscriptionTier[]> = {
      'unlimited-devices': ['pro'],
      'unlimited-projects': ['pro'],
      'unlimited-messages': ['pro'],
      'unlimited-sessions': ['pro'],
      'unlimited-repairs': ['pro'],
      'full-history': ['pro'],
      'code-diff': ['pro'],
      'terminal-access': ['pro'],
      'priority-support': ['pro'],
    };

    const allowedTiers = featureAccess[feature];
    if (!allowedTiers) return true; // Feature not restricted

    return allowedTiers.includes(tier);
  }

  getUpgradeMessage(feature: string): string {
    const messages: Record<string, string> = {
      'unlimited-devices': 'Upgrade to Pro to connect unlimited devices',
      'unlimited-projects': 'Upgrade to Pro for unlimited projects',
      'unlimited-messages': 'Upgrade to Pro for unlimited messages',
      'unlimited-sessions': 'Upgrade to Pro for unlimited sessions',
      'unlimited-repairs': 'Upgrade to Pro for unlimited re-pairs',
      'full-history': 'Upgrade to Pro for full chat history',
      'code-diff': 'Upgrade to Pro to view code diffs',
      'terminal-access': 'Upgrade to Pro for terminal access',
    };

    return messages[feature] || 'Upgrade your plan to access this feature';
  }

  getLimitsForTier(tier: SubscriptionTier): SubscriptionLimits {
    const { serverLimits } = useUsageStore.getState();
    if (serverLimits) {
      const tierKey = tier === 'pro' ? 'pro' : 'free';
      const t = serverLimits[tierKey];
      const map = (v: number) => (v === -1 ? Infinity : v);
      return {
        messagesPerDay: map(t.messagesPerDay),
        sessionsPerMonth: map(t.sessionsPerMonth),
        maxProjects: map(t.maxProjects),
        maxDevices: map(t.maxDevices),
        repairsPerMonth: map(t.repairsPerMonth),
        historyRetentionDays: map(t.historyRetentionDays),
        maxPhoneSessions: t.maxPhoneSessions != null ? map(t.maxPhoneSessions) : undefined,
      };
    }
    // Fallback to hardcoded defaults from usage store
    return useUsageStore.getState().getLimits();
  }

  async fetchUsage(): Promise<SubscriptionUsage> {
    return apiClient.get<SubscriptionUsage>('/subscription/usage');
  }

  async recordMessageSent(): Promise<{ allowed: boolean; remaining: number }> {
    return apiClient.post<{ allowed: boolean; remaining: number }>('/subscription/usage/message', {});
  }

  async recordSessionStarted(): Promise<{ allowed: boolean; remaining: number }> {
    return apiClient.post<{ allowed: boolean; remaining: number }>('/subscription/usage/session', {});
  }

  async recordDeviceRepair(): Promise<{ allowed: boolean; remaining: number }> {
    return apiClient.post<{ allowed: boolean; remaining: number }>('/subscription/usage/repair', {});
  }
}

export const subscriptionService = new SubscriptionService();
