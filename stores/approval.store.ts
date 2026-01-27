import { create } from 'zustand';
import { wsService } from '@/services/websocket.service';

/**
 * Represents a Claude CLI approval request received from the backend.
 *
 * When Claude CLI prompts for user confirmation (e.g., file writes, command execution),
 * this request is sent to the mobile app to allow the user to approve or deny the action.
 *
 * @interface ClaudeApprovalRequest
 * @property {string} approvalId - Unique identifier for this approval request
 * @property {string} terminalSessionId - The terminal session that triggered the approval
 * @property {string} [sessionKey] - Optional Claude session key for session identification
 * @property {string} [deviceId] - Optional device ID that originated the request
 * @property {string[]} context - Recent output lines providing context for the approval decision
 * @property {string[]} options - Available response options in "key:label" format
 *                                (e.g., ['y:yes', 'n:no', 'p:plan'])
 * @property {string} promptText - The actual approval prompt text from Claude CLI
 * @property {string} timestamp - ISO timestamp when the request was created
 */
export interface ClaudeApprovalRequest {
  approvalId: string;
  terminalSessionId: string;
  sessionKey?: string;
  deviceId?: string;
  context: string[];       // Recent output lines for context
  options: string[];       // Available options (e.g., ['y:yes', 'n:no', 'p:plan'])
  promptText: string;      // The actual prompt text
  timestamp: string;
}

/**
 * Parses an approval option string into its key and label components.
 *
 * Option strings are formatted as "key:label" (e.g., "y:yes", "n:no", "p:plan").
 * The key is the single character used for the response, and the label is the
 * human-readable description shown in the UI.
 *
 * @param {string} option - The option string in "key:label" format
 * @returns {{ key: string; label: string }} Object containing the key and label.
 *          If no label is provided (no colon), the key is used as both key and label.
 *
 * @example
 * parseApprovalOption('y:yes');
 * // Returns: { key: 'y', label: 'yes' }
 *
 * @example
 * parseApprovalOption('n');
 * // Returns: { key: 'n', label: 'n' }
 */
export function parseApprovalOption(option: string): { key: string; label: string } {
  const [key, label] = option.split(':');
  return { key, label: label || key };
}

/**
 * Zustand store state interface for managing Claude approval requests.
 *
 * @interface ApprovalState
 * @property {ClaudeApprovalRequest[]} pendingApprovals - List of approval requests awaiting response
 * @property {ClaudeApprovalRequest | null} currentApproval - The approval currently displayed in modal
 * @property {Function} addApproval - Adds a new approval to the pending list
 * @property {Function} removeApproval - Removes an approval by ID
 * @property {Function} showApproval - Sets an approval as the current one to display
 * @property {Function} hideApproval - Clears the current approval modal
 * @property {Function} respondToApproval - Sends a response for an approval
 * @property {Function} subscribeToApprovals - Sets up WebSocket listener for new approvals
 * @property {Function} clearAllApprovals - Clears all pending approvals and current approval
 */
interface ApprovalState {
  // Pending approval requests
  pendingApprovals: ClaudeApprovalRequest[];

  // Current approval being shown (for modal)
  currentApproval: ClaudeApprovalRequest | null;

  // Actions
  addApproval: (approval: ClaudeApprovalRequest) => void;
  removeApproval: (approvalId: string) => void;
  showApproval: (approval: ClaudeApprovalRequest) => void;
  hideApproval: () => void;
  respondToApproval: (approvalId: string, response: string) => void;
  subscribeToApprovals: () => () => void;
  clearAllApprovals: () => void;
}

/**
 * Zustand store for managing Claude CLI approval requests.
 *
 * This store handles the lifecycle of approval requests from Claude CLI,
 * including receiving them via WebSocket, displaying them in a modal,
 * and sending user responses back to the backend.
 *
 * @example
 * // In a component
 * const { currentApproval, respondToApproval } = useApprovalStore();
 *
 * // Subscribe to approvals on mount
 * useEffect(() => {
 *   const unsubscribe = useApprovalStore.getState().subscribeToApprovals();
 *   return unsubscribe;
 * }, []);
 */
