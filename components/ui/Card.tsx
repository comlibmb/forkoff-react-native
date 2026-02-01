import React from 'react';
import { View, TouchableOpacity, ViewStyle, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ThemeColors, useTheme } from '@/theme/ThemeProvider';

export interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  className?: string;
  theme?: ThemeColors;
}

const paddingValues = {
  none: 0,
  sm: 12,
  md: 16,
  lg: 24,
};

export function Card({
  children,
  variant = 'default',
  padding = 'md',
  onPress,
  disabled = false,
  style,
  theme: themeProp,
}: CardProps) {
  const { theme: contextTheme } = useTheme();
  const theme = themeProp || contextTheme;

  const handlePress = () => {
    if (!disabled && onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'default':
        return { backgroundColor: theme.card };
      case 'elevated':
        return {
          backgroundColor: theme.card,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        };
      case 'outlined':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: theme.border,
        };
      default:
        return { backgroundColor: theme.card };
    }
  };

  const cardStyle: ViewStyle = {
    ...styles.base,
    ...getVariantStyles(),
    padding: paddingValues[padding],
    opacity: disabled ? 0.5 : 1,
    ...style,
  };

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={0.7}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 16,
    overflow: 'hidden',
  },
});

export default Card;
