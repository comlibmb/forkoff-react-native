/**
 * Tests for AuthStore - Device Fingerprint Actions
 *
 * Tests the checkDeviceForRegistration and registerDeviceFingerprint actions.
 */

// Mock device-fingerprint.service BEFORE importing auth.store
const mockGetFingerprint = jest.fn();
jest.mock('@/services/device-fingerprint.service', () => ({
  deviceFingerprintService: {
    getFingerprint: (...args: any[]) => mockGetFingerprint(...args),
  },
}));

// Mock auth.service
const mockCheckDeviceRegistration = jest.fn();
const mockRegisterFingerprint = jest.fn();
jest.mock('@/services/auth.service', () => ({
  authService: {
    getSession: jest.fn().mockResolvedValue(null),
    getCurrentUser: jest.fn().mockResolvedValue(null),
    onAuthStateChange: jest.fn().mockReturnValue(jest.fn()),
    checkDeviceRegistration: (...args: any[]) => mockCheckDeviceRegistration(...args),
    registerFingerprint: (...args: any[]) => mockRegisterFingerprint(...args),
    signUpWithOtp: jest.fn(),
    signInWithOtp: jest.fn(),
    verifyOtp: jest.fn(),
    resendOtp: jest.fn(),
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    signInWithGoogle: jest.fn(),
    signInWithApple: jest.fn(),
    resetPassword: jest.fn(),
    updatePassword: jest.fn(),
    updateProfile: jest.fn(),
    deleteAccount: jest.fn(),
    changePassword: jest.fn(),
    validateUsername: jest.fn().mockReturnValue({ valid: true }),
    checkUsernameAvailability: jest.fn().mockResolvedValue({ available: true }),
    getAccessToken: jest.fn().mockResolvedValue('mock-token'),
  },
  default: {},
}));

jest.mock('@/services/sentry.service', () => ({
  sentryService: {
    captureException: jest.fn(),
    setUser: jest.fn(),
  },
}));

jest.mock('@/services/analytics.service', () => ({
  analyticsService: {
    track: jest.fn(),
    identify: jest.fn(),
    identifyWithCountry: jest.fn(),
    setUserProperties: jest.fn(),
    reset: jest.fn(),
  },
}));

import { useAuthStore } from '@/stores/auth.store';

describe('AuthStore - Device Fingerprint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,
      error: null,
      pendingEmail: null,
      pendingName: null,
      otpSent: false,
    });
  });

  describe('checkDeviceForRegistration', () => {
    it('should return allowed: true when fingerprint generation fails', async () => {
      mockGetFingerprint.mockResolvedValue(null);

      const result = await useAuthStore.getState().checkDeviceForRegistration();

      expect(result).toEqual({ allowed: true });
      expect(mockCheckDeviceRegistration).not.toHaveBeenCalled();
    });

    it('should check device registration when fingerprint is available', async () => {
      mockGetFingerprint.mockResolvedValue('test-hash');
      mockCheckDeviceRegistration.mockResolvedValue({ allowed: true });

      const result = await useAuthStore.getState().checkDeviceForRegistration();

      expect(result).toEqual({ allowed: true });
      expect(mockCheckDeviceRegistration).toHaveBeenCalledWith('test-hash');
    });

    it('should return blocked status from API', async () => {
      mockGetFingerprint.mockResolvedValue('test-hash');
      mockCheckDeviceRegistration.mockResolvedValue({
        allowed: false,
        message: 'You already have an existing account (te***@example.com).',
      });

      const result = await useAuthStore.getState().checkDeviceForRegistration();

      expect(result.allowed).toBe(false);
      expect(result.message).toContain('te***@example.com');
    });

    it('should fail open on error', async () => {
      mockGetFingerprint.mockRejectedValue(new Error('Device API error'));

      const result = await useAuthStore.getState().checkDeviceForRegistration();

      expect(result).toEqual({ allowed: true });
    });
  });

  describe('checkDeviceForLogin', () => {
    it('should return allowed: true when fingerprint generation fails', async () => {
      mockGetFingerprint.mockResolvedValue(null);

      const result = await useAuthStore.getState().checkDeviceForLogin('test@example.com');

      expect(result).toEqual({ allowed: true });
      expect(mockCheckDeviceRegistration).not.toHaveBeenCalled();
    });

    it('should pass email to checkDeviceRegistration', async () => {
      mockGetFingerprint.mockResolvedValue('test-hash');
      mockCheckDeviceRegistration.mockResolvedValue({ allowed: true });

      const result = await useAuthStore.getState().checkDeviceForLogin('test@example.com');

      expect(result).toEqual({ allowed: true });
      expect(mockCheckDeviceRegistration).toHaveBeenCalledWith('test-hash', 'test@example.com');
    });

    it('should return blocked when device belongs to different account', async () => {
      mockGetFingerprint.mockResolvedValue('test-hash');
      mockCheckDeviceRegistration.mockResolvedValue({
        allowed: false,
        message: 'This device is linked to another account (jo***@example.com).',
      });

      const result = await useAuthStore.getState().checkDeviceForLogin('other@example.com');

      expect(result.allowed).toBe(false);
      expect(result.message).toContain('linked to another account');
    });

    it('should fail open on error', async () => {
      mockGetFingerprint.mockRejectedValue(new Error('Device API error'));

      const result = await useAuthStore.getState().checkDeviceForLogin('test@example.com');

      expect(result).toEqual({ allowed: true });
    });
  });

  describe('registerDeviceFingerprint', () => {
    it('should skip if fingerprint generation fails', async () => {
      mockGetFingerprint.mockResolvedValue(null);

      await useAuthStore.getState().registerDeviceFingerprint();

      expect(mockRegisterFingerprint).not.toHaveBeenCalled();
    });

    it('should register fingerprint when hash is available', async () => {
      mockGetFingerprint.mockResolvedValue('test-hash');
      mockRegisterFingerprint.mockResolvedValue(undefined);

      await useAuthStore.getState().registerDeviceFingerprint();

      expect(mockRegisterFingerprint).toHaveBeenCalledWith('test-hash');
    });

    it('should not throw on error', async () => {
      mockGetFingerprint.mockResolvedValue('test-hash');
      mockRegisterFingerprint.mockRejectedValue(new Error('Network error'));

      // Should not throw
      await expect(
        useAuthStore.getState().registerDeviceFingerprint(),
      ).resolves.not.toThrow();
    });
  });
});
