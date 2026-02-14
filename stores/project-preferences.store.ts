import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ProjectPreferencesState {
  pinnedProjects: string[];
  togglePin: (deviceId: string, directory: string) => void;
  isPinned: (deviceId: string, directory: string) => boolean;
  unpinAll: () => void;
  reorderPinned: (fromIndex: number, toIndex: number) => void;
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

      reorderPinned: (fromIndex, toIndex) => {
        const current = [...get().pinnedProjects];
        const [moved] = current.splice(fromIndex, 1);
        current.splice(toIndex, 0, moved);
        set({ pinnedProjects: current });
      },
    }),
    {
      name: 'project-preferences-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useProjectPreferencesStore;
