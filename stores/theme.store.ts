import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ColorScheme } from '@/theme/colors';

interface ThemeState {
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
  toggleColorScheme: () => void;
  isDark: boolean;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      colorScheme: 'dark',
      isDark: true,

      setColorScheme: (scheme) => {
        set({ colorScheme: scheme, isDark: scheme === 'dark' });
      },

      toggleColorScheme: () => {
        const newScheme = get().colorScheme === 'dark' ? 'light' : 'dark';
        set({ colorScheme: newScheme, isDark: newScheme === 'dark' });
      },
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useThemeStore;
