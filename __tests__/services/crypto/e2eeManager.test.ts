/**
 * TDD Tests for E2EE Manager
 * Integration service that orchestrates key management, encryption, and sessions.
 * Tests use the full signed key exchange flow (Ed25519 identity signatures + TOFU).
 */
import { E2EEManager } from '@/services/crypto/e2eeManager';
import { generateKeyPair } from '@/services/crypto/keyGeneration';
import { EncryptedPayload, EncryptedMessage } from '@/services/crypto/types';

const SecureStore = require('expo-secure-store');

/**
 * Helper: perform a full signed key exchange between two initialized managers.
 * manager1 initiates → manager2 handles init → manager1 handles ack.
 */
async function performKeyExchange(
  manager1: E2EEManager,
  device1Id: string,
  manager2: E2EEManager,
  device2Id: string,
): Promise<void> {
  const init = manager1.createKeyExchangeInit(device2Id);
  const ack = await manager2.handleKeyExchangeInit(init);
  await manager1.handleKeyExchangeAck(ack);
}

describe('E2EE Manager', () => {
  let manager: E2EEManager;

  beforeEach(() => {
    jest.clearAllMocks();
    SecureStore.getItemAsync.mockReset();
    SecureStore.setItemAsync.mockReset();
    SecureStore.deleteItemAsync.mockReset();
    manager = new E2EEManager('mobile-device');
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

    it('should generate signing key pair on initialization', async () => {
      SecureStore.getItemAsync.mockResolvedValue(null);
      SecureStore.setItemAsync.mockResolvedValue(undefined);

      await manager.initialize();

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'e2ee_signing_public',
        expect.any(String)
      );
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'e2ee_signing_secret',
        expect.any(String)
      );
      expect(manager.getSigningPublicKey()).toBeDefined();
    });
  });

  describe('key exchange', () => {
    beforeEach(async () => {
      SecureStore.getItemAsync.mockResolvedValue(null);
      SecureStore.setItemAsync.mockResolvedValue(undefined);
      await manager.initialize();
    });

    it('should create key exchange init with ephemeral key and signature', () => {
      const init = manager.createKeyExchangeInit('device-123');
      expect(init.senderDeviceId).toBe('mobile-device');
      expect(init.ephemeralPublicKey).toBeDefined();
      expect(init.ephemeralPublicKey).toMatch(/^[A-Za-z0-9+/]+=*$/);
      // Must include identity signature for MITM protection
      expect(init.identityPublicKey).toBeDefined();
      expect(init.signature).toBeDefined();
    });

    it('should establish session via full signed key exchange', async () => {
      const remote = new E2EEManager('remote-device');
      SecureStore.getItemAsync.mockResolvedValue(null);
      SecureStore.setItemAsync.mockResolvedValue(undefined);
      await remote.initialize();

      await performKeyExchange(manager, 'mobile-device', remote, 'remote-device');

      expect(manager.isSessionEstablished('remote-device')).toBe(true);
      expect(remote.isSessionEstablished('mobile-device')).toBe(true);
    });

    it('should reject unsigned key exchange init', async () => {
      const init = {
        senderDeviceId: 'attacker-device',
        ephemeralPublicKey: generateKeyPair().publicKey,
        // No identityPublicKey or signature — should be rejected
      };

      await expect(manager.handleKeyExchangeInit(init)).rejects.toThrow(/UNSIGNED/);
    });

    it('should reject key exchange ack with invalid signature', async () => {
      const init = manager.createKeyExchangeInit('remote-device');

      const fakeAck = {
        senderDeviceId: 'remote-device',
        recipientDeviceId: 'mobile-device',
        ephemeralPublicKey: generateKeyPair().publicKey,
        identityPublicKey: generateKeyPair().publicKey, // Wrong key type, will fail verification
        signature: 'aW52YWxpZHNpZ25hdHVyZQ==', // Invalid signature
      };

      await expect(manager.handleKeyExchangeAck(fakeAck)).rejects.toThrow();
    });
  });

  describe('message encryption/decryption', () => {
    let manager1: E2EEManager;
    let manager2: E2EEManager;

    beforeEach(async () => {
      SecureStore.getItemAsync.mockResolvedValue(null);
      SecureStore.setItemAsync.mockResolvedValue(undefined);

      manager1 = new E2EEManager('device-1');
      manager2 = new E2EEManager('device-2');
      await manager1.initialize();
      await manager2.initialize();

      // Full signed key exchange
      await performKeyExchange(manager1, 'device-1', manager2, 'device-2');
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
      const freshManager = new E2EEManager('fresh-device');
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

      manager1 = new E2EEManager('device-1');
      manager2 = new E2EEManager('device-2');
      await manager1.initialize();
      await manager2.initialize();

      // Full signed key exchange
      await performKeyExchange(manager1, 'device-1', manager2, 'device-2');
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

    it('should clear session for a device', async () => {
      const remote = new E2EEManager('device-x');
      SecureStore.getItemAsync.mockResolvedValue(null);
      SecureStore.setItemAsync.mockResolvedValue(undefined);
      await remote.initialize();

      await performKeyExchange(remote, 'device-x', manager, 'mobile-device');
      expect(manager.isSessionEstablished('device-x')).toBe(true);

      manager.clearSession('device-x');
      expect(manager.isSessionEstablished('device-x')).toBe(false);
    });

    it('should clear all sessions', async () => {
      const remoteA = new E2EEManager('device-a');
      const remoteB = new E2EEManager('device-b');
      SecureStore.getItemAsync.mockResolvedValue(null);
      SecureStore.setItemAsync.mockResolvedValue(undefined);
      await remoteA.initialize();
      await remoteB.initialize();

      await performKeyExchange(remoteA, 'device-a', manager, 'mobile-device');
      await performKeyExchange(remoteB, 'device-b', manager, 'mobile-device');

      manager.clearAllSessions();
      expect(manager.isSessionEstablished('device-a')).toBe(false);
      expect(manager.isSessionEstablished('device-b')).toBe(false);
    });
  });
});
