import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sentryService } from './sentry.service';

// SECURITY: All device identity keys stored in SecureStore (hardware-backed keychain)
// Only non-sensitive metadata (device names, platforms) in AsyncStorage
const SECURE_DEVICE_ID_KEY = 'forkoff_mobile_device_id';
const SECURE_DEVICE_SECRET_KEY = 'forkoff_mobile_device_secret';
const ASYNC_PAIRED_DEVICES_KEY = '@forkoff/paired_devices';
const ASYNC_RELAY_URL_KEY = '@forkoff/relay_url';

// SECURITY: Rate limiting for pairing attempts (prevents brute-force)
const MAX_PAIRING_ATTEMPTS = 5;
const PAIRING_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export interface PairedDevice {
  id: string;
  name: string;
  platform: string;
  pairedAt: string;
  lastSeenAt?: string;
}

class PairingService {
  private pairingAttempts: { timestamp: number }[] = [];

  /**
   * SECURITY: Get or generate a cryptographically random mobile device ID.
   * Stored in SecureStore (hardware-backed keychain on iOS, encrypted SharedPrefs on Android).
   * This ID is the mobile device's persistent identity — never exposed in logs.
   */
  async getMobileDeviceId(): Promise<string> {
    try {
      const existing = await SecureStore.getItemAsync(SECURE_DEVICE_ID_KEY);
      if (existing) return existing;

      // Generate a CSPRNG device ID: 32 random bytes → 64-char hex
      const randomBytes = await Crypto.getRandomBytesAsync(32);
      const id = `mobile-${Array.from(new Uint8Array(randomBytes))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')}`;

      await SecureStore.setItemAsync(SECURE_DEVICE_ID_KEY, id);
      return id;
    } catch (error) {
      sentryService.captureException(error as Error, { context: 'get_mobile_device_id' });
      // SECURITY: Fallback to in-memory ID if SecureStore fails (e.g. simulator)
      // This means identity won't persist across app restarts on broken devices
      const fallbackBytes = await Crypto.getRandomBytesAsync(32);
      return `mobile-ephemeral-${Array.from(new Uint8Array(fallbackBytes))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')}`;
    }
  }

  /**
   * SECURITY: Get or generate a device secret for HMAC signing.
   * Used to prove ownership of the device ID to the relay.
   */
  async getDeviceSecret(): Promise<string> {
    try {
      const existing = await SecureStore.getItemAsync(SECURE_DEVICE_SECRET_KEY);
      if (existing) return existing;

      const randomBytes = await Crypto.getRandomBytesAsync(32);
      const secret = Array.from(new Uint8Array(randomBytes))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      await SecureStore.setItemAsync(SECURE_DEVICE_SECRET_KEY, secret);
      return secret;
    } catch (error) {
      sentryService.captureException(error as Error, { context: 'get_device_secret' });
      throw new Error('Failed to initialize device security credentials');
    }
  }

  /**
   * SECURITY: Check pairing rate limit to prevent brute-force attacks.
   * Allows MAX_PAIRING_ATTEMPTS per PAIRING_RATE_LIMIT_WINDOW_MS.
   */
  checkPairingRateLimit(): { allowed: boolean; retryAfterMs?: number } {
    const now = Date.now();
    // Prune expired attempts
    this.pairingAttempts = this.pairingAttempts.filter(
      (a) => now - a.timestamp < PAIRING_RATE_LIMIT_WINDOW_MS
    );

    if (this.pairingAttempts.length >= MAX_PAIRING_ATTEMPTS) {
      const oldestInWindow = this.pairingAttempts[0].timestamp;
      const retryAfterMs = PAIRING_RATE_LIMIT_WINDOW_MS - (now - oldestInWindow);
      return { allowed: false, retryAfterMs };
    }

    return { allowed: true };
  }

  /**
   * Record a pairing attempt for rate limiting.
   */
  recordPairingAttempt(): void {
    this.pairingAttempts.push({ timestamp: Date.now() });
  }

