/**
 * TDD Tests for WebSocket E2EE Integration
 * Tests the bridge between E2EEManager, WebSocket service, and E2EE store.
 */

// Store handlers that are registered with socket.on
const socketHandlers: Map<string, Function[]> = new Map();

// Create mock socket
interface MockSocket {
  connected: boolean;
  id: string;
  on: jest.Mock;
  off: jest.Mock;
  emit: jest.Mock;
  disconnect: jest.Mock;
  simulateEvent: (event: string, data: unknown) => void;
}

const mockSocket: MockSocket = {
  connected: true,
  id: 'mock-socket-id',
  on: jest.fn((event: string, handler: Function): MockSocket => {
    if (!socketHandlers.has(event)) {
      socketHandlers.set(event, []);
    }
    socketHandlers.get(event)!.push(handler);
    return mockSocket;
  }),
  off: jest.fn(),
  emit: jest.fn(),
  disconnect: jest.fn(),
  simulateEvent: (event: string, data: unknown): void => {
    const handlers = socketHandlers.get(event) || [];
    handlers.forEach(h => h(data));
  },
};

// Mock socket.io-client
jest.mock('socket.io-client', () => ({
  __esModule: true,
  io: jest.fn(() => mockSocket),
  default: jest.fn(() => mockSocket),
  Socket: class MockSocket {},
}));

// Mock auth service
jest.mock('@/services/auth.service', () => ({
  authService: {
    getAccessToken: jest.fn().mockResolvedValue('mock-token'),
  },
}));

// Mock expo-secure-store (needed by keyStorage)
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

// Mock sentry
jest.mock('@/services/sentry.service', () => ({
  sentryService: {
    captureException: jest.fn(),
    addBreadcrumb: jest.fn(),
  },
}));

// Mock analytics
jest.mock('@/services/analytics.service', () => ({
  analyticsService: {
    track: jest.fn(),
  },
}));

import { wsService } from '@/services/websocket.service';
import { E2EEManager } from '@/services/crypto/e2eeManager';
import { useE2EEStore } from '@/stores/e2ee.store';
import { generateKeyPair } from '@/services/crypto/keyGeneration';
import { computeSharedKey } from '@/services/crypto/keyExchange';
import { encrypt } from '@/services/crypto/encryption';

