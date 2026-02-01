import { create } from 'zustand';
import { networkService } from '@/services/network.service';
import { wsService } from '@/services/websocket.service';
import { DeviceStatus } from '@/types';

interface ConnectionState {
  // Phone has internet connection
  isPhoneOnline: boolean;

  // WebSocket connected to backend
  isServerConnected: boolean;

  // Map of device IDs to their online/offline status
  deviceStatuses: Record<string, DeviceStatus>;

  // Actions
  initialize: () => () => void;
  setPhoneOnline: (isOnline: boolean) => void;
  setServerConnected: (isConnected: boolean) => void;
  setDeviceStatus: (deviceId: string, status: DeviceStatus) => void;
  isDeviceOnline: (deviceId: string) => boolean;
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  isPhoneOnline: true,
  isServerConnected: false,
  deviceStatuses: {},

  initialize: () => {
    // Subscribe to network changes
    const unsubscribeNetwork = networkService.subscribe((isConnected) => {
      set({ isPhoneOnline: isConnected });
    });

    // Subscribe to WebSocket connection events
    const unsubscribeWsConnected = wsService.on('connected', () => {
      set({ isServerConnected: true });
    });

    const unsubscribeWsDisconnected = wsService.on('disconnected', () => {
      set({ isServerConnected: false });
    });

    // Subscribe to device status updates
    const unsubscribeDeviceStatus = wsService.on('device_status', (data) => {
      set((state) => ({
        deviceStatuses: {
          ...state.deviceStatuses,
          [data.deviceId]: data.status,
        },
      }));
    });

    // Initialize network service
    networkService.initialize();

    // Set initial server connection state
    set({ isServerConnected: wsService.isConnected });

    // Return cleanup function
    return () => {
      unsubscribeNetwork();
      unsubscribeWsConnected();
      unsubscribeWsDisconnected();
      unsubscribeDeviceStatus();
    };
  },

  setPhoneOnline: (isOnline) => set({ isPhoneOnline: isOnline }),

  setServerConnected: (isConnected) => set({ isServerConnected: isConnected }),

  setDeviceStatus: (deviceId, status) =>
    set((state) => ({
      deviceStatuses: {
        ...state.deviceStatuses,
        [deviceId]: status,
      },
    })),

  isDeviceOnline: (deviceId) => {
    const status = get().deviceStatuses[deviceId];
    return status === 'online' || status === 'ONLINE';
  },
}));

export default useConnectionStore;
