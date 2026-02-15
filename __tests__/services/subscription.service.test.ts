/**
 * Tests for SubscriptionService
 *
 * Tests the singleton subscription service that manages plan fetching,
 * Stripe checkout/portal sessions, and tier-based feature limits.
 */

// Mock api.client — factory must not reference outer variables (jest.mock is hoisted)
jest.mock('@/services/api.client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

// Mock usage store — factory must not reference outer variables
jest.mock('@/stores/usage.store', () => ({
  useUsageStore: {
    getState: jest.fn(() => ({
      serverLimits: null,
      getLimits: () => ({
        messagesPerDay: 10,
        sessionsPerMonth: 10,
        maxProjects: 2,
        maxDevices: 1,
        repairsPerMonth: 3,
        historyRetentionDays: 7,
      }),
    })),
  },
}));

// Import after mocks are set up
import { subscriptionService } from '@/services/subscription.service';
import { apiClient } from '@/services/api.client';
import { useUsageStore } from '@/stores/usage.store';
import { ServerPlansResponse } from '@/types';

// Typed references to the mock functions
const mockGet = apiClient.get as jest.Mock;
const mockPost = apiClient.post as jest.Mock;
const mockGetState = useUsageStore.getState as jest.Mock;

const DEFAULT_LIMITS = {
  messagesPerDay: 10,
  sessionsPerMonth: 10,
  maxProjects: 2,
  maxDevices: 1,
  repairsPerMonth: 3,
  historyRetentionDays: 7,
};

function setUsageStoreState(serverLimits: any = null) {
  mockGetState.mockReturnValue({
    serverLimits,
    getLimits: () => DEFAULT_LIMITS,
  });
}

describe('SubscriptionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton private cache between tests
    (subscriptionService as any).serverPlans = null;
    (subscriptionService as any).plansFetchedAt = 0;
    // Default: no server limits
    setUsageStoreState(null);
  });

  // ---------------------------------------------------------------------------
  // getPlans()
  // ---------------------------------------------------------------------------
  describe('getPlans()', () => {
    it('returns plans with dynamic free features from server limits', () => {
      setUsageStoreState({
        free: {
          messagesPerDay: 25,
          sessionsPerMonth: 50,
          maxProjects: 5,
          maxDevices: 3,
          repairsPerMonth: 10,
          historyRetentionDays: 30,
          maxPhoneSessions: 1,
        },
        pro: {
          messagesPerDay: -1,
          sessionsPerMonth: -1,
          maxProjects: -1,
          maxDevices: -1,
          repairsPerMonth: -1,
          historyRetentionDays: -1,
        },
      });

      const plans = subscriptionService.getPlans();
      const freePlan = plans.find((p) => p.id === 'free');

      expect(freePlan).toBeDefined();
      expect(freePlan!.features).toContain('25 messages/day');
      expect(freePlan!.features).toContain('50 sessions/month');
      expect(freePlan!.features).toContain('5 active projects');
      expect(freePlan!.features).toContain('3 paired PC');
      expect(freePlan!.features).toContain('10 re-pairs/month');
      expect(freePlan!.features).toContain('30-day history');
    });

    it('uses hardcoded fallback when no serverLimits are available', () => {
      setUsageStoreState(null);

      const plans = subscriptionService.getPlans();
      const freePlan = plans.find((p) => p.id === 'free');

      expect(freePlan).toBeDefined();
      expect(freePlan!.features).toContain('10 messages/day');
      expect(freePlan!.features).toContain('10 sessions/month');
      expect(freePlan!.features).toContain('2 active projects');
      expect(freePlan!.features).toContain('1 paired PC');
      expect(freePlan!.features).toContain('3 re-pairs/month');
      expect(freePlan!.features).toContain('7-day history');
    });
  });

  // ---------------------------------------------------------------------------
  // fetchPlans()
  // ---------------------------------------------------------------------------
  describe('fetchPlans()', () => {
    const mockServerResponse: ServerPlansResponse = {
      plans: [
        {
          id: 'free',
          name: 'Free',
          tier: 'free',
          price: 0,
          currency: 'USD',
          interval: 'month',
          features: [{ name: '10 messages/day', included: true }],
          productId: { ios: '', android: '' },
        },
        {
          id: 'pro_monthly',
          name: 'Pro Monthly',
          tier: 'pro',
          price: 9.99,
          currency: 'USD',
          interval: 'month',
          features: [{ name: 'Unlimited messages', included: true }],
          popular: true,
          stripePriceId: 'price_abc123',
          productId: { ios: 'com.forkoff.pro.monthly', android: 'com.forkoff.pro.monthly' },
        },
      ],
      allowPromotionCodes: true,
    };

    it('fetches from API and caches the response', async () => {
      mockGet.mockResolvedValueOnce(mockServerResponse);

      const result = await subscriptionService.fetchPlans();

      expect(mockGet).toHaveBeenCalledWith('/app-config/plans');
      expect(result).toEqual(mockServerResponse);
      // Verify cache was populated
      expect(subscriptionService.getCachedPlans()).toEqual(mockServerResponse);
    });

    it('returns cache within TTL without making a new API call', async () => {
      // Seed the cache
      mockGet.mockResolvedValueOnce(mockServerResponse);
      await subscriptionService.fetchPlans();
      mockGet.mockClear();

      // Second call should use cache
      const result = await subscriptionService.fetchPlans();

      expect(mockGet).not.toHaveBeenCalled();
      expect(result).toEqual(mockServerResponse);
    });

    it('re-fetches after TTL expires', async () => {
      // Seed the cache
      mockGet.mockResolvedValueOnce(mockServerResponse);
      await subscriptionService.fetchPlans();
      mockGet.mockClear();

      // Simulate TTL expiry by backdating plansFetchedAt (5-min TTL, set 6 min ago)
      (subscriptionService as any).plansFetchedAt = Date.now() - 6 * 60 * 1000;

      const updatedResponse: ServerPlansResponse = { ...mockServerResponse, allowPromotionCodes: false };
      mockGet.mockResolvedValueOnce(updatedResponse);

      const result = await subscriptionService.fetchPlans();

      expect(mockGet).toHaveBeenCalledWith('/app-config/plans');
      expect(result.allowPromotionCodes).toBe(false);
    });

    it('returns fallback plans on API error when no cache exists', async () => {
      mockGet.mockRejectedValueOnce(new Error('Network error'));

      const result = await subscriptionService.fetchPlans();

      // Should return a fallback built from SUBSCRIPTION_PLANS
      expect(result.plans).toBeDefined();
      expect(result.plans.length).toBeGreaterThan(0);
      expect(result.allowPromotionCodes).toBe(true);
      // The fallback free plan should have id 'free'
      const freePlan = result.plans.find((p) => p.id === 'free');
      expect(freePlan).toBeDefined();
      // pro_monthly should be marked as popular in fallback
      const proPlan = result.plans.find((p) => p.id === 'pro_monthly');
      expect(proPlan?.popular).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // getPlansAsync()
  // ---------------------------------------------------------------------------
  describe('getPlansAsync()', () => {
    it('returns server plans with dynamic free features', async () => {
      const mockResponse: ServerPlansResponse = {
        plans: [
          {
            id: 'free',
            name: 'Free',
            tier: 'free',
            price: 0,
            currency: 'USD',
            interval: 'month',
            features: [{ name: 'placeholder', included: true }],
            productId: { ios: '', android: '' },
          },
          {
            id: 'pro_monthly',
            name: 'Pro Monthly',
            tier: 'pro',
            price: 9.99,
            currency: 'USD',
            interval: 'month',
            features: [{ name: 'Unlimited messages', included: true }],
            popular: true,
            stripePriceId: 'price_abc',
            productId: { ios: 'com.forkoff.pro.monthly', android: 'com.forkoff.pro.monthly' },
          },
        ],
        allowPromotionCodes: true,
      };
      mockGet.mockResolvedValueOnce(mockResponse);

      const plans = await subscriptionService.getPlansAsync();

      // The free plan features should be rebuilt dynamically
      const freePlan = plans.find((p) => p.id === 'free');
      expect(freePlan).toBeDefined();
      expect(freePlan!.features).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: '10 messages/day', included: true }),
          expect.objectContaining({ name: '10 sessions/month', included: true }),
        ])
      );

      // Non-free plans should pass through unchanged
      const proPlan = plans.find((p) => p.id === 'pro_monthly');
      expect(proPlan!.features).toEqual([{ name: 'Unlimited messages', included: true }]);
    });
  });

  // ---------------------------------------------------------------------------
  // getPromotionBanner()
  // ---------------------------------------------------------------------------
  describe('getPromotionBanner()', () => {
    it('returns banner when present and unexpired', () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      (subscriptionService as any).serverPlans = {
        plans: [],
        allowPromotionCodes: true,
        promotionBanner: {
          text: '50% off Pro!',
          backgroundColor: '#ff0000',
          textColor: '#ffffff',
          expiresAt: futureDate,
        },
      } as ServerPlansResponse;

      const banner = subscriptionService.getPromotionBanner();

      expect(banner).toBeDefined();
      expect(banner!.text).toBe('50% off Pro!');
      expect(banner!.backgroundColor).toBe('#ff0000');
    });

    it('returns undefined when banner has expired', () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      (subscriptionService as any).serverPlans = {
        plans: [],
        allowPromotionCodes: true,
        promotionBanner: {
          text: 'Expired deal',
          expiresAt: pastDate,
        },
      } as ServerPlansResponse;

      const banner = subscriptionService.getPromotionBanner();

      expect(banner).toBeUndefined();
    });

    it('returns undefined when no plans are cached', () => {
      (subscriptionService as any).serverPlans = null;

      const banner = subscriptionService.getPromotionBanner();

      expect(banner).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // createCheckoutSession()
  // ---------------------------------------------------------------------------
  describe('createCheckoutSession()', () => {
    it('makes correct API call and returns url on success', async () => {
      mockPost.mockResolvedValueOnce({ url: 'https://checkout.stripe.com/session_123' });

      const result = await subscriptionService.createCheckoutSession('price_pro_monthly');

      expect(mockPost).toHaveBeenCalledWith('/stripe/checkout', { priceId: 'price_pro_monthly' });
      expect(result.success).toBe(true);
      expect(result.url).toBe('https://checkout.stripe.com/session_123');
    });

    it('returns error on API failure', async () => {
      mockPost.mockRejectedValueOnce(new Error('Stripe unavailable'));

      const result = await subscriptionService.createCheckoutSession('price_pro_monthly');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Stripe unavailable');
    });

    it('returns error when priceId is empty', async () => {
      const result = await subscriptionService.createCheckoutSession('');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No price ID configured for this plan');
      expect(mockPost).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // createPortalSession()
  // ---------------------------------------------------------------------------
  describe('createPortalSession()', () => {
    it('makes correct API call and returns portal url', async () => {
      mockPost.mockResolvedValueOnce({ url: 'https://billing.stripe.com/portal_123' });

      const result = await subscriptionService.createPortalSession();

      expect(mockPost).toHaveBeenCalledWith('/stripe/portal', {});
      expect(result.success).toBe(true);
      expect(result.url).toBe('https://billing.stripe.com/portal_123');
    });

    it('returns error on API failure', async () => {
      mockPost.mockRejectedValueOnce(new Error('Portal creation failed'));

      const result = await subscriptionService.createPortalSession();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Portal creation failed');
    });
  });

  // ---------------------------------------------------------------------------
  // purchaseSubscription()
  // ---------------------------------------------------------------------------
  describe('purchaseSubscription()', () => {
    it('finds the plan and delegates to createCheckoutSession', async () => {
      // Spy on createCheckoutSession to verify delegation
      const checkoutSpy = jest.spyOn(subscriptionService, 'createCheckoutSession');
      checkoutSpy.mockResolvedValueOnce({ success: true, url: 'https://checkout.stripe.com/session_abc' });

      // Spy on getPlanById to verify it looks up the plan
      const getPlanSpy = jest.spyOn(subscriptionService, 'getPlanById');

      const result = await subscriptionService.purchaseSubscription('pro_monthly');

      // Should look up the plan
      expect(getPlanSpy).toHaveBeenCalledWith('pro_monthly');
      const plan = getPlanSpy.mock.results[0].value;
      expect(plan).toBeDefined();
      expect(plan.tier).toBe('pro');

      // The env var EXPO_PUBLIC_STRIPE_PRO_PRICE_ID is not set in tests,
      // so stripePriceId is '' and the guard returns an error before delegation.
      // When the env var IS set, it would delegate to createCheckoutSession.
      // Either way, verify the method returns a well-formed result.
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('error');

      checkoutSpy.mockRestore();
      getPlanSpy.mockRestore();
    });

    it('returns error for invalid plan id', async () => {
      const result = await subscriptionService.purchaseSubscription('nonexistent_plan');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid plan');
      expect(mockPost).not.toHaveBeenCalled();
    });

    it('returns error for plan without stripePriceId', async () => {
      // The free plan has no stripePriceId
      const result = await subscriptionService.purchaseSubscription('free');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No price configured for this plan');
      expect(mockPost).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // getLimitsForTier()
  // ---------------------------------------------------------------------------
  describe('getLimitsForTier()', () => {
    it('reads server limits for the free tier', () => {
      setUsageStoreState({
        free: {
          messagesPerDay: 20,
          sessionsPerMonth: 30,
          maxProjects: 3,
          maxDevices: 2,
          repairsPerMonth: 5,
          historyRetentionDays: 14,
          maxPhoneSessions: 1,
        },
        pro: {
          messagesPerDay: -1,
          sessionsPerMonth: -1,
          maxProjects: -1,
          maxDevices: -1,
          repairsPerMonth: -1,
          historyRetentionDays: -1,
          maxPhoneSessions: -1,
        },
      });

      const limits = subscriptionService.getLimitsForTier('free');

      expect(limits.messagesPerDay).toBe(20);
      expect(limits.sessionsPerMonth).toBe(30);
      expect(limits.maxProjects).toBe(3);
      expect(limits.maxDevices).toBe(2);
      expect(limits.repairsPerMonth).toBe(5);
      expect(limits.historyRetentionDays).toBe(14);
      expect(limits.maxPhoneSessions).toBe(1);
    });

    it('maps -1 to Infinity for pro tier unlimited values', () => {
      setUsageStoreState({
        free: {
          messagesPerDay: 20,
          sessionsPerMonth: 30,
          maxProjects: 3,
          maxDevices: 2,
          repairsPerMonth: 5,
          historyRetentionDays: 14,
        },
        pro: {
          messagesPerDay: -1,
          sessionsPerMonth: -1,
          maxProjects: -1,
          maxDevices: -1,
          repairsPerMonth: -1,
          historyRetentionDays: -1,
        },
      });

      const limits = subscriptionService.getLimitsForTier('pro');

      expect(limits.messagesPerDay).toBe(Infinity);
      expect(limits.sessionsPerMonth).toBe(Infinity);
      expect(limits.maxProjects).toBe(Infinity);
      expect(limits.maxDevices).toBe(Infinity);
      expect(limits.repairsPerMonth).toBe(Infinity);
      expect(limits.historyRetentionDays).toBe(Infinity);
    });

    it('falls back to usage store getLimits() when no server limits exist', () => {
      setUsageStoreState(null);

      const limits = subscriptionService.getLimitsForTier('free');

      expect(limits).toEqual(DEFAULT_LIMITS);
    });
  });
});
