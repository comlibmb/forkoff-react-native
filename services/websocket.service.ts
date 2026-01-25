import { io, Socket } from 'socket.io-client';
import { authService } from './auth.service';
import { DeviceStatus, ServerStatus, ApprovalRequest, CodeChange, ClaudeSession, DirectoryEntry } from '@/types';

const WS_URL = process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:3000';

type EventCallback<T> = (data: T) => void;

// Backend terminal output format
interface TerminalOutputEvent {
  terminalSessionId: string;
  output: string;
  type: 'stdout' | 'stderr' | 'exit';
  exitCode?: number;
  timestamp: string;
}

// Backend terminal cwd change event
interface TerminalCwdEvent {
  terminalSessionId: string;
  cwd: string;
}

// Tool status update event
interface ToolStatusUpdateEvent {
  deviceId: string;
  toolType: string;
  status: 'active' | 'inactive' | 'error';
  timestamp: string;
}

// Claude session update event
interface ClaudeSessionUpdateEvent extends ClaudeSession {
  deviceId: string;
}

// Directory listing response event
interface DirectoryListResponseEvent {
  requestId: string;
  entries: DirectoryEntry[];
  currentPath: string;
}

// Tab completion response event
interface TabCompleteResponseEvent {
  requestId: string;
  completions: string[];
  commonPrefix?: string;
}

// Diff hunk for code changes
export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: string[];
}

// Transcript entry
export interface TranscriptEntry {
  id: string;
  parentId?: string;
  type: 'user' | 'assistant' | 'system' | 'tool_use' | 'tool_result';
  timestamp: string;
  lineNumber: number;
  content?: {
    role?: 'user' | 'assistant';
    text?: string;
    toolName?: string;
    toolInput?: any;
    isError?: boolean;
    filePath?: string;
    diff?: DiffHunk[];
  };
}

// Transcript history event
interface TranscriptHistoryEvent {
  sessionKey: string;
  entries: TranscriptEntry[];
  totalEntries: number;
  offset: number;
  hasMore: boolean;
}

// Transcript update event
interface TranscriptUpdateEvent {
  sessionKey: string;
  entry: TranscriptEntry;
}

interface EventCallbacks {
  device_status: EventCallback<{ deviceId: string; status: DeviceStatus; lastSeenAt?: string }>[];
  terminal_output: EventCallback<TerminalOutputEvent>[];
  terminal_cwd: EventCallback<TerminalCwdEvent>[];
  server_status: EventCallback<{ serverId: string; status: ServerStatus }>[];
  approval_request: EventCallback<ApprovalRequest>[];
  code_change: EventCallback<CodeChange>[];
  tool_status_update: EventCallback<ToolStatusUpdateEvent>[];
  claude_session_update: EventCallback<ClaudeSessionUpdateEvent>[];
  directory_list_response: EventCallback<DirectoryListResponseEvent>[];
  tab_complete_response: EventCallback<TabCompleteResponseEvent>[];
  transcript_history: EventCallback<TranscriptHistoryEvent>[];
  transcript_update: EventCallback<TranscriptUpdateEvent>[];
  connected: EventCallback<void>[];
  disconnected: EventCallback<void>[];
  error: EventCallback<Error>[];
}

class WebSocketService {
  private socket: Socket | null = null;
  private isConnecting = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private callbacks: EventCallbacks = {
    device_status: [],
    terminal_output: [],
    terminal_cwd: [],
    server_status: [],
    approval_request: [],
    code_change: [],
    tool_status_update: [],
    claude_session_update: [],
    directory_list_response: [],
    tab_complete_response: [],
    transcript_history: [],
    transcript_update: [],
    connected: [],
    disconnected: [],
    error: [],
  };

