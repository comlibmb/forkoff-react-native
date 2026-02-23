import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Laptop, WifiOff, Wifi } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useConnectionStore } from '@/stores/connection.store';
import { useIdentityStore } from '@/stores/identity.store';
import { DeviceStatus } from '@/types';

interface ToastItem {
  id: string;
  deviceId: string;
  deviceName: string;
  status: DeviceStatus;
  timestamp: number;
}

export function ConnectionToast() {
  const { deviceStatuses } = useConnectionStore();
  const isPaired = useIdentityStore((state) => state.isPaired);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const previousStatuses = useRef<Record<string, DeviceStatus>>({});
  const deviceNames = useRef<Record<string, string>>({});

  // Track status changes
  useEffect(() => {
    const changes: ToastItem[] = [];

    Object.entries(deviceStatuses).forEach(([deviceId, status]) => {
      const prevStatus = previousStatuses.current[deviceId];

      // Only show toast if status changed (not on initial load)
      if (prevStatus !== undefined && prevStatus !== status) {
        const isNowOffline =
          status === 'offline' || status === 'OFFLINE';
        const wasOffline =
          prevStatus === 'offline' || prevStatus === 'OFFLINE';

        // Only show toast for online/offline transitions
        if (isNowOffline !== wasOffline) {
          changes.push({
            id: `${deviceId}-${Date.now()}`,
            deviceId,
            deviceName: deviceNames.current[deviceId] || 'Device',
            status,
            timestamp: Date.now(),
          });
        }
      }

      previousStatuses.current[deviceId] = status;
    });

    if (changes.length > 0) {
      setToasts((prev) => [...prev, ...changes]);
    }
  }, [deviceStatuses]);

  // Auto-dismiss toasts after 3 seconds
  useEffect(() => {
    if (toasts.length === 0) return;

    const timer = setTimeout(() => {
      setToasts((prev) => prev.slice(1));
    }, 3000);

    return () => clearTimeout(timer);
  }, [toasts]);

  // Method to set device name (called from device screens)
  useEffect(() => {
    // Expose a way to register device names globally
    (global as any).__setDeviceName = (id: string, name: string) => {
      deviceNames.current[id] = name;
    };

    return () => {
      delete (global as any).__setDeviceName;
    };
  }, []);

  // Don't show connection toasts for unauthenticated users
  if (!isPaired || toasts.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {toasts.map((toast, index) => (
        <ToastMessage key={toast.id} toast={toast} index={index} />
      ))}
    </View>
  );
}

function ToastMessage({ toast, index }: { toast: ToastItem; index: number }) {
  const { theme } = useTheme();
  const slideAnim = useRef(new Animated.Value(100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const isOffline =
    toast.status === 'offline' || toast.status === 'OFFLINE';

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Animate out after 2.5 seconds
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 100,
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
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: theme.card,
          borderColor: isOffline ? theme.error : theme.success,
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
          marginBottom: index > 0 ? 8 : 0,
        },
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: theme.backgroundTertiary }]}>
        <Laptop size={16} color={isOffline ? theme.error : theme.success} />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.deviceName, { color: theme.text }]} numberOfLines={1}>
          {toast.deviceName}
        </Text>
        <View style={styles.statusRow}>
          {isOffline ? (
            <WifiOff size={12} color={theme.error} />
          ) : (
            <Wifi size={12} color={theme.success} />
          )}
          <Text
            style={[
              styles.statusText,
              { color: isOffline ? theme.error : theme.success },
            ]}
          >
            {isOffline ? 'Disconnected' : 'Connected'}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    zIndex: 999,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    maxWidth: 300,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  deviceName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default ConnectionToast;
