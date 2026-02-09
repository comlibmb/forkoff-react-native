/**
 * TDD Tests for E2EE Store (Zustand)
 * Manages E2EE state: enabled flag, session statuses, etc.
 */

// Must mock secure store before importing anything
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

import { useE2EEStore } from '@/stores/e2ee.store';

describe('E2EE Store', () => {
  beforeEach(() => {
    // Reset store state between tests
    useE2EEStore.getState().reset();
  });

  describe('default state', () => {
    it('should have e2eeEnabled = false by default', () => {
      expect(useE2EEStore.getState().e2eeEnabled).toBe(false);
    });

    it('should have empty encryptedSessions by default', () => {
      expect(useE2EEStore.getState().encryptedSessions).toEqual({});
    });
  });

  describe('toggleE2EE', () => {
    it('should toggle e2eeEnabled from false to true', () => {
      useE2EEStore.getState().setE2EEEnabled(true);
      expect(useE2EEStore.getState().e2eeEnabled).toBe(true);
    });

    it('should toggle e2eeEnabled from true to false', () => {
      useE2EEStore.getState().setE2EEEnabled(true);
      useE2EEStore.getState().setE2EEEnabled(false);
      expect(useE2EEStore.getState().e2eeEnabled).toBe(false);
    });
  });

  describe('session tracking', () => {
    it('should track an encrypted session for a device', () => {
      useE2EEStore.getState().setSessionStatus('device-123', 'established');
      expect(useE2EEStore.getState().encryptedSessions['device-123']).toBe('established');
    });

    it('should track initiating status', () => {
      useE2EEStore.getState().setSessionStatus('device-456', 'initiating');
      expect(useE2EEStore.getState().encryptedSessions['device-456']).toBe('initiating');
    });

    it('should track failed status', () => {
      useE2EEStore.getState().setSessionStatus('device-789', 'failed');
      expect(useE2EEStore.getState().encryptedSessions['device-789']).toBe('failed');
    });

    it('should return correct session status', () => {
      useE2EEStore.getState().setSessionStatus('device-a', 'established');
      expect(useE2EEStore.getState().isSessionEncrypted('device-a')).toBe(true);
    });

    it('should return false for unknown device', () => {
      expect(useE2EEStore.getState().isSessionEncrypted('unknown')).toBe(false);
    });

    it('should return false for non-established session', () => {
      useE2EEStore.getState().setSessionStatus('device-b', 'initiating');
      expect(useE2EEStore.getState().isSessionEncrypted('device-b')).toBe(false);
    });
  });

  describe('clearEncryptedSessions', () => {
    it('should clear all encrypted sessions', () => {
      useE2EEStore.getState().setSessionStatus('device-1', 'established');
      useE2EEStore.getState().setSessionStatus('device-2', 'established');
      useE2EEStore.getState().clearEncryptedSessions();
      expect(useE2EEStore.getState().encryptedSessions).toEqual({});
    });
  });

  describe('reset', () => {
    it('should reset all state to defaults', () => {
      useE2EEStore.getState().setE2EEEnabled(true);
      useE2EEStore.getState().setSessionStatus('device-1', 'established');
      useE2EEStore.getState().reset();
      expect(useE2EEStore.getState().e2eeEnabled).toBe(false);
      expect(useE2EEStore.getState().encryptedSessions).toEqual({});
    });
  });
});
