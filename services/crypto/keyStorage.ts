/**
 * Key Storage Service
 * Stores E2EE keys securely using expo-secure-store (hardware-backed on iOS/Android).
 */
import * as SecureStore from 'expo-secure-store';
import { E2EEKeyPair, SigningKeyPair } from './types';

const KEYS = {
  IDENTITY_PUBLIC: 'e2ee_identity_public',
  IDENTITY_PRIVATE: 'e2ee_identity_private',
  SIGNING_PUBLIC: 'e2ee_signing_public',
  SIGNING_SECRET: 'e2ee_signing_secret',
  SESSION_PREFIX: 'e2ee_session_',
  TRUSTED_PREFIX: 'e2ee_trusted_',
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

  // --- Ed25519 Signing Key Pair ---

  /** Store the Ed25519 signing key pair */
  async storeSigningKeyPair(keyPair: SigningKeyPair): Promise<void> {
    await SecureStore.setItemAsync(KEYS.SIGNING_PUBLIC, keyPair.publicKey);
    await SecureStore.setItemAsync(KEYS.SIGNING_SECRET, keyPair.secretKey);
  }

  /** Retrieve the Ed25519 signing key pair */
  async getSigningKeyPair(): Promise<SigningKeyPair | null> {
    const publicKey = await SecureStore.getItemAsync(KEYS.SIGNING_PUBLIC);
    const secretKey = await SecureStore.getItemAsync(KEYS.SIGNING_SECRET);
    if (!publicKey || !secretKey) return null;
    return { publicKey, secretKey };
  }

  /** Delete the Ed25519 signing key pair (forces regeneration on next init) */
  async deleteSigningKeyPair(): Promise<void> {
    await SecureStore.deleteItemAsync(KEYS.SIGNING_PUBLIC);
    await SecureStore.deleteItemAsync(KEYS.SIGNING_SECRET);
  }

  // --- Trusted Peer Identity Keys (TOFU) ---

  /** Store a peer's identity public key */
  async storeTrustedPeerKey(deviceId: string, identityPublicKey: string): Promise<void> {
    await SecureStore.setItemAsync(`${KEYS.TRUSTED_PREFIX}${deviceId}`, identityPublicKey);
  }

  /** Get a trusted peer's identity public key */
  async getTrustedPeerKey(deviceId: string): Promise<string | null> {
    return SecureStore.getItemAsync(`${KEYS.TRUSTED_PREFIX}${deviceId}`);
  }

  /** Clear all E2EE keys on logout — identity, signing, and known trusted peer keys */
  async clearAllKeys(knownPeerDeviceIds: string[] = []): Promise<void> {
    await this.deleteIdentityKeyPair();
    await SecureStore.deleteItemAsync(KEYS.SIGNING_PUBLIC);
    await SecureStore.deleteItemAsync(KEYS.SIGNING_SECRET);
    for (const deviceId of knownPeerDeviceIds) {
      await SecureStore.deleteItemAsync(`${KEYS.TRUSTED_PREFIX}${deviceId}`);
      await SecureStore.deleteItemAsync(`${KEYS.SESSION_PREFIX}${deviceId}`);
    }
  }
}

export const keyStorage = new KeyStorage();
