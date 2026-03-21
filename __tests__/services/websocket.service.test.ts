/**
 * Tests for WebSocketService
 *
 * Tests the WebSocket service, specifically focusing on
 * claude_approval_request event handling and respondToClaudeApproval method.
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
  // Helper to simulate receiving an event
  simulateEvent: (event: string, data: unknown) => {
    const handlers = socketHandlers.get(event) || [];
    handlers.forEach(h => h(data));
  },
};

// Mock socket.io-client before importing the service
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
    getRelayUrl: jest.fn().mockResolvedValue(null),
    getRelayToken: jest.fn().mockResolvedValue(null),
  },
}));

// Import after mocks are set up
import { wsService } from '@/services/websocket.service';

// Get the mocked io function
const { io: mockIo } = jest.requireMock('socket.io-client');

describe('WebSocketService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset socket connected state
    mockSocket.connected = false;
  });

  describe('claude_approval_request event handling', () => {
    it('should register listener for claude_approval_request event', async () => {
      // Connect to trigger setup
      await wsService.connect();

      // Verify socket.on was called with claude_approval_request
      const onCalls = mockSocket.on.mock.calls;
      const approvalRequestHandler = onCalls.find(
        (call) => call[0] === 'claude_approval_request'
      );

      expect(approvalRequestHandler).toBeDefined();
    });

    it('should emit event to internal subscribers when claude_approval_request is received', async () => {
      await wsService.connect();

      // Register internal subscriber
      const mockCallback = jest.fn();
      wsService.on('claude_approval_request', mockCallback);

      // Simulate receiving event using the helper
      const eventData = {
        approvalId: 'approval-123',
        terminalSessionId: 'terminal-abc',
        sessionKey: 'session-xyz',
        deviceId: 'device-456',
        context: ['Previous line 1', 'Previous line 2'],
        options: ['y:yes', 'n:no', 'p:plan'],
        promptText: 'Do you want to proceed?',
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      mockSocket.simulateEvent('claude_approval_request', eventData);

      expect(mockCallback).toHaveBeenCalledWith(eventData);
    });

    it('should allow multiple subscribers for claude_approval_request', async () => {
      await wsService.connect();

      const callback1 = jest.fn();
      const callback2 = jest.fn();

      wsService.on('claude_approval_request', callback1);
      wsService.on('claude_approval_request', callback2);

      // Simulate event using the helper
      const eventData = {
        approvalId: 'approval-123',
        terminalSessionId: 'terminal-abc',
        context: [],
        options: ['y:yes'],
        promptText: 'Continue?',
        timestamp: new Date().toISOString(),
      };

      mockSocket.simulateEvent('claude_approval_request', eventData);

      expect(callback1).toHaveBeenCalledWith(eventData);
      expect(callback2).toHaveBeenCalledWith(eventData);
    });

    it('should return unsubscribe function from on()', async () => {
      await wsService.connect();

      const callback = jest.fn();
      const unsubscribe = wsService.on('claude_approval_request', callback);

      expect(typeof unsubscribe).toBe('function');

      // Unsubscribe
      unsubscribe();

      // Simulate event after unsubscribe
      mockSocket.simulateEvent('claude_approval_request', { approvalId: 'test' });

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('respondToClaudeApproval', () => {
    beforeEach(async () => {
      mockSocket.connected = true;
      await wsService.connect();
      // Clear internal e2eeManager so sensitive events fall through to plaintext
      // (this test validates data formatting, not E2EE enforcement)
      (wsService as any).e2eeManager = null;
    });

    it('should emit claude_approval_response event with correct data', () => {
      wsService.respondToClaudeApproval('approval-123', 'y', {
        deviceId: 'device-456',
        sessionKey: 'session-xyz',
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('claude_approval_response', {
        approvalId: 'approval-123',
        response: 'y',
        deviceId: 'device-456',
        sessionKey: 'session-xyz',
      });
    });

    it('should emit response with "n" (no) response', () => {
      wsService.respondToClaudeApproval('approval-456', 'n', {
        deviceId: 'device-789',
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('claude_approval_response', {
        approvalId: 'approval-456',
        response: 'n',
        deviceId: 'device-789',
        sessionKey: undefined,
      });
    });

    it('should emit response with "p" (plan) response', () => {
      wsService.respondToClaudeApproval('approval-789', 'p');

      expect(mockSocket.emit).toHaveBeenCalledWith('claude_approval_response', {
        approvalId: 'approval-789',
        response: 'p',
        deviceId: undefined,
        sessionKey: undefined,
      });
    });

    it('should handle optional options parameter', () => {
      wsService.respondToClaudeApproval('approval-abc', 'y');

      expect(mockSocket.emit).toHaveBeenCalledWith('claude_approval_response', {
        approvalId: 'approval-abc',
        response: 'y',
        deviceId: undefined,
        sessionKey: undefined,
      });
    });

    it('should handle partial options (only deviceId)', () => {
      wsService.respondToClaudeApproval('approval-def', 'n', {
        deviceId: 'device-only',
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('claude_approval_response', {
        approvalId: 'approval-def',
        response: 'n',
        deviceId: 'device-only',
        sessionKey: undefined,
      });
    });

    it('should handle partial options (only sessionKey)', () => {
      wsService.respondToClaudeApproval('approval-ghi', 'p', {
        sessionKey: 'session-only',
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('claude_approval_response', {
        approvalId: 'approval-ghi',
        response: 'p',
        deviceId: undefined,
        sessionKey: 'session-only',
      });
    });
  });

  describe('on/off subscription management', () => {
    it('should add callback to subscribers', async () => {
      await wsService.connect();

      const callback = jest.fn();
      wsService.on('claude_approval_request', callback);

      // Trigger event using simulateEvent
      mockSocket.simulateEvent('claude_approval_request', { approvalId: 'test' });

      expect(callback).toHaveBeenCalled();
    });

    it('should remove callback with off()', async () => {
      await wsService.connect();

      const callback = jest.fn();
      wsService.on('claude_approval_request', callback);
      wsService.off('claude_approval_request', callback);

      // Trigger event using simulateEvent
      mockSocket.simulateEvent('claude_approval_request', { approvalId: 'test' });

      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle errors in callbacks gracefully', async () => {
      await wsService.connect();

      const errorCallback = jest.fn(() => {
        throw new Error('Callback error');
      });
      const successCallback = jest.fn();

      wsService.on('claude_approval_request', errorCallback);
      wsService.on('claude_approval_request', successCallback);

      // Should not throw and should continue to other callbacks
      expect(() => {
        mockSocket.simulateEvent('claude_approval_request', { approvalId: 'test' });
      }).not.toThrow();

      expect(successCallback).toHaveBeenCalled();
    });
  });

  describe('emit method', () => {
    it('should call socket.emit with event name and data', async () => {
      mockSocket.connected = true;
      await wsService.connect();

      wsService.emit('test_event', { key: 'value' });

      expect(mockSocket.emit).toHaveBeenCalledWith('test_event', { key: 'value' });
    });
  });

  describe('isConnected property', () => {
    it('should return false when socket is not connected', () => {
      mockSocket.connected = false;
      expect(wsService.isConnected).toBe(false);
    });

    it('should return true when socket is connected', async () => {
      mockSocket.connected = true;
      await wsService.connect();
      expect(wsService.isConnected).toBe(true);
    });
  });
});
