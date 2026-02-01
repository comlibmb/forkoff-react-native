import { create } from 'zustand';
import { Device, DeviceStatus } from '@/types';
import { deviceService } from '@/services/device.service';
import { wsService } from '@/services/websocket.service';
import { analyticsService } from '@/services/analytics.service';
import { sentryService } from '@/services/sentry.service';
import { useUsageStore } from './usage.store';

interface DeviceState {
  devices: Device[];
  selectedDeviceId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchDevices: () => Promise<void>;
  getDevice: (id: string) => Device | undefined;
  selectDevice: (id: string | null) => void;
  pairDevice: (pairingCode: string) => Promise<Device>;
  renameDevice: (id: string, name: string) => Promise<void>;
  removeDevice: (id: string) => Promise<void>;
  refreshDeviceStatus: (id: string) => Promise<void>;
  updateDeviceStatus: (deviceId: string, status: DeviceStatus, lastSeenAt?: string) => void;
  updateToolStatus: (deviceId: string, toolType: string, status: 'active' | 'inactive' | 'error') => void;
  clearError: () => void;
  subscribeToDeviceUpdates: () => () => void;
}

export const useDeviceStore = create<DeviceState>((set, get) => ({
  devices: [],
  selectedDeviceId: null,
  isLoading: false,
  error: null,

  fetchDevices: async () => {
    try {
      set({ isLoading: true, error: null });

      const devices = await deviceService.getDevices();

      set({
        devices,
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch devices',
      });
    }
  },

  getDevice: (id) => {
    return get().devices.find((d) => d.id === id);
  },

  selectDevice: (id) => {
    set({ selectedDeviceId: id });
  },

  pairDevice: async (pairingCode) => {
    try {
      const {
        canPairDevice,
        canRepairDevice,
        incrementRepairs,
        pairedDeviceCount,
        setPairedDeviceCount,
      } = useUsageStore.getState();

      // Check if this is a re-pair (device was previously paired)
      // We determine this by checking if we already have devices paired
      const isRepair = pairedDeviceCount > 0;

      // Check appropriate limit
      if (isRepair) {
        if (!canRepairDevice()) {
          const error = new Error('REPAIR_LIMIT_REACHED');
          set({ error: error.message });
          throw error;
        }
      } else {
        if (!canPairDevice()) {
          const error = new Error('DEVICE_LIMIT_REACHED');
          set({ error: error.message });
          throw error;
        }
      }

      set({ isLoading: true, error: null });

      const device = await deviceService.pairDevice(pairingCode);

      // Increment repair count if this was a re-pair
      if (isRepair) {
        incrementRepairs();
      }

      // Update paired device count
      setPairedDeviceCount(pairedDeviceCount + 1);

      // Track device paired event
      analyticsService.track('device_paired', {
        deviceId: device.id,
        deviceName: device.name,
        platform: device.platform,
        isRepair,
      });

      set((state) => ({
        devices: [...state.devices, device],
        isLoading: false,
      }));

      return device;
    } catch (error) {
      sentryService.captureException(error, { context: 'pair_device' });
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to pair device',
      });
      throw error;
    }
  },

  renameDevice: async (id, name) => {
    try {
      set({ isLoading: true, error: null });

      const updatedDevice = await deviceService.renameDevice(id, name);

      set((state) => ({
        devices: state.devices.map((d) => (d.id === id ? updatedDevice : d)),
        isLoading: false,
      }));
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to rename device',
      });
      throw error;
    }
  },

  removeDevice: async (id) => {
    try {
      set({ isLoading: true, error: null });

      const device = get().devices.find((d) => d.id === id);

      await deviceService.removeDevice(id);

      analyticsService.track('device_removed', {
        deviceId: id,
        deviceName: device?.name,
        platform: device?.platform,
      });

      set((state) => ({
        devices: state.devices.filter((d) => d.id !== id),
        selectedDeviceId: state.selectedDeviceId === id ? null : state.selectedDeviceId,
        isLoading: false,
      }));
    } catch (error) {
      sentryService.captureException(error, { context: 'remove_device', deviceId: id });
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to remove device',
      });
      throw error;
    }
  },

  refreshDeviceStatus: async (id) => {
    try {
      const device = await deviceService.refreshDeviceStatus(id);

      set((state) => ({
        devices: state.devices.map((d) => (d.id === id ? device : d)),
      }));
    } catch (error) {
      console.error('Failed to refresh device status:', error);
    }
  },

  updateDeviceStatus: (deviceId, status, lastSeenAt?: string) => {
    const timestamp = lastSeenAt || new Date().toISOString();
    set((state) => ({
      devices: state.devices.map((d) =>
        d.id === deviceId
          ? { ...d, status, lastSeen: timestamp, lastSeenAt: timestamp }
          : d
      ),
    }));
  },

  updateToolStatus: (deviceId: string, toolType: string, status: 'active' | 'inactive' | 'error') => {
    set((state) => ({
      devices: state.devices.map((d) => {
        if (d.id !== deviceId) return d;

        // Normalize tool type for comparison
        const normalizedToolType = toolType.toLowerCase().replace('-', '_');

        const updatedTools = (d.connectedTools || []).map((tool) => {
          const normalizedType = tool.type.toLowerCase().replace('-', '_');
          if (normalizedType === normalizedToolType ||
              (normalizedToolType === 'claude_code' && normalizedType === 'claude_terminal')) {
            return { ...tool, status };
          }
          return tool;
        });

        return { ...d, connectedTools: updatedTools };
      }),
    }));
  },

  clearError: () => set({ error: null }),

  subscribeToDeviceUpdates: () => {
    const unsubscribeStatus = wsService.on('device_status', ({ deviceId, status, lastSeenAt }) => {
      get().updateDeviceStatus(deviceId, status, lastSeenAt);
    });

    // Subscribe to tool status updates
    const unsubscribeToolStatus = wsService.on('tool_status_update', ({ deviceId, toolType, status }) => {
      get().updateToolStatus(deviceId, toolType, status);
    });

    // Subscribe to all devices
    get().devices.forEach((device) => {
      wsService.subscribeToDevice(device.id);
    });

    return () => {
      unsubscribeStatus();
      unsubscribeToolStatus();
      get().devices.forEach((device) => {
        wsService.unsubscribeFromDevice(device.id);
      });
    };
  },
}));

export default useDeviceStore;
