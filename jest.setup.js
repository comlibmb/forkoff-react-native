// Jest setup file for React Native / Expo testing

// Clear the TextDecoderStream/TextEncoderStream which expo tries to set
// This prevents the "import outside scope" error
if (typeof globalThis !== 'undefined') {
  Object.defineProperty(globalThis, 'TextDecoderStream', { value: undefined, configurable: true });
  Object.defineProperty(globalThis, 'TextEncoderStream', { value: undefined, configurable: true });
}

// Mock socket.io-client
const mockSocket = {
  connected: false,
  on: jest.fn((event, callback) => {
    // Store callbacks for manual triggering in tests
    if (!mockSocket._callbacks[event]) {
      mockSocket._callbacks[event] = [];
    }
    mockSocket._callbacks[event].push(callback);
    return mockSocket;
  }),
  off: jest.fn((event, callback) => {
    if (mockSocket._callbacks[event]) {
      mockSocket._callbacks[event] = mockSocket._callbacks[event].filter(cb => cb !== callback);
    }
    return mockSocket;
  }),
  emit: jest.fn(),
  connect: jest.fn(() => {
    mockSocket.connected = true;
    return mockSocket;
  }),
  disconnect: jest.fn(() => {
    mockSocket.connected = false;
    return mockSocket;
  }),
  _callbacks: {},
  // Helper to trigger events in tests
  _emit: (event, data) => {
    if (mockSocket._callbacks[event]) {
      mockSocket._callbacks[event].forEach(cb => cb(data));
    }
  },
};

jest.mock('socket.io-client', () => ({
  __esModule: true,
  default: jest.fn(() => mockSocket),
  io: jest.fn(() => mockSocket),
}));

// Make mockSocket available globally for tests
global.mockSocket = mockSocket;

// Mock React Native modules that aren't available in the test environment
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper', () => ({
  API: {},
  addWhitelistedNativeProps: jest.fn(),
  addWhitelistedUIProps: jest.fn(),
  validateStyles: jest.fn(),
  connectToView: jest.fn(),
  disconnectFromView: jest.fn(),
  flattenStyle: jest.fn(),
}), { virtual: true });

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
}));

// Mock lucide-react-native icons
jest.mock('lucide-react-native', () => ({
  AlertTriangle: 'AlertTriangle',
  Check: 'Check',
  X: 'X',
  Terminal: 'Terminal',
  FileText: 'FileText',
  Edit3: 'Edit3',
  HelpCircle: 'HelpCircle',
}));

// Mock theme colors
jest.mock('@/theme/colors', () => ({
  colors: {
    primary: { 400: '#a78bfa', 600: '#7c3aed' },
    dark: { 400: '#484f58', 600: '#21262d' },
    warning: { 400: '#d29922', 600: '#9e6a03' },
    error: { 400: '#da3633', 600: '#a40e26' },
  },
}));

// Silence console.log in tests (uncomment if needed)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
// };

// Setup global mocks
global.__DEV__ = true;
