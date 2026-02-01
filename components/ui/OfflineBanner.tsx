import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { WifiOff, CloudOff } from 'lucide-react-native';
import { colors } from '@/theme/colors';
import { useConnectionStore } from '@/stores/connection.store';

export function OfflineBanner() {
  const { isPhoneOnline, isServerConnected } = useConnectionStore();
  const slideAnim = useRef(new Animated.Value(-60)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const showBanner = !isPhoneOnline || !isServerConnected;
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
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <View style={styles.content}>
        <Icon size={16} color={colors.warning[300]} />
        <Text style={styles.text}>{message}</Text>
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
    backgroundColor: colors.dark[700],
    borderBottomWidth: 1,
    borderBottomColor: colors.warning[400],
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
    color: colors.warning[300],
  },
});

export default OfflineBanner;
