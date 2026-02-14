import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ProjectPreferencesState {
  pinnedProjects: string[];
  togglePin: (deviceId: string, directory: string) => void;
  isPinned: (deviceId: string, directory: string) => boolean;
  unpinAll: () => void;
}

const makeKey = (deviceId: string, directory: string) => `${deviceId}:${directory}`;

export const useProjectPreferencesStore = create<ProjectPreferencesState>()(
  persist(
    (set, get) => ({
      pinnedProjects: [],

      togglePin: (deviceId, directory) => {
        const key = makeKey(deviceId, directory);
        const current = get().pinnedProjects;
        if (current.includes(key)) {
          set({ pinnedProjects: current.filter((k) => k !== key) });
        } else {
          set({ pinnedProjects: [...current, key] });
        }
      },

      isPinned: (deviceId, directory) => {
        return get().pinnedProjects.includes(makeKey(deviceId, directory));
      },

      unpinAll: () => {
        set({ pinnedProjects: [] });
      },
    }),
    {
      name: 'project-preferences-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useProjectPreferencesStore;
