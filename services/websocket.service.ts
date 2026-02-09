import { io, Socket } from 'socket.io-client';
import { authService } from './auth.service';
import { sentryService } from './sentry.service';
import { analyticsService } from './analytics.service';
import { DeviceStatus, ServerStatus, ApprovalRequest, CodeChange, ClaudeSession, DirectoryEntry } from '@/types';
import { KeyExchangeInit, KeyExchangeAck, EncryptedMessage } from '@/services/crypto/types';

// SECURITY: Determine if we're in development mode
const IS_DEV_BUILD = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV === 'development';

// SECURITY: Get WebSocket URL and validate protocol
const RAW_WS_URL = process.env.EXPO_PUBLIC_WS_URL || 'wss://api.forkoff.app';

// SECURITY: Enforce secure WebSocket in production
function getSecureWsUrl(): string {
  const url = RAW_WS_URL;

  // In development, allow insecure connections to local network addresses
  if (IS_DEV_BUILD) {
    if (url.startsWith('ws://localhost') || url.startsWith('ws://127.0.0.1') || url.startsWith('ws://192.168.') || url.startsWith('ws://10.') || url.startsWith('ws://172.')) {
      console.warn('[WS] SECURITY WARNING: Using insecure WebSocket connection (development only)');
      return url;
    }
  }

  // In production or for non-local URLs, enforce wss://
  if (url.startsWith('ws://') && !url.includes('localhost') && !url.includes('127.0.0.1') && !url.includes('192.168.') && !url.includes('10.') && !url.includes('172.')) {
    console.warn('[WS] SECURITY: Upgrading insecure WebSocket URL to wss://');
    return url.replace('ws://', 'wss://');
  }

  return url;
}

const WS_URL = getSecureWsUrl();

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

