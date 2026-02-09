/**
 * E2EE Store (Zustand)
 * Manages E2EE UI state: enabled flag, session statuses per device.
 */
import { create } from 'zustand';
import { E2EESessionStatus } from '@/services/crypto/types';

interface E2EEState {
  e2eeEnabled: boolean;
  encryptedSessions: Record<string, E2EESessionStatus>;

  setE2EEEnabled: (enabled: boolean) => void;
  setSessionStatus: (deviceId: string, status: E2EESessionStatus) => void;
  isSessionEncrypted: (deviceId: string) => boolean;
  clearEncryptedSessions: () => void;
  reset: () => void;
}

const initialState = {
  e2eeEnabled: false,
  encryptedSessions: {} as Record<string, E2EESessionStatus>,
};

export const useE2EEStore = create<E2EEState>((set, get) => ({
  ...initialState,

  setE2EEEnabled: (enabled) => set({ e2eeEnabled: enabled }),

  setSessionStatus: (deviceId, status) =>
    set((state) => ({
      encryptedSessions: { ...state.encryptedSessions, [deviceId]: status },
    })),

  isSessionEncrypted: (deviceId) =>
    get().encryptedSessions[deviceId] === 'established',

  clearEncryptedSessions: () => set({ encryptedSessions: {} }),

  reset: () => set({ ...initialState }),
}));
