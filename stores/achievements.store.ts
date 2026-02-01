import { create } from 'zustand';
import { Achievement, AchievementWithProgress, UnlockedAchievement } from '@/types';
import { apiClient } from '@/services/api.client';

interface AchievementsState {
  achievements: AchievementWithProgress[];
  unlockedAchievements: UnlockedAchievement[];
  recentUnlock: Achievement | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchAchievements: () => Promise<void>;
  fetchUnlockedAchievements: () => Promise<void>;
  toggleShowcase: (achievementId: string) => Promise<void>;
  setRecentUnlock: (achievement: Achievement | null) => void;
  clearError: () => void;
}

export const useAchievementsStore = create<AchievementsState>((set, get) => ({
  achievements: [],
  unlockedAchievements: [],
  recentUnlock: null,
  isLoading: false,
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

  fetchUnlockedAchievements: async () => {
    try {
      set({ isLoading: true, error: null });

      const response = await apiClient.get<UnlockedAchievement[]>(
        '/achievements/user/unlocked',
      );

      set({
        unlockedAchievements: response,
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
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
