import { useEffect, useCallback, useMemo } from 'react';
import { useDeviceStore } from '@/stores/device.store';

export function useDevices() {
  // Subscribe to the full devices array — status changes create new device objects
  // via .map() in updateDeviceStatus, so reference equality on the array changes
  const devices = useDeviceStore((state) => state.devices);
  const selectedDeviceId = useDeviceStore((state) => state.selectedDeviceId);
  const isLoading = useDeviceStore((state) => state.isLoading);
  const error = useDeviceStore((state) => state.error);

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

  // Subscribe to real-time updates — run once on mount, clean up on unmount.
  // The subscription callback uses get() internally so it always reads fresh state.
  useEffect(() => {
    const unsubscribe = subscribeToDeviceUpdates();
    return unsubscribe;
  }, [subscribeToDeviceUpdates]);

  // Memoize derived values
  const selectedDevice = useMemo(() =>
    selectedDeviceId ? devices.find((d) => d.id === selectedDeviceId) : undefined,
    [selectedDeviceId, devices]
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
  // Select the specific device from the array — re-renders when any device changes
  const device = useDeviceStore(
    useCallback((state) => state.devices.find((d) => d.id === deviceId), [deviceId])
  );
  const refreshDeviceStatus = useDeviceStore((state) => state.refreshDeviceStatus);

  const refresh = useCallback(() => {
    refreshDeviceStatus();
  }, [refreshDeviceStatus]);

  return {
    device,
    refresh,
  };
}

export default useDevices;
