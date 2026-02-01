import { create } from 'zustand';
import { Terminal, TerminalLine, Server, ServerStatus } from '@/types';
import { wsService } from '@/services/websocket.service';
import { analyticsService } from '@/services/analytics.service';
import { sentryService } from '@/services/sentry.service';

// SECURITY: Command validation constants
const MAX_COMMAND_LENGTH = 10000; // 10KB max command size

// SECURITY: Keywords that should never be logged
const SENSITIVE_KEYWORDS = ['token', 'key', 'password', 'secret', 'api_key', 'apikey', 'auth', 'credential', 'bearer'];

/**
 * SECURITY: Check if a command might contain sensitive data
 */
function mightContainSensitiveData(command: string): boolean {
  const lowerCommand = command.toLowerCase();
  return SENSITIVE_KEYWORDS.some(keyword => lowerCommand.includes(keyword));
}

interface TerminalState {
  terminals: Terminal[];
  servers: Server[];
  activeTerminalId: string | null;
  isLoading: boolean;
  error: string | null;

  // Terminal Actions
  setTerminals: (terminals: Terminal[]) => void;
  addTerminal: (terminal: Terminal) => void;
  removeTerminal: (terminalId: string) => void;
  setActiveTerminal: (terminalId: string | null) => void;
  addTerminalLine: (terminalId: string, line: TerminalLine) => void;
  updateTerminalCwd: (terminalId: string, cwd: string) => void;
  sendCommand: (terminalId: string, command: string) => void;
  clearTerminal: (terminalId: string) => void;

  // Server Actions
  setServers: (servers: Server[]) => void;
  addServer: (server: Server) => void;
  updateServerStatus: (serverId: string, status: ServerStatus) => void;
  addServerLog: (serverId: string, log: Server['logs'][0]) => void;
  startServer: (serverId: string) => void;
  stopServer: (serverId: string) => void;
  restartServer: (serverId: string) => void;

  // Subscriptions
  subscribeToTerminal: (terminalId: string) => () => void;
  subscribeToServerUpdates: () => () => void;
  clearError: () => void;
}

