import { create } from 'zustand';
import { pairingService, PairedDevice } from '@/services/pairing.service';
import { sentryService } from '@/services/sentry.service';
import { analyticsService } from '@/services/analytics.service';

interface IdentityState {
  // Identity
  mobileDeviceId: string | null;
  isReady: boolean;
  isLoading: boolean;
  error: string | null;

  // Pairing state
  isPaired: boolean;
  pairedDevices: PairedDevice[];

  // Actions
  initialize: () => Promise<void>;
  addPairedDevice: (device: PairedDevice) => Promise<void>;
  removePairedDevice: (deviceId: string) => Promise<void>;
  refreshPairedDevices: () => Promise<void>;
  unpairAll: () => Promise<void>;
  clearError: () => void;
}

export const useIdentityStore = create<IdentityState>((set, get) => ({
  mobileDeviceId: null,
  isReady: false,
  isLoading: false,
  error: null,
  isPaired: false,
  pairedDevices: [],

  initialize: async () => {
    try {
      set({ isLoading: true });

      // Get or generate persistent device ID from SecureStore
      const mobileDeviceId = await pairingService.getMobileDeviceId();

      // Load paired devices from AsyncStorage
      const pairedDevices = await pairingService.getPairedDevices();

      // Identify in analytics with device ID (no PII)
      analyticsService.identify(mobileDeviceId, {
        deviceType: 'mobile',
        pairedDeviceCount: pairedDevices.length,
      });

      set({
        mobileDeviceId,
        pairedDevices,
        isPaired: pairedDevices.length > 0,
        isReady: true,
        isLoading: false,
      });
    } catch (error) {
      sentryService.captureException(error as Error, { context: 'identity_initialize' });
      set({
        isReady: true,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to initialize identity',
      });
    }
  },

  addPairedDevice: async (device: PairedDevice) => {
    try {
      await pairingService.addPairedDevice(device);

      const pairedDevices = await pairingService.getPairedDevices();

      analyticsService.track('device_paired', {
        deviceId: device.id,
        deviceName: device.name,
        platform: device.platform,
      });

      set({
        pairedDevices,
        isPaired: true,
      });
    } catch (error) {
      sentryService.captureException(error as Error, { context: 'add_paired_device' });
      set({ error: error instanceof Error ? error.message : 'Failed to save paired device' });
      throw error;
    }
  },

  removePairedDevice: async (deviceId: string) => {
    try {
      const device = get().pairedDevices.find((d) => d.id === deviceId);

      await pairingService.removePairedDevice(deviceId);

      const pairedDevices = await pairingService.getPairedDevices();

      analyticsService.track('device_removed', {
        deviceId,
        deviceName: device?.name,
      });

      set({
        pairedDevices,
        isPaired: pairedDevices.length > 0,
      });
    } catch (error) {
      sentryService.captureException(error as Error, { context: 'remove_paired_device' });
      throw error;
    }
  },

  refreshPairedDevices: async () => {
    try {
      const pairedDevices = await pairingService.getPairedDevices();
      set({
        pairedDevices,
        isPaired: pairedDevices.length > 0,
      });
    } catch (error) {
      sentryService.captureException(error as Error, { context: 'refresh_paired_devices' });
    }
  },

  unpairAll: async () => {
    try {
      set({ isLoading: true });

      analyticsService.track('unpair_all');

      await pairingService.clearAll();

      // Clear E2EE keys for all devices
      try {
        const { keyStorage } = await import('@/services/crypto/keyStorage');
        const { useE2EEStore } = await import('@/stores/e2ee.store');
        const deviceIds = get().pairedDevices.map((d) => d.id);
        await keyStorage.clearAllKeys(deviceIds);
        useE2EEStore.getState().reset();
      } catch {
        // Best-effort cleanup
      }

      set({
        pairedDevices: [],
        isPaired: false,
        isLoading: false,
      });
    } catch (error) {
      sentryService.captureException(error as Error, { context: 'unpair_all' });
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to unpair devices',
      });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));

export default useIdentityStore;
