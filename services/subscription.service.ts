import { apiClient } from './api.client';
import { SubscriptionLimits, SubscriptionUsage } from '@/types';

export type SubscriptionTier = 'free' | 'pro' | 'team';
export type SubscriptionStatus = 'active' | 'canceled' | 'expired' | 'trial';

// Limit constants
export const FREE_LIMITS: SubscriptionLimits = {
  messagesPerDay: 20,
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
    features: [
      `${FREE_LIMITS.messagesPerDay} messages/day`,
      `${FREE_LIMITS.sessionsPerMonth} sessions/month`,
      `${FREE_LIMITS.maxProjects} active projects`,
      `${FREE_LIMITS.maxDevices} paired PC`,
      `${FREE_LIMITS.repairsPerMonth} re-pairs/month`,
      `${FREE_LIMITS.historyRetentionDays}-day history`,
    ],
    productId: {
      ios: '',
      android: '',
    },
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
    productId: {
      ios: 'com.forkoff.pro.monthly',
      android: 'com.forkoff.pro.monthly',
    },
  },
  {
    id: 'pro_yearly',
    name: 'Pro Yearly',
    tier: 'pro',
    price: 99.99,
    currency: 'USD',
    interval: 'year',
    stripePriceId: STRIPE_PRO_PRICE_ID,
    features: [
      'Everything in Pro Monthly',
      '2 months free',
    ],
    productId: {
      ios: 'com.forkoff.pro.yearly',
      android: 'com.forkoff.pro.yearly',
    },
  },
  {
    id: 'team_monthly',
    name: 'Team Monthly',
    tier: 'team',
    price: 29.99,
    currency: 'USD',
    interval: 'month',
    features: [
      'Everything in Pro',
      'Team collaboration',
      'Shared devices',
      'Admin dashboard',
      'SSO integration',
      'Dedicated support',
    ],
    productId: {
      ios: 'com.forkoff.team.monthly',
      android: 'com.forkoff.team.monthly',
    },
  },
];

class SubscriptionService {
  private isInitialized = false;

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
    return SUBSCRIPTION_PLANS;
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
      return { success: true, url: response.url };
    } catch (error: any) {
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
    try {
      // In a real app, this would restore via RevenueCat
      // const customerInfo = await Purchases.restorePurchases();

      const subscription = await apiClient.post<Subscription>(
        '/subscription/restore',
        {}
      );

      return { success: true, subscription };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Restore failed',
      };
    }
  }

  async cancelSubscription(): Promise<{ success: boolean; error?: string }> {
    try {
      await apiClient.post('/subscription/cancel', {});
      return { success: true };
    } catch (error: any) {
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
      'unlimited-devices': ['pro', 'team'],
      'unlimited-projects': ['pro', 'team'],
      'unlimited-messages': ['pro', 'team'],
      'unlimited-sessions': ['pro', 'team'],
      'unlimited-repairs': ['pro', 'team'],
      'full-history': ['pro', 'team'],
      'code-diff': ['pro', 'team'],
      'terminal-access': ['pro', 'team'],
      'priority-support': ['pro', 'team'],
      'team-collaboration': ['team'],
      'sso': ['team'],
      'admin-dashboard': ['team'],
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
      'team-collaboration': 'Upgrade to Team for collaboration features',
    };

    return messages[feature] || 'Upgrade your plan to access this feature';
  }

  getLimitsForTier(tier: SubscriptionTier): SubscriptionLimits {
    return tier === 'pro' || tier === 'team' ? PRO_LIMITS : FREE_LIMITS;
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