describe('WebSocket E2EE Integration', () => {
  let e2eeManager: E2EEManager;

  beforeEach(async () => {
    // Clear emit mock to track fresh calls per test
    mockSocket.emit.mockClear();
    useE2EEStore.getState().reset();

    e2eeManager = new E2EEManager();
    await e2eeManager.initialize();

    // Disconnect + clear handlers + reconnect to get fresh socket event handlers
    wsService.disconnect();
    socketHandlers.clear();
    mockSocket.connected = false;
    await wsService.connect();
    mockSocket.connected = true;
  });

  describe('WebSocket service E2EE event registration', () => {
    it('should register listener for encrypted_key_exchange_init event', () => {
      const onCalls = mockSocket.on.mock.calls;
      const handler = onCalls.find(
        (call: [string, ...unknown[]]) => call[0] === 'encrypted_key_exchange_init'
      );
      expect(handler).toBeDefined();
    });

    it('should register listener for encrypted_key_exchange_ack event', () => {
      const onCalls = mockSocket.on.mock.calls;
      const handler = onCalls.find(
        (call: [string, ...unknown[]]) => call[0] === 'encrypted_key_exchange_ack'
      );
      expect(handler).toBeDefined();
    });

    it('should register listener for encrypted_message event', () => {
      const onCalls = mockSocket.on.mock.calls;
      const handler = onCalls.find(
        (call: [string, ...unknown[]]) => call[0] === 'encrypted_message'
      );
      expect(handler).toBeDefined();
    });
  });

  describe('E2EE event forwarding to internal subscribers', () => {
    it('should forward encrypted_key_exchange_init to subscribers', async () => {
      const callback = jest.fn();
      wsService.on('encrypted_key_exchange_init', callback);

      const initData = {
        senderDeviceId: 'cli-device-1',
        ephemeralPublicKey: generateKeyPair().publicKey,
      };

      mockSocket.simulateEvent('encrypted_key_exchange_init', initData);
      expect(callback).toHaveBeenCalledWith(initData);
    });

    it('should forward encrypted_key_exchange_ack to subscribers', async () => {
      const callback = jest.fn();
      wsService.on('encrypted_key_exchange_ack', callback);

      const ackData = {
        recipientDeviceId: 'mobile-device-1',
        ephemeralPublicKey: generateKeyPair().publicKey,
      };

      mockSocket.simulateEvent('encrypted_key_exchange_ack', ackData);
      expect(callback).toHaveBeenCalledWith(ackData);
    });

    it('should forward encrypted_message to subscribers', async () => {
      const callback = jest.fn();
      wsService.on('encrypted_message', callback);

      const msgData = {
        senderDeviceId: 'cli-device-1',
        recipientDeviceId: 'mobile-device-1',
        sessionId: 'session-abc',
        payload: { ciphertext: 'abc123', nonce: 'def456' },
        messageCounter: 1,
        timestamp: new Date().toISOString(),
      };

      mockSocket.simulateEvent('encrypted_message', msgData);
      expect(callback).toHaveBeenCalledWith(msgData);
    });
  });

  describe('Sending E2EE events via WebSocket', () => {
    it('should emit encrypted_key_exchange_init via wsService.emit', () => {
      const initData = {
        senderDeviceId: 'mobile-device-1',
        ephemeralPublicKey: generateKeyPair().publicKey,
      };

      wsService.emit('encrypted_key_exchange_init', initData);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'encrypted_key_exchange_init',
        initData
      );
    });

    it('should emit encrypted_key_exchange_ack via wsService.emit', () => {
      const ackData = {
        recipientDeviceId: 'cli-device-1',
        ephemeralPublicKey: generateKeyPair().publicKey,
      };

      wsService.emit('encrypted_key_exchange_ack', ackData);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'encrypted_key_exchange_ack',
        ackData
      );
    });

    it('should emit encrypted_message via wsService.emit', () => {
      const msgData = {
        senderDeviceId: 'mobile-device-1',
        recipientDeviceId: 'cli-device-1',
        sessionId: 'session-abc',
        payload: { ciphertext: 'abc123', nonce: 'def456' },
        messageCounter: 1,
        timestamp: new Date().toISOString(),
      };

      wsService.emit('encrypted_message', msgData);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'encrypted_message',
        msgData
      );
    });
  });

  describe('E2EE Manager + WebSocket full key exchange flow', () => {
    it('should complete key exchange: mobile initiates, CLI responds', () => {
      // 1. Mobile creates key exchange init
      const init = e2eeManager.createKeyExchangeInit('cli-device-1');
      expect(init.ephemeralPublicKey).toBeDefined();

      // 2. Mobile would send init via WebSocket
      wsService.emit('encrypted_key_exchange_init', {
        senderDeviceId: 'mobile-device-1',
        ephemeralPublicKey: init.ephemeralPublicKey,
      });

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'encrypted_key_exchange_init',
        expect.objectContaining({
          senderDeviceId: 'mobile-device-1',
          ephemeralPublicKey: init.ephemeralPublicKey,
        })
      );

      // 3. Simulate CLI responding with ack (different key pair)
      const cliKeyPair = generateKeyPair();
      const ackFromCli = {
        recipientDeviceId: 'cli-device-1',
        ephemeralPublicKey: cliKeyPair.publicKey,
      };

      // 4. Mobile handles the ack
      e2eeManager.handleKeyExchangeAck(ackFromCli);

      // 5. Session should now be established
      expect(e2eeManager.isSessionEstablished('cli-device-1')).toBe(true);
    });

    it('should complete key exchange: CLI initiates, mobile responds', () => {
      const cliKeyPair = generateKeyPair();

      // 1. CLI sends key exchange init via WebSocket
      const initFromCli = {
        senderDeviceId: 'cli-device-1',
        ephemeralPublicKey: cliKeyPair.publicKey,
      };

      // 2. Mobile handles the init and creates ack
      const ack = e2eeManager.handleKeyExchangeInit(initFromCli);
      expect(ack.recipientDeviceId).toBe('cli-device-1');
      expect(ack.ephemeralPublicKey).toBeDefined();

      // 3. Mobile would send ack via WebSocket
      wsService.emit('encrypted_key_exchange_ack', ack);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'encrypted_key_exchange_ack',
        expect.objectContaining({
          recipientDeviceId: 'cli-device-1',
        })
      );

      // 4. Session should be established on mobile side
      expect(e2eeManager.isSessionEstablished('cli-device-1')).toBe(true);
    });
  });

  describe('Encrypted message sending over WebSocket', () => {
    beforeEach(() => {
      // Establish a session manually using key exchange
      const cliKeyPair = generateKeyPair();
      const initFromCli = {
        senderDeviceId: 'cli-device-1',
        ephemeralPublicKey: cliKeyPair.publicKey,
      };
      e2eeManager.handleKeyExchangeInit(initFromCli);
    });

    it('should encrypt a message and emit via WebSocket', () => {
      const encrypted = e2eeManager.encryptMessage(
        'Hello from mobile!',
        'cli-device-1',
        'session-abc'
      );

      wsService.emit('encrypted_message', encrypted);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'encrypted_message',
        expect.objectContaining({
          recipientDeviceId: 'cli-device-1',
          sessionId: 'session-abc',
          payload: expect.objectContaining({
            ciphertext: expect.any(String),
            nonce: expect.any(String),
          }),
          messageCounter: 1,
        })
      );
    });

    it('should increment message counter on successive sends', () => {
      const msg1 = e2eeManager.encryptMessage('msg 1', 'cli-device-1', 'ses-1');
      const msg2 = e2eeManager.encryptMessage('msg 2', 'cli-device-1', 'ses-1');

      expect(msg1.messageCounter).toBe(1);
      expect(msg2.messageCounter).toBe(2);
    });
  });

  describe('Encrypted message receiving over WebSocket', () => {
    let sharedKey: Uint8Array;

    beforeEach(() => {
      // Set up a matching session from both sides
      // Mobile initiates
      const init = e2eeManager.createKeyExchangeInit('cli-device-1');

      // CLI side computes shared key using mobile's ephemeral public key
      const cliEphemeral = generateKeyPair();
      sharedKey = computeSharedKey(cliEphemeral.privateKey, init.ephemeralPublicKey);

      // Mobile completes exchange
      e2eeManager.handleKeyExchangeAck({
        recipientDeviceId: 'cli-device-1',
        ephemeralPublicKey: cliEphemeral.publicKey,
      });
    });

    it('should decrypt an incoming encrypted message', () => {
      // CLI encrypts a message using the shared key
      const payload = encrypt('Hello from CLI!', sharedKey);
      const encryptedMsg = {
        senderDeviceId: 'cli-device-1',
        recipientDeviceId: 'mobile-device-1',
        sessionId: 'session-abc',
        payload,
        messageCounter: 1,
        timestamp: new Date().toISOString(),
      };

      // Mobile decrypts
      const plaintext = e2eeManager.decryptMessage(encryptedMsg, 'cli-device-1');
      expect(plaintext).toBe('Hello from CLI!');
    });

    it('should reject replayed messages', () => {
      const payload = encrypt('test', sharedKey);
      const msg = {
        senderDeviceId: 'cli-device-1',
        recipientDeviceId: 'mobile-device-1',
        sessionId: 'session-abc',
        payload,
        messageCounter: 1,
        timestamp: new Date().toISOString(),
      };

      // First receive succeeds
      e2eeManager.decryptMessage(msg, 'cli-device-1');

      // Replay should fail
      expect(() => {
        e2eeManager.decryptMessage(msg, 'cli-device-1');
      }).toThrow('Replay attack detected');
    });

    it('should handle incoming encrypted_message event from WebSocket', () => {
      const callback = jest.fn();
      wsService.on('encrypted_message', callback);

      const payload = encrypt('test message', sharedKey);
      const encryptedMsg = {
        senderDeviceId: 'cli-device-1',
        recipientDeviceId: 'mobile-device-1',
        sessionId: 'session-abc',
        payload,
        messageCounter: 1,
        timestamp: new Date().toISOString(),
      };

      mockSocket.simulateEvent('encrypted_message', encryptedMsg);

      expect(callback).toHaveBeenCalledWith(encryptedMsg);

      // Decrypt the received message
      const plaintext = e2eeManager.decryptMessage(
        callback.mock.calls[0][0],
        'cli-device-1'
      );
      expect(plaintext).toBe('test message');
    });
  });

  describe('E2EE Store integration', () => {
    it('should update store session status during key exchange', () => {
      const store = useE2EEStore.getState();

      // Set initiating status
      store.setSessionStatus('cli-device-1', 'initiating');
      expect(useE2EEStore.getState().encryptedSessions['cli-device-1']).toBe('initiating');

      // Complete key exchange
      const cliKeyPair = generateKeyPair();
      e2eeManager.handleKeyExchangeInit({
        senderDeviceId: 'cli-device-1',
        ephemeralPublicKey: cliKeyPair.publicKey,
      });

      // Update store to established
      store.setSessionStatus('cli-device-1', 'established');
      expect(useE2EEStore.getState().isSessionEncrypted('cli-device-1')).toBe(true);
    });

    it('should update store when session fails', () => {
      const store = useE2EEStore.getState();
      store.setSessionStatus('cli-device-1', 'failed');
      expect(useE2EEStore.getState().encryptedSessions['cli-device-1']).toBe('failed');
      expect(useE2EEStore.getState().isSessionEncrypted('cli-device-1')).toBe(false);
    });

    it('should clear sessions when disconnected', () => {
      const store = useE2EEStore.getState();
      store.setSessionStatus('cli-device-1', 'established');
      store.setSessionStatus('cli-device-2', 'established');

      // Simulate disconnect: clear sessions
      store.clearEncryptedSessions();
      e2eeManager.clearAllSessions();

      expect(useE2EEStore.getState().encryptedSessions).toEqual({});
      expect(e2eeManager.isSessionEstablished('cli-device-1')).toBe(false);
      expect(e2eeManager.isSessionEstablished('cli-device-2')).toBe(false);
    });

    it('should track e2eeEnabled flag', () => {
      const store = useE2EEStore.getState();
      expect(store.e2eeEnabled).toBe(false);

      store.setE2EEEnabled(true);
      expect(useE2EEStore.getState().e2eeEnabled).toBe(true);
    });
  });

  describe('E2EE fallback behavior', () => {
    it('should allow plaintext when E2EE is disabled', () => {
      const store = useE2EEStore.getState();
      store.setE2EEEnabled(false);

      // When E2EE is disabled, sendUserMessage should work normally (plaintext)
      wsService.emit('user_message', {
        deviceId: 'device-1',
        message: 'plaintext message',
      });

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'user_message',
        expect.objectContaining({ message: 'plaintext message' })
      );
    });

    it('should allow plaintext when session not established', () => {
      const store = useE2EEStore.getState();
      store.setE2EEEnabled(true);

      // No session established, so encryption would fail
      expect(e2eeManager.isSessionEstablished('unknown-device')).toBe(false);

      // Fallback to plaintext should still be possible
      wsService.emit('user_message', {
        deviceId: 'unknown-device',
        message: 'fallback message',
      });

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'user_message',
        expect.objectContaining({ message: 'fallback message' })
      );
    });
  });

  describe('End-to-end encrypted message round trip', () => {
    it('should encrypt, send, receive, and decrypt a message correctly', () => {
      // Setup: Mobile and CLI do key exchange
      const mobileInit = e2eeManager.createKeyExchangeInit('cli-device-1');

      // CLI generates its ephemeral key pair
      const cliEphemeral = generateKeyPair();

      // CLI computes shared key (using its private + mobile's public)
      const cliSharedKey = computeSharedKey(
        cliEphemeral.privateKey,
        mobileInit.ephemeralPublicKey
      );

      // Mobile completes exchange (using CLI's public key)
      e2eeManager.handleKeyExchangeAck({
        recipientDeviceId: 'cli-device-1',
        ephemeralPublicKey: cliEphemeral.publicKey,
      });

      // 1. Mobile encrypts a message
      const encrypted = e2eeManager.encryptMessage(
        'Hello CLI, this is encrypted!',
        'cli-device-1',
        'session-1'
      );

      // 2. Mobile sends via WebSocket
      wsService.emit('encrypted_message', encrypted);

      // 3. Verify it was emitted (not plaintext)
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'encrypted_message',
        expect.objectContaining({
          payload: expect.objectContaining({
            ciphertext: expect.any(String),
            nonce: expect.any(String),
          }),
        })
      );

      // 4. Verify ciphertext is NOT the plaintext
      const emittedPayload = mockSocket.emit.mock.calls.find(
        (c: [string, ...unknown[]]) => c[0] === 'encrypted_message'
      )?.[1] as { payload: { ciphertext: string; nonce: string } };
      expect(emittedPayload.payload.ciphertext).not.toBe('Hello CLI, this is encrypted!');

      // 5. CLI side decrypts (simulated - using shared key directly)
      const { decrypt: decryptFn } = require('@/services/crypto/encryption');
      const decrypted = decryptFn(emittedPayload.payload, cliSharedKey);
      expect(decrypted).toBe('Hello CLI, this is encrypted!');
    });
  });
});
