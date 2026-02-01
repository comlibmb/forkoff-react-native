import { create } from 'zustand';
import { TokenUsageDaily, UsageStats, StreakInfo } from '@/types';
import { apiClient } from '@/services/api.client';

interface AnalyticsState {
  dailyUsage: TokenUsageDaily[];
  usageStats: UsageStats | null;
  streakInfo: StreakInfo | null;
  selectedPeriod: 'day' | 'week' | 'month' | 'all';
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchUsageStats: (period?: 'day' | 'week' | 'month' | 'all') => Promise<void>;
  fetchDailyUsage: (startDate?: string, endDate?: string) => Promise<void>;
  fetchStreakInfo: () => Promise<void>;
  setSelectedPeriod: (period: 'day' | 'week' | 'month' | 'all') => void;
  addRealtimeUsage: (inputTokens: number, outputTokens: number) => void;
  clearError: () => void;
}

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  dailyUsage: [],
  usageStats: null,
  streakInfo: null,
  selectedPeriod: 'week',
  isLoading: false,
  error: null,

  fetchUsageStats: async (period) => {
    const selectedPeriod = period || get().selectedPeriod;

    try {
      set({ isLoading: true, error: null });

      const response = await apiClient.get<UsageStats>(
        `/analytics/usage?period=${selectedPeriod}`,
      );

      set({
        usageStats: response,
        selectedPeriod,
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch usage stats',
      });
    }
  },

  fetchDailyUsage: async (startDate, endDate) => {
    try {
      set({ isLoading: true, error: null });

      let url = '/analytics/daily';
      const params: string[] = [];

      if (startDate) params.push(`startDate=${startDate}`);
      if (endDate) params.push(`endDate=${endDate}`);

      if (params.length > 0) {
        url += `?${params.join('&')}`;
      }

      const response = await apiClient.get<TokenUsageDaily[]>(url);

      set({
        dailyUsage: response,
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch daily usage',
      });
    }
  },

  fetchStreakInfo: async () => {
    try {
      const response = await apiClient.get<StreakInfo>('/analytics/streak');
      set({ streakInfo: response });
    } catch (error) {
      console.error('Failed to fetch streak info:', error);
    }
  },

  setSelectedPeriod: (period) => {
    set({ selectedPeriod: period });
    get().fetchUsageStats(period);
  },

  addRealtimeUsage: (inputTokens, outputTokens) => {
    set((state) => {
      if (!state.usageStats) return state;

      const currentInput = BigInt(state.usageStats.totalInputTokens || '0');
      const currentOutput = BigInt(state.usageStats.totalOutputTokens || '0');
      const newInput = currentInput + BigInt(inputTokens);
      const newOutput = currentOutput + BigInt(outputTokens);

      return {
        usageStats: {
          ...state.usageStats,
          totalInputTokens: newInput.toString(),
          totalOutputTokens: newOutput.toString(),
          totalTokens: (newInput + newOutput).toString(),
        },
      };
    });
  },

  clearError: () => set({ error: null }),
}));

export default useAnalyticsStore;
