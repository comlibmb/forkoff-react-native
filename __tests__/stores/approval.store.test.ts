/**
 * Tests for ApprovalStore
 *
 * Tests the Zustand store that manages Claude approval requests
 * (yes/no/plan prompts from CLI).
 */

import { useApprovalStore, ClaudeApprovalRequest, parseApprovalOption } from '@/stores/approval.store';
import { wsService } from '@/services/websocket.service';

// Mock the websocket service
jest.mock('@/services/websocket.service', () => ({
  wsService: {
    on: jest.fn(() => jest.fn()), // Returns an unsubscribe function
    respondToClaudeApproval: jest.fn(),
    isConnected: true, // Pretend WS is connected
  },
}));

describe('ApprovalStore', () => {
  // Reset store state before each test
  beforeEach(() => {
    useApprovalStore.getState().clearAllApprovals();
    jest.clearAllMocks();
  });

  // Sample approval request for testing
  const createMockApproval = (id: string): ClaudeApprovalRequest => ({
    approvalId: id,
    terminalSessionId: 'terminal-123',
    sessionKey: 'session-key-abc',
    deviceId: 'device-456',
    context: ['Previous output line 1', 'Previous output line 2'],
    options: ['y:yes', 'n:no', 'p:plan'],
    promptText: 'Do you want to proceed with the changes?',
    timestamp: new Date().toISOString(),
  });

  describe('parseApprovalOption', () => {
    it('should parse option with key and label', () => {
      const result = parseApprovalOption('y:yes');
      expect(result).toEqual({ key: 'y', label: 'yes' });
    });

    it('should parse option with just key (no label)', () => {
      const result = parseApprovalOption('x');
      expect(result).toEqual({ key: 'x', label: 'x' });
    });

    it('should parse option with complex label', () => {
      const result = parseApprovalOption('p:show plan');
      // Note: split only splits on first colon, so 'show plan' would be split incorrectly
      // The current implementation splits on first ':', so 'show plan' becomes label
      const [key, label] = 'p:show plan'.split(':');
      expect(result).toEqual({ key, label: label || key });
    });
  });

  describe('addApproval', () => {
    it('should add a new approval to pendingApprovals', () => {
      const approval = createMockApproval('approval-1');

      useApprovalStore.getState().addApproval(approval);

      const state = useApprovalStore.getState();
      expect(state.pendingApprovals).toHaveLength(1);
      expect(state.pendingApprovals[0]).toEqual(approval);
    });

    it('should add multiple approvals', () => {
      const approval1 = createMockApproval('approval-1');
      const approval2 = createMockApproval('approval-2');

      useApprovalStore.getState().addApproval(approval1);
      useApprovalStore.getState().addApproval(approval2);

      const state = useApprovalStore.getState();
      expect(state.pendingApprovals).toHaveLength(2);
    });

    it('should not add duplicate approvals with same approvalId', () => {
      const approval1 = createMockApproval('approval-1');
      const approval2 = createMockApproval('approval-1'); // Same ID

      useApprovalStore.getState().addApproval(approval1);
      useApprovalStore.getState().addApproval(approval2);

      const state = useApprovalStore.getState();
      expect(state.pendingApprovals).toHaveLength(1);
    });
  });

  describe('removeApproval', () => {
    it('should remove an approval by approvalId', () => {
      const approval1 = createMockApproval('approval-1');
      const approval2 = createMockApproval('approval-2');

      useApprovalStore.getState().addApproval(approval1);
      useApprovalStore.getState().addApproval(approval2);
      useApprovalStore.getState().removeApproval('approval-1');

      const state = useApprovalStore.getState();
      expect(state.pendingApprovals).toHaveLength(1);
      expect(state.pendingApprovals[0].approvalId).toBe('approval-2');
    });

    it('should clear currentApproval if it matches the removed approval', () => {
      const approval = createMockApproval('approval-1');

      useApprovalStore.getState().addApproval(approval);
      useApprovalStore.getState().showApproval(approval);

      expect(useApprovalStore.getState().currentApproval).not.toBeNull();

      useApprovalStore.getState().removeApproval('approval-1');

      expect(useApprovalStore.getState().currentApproval).toBeNull();
    });

    it('should not clear currentApproval if it does not match', () => {
      const approval1 = createMockApproval('approval-1');
      const approval2 = createMockApproval('approval-2');

      useApprovalStore.getState().addApproval(approval1);
      useApprovalStore.getState().addApproval(approval2);
      useApprovalStore.getState().showApproval(approval2);

      useApprovalStore.getState().removeApproval('approval-1');

      expect(useApprovalStore.getState().currentApproval?.approvalId).toBe('approval-2');
    });

    it('should handle removing non-existent approval gracefully', () => {
      const approval = createMockApproval('approval-1');
      useApprovalStore.getState().addApproval(approval);

      // Should not throw
      useApprovalStore.getState().removeApproval('non-existent-id');

      expect(useApprovalStore.getState().pendingApprovals).toHaveLength(1);
    });
  });

  describe('showApproval / hideApproval', () => {
    it('should set currentApproval when showApproval is called', () => {
      const approval = createMockApproval('approval-1');

      useApprovalStore.getState().showApproval(approval);

      expect(useApprovalStore.getState().currentApproval).toEqual(approval);
    });

    it('should clear currentApproval when hideApproval is called', () => {
      const approval = createMockApproval('approval-1');

      useApprovalStore.getState().showApproval(approval);
      useApprovalStore.getState().hideApproval();

      expect(useApprovalStore.getState().currentApproval).toBeNull();
    });
  });

  describe('respondToApproval', () => {
    it('should send response via WebSocket service', () => {
      const approval = createMockApproval('approval-1');

      useApprovalStore.getState().addApproval(approval);
      useApprovalStore.getState().respondToApproval('approval-1', 'y');

      expect(wsService.respondToClaudeApproval).toHaveBeenCalledWith(
        'approval-1',
        'y',
        {
          deviceId: 'device-456',
          sessionKey: 'session-key-abc',
        }
      );
    });

    it('should remove the approval after responding', () => {
      const approval = createMockApproval('approval-1');

      useApprovalStore.getState().addApproval(approval);
      useApprovalStore.getState().respondToApproval('approval-1', 'n');

      expect(useApprovalStore.getState().pendingApprovals).toHaveLength(0);
    });

    it('should not call websocket if approval not found', () => {
      useApprovalStore.getState().respondToApproval('non-existent', 'y');

      expect(wsService.respondToClaudeApproval).not.toHaveBeenCalled();
    });

    it('should handle response with different keys (y, n, p)', () => {
      const approval = createMockApproval('approval-1');
      useApprovalStore.getState().addApproval(approval);

      useApprovalStore.getState().respondToApproval('approval-1', 'p');

      expect(wsService.respondToClaudeApproval).toHaveBeenCalledWith(
        'approval-1',
        'p',
        expect.any(Object)
      );
    });
  });

  describe('subscribeToApprovals', () => {
    it('should register listener for claude_approval_request events', () => {
      const unsubscribe = useApprovalStore.getState().subscribeToApprovals();

      expect(wsService.on).toHaveBeenCalledWith(
        'claude_approval_request',
        expect.any(Function)
      );

      // Cleanup
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });

    it('should add approval and show it when event is received', () => {
      // Capture the callback registered with wsService.on
      let capturedCallback: ((data: unknown) => void) | null = null;
      (wsService.on as jest.Mock).mockImplementation((event, callback) => {
        if (event === 'claude_approval_request') {
          capturedCallback = callback;
        }
        return jest.fn(); // Return unsubscribe function
      });

      useApprovalStore.getState().subscribeToApprovals();

      // Simulate receiving an approval request event
      const eventData = {
        approvalId: 'event-approval-1',
        terminalSessionId: 'terminal-123',
        sessionKey: 'session-abc',
        deviceId: 'device-456',
        context: ['line 1'],
        options: ['y:yes', 'n:no'],
        promptText: 'Continue?',
        timestamp: new Date().toISOString(),
      };

      expect(capturedCallback).not.toBeNull();
      if (capturedCallback) {
        capturedCallback(eventData);
      }

      const state = useApprovalStore.getState();
      expect(state.pendingApprovals).toHaveLength(1);
      expect(state.pendingApprovals[0].approvalId).toBe('event-approval-1');
      expect(state.currentApproval?.approvalId).toBe('event-approval-1');
    });

    it('should return an unsubscribe function', () => {
      const mockUnsubscribe = jest.fn();
      (wsService.on as jest.Mock).mockReturnValue(mockUnsubscribe);

      const unsubscribe = useApprovalStore.getState().subscribeToApprovals();

      expect(typeof unsubscribe).toBe('function');
    });
  });

  describe('clearAllApprovals', () => {
    it('should clear all pending approvals and currentApproval', () => {
      const approval1 = createMockApproval('approval-1');
      const approval2 = createMockApproval('approval-2');

      useApprovalStore.getState().addApproval(approval1);
      useApprovalStore.getState().addApproval(approval2);
      useApprovalStore.getState().showApproval(approval1);

      useApprovalStore.getState().clearAllApprovals();

      const state = useApprovalStore.getState();
      expect(state.pendingApprovals).toHaveLength(0);
      expect(state.currentApproval).toBeNull();
    });
  });
});
