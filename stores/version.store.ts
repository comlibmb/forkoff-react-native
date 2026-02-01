import { create } from 'zustand';
import { versionService, VersionConfig } from '@/services/version.service';

interface VersionState {
  versionConfig: VersionConfig | null;
  needsUpdate: boolean;
  forceUpdate: boolean;
  updateMessage: string;
  currentVersion: string;

  // Actions
  setVersionConfig: (config: VersionConfig) => void;
  checkVersion: () => void;
}

export const useVersionStore = create<VersionState>((set, get) => ({
  versionConfig: null,
  needsUpdate: false,
  forceUpdate: false,
  updateMessage: '',
  currentVersion: versionService.getCurrentVersion(),

  setVersionConfig: (config) => {
    const needsUpdate = versionService.needsUpdate(config);
    const forceUpdate = versionService.needsForceUpdate(config);

    set({
      versionConfig: config,
      needsUpdate,
      forceUpdate,
      updateMessage: config.updateMessage || 'Please update to the latest version.',
    });

    if (needsUpdate) {
      console.log(
        `[VersionStore] Update required: current=${get().currentVersion}, min=${config.minVersion}, force=${forceUpdate}`,
      );
    }
  },

  checkVersion: () => {
    const config = get().versionConfig;
    if (!config) return;

    const needsUpdate = versionService.needsUpdate(config);
    const forceUpdate = versionService.needsForceUpdate(config);

    set({ needsUpdate, forceUpdate });
  },
}));

export default useVersionStore;
