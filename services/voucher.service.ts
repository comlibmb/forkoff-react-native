import { apiClient } from './api.client';
import {
  VoucherRedemptionResult,
  VoucherValidationResult,
  VoucherRedemptionHistory,
} from '@/types';

class VoucherService {
  /**
   * Redeem a voucher code
   */
  async redeemVoucher(code: string): Promise<VoucherRedemptionResult> {
    return apiClient.post<VoucherRedemptionResult>('/vouchers/redeem', {
      code: code.trim().toUpperCase(),
    });
  }

  /**
   * Validate a voucher code without redeeming
   */
  async validateVoucher(code: string): Promise<VoucherValidationResult> {
    return apiClient.post<VoucherValidationResult>('/vouchers/validate', {
      code: code.trim().toUpperCase(),
    });
  }

  /**
   * Get user's voucher redemption history
   */
  async getRedemptionHistory(): Promise<VoucherRedemptionHistory[]> {
    return apiClient.get<VoucherRedemptionHistory[]>('/vouchers/my-redemptions');
  }
}

export const voucherService = new VoucherService();
