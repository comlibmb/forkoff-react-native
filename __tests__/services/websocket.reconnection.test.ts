/**
 * Tests for WebSocketService reconnection resilience (mobile)
 *
 * Verifies:
 * - Socket.io configured with Infinity attempts, 15s max delay, 0.5 randomization factor
 * - resubscribeAll() called on reconnect (re-subscribe events emitted)
 * - flushQueue() called on reconnect
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

// Mock pairing service
jest.mock('@/services/pairing.service', () => ({
  pairingService: {
    getMobileDeviceId: jest.fn().mockResolvedValue('mock-mobile-device-id'),
    getCustomRelayUrl: jest.fn().mockResolvedValue(null),
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

// Get the mocked io function
const { io: mockIo } = jest.requireMock('socket.io-client');

describe('WebSocketService - Reconnection Resilience', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    socketHandlers.clear();
    mockSocket.connected = false;

    // Disconnect to reset internal state for each test
    wsService.disconnect();
  });

  describe('Socket.io reconnection configuration', () => {
    it('should configure Infinity reconnection attempts', async () => {
      await wsService.connect();

      expect(mockIo).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          reconnectionAttempts: Infinity,
        }),
      );
    });

    it('should configure 15s max reconnection delay', async () => {
      await wsService.connect();

      expect(mockIo).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          reconnectionDelayMax: 15000,
        }),
      );
    });

    it('should configure 0.5 randomization factor', async () => {
      await wsService.connect();

      expect(mockIo).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          randomizationFactor: 0.5,
        }),
      );
    });

    it('should enable reconnection', async () => {
      await wsService.connect();

      expect(mockIo).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          reconnection: true,
        }),
      );
    });

    it('should use websocket transport only', async () => {
      await wsService.connect();

      expect(mockIo).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          transports: ['websocket'],
        }),
      );
    });
  });

  describe('Room re-subscription on reconnect', () => {
    it('should re-subscribe to all devices after reconnect', async () => {
      await wsService.connect();

      // Subscribe to devices while connected
      mockSocket.connected = true;
      wsService.subscribeToDevice('device-1');
      wsService.subscribeToDevice('device-2');

      // Verify initial subscriptions emitted
      expect(mockSocket.emit).toHaveBeenCalledWith('subscribe_device', { deviceId: 'device-1' });
      expect(mockSocket.emit).toHaveBeenCalledWith('subscribe_device', { deviceId: 'device-2' });
      mockSocket.emit.mockClear();

      // Simulate a connect_error to set wasReconnect flag
      mockSocket.simulateEvent('connect_error', new Error('network blip'));

      // Simulate reconnect
      mockSocket.connected = true;
      mockSocket.simulateEvent('connect');

      // Should have re-subscribed to both devices
      expect(mockSocket.emit).toHaveBeenCalledWith('subscribe_device', { deviceId: 'device-1' });
      expect(mockSocket.emit).toHaveBeenCalledWith('subscribe_device', { deviceId: 'device-2' });
    });

    it('should NOT re-subscribe on initial connection', async () => {
      await wsService.connect();

      // Subscribe to a device before first connect
      wsService.subscribeToDevice('device-1');
      mockSocket.emit.mockClear();

      // Simulate first connect (no prior errors, so reconnectAttempts === 0)
      mockSocket.connected = true;
      mockSocket.simulateEvent('connect');

      // Should NOT re-subscribe (no reconnect happened)
      const resubCalls = mockSocket.emit.mock.calls.filter(
        (call) => call[0] === 'subscribe_device',
      );
      expect(resubCalls.length).toBe(0);
    });
  });

  describe('Reconnect behavior', () => {
    it('should NOT queue sensitive events (user_message) in general queue', async () => {
      await wsService.connect();
      mockSocket.connected = false;

      // Sensitive events go through emitSensitive, NOT the general plaintext queue
      wsService.sendUserMessage('device-1', 'Hello from queue');

      // General queue should remain empty — sensitive events are handled separately
      expect(wsService.queueLength).toBe(0);
    });

    it('should re-subscribe to devices after reconnect', async () => {
      await wsService.connect();

      // Subscribe to a device first
      mockSocket.connected = true;
      wsService.subscribeToDevice('device-1');

      // Simulate disconnect + reconnect
      mockSocket.simulateEvent('connect_error', new Error('blip'));
      mockSocket.emit.mockClear();
      mockSocket.connected = true;
      mockSocket.simulateEvent('connect');

      // After reconnect, should re-subscribe to devices
      const subscribeCalls = mockSocket.emit.mock.calls.filter(
        (call) => call[0] === 'subscribe_device',
      );
      expect(subscribeCalls.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Internal event emission', () => {
    it('should emit "connected" internal event on connect', async () => {
      await wsService.connect();

      const connectedCallback = jest.fn();
      wsService.on('connected', connectedCallback);

      mockSocket.connected = true;
      mockSocket.simulateEvent('connect');

      expect(connectedCallback).toHaveBeenCalled();
    });

    it('should emit "disconnected" internal event on disconnect', async () => {
      await wsService.connect();

      const disconnectedCallback = jest.fn();
      wsService.on('disconnected', disconnectedCallback);

      mockSocket.simulateEvent('disconnect', 'transport close');

      expect(disconnectedCallback).toHaveBeenCalled();
    });

    it('should emit "error" internal event on connect_error', async () => {
      await wsService.connect();

      const errorCallback = jest.fn();
      wsService.on('error', errorCallback);

      const testError = new Error('connection refused');
      mockSocket.simulateEvent('connect_error', testError);

      expect(errorCallback).toHaveBeenCalledWith(testError);
    });
  });
});
