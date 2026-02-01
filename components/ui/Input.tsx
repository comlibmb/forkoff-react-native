import React, { useState, forwardRef } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  ViewStyle,
  TextInputProps,
  StyleSheet,
} from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { ThemeColors, useTheme } from '@/theme/ThemeProvider';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
  theme?: ThemeColors;
}

export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      containerStyle,
      secureTextEntry,
      style,
      theme: themeProp,
      ...props
    },
    ref
  ) => {
    const { theme: contextTheme } = useTheme();
    const theme = themeProp || contextTheme;

    const [isFocused, setIsFocused] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    const showPasswordToggle = secureTextEntry !== undefined;
    const actualSecureTextEntry = secureTextEntry && !isPasswordVisible;

    const getBorderColor = () => {
      if (error) return theme.error;
      if (isFocused) return theme.primary;
      return theme.border;
    };

    return (
      <View style={[styles.container, containerStyle]}>
        {label && <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>}

        <View
          style={[
            styles.inputContainer,
            {
              borderColor: getBorderColor(),
              backgroundColor: theme.backgroundSecondary,
            },
          ]}
        >
          {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}

          <TextInput
            ref={ref}
            style={[
              styles.input,
              { color: theme.text },
              leftIcon ? styles.inputWithLeftIcon : undefined,
              (rightIcon || showPasswordToggle) ? styles.inputWithRightIcon : undefined,
              style,
            ]}
            placeholderTextColor={theme.textTertiary}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            secureTextEntry={actualSecureTextEntry}
            {...props}
          />

          {showPasswordToggle && (
            <TouchableOpacity
              style={styles.iconRight}
              onPress={() => setIsPasswordVisible(!isPasswordVisible)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {isPasswordVisible ? (
                <EyeOff size={20} color={theme.textTertiary} />
              ) : (
                <Eye size={20} color={theme.textTertiary} />
              )}
            </TouchableOpacity>
          )}

          {rightIcon && !showPasswordToggle && (
            <View style={styles.iconRight}>{rightIcon}</View>
          )}
        </View>

        {error && <Text style={[styles.error, { color: theme.error }]}>{error}</Text>}
        {hint && !error && <Text style={[styles.hint, { color: theme.textTertiary }]}>{hint}</Text>}
      </View>
    );
  }
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 48,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputWithLeftIcon: {
    paddingLeft: 8,
  },
  inputWithRightIcon: {
    paddingRight: 8,
  },
  iconLeft: {
    paddingLeft: 16,
  },
  iconRight: {
    paddingRight: 16,
  },
  error: {
    fontSize: 12,
    marginTop: 4,
  },
  hint: {
    fontSize: 12,
    marginTop: 4,
  },
});

export default Input;
