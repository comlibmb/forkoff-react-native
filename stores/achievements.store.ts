import { create } from 'zustand';
import { Achievement, AchievementWithProgress, UnlockedAchievement } from '@/types';
import { apiClient } from '@/services/api.client';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface AchievementsState {
  achievements: AchievementWithProgress[];
  unlockedAchievements: UnlockedAchievement[];
  recentUnlock: Achievement | null;
  isLoading: boolean;
  isRefreshing: boolean;
  lastFetchedAt: number | null;
  error: string | null;

  // Actions
  fetchAchievements: () => Promise<void>;
  fetchUnlockedAchievements: (forceRefresh?: boolean) => Promise<void>;
  toggleShowcase: (achievementId: string) => Promise<void>;
  setRecentUnlock: (achievement: Achievement | null) => void;
  clearError: () => void;
}

export const useAchievementsStore = create<AchievementsState>((set, get) => ({
  achievements: [],
  unlockedAchievements: [],
  recentUnlock: null,
  isLoading: false,
  isRefreshing: false,
  lastFetchedAt: null,
  error: null,

  fetchAchievements: async () => {
    try {
      set({ isLoading: true, error: null });

      const response = await apiClient.get<AchievementWithProgress[]>(
        '/achievements/user',
      );

      set({
        achievements: response,
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch achievements',
      });
    }
  },

  fetchUnlockedAchievements: async (forceRefresh = false) => {
    const { lastFetchedAt, unlockedAchievements } = get();
    const now = Date.now();
    const cacheAge = lastFetchedAt ? now - lastFetchedAt : Infinity;
    const hasCachedData = unlockedAchievements.length > 0;

    // If not forcing and cache is fresh, skip fetch
    if (!forceRefresh && cacheAge < CACHE_TTL_MS && hasCachedData) {
      return;
    }

    try {
      // Stale-while-revalidate: if we have cached data, show it and refresh in background
      if (hasCachedData) {
        set({ isRefreshing: true, error: null });
      } else {
        set({ isLoading: true, error: null });
      }

      const response = await apiClient.get<UnlockedAchievement[]>(
        '/achievements/user/unlocked',
      );

      set({
        unlockedAchievements: response,
        isLoading: false,
        isRefreshing: false,
        lastFetchedAt: Date.now(),
      });
    } catch (error) {
      set({
        isLoading: false,
        isRefreshing: false,
        error: error instanceof Error ? error.message : 'Failed to fetch unlocked achievements',
      });
    }
  },

  toggleShowcase: async (achievementId) => {
    try {
      const response = await apiClient.patch<{ success: boolean; showcased: boolean }>(
        `/achievements/${achievementId}/showcase`,
        {},
      );

      if (response.success) {
        // Update local state
        set((state) => ({
          achievements: state.achievements.map((a) =>
            a.id === achievementId
              ? {
                  ...a,
                  userProgress: a.userProgress
                    ? { ...a.userProgress, showcased: response.showcased }
                    : null,
                }
              : a,
          ),
          unlockedAchievements: state.unlockedAchievements.map((ua) =>
            ua.achievement.id === achievementId
              ? { ...ua, showcased: response.showcased }
              : ua,
          ),
        }));
      }
    } catch (error) {
      console.error('Failed to toggle showcase:', error);
    }
  },

  setRecentUnlock: (achievement) => {
    set({ recentUnlock: achievement });
  },

  clearError: () => set({ error: null }),
}));

export default useAchievementsStore;
