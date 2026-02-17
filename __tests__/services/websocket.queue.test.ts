/**
 * Tests for WebSocketService message queue (offline buffering)
 *
 * Verifies:
 * - emitOrQueue sends immediately when connected
 * - emitOrQueue queues when disconnected
 * - Queue capped at 50 messages
 * - Queue flushed on reconnect
 * - Stale messages (>2min) dropped during flush
 * - Critical methods (sendUserMessage, respondToPermissionPrompt, respondToClaudeApproval) all queue
 */

// Store handlers that are registered with socket.on
const socketHandlers: Map<string, Function[]> = new Map();

// Create mock socket that will be shared
const mockSocket = {
  connected: false,
  id: 'mock-socket-id',
  on: jest.fn((event: string, handler: Function) => {
    if (!socketHandlers.has(event)) {
      socketHandlers.set(event, []);
    }
    socketHandlers.get(event)!.push(handler);
    return mockSocket;
  }),
  off: jest.fn((event: string, handler: Function) => {
    if (socketHandlers.has(event)) {
      const handlers = socketHandlers.get(event)!;
      const idx = handlers.indexOf(handler);
      if (idx >= 0) handlers.splice(idx, 1);
    }
    return mockSocket;
  }),
  emit: jest.fn(),
  disconnect: jest.fn(),
  simulateEvent: (event: string, data?: unknown) => {
    const handlers = socketHandlers.get(event) || [];
    handlers.forEach((h) => h(data));
  },
};

// Mock socket.io-client before importing the service
jest.mock('socket.io-client', () => ({
  __esModule: true,
  io: jest.fn(() => mockSocket),
  default: jest.fn(() => mockSocket),
  Socket: class MockSocket {},
}));

// Mock auth service
jest.mock('@/services/auth.service', () => ({
  authService: {
    getAccessToken: jest.fn().mockResolvedValue('mock-access-token'),
  },
}));

// Mock sentry service
jest.mock('@/services/sentry.service', () => ({
  sentryService: {
    captureException: jest.fn(),
    addBreadcrumb: jest.fn(),
  },
}));

// Mock analytics service
jest.mock('@/services/analytics.service', () => ({
  analyticsService: {
    track: jest.fn(),
  },
}));

// Import after mocks are set up
import { wsService } from '@/services/websocket.service';