export const useTerminalStore = create<TerminalState>((set, get) => ({
  terminals: [],
  servers: [],
  activeTerminalId: null,
  isLoading: false,
  error: null,

  // Terminal Actions
  setTerminals: (terminals) => set({ terminals }),

  addTerminal: (terminal) => {
    set((state) => ({
      terminals: [...state.terminals, terminal],
    }));
  },

  removeTerminal: (terminalId) => {
    set((state) => ({
      terminals: state.terminals.filter((t) => t.id !== terminalId),
      activeTerminalId:
        state.activeTerminalId === terminalId ? null : state.activeTerminalId,
    }));
  },

  setActiveTerminal: (terminalId) => {
    set({ activeTerminalId: terminalId });
  },

  addTerminalLine: (terminalId, line) => {
    set((state) => ({
      terminals: state.terminals.map((t) =>
        t.id === terminalId
          ? { ...t, output: [...t.output, line] }
          : t
      ),
    }));
  },

  updateTerminalCwd: (terminalId, cwd) => {
    set((state) => ({
      terminals: state.terminals.map((t) =>
        t.id === terminalId
          ? { ...t, cwd }
          : t
      ),
    }));
  },

  sendCommand: (terminalId, command) => {
    // SECURITY: Validate command length
    if (command.length > MAX_COMMAND_LENGTH) {
      console.error('[Terminal Store] Command exceeds maximum length');
      sentryService.captureMessage('Terminal command rejected - too long', 'warning', {
        terminalId,
        commandLength: command.length,
      });
      return;
    }

    // Add input line locally
    const inputLine: TerminalLine = {
      id: `line-${Date.now()}`,
      content: `$ ${command}`,
      type: 'input',
      timestamp: new Date().toISOString(),
    };

    get().addTerminalLine(terminalId, inputLine);

    // Find the terminal to get its deviceId
    const terminal = get().terminals.find(t => t.id === terminalId);
    const deviceId = terminal?.deviceId;

    // SECURITY: Sanitized logging - never log command content
    console.log('[Terminal Store] sendCommand called');
    console.log('[Terminal Store] terminalId:', terminalId);
    console.log('[Terminal Store] deviceId:', deviceId);
    console.log('[Terminal Store] commandLength:', command.length);
    console.log('[Terminal Store] WebSocket connected:', wsService.isConnected);

    if (!deviceId) {
      console.error('[Terminal Store] ERROR: No deviceId found for terminal');
      sentryService.captureMessage('Terminal command failed - no deviceId', 'error', {
        terminalId,
        // SECURITY: Don't include command content in error reports
      });
    }

    if (!wsService.isConnected) {
      console.error('[Terminal Store] ERROR: WebSocket not connected');
      sentryService.captureMessage('Terminal command failed - WebSocket not connected', 'error', {
        terminalId,
        // SECURITY: Don't include command content in error reports
      });
    }

    // SECURITY: Track only non-sensitive metadata
    analyticsService.track('terminal_command_sent', {
      terminalId,
      commandLength: command.length,
      // SECURITY: Don't track deviceId to prevent correlation attacks
    });

    // Send via WebSocket with deviceId
    wsService.sendTerminalCommand(terminalId, command, deviceId);
  },

  clearTerminal: (terminalId) => {
    set((state) => ({
      terminals: state.terminals.map((t) =>
        t.id === terminalId ? { ...t, output: [] } : t
      ),
    }));
  },

  // Server Actions
  setServers: (servers) => set({ servers }),

  addServer: (server) => {
    set((state) => ({
      servers: [...state.servers, server],
    }));
  },

  updateServerStatus: (serverId, status) => {
    set((state) => ({
      servers: state.servers.map((s) =>
        s.id === serverId
          ? {
              ...s,
              status,
              startedAt: status === 'running' ? new Date().toISOString() : s.startedAt,
            }
          : s
      ),
    }));
  },

  addServerLog: (serverId, log) => {
    set((state) => ({
      servers: state.servers.map((s) =>
        s.id === serverId ? { ...s, logs: [...s.logs, log] } : s
      ),
    }));
  },

  startServer: (serverId) => {
    get().updateServerStatus(serverId, 'starting');
    // In real app, this would call the API
    // For now, simulate with timeout
    setTimeout(() => {
      get().updateServerStatus(serverId, 'running');
    }, 1500);
  },

  stopServer: (serverId) => {
    get().updateServerStatus(serverId, 'stopping');
    setTimeout(() => {
      get().updateServerStatus(serverId, 'stopped');
    }, 1000);
  },

  restartServer: (serverId) => {
    const server = get().servers.find((s) => s.id === serverId);
    if (!server) return;

    get().stopServer(serverId);
    setTimeout(() => {
      get().startServer(serverId);
    }, 1500);
  },

  // Subscriptions
  subscribeToTerminal: (terminalId) => {
    wsService.subscribeToTerminal(terminalId);

    const unsubscribeOutput = wsService.on('terminal_output', (data) => {
      // Backend sends: { terminalSessionId, output, type, exitCode, timestamp }
      if (data.terminalSessionId === terminalId) {
        const line: TerminalLine = {
          id: `line-${Date.now()}-${Math.random()}`,
          content: data.output,
          type: data.type === 'stderr' ? 'error' : 'output',
          timestamp: data.timestamp || new Date().toISOString(),
        };
        get().addTerminalLine(terminalId, line);
      }
    });

    const unsubscribeCwd = wsService.on('terminal_cwd', (data) => {
      // Backend sends: { terminalSessionId, cwd }
      if (data.terminalSessionId === terminalId) {
        get().updateTerminalCwd(terminalId, data.cwd);
      }
    });

    return () => {
      wsService.unsubscribeFromTerminal(terminalId);
      unsubscribeOutput();
      unsubscribeCwd();
    };
  },

  subscribeToServerUpdates: () => {
    const unsubscribe = wsService.on('server_status', ({ serverId, status }) => {
      get().updateServerStatus(serverId, status);
    });

    return unsubscribe;
  },

  clearError: () => set({ error: null }),
}));

// Set up global listener for terminal_cwd events
// This ensures cwd updates are received even before the terminal screen mounts
wsService.on('terminal_cwd', (data) => {
  const state = useTerminalStore.getState();
  const terminal = state.terminals.find(t => t.id === data.terminalSessionId);
  if (terminal) {
    state.updateTerminalCwd(data.terminalSessionId, data.cwd);
  }
});

export default useTerminalStore;
