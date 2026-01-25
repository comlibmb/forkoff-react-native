export * from './colors';
export * from './spacing';
export * from './typography';

import { colors, getThemeColors, ColorScheme } from './colors';
import { spacing, borderRadius, iconSizes } from './spacing';
import { fontFamilies, fontSizes, fontWeights, lineHeights, textStyles } from './typography';

export const theme = {
  colors,
  spacing,
  borderRadius,
  iconSizes,
  fontFamilies,
  fontSizes,
  fontWeights,
  lineHeights,
  textStyles,
  getThemeColors,
} as const;

export type Theme = typeof theme;
