/**
 * TDD Tests for WebSocket E2EE Integration
 * Tests the bridge between E2EEManager, WebSocket service, and E2EE store.
 * Updated for signed key exchange (Ed25519 identity signatures + TOFU).
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

// Mock pairing service
jest.mock('@/services/pairing.service', () => ({
  pairingService: {
    getMobileDeviceId: jest.fn().mockResolvedValue('mock-mobile-device-id'),
    getCustomRelayUrl: jest.fn().mockResolvedValue(null),
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

/**
 * Helper: perform a full signed key exchange between two initialized managers.
 */
async function performKeyExchange(
  initiator: E2EEManager,
  responder: E2EEManager,
): Promise<void> {
  const init = initiator.createKeyExchangeInit(
    (responder as any).deviceId || 'responder',
  );
  const ack = await responder.handleKeyExchangeInit(init);
  await initiator.handleKeyExchangeAck(ack);
}

describe('WebSocket E2EE Integration', () => {
  let e2eeManager: E2EEManager;

  beforeEach(async () => {
    // Clear emit mock to track fresh calls per test
    mockSocket.emit.mockClear();
    useE2EEStore.getState().reset();

    e2eeManager = new E2EEManager('mobile-device-1');
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
        identityPublicKey: generateKeyPair().publicKey,
        signature: 'mock-signature',
      };

      mockSocket.simulateEvent('encrypted_key_exchange_init', initData);
      expect(callback).toHaveBeenCalledWith(initData);
    });

    it('should forward encrypted_key_exchange_ack to subscribers', async () => {
      const callback = jest.fn();
      wsService.on('encrypted_key_exchange_ack', callback);

      const ackData = {
        senderDeviceId: 'cli-device-1',
        recipientDeviceId: 'mobile-device-1',
        ephemeralPublicKey: generateKeyPair().publicKey,
        identityPublicKey: generateKeyPair().publicKey,
        signature: 'mock-signature',
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
      const init = e2eeManager.createKeyExchangeInit('cli-device-1');

      wsService.emit('encrypted_key_exchange_init', init);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'encrypted_key_exchange_init',
        expect.objectContaining({
          senderDeviceId: 'mobile-device-1',
          ephemeralPublicKey: init.ephemeralPublicKey,
          identityPublicKey: expect.any(String),
          signature: expect.any(String),
        })
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

  describe('E2EE Manager + WebSocket full signed key exchange flow', () => {
    it('should complete key exchange between two managers with signatures', async () => {
      // Create a CLI-side manager
      const cliManager = new E2EEManager('cli-device-1');
      await cliManager.initialize();

      // Mobile creates init with signature
      const init = e2eeManager.createKeyExchangeInit('cli-device-1');
      expect(init.ephemeralPublicKey).toBeDefined();
      expect(init.identityPublicKey).toBeDefined();
      expect(init.signature).toBeDefined();

      // Mobile would send init via WebSocket
      wsService.emit('encrypted_key_exchange_init', init);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'encrypted_key_exchange_init',
        expect.objectContaining({
          senderDeviceId: 'mobile-device-1',
          identityPublicKey: expect.any(String),
          signature: expect.any(String),
        })
      );

      // CLI handles init, returns signed ack
      const ack = await cliManager.handleKeyExchangeInit(init);
      expect(ack.identityPublicKey).toBeDefined();
      expect(ack.signature).toBeDefined();

      // Mobile handles ack, completing the exchange
      await e2eeManager.handleKeyExchangeAck(ack);

      // Both sides should have established sessions
      expect(e2eeManager.isSessionEstablished('cli-device-1')).toBe(true);
      expect(cliManager.isSessionEstablished('mobile-device-1')).toBe(true);
    });

    it('should reject unsigned key exchange init', async () => {
      const unsignedInit = {
        senderDeviceId: 'attacker',
        ephemeralPublicKey: generateKeyPair().publicKey,
        // No identityPublicKey or signature
      };

      await expect(e2eeManager.handleKeyExchangeInit(unsignedInit)).rejects.toThrow(/UNSIGNED/);
    });
  });

  describe('Encrypted message sending over WebSocket', () => {
    let cliManager: E2EEManager;

    beforeEach(async () => {
      // Establish a session using full signed key exchange
      cliManager = new E2EEManager('cli-device-1');
      await cliManager.initialize();
      await performKeyExchange(e2eeManager, cliManager);
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
    let cliManager: E2EEManager;

    beforeEach(async () => {
      // Set up a matching session using full signed key exchange
      cliManager = new E2EEManager('cli-device-1');
      await cliManager.initialize();
      await performKeyExchange(e2eeManager, cliManager);
    });

    it('should decrypt an incoming encrypted message', () => {
      // CLI encrypts a message
      const encrypted = cliManager.encryptMessage(
        'Hello from CLI!',
        'mobile-device-1',
        'session-abc'
      );

      // Mobile decrypts
      const plaintext = e2eeManager.decryptMessage(encrypted, 'cli-device-1');
      expect(plaintext).toBe('Hello from CLI!');
    });

    it('should reject replayed messages', () => {
      const encrypted = cliManager.encryptMessage(
        'test',
        'mobile-device-1',
        'session-abc'
      );

      // First receive succeeds
      e2eeManager.decryptMessage(encrypted, 'cli-device-1');

      // Replay should fail
      expect(() => {
        e2eeManager.decryptMessage(encrypted, 'cli-device-1');
      }).toThrow('Replay attack detected');
    });

    it('should handle incoming encrypted_message event from WebSocket', () => {
      const callback = jest.fn();
      wsService.on('encrypted_message', callback);

      // CLI encrypts
      const encrypted = cliManager.encryptMessage(
        'test message',
        'mobile-device-1',
        'session-abc'
      );

      mockSocket.simulateEvent('encrypted_message', encrypted);

      expect(callback).toHaveBeenCalledWith(encrypted);

      // Decrypt the received message
      const plaintext = e2eeManager.decryptMessage(
        callback.mock.calls[0][0],
        'cli-device-1'
      );
      expect(plaintext).toBe('test message');
    });
  });

  describe('E2EE Store integration', () => {
    it('should update store session status during key exchange', async () => {
      const store = useE2EEStore.getState();
      const cliManager = new E2EEManager('cli-device-1');
      await cliManager.initialize();

      // Set initiating status
      store.setSessionStatus('cli-device-1', 'initiating');
      expect(useE2EEStore.getState().encryptedSessions['cli-device-1']).toBe('initiating');

      // Complete signed key exchange
      await performKeyExchange(e2eeManager, cliManager);

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

    it('should clear sessions when disconnected', async () => {
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

  describe('E2EE enforcement behavior', () => {
    it('should REFUSE plaintext for sensitive events when E2EE is disabled', () => {
      const store = useE2EEStore.getState();
      store.setE2EEEnabled(false);

      mockSocket.emit.mockClear();

      // user_message is in ENFORCED_SENSITIVE_EVENTS — emit() routes through emitSensitive()
      // Without E2EE, it should be DROPPED, not sent in plaintext
      wsService.emit('user_message', {
        deviceId: 'device-1',
        message: 'plaintext message',
      });

      const userMsgCalls = mockSocket.emit.mock.calls.filter(
        (call) => call[0] === 'user_message',
      );
      expect(userMsgCalls.length).toBe(0);
    });

    it('should REFUSE plaintext for sensitive events when session not established', () => {
      const store = useE2EEStore.getState();
      store.setE2EEEnabled(true);

      expect(e2eeManager.isSessionEstablished('unknown-device')).toBe(false);

      mockSocket.emit.mockClear();

      // Without an established session, sensitive events should be DROPPED/QUEUED
      wsService.emit('user_message', {
        deviceId: 'unknown-device',
        message: 'fallback message',
      });

      const userMsgCalls = mockSocket.emit.mock.calls.filter(
        (call) => call[0] === 'user_message',
      );
      expect(userMsgCalls.length).toBe(0);
    });

    it('should allow plaintext for non-sensitive events', () => {
      mockSocket.emit.mockClear();

      // Non-sensitive events (subscribe_device, etc.) can still be sent in plaintext
      wsService.emit('subscribe_device', { deviceId: 'device-1' });

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'subscribe_device',
        expect.objectContaining({ deviceId: 'device-1' })
      );
    });
  });

  describe('End-to-end encrypted message round trip', () => {
    it('should encrypt, send, receive, and decrypt a message correctly', async () => {
      // Setup: Mobile and CLI do full signed key exchange
      const cliManager = new E2EEManager('cli-device-1');
      await cliManager.initialize();
      await performKeyExchange(e2eeManager, cliManager);

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

      // 5. CLI side decrypts using its E2EE manager
      const decrypted = cliManager.decryptMessage(encrypted, 'mobile-device-1');
      expect(decrypted).toBe('Hello CLI, this is encrypted!');
    });
  });
});
