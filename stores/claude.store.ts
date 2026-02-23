import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { ClaudeSession, DirectoryEntry, TabCompletionResult } from '@/types';
import { wsService } from '@/services/websocket.service';
import { unstable_batchedUpdates } from 'react-native';
import { analyticsService } from '@/services/analytics.service';
import { sentryService } from '@/services/sentry.service';
import { useUsageStore } from './usage.store';
import { useSessionSettingsStore } from './session-settings.store';

interface ClaudeState {
  // Session state per device
  sessions: Map<string, ClaudeSession[]>;
  activeToolStatus: Map<string, 'active' | 'inactive' | 'error'>;

  // Directory browser state
  currentPath: Map<string, string>; // deviceId -> current path
  directoryEntries: Map<string, DirectoryEntry[]>; // deviceId -> entries
  isLoadingDirectory: boolean;

  // Tab completion state
  tabCompletions: string[];
  tabCommonPrefix: string | null;

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchSessions: (deviceId: string) => Promise<void>;
  subscribeToUpdates: (deviceId: string) => () => void;
  resumeSession: (deviceId: string, session: ClaudeSession, terminalSessionId: string) => Promise<void>;
  startNewSession: (deviceId: string, directory: string, terminalSessionId: string) => Promise<void>;
  deleteSession: (sessionId: string, deviceId: string) => Promise<void>;

  // Directory actions
  requestDirectoryListing: (deviceId: string, path: string) => void;
  setCurrentPath: (deviceId: string, path: string) => void;

  // Tab completion actions
  requestTabCompletion: (deviceId: string, terminalSessionId: string, partial: string) => void;
  clearTabCompletions: () => void;

  // Tool status
  updateToolStatus: (deviceId: string, status: 'active' | 'inactive' | 'error') => void;
  getToolStatus: (deviceId: string) => 'active' | 'inactive' | 'error';

  clearError: () => void;
}

export const useClaudeStore = create<ClaudeState>((set, get) => ({
  sessions: new Map(),
  activeToolStatus: new Map(),
  currentPath: new Map(),
  directoryEntries: new Map(),
  isLoadingDirectory: false,
  tabCompletions: [],
  tabCommonPrefix: null,
  isLoading: false,
  error: null,

  fetchSessions: async (deviceId: string) => {
    try {
      set({ isLoading: true, error: null });

      // Sessions are populated via WebSocket events (claude_session_update)
      // Request sessions list from CLI via WebSocket
      wsService.emit('claude_sessions_request', { deviceId });

      analyticsService.track('claude_sessions_fetched', { deviceId });

      // Don't wait for response — sessions arrive via claude_session_update listener
      set({ isLoading: false });
    } catch (error) {
      sentryService.captureException(error, { context: 'fetch_claude_sessions', deviceId });
      set({ isLoading: false });
    }
  },

  subscribeToUpdates: (deviceId: string) => {
    // Subscribe to device room
    wsService.subscribeToDevice(deviceId);

    // Session updates (individual + batch) are handled by module-level global listeners
    // so they work even before this component mounts.

    // Listen for tool status updates
    const unsubToolStatus = wsService.on('tool_status_update', (data) => {
      if (data.deviceId !== deviceId) return;
      if (data.toolType !== 'claude_code' && data.toolType !== 'claude-code') return;

      get().updateToolStatus(deviceId, data.status);
    });

    // Listen for directory listing responses
    const unsubDirList = wsService.on('directory_list_response', (data) => {
      set((state) => {
        const newEntries = new Map(state.directoryEntries);
        newEntries.set(deviceId, data.entries);

        const newPaths = new Map(state.currentPath);
        newPaths.set(deviceId, data.currentPath);

        return {
          directoryEntries: newEntries,
          currentPath: newPaths,
          isLoadingDirectory: false,
        };
      });
    });

    // Listen for tab completion responses
    const unsubTabComplete = wsService.on('tab_complete_response', (data) => {
      set({
        tabCompletions: data.completions,
        tabCommonPrefix: data.commonPrefix || null,
      });
    });

    return () => {
      unsubToolStatus();
      unsubDirList();
      unsubTabComplete();
      wsService.unsubscribeFromDevice(deviceId);
    };
  },

  resumeSession: async (deviceId: string, session: ClaudeSession, terminalSessionId: string) => {
    try {
      set({ isLoading: true, error: null });

      const { unrestrictedMode } = useSessionSettingsStore.getState();
      wsService.emit('claude_resume_session', {
        deviceId,
        sessionKey: session.sessionKey,
        directory: session.directory,
        terminalSessionId,
        dangerouslySkipPermissions: unrestrictedMode,
      });

      analyticsService.track('claude_session_resumed', {
        deviceId,
        sessionKey: session.sessionKey,
        directory: session.directory,
      });

      sentryService.addBreadcrumb('Claude session resumed', 'claude', {
        sessionKey: session.sessionKey,
        deviceId,
      });

      set({ isLoading: false });
    } catch (error) {
      sentryService.captureException(error, {
        context: 'resume_claude_session',
        deviceId,
        sessionKey: session.sessionKey,
      });
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to resume session',
      });
      throw error;
    }
  },

  startNewSession: async (deviceId: string, directory: string, terminalSessionId: string) => {
    try {
      // Check session limit
      const { canStartSession, incrementSessions } = useUsageStore.getState();
      if (!canStartSession()) {
        const error = new Error('SESSION_LIMIT_REACHED');
        set({ error: error.message });
        throw error;
      }

      set({ isLoading: true, error: null });

      // Increment session count
      incrementSessions();

      const { unrestrictedMode } = useSessionSettingsStore.getState();
      wsService.emit('claude_start_session', {
        deviceId,
        directory,
        terminalSessionId,
        dangerouslySkipPermissions: unrestrictedMode,
      });

      analyticsService.track('claude_session_started', {
        deviceId,
        directory,
      });

      sentryService.addBreadcrumb('Claude session started', 'claude', {
        deviceId,
        directory,
      });

      set({ isLoading: false });
    } catch (error) {
      sentryService.captureException(error, {
        context: 'start_claude_session',
        deviceId,
        directory,
      });
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to start session',
      });
      throw error;
    }
  },

  deleteSession: async (sessionIdOrKey: string, deviceId: string) => {
    try {
      set({ isLoading: true, error: null });

      analyticsService.track('claude_session_deleted', {
        deviceId,
        sessionIdOrKey,
      });

      // Remove from local state (match by id OR sessionKey)
      set((state) => {
        const newSessions = new Map(state.sessions);
        const deviceSessions = newSessions.get(deviceId) || [];
        newSessions.set(
          deviceId,
          deviceSessions.filter((s) => s.id !== sessionIdOrKey && s.sessionKey !== sessionIdOrKey)
        );
        return { sessions: newSessions, isLoading: false };
      });
    } catch (error) {
      sentryService.captureException(error, {
        context: 'delete_claude_session',
        deviceId,
        sessionIdOrKey,
      });
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to delete session',
      });
    }
  },

  requestDirectoryListing: (deviceId: string, path: string) => {
    set({ isLoadingDirectory: true });

    const requestId = `dir-${Date.now()}`;
    wsService.emit('directory_list', {
      deviceId,
      path,
      requestId,
    });
  },

  setCurrentPath: (deviceId: string, path: string) => {
    set((state) => {
      const newPaths = new Map(state.currentPath);
      newPaths.set(deviceId, path);
      return { currentPath: newPaths };
    });
    get().requestDirectoryListing(deviceId, path);
  },

  requestTabCompletion: (deviceId: string, terminalSessionId: string, partial: string) => {
    const requestId = `tab-${Date.now()}`;
    wsService.emit('tab_complete', {
      deviceId,
      terminalSessionId,
      partial,
      requestId,
    });
  },

  clearTabCompletions: () => {
    set({ tabCompletions: [], tabCommonPrefix: null });
  },

  updateToolStatus: (deviceId: string, status: 'active' | 'inactive' | 'error') => {
    set((state) => {
      const newStatus = new Map(state.activeToolStatus);
      newStatus.set(deviceId, status);
      return { activeToolStatus: newStatus };
    });
  },

  getToolStatus: (deviceId: string) => {
    return get().activeToolStatus.get(deviceId) || 'inactive';
  },

  clearError: () => set({ error: null }),
}));

