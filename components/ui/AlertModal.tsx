/**
 * AlertModal - macOS-styled alert dialog
 *
 * A custom alert modal that matches the terminal/macOS design language
 * used throughout the app. Supports multiple variants and button configurations.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { AlertTriangle, CheckCircle, Info, XCircle, HelpCircle } from 'lucide-react-native';
import { colors } from '@/theme/colors';

export interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: (inputValue?: string) => void;
}

export interface AlertModalProps {
  visible: boolean;
  title: string;
  message?: string;
  variant?: 'info' | 'success' | 'warning' | 'error' | 'confirm';
  buttons?: AlertButton[];
  onDismiss?: () => void;
  /** Enable text input prompt */
  prompt?: boolean;
  /** Placeholder for prompt input */
  promptPlaceholder?: string;
  /** Default value for prompt input */
  promptDefaultValue?: string;
  /** Secure text entry for prompt */
  secureTextEntry?: boolean;
}

// Global alert state for imperative API
type AlertState = AlertModalProps & { resolve?: (value: string | undefined) => void };
let globalSetAlert: React.Dispatch<React.SetStateAction<AlertState | null>> | null = null;

export function AlertModal({
  visible,
  title,
  message,
  variant = 'info',
  buttons = [{ text: 'OK', style: 'default' }],
  onDismiss,
  prompt = false,
  promptPlaceholder,
  promptDefaultValue = '',
  secureTextEntry = false,
}: AlertModalProps) {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [inputValue, setInputValue] = React.useState(promptDefaultValue);

  useEffect(() => {
    if (visible) {
      setInputValue(promptDefaultValue);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.9);
      opacityAnim.setValue(0);
    }
  }, [visible, promptDefaultValue]);

  const getIcon = () => {
    const iconProps = { size: 28 };
    switch (variant) {
      case 'success':
        return <CheckCircle {...iconProps} color={colors.success[400]} />;
      case 'warning':
        return <AlertTriangle {...iconProps} color={colors.warning[400]} />;
      case 'error':
        return <XCircle {...iconProps} color={colors.error[400]} />;
      case 'confirm':
        return <HelpCircle {...iconProps} color={colors.primary[400]} />;
      default:
        return <Info {...iconProps} color={colors.primary[400]} />;
    }
  };

  const getAccentColor = () => {
    switch (variant) {
      case 'success':
        return colors.success[500];
      case 'warning':
        return colors.warning[500];
      case 'error':
        return colors.error[500];
      default:
        return colors.primary[500];
    }
  };

  const handleButtonPress = (button: AlertButton) => {
    if (button.onPress) {
      button.onPress(prompt ? inputValue : undefined);
    }
    onDismiss?.();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onDismiss}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onDismiss}
        />
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          {/* macOS-style title bar */}
          <View style={styles.titleBar}>
            <View style={[styles.dot, { backgroundColor: colors.error[400] }]} />
            <View style={[styles.dot, { backgroundColor: colors.warning[300] }]} />
            <View style={[styles.dot, { backgroundColor: colors.success[300] }]} />
            <Text style={styles.titleBarText}>forkoff</Text>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {/* Icon */}
            <View style={[styles.iconContainer, { borderColor: getAccentColor() }]}>
              {getIcon()}
            </View>

            {/* Title */}
            <Text style={styles.title}>{title}</Text>

            {/* Message */}
            {message && <Text style={styles.message}>{message}</Text>}

            {/* Prompt Input */}
            {prompt && (
              <TextInput
                style={styles.input}
                value={inputValue}
                onChangeText={setInputValue}
                placeholder={promptPlaceholder}
                placeholderTextColor={colors.dark[400]}
                secureTextEntry={secureTextEntry}
                autoFocus
              />
            )}

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              {buttons.map((button, index) => {
                const isDestructive = button.style === 'destructive';
                const isCancel = button.style === 'cancel';

                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.button,
                      isDestructive && styles.buttonDestructive,
                      isCancel && styles.buttonCancel,
                      !isDestructive && !isCancel && styles.buttonPrimary,
                      buttons.length === 1 && styles.buttonFull,
                    ]}
                    onPress={() => handleButtonPress(button)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        isDestructive && styles.buttonTextDestructive,
                        isCancel && styles.buttonTextCancel,
                        !isDestructive && !isCancel && styles.buttonTextPrimary,
                      ]}
                    >
                      {button.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Bottom accent bar */}
          <View style={[styles.accentBar, { backgroundColor: getAccentColor() }]} />
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/**
 * AlertProvider - Wrap your app with this to enable the imperative alert API
 */
