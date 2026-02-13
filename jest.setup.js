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

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
    multiGet: jest.fn(() => Promise.resolve([])),
    multiSet: jest.fn(() => Promise.resolve()),
    multiRemove: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
    getAllKeys: jest.fn(() => Promise.resolve([])),
  },
}));

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
  ArrowLeft: 'ArrowLeft',
  ArrowUp: 'ArrowUp',
  ArrowDown: 'ArrowDown',
  Brain: 'Brain',
  Check: 'Check',
  CheckCircle2: 'CheckCircle2',
  ChevronRight: 'ChevronRight',
  ChevronDown: 'ChevronDown',
  Circle: 'Circle',
  ClipboardList: 'ClipboardList',
  Code: 'Code',
  Edit3: 'Edit3',
  FileText: 'FileText',
  FilePlus: 'FilePlus',
  FolderSearch: 'FolderSearch',
  Globe: 'Globe',
  Hash: 'Hash',
  HelpCircle: 'HelpCircle',
  ListTodo: 'ListTodo',
  Loader: 'Loader',
  Map: 'Map',
  MessageSquare: 'MessageSquare',
  Pencil: 'Pencil',
  Plus: 'Plus',
  RotateCcw: 'RotateCcw',
  Search: 'Search',
  Shield: 'Shield',
  Terminal: 'Terminal',
  X: 'X',
  Zap: 'Zap',
}));

// Mock ThemeProvider's useTheme hook
jest.mock('@/theme/ThemeProvider', () => {
  const colors = {
    primary: { 50: '#f5f3ff', 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed' },
    dark: { 400: '#484f58', 600: '#21262d', 700: '#161b22', 800: '#0d1117' },
    warning: { 300: '#e3b341', 400: '#d29922', 500: '#bb8009', 600: '#9e6a03' },
    error: { 400: '#da3633', 500: '#cf222e', 600: '#a40e26' },
    success: { 300: '#56d364', 400: '#3fb950', 500: '#2ea043', 600: '#238636' },
    info: { 400: '#58a6ff', 500: '#388bfd', 600: '#1f6feb' },
  };
  return {
    __esModule: true,
    useTheme: () => ({
      theme: {
        background: '#0d1117',
        backgroundSecondary: '#161b22',
        backgroundTertiary: '#21262d',
        backgroundElevated: '#21262d',
        text: '#c9d1d9',
        textSecondary: '#8b949e',
        textTertiary: '#484f58',
        border: '#30363d',
        borderLight: '#21262d',
        card: '#161b22',
        cardBorder: '#30363d',
        primary: colors.primary[500],
        primaryLight: colors.primary[400],
        primaryDark: colors.primary[600],
        primaryBackground: colors.primary[50],
        success: colors.success[500],
        warning: colors.warning[400],
        error: colors.error[400],
        info: colors.info[500],
        switchTrackOff: '#30363d',
        switchThumb: '#c9d1d9',
        divider: '#21262d',
        overlay: 'rgba(0, 0, 0, 0.5)',
        skeleton: '#21262d',
      },
      isDark: true,
      toggleTheme: jest.fn(),
      colors,
    }),
    ThemeProvider: ({ children }) => children,
  };
});

// Mock theme colors
jest.mock('@/theme/colors', () => ({
  colors: {
    primary: { 50: '#f5f3ff', 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed' },
    dark: { 400: '#484f58', 600: '#21262d', 700: '#161b22', 800: '#0d1117' },
    warning: { 300: '#e3b341', 400: '#d29922', 500: '#bb8009', 600: '#9e6a03' },
    error: { 400: '#da3633', 500: '#cf222e', 600: '#a40e26' },
    success: { 300: '#56d364', 400: '#3fb950', 500: '#2ea043', 600: '#238636' },
    info: { 400: '#58a6ff', 500: '#388bfd', 600: '#1f6feb' },
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
