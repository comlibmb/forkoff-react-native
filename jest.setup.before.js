// This file runs BEFORE the test environment is set up
// It mocks problematic modules that cause initialization errors

// Mock structuredClone before expo tries to use it
if (typeof global !== 'undefined') {
  if (!global.structuredClone) {
    global.structuredClone = (obj) => JSON.parse(JSON.stringify(obj));
  }
  global.__ExpoImportMetaRegistry = {};
}

// Mock the problematic expo/src/winter modules
jest.mock('expo/src/winter/runtime.native', () => ({}), { virtual: true });
jest.mock('expo/src/winter/runtime', () => ({}), { virtual: true });
jest.mock('expo/src/winter/installGlobal', () => ({
  default: () => {},
  installGlobal: () => {},
}), { virtual: true });
jest.mock('expo/src/winter', () => ({}), { virtual: true });

// Mock expo module to prevent initialization issues
jest.mock('expo', () => ({
  registerRootComponent: jest.fn((component) => component),
}), { virtual: true });
