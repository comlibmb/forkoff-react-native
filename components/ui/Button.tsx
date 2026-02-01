import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { ThemeColors, useTheme } from '@/theme/ThemeProvider';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  hapticFeedback?: boolean;
  theme?: ThemeColors;
}

const getVariantStyles = (theme: ThemeColors): Record<ButtonVariant, { container: ViewStyle; text: TextStyle }> => ({
  primary: {
    container: {
      backgroundColor: theme.primary,
    },
    text: {
      color: '#ffffff',
    },
  },
  secondary: {
    container: {
      backgroundColor: theme.backgroundSecondary,
    },
    text: {
      color: theme.text,
    },
  },
  outline: {
    container: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.primary,
    },
    text: {
      color: theme.primary,
    },
  },
  ghost: {
    container: {
      backgroundColor: 'transparent',
    },
    text: {
      color: theme.primary,
    },
  },
  danger: {
    container: {
      backgroundColor: theme.error,
    },
    text: {
      color: '#ffffff',
    },
  },
});

const sizeStyles: Record<ButtonSize, { container: ViewStyle; text: TextStyle }> = {
  sm: {
    container: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 8,
    },
    text: {
      fontSize: 14,
    },
  },
  md: {
    container: {
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 12,
    },
    text: {
      fontSize: 16,
    },
  },
  lg: {
    container: {
      paddingVertical: 16,
      paddingHorizontal: 32,
      borderRadius: 16,
    },
    text: {
      fontSize: 18,
    },
  },
};

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  hapticFeedback = true,
  theme: themeProp,
  style,
  onPress,
  ...props
}: ButtonProps) {
  const { theme: contextTheme } = useTheme();
  const theme = themeProp || contextTheme;
  const variantStyles = getVariantStyles(theme);

  const handlePress = (event: any) => {
    if (hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.(event);
  };

  const containerStyle: ViewStyle = {
    ...variantStyles[variant].container,
    ...sizeStyles[size].container,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    opacity: disabled || loading ? 0.5 : 1,
    ...(fullWidth && { width: '100%' }),
    ...(style as ViewStyle),
  };

  const textStyle: TextStyle = {
    ...variantStyles[variant].text,
    ...sizeStyles[size].text,
    fontWeight: '600',
  };

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={variantStyles[variant].text.color}
          size={size === 'sm' ? 'small' : 'small'}
        />
      ) : (
        <>
          {icon && iconPosition === 'left' && icon}
          <Text style={textStyle}>{title}</Text>
          {icon && iconPosition === 'right' && icon}
        </>
      )}
    </TouchableOpacity>
  );
}

export default Button;