export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [alert, setAlert] = React.useState<AlertState | null>(null);

  useEffect(() => {
    globalSetAlert = setAlert;
    return () => {
      globalSetAlert = null;
    };
  }, []);

  return (
    <>
      {children}
      {alert && (
        <AlertModal
          {...alert}
          visible={!!alert}
          onDismiss={() => {
            alert.resolve?.(undefined);
            setAlert(null);
          }}
          buttons={alert.buttons?.map((btn) => ({
            ...btn,
            onPress: (value) => {
              btn.onPress?.(value);
              alert.resolve?.(value);
              setAlert(null);
            },
          }))}
        />
      )}
    </>
  );
}

/**
 * Imperative alert API - use like Alert.alert()
 */
export const alert = {
  show: (
    title: string,
    message?: string,
    buttons?: AlertButton[],
    options?: { variant?: AlertModalProps['variant'] }
  ): Promise<void> => {
    return new Promise((resolve) => {
      if (globalSetAlert) {
        globalSetAlert({
          visible: true,
          title,
          message,
          buttons: buttons || [{ text: 'OK' }],
          variant: options?.variant || 'info',
          resolve: () => resolve(),
        });
      } else {
        console.warn('AlertProvider not mounted');
        resolve();
      }
    });
  },

  success: (title: string, message?: string): Promise<void> => {
    return alert.show(title, message, [{ text: 'OK' }], { variant: 'success' });
  },

  error: (title: string, message?: string): Promise<void> => {
    return alert.show(title, message, [{ text: 'OK' }], { variant: 'error' });
  },

  warning: (title: string, message?: string): Promise<void> => {
    return alert.show(title, message, [{ text: 'OK' }], { variant: 'warning' });
  },

  confirm: (
    title: string,
    message?: string,
    options?: { confirmText?: string; cancelText?: string; destructive?: boolean }
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      if (globalSetAlert) {
        globalSetAlert({
          visible: true,
          title,
          message,
          variant: options?.destructive ? 'error' : 'confirm',
          buttons: [
            {
              text: options?.cancelText || 'Cancel',
              style: 'cancel',
              onPress: () => resolve(false),
            },
            {
              text: options?.confirmText || 'Confirm',
              style: options?.destructive ? 'destructive' : 'default',
              onPress: () => resolve(true),
            },
          ],
          resolve: () => resolve(false),
        });
      } else {
        console.warn('AlertProvider not mounted');
        resolve(false);
      }
    });
  },

  prompt: (
    title: string,
    message?: string,
    options?: {
      placeholder?: string;
      defaultValue?: string;
      secureTextEntry?: boolean;
      confirmText?: string;
      cancelText?: string;
    }
  ): Promise<string | null> => {
    return new Promise((resolve) => {
      if (globalSetAlert) {
        globalSetAlert({
          visible: true,
          title,
          message,
          variant: 'info',
          prompt: true,
          promptPlaceholder: options?.placeholder,
          promptDefaultValue: options?.defaultValue || '',
          secureTextEntry: options?.secureTextEntry,
          buttons: [
            {
              text: options?.cancelText || 'Cancel',
              style: 'cancel',
              onPress: () => resolve(null),
            },
            {
              text: options?.confirmText || 'OK',
              style: 'default',
              onPress: (value) => resolve(value || ''),
            },
          ],
          resolve: () => resolve(null),
        });
      } else {
        console.warn('AlertProvider not mounted');
        resolve(null);
      }
    });
  },
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  container: {
    width: '85%',
    maxWidth: 340,
    backgroundColor: colors.dark[800],
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.dark[600],
  },
  titleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.dark[700],
    borderBottomWidth: 1,
    borderBottomColor: colors.dark[600],
    gap: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  titleBarText: {
    fontSize: 12,
    color: colors.dark[300],
    fontFamily: 'monospace',
    marginLeft: 8,
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.dark[700],
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.dark[50],
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: colors.dark[300],
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  input: {
    width: '100%',
    backgroundColor: colors.dark[700],
    borderWidth: 1,
    borderColor: colors.dark[500],
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.dark[50],
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonFull: {
    flex: 1,
  },
  buttonPrimary: {
    backgroundColor: colors.primary[600],
  },
  buttonCancel: {
    backgroundColor: colors.dark[600],
    borderWidth: 1,
    borderColor: colors.dark[500],
  },
  buttonDestructive: {
    backgroundColor: colors.error[500],
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  buttonTextPrimary: {
    color: '#fff',
  },
  buttonTextCancel: {
    color: colors.dark[200],
  },
  buttonTextDestructive: {
    color: '#fff',
  },
  accentBar: {
    height: 3,
  },
});

export default AlertModal;
