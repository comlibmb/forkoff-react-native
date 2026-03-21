import { create } from 'zustand';
import { networkService } from '@/services/network.service';
import { wsService } from '@/services/websocket.service';

interface ConnectionState {
  // Phone has internet connection
  isPhoneOnline: boolean;

  // WebSocket connected to backend
  isServerConnected: boolean;

  // Whether this device was kicked by another device claiming the session
  wasKicked: boolean;

  // Actions
  initialize: () => () => void;
  setPhoneOnline: (isOnline: boolean) => void;
  setServerConnected: (isConnected: boolean) => void;
  setWasKicked: (kicked: boolean) => void;
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  isPhoneOnline: true,
  isServerConnected: false,
  wasKicked: false,

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

    // Initialize network service
    networkService.initialize();

    // Set initial server connection state
    set({ isServerConnected: wsService.isConnected });

    // Return cleanup function
    return () => {
      unsubscribeNetwork();
      unsubscribeWsConnected();
      unsubscribeWsDisconnected();
    };
  },

  setPhoneOnline: (isOnline) => set({ isPhoneOnline: isOnline }),

  setServerConnected: (isConnected) => set({ isServerConnected: isConnected }),

  setWasKicked: (kicked) => set({ wasKicked: kicked }),
}));

export default useConnectionStore;
