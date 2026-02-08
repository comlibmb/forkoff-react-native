import { useEffect, useCallback, useMemo } from 'react';
import { useDeviceStore } from '@/stores/device.store';
import { useShallow } from 'zustand/react/shallow';

export function useDevices() {
  // Use shallow comparison for state slices to prevent unnecessary re-renders
  const {
    devices,
    selectedDeviceId,
    isLoading,
    error,
  } = useDeviceStore(
    useShallow((state) => ({
      devices: state.devices,
      selectedDeviceId: state.selectedDeviceId,
      isLoading: state.isLoading,
      error: state.error,
    }))
  );

  // Get stable action references (these don't change)
  const fetchDevices = useDeviceStore((state) => state.fetchDevices);
  const getDevice = useDeviceStore((state) => state.getDevice);
  const selectDevice = useDeviceStore((state) => state.selectDevice);
  const pairDevice = useDeviceStore((state) => state.pairDevice);
  const renameDevice = useDeviceStore((state) => state.renameDevice);
  const removeDevice = useDeviceStore((state) => state.removeDevice);
  const refreshDeviceStatus = useDeviceStore((state) => state.refreshDeviceStatus);
  const subscribeToDeviceUpdates = useDeviceStore((state) => state.subscribeToDeviceUpdates);
  const clearError = useDeviceStore((state) => state.clearError);

  // Fetch devices on mount
  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  // Set up 45-second polling interval for background refresh (silent, no loading indicator)
  useEffect(() => {
    const pollInterval = setInterval(() => {
      fetchDevices(false);
    }, 45000);

    return () => clearInterval(pollInterval);
  }, [fetchDevices]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (devices.length > 0) {
      const unsubscribe = subscribeToDeviceUpdates();
      return unsubscribe;
    }
  }, [devices.length, subscribeToDeviceUpdates]);

  // Memoize derived values
  const selectedDevice = useMemo(() =>
    selectedDeviceId ? getDevice(selectedDeviceId) : undefined,
    [selectedDeviceId, getDevice]
  );

  const onlineDevices = useMemo(() =>
    devices.filter((d) => d.status === 'online'),
    [devices]
  );

  const offlineDevices = useMemo(() =>
    devices.filter((d) => d.status === 'offline'),
    [devices]
  );

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
  const getDevice = useDeviceStore((state) => state.getDevice);
  const refreshDeviceStatus = useDeviceStore((state) => state.refreshDeviceStatus);

  const device = useMemo(() => getDevice(deviceId), [getDevice, deviceId]);

  const refresh = useCallback(() => {
    refreshDeviceStatus(deviceId);
  }, [deviceId, refreshDeviceStatus]);

  return {
    device,
    refresh,
  };
}

export default useDevices;
