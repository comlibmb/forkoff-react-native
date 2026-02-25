import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ClaudeSession, DirectoryEntry, TabCompletionResult } from '@/types';
import { wsService } from '@/services/websocket.service';
import { unstable_batchedUpdates } from 'react-native';
import { analyticsService } from '@/services/analytics.service';
import { sentryService } from '@/services/sentry.service';
import { useUsageStore } from './usage.store';
import { useSessionSettingsStore } from './session-settings.store';

const SESSION_CACHE_KEY = 'forkoff:claude_sessions';

/** Persist sessions to AsyncStorage (fire-and-forget) */
function persistSessions(sessions: Map<string, ClaudeSession[]>): void {
  try {
    const obj: Record<string, ClaudeSession[]> = {};
    for (const [deviceId, list] of sessions) {
      obj[deviceId] = list;
    }
    AsyncStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(obj)).catch(() => {});
  } catch {}
}

/** Load cached sessions from AsyncStorage */
async function loadCachedSessions(): Promise<Map<string, ClaudeSession[]>> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_CACHE_KEY);
    if (!raw) return new Map();
    const obj = JSON.parse(raw) as Record<string, ClaudeSession[]>;
    const map = new Map<string, ClaudeSession[]>();
    for (const [deviceId, list] of Object.entries(obj)) {
      map.set(deviceId, list);
    }
    return map;
  } catch {
    return new Map();
  }
}

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

      // Load cached sessions from AsyncStorage immediately (show titles while CLI syncs)
      const cached = await loadCachedSessions();
      if (cached.size > 0) {
        set((state) => {
          const merged = new Map(state.sessions);
          for (const [devId, cachedList] of cached) {
            const existing = merged.get(devId) || [];
            if (existing.length === 0) {
              merged.set(devId, cachedList);
            }
          }
          return { sessions: merged };
        });
      }

      // Request fresh sessions from CLI via WebSocket
      console.log(`[ClaudeStore] fetchSessions(${deviceId}) — socket connected: ${wsService.isConnected}, E2EE active: ${wsService.isE2EEActive(deviceId)}`);
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
  console.log(`[ClaudeStore] session_update: ${data.sessionKey} (${data.state}) for device ${data.deviceId}`);
  unstable_batchedUpdates(() => {
    useClaudeStore.setState((state) => {
      const result = processSessionUpdate(state, data.deviceId, data);
      const total = (result.sessions as Map<string, any>)?.get(data.deviceId)?.length ?? 0;
      console.log(`[ClaudeStore] Total sessions for ${data.deviceId}: ${total}`);
      // Persist to cache
      if (result.sessions) persistSessions(result.sessions as Map<string, ClaudeSession[]>);
      return result;
    });
  });
});

wsService.on('claude_session_batch_update', (data) => {
  const sessions = data.sessions;
  if (!Array.isArray(sessions) || sessions.length === 0) return;
  console.log(`[ClaudeStore] batch_update: ${sessions.length} sessions received`);
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
      // Log totals per device
      const resultSessions = result.sessions as Map<string, any> | undefined;
      if (resultSessions) {
        for (const [deviceId, deviceSessions] of resultSessions) {
          console.log(`[ClaudeStore] After batch — device ${deviceId}: ${deviceSessions.length} sessions`);
        }
      }
      // Persist to cache
      if (result.sessions) persistSessions(result.sessions as Map<string, ClaudeSession[]>);
      return result;
    });
  });
});

export default useClaudeStore;
