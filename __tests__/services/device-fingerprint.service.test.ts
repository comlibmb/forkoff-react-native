/**
 * Tests for DeviceFingerprintService
 *
 * Tests the fingerprint generation using device hardware identifiers.
 * Each test uses jest.isolateModules to get a fresh singleton instance.
 */

// Top-level mocks for the modules
const mockGetIosIdForVendorAsync = jest.fn().mockResolvedValue('mock-ios-vendor-id');
const mockGetAndroidId = jest.fn().mockReturnValue('mock-android-id');
jest.mock('expo-application', () => ({
  getIosIdForVendorAsync: (...args: any[]) => mockGetIosIdForVendorAsync(...args),
  getAndroidId: (...args: any[]) => mockGetAndroidId(...args),
}));

jest.mock('expo-device', () => ({
  brand: 'Apple',
  modelName: 'iPhone 15',
  modelId: 'iPhone16,1',
  totalMemory: 6442450944,
  deviceName: 'Test iPhone',
}));

const mockDigestStringAsync = jest.fn().mockResolvedValue('mocked-sha256-hash');
jest.mock('expo-crypto', () => ({
  digestStringAsync: (...args: any[]) => mockDigestStringAsync(...args),
  CryptoDigestAlgorithm: {
    SHA256: 'SHA-256',
  },
}));

import { Platform } from 'react-native';

describe('DeviceFingerprintService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDigestStringAsync.mockResolvedValue('mocked-sha256-hash');
    mockGetIosIdForVendorAsync.mockResolvedValue('mock-ios-vendor-id');
    Object.defineProperty(Platform, 'OS', { get: () => 'ios', configurable: true });
  });

  it('should generate a fingerprint hash on iOS', async () => {
    let service: any;
    jest.isolateModules(() => {
      service = require('@/services/device-fingerprint.service').deviceFingerprintService;
    });

    const hash = await service.getFingerprint();

    expect(hash).toBe('mocked-sha256-hash');
    expect(mockGetIosIdForVendorAsync).toHaveBeenCalled();
    expect(mockDigestStringAsync).toHaveBeenCalledWith(
      'SHA-256',
      expect.stringContaining('mock-ios-vendor-id'),
    );
  });

  it('should include device hardware identifiers in the hash input', async () => {
    let service: any;
    jest.isolateModules(() => {
      service = require('@/services/device-fingerprint.service').deviceFingerprintService;
    });

    await service.getFingerprint();

    expect(mockDigestStringAsync).toHaveBeenCalled();
    const hashInput = mockDigestStringAsync.mock.calls[0][1] as string;
    expect(hashInput).toContain('Apple');
    expect(hashInput).toContain('iPhone 15');
    expect(hashInput).toContain('iPhone16,1');
    expect(hashInput).toContain('6442450944');
    expect(hashInput).toContain('ios');
  });

  it('should cache the fingerprint hash on repeated calls', async () => {
    let service: any;
    jest.isolateModules(() => {
      service = require('@/services/device-fingerprint.service').deviceFingerprintService;
    });

    const hash1 = await service.getFingerprint();
    const hash2 = await service.getFingerprint();

    expect(hash1).toBe(hash2);
    expect(hash1).toBe('mocked-sha256-hash');
    // Crypto should only be called once due to caching
    expect(mockDigestStringAsync).toHaveBeenCalledTimes(1);
  });

  it('should return null if fingerprinting fails', async () => {
    mockGetIosIdForVendorAsync.mockRejectedValue(new Error('Device API unavailable'));

    let service: any;
    jest.isolateModules(() => {
      service = require('@/services/device-fingerprint.service').deviceFingerprintService;
    });

    const hash = await service.getFingerprint();
    expect(hash).toBeNull();
  });

  it('should use pipe-separated components', async () => {
    let service: any;
    jest.isolateModules(() => {
      service = require('@/services/device-fingerprint.service').deviceFingerprintService;
    });

    await service.getFingerprint();

    expect(mockDigestStringAsync).toHaveBeenCalled();
    const hashInput = mockDigestStringAsync.mock.calls[0][1] as string;
    expect(hashInput).toContain('|');
    const parts = hashInput.split('|');
    expect(parts.length).toBeGreaterThanOrEqual(3);
  });
});