export const useApprovalStore = create<ApprovalState>((set, get) => ({
  pendingApprovals: [],
  currentApproval: null,

  /**
   * Adds a new approval request to the pending list.
   * Prevents duplicate approvals with the same approvalId.
   *
   * @param {ClaudeApprovalRequest} approval - The approval request to add
   */
  addApproval: (approval: ClaudeApprovalRequest) => {
    set((state) => {
      // Don't add duplicates
      if (state.pendingApprovals.some(a => a.approvalId === approval.approvalId)) {
        return state;
      }
      return { pendingApprovals: [...state.pendingApprovals, approval] };
    });
  },

  /**
   * Removes an approval request from the pending list by its ID.
   * Also clears currentApproval if it matches the removed approval.
   *
   * @param {string} approvalId - The unique identifier of the approval to remove
   */
  removeApproval: (approvalId: string) => {
    set((state) => ({
      pendingApprovals: state.pendingApprovals.filter(a => a.approvalId !== approvalId),
      currentApproval: state.currentApproval?.approvalId === approvalId
        ? null
        : state.currentApproval,
    }));
  },

  /**
   * Sets an approval as the currently displayed one (for modal display).
   *
   * @param {ClaudeApprovalRequest} approval - The approval to display
   */
  showApproval: (approval: ClaudeApprovalRequest) => {
    set({ currentApproval: approval });
  },

  /**
   * Hides the current approval modal by clearing currentApproval.
   */
  hideApproval: () => {
    set({ currentApproval: null });
  },

  /**
   * Sends a response for an approval request and removes it from the pending list.
   *
   * Finds the approval by ID, sends the response via WebSocket to the backend,
   * and removes the approval from the local state. The response character
   * (e.g., 'y', 'n', 'p') is forwarded to the Claude CLI process.
   *
   * @param {string} approvalId - The unique identifier of the approval
   * @param {string} response - The user's response (typically 'y', 'n', or 'p')
   */
  respondToApproval: (approvalId: string, response: string) => {
    const state = get();
    const approval = state.pendingApprovals.find(a => a.approvalId === approvalId);

    if (!approval) {
      console.log('[ApprovalStore] No pending approval found for', approvalId);
      return;
    }

    // Check if WebSocket is connected before sending
    if (!wsService.isConnected) {
      console.error('[ApprovalStore] WebSocket not connected, cannot send approval response for', approvalId);
      // Still remove from pending list to avoid stale UI state
      get().removeApproval(approvalId);
      return;
    }

    // Send response via WebSocket
    try {
      wsService.respondToClaudeApproval(approvalId, response, {
        deviceId: approval.deviceId,
        sessionKey: approval.sessionKey,
      });
      console.log('[ApprovalStore] Sent approval response:', approvalId, '->', response);
    } catch (error) {
      console.error('[ApprovalStore] Error sending approval response:', error);
    }

    // Remove from pending list
    get().removeApproval(approvalId);
  },

  /**
   * Subscribes to incoming Claude approval requests via WebSocket.
   *
   * Sets up a listener for 'claude_approval_request' events from the WebSocket
   * service. When a request is received, it's added to the pending list and
   * immediately shown in the approval modal.
   *
   * Should be called once when the app initializes or when the user authenticates.
   *
   * @returns {() => void} Unsubscribe function to remove the WebSocket listener
   *
   * @example
   * useEffect(() => {
   *   const unsubscribe = useApprovalStore.getState().subscribeToApprovals();
   *   return () => unsubscribe();
   * }, []);
   */
  subscribeToApprovals: () => {
    // Listen for Claude approval requests
    const unsubscribe = wsService.on('claude_approval_request', (data) => {
      console.log('[ApprovalStore] Received approval request:', data.approvalId);

      // Validate required fields - only approvalId is required
      if (!data.approvalId) {
        console.error('[ApprovalStore] Invalid approval request data - missing approvalId:', data);
        return;
      }

      const approval: ClaudeApprovalRequest = {
        approvalId: data.approvalId,
        terminalSessionId: data.terminalSessionId || '',
        sessionKey: data.sessionKey,
        deviceId: data.deviceId,
        context: data.context || [],
        options: data.options || ['y:yes', 'n:no'],
        promptText: data.promptText || 'Approval needed',
        timestamp: data.timestamp || new Date().toISOString(),
      };

      // Add to pending list
      get().addApproval(approval);

      // Show the approval modal
      get().showApproval(approval);
    });

    // Listen for WebSocket disconnection to handle edge cases
    const unsubscribeDisconnect = wsService.on('disconnected', () => {
      console.log('[ApprovalStore] WebSocket disconnected, keeping pending approvals for reconnection');
      // Note: We don't clear approvals on disconnect as the user might reconnect
      // and still want to respond. The CLI has its own timeout handling.
    });

    // Return combined unsubscribe function
    return () => {
      unsubscribe();
      unsubscribeDisconnect();
    };
  },

  /**
   * Clears all pending approvals and hides any current approval modal.
   *
   * Useful for cleanup when the user logs out or disconnects, ensuring
   * stale approval requests don't persist across sessions.
   */
  clearAllApprovals: () => {
    set({ pendingApprovals: [], currentApproval: null });
  },
}));

export default useApprovalStore;
