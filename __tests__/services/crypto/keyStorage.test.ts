/**
 * TDD Tests for Key Storage Service
 * Tests secure storage of E2EE keys using expo-secure-store.
 */
import { keyStorage } from '@/services/crypto/keyStorage';

// expo-secure-store is mocked in jest.setup.js
const SecureStore = require('expo-secure-store');

describe('Key Storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    SecureStore.getItemAsync.mockReset();
    SecureStore.setItemAsync.mockReset();
    SecureStore.deleteItemAsync.mockReset();
  });

  describe('storeIdentityKeyPair', () => {
    it('should store public key in secure store', async () => {
      SecureStore.setItemAsync.mockResolvedValue(undefined);
      await keyStorage.storeIdentityKeyPair({
        publicKey: 'testPublicKey==',
        privateKey: 'testPrivateKey==',
      });
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'e2ee_identity_public',
        'testPublicKey=='
      );
    });

    it('should store private key in secure store', async () => {
      SecureStore.setItemAsync.mockResolvedValue(undefined);
      await keyStorage.storeIdentityKeyPair({
        publicKey: 'testPublicKey==',
        privateKey: 'testPrivateKey==',
      });
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'e2ee_identity_private',
        'testPrivateKey=='
      );
    });
  });

  describe('getIdentityKeyPair', () => {
    it('should return key pair when both keys exist', async () => {
      SecureStore.getItemAsync
        .mockResolvedValueOnce('storedPublic==')
        .mockResolvedValueOnce('storedPrivate==');

      const keyPair = await keyStorage.getIdentityKeyPair();
      expect(keyPair).toEqual({
        publicKey: 'storedPublic==',
        privateKey: 'storedPrivate==',
      });
    });

    it('should return null when public key does not exist', async () => {
      SecureStore.getItemAsync
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce('storedPrivate==');

      const keyPair = await keyStorage.getIdentityKeyPair();
      expect(keyPair).toBeNull();
    });

    it('should return null when private key does not exist', async () => {
      SecureStore.getItemAsync
        .mockResolvedValueOnce('storedPublic==')
        .mockResolvedValueOnce(null);

      const keyPair = await keyStorage.getIdentityKeyPair();
      expect(keyPair).toBeNull();
    });
  });

  describe('deleteIdentityKeyPair', () => {
    it('should delete both keys from secure store', async () => {
      SecureStore.deleteItemAsync.mockResolvedValue(undefined);
      await keyStorage.deleteIdentityKeyPair();
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('e2ee_identity_public');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('e2ee_identity_private');
    });
  });

  describe('session key storage', () => {
    it('should store session key JSON for a device ID', async () => {
      SecureStore.setItemAsync.mockResolvedValue(undefined);
      await keyStorage.storeSessionKey('device-123', 'sessionKeyData==');
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'e2ee_session_device-123',
        'sessionKeyData=='
      );
    });

    it('should retrieve session key for a device ID', async () => {
      SecureStore.getItemAsync.mockResolvedValue('sessionKeyData==');
      const result = await keyStorage.getSessionKey('device-123');
      expect(result).toBe('sessionKeyData==');
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('e2ee_session_device-123');
    });

    it('should return null when no session key exists', async () => {
      SecureStore.getItemAsync.mockResolvedValue(null);
      const result = await keyStorage.getSessionKey('device-999');
      expect(result).toBeNull();
    });

    it('should delete session key for a device ID', async () => {
      SecureStore.deleteItemAsync.mockResolvedValue(undefined);
      await keyStorage.deleteSessionKey('device-123');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('e2ee_session_device-123');
    });
  });

  describe('error handling', () => {
    it('should handle secure store errors gracefully on store', async () => {
      SecureStore.setItemAsync.mockRejectedValue(new Error('Store failed'));
      await expect(
        keyStorage.storeIdentityKeyPair({ publicKey: 'a', privateKey: 'b' })
      ).rejects.toThrow('Store failed');
    });

    it('should handle secure store errors gracefully on get', async () => {
      SecureStore.getItemAsync.mockRejectedValue(new Error('Get failed'));
      await expect(keyStorage.getIdentityKeyPair()).rejects.toThrow('Get failed');
    });
  });
});
