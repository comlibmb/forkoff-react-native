import { create } from 'zustand';
import { TokenUsageDaily, UsageStats, StreakInfo } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DAILY_USAGE_KEY = '@forkoff/analytics_daily';
const USAGE_STATS_KEY = '@forkoff/analytics_stats';
const STREAK_KEY = '@forkoff/analytics_streak';

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

      // Load from local storage
      const raw = await AsyncStorage.getItem(USAGE_STATS_KEY);
      const stats: UsageStats | null = raw ? JSON.parse(raw) : null;

      set({
        usageStats: stats,
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

  fetchDailyUsage: async () => {
    try {
      set({ isLoading: true, error: null });

      const raw = await AsyncStorage.getItem(DAILY_USAGE_KEY);
      const daily: TokenUsageDaily[] = raw ? JSON.parse(raw) : [];

      set({
        dailyUsage: daily,
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
      const raw = await AsyncStorage.getItem(STREAK_KEY);
      const streak: StreakInfo | null = raw ? JSON.parse(raw) : null;
      set({ streakInfo: streak });
    } catch (error) {
      console.error('Failed to fetch streak info:', (error as Error).message);
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

      const updatedStats = {
        ...state.usageStats,
        totalInputTokens: newInput.toString(),
        totalOutputTokens: newOutput.toString(),
        totalTokens: (newInput + newOutput).toString(),
      };

      // Persist updated stats
      AsyncStorage.setItem(USAGE_STATS_KEY, JSON.stringify(updatedStats)).catch(() => {});

      return { usageStats: updatedStats };
    });
  },

  clearError: () => set({ error: null }),
}));

export default useAnalyticsStore;
