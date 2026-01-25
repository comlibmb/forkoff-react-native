export const colors = {
  // Primary accent color - Violet (Purple theme)
  primary: {
    50: '#f5f3ff',
    100: '#ede9fe',
    200: '#ddd6fe',
    300: '#c4b5fd',
    400: '#a78bfa',
    500: '#8b5cf6', // Main primary - Violet 500
    600: '#7c3aed',
    700: '#6d28d9',
    800: '#5b21b6',
    900: '#4c1d95',
    950: '#2e1065',
  },
  // Dark theme colors (GitHub-inspired from Figma)
  dark: {
    50: '#c9d1d9',   // Primary text
    100: '#b1bac4',
    200: '#8b949e',  // Secondary text
    300: '#6e7681',
    400: '#484f58',
    500: '#30363d',  // Border color
    600: '#21262d',
    700: '#161b22',  // Card background
    800: '#0d1117',  // Main background
    900: '#010409',
    950: '#000000',
  },
  success: {
    50: '#aff5b4',
    100: '#7ee787',
    200: '#56d364',
    300: '#3fb950',
    400: '#2ea043',
    500: '#238636', // From Figma
    600: '#196c2e',
    700: '#0f5323',
    800: '#033a16',
    900: '#04260f',
  },
  warning: {
    50: '#fff8c5',
    100: '#fae17d',
    200: '#f2cc60',
    300: '#e3b341', // From Figma
    400: '#d29922',
    500: '#bb8009',
    600: '#9e6a03',
    700: '#845306',
    800: '#693e00',
    900: '#4b2900',
  },
  error: {
    50: '#ffdce0',
    100: '#ffb4b4',
    200: '#ff8c8c',
    300: '#f85149',
    400: '#da3633',
    500: '#cf222e',
    600: '#a40e26',
    700: '#82071e',
    800: '#660018',
    900: '#490011',
  },
  info: {
    50: '#ddf4ff',
    100: '#b6e3ff',
    200: '#80ccff',
    300: '#54aeff',
    400: '#218bff',
    500: '#1f6feb',
    600: '#1158c7',
    700: '#0d419d',
    800: '#0a3069',
    900: '#061d42',
  },
  // Semantic colors for Figma dark theme
  text: {
    light: {
      primary: '#0d1117',
      secondary: '#57606a',
      tertiary: '#8b949e',
      inverse: '#c9d1d9',
    },
    dark: {
      primary: '#c9d1d9',   // From Figma
      secondary: '#8b949e', // From Figma
      tertiary: '#6e7681',
      inverse: '#0d1117',
    },
  },
  background: {
    light: {
      primary: '#ffffff',
      secondary: '#f6f8fa',
      tertiary: '#f0f3f6',
    },
    dark: {
      primary: '#0d1117',   // From Figma - main bg
      secondary: '#161b22', // From Figma - card bg
      tertiary: '#1f2937',  // From Figma - button bg
      elevated: '#21262d',  // Slightly elevated surfaces
    },
  },
  border: {
    light: '#d0d7de',
    dark: '#30363d', // From Figma
  },
  // Status colors - Violet theme
  status: {
    online: '#8b5cf6',   // Violet primary
    active: '#a78bfa',   // Violet lighter
    offline: '#8b949e',  // Gray
    idle: '#8b949e',     // Idle state
    syncing: '#c4b5fd',  // Violet light for animation
    error: '#f85149',    // Red
    warning: '#e3b341',  // Yellow
    success: '#238636',  // Green
  },
} as const;

export type ColorScheme = 'light' | 'dark';

export const getThemeColors = (scheme: ColorScheme) => ({
  primary: colors.primary[500],
  primaryLight: colors.primary[400],
  primaryDark: colors.primary[600],

  background: scheme === 'light' ? colors.background.light.primary : colors.background.dark.primary,
  backgroundSecondary: scheme === 'light' ? colors.background.light.secondary : colors.background.dark.secondary,
  backgroundTertiary: scheme === 'light' ? colors.background.light.tertiary : colors.background.dark.tertiary,

  text: scheme === 'light' ? colors.text.light.primary : colors.text.dark.primary,
  textSecondary: scheme === 'light' ? colors.text.light.secondary : colors.text.dark.secondary,
  textTertiary: scheme === 'light' ? colors.text.light.tertiary : colors.text.dark.tertiary,
  textInverse: scheme === 'light' ? colors.text.light.inverse : colors.text.dark.inverse,

  border: scheme === 'light' ? colors.border.light : colors.border.dark,

  success: colors.success[500],
  warning: colors.warning[300],
  error: colors.error[300],

  status: colors.status,
});
