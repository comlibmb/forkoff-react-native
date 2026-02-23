import { create } from 'zustand';
import { TokenUsageDaily, UsageStats, StreakInfo } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { wsService } from '@/services/websocket.service';

const DAILY_USAGE_KEY = '@forkoff/analytics_daily';
const USAGE_STATS_KEY = '@forkoff/analytics_stats';
const STREAK_KEY = '@forkoff/analytics_streak';

interface AnalyticsState {
  dailyUsage: TokenUsageDaily[];
  usageStats: UsageStats | null;
  streakInfo: StreakInfo | null;
  perDeviceStats: Record<string, UsageStats>;
  perDeviceDailyUsage: Record<string, TokenUsageDaily[]>;
  perDeviceStreak: Record<string, StreakInfo>;
  selectedPeriod: 'day' | 'week' | 'month' | 'all';
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchUsageStats: (period?: 'day' | 'week' | 'month' | 'all') => Promise<void>;
  fetchDailyUsage: (startDate?: string, endDate?: string) => Promise<void>;
  fetchStreakInfo: () => Promise<void>;
  setSelectedPeriod: (period: 'day' | 'week' | 'month' | 'all') => void;
  addRealtimeUsage: (inputTokens: number, outputTokens: number) => void;
  addDeviceUsageStats: (deviceId: string, stats: UsageStats) => void;
  addDeviceDailyUsage: (deviceId: string, daily: TokenUsageDaily[]) => void;
  addDeviceStreakInfo: (deviceId: string, streak: StreakInfo) => void;
  clearError: () => void;
}

/** Sum usage stats across all devices */
function aggregateStats(perDevice: Record<string, UsageStats>): UsageStats {
  let totalInput = BigInt(0);
  let totalOutput = BigInt(0);
  let totalSessions = 0;
  let totalCost = 0;

  for (const stats of Object.values(perDevice)) {
    totalInput += BigInt(stats.totalInputTokens || '0');
    totalOutput += BigInt(stats.totalOutputTokens || '0');
    totalSessions += stats.totalSessionCount || 0;
    totalCost += stats.estimatedCostUsd || 0;
  }

  const totalTokens = totalInput + totalOutput;
  return {
    totalInputTokens: totalInput.toString(),
    totalOutputTokens: totalOutput.toString(),
    totalTokens: totalTokens.toString(),
    totalSessionCount: totalSessions,
    estimatedCostUsd: Math.round(totalCost * 100) / 100,
    period: 'all',
  };
}

/** Merge daily usage across devices, summing values for the same date */
function aggregateDailyUsage(perDevice: Record<string, TokenUsageDaily[]>): TokenUsageDaily[] {
  const byDate: Record<string, TokenUsageDaily> = {};

  for (const dailyList of Object.values(perDevice)) {
    for (const entry of dailyList) {
      if (!byDate[entry.date]) {
        byDate[entry.date] = { ...entry };
      } else {
        const existing = byDate[entry.date];
        const newInput = BigInt(existing.inputTokens || '0') + BigInt(entry.inputTokens || '0');
        const newOutput = BigInt(existing.outputTokens || '0') + BigInt(entry.outputTokens || '0');
        existing.inputTokens = newInput.toString();
        existing.outputTokens = newOutput.toString();
        existing.totalTokens = (newInput + newOutput).toString();
        existing.sessionCount = (existing.sessionCount || 0) + (entry.sessionCount || 0);
        existing.estimatedCostUsd = ((existing.estimatedCostUsd || 0) + (entry.estimatedCostUsd || 0));
      }
    }
  }

  return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
}

