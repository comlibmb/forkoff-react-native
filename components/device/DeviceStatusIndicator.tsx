import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { DeviceStatus } from '@/types';
import { useTheme } from '@/theme/ThemeProvider';

interface DeviceStatusIndicatorProps {
  status: DeviceStatus;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
}

const sizeMap = {
  sm: 8,
  md: 12,
  lg: 16,
};

// Use lowercase keys for consistency
type NormalizedStatus = 'online' | 'offline' | 'syncing';

export function DeviceStatusIndicator({
  status,
  size = 'md',
  pulse = true,
}: DeviceStatusIndicatorProps) {
  const { colors } = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const dotSize = sizeMap[size];
  // Normalize status to lowercase to handle backend enum values
  const normalizedStatus = (status?.toLowerCase() || 'offline') as NormalizedStatus;

  const statusColors: Record<NormalizedStatus, string> = {
    online: colors.status.online,
    offline: colors.status.offline,
    syncing: colors.status.syncing,
  };

  useEffect(() => {
    if (pulse && normalizedStatus === 'syncing') {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.4,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );

      animation.start();

      return () => animation.stop();
    } else if (pulse && normalizedStatus === 'online') {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );

      animation.start();

      return () => animation.stop();
    }
  }, [normalizedStatus, pulse, pulseAnim]);

  return (
    <View style={[styles.container, { width: dotSize * 2, height: dotSize * 2 }]}>
      {/* Pulse ring for online/syncing */}
      {pulse && normalizedStatus !== 'offline' && (
        <Animated.View
          style={[
            styles.pulseRing,
            {
              width: dotSize * 2,
              height: dotSize * 2,
              borderRadius: dotSize,
              borderColor: statusColors[normalizedStatus],
              transform: [{ scale: pulseAnim }],
              opacity: pulseAnim.interpolate({
                inputRange: [1, 1.4],
                outputRange: [0.6, 0],
              }),
            },
          ]}
        />
      )}

      {/* Main dot */}
      <View
        style={[
          styles.dot,
          {
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor: statusColors[normalizedStatus],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    borderWidth: 2,
  },
  dot: {},
});

export default DeviceStatusIndicator;
