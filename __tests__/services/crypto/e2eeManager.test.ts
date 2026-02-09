/**
 * TDD Tests for E2EE Manager
 * Integration service that orchestrates key management, encryption, and sessions.
 */
import { E2EEManager } from '@/services/crypto/e2eeManager';
import { generateKeyPair } from '@/services/crypto/keyGeneration';
import { EncryptedPayload, EncryptedMessage } from '@/services/crypto/types';

const SecureStore = require('expo-secure-store');

describe('E2EE Manager', () => {
  let manager: E2EEManager;

  beforeEach(() => {
    jest.clearAllMocks();
    SecureStore.getItemAsync.mockReset();
    SecureStore.setItemAsync.mockReset();
    SecureStore.deleteItemAsync.mockReset();
    manager = new E2EEManager();
  });

  describe('initialization', () => {
    it('should generate new keys if none are stored', async () => {
      SecureStore.getItemAsync.mockResolvedValue(null);
      SecureStore.setItemAsync.mockResolvedValue(undefined);

      await manager.initialize();

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'e2ee_identity_public',
        expect.any(String)
      );
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'e2ee_identity_private',
        expect.any(String)
      );
    });

    it('should load existing keys if stored', async () => {
      const existingKeyPair = generateKeyPair();
      SecureStore.getItemAsync
        .mockResolvedValueOnce(existingKeyPair.publicKey)
        .mockResolvedValueOnce(existingKeyPair.privateKey);

      await manager.initialize();

      expect(manager.getPublicKey()).toBe(existingKeyPair.publicKey);
    });

    it('should expose public key after initialization', async () => {
      SecureStore.getItemAsync.mockResolvedValue(null);
      SecureStore.setItemAsync.mockResolvedValue(undefined);

      await manager.initialize();

      const publicKey = manager.getPublicKey();
      expect(publicKey).toBeDefined();
      expect(publicKey).toMatch(/^[A-Za-z0-9+/]+=*$/);
    });
  });

  describe('key exchange', () => {
    beforeEach(async () => {
      SecureStore.getItemAsync.mockResolvedValue(null);
      SecureStore.setItemAsync.mockResolvedValue(undefined);
      await manager.initialize();
    });

    it('should create key exchange init with ephemeral key', () => {
      const init = manager.createKeyExchangeInit('device-123');
      expect(init.senderDeviceId).toBeDefined();
      expect(init.ephemeralPublicKey).toBeDefined();
      expect(init.ephemeralPublicKey).toMatch(/^[A-Za-z0-9+/]+=*$/);
    });

    it('should establish session from received key exchange init', () => {
      // Simulate remote device sending us a key exchange init
      const remoteKeyPair = generateKeyPair();
      const init = {
        senderDeviceId: 'remote-device',
        ephemeralPublicKey: remoteKeyPair.publicKey,
      };

      const ack = manager.handleKeyExchangeInit(init);
      expect(ack.recipientDeviceId).toBeDefined();
      expect(ack.ephemeralPublicKey).toBeDefined();
      expect(manager.isSessionEstablished('remote-device')).toBe(true);
    });

    it('should establish session from received key exchange ack', () => {
      // First create an init (which stores our ephemeral private key)
      const init = manager.createKeyExchangeInit('remote-device');

      // Simulate remote device acking with their ephemeral public key
      const remoteKeyPair = generateKeyPair();
      const ack = {
        recipientDeviceId: 'remote-device',
        ephemeralPublicKey: remoteKeyPair.publicKey,
      };

      manager.handleKeyExchangeAck(ack);
      expect(manager.isSessionEstablished('remote-device')).toBe(true);
    });
  });

  describe('message encryption/decryption', () => {
    let manager1: E2EEManager;
    let manager2: E2EEManager;

    beforeEach(async () => {
      SecureStore.getItemAsync.mockResolvedValue(null);
      SecureStore.setItemAsync.mockResolvedValue(undefined);

      manager1 = new E2EEManager();
      manager2 = new E2EEManager();
      await manager1.initialize();
      await manager2.initialize();

      // Perform key exchange between manager1 and manager2
      const init = manager1.createKeyExchangeInit('device-2');
      const ack = manager2.handleKeyExchangeInit({
        senderDeviceId: 'device-1',
        ephemeralPublicKey: init.ephemeralPublicKey,
      });
      manager1.handleKeyExchangeAck({
        recipientDeviceId: 'device-2',
        ephemeralPublicKey: ack.ephemeralPublicKey,
      });
    });

    it('should encrypt a message for a device', () => {
      const encrypted = manager1.encryptMessage('Hello!', 'device-2', 'session-1');
      expect(encrypted).toBeDefined();
      expect(encrypted.payload.ciphertext).toBeDefined();
      expect(encrypted.payload.nonce).toBeDefined();
      expect(encrypted.sessionId).toBe('session-1');
      expect(encrypted.recipientDeviceId).toBe('device-2');
    });

    it('should decrypt a message from the other side', () => {
      const encrypted = manager1.encryptMessage('Hello from device 1!', 'device-2', 'session-1');
      const decrypted = manager2.decryptMessage(encrypted, 'device-1');
      expect(decrypted).toBe('Hello from device 1!');
    });

    it('should handle bidirectional messages', () => {
      const msg1 = manager1.encryptMessage('From 1 to 2', 'device-2', 'session-1');
      expect(manager2.decryptMessage(msg1, 'device-1')).toBe('From 1 to 2');

      const msg2 = manager2.encryptMessage('From 2 to 1', 'device-1', 'session-1');
      expect(manager1.decryptMessage(msg2, 'device-2')).toBe('From 2 to 1');
    });

    it('should increment message counter on each send', () => {
      const msg1 = manager1.encryptMessage('first', 'device-2', 'session-1');
      const msg2 = manager1.encryptMessage('second', 'device-2', 'session-1');
      expect(msg2.messageCounter).toBeGreaterThan(msg1.messageCounter);
    });

    it('should throw when encrypting without established session', () => {
      const freshManager = new E2EEManager();
      expect(() =>
        freshManager.encryptMessage('test', 'unknown-device', 'session-1')
      ).toThrow();
    });
  });

  describe('replay protection', () => {
    let manager1: E2EEManager;
    let manager2: E2EEManager;

    beforeEach(async () => {
      SecureStore.getItemAsync.mockResolvedValue(null);
      SecureStore.setItemAsync.mockResolvedValue(undefined);

      manager1 = new E2EEManager();
      manager2 = new E2EEManager();
      await manager1.initialize();
      await manager2.initialize();

      // Key exchange
      const init = manager1.createKeyExchangeInit('device-2');
      const ack = manager2.handleKeyExchangeInit({
        senderDeviceId: 'device-1',
        ephemeralPublicKey: init.ephemeralPublicKey,
      });
      manager1.handleKeyExchangeAck({
        recipientDeviceId: 'device-2',
        ephemeralPublicKey: ack.ephemeralPublicKey,
      });
    });

    it('should reject messages with duplicate counter', () => {
      const encrypted = manager1.encryptMessage('test', 'device-2', 'session-1');
      manager2.decryptMessage(encrypted, 'device-1'); // First time OK

      expect(() => manager2.decryptMessage(encrypted, 'device-1')).toThrow(/replay/i);
    });

    it('should reject messages with lower counter', () => {
      const msg1 = manager1.encryptMessage('first', 'device-2', 'session-1');
      const msg2 = manager1.encryptMessage('second', 'device-2', 'session-1');

      manager2.decryptMessage(msg2, 'device-1'); // Process second first
      expect(() => manager2.decryptMessage(msg1, 'device-1')).toThrow(/replay/i);
    });
  });

  describe('session management', () => {
    beforeEach(async () => {
      SecureStore.getItemAsync.mockResolvedValue(null);
      SecureStore.setItemAsync.mockResolvedValue(undefined);
      await manager.initialize();
    });

    it('should report session not established for unknown device', () => {
      expect(manager.isSessionEstablished('unknown')).toBe(false);
    });

    it('should clear session for a device', () => {
      const remoteKeyPair = generateKeyPair();
      manager.handleKeyExchangeInit({
        senderDeviceId: 'device-x',
        ephemeralPublicKey: remoteKeyPair.publicKey,
      });
      expect(manager.isSessionEstablished('device-x')).toBe(true);

      manager.clearSession('device-x');
      expect(manager.isSessionEstablished('device-x')).toBe(false);
    });

    it('should clear all sessions', () => {
      const kp1 = generateKeyPair();
      const kp2 = generateKeyPair();
      manager.handleKeyExchangeInit({
        senderDeviceId: 'device-a',
        ephemeralPublicKey: kp1.publicKey,
      });
      manager.handleKeyExchangeInit({
        senderDeviceId: 'device-b',
        ephemeralPublicKey: kp2.publicKey,
      });

      manager.clearAllSessions();
      expect(manager.isSessionEstablished('device-a')).toBe(false);
      expect(manager.isSessionEstablished('device-b')).toBe(false);
    });
  });
});