/** Take the best streak across devices */
function aggregateStreak(perDevice: Record<string, StreakInfo>): StreakInfo {
  let maxStreak = 0;
  let maxActiveDays = 0;

  for (const streak of Object.values(perDevice)) {
    if (streak.currentStreak > maxStreak) maxStreak = streak.currentStreak;
    if (streak.totalActiveDays > maxActiveDays) maxActiveDays = streak.totalActiveDays;
  }

  return { currentStreak: maxStreak, totalActiveDays: maxActiveDays };
}

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  dailyUsage: [],
  usageStats: null,
  streakInfo: null,
  perDeviceStats: {},
  perDeviceDailyUsage: {},
  perDeviceStreak: {},
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
      // Initialize stats if null so real-time updates aren't silently dropped
      const currentStats = state.usageStats ?? {
        totalInputTokens: '0',
        totalOutputTokens: '0',
        totalTokens: '0',
        totalSessionCount: 0,
        estimatedCostUsd: 0,
        period: state.selectedPeriod,
      };

      const currentInput = BigInt(currentStats.totalInputTokens || '0');
      const currentOutput = BigInt(currentStats.totalOutputTokens || '0');
      const newInput = currentInput + BigInt(inputTokens);
      const newOutput = currentOutput + BigInt(outputTokens);

      const updatedStats = {
        ...currentStats,
        totalInputTokens: newInput.toString(),
        totalOutputTokens: newOutput.toString(),
        totalTokens: (newInput + newOutput).toString(),
      };

      // Persist updated stats
      AsyncStorage.setItem(USAGE_STATS_KEY, JSON.stringify(updatedStats)).catch(() => {});

      return { usageStats: updatedStats };
    });
  },

  addDeviceUsageStats: (deviceId, stats) => {
    set((state) => {
      const perDeviceStats = { ...state.perDeviceStats, [deviceId]: stats };
      const usageStats = aggregateStats(perDeviceStats);

      // Persist
      AsyncStorage.setItem(USAGE_STATS_KEY, JSON.stringify(usageStats)).catch(() => {});

      return { perDeviceStats, usageStats };
    });
  },

  addDeviceDailyUsage: (deviceId, daily) => {
    set((state) => {
      const perDeviceDailyUsage = { ...state.perDeviceDailyUsage, [deviceId]: daily };
      const dailyUsage = aggregateDailyUsage(perDeviceDailyUsage);

      // Persist
      AsyncStorage.setItem(DAILY_USAGE_KEY, JSON.stringify(dailyUsage)).catch(() => {});

      return { perDeviceDailyUsage, dailyUsage };
    });
  },

  addDeviceStreakInfo: (deviceId, streak) => {
    set((state) => {
      const perDeviceStreak = { ...state.perDeviceStreak, [deviceId]: streak };
      const streakInfo = aggregateStreak(perDeviceStreak);

      // Persist
      AsyncStorage.setItem(STREAK_KEY, JSON.stringify(streakInfo)).catch(() => {});

      return { perDeviceStreak, streakInfo };
    });
  },

  clearError: () => set({ error: null }),
}));

// Global WebSocket listeners — same pattern as claude.store.ts
// These fire regardless of which screen is active
wsService.on('usage_stats_sync', (data: any) => {
  if (data?.deviceId || data?.totalTokens !== undefined) {
    const deviceId = data.deviceId || 'default';
    useAnalyticsStore.getState().addDeviceUsageStats(deviceId, {
      totalInputTokens: data.totalInputTokens || '0',
      totalOutputTokens: data.totalOutputTokens || '0',
      totalTokens: data.totalTokens || '0',
      totalSessionCount: data.totalSessionCount || 0,
      estimatedCostUsd: data.estimatedCostUsd || 0,
      period: data.period || 'all',
    });
  }
});

wsService.on('daily_usage_sync', (data: any) => {
  if (data?.daily && Array.isArray(data.daily)) {
    const deviceId = data.deviceId || 'default';
    useAnalyticsStore.getState().addDeviceDailyUsage(deviceId, data.daily);
  }
});

wsService.on('streak_info_sync', (data: any) => {
  if (data?.currentStreak !== undefined || data?.totalActiveDays !== undefined) {
    const deviceId = data.deviceId || 'default';
    useAnalyticsStore.getState().addDeviceStreakInfo(deviceId, {
      currentStreak: data.currentStreak || 0,
      totalActiveDays: data.totalActiveDays || 0,
    });
  }
});

export default useAnalyticsStore;
