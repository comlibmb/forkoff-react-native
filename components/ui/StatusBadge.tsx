import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '@/theme/colors';
import { DeviceStatus } from '@/types';

// Internal status types (lowercase)
type InternalStatusType = 'online' | 'offline' | 'syncing' | 'error' | 'warning' | 'success' | 'info' | 'default';
// Accept both lowercase and uppercase (from backend) status values
export type StatusType = InternalStatusType | DeviceStatus;
type BadgeSize = 'sm' | 'md' | 'lg';

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  size?: BadgeSize;
  showDot?: boolean;
  animated?: boolean;
  style?: ViewStyle;
}

const statusConfig: Record<InternalStatusType, { color: string; label: string }> = {
  online: { color: colors.status.online, label: 'Online' },
  offline: { color: colors.status.offline, label: 'Offline' },
  syncing: { color: colors.status.syncing, label: 'Syncing' },
  error: { color: colors.status.error, label: 'Error' },
  warning: { color: colors.status.warning, label: 'Warning' },
  success: { color: colors.success[500], label: 'Success' },
  info: { color: colors.primary[500], label: 'Info' },
  default: { color: colors.dark[400], label: '' },
};

const sizeConfig: Record<BadgeSize, { dot: number; fontSize: number; padding: { h: number; v: number } }> = {
  sm: { dot: 6, fontSize: 10, padding: { h: 6, v: 2 } },
  md: { dot: 8, fontSize: 12, padding: { h: 8, v: 4 } },
  lg: { dot: 10, fontSize: 14, padding: { h: 10, v: 6 } },
};

export function StatusBadge({
  status,
  label,
  size = 'md',
  showDot = true,
  animated = false,
  style,
}: StatusBadgeProps) {
  // Normalize status to lowercase to handle backend enum values (ONLINE -> online)
  const normalizedStatus = (status?.toLowerCase() || 'default') as InternalStatusType;
  const config = statusConfig[normalizedStatus] || statusConfig.default;
  const sizeConf = sizeConfig[size];
  const displayLabel = label || config.label;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: `${config.color}20`,
          paddingHorizontal: sizeConf.padding.h,
          paddingVertical: sizeConf.padding.v,
        },
        style,
      ]}
    >
      {showDot && (
        <View
          style={[
            styles.dot,
            {
              width: sizeConf.dot,
              height: sizeConf.dot,
              backgroundColor: config.color,
            },
            animated && normalizedStatus === 'syncing' && styles.pulse,
          ]}
        />
      )}
      {displayLabel && (
        <Text
          style={[
            styles.label,
            {
              fontSize: sizeConf.fontSize,
              color: config.color,
            },
          ]}
        >
          {displayLabel}
        </Text>
      )}
    </View>
  );
}

// Standalone dot for compact displays
export function StatusDot({
  status,
  size = 'md',
  animated = false,
  style,
}: Omit<StatusBadgeProps, 'label' | 'showDot'>) {
  // Normalize status to lowercase to handle backend enum values (ONLINE -> online)
  const normalizedStatus = (status?.toLowerCase() || 'default') as InternalStatusType;
  const config = statusConfig[normalizedStatus] || statusConfig.default;
  const sizeConf = sizeConfig[size];

  return (
    <View
      style={[
        styles.dot,
        {
          width: sizeConf.dot,
          height: sizeConf.dot,
          backgroundColor: config.color,
        },
        animated && normalizedStatus === 'syncing' && styles.pulse,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 100,
    gap: 6,
  },
  dot: {
    borderRadius: 100,
  },
  label: {
    fontWeight: '500',
  },
  pulse: {
    // Note: For actual pulsing animation, use Animated or Reanimated
    opacity: 0.8,
  },
});

export default StatusBadge;
