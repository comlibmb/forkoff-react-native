import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SessionSettingsState {
  unrestrictedMode: boolean;
  hasSeenWarning: boolean;
  setUnrestrictedMode: (enabled: boolean) => void;
  setHasSeenWarning: () => void;
}

export const useSessionSettingsStore = create<SessionSettingsState>()(
  persist(
    (set) => ({
      unrestrictedMode: false,
      hasSeenWarning: false,

      setUnrestrictedMode: (enabled: boolean) => {
        set({ unrestrictedMode: enabled });
      },

      setHasSeenWarning: () => {
        set({ hasSeenWarning: true });
      },
    }),
    {
      name: 'session-settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useSessionSettingsStore;