describe('WebSocketService - Message Queue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    socketHandlers.clear();
    mockSocket.connected = false;

    // Disconnect to reset internal state
    wsService.disconnect();
  });

  describe('emitOrQueue behavior via sendUserMessage', () => {
    it('should send immediately when connected', async () => {
      await wsService.connect();
      mockSocket.connected = true;
      mockSocket.emit.mockClear();

      wsService.sendUserMessage('device-1', 'Hello');

      // Should emit directly through socket
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'user_message',
        expect.objectContaining({
          deviceId: 'device-1',
          message: 'Hello',
        }),
      );

      // Queue should be empty
      expect(wsService.queueLength).toBe(0);
    });

    it('should queue when disconnected', async () => {
      await wsService.connect();
      mockSocket.connected = false;
      mockSocket.emit.mockClear();

      wsService.sendUserMessage('device-1', 'Queued message');

      // Should NOT have emitted via socket
      const userMessageCalls = mockSocket.emit.mock.calls.filter(
        (call) => call[0] === 'user_message',
      );
      expect(userMessageCalls.length).toBe(0);

      // Queue should have the message
      expect(wsService.queueLength).toBe(1);
    });
  });

  describe('Queue capacity', () => {
    it('should cap queue at 50 messages', async () => {
      await wsService.connect();
      mockSocket.connected = false;

      // Fill 51 messages
      for (let i = 0; i < 51; i++) {
        wsService.sendUserMessage('device-1', `Message ${i}`);
      }

      // Queue should be capped at 50 (oldest dropped)
      expect(wsService.queueLength).toBe(50);
    });

    it('should drop oldest messages when queue is full', async () => {
      await wsService.connect();
      mockSocket.connected = false;

      // Fill exactly 50 messages
      for (let i = 0; i < 50; i++) {
        wsService.sendUserMessage('device-1', `Message ${i}`);
      }
      expect(wsService.queueLength).toBe(50);

      // Add one more — oldest should be dropped
      wsService.sendUserMessage('device-1', 'Message 50 (newest)');
      expect(wsService.queueLength).toBe(50);
    });
  });

  describe('Queue flush on reconnect', () => {
    it('should flush queued messages when reconnecting', async () => {
      await wsService.connect();
      mockSocket.connected = false;

      // Queue messages while disconnected
      wsService.sendUserMessage('device-1', 'Queued 1');
      wsService.sendUserMessage('device-2', 'Queued 2');
      expect(wsService.queueLength).toBe(2);

      // Simulate a connect_error to set wasReconnect flag
      mockSocket.simulateEvent('connect_error', new Error('blip'));

      // Simulate reconnect
      mockSocket.connected = true;
      mockSocket.emit.mockClear();
      mockSocket.simulateEvent('connect');

      // Messages should have been flushed through socket.emit
      const userMessageCalls = mockSocket.emit.mock.calls.filter(
        (call) => call[0] === 'user_message',
      );
      expect(userMessageCalls.length).toBe(2);

      // Queue should be empty
      expect(wsService.queueLength).toBe(0);
    });

    it('should drop stale messages (>2 min old) during flush', async () => {
      await wsService.connect();
      mockSocket.connected = false;

      const realDateNow = Date.now;

      // Queue a message at current time
      const baseTime = 1700000000000;
      Date.now = jest.fn(() => baseTime);
      wsService.sendUserMessage('device-1', 'Old message');

      // Queue a fresh message 3 minutes later
      Date.now = jest.fn(() => baseTime + 3 * 60 * 1000); // 3 minutes later
      wsService.sendUserMessage('device-1', 'Fresh message');

      expect(wsService.queueLength).toBe(2);

      // Simulate a connect_error to set wasReconnect flag
      mockSocket.simulateEvent('connect_error', new Error('blip'));

      // Simulate reconnect at the later time (3 min after first message)
      mockSocket.connected = true;
      mockSocket.emit.mockClear();
      mockSocket.simulateEvent('connect');

      // Only the fresh message should have been flushed (old one is >2min stale)
      const userMessageCalls = mockSocket.emit.mock.calls.filter(
        (call) => call[0] === 'user_message',
      );
      expect(userMessageCalls.length).toBe(1);
      expect(userMessageCalls[0][1]).toEqual(
        expect.objectContaining({ message: 'Fresh message' }),
      );

      // Queue should be empty after flush
      expect(wsService.queueLength).toBe(0);

      // Restore Date.now
      Date.now = realDateNow;
    });
  });

  describe('Critical methods use emitOrQueue', () => {
    it('sendUserMessage queues when disconnected', async () => {
      await wsService.connect();
      mockSocket.connected = false;
      mockSocket.emit.mockClear();

      wsService.sendUserMessage('device-1', 'Test message');

      expect(wsService.queueLength).toBe(1);
      const userMsgCalls = mockSocket.emit.mock.calls.filter((c) => c[0] === 'user_message');
      expect(userMsgCalls.length).toBe(0);
    });

    it('respondToPermissionPrompt queues when disconnected', async () => {
      await wsService.connect();
      mockSocket.connected = false;
      mockSocket.emit.mockClear();

      wsService.respondToPermissionPrompt('prompt-123', 'allow', {
        deviceId: 'device-1',
        sessionKey: 'session-abc',
      });

      expect(wsService.queueLength).toBe(1);
      const permCalls = mockSocket.emit.mock.calls.filter((c) => c[0] === 'permission_response');
      expect(permCalls.length).toBe(0);
    });

    it('respondToClaudeApproval queues when disconnected', async () => {
      await wsService.connect();
      mockSocket.connected = false;
      mockSocket.emit.mockClear();

      wsService.respondToClaudeApproval('approval-456', 'y', {
        deviceId: 'device-1',
        sessionKey: 'session-xyz',
      });

      expect(wsService.queueLength).toBe(1);
      const approvalCalls = mockSocket.emit.mock.calls.filter(
        (c) => c[0] === 'claude_approval_response',
      );
      expect(approvalCalls.length).toBe(0);
    });

    it('sendUserMessage sends immediately when connected', async () => {
      await wsService.connect();
      mockSocket.connected = true;
      mockSocket.emit.mockClear();

      wsService.sendUserMessage('device-1', 'Direct message');

      expect(wsService.queueLength).toBe(0);
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'user_message',
        expect.objectContaining({ message: 'Direct message' }),
      );
    });

    it('respondToPermissionPrompt sends immediately when connected', async () => {
      await wsService.connect();
      mockSocket.connected = true;
      mockSocket.emit.mockClear();

      wsService.respondToPermissionPrompt('prompt-789', 'deny');

      expect(wsService.queueLength).toBe(0);
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'permission_response',
        expect.objectContaining({ promptId: 'prompt-789', decision: 'deny' }),
      );
    });

    it('respondToClaudeApproval sends immediately when connected', async () => {
      await wsService.connect();
      mockSocket.connected = true;
      mockSocket.emit.mockClear();

      wsService.respondToClaudeApproval('approval-abc', 'n');

      expect(wsService.queueLength).toBe(0);
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'claude_approval_response',
        expect.objectContaining({ approvalId: 'approval-abc', response: 'n' }),
      );
    });
  });

  describe('Multiple queued messages flushed in order', () => {
    it('should flush messages in FIFO order', async () => {
      await wsService.connect();
      mockSocket.connected = false;

      wsService.sendUserMessage('device-1', 'First');
      wsService.sendUserMessage('device-1', 'Second');
      wsService.sendUserMessage('device-1', 'Third');

      expect(wsService.queueLength).toBe(3);

      // Simulate reconnect
      mockSocket.simulateEvent('connect_error', new Error('blip'));
      mockSocket.connected = true;
      mockSocket.emit.mockClear();
      mockSocket.simulateEvent('connect');

      const userMessageCalls = mockSocket.emit.mock.calls.filter(
        (call) => call[0] === 'user_message',
      );
      expect(userMessageCalls.length).toBe(3);
      expect(userMessageCalls[0][1].message).toBe('First');
      expect(userMessageCalls[1][1].message).toBe('Second');
      expect(userMessageCalls[2][1].message).toBe('Third');
    });
  });
});
