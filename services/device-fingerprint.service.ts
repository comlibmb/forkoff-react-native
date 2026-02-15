import * as Application from 'expo-application';
import * as Device from 'expo-device';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

class DeviceFingerprintService {
  private cachedHash: string | null = null;

  /**
   * Generate a SHA-256 fingerprint hash from device hardware identifiers.
   * Returns null if fingerprinting fails (fail-open policy).
   */
  async getFingerprint(): Promise<string | null> {
    if (this.cachedHash) return this.cachedHash;

    try {
      const components: string[] = [];

      // Platform-specific identifiers
      if (Platform.OS === 'ios') {
        const vendorId = await Application.getIosIdForVendorAsync();
        if (vendorId) components.push(vendorId);
      } else if (Platform.OS === 'android') {
        const androidId = Application.getAndroidId();
        if (androidId) components.push(androidId);
      }

      // Common hardware identifiers
      if (Device.brand) components.push(Device.brand);
      if (Device.modelName) components.push(Device.modelName);
      if (Device.modelId) components.push(Device.modelId);
      if (Device.totalMemory) components.push(String(Device.totalMemory));
      components.push(Platform.OS);

      if (components.length < 2) {
        console.warn('[Fingerprint] Not enough device identifiers');
        return null;
      }

      const raw = components.join('|');
      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        raw,
      );

      this.cachedHash = hash;
      return hash;
    } catch (error) {
      console.error('[Fingerprint] Failed to generate fingerprint:', error);
      return null;
    }
  }
}

export const deviceFingerprintService = new DeviceFingerprintService();
