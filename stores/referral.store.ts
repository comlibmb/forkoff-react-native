import { create } from 'zustand';
import {
  ReferralCodeResponse,
  ReferralListItem,
  ReferralStats,
  ClaimRewardResult,
} from '@/types';
import { referralService } from '@/services/referral.service';
import { useAuthStore } from './auth.store';
import { sentryService } from '@/services/sentry.service';
import { analyticsService } from '@/services/analytics.service';

interface ReferralState {
  // State
  referralCode: string | null;
  shareUrl: string | null;
  stats: ReferralStats | null;
  referrals: ReferralListItem[];
  isLoading: boolean;
  isClaiming: boolean;
  isApplying: boolean;
  error: string | null;

  // Actions
  fetchStats: () => Promise<void>;
  fetchReferrals: () => Promise<void>;
  claimReward: () => Promise<ClaimRewardResult>;
  applyReferralCode: (code: string) => Promise<{ success: boolean; message: string }>;
  clearError: () => void;
  reset: () => void;
}

export const useReferralStore = create<ReferralState>((set, get) => ({
  // Initial state
  referralCode: null,
  shareUrl: null,
  stats: null,
  referrals: [],
  isLoading: false,
  isClaiming: false,
  isApplying: false,
  error: null,

  fetchStats: async () => {
    try {
      set({ isLoading: true, error: null });

      const response = await referralService.getStats();

      set({
        referralCode: response.referralCode,
        shareUrl: response.shareUrl,
        stats: response.stats,
        isLoading: false,
      });
    } catch (error) {
      sentryService.captureException(error, { context: 'fetch_referral_stats' });
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch referral stats',
      });
    }
  },

  fetchReferrals: async () => {
    try {
      set({ isLoading: true, error: null });

      const referrals = await referralService.getReferrals();

      set({
        referrals,
        isLoading: false,
      });
    } catch (error) {
      sentryService.captureException(error, { context: 'fetch_referrals' });
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch referrals',
      });
    }
  },

  claimReward: async (): Promise<ClaimRewardResult> => {
    try {
      set({ isClaiming: true, error: null });

      const result = await referralService.claimReward();

      if (result.success) {
        // Track successful claim
        analyticsService.track('referral_reward_claimed', {
          monthsClaimed: result.monthsClaimed,
        });

        // Refresh user data to get updated subscription status
        await useAuthStore.getState().fetchUser();

        // Refresh stats
        get().fetchStats();
      }

      set({ isClaiming: false });
      return result;
    } catch (error) {
      sentryService.captureException(error, { context: 'claim_referral_reward' });

      const message = error instanceof Error ? error.message : 'Failed to claim reward';
      set({ isClaiming: false, error: message });

      return {
        success: false,
        message,
      };
    }
  },

  applyReferralCode: async (code: string): Promise<{ success: boolean; message: string }> => {
    try {
      set({ isApplying: true, error: null });

      const result = await referralService.applyReferralCode(code);

      if (result.success) {
        analyticsService.track('referral_code_applied', {});
      } else {
        analyticsService.track('referral_code_failed', {
          reason: result.message,
        });
      }

      set({ isApplying: false });
      return result;
    } catch (error) {
      sentryService.captureException(error, { context: 'apply_referral_code' });

      const message = error instanceof Error ? error.message : 'Failed to apply referral code';
      set({ isApplying: false, error: message });

      return {
        success: false,
        message,
      };
    }
  },

  clearError: () => set({ error: null }),

  reset: () =>
    set({
      referralCode: null,
      shareUrl: null,
      stats: null,
      referrals: [],
      isLoading: false,
      isClaiming: false,
      isApplying: false,
      error: null,
    }),
}));

export default useReferralStore;
