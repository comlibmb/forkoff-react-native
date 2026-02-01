import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Laptop, WifiOff, Wifi } from 'lucide-react-native';
import { colors } from '@/theme/colors';
import { useConnectionStore } from '@/stores/connection.store';
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

  if (toasts.length === 0) {
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
        isOffline ? styles.toastOffline : styles.toastOnline,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
          marginBottom: index > 0 ? 8 : 0,
        },
      ]}
    >
      <View style={styles.iconContainer}>
        <Laptop size={16} color={isOffline ? colors.error[300] : colors.success[300]} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.deviceName} numberOfLines={1}>
          {toast.deviceName}
        </Text>
        <View style={styles.statusRow}>
          {isOffline ? (
            <WifiOff size={12} color={colors.error[400]} />
          ) : (
            <Wifi size={12} color={colors.success[400]} />
          )}
          <Text
            style={[
              styles.statusText,
              isOffline ? styles.statusOffline : styles.statusOnline,
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
    backgroundColor: colors.dark[700],
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
  toastOffline: {
    borderColor: colors.error[500],
  },
  toastOnline: {
    borderColor: colors.success[500],
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.dark[600],
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
    color: colors.dark[50],
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
  statusOffline: {
    color: colors.error[400],
  },
  statusOnline: {
    color: colors.success[400],
  },
});

export default ConnectionToast;
