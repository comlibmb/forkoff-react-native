/**
 * Key Storage Service
 * Stores E2EE keys securely using expo-secure-store (hardware-backed on iOS/Android).
 */
import * as SecureStore from 'expo-secure-store';
import { E2EEKeyPair } from './types';

const KEYS = {
  IDENTITY_PUBLIC: 'e2ee_identity_public',
  IDENTITY_PRIVATE: 'e2ee_identity_private',
  SESSION_PREFIX: 'e2ee_session_',
} as const;

class KeyStorage {
  /** Store the device identity key pair */
  async storeIdentityKeyPair(keyPair: E2EEKeyPair): Promise<void> {
    await SecureStore.setItemAsync(KEYS.IDENTITY_PUBLIC, keyPair.publicKey);
    await SecureStore.setItemAsync(KEYS.IDENTITY_PRIVATE, keyPair.privateKey);
  }

  /** Retrieve the device identity key pair, or null if not stored */
  async getIdentityKeyPair(): Promise<E2EEKeyPair | null> {
    const publicKey = await SecureStore.getItemAsync(KEYS.IDENTITY_PUBLIC);
    const privateKey = await SecureStore.getItemAsync(KEYS.IDENTITY_PRIVATE);
    if (!publicKey || !privateKey) return null;
    return { publicKey, privateKey };
  }

  /** Delete the device identity key pair */
  async deleteIdentityKeyPair(): Promise<void> {
    await SecureStore.deleteItemAsync(KEYS.IDENTITY_PUBLIC);
    await SecureStore.deleteItemAsync(KEYS.IDENTITY_PRIVATE);
  }

  /** Store a session key for a specific remote device */
  async storeSessionKey(deviceId: string, data: string): Promise<void> {
    await SecureStore.setItemAsync(`${KEYS.SESSION_PREFIX}${deviceId}`, data);
  }

  /** Retrieve a session key for a specific remote device */
  async getSessionKey(deviceId: string): Promise<string | null> {
    return SecureStore.getItemAsync(`${KEYS.SESSION_PREFIX}${deviceId}`);
  }

  /** Delete a session key for a specific remote device */
  async deleteSessionKey(deviceId: string): Promise<void> {
    await SecureStore.deleteItemAsync(`${KEYS.SESSION_PREFIX}${deviceId}`);
  }
}

export const keyStorage = new KeyStorage();