// Read file response event
interface ReadFileResponseEvent {
  requestId: string;
  content?: string;
  exists: boolean;
  fileName: string;
  error?: string;
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

// Claude message event (direct SDK streaming)
interface ClaudeMessageEvent {
  deviceId: string;
  sessionKey: string;
  message: {
    id: string;
    type: 'user' | 'assistant' | 'tool_use' | 'tool_result';
    content?: string;
    toolName?: string;
    toolInput?: any;
    isError?: boolean;
    partial?: boolean;
  };
}

// Thinking state event
interface ThinkingStateEvent {
  deviceId: string;
  sessionKey: string;
  thinking: boolean;
}

// Permission request event
interface PermissionRequestEvent {
  deviceId: string;
  sessionKey: string;
  requestId: string;
  type: 'tool_use' | 'file_write' | 'bash_command';
  toolName?: string;
  description: string;
  details?: any;
}

// Claude approval request event (yes/no/plan prompts from CLI)
interface ClaudeApprovalRequestEvent {
  approvalId: string;
  terminalSessionId: string;
  sessionKey?: string;
  deviceId?: string;
  context: string[];       // Recent output lines for context
  options: string[];       // Available options (e.g., ['y:yes', 'n:no', 'p:plan'])
  promptText: string;      // The actual prompt text
  timestamp: string;
}

// RPC request event
interface RpcRequestEvent {
  deviceId: string;
  requestId: string;
  method: string;
  params: any;
}

// RPC response event
interface RpcResponseEvent {
  requestId: string;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}

// Session connected/disconnected events
interface SessionConnectedEvent {
  deviceId: string;
  sessionId: string;
}

// Session alive event (keep-alive from CLI)
interface SessionAliveEvent {
  sessionId: string;
  thinking: boolean;
  mode: 'local' | 'remote';
  timestamp: number;
}

// Claude session event (ready, switch mode, etc.)
interface ClaudeSessionEventData {
  deviceId: string;
  sessionKey: string;
  event: {
    type: 'switch' | 'message' | 'permission-mode-changed' | 'ready';
    mode?: string;
    message?: string;
  };
}

// Thinking content event (extended thinking text)
export interface ThinkingContentEvent {
  sessionKey?: string;
  thinkingId: string;
  content: string;
  partial: boolean;
}

// Token usage event
export interface TokenUsageEvent {
  sessionKey?: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

// Task info structure
export interface TaskInfo {
  id: string;
  subject: string;
  status: 'pending' | 'in_progress' | 'completed';
  activeForm?: string;
}

// Task progress event
export interface TaskProgressEvent {
  sessionKey?: string;
  type: 'created' | 'updated' | 'completed' | 'list';
  task?: TaskInfo;
  tasks?: TaskInfo[];
}

// Achievement unlocked event
export interface AchievementUnlockedEvent {
  achievement: {
    id: string;
    key: string;
    name: string;
    description: string;
    category: string;
    iconName: string;
    tier: string;
    threshold: string;
  };
  unlockedAt: string;
}

// Prompt queued event
export interface PromptQueuedEvent {
  queueItemId: string;
  deviceId: string;
  sessionKey?: string;
  prompt: string;
  rateLimitReason?: string;
  retryAfter?: string;
  createdAt: string;
}

// Queue item executing event
export interface QueueItemExecutingEvent {
  queueItemId: string;
  deviceId: string;
  sessionKey?: string;
  prompt: string;
}

// Queue item executed event
export interface QueueItemExecutedEvent {
  queueItemId: string;
  success: boolean;
  errorMessage?: string;
  executedAt: string;
}

// Queue updated event
export interface QueueUpdatedEvent {
  pendingCount: number;
}

// Phone session conflict event (Pro tier - single phone session)
export interface PhoneSessionConflictEvent {
  existingDeviceId: string;
  existingDeviceName?: string;
  message: string;
}

// Claim phone session event
export interface ClaimPhoneSessionEvent {
  success: boolean;
  previousDeviceId?: string;
}

// Limit reached event
export interface LimitReachedEvent {
  limitType: 'messages_daily' | 'sessions_monthly' | 'projects_max' | 'devices_max' | 'repairs_monthly';
  currentUsage: number;
  limit: number;
  resetAt?: string;
}

// Session claimed event (when another device takes over)
export interface SessionClaimedEvent {
  message: string;
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
  read_file_response: EventCallback<ReadFileResponseEvent>[];
  tab_complete_response: EventCallback<TabCompleteResponseEvent>[];
  transcript_history: EventCallback<TranscriptHistoryEvent>[];
  transcript_update: EventCallback<TranscriptUpdateEvent>[];
  claude_message: EventCallback<ClaudeMessageEvent>[];
  thinking_state: EventCallback<ThinkingStateEvent>[];
  permission_request: EventCallback<PermissionRequestEvent>[];
  claude_approval_request: EventCallback<ClaudeApprovalRequestEvent>[];
  rpc_request: EventCallback<RpcRequestEvent>[];
  rpc_response: EventCallback<RpcResponseEvent>[];
  session_connected: EventCallback<SessionConnectedEvent>[];
  session_disconnected: EventCallback<SessionConnectedEvent>[];
  session_alive: EventCallback<SessionAliveEvent>[];
  claude_session_event: EventCallback<ClaudeSessionEventData>[];
  sdk_session_history: EventCallback<{ sessionKey: string; entries: TranscriptEntry[]; totalEntries: number; hasMore: boolean }>[];
  thinking_content: EventCallback<ThinkingContentEvent>[];
  token_usage: EventCallback<TokenUsageEvent>[];
  task_progress: EventCallback<TaskProgressEvent>[];
  achievement_unlocked: EventCallback<AchievementUnlockedEvent>[];
  prompt_queued: EventCallback<PromptQueuedEvent>[];
  queue_item_executing: EventCallback<QueueItemExecutingEvent>[];
  queue_item_executed: EventCallback<QueueItemExecutedEvent>[];
  queue_updated: EventCallback<QueueUpdatedEvent>[];
  phone_session_conflict: EventCallback<PhoneSessionConflictEvent>[];
  claim_phone_session_result: EventCallback<ClaimPhoneSessionEvent>[];
  limit_reached: EventCallback<LimitReachedEvent>[];
  session_claimed: EventCallback<SessionClaimedEvent>[];
  // E2EE events
  encrypted_key_exchange_init: EventCallback<KeyExchangeInit>[];
  encrypted_key_exchange_ack: EventCallback<KeyExchangeAck>[];
  encrypted_message: EventCallback<EncryptedMessage>[];
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
    read_file_response: [],
    tab_complete_response: [],
    transcript_history: [],
    transcript_update: [],
    claude_message: [],
    thinking_state: [],
    permission_request: [],
    claude_approval_request: [],
    rpc_request: [],
    rpc_response: [],
    session_connected: [],
    session_disconnected: [],
    session_alive: [],
    claude_session_event: [],
    sdk_session_history: [],
    thinking_content: [],
    token_usage: [],
    task_progress: [],
    achievement_unlocked: [],
    prompt_queued: [],
    queue_item_executing: [],
    queue_item_executed: [],
    queue_updated: [],
    phone_session_conflict: [],
    claim_phone_session_result: [],
    limit_reached: [],
    session_claimed: [],
    encrypted_key_exchange_init: [],
    encrypted_key_exchange_ack: [],
    encrypted_message: [],
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
        auth: {
          token,
          clientType: 'user-scoped', // Mobile is user-scoped (receives all user's session updates)
        },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
      });

