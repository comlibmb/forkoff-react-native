import { useEffect, useCallback } from 'react';
import { useDeviceStore } from '@/stores/device.store';

export function useDevices() {
  const {
    devices,
    selectedDeviceId,
    isLoading,
    error,
    fetchDevices,
    getDevice,
    selectDevice,
    pairDevice,
    renameDevice,
    removeDevice,
    refreshDeviceStatus,
    subscribeToDeviceUpdates,
    clearError,
  } = useDeviceStore();

  // Fetch devices on mount
  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (devices.length > 0) {
      const unsubscribe = subscribeToDeviceUpdates();
      return unsubscribe;
    }
  }, [devices.length, subscribeToDeviceUpdates]);

  const selectedDevice = selectedDeviceId ? getDevice(selectedDeviceId) : undefined;

  const onlineDevices = devices.filter((d) => d.status === 'online');
  const offlineDevices = devices.filter((d) => d.status === 'offline');

  const handlePairDevice = useCallback(
    async (pairingCode: string) => {
      try {
        const device = await pairDevice(pairingCode);
        return { success: true, device };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Pairing failed',
        };
      }
    },
    [pairDevice]
  );

  const handleRenameDevice = useCallback(
    async (id: string, name: string) => {
      try {
        await renameDevice(id, name);
        return { success: true };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Rename failed',
        };
      }
    },
    [renameDevice]
  );

  const handleRemoveDevice = useCallback(
    async (id: string) => {
      try {
        await removeDevice(id);
        return { success: true };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Remove failed',
        };
      }
    },
    [removeDevice]
  );

  return {
    devices,
    selectedDevice,
    selectedDeviceId,
    onlineDevices,
    offlineDevices,
    isLoading,
    error,
    fetchDevices,
    getDevice,
    selectDevice,
    pairDevice: handlePairDevice,
    renameDevice: handleRenameDevice,
    removeDevice: handleRemoveDevice,
    refreshDeviceStatus,
    clearError,
  };
}

export function useDevice(deviceId: string) {
  const { getDevice, refreshDeviceStatus } = useDeviceStore();

  const device = getDevice(deviceId);

  const refresh = useCallback(() => {
    refreshDeviceStatus(deviceId);
  }, [deviceId, refreshDeviceStatus]);

  return {
    device,
    refresh,
  };
}

export default useDevices;