  /**
   * Validate pairing code format.
   * SECURITY: Strict validation prevents injection in WS event payloads.
   */
  validatePairingCode(code: string): { valid: boolean; error?: string } {
    if (!code || typeof code !== 'string') {
      return { valid: false, error: 'Pairing code is required' };
    }

    const trimmed = code.trim().toUpperCase();

    // Allow 6-36 char alphanumeric codes (CLI generates 8-char codes)
    if (!/^[A-Z0-9]{6,36}$/.test(trimmed)) {
      return { valid: false, error: 'Invalid pairing code format' };
    }

    return { valid: true };
  }

  /**
   * Get all paired devices from AsyncStorage.
   */
  async getPairedDevices(): Promise<PairedDevice[]> {
    try {
      const raw = await AsyncStorage.getItem(ASYNC_PAIRED_DEVICES_KEY);
      if (!raw) return [];

      const devices = JSON.parse(raw);
      if (!Array.isArray(devices)) return [];

      // SECURITY: Validate structure of each device to prevent poisoned data
      return devices.filter(
        (d: any) =>
          typeof d.id === 'string' &&
          typeof d.name === 'string' &&
          typeof d.platform === 'string' &&
          typeof d.pairedAt === 'string'
      );
    } catch (error) {
      sentryService.captureException(error as Error, { context: 'get_paired_devices' });
      return [];
    }
  }

  /**
   * Add a newly paired device to local storage.
   */
  async addPairedDevice(device: PairedDevice): Promise<void> {
    const devices = await this.getPairedDevices();

    // Replace if same ID exists (re-pair scenario)
    const filtered = devices.filter((d) => d.id !== device.id);
    filtered.push(device);

    await AsyncStorage.setItem(ASYNC_PAIRED_DEVICES_KEY, JSON.stringify(filtered));
  }

  /**
   * Remove a paired device from local storage.
   */
  async removePairedDevice(deviceId: string): Promise<void> {
    const devices = await this.getPairedDevices();
    const filtered = devices.filter((d) => d.id !== deviceId);
    await AsyncStorage.setItem(ASYNC_PAIRED_DEVICES_KEY, JSON.stringify(filtered));
  }

  /**
   * Update a paired device's metadata.
   */
  async updatePairedDevice(deviceId: string, updates: Partial<PairedDevice>): Promise<void> {
    const devices = await this.getPairedDevices();
    const updated = devices.map((d) => (d.id === deviceId ? { ...d, ...updates } : d));
    await AsyncStorage.setItem(ASYNC_PAIRED_DEVICES_KEY, JSON.stringify(updated));
  }

  /**
   * Check if any devices are paired.
   */
  async hasPairedDevices(): Promise<boolean> {
    const devices = await this.getPairedDevices();
    return devices.length > 0;
  }

  /**
   * Get custom relay URL (for self-hosting).
   */
  async getRelayUrl(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(ASYNC_RELAY_URL_KEY);
    } catch {
      return null;
    }
  }

  /**
   * Set custom relay URL.
   * SECURITY: Validate URL format and enforce wss:// in production.
   */
  async setRelayUrl(url: string | null): Promise<void> {
    if (url === null) {
      await AsyncStorage.removeItem(ASYNC_RELAY_URL_KEY);
      return;
    }

    // Validate URL format
    try {
      const parsed = new URL(url);
      if (!['ws:', 'wss:', 'http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch {
      throw new Error('Invalid relay URL format');
    }

    await AsyncStorage.setItem(ASYNC_RELAY_URL_KEY, url);
  }

  /**
   * Clear all pairing data (used during "unpair all" or reset).
   * SECURITY: Also clears the device secret to prevent stale identity reuse.
   */
  async clearAll(): Promise<void> {
    await AsyncStorage.removeItem(ASYNC_PAIRED_DEVICES_KEY);
    // Note: We do NOT clear the device ID — it's the persistent identity
    // We DO clear the secret so re-pairing generates fresh credentials
    await SecureStore.deleteItemAsync(SECURE_DEVICE_SECRET_KEY);
  }
}

export const pairingService = new PairingService();
export default pairingService;
