import { apiClient } from './api.client';
import {
  ReferralCodeResponse,
  ReferralListItem,
  ClaimRewardResult,
  ApplyReferralResult,
} from '@/types';

class ReferralService {
  /**
   * Get or create user's referral code
   */
  async getMyCode(): Promise<ReferralCodeResponse> {
    return apiClient.get<ReferralCodeResponse>('/referrals/my-code');
  }

  /**
   * Get referral statistics
   */
  async getStats(): Promise<ReferralCodeResponse> {
    return apiClient.get<ReferralCodeResponse>('/referrals/stats');
  }

  /**
   * Get list of referrals
   */
  async getReferrals(): Promise<ReferralListItem[]> {
    return apiClient.get<ReferralListItem[]>('/referrals/list');
  }

  /**
   * Claim earned referral reward months
   */
  async claimReward(): Promise<ClaimRewardResult> {
    return apiClient.post<ClaimRewardResult>('/referrals/claim-reward', {});
  }

  /**
   * Apply a referral code (during signup or later)
   */
  async applyReferralCode(code: string): Promise<ApplyReferralResult> {
    return apiClient.post<ApplyReferralResult>('/referrals/apply', {
      code: code.trim().toUpperCase(),
    });
  }
}

export const referralService = new ReferralService();
