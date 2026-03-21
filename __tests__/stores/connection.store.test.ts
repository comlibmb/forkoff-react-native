/**
 * Tests for ConnectionStore - wasKicked flag
 *
 * Tests the session kick tracking functionality.
 */

// Mock the services that connection store imports
jest.mock('@/services/network.service', () => ({
  networkService: {
    subscribe: jest.fn(() => jest.fn()),
    initialize: jest.fn(),
  },
}));

jest.mock('@/services/websocket.service', () => ({
  wsService: {
    on: jest.fn(() => jest.fn()),
    isConnected: false,
  },
}));

import { useConnectionStore } from '@/stores/connection.store';

describe('ConnectionStore - wasKicked', () => {
  beforeEach(() => {
    // Reset store state
    useConnectionStore.setState({
      isPhoneOnline: true,
      isServerConnected: false,
      wasKicked: false,
    });
  });

  it('should initialize with wasKicked as false', () => {
    const { wasKicked } = useConnectionStore.getState();
    expect(wasKicked).toBe(false);
  });

  it('should set wasKicked to true', () => {
    useConnectionStore.getState().setWasKicked(true);
    expect(useConnectionStore.getState().wasKicked).toBe(true);
  });

  it('should set wasKicked back to false', () => {
    useConnectionStore.getState().setWasKicked(true);
    expect(useConnectionStore.getState().wasKicked).toBe(true);

    useConnectionStore.getState().setWasKicked(false);
    expect(useConnectionStore.getState().wasKicked).toBe(false);
  });

  it('should not affect other state when setting wasKicked', () => {
    useConnectionStore.getState().setPhoneOnline(true);
    useConnectionStore.getState().setServerConnected(true);

    useConnectionStore.getState().setWasKicked(true);

    const state = useConnectionStore.getState();
    expect(state.wasKicked).toBe(true);
    expect(state.isPhoneOnline).toBe(true);
    expect(state.isServerConnected).toBe(true);
  });
});
