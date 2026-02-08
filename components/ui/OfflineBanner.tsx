import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { WifiOff, CloudOff } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useConnectionStore } from '@/stores/connection.store';
import { useAuthStore } from '@/stores/auth.store';

export function OfflineBanner() {
  const { theme } = useTheme();
  const { isPhoneOnline, isServerConnected } = useConnectionStore();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const slideAnim = useRef(new Animated.Value(-60)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Only show server connection issues when authenticated
  const showBanner = !isPhoneOnline || (isAuthenticated && !isServerConnected);
  const message = !isPhoneOnline
    ? 'No internet connection'
    : 'Connecting to server...';
  const Icon = !isPhoneOnline ? WifiOff : CloudOff;

  useEffect(() => {
    if (showBanner) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -60,
          duration: 200,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showBanner]);

  if (!showBanner) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundSecondary,
          borderBottomColor: theme.warning,
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <View style={styles.content}>
        <Icon size={16} color={theme.warning} />
        <Text style={[styles.text, { color: theme.warning }]}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    borderBottomWidth: 1,
    paddingTop: 50, // Account for status bar
    paddingBottom: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
  },
});

export default OfflineBanner;
