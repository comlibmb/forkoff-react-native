import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ColorScheme } from '@/theme/colors';
import { analyticsService } from '@/services/analytics.service';

interface ThemeState {
  colorScheme: ColorScheme | null;  // null = use system theme
  hasUserOverride: boolean;
  setColorScheme: (scheme: ColorScheme) => void;
  toggleColorScheme: () => void;
  resetToSystem: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      colorScheme: null,  // Default to null (system theme)
      hasUserOverride: false,

      setColorScheme: (scheme) => {
        set({ colorScheme: scheme, hasUserOverride: true });
        analyticsService.track('theme_changed', { scheme });
      },

      toggleColorScheme: () => {
        // When toggling, we need to know the current effective scheme
        // This will be handled by the ThemeProvider which knows the system theme
        const current = get().colorScheme;
        // If null (system), we'll toggle based on what the provider tells us
        // For now, just flip between light and dark
        const newScheme = current === 'dark' ? 'light' : 'dark';
        set({ colorScheme: newScheme, hasUserOverride: true });
        analyticsService.track('theme_changed', { scheme: newScheme });
      },

      resetToSystem: () => {
        set({ colorScheme: null, hasUserOverride: false });
      },
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) =>
        // Only persist if user has explicitly overridden
        state.hasUserOverride
          ? { colorScheme: state.colorScheme, hasUserOverride: state.hasUserOverride }
          : { colorScheme: null, hasUserOverride: false },
    }
  )
);

export default useThemeStore;
