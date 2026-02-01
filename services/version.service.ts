import Constants from 'expo-constants';

export interface VersionConfig {
  minVersion: string;
  forceUpdate: boolean;
  updateMessage?: string;
}

class VersionService {
  getCurrentVersion(): string {
    return Constants.expoConfig?.version || '1.0.0';
  }

  compareVersions(current: string, minimum: string): number {
    const currentParts = current.split('.').map(Number);
    const minimumParts = minimum.split('.').map(Number);

    // Pad arrays to same length
    const maxLength = Math.max(currentParts.length, minimumParts.length);
    while (currentParts.length < maxLength) currentParts.push(0);
    while (minimumParts.length < maxLength) minimumParts.push(0);

    for (let i = 0; i < maxLength; i++) {
      if (currentParts[i] > minimumParts[i]) return 1;
      if (currentParts[i] < minimumParts[i]) return -1;
    }

    return 0;
  }

  needsUpdate(config: VersionConfig): boolean {
    const current = this.getCurrentVersion();
    const comparison = this.compareVersions(current, config.minVersion);

    // Current version is less than minimum required version
    return comparison < 0;
  }

  needsForceUpdate(config: VersionConfig): boolean {
    return this.needsUpdate(config) && config.forceUpdate;
  }
}

export const versionService = new VersionService();
export default versionService;
