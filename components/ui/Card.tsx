import React from 'react';
import { View, TouchableOpacity, ViewStyle, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '@/theme/colors';

export interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  className?: string;
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
}: CardProps) {
  const handlePress = () => {
    if (!disabled && onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  const cardStyle: ViewStyle = {
    ...styles.base,
    ...(variant === 'default' && styles.default),
    ...(variant === 'elevated' && styles.elevated),
    ...(variant === 'outlined' && styles.outlined),
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
  default: {
    backgroundColor: colors.dark[800],
  },
  elevated: {
    backgroundColor: colors.dark[800],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  outlined: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.dark[600],
  },
});

export default Card;
