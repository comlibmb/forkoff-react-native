import { create } from 'zustand';
import { VoucherRedemptionResult, VoucherRedemptionHistory } from '@/types';
import { voucherService } from '@/services/voucher.service';
import { useAuthStore } from './auth.store';
import { sentryService } from '@/services/sentry.service';
import { analyticsService } from '@/services/analytics.service';

interface VoucherState {
  // State
  isRedeeming: boolean;
  isValidating: boolean;
  isLoadingHistory: boolean;
  redemptionHistory: VoucherRedemptionHistory[];
  error: string | null;

  // Actions
  redeemVoucher: (code: string) => Promise<VoucherRedemptionResult>;
  validateVoucher: (code: string) => Promise<{ valid: boolean; message: string }>;
  fetchRedemptionHistory: () => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

export const useVoucherStore = create<VoucherState>((set, get) => ({
  // Initial state
  isRedeeming: false,
  isValidating: false,
  isLoadingHistory: false,
  redemptionHistory: [],
  error: null,

  redeemVoucher: async (code: string): Promise<VoucherRedemptionResult> => {
    try {
      set({ isRedeeming: true, error: null });

      const result = await voucherService.redeemVoucher(code);

      if (result.success) {
        // Track successful redemption
        analyticsService.track('voucher_redeemed', {
          benefitType: result.benefit?.type,
          benefitValue: result.benefit?.value,
        });

        // Refresh user data to get updated subscription status
        await useAuthStore.getState().fetchUser();

        // Refresh redemption history
        get().fetchRedemptionHistory();
      } else {
        // Track failed redemption
        analyticsService.track('voucher_redemption_failed', {
          reason: result.message,
        });
      }

      set({ isRedeeming: false });
      return result;
    } catch (error) {
      sentryService.captureException(error, { context: 'redeem_voucher' });

      const message = error instanceof Error ? error.message : 'Failed to redeem voucher';
      set({ isRedeeming: false, error: message });

      return {
        success: false,
        message,
      };
    }
  },

  validateVoucher: async (code: string): Promise<{ valid: boolean; message: string }> => {
    try {
      set({ isValidating: true, error: null });

      const result = await voucherService.validateVoucher(code);

      set({ isValidating: false });
      return {
        valid: result.valid,
        message: result.message,
      };
    } catch (error) {
      sentryService.captureException(error, { context: 'validate_voucher' });

      const message = error instanceof Error ? error.message : 'Failed to validate voucher';
      set({ isValidating: false, error: message });

      return {
        valid: false,
        message,
      };
    }
  },

  fetchRedemptionHistory: async () => {
    try {
      set({ isLoadingHistory: true, error: null });

      const history = await voucherService.getRedemptionHistory();

      set({
        redemptionHistory: history,
        isLoadingHistory: false,
      });
    } catch (error) {
      sentryService.captureException(error, { context: 'fetch_voucher_history' });
      set({
        isLoadingHistory: false,
        error: error instanceof Error ? error.message : 'Failed to fetch history',
      });
    }
  },

  clearError: () => set({ error: null }),

  reset: () =>
    set({
      isRedeeming: false,
      isValidating: false,
      isLoadingHistory: false,
      redemptionHistory: [],
      error: null,
    }),
}));

export default useVoucherStore;
