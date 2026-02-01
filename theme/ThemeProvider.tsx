import React, { createContext, useContext, useMemo, useCallback } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import { useThemeStore } from '@/stores/theme.store';
import { colors, ColorScheme } from './colors';

// Theme-aware color values
export interface ThemeColors {
  // Backgrounds
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  backgroundElevated: string;

  // Text
  text: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;

  // Borders
  border: string;
  borderLight: string;

  // Cards & surfaces
  card: string;
  cardBorder: string;

  // Primary
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primaryBackground: string;

  // Status
  success: string;
  warning: string;
  error: string;
  info: string;

  // Switch/toggle
  switchTrackOff: string;
  switchThumb: string;

  // Misc
  divider: string;
  overlay: string;
  skeleton: string;
}

const lightTheme: ThemeColors = {
  background: '#ffffff',
  backgroundSecondary: '#f6f8fa',
  backgroundTertiary: '#f0f3f6',
  backgroundElevated: '#ffffff',

  text: '#1f2328',
  textSecondary: '#57606a',
  textTertiary: '#8b949e',
  textInverse: '#ffffff',

  border: '#d0d7de',
  borderLight: '#e6e9ec',

  card: '#ffffff',
  cardBorder: '#d0d7de',

  primary: colors.primary[500],
  primaryLight: colors.primary[400],
  primaryDark: colors.primary[600],
  primaryBackground: colors.primary[50],

  success: colors.success[500],
  warning: colors.warning[400],
  error: colors.error[400],
  info: colors.info[500],

  switchTrackOff: '#d0d7de',
  switchThumb: '#ffffff',

  divider: '#d8dee4',
  overlay: 'rgba(27, 31, 36, 0.5)',
  skeleton: '#e6e9ec',
};

const darkTheme: ThemeColors = {
  background: colors.dark[800],
  backgroundSecondary: colors.dark[700],
  backgroundTertiary: colors.dark[600],
  backgroundElevated: colors.dark[600],

  text: colors.dark[50],
  textSecondary: colors.dark[200],
  textTertiary: colors.dark[300],
  textInverse: colors.dark[800],

  border: colors.dark[500],
  borderLight: colors.dark[600],

  card: colors.dark[700],
  cardBorder: colors.dark[600],

  primary: colors.primary[500],
  primaryLight: colors.primary[400],
  primaryDark: colors.primary[600],
  primaryBackground: colors.primary[500] + '20',

  success: colors.success[400],
  warning: colors.warning[300],
  error: colors.error[300],
  info: colors.info[400],

  switchTrackOff: colors.dark[500],
  switchThumb: colors.dark[200],

  divider: colors.dark[600],
  overlay: 'rgba(0, 0, 0, 0.7)',
  skeleton: colors.dark[600],
};

interface ThemeContextValue {
  colorScheme: ColorScheme;
  isDark: boolean;
  theme: ThemeColors;
  colors: typeof colors;
  toggleTheme: () => void;
  setTheme: (scheme: ColorScheme) => void;
  resetToSystem: () => void;
  hasUserOverride: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useSystemColorScheme();
  const { colorScheme: storedColorScheme, hasUserOverride, setColorScheme, resetToSystem } = useThemeStore();

  // Determine effective color scheme: use stored if user has overridden, otherwise use system
  const effectiveColorScheme: ColorScheme = storedColorScheme ?? systemColorScheme ?? 'dark';
  const isDark = effectiveColorScheme === 'dark';

  // Custom toggle that's aware of current effective theme
  const toggleTheme = useCallback(() => {
    const newScheme = effectiveColorScheme === 'dark' ? 'light' : 'dark';
    setColorScheme(newScheme);
  }, [effectiveColorScheme, setColorScheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      colorScheme: effectiveColorScheme,
      isDark,
      theme: isDark ? darkTheme : lightTheme,
      colors,
      toggleTheme,
      setTheme: setColorScheme,
      resetToSystem,
      hasUserOverride,
    }),
    [effectiveColorScheme, isDark, toggleTheme, setColorScheme, resetToSystem, hasUserOverride]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Export themes for direct access if needed
export { lightTheme, darkTheme };