// Global listeners — always active regardless of which screen is mounted.
// This ensures batch/individual session updates from CLI are captured even before
// the Projects screen mounts and calls subscribeToUpdates.
function processSessionUpdate(
  state: ClaudeState,
  deviceId: string,
  session: any,
): Partial<ClaudeState> {
  const newSessions = new Map(state.sessions);
  const deviceSessions = [...(newSessions.get(deviceId) || [])];
  const newToolStatus = new Map(state.activeToolStatus);

  const existingIndex = deviceSessions.findIndex(
    (s) => s.sessionKey === session.sessionKey
  );

  if (existingIndex >= 0) {
    deviceSessions[existingIndex] = {
      ...deviceSessions[existingIndex],
      directory: session.directory || deviceSessions[existingIndex].directory,
      name: session.name || deviceSessions[existingIndex].name,
      state: session.state ?? deviceSessions[existingIndex].state,
      lastUsedAt: session.lastUsedAt || deviceSessions[existingIndex].lastUsedAt,
      transcriptPath: session.transcriptPath ?? deviceSessions[existingIndex].transcriptPath,
    };
  } else {
    deviceSessions.push(session);
  }

  deviceSessions.sort((a, b) =>
    new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime()
  );

  newSessions.set(deviceId, deviceSessions);

  const hasActiveSession = deviceSessions.some(s => s.state === 'active');
  newToolStatus.set(deviceId, hasActiveSession ? 'active' : 'inactive');

  return { sessions: newSessions, activeToolStatus: newToolStatus };
}

wsService.on('claude_session_update', (data) => {
  if (!data.deviceId) return;
  unstable_batchedUpdates(() => {
    useClaudeStore.setState((state) => processSessionUpdate(state, data.deviceId, data));
  });
});

wsService.on('claude_session_batch_update', (data) => {
  const sessions = data.sessions;
  if (!Array.isArray(sessions) || sessions.length === 0) return;
  unstable_batchedUpdates(() => {
    useClaudeStore.setState((state) => {
      let result: Partial<ClaudeState> = {};
      let merged = state;
      for (const session of sessions) {
        if (!session.deviceId) continue;
        const update = processSessionUpdate(merged, session.deviceId, session);
        merged = { ...merged, ...update } as ClaudeState;
        result = { ...result, ...update };
      }
      return result;
    });
  });
});

export default useClaudeStore;