  async connect(): Promise<void> {
    if (this.socket?.connected || this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    try {
      // Get token from Supabase auth service
      const token = await authService.getAccessToken();

      this.socket = io(WS_URL, {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
      });

      this.setupListeners();
    } catch (error) {
      this.isConnecting = false;
      throw error;
    }
  }

  private setupListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      console.log('[WS] Mobile app connected to WebSocket');
      console.log('[WS] Socket ID:', this.socket?.id);
      this.emitInternal('connected');
    });

    this.socket.on('disconnect', () => {
      this.emitInternal('disconnected');
    });

    this.socket.on('connect_error', (error) => {
      this.isConnecting = false;
      this.emitInternal('error', error);
    });

    // Application events
    this.socket.on('device_status', (data) => {
      this.emitInternal('device_status', data);
    });

    this.socket.on('terminal_output', (data) => {
      this.emitInternal('terminal_output', data);
    });

    this.socket.on('terminal_cwd', (data) => {
      this.emitInternal('terminal_cwd', data);
    });

    this.socket.on('server_status', (data) => {
      this.emitInternal('server_status', data);
    });

    this.socket.on('approval_request', (data) => {
      this.emitInternal('approval_request', data);
    });

    this.socket.on('code_change', (data) => {
      this.emitInternal('code_change', data);
    });

    // Claude-specific events
    this.socket.on('tool_status_update', (data) => {
      this.emitInternal('tool_status_update', data);
    });

    this.socket.on('claude_session_update', (data) => {
      this.emitInternal('claude_session_update', data);
    });

    this.socket.on('directory_list_response', (data) => {
      this.emitInternal('directory_list_response', data);
    });

    this.socket.on('tab_complete_response', (data) => {
      this.emitInternal('tab_complete_response', data);
    });

    // Transcript events
    this.socket.on('transcript_history', (data) => {
      console.log('[WS] GOT transcript_history');
      this.emitInternal('transcript_history', data);
    });

    this.socket.on('transcript_update', (data) => {
      console.log('[WS] GOT transcript_update:', data?.entry?.type);
      this.emitInternal('transcript_update', data);
    });
  }

  private emitInternal<K extends keyof EventCallbacks>(
    event: K,
    data?: Parameters<EventCallbacks[K][0]>[0]
  ): void {
    const callbacks = this.callbacks[event];
    callbacks.forEach((callback) => {
      try {
        (callback as (data: unknown) => void)(data);
      } catch (error) {
        console.error(`Error in ${event} callback:`, error);
      }
    });
  }

  // Public emit method to send events to the server
  emit(event: string, data?: unknown): void {
    console.log(`[WS] emit(${event}):`, JSON.stringify(data)?.substring(0, 100));
    console.log(`[WS] socket connected:`, this.socket?.connected);
    this.socket?.emit(event, data);
  }

  on<K extends keyof EventCallbacks>(
    event: K,
    callback: EventCallbacks[K][0]
  ): () => void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.callbacks[event] as any[]).push(callback);

    // Return unsubscribe function
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const index = (this.callbacks[event] as any[]).indexOf(callback);
      if (index > -1) {
        this.callbacks[event].splice(index, 1);
      }
    };
  }

  off<K extends keyof EventCallbacks>(
    event: K,
    callback: EventCallbacks[K][0]
  ): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const index = (this.callbacks[event] as any[]).indexOf(callback);
    if (index > -1) {
      this.callbacks[event].splice(index, 1);
    }
  }

  // Subscribe to specific device updates
  subscribeToDevice(deviceId: string): void {
    this.socket?.emit('subscribe_device', { deviceId });
  }

  unsubscribeFromDevice(deviceId: string): void {
    this.socket?.emit('unsubscribe_device', { deviceId });
  }

  // Subscribe to terminal output
  subscribeToTerminal(terminalId: string): void {
    this.socket?.emit('terminal_subscribe', { terminalSessionId: terminalId });
  }

  unsubscribeFromTerminal(terminalId: string): void {
    this.socket?.emit('terminal_unsubscribe', { terminalSessionId: terminalId });
  }

  // Send terminal command
  sendTerminalCommand(terminalId: string, command: string, deviceId?: string): void {
    console.log(`[WS] Sending terminal_command to device ${deviceId}:`, command);
    this.socket?.emit('terminal_command', {
      terminalSessionId: terminalId,
      command,
      deviceId
    });
  }

  // Create/initialize terminal session on device
  createTerminalSession(terminalId: string, deviceId: string, cwd: string = '~'): void {
    console.log(`[WS] Creating terminal session ${terminalId} on device ${deviceId}`);
    this.socket?.emit('terminal_create', {
      terminalSessionId: terminalId,
      deviceId,
      cwd
    });
  }

  // Respond to approval request
  respondToApproval(requestId: string, approved: boolean): void {
    this.socket?.emit('approval_response', { requestId, approved });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnecting = false;
    this.reconnectAttempts = 0;
  }

  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const wsService = new WebSocketService();
export default wsService;