      this.setupListeners();
    } catch (error) {
      this.isConnecting = false;
      sentryService.captureException(error, { context: 'websocket_connect' });
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

      // Add breadcrumb for connection
      sentryService.addBreadcrumb('WebSocket connected', 'websocket', {
        socketId: this.socket?.id,
      });

      // Track session connected
      analyticsService.track('websocket_connected');

      this.emitInternal('connected');
    });

    this.socket.on('disconnect', (reason) => {
      // Add breadcrumb for disconnection
      sentryService.addBreadcrumb('WebSocket disconnected', 'websocket', {
        reason,
      });

      // Track session disconnected
      analyticsService.track('websocket_disconnected', { reason });

      this.emitInternal('disconnected');
    });

    this.socket.on('connect_error', (error) => {
      this.isConnecting = false;

      // Capture connection errors to Sentry
      sentryService.captureException(error, {
        context: 'websocket_connect_error',
        reconnectAttempts: this.reconnectAttempts,
      });

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

    this.socket.on('read_file_response', (data) => {
      console.log('[WS] GOT read_file_response:', data?.fileName, data?.exists);
      this.emitInternal('read_file_response', data);
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

    // Direct SDK streaming events
    this.socket.on('claude_message', (data) => {
      console.log('[WS] GOT claude_message:', data?.message?.type, data?.message?.partial ? '(partial)' : '');
      this.emitInternal('claude_message', data);
    });

    this.socket.on('thinking_state', (data) => {
      console.log('[WS] GOT thinking_state:', data?.thinking);
      this.emitInternal('thinking_state', data);
    });

    this.socket.on('permission_request', (data) => {
      console.log('[WS] GOT permission_request:', data?.type, data?.toolName);
      this.emitInternal('permission_request', data);
    });

    this.socket.on('claude_approval_request', (data) => {
      console.log('[WS] GOT claude_approval_request:', data?.approvalId, data?.promptText?.substring(0, 50));
      this.emitInternal('claude_approval_request', data);
    });

    // RPC events
    this.socket.on('rpc_request', (data) => {
      console.log('[WS] GOT rpc_request:', data?.method);
      this.emitInternal('rpc_request', data);
    });

    this.socket.on('rpc_response', (data) => {
      console.log('[WS] GOT rpc_response:', data?.requestId);
      this.emitInternal('rpc_response', data);
    });

    // Session lifecycle events (new session-scoped architecture)
    this.socket.on('session_connected', (data) => {
      console.log('[WS] GOT session_connected:', data?.sessionId);
      this.emitInternal('session_connected', data);
    });

    this.socket.on('session_disconnected', (data) => {
      console.log('[WS] GOT session_disconnected:', data?.sessionId);
      this.emitInternal('session_disconnected', data);
    });

    this.socket.on('session_alive', (data) => {
      // Keep-alive is verbose, don't log by default
      this.emitInternal('session_alive', data);
    });

    this.socket.on('claude_session_event', (data) => {
      console.log('[WS] GOT claude_session_event:', data?.event?.type);
      this.emitInternal('claude_session_event', data);
    });

    this.socket.on('sdk_session_history', (data) => {
      console.log('[WS] GOT sdk_session_history:', data?.sessionKey);
      this.emitInternal('sdk_session_history', data);
    });

    // Extended thinking content events
    this.socket.on('thinking_content', (data) => {
      if (data?.content || !data?.partial) {
        console.log('[WS] GOT thinking_content:', data?.thinkingId, data?.partial ? '(partial)' : '(complete)');
      }
      this.emitInternal('thinking_content', data);
    });

    // Token usage events
    this.socket.on('token_usage', (data) => {
      console.log('[WS] GOT token_usage:', data?.usage?.inputTokens, '/', data?.usage?.outputTokens);
      this.emitInternal('token_usage', data);
    });

    // Task progress events
    this.socket.on('task_progress', (data) => {
      console.log('[WS] GOT task_progress:', data?.type, data?.task?.subject || `${data?.tasks?.length} tasks`);
      this.emitInternal('task_progress', data);
    });

    // Achievement events
    this.socket.on('achievement_unlocked', (data) => {
      console.log('[WS] GOT achievement_unlocked:', data?.achievement?.name);
      this.emitInternal('achievement_unlocked', data);
    });

    // Queue events
    this.socket.on('prompt_queued', (data) => {
      console.log('[WS] GOT prompt_queued:', data?.queueItemId);
      this.emitInternal('prompt_queued', data);
    });

    this.socket.on('queue_item_executing', (data) => {
      console.log('[WS] GOT queue_item_executing:', data?.queueItemId);
      this.emitInternal('queue_item_executing', data);
    });

    this.socket.on('queue_item_executed', (data) => {
      console.log('[WS] GOT queue_item_executed:', data?.queueItemId, data?.success);
      this.emitInternal('queue_item_executed', data);
    });

    this.socket.on('queue_updated', (data) => {
      console.log('[WS] GOT queue_updated:', data?.pendingCount);
      this.emitInternal('queue_updated', data);
    });

    // Phone session conflict events (Pro tier)
    this.socket.on('phone_session_conflict', (data) => {
      console.log('[WS] GOT phone_session_conflict:', data?.existingDeviceId);
      this.emitInternal('phone_session_conflict', data);
    });

    this.socket.on('claim_phone_session_result', (data) => {
      console.log('[WS] GOT claim_phone_session_result:', data?.success);
      this.emitInternal('claim_phone_session_result', data);
    });

    // Limit reached events
    this.socket.on('limit_reached', (data) => {
      console.log('[WS] GOT limit_reached:', data?.limitType);
      this.emitInternal('limit_reached', data);
    });

    // Session claimed events (when another device takes over)
    this.socket.on('session_claimed', (data) => {
      console.log('[WS] GOT session_claimed:', data?.message);
      this.emitInternal('session_claimed', data);
    });

    // E2EE events
    this.socket.on('encrypted_key_exchange_init', (data) => {
      console.log('[WS] GOT encrypted_key_exchange_init:', data?.senderDeviceId);
      this.emitInternal('encrypted_key_exchange_init', data);
    });

    this.socket.on('encrypted_key_exchange_ack', (data) => {
      console.log('[WS] GOT encrypted_key_exchange_ack:', data?.recipientDeviceId);
      this.emitInternal('encrypted_key_exchange_ack', data);
    });

    this.socket.on('encrypted_message', (data) => {
      console.log('[WS] GOT encrypted_message:', data?.senderDeviceId);
      this.emitInternal('encrypted_message', data);
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
    // SECURITY: Don't log potentially sensitive data
    console.log(`[WS] emit(${event})`);
    console.log(`[WS] socket connected:`, this.socket?.connected);
    this.socket?.emit(event, data);
  }

  // Public emit method with acknowledgment callback for getting server response
  emitWithAck<T = unknown>(event: string, data?: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      // SECURITY: Don't log potentially sensitive data
      console.log(`[WS] emitWithAck(${event})`);
      if (!this.socket?.connected) {
        reject(new Error('WebSocket not connected'));
        return;
      }
      this.socket.emit(event, data, (response: T | { error: string }) => {
        if (response && typeof response === 'object' && 'error' in response) {
          reject(new Error((response as { error: string }).error));
        } else {
          resolve(response as T);
        }
      });
    });
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

  // Send terminal command (legacy)
  sendTerminalCommand(terminalId: string, command: string, deviceId?: string): void {
    // SECURITY: Never log command content
    console.log(`[WS] Sending terminal_command to device ${deviceId}, length: ${command.length}`);
    this.socket?.emit('terminal_command', {
      terminalSessionId: terminalId,
      command,
      deviceId
    });
  }

  // Send user message (new SDK-based approach)
  sendUserMessage(
    deviceId: string,
    message: string,
    options?: {
      sessionKey?: string;
      permissionMode?: 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan';
      model?: string;
    }
  ): void {
    // SECURITY: Never log message content
    console.log(`[WS] Sending user_message to device ${deviceId}, length: ${message.length}`);
    this.socket?.emit('user_message', {
      deviceId,
      message,
      sessionKey: options?.sessionKey,
      mode: options ? {
        permissionMode: options.permissionMode,
        model: options.model,
      } : undefined
    });
  }

  // Abort current Claude operation
  abortClaude(deviceId: string, sessionKey?: string): void {
    console.log(`[WS] Sending claude_abort to device ${deviceId}`);
    this.socket?.emit('claude_abort', {
      deviceId,
      sessionKey
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

  // Respond to Claude approval request (yes/no/plan prompts)
  respondToClaudeApproval(
    approvalId: string,
    response: string,
    options?: {
      deviceId?: string;
      sessionKey?: string;
    }
  ): void {
    console.log(`[WS] Sending claude_approval_response: ${approvalId} -> ${response}`);
    this.socket?.emit('claude_approval_response', {
      approvalId,
      response,
      deviceId: options?.deviceId,
      sessionKey: options?.sessionKey,
    });
  }

  // Request session history from CLI via server
  requestSessionHistory(
    deviceId: string,
    sessionKey: string,
    options?: { limit?: number; offset?: number }
  ): void {
    console.log(`[WS] Requesting session history for ${sessionKey}`);
    this.socket?.emit('sdk_session_history', {
      deviceId,
      sessionKey,
      limit: options?.limit ?? 400,
      offset: options?.offset ?? 0,
    });
  }

  // Read a file from device (e.g., CLAUDE.md)
  readFile(deviceId: string, filePath: string, requestId: string): void {
    console.log(`[WS] Requesting read_file: ${filePath}`);
    this.socket?.emit('read_file', {
      deviceId,
      filePath,
      requestId,
    });
  }

  // Claim phone session (take over from another device)
  claimPhoneSession(): void {
    console.log('[WS] Claiming phone session');
    this.socket?.emit('claim_phone_session', {});
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
