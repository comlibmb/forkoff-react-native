import { create } from 'zustand';
import { Device, DeviceStatus } from '@/types';
import { deviceService } from '@/services/device.service';
import { wsService } from '@/services/websocket.service';
import { analyticsService } from '@/services/analytics.service';
import { sentryService } from '@/services/sentry.service';

interface DeviceState {
  devices: Device[];
  selectedDeviceId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchDevices: (showLoading?: boolean) => Promise<void>;
  getDevice: (id: string) => Device | undefined;
  selectDevice: (id: string | null) => void;
  pairDevice: (pairingCode: string) => Promise<Device>;
  addDeviceFromPairing: (device: Device) => Promise<void>;
  renameDevice: (id: string, name: string) => Promise<void>;
  removeDevice: (id: string) => Promise<void>;
  updateDeviceStatus: (deviceId: string, status: DeviceStatus, lastSeenAt?: string, cliVersion?: string) => void;
  updateToolStatus: (deviceId: string, toolType: string, status: 'active' | 'inactive' | 'error') => void;
  clearError: () => void;
  subscribeToDeviceUpdates: () => () => void;
}

export const useDeviceStore = create<DeviceState>((set, get) => ({
  devices: [],
  selectedDeviceId: null,
  isLoading: false,
  error: null,

  fetchDevices: async (showLoading = true) => {
    try {
      if (showLoading) set({ isLoading: true, error: null });

      // Load from local AsyncStorage
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
      set({ isLoading: true, error: null });

      // Pairing now happens via WebSocket events:
      // 1. Mobile emits pair_device { pairingCode }
      // 2. Relay forwards to CLI that registered that code
      // 3. CLI responds with pair_device_ack { deviceId, deviceName, platform }
      // 4. Mobile receives ack and stores device

      return new Promise<Device>((resolve, reject) => {
        const timeout = setTimeout(() => {
          unsubAck();
          unsubReject();
          set({ isLoading: false, error: 'Pairing timed out. Make sure the CLI is running.' });
          reject(new Error('Pairing timed out'));
        }, 30000); // 30 second timeout

        const unsubAck = wsService.on('pair_device_ack', (data) => {
          clearTimeout(timeout);
          unsubAck();
          unsubReject();

          const device: Device = {
            id: data.deviceId,
            name: data.deviceName,
            type: 'desktop',
            status: 'online',
            platform: (data.platform || 'linux') as Device['platform'],
            lastSeen: new Date().toISOString(),
            connectedTools: [],
          };

          // Save to AsyncStorage
          deviceService.saveDevice(device).then(() => {
            analyticsService.track('device_paired', {
              deviceId: device.id,
              deviceName: device.name,
              platform: device.platform,
            });

            set((state) => ({
              devices: [...state.devices.filter((d) => d.id !== device.id), device],
              isLoading: false,
            }));

            resolve(device);
          }).catch(reject);
        });

        const unsubReject = wsService.on('pair_device_reject', (data) => {
          clearTimeout(timeout);
          unsubAck();
          unsubReject();
          set({ isLoading: false, error: data.reason || 'Pairing rejected' });
          reject(new Error(data.reason || 'Pairing rejected'));
        });

        // Send pairing request via WebSocket
        wsService.pairDevice(pairingCode);
      });
    } catch (error) {
      sentryService.captureException(error, { context: 'pair_device' });
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to pair device',
      });
      throw error;
    }
  },

  addDeviceFromPairing: async (device: Device) => {
    await deviceService.saveDevice(device);
    set((state) => ({
      devices: [...state.devices.filter((d) => d.id !== device.id), device],
    }));
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

      // Notify relay
      wsService.unpairDevice(id);

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

  updateDeviceStatus: (deviceId, status, lastSeenAt?: string, cliVersion?: string) => {
    const timestamp = lastSeenAt || new Date().toISOString();
    set((state) => ({
      devices: state.devices.map((d) =>
        d.id === deviceId
          ? { ...d, status, lastSeen: timestamp, lastSeenAt: timestamp, ...(cliVersion ? { cliVersion } : {}) }
          : d
      ),
    }));

    // Persist status update to AsyncStorage (fire and forget)
    deviceService.updateDeviceStatus(deviceId, status, lastSeenAt, cliVersion).catch(() => {});
  },

  updateToolStatus: (deviceId: string, toolType: string, status: 'active' | 'inactive' | 'error') => {
    set((state) => ({
      devices: state.devices.map((d) => {
        if (d.id !== deviceId) return d;

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
    const unsubscribeStatus = wsService.on('device_status', ({ deviceId, status, lastSeenAt, cliVersion }) => {
      get().updateDeviceStatus(deviceId, status, lastSeenAt, cliVersion);
    });

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
