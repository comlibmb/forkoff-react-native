import { io, Socket } from 'socket.io-client';
import * as Device from 'expo-device';
import { pairingService } from './pairing.service';
import { sentryService } from './sentry.service';
import { analyticsService } from './analytics.service';
import { DeviceStatus, ServerStatus, ApprovalRequest, CodeChange, ClaudeSession, DirectoryEntry } from '@/types';
import { KeyExchangeInit, KeyExchangeAck, EncryptedMessage } from '@/services/crypto/types';
import { E2EEManager } from '@/services/crypto/e2eeManager';
import { useE2EEStore } from '@/stores/e2ee.store';

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

let WS_URL = getSecureWsUrl();

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
  requestedBy?: string;
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

// Tool activity event (non-blocking notification of tool execution)
export interface ToolActivityEvent {
  deviceId?: string;
  terminalSessionId: string;
  sessionKey?: string;
  toolName: string;
  toolId: string;
  inputSummary: string;
  timestamp: string;
}

// Permission prompt event (interactive approval from CLI hook system)
export interface PermissionPromptEvent {
  promptId: string;
  deviceId?: string;
  terminalSessionId: string;
  sessionKey?: string;
  toolName: string;
  toolInput: any;
  toolUseId: string;
  timestamp: string;
}

// Pending permissions sync event (sent on take-over to catch up mobile with pending prompts)
export interface PendingPermissionsSyncEvent {
  deviceId?: string;
  sessionKey: string;
  terminalSessionId: string;
  prompts: PermissionPromptEvent[];
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
  terminalSessionId?: string;
  thinkingId: string;
  content: string;
  partial: boolean;
}

// Token usage event
export interface TokenUsageEvent {
  sessionKey?: string;
  terminalSessionId?: string;
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
  terminalSessionId?: string;
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

// Session loading state event (from CLI)
export interface SessionLoadingEvent {
  sessionKey: string;
  state: 'loading' | 'ready' | 'error';
  error?: string;
}

// Pair device acknowledgment event (from CLI via relay)
export interface PairDeviceAckEvent {
  deviceId: string;
  deviceName: string;
  platform: string;
  pairingCode: string;
  // Cloud relay fields (present when paired via cloud relay)
  pairId?: string;
  mobileRelayToken?: string;
}

// Pair device rejection event
export interface PairDeviceRejectEvent {
  pairingCode: string;
  reason: string;
}

interface EventCallbacks {
  device_status: EventCallback<{ deviceId: string; status: DeviceStatus; lastSeenAt?: string; cliVersion?: string }>[];
  terminal_output: EventCallback<TerminalOutputEvent>[];
  terminal_cwd: EventCallback<TerminalCwdEvent>[];
  server_status: EventCallback<{ serverId: string; status: ServerStatus }>[];
  approval_request: EventCallback<ApprovalRequest>[];
  code_change: EventCallback<CodeChange>[];
  tool_status_update: EventCallback<ToolStatusUpdateEvent>[];
  claude_session_update: EventCallback<ClaudeSessionUpdateEvent>[];
  claude_session_batch_update: EventCallback<{ sessions: ClaudeSessionUpdateEvent[] }>[];
  directory_list_response: EventCallback<DirectoryListResponseEvent>[];
  read_file_response: EventCallback<ReadFileResponseEvent>[];
  tab_complete_response: EventCallback<TabCompleteResponseEvent>[];
  transcript_history: EventCallback<TranscriptHistoryEvent>[];
  transcript_update: EventCallback<TranscriptUpdateEvent>[];
  claude_message: EventCallback<ClaudeMessageEvent>[];
  thinking_state: EventCallback<ThinkingStateEvent>[];
  permission_request: EventCallback<PermissionRequestEvent>[];
  claude_approval_request: EventCallback<ClaudeApprovalRequestEvent>[];
  tool_activity: EventCallback<ToolActivityEvent>[];
  permission_prompt: EventCallback<PermissionPromptEvent>[];
  pending_permissions_sync: EventCallback<PendingPermissionsSyncEvent>[];
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
  // Session loading state
  session_loading: EventCallback<SessionLoadingEvent>[];
  // Usage analytics sync events
  usage_stats_sync: EventCallback<any>[];
  daily_usage_sync: EventCallback<any>[];
  streak_info_sync: EventCallback<any>[];
  // Pairing events
  pair_device_ack: EventCallback<PairDeviceAckEvent>[];
  pair_device_reject: EventCallback<PairDeviceRejectEvent>[];
  // E2EE events
  encrypted_key_exchange_init: EventCallback<KeyExchangeInit>[];
  encrypted_key_exchange_ack: EventCallback<KeyExchangeAck>[];
  encrypted_message: EventCallback<EncryptedMessage>[];
  connected: EventCallback<void>[];
  disconnected: EventCallback<void>[];
  error: EventCallback<Error>[];
}

// Queued message for offline buffering
interface QueuedMessage {
  event: string;
  data: unknown;
  queuedAt: number;
}

// SECURITY: Mobile→CLI events that carry sensitive user data.
// When E2EE is active, these are encrypted as `encrypted_message` (API sees only opaque blob).
// When E2EE is NOT active (fallback), sent as plaintext so API can forward normally.
// No queue — events always flow immediately.
const ENFORCED_SENSITIVE_EVENTS = new Set<string>([
  'user_message',
  'permission_response',
  'claude_approval_response',
  'approval_response',
  'claude_resume_session',
  'claude_start_session',
  'claude_stop_session',
  'terminal_command',
  'terminal_create',
  'terminal_resize',
  'terminal_close',
  'directory_list',
  'read_file',
  'transcript_fetch',
  'transcript_subscribe',
  'transcript_unsubscribe',
  'permission_rules_sync',
  'session_settings_update',
  'transcript_subscribe_sdk',
  'tab_complete',
  'sdk_session_history',
  'claude_abort',
  'usage_stats_request',
]);


// SECURITY: Inbound events from CLI that MUST arrive via E2EE decryption when active.
// Plaintext versions are silently dropped when E2EE is established, preventing injection.
// SECURITY: Inbound events from CLI that MUST arrive via E2EE decryption when active.
// NOTE: Only peer-originated events belong here. API-originated events (sdk_session_history)
// are excluded because the API server generates them — they cannot be E2EE encrypted.
const ENFORCED_INBOUND_EVENTS = new Set([
  'terminal_output', 'read_file_response', 'directory_list_response',
  'permission_prompt', 'transcript_history', 'transcript_update',
  'thinking_content', 'task_progress', 'tool_activity',
  'claude_approval_request', 'approval_request', 'rpc_response',
  'claude_session_update', 'claude_session_batch_update', 'terminal_cwd', 'token_usage',
  'pending_permissions_sync', 'claude_session_event', 'file_changed',
  'usage_stats_sync', 'daily_usage_sync', 'streak_info_sync',
  'tool_status_update', 'session_loading',
]);


// SECURITY: Whitelist of events allowed to arrive via the encrypted_message channel.
// Only events the CLI legitimately sends via E2EE are listed. This prevents a
// compromised CLI from injecting infrastructure events (connected, error, etc.).
const ALLOWED_ENCRYPTED_EVENTS = new Set([
  'terminal_output',
  'read_file_response',
  'directory_list_response',
  'permission_prompt',
  'transcript_history',
  'transcript_update',
  'thinking_content',
  'task_progress',
  'tool_activity',
  'claude_approval_request',
  'approval_request',
  'rpc_response',
  'claude_session_update',
  'claude_session_batch_update',
  'terminal_cwd',
  'file_changed',
  'token_usage',
  'pending_permissions_sync',
  'claude_session_event',
  'usage_stats_sync',
  'daily_usage_sync',
  'streak_info_sync',
  'tool_status_update',
  'session_loading',
]);

class WebSocketService {
  private socket: Socket | null = null;
  private isConnecting = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = Infinity;
  private reconnectDelay = 1000;
  // Track subscriptions so we can re-subscribe after reconnect
  private subscribedDevices = new Set<string>();
  // Critical message queue — buffers messages when disconnected, flushes on reconnect
  private pendingMessages: QueuedMessage[] = [];
  private static readonly MAX_QUEUE_SIZE = 50;
  private static readonly MESSAGE_TTL_MS = 2 * 60 * 1000; // 2 minutes
  // E2EE
  private e2eeManager: E2EEManager | null = null;
  private e2eeInitPromise: Promise<void> | null = null;
  // Unique mobile device ID for E2EE (generated once, used as sender in key exchange)
  private mobileDeviceId: string = `mobile-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  // SECURITY: Track if any E2EE session has been established (for inbound enforcement)
  private _anyE2EESessionEstablished = false;
  // Tracks devices with key exchange in progress (async guard against duplicate inits)
  private _pendingKeyExchangeInits = new Set<string>();
  private callbacks: EventCallbacks = {
    device_status: [],
    terminal_output: [],
    terminal_cwd: [],
    server_status: [],
    approval_request: [],
    code_change: [],
    tool_status_update: [],
    claude_session_update: [],
    claude_session_batch_update: [],
    directory_list_response: [],
    read_file_response: [],
    tab_complete_response: [],
    transcript_history: [],
    transcript_update: [],
    claude_message: [],
    thinking_state: [],
    permission_request: [],
    claude_approval_request: [],
    tool_activity: [],
    permission_prompt: [],
    pending_permissions_sync: [],
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
    session_loading: [],
    usage_stats_sync: [],
    daily_usage_sync: [],
    streak_info_sync: [],
    pair_device_ack: [],
    pair_device_reject: [],
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
      // Get device identity from SecureStore (no Supabase)
      const mobileDeviceId = await pairingService.getMobileDeviceId();
      this.mobileDeviceId = mobileDeviceId;

      // Load custom relay URL if configured (self-hosting)
      const customRelayUrl = await pairingService.getRelayUrl();
      if (customRelayUrl) {
        // SECURITY: Enforce wss:// for non-local custom URLs in production
        const isLocal = /^wss?:\/\/(localhost|127\.0\.0\.1|192\.168\.|10\.|172\.)/.test(customRelayUrl);
        if (!IS_DEV_BUILD && !isLocal && customRelayUrl.startsWith('ws://')) {
          WS_URL = customRelayUrl.replace('ws://', 'wss://');
        } else {
          WS_URL = customRelayUrl;
        }
      } else {
        WS_URL = getSecureWsUrl();
      }

      // Load relay token for cloud relay authentication (if available)
      const relayToken = await pairingService.getRelayToken();

      this.socket = io(WS_URL, {
        auth: {
          mobileDeviceId,
          clientType: 'mobile',
          deviceName: Device.deviceName || Device.modelName || 'Mobile',
          ...(relayToken ? { relayToken } : {}),
        },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        reconnectionDelayMax: 15000,
        randomizationFactor: 0.5,
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
      const wasReconnect = this.reconnectAttempts > 0;
      const reconnectAttempts = this.reconnectAttempts;
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

      // Re-subscribe to device rooms after reconnect (room memberships are lost)
      if (wasReconnect) {
        console.log('[WS] Reconnected — re-subscribing to rooms');
        analyticsService.track('websocket_reconnected', { attempts: reconnectAttempts });
        this.resubscribeAll();
        this.flushQueue();
      }

      this.emitInternal('connected');
    });

    this.socket.on('disconnect', (reason) => {
      // Add breadcrumb for disconnection
      sentryService.addBreadcrumb('WebSocket disconnected', 'websocket', {
        reason,
      });

      // Track session disconnected
      analyticsService.track('websocket_disconnected', { reason });

      // Clear pending key exchange locks so reconnect can re-initiate
      this._pendingKeyExchangeInits.clear();

      this.emitInternal('disconnected');
    });

    this.socket.on('connect_error', (error) => {
      this.isConnecting = false;
      this.reconnectAttempts++;

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
      console.log('[WS] GOT read_file_response:', data?.requestId);
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
      console.log('[WS] GOT claude_approval_request:', data?.approvalId);
      this.emitInternal('claude_approval_request', data);
    });

    // Tool activity notifications (non-blocking)
    this.socket.on('tool_activity', (data) => {
      console.log('[WS] GOT tool_activity:', data?.toolName);
      this.emitInternal('tool_activity', data);
    });

    // Permission prompt (interactive approval from CLI hook system)
    this.socket.on('permission_prompt', (data) => {
      console.log('[WS] GOT permission_prompt:', data?.promptId, data?.toolName);
      this.emitInternal('permission_prompt', data);
    });

    // Pending permissions sync (on take-over)
    this.socket.on('pending_permissions_sync', (data) => {
      console.log('[WS] GOT pending_permissions_sync:', data?.prompts?.length, 'prompts');
      this.emitInternal('pending_permissions_sync', data);
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
      console.log('[WS] GOT sdk_session_history:', data?.entries?.length ?? 0, 'entries');
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
      console.log('[WS] GOT task_progress:', data?.type, data?.tasks?.length ? `${data.tasks.length} tasks` : '');
      this.emitInternal('task_progress', data);
    });

    // Achievement events
    this.socket.on('achievement_unlocked', (data) => {
      console.log('[WS] GOT achievement_unlocked:', data?.achievement?.name);
      this.emitInternal('achievement_unlocked', data);
    });

    // Usage analytics sync events
    this.socket.on('usage_stats_sync', (data) => {
      console.log('[WS] GOT usage_stats_sync');
      this.emitInternal('usage_stats_sync', data);
    });

    this.socket.on('daily_usage_sync', (data) => {
      console.log('[WS] GOT daily_usage_sync');
      this.emitInternal('daily_usage_sync', data);
    });

    this.socket.on('streak_info_sync', (data) => {
      console.log('[WS] GOT streak_info_sync');
      this.emitInternal('streak_info_sync', data);
    });

    // Session loading state (from CLI via E2EE)
    this.socket.on('session_loading', (data) => {
      console.log('[WS] GOT session_loading:', data?.sessionKey, data?.state);
      this.emitInternal('session_loading', data);
    });

    // Pairing events (from relay)
    this.socket.on('pair_device_ack', async (data) => {
      console.log('[WS] GOT pair_device_ack:', data?.deviceId);

      // Store relay token from cloud pairing (if present)
      if (data?.mobileRelayToken) {
        try {
          await pairingService.setRelayToken(data.mobileRelayToken);
          console.log('[WS] Stored cloud relay token');
        } catch (err) {
          console.warn('[WS] Failed to store relay token:', err);
        }
      }

      // Clear custom relay URL for cloud-paired devices (use default cloud URL)
      if (data?.pairId && !data?.relay) {
        try {
          await pairingService.setRelayUrl(null);
          console.log('[WS] Cleared custom relay URL for cloud pairing');
        } catch {
          // Non-critical
        }
      }

      this.emitInternal('pair_device_ack', data);
    });

    this.socket.on('pair_device_reject', (data) => {
      console.log('[WS] GOT pair_device_reject:', data?.reason);
      this.emitInternal('pair_device_reject', data);
    });

    // E2EE events — handle key exchange (async for TOFU verification) and decrypt incoming messages
    this.socket.on('encrypted_key_exchange_init', (data: KeyExchangeInit) => {
      // Handle incoming key exchange init
      console.log(`[E2EE] Received key_exchange_init from ${data.senderDeviceId}, myId=${this.mobileDeviceId}`);
      // Guard: ignore our own init echoed back by the relay
      if (data.senderDeviceId === this.mobileDeviceId) {
        console.log('[E2EE] Ignoring own key exchange init echo');
        return;
      }
      // Guard: ignore duplicate init if we already have a session or are processing one
      // (relay may re-forward the init when mobile joins the device room)
      if (this.e2eeManager?.isSessionEstablished(data.senderDeviceId) ||
          this._pendingKeyExchangeInits.has(data.senderDeviceId)) {
        console.log(`[E2EE] Already have session or pending exchange with ${data.senderDeviceId}, ignoring duplicate init`);
        return;
      }
      // Set synchronous lock BEFORE any async work
      this._pendingKeyExchangeInits.add(data.senderDeviceId);
      // Lazily create/recreate e2eeManager with the correct mobileDeviceId
      const handleInit = async () => {
        await this.ensureE2EEManager();
        const ack = await this.e2eeManager!.handleKeyExchangeInit(data);
        this._pendingKeyExchangeInits.delete(data.senderDeviceId);
        console.log(`[E2EE] Handled init — session stored for sender ${data.senderDeviceId}, ack.senderDeviceId=${ack.senderDeviceId}`);
        // Don't override senderDeviceId — e2eeManager signed with its deviceId,
        // the ack must use the same ID or signature verification will fail
        this.socket?.emit('encrypted_key_exchange_ack', ack);
        useE2EEStore.getState().setSessionStatus(data.senderDeviceId, 'established');
        useE2EEStore.getState().setE2EEEnabled(true);
        this._anyE2EESessionEstablished = true;
        // Re-request sessions using the peer's device ID from the key exchange
        // (subscribedDevices may be empty if E2EE establishes before pairing completes)
        const peerDeviceId = data.senderDeviceId;
        console.log(`[E2EE] Established (init) with peer ${peerDeviceId} — subscribed: [${[...this.subscribedDevices].join(', ')}]`);
        // Ensure we're subscribed to this peer's room
        if (!this.subscribedDevices.has(peerDeviceId)) {
          console.log(`[E2EE] Auto-subscribing to peer device ${peerDeviceId}`);
          this.subscribedDevices.add(peerDeviceId);
          this.socket?.emit('subscribe_device', { deviceId: peerDeviceId });
        }
        console.log(`[E2EE] Requesting sessions for peer ${peerDeviceId}`);
        this.socket?.emit('claude_sessions_request', { deviceId: peerDeviceId });
      };
      handleInit().catch((err) => {
        console.error('[E2EE] Key exchange init failed');
        this._pendingKeyExchangeInits.delete(data.senderDeviceId);
        useE2EEStore.getState().setSessionStatus(data.senderDeviceId, 'failed');
      });
      this.emitInternal('encrypted_key_exchange_init', data as any);
    });

    this.socket.on('encrypted_key_exchange_ack', (data: KeyExchangeAck) => {
      // Handle incoming key exchange ack
      const peerId = data.senderDeviceId;
      console.log(`[E2EE] Received key_exchange_ack from ${peerId}, myId=${this.mobileDeviceId}`);
      // Guard: ignore our own ack echoed back by the relay
      if (peerId === this.mobileDeviceId) {
        console.log('[E2EE] Ignoring own key exchange ack echo');
        return;
      }
      // Complete our pending key exchange (async for TOFU verification)
      if (this.e2eeManager) {
        this.e2eeManager.handleKeyExchangeAck(data).then(() => {
          useE2EEStore.getState().setSessionStatus(peerId, 'established');
          useE2EEStore.getState().setE2EEEnabled(true);
          this._anyE2EESessionEstablished = true;
          // Re-request sessions using the peer's device ID from the key exchange
          console.log(`[E2EE] Established (ack) with peer ${peerId} — subscribed: [${[...this.subscribedDevices].join(', ')}]`);
          if (!this.subscribedDevices.has(peerId)) {
            console.log(`[E2EE] Auto-subscribing to peer device ${peerId}`);
            this.subscribedDevices.add(peerId);
            this.socket?.emit('subscribe_device', { deviceId: peerId });
          }
          console.log(`[E2EE] Requesting sessions for peer ${peerId}`);
          this.socket?.emit('claude_sessions_request', { deviceId: peerId });
        }).catch((err) => {
          console.error('[E2EE] Key exchange ack failed');
          useE2EEStore.getState().setSessionStatus(peerId, 'failed');
        });
      }
      this.emitInternal('encrypted_key_exchange_ack', data as any);
    });

    this.socket.on('encrypted_message', (data: EncryptedMessage) => {
      // Decrypt and re-dispatch as the original event
      if (this.e2eeManager) {
        let plaintext: string;
        try {
          plaintext = this.e2eeManager.decryptMessage(data, data.senderDeviceId);
        } catch (err) {
          // SECURITY: Do NOT fall through to plaintext handling on decryption failure.
          const errMsg = err instanceof Error ? err.message : String(err);
          const sender = data.senderDeviceId || 'unknown';
          const hasSession = this.e2eeManager?.isSessionEstablished(sender) ?? false;
          console.error(`[E2EE] Decryption failed — sender=${sender}, hasSession=${hasSession}, counter=${data.messageCounter}, error: ${errMsg}`);
          return;
        }

        // Validate JSON structure separately from decryption
        let parsed: unknown;
        try {
          parsed = JSON.parse(plaintext);
        } catch {
          console.error('[E2EE] Invalid JSON in decrypted message — dropped');
          return;
        }

        // Validate payload structure
        if (!parsed || typeof parsed !== 'object') {
          console.error('[E2EE] Decrypted payload is not an object — dropped');
          return;
        }

        const payload = parsed as Record<string, unknown>;
        const eventName = payload._event;

        if (typeof eventName !== 'string') {
          console.error('[E2EE] Missing or invalid _event in decrypted payload — dropped');
          return;
        }

        if (!ALLOWED_ENCRYPTED_EVENTS.has(eventName)) {
          console.warn('[E2EE] Decrypted event not in whitelist — dropped');
          return;
        }

        console.log(`[E2EE] Decrypted event: ${eventName} from ${data.senderDeviceId} (counter=${data.messageCounter})`);
        this.emitInternal(eventName as keyof EventCallbacks, payload._data, true);
        return;
      }
      // No E2EE manager at all — emit raw for key exchange bootstrapping only
      this.emitInternal('encrypted_message', data as any);
    });
  }

  private emitInternal<K extends keyof EventCallbacks>(
    event: K,
    data?: Parameters<EventCallbacks[K][0]>[0],
    fromDecryption: boolean = false
  ): void {
    // SECURITY: Drop plaintext inbound events when E2EE is active — only decrypted versions are trusted
    if (!fromDecryption && ENFORCED_INBOUND_EVENTS.has(event as string) && this._anyE2EESessionEstablished) {
      return;
    }
    const callbacks = this.callbacks[event];
    if (!callbacks) return;
    callbacks.forEach((callback) => {
      try {
        (callback as (data: unknown) => void)(data);
      } catch (error) {
        console.error(`Error in ${event} callback:`, (error as Error).message);
        sentryService.captureException(error as Error, { context: 'websocket_callback', event: String(event) });
      }
    });
  }

  // Public emit method to send events to the server
  emit(event: string, data?: unknown): void {
    // SECURITY: Don't log potentially sensitive data
    console.log(`[WS] emit(${event})`);
    console.log(`[WS] socket connected:`, this.socket?.connected);

    // Route sensitive events through E2EE encryption when available
    if (ENFORCED_SENSITIVE_EVENTS.has(event)) {
      this.emitSensitive(event, data);
      return;
    }

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

  // Subscribe to specific device updates + prepare E2EE manager
  subscribeToDevice(deviceId: string): void {
    this.subscribedDevices.add(deviceId);
    this.socket?.emit('subscribe_device', { deviceId });

    // Ensure E2EE manager is ready (CLI initiates the key exchange on mobile_connected)
    this.ensureE2EEManager().catch((err) =>
      console.log('[E2EE] Manager init skipped')
    );
  }

  /**
   * Ensure E2EE manager exists and is initialized with the correct device ID.
   * Recreates the manager if the mobileDeviceId has changed since creation.
   */
  private async ensureE2EEManager(): Promise<void> {
    if (!this.e2eeManager || this.e2eeManager.getDeviceId() !== this.mobileDeviceId) {
      if (this.e2eeManager) {
        // Recreating E2EE manager for updated device identity
      }
      this.e2eeManager = new E2EEManager(this.mobileDeviceId);
      this.e2eeInitPromise = this.e2eeManager.initialize();
    }
    await this.e2eeInitPromise;
  }

  unsubscribeFromDevice(deviceId: string): void {
    this.subscribedDevices.delete(deviceId);
    this.socket?.emit('unsubscribe_device', { deviceId });
  }

  // Re-subscribe to all tracked rooms (called after reconnect)
  private resubscribeAll(): void {
    for (const deviceId of this.subscribedDevices) {
      console.log('[WS] Re-subscribing to device:', deviceId);
      this.socket?.emit('subscribe_device', { deviceId });
    }
  }

  // Queue a message if disconnected, send immediately if connected
  private emitOrQueue(event: string, data: unknown): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
      return;
    }

    // Drop oldest if queue is full
    if (this.pendingMessages.length >= WebSocketService.MAX_QUEUE_SIZE) {
      this.pendingMessages.shift();
    }

    this.pendingMessages.push({ event, data, queuedAt: Date.now() });
    console.log(`[WS] Queued ${event} (queue size: ${this.pendingMessages.length})`);
  }

  /**
   * Send a sensitive event: encrypt via E2EE if session exists, otherwise drop or plaintext.
   * No queue — events always flow immediately (encrypt or plaintext).
   * When E2EE is active, the API relay sees only an opaque encrypted blob.
   * When E2EE manager exists but no session is established, events are DROPPED to prevent
   * plaintext leakage (E2EE is available but not yet negotiated).
   * When no E2EE manager exists at all, events fall through to plaintext (E2EE not configured).
   */
  private emitSensitive(event: string, data: unknown): void {
    if (this.e2eeManager) {
      const peerId = this.e2eeManager.getEstablishedPeerId();
      if (peerId) {
        try {
          const plaintext = JSON.stringify({ _event: event, _data: data });
          const encrypted = this.e2eeManager.encryptMessage(plaintext, peerId, 'mobile-session');
          console.log(`[E2EE] Encrypting outbound: ${event}`);
          this.socket?.emit('encrypted_message', encrypted);
          return;
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          if (errMsg.includes('re-key required')) {
            // Session expired — clear E2EE state and fall back to plaintext.
            // CLI will initiate a new key exchange on next mobile_connected event.
            console.warn(`[E2EE] Session expired with ${peerId} — clearing E2EE state, falling back to plaintext`);
            this.e2eeManager.clearSession(peerId);
            this._anyE2EESessionEstablished = false;
            useE2EEStore.getState().setSessionStatus(peerId, 'failed');
            useE2EEStore.getState().setE2EEEnabled(false);
          } else {
            console.error(`[E2EE] Encryption failed for ${event}, sending plaintext`);
          }
        }
      }
      // E2EE manager exists but no session — drop to prevent plaintext leakage
      console.warn(`[WS] emitSensitive(${event}) — DROPPED (E2EE available but no session, refusing plaintext)`);
      return;
    }
    // No E2EE manager — send plaintext (E2EE not configured)
    console.log(`[WS] emitSensitive(${event}) — plaintext`);
    this.socket?.emit(event, data);
  }

  // Flush queued messages after reconnect, dropping stale ones
  private flushQueue(): void {
    const now = Date.now();
    const fresh = this.pendingMessages.filter(
      (msg) => now - msg.queuedAt < WebSocketService.MESSAGE_TTL_MS,
    );
    const staleCount = this.pendingMessages.length - fresh.length;
    if (staleCount > 0) {
      console.log(`[WS] Dropped ${staleCount} stale queued message(s)`);
    }

    for (const msg of fresh) {
      console.log(`[WS] Flushing queued ${msg.event}`);
      // SECURITY: Route through emit() which enforces E2EE for sensitive events
      this.emit(msg.event, msg.data);
    }

    this.pendingMessages = [];
  }

  // Expose queue length for testing
  get queueLength(): number {
    return this.pendingMessages.length;
  }

  // Subscribe to terminal output
  subscribeToTerminal(terminalId: string): void {
    this.socket?.emit('terminal_subscribe', { terminalSessionId: terminalId });
  }

  unsubscribeFromTerminal(terminalId: string): void {
    this.socket?.emit('terminal_unsubscribe', { terminalSessionId: terminalId });
  }

  // Send terminal command (sensitive — contains commands)
  sendTerminalCommand(terminalId: string, command: string, deviceId?: string): void {
    // SECURITY: Never log command content
    console.log(`[WS] Sending terminal_command to device ${deviceId}, length: ${command.length}`);
    this.emitSensitive('terminal_command', { terminalSessionId: terminalId, command, deviceId });
  }

  // Send user message (sensitive — contains user prompts)
  sendUserMessage(
    deviceId: string,
    message: string,
    options?: {
      sessionKey?: string;
      permissionMode?: 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan';
      model?: string;
      directory?: string;
      interactivePermissions?: boolean;
    }
  ): void {
    // SECURITY: Never log message content
    console.log(`[WS] Sending user_message to device ${deviceId}, length: ${message.length}`);
    this.emitSensitive('user_message', {
      deviceId,
      message,
      sessionKey: options?.sessionKey,
      directory: options?.directory,
      interactivePermissions: options?.interactivePermissions,
      mode: options ? {
        permissionMode: options.permissionMode,
        model: options.model,
      } : undefined
    });
  }

  // Abort current Claude operation (sensitive — contains session identifiers)
  abortClaude(deviceId: string, sessionKey?: string): void {
    console.log(`[WS] Sending claude_abort to device ${deviceId}`);
    this.emitSensitive('claude_abort', { deviceId, sessionKey });
  }

  // Request usage stats refresh from CLI device (sensitive — contains device context)
  requestUsageStats(deviceId: string): void {
    console.log(`[WS] Requesting usage stats from device ${deviceId}`);
    this.emitSensitive('usage_stats_request', { deviceId });
  }

  // Create/initialize terminal session on device (sensitive — contains directory paths)
  createTerminalSession(terminalId: string, deviceId: string, cwd: string = '~'): void {
    console.log(`[WS] Creating terminal session on device ${deviceId}`);
    this.emitSensitive('terminal_create', { terminalSessionId: terminalId, deviceId, cwd });
  }

  // Respond to approval request (sensitive — contains approval decisions)
  respondToApproval(requestId: string, approved: boolean, deviceId?: string): void {
    this.emitSensitive('approval_response', { requestId, approved, deviceId });
  }

  // Respond to interactive permission prompt (sensitive — contains approval decisions)
  respondToPermissionPrompt(
    promptId: string,
    decision: 'allow' | 'deny',
    options?: {
      reason?: string;
      deviceId?: string;
      sessionKey?: string;
    }
  ): void {
    console.log(`[WS] Sending permission_response: ${promptId}`);
    this.emitSensitive('permission_response', {
      promptId,
      decision,
      reason: options?.reason,
      deviceId: options?.deviceId,
      sessionKey: options?.sessionKey,
    });
  }

  // Respond to Claude approval request (sensitive — contains approval decisions)
  respondToClaudeApproval(
    approvalId: string,
    response: string,
    options?: {
      deviceId?: string;
      sessionKey?: string;
    }
  ): void {
    console.log(`[WS] Sending claude_approval_response: ${approvalId}`);
    this.emitSensitive('claude_approval_response', {
      approvalId,
      response,
      deviceId: options?.deviceId,
      sessionKey: options?.sessionKey,
    });
  }

  // Request session history from CLI (sensitive — contains session identifiers)
  requestSessionHistory(
    deviceId: string,
    sessionKey: string,
    options?: { limit?: number; offset?: number }
  ): void {
    console.log(`[WS] Requesting session history for device ${deviceId}`);
    this.emitSensitive('sdk_session_history', {
      deviceId,
      sessionKey,
      limit: options?.limit ?? 400,
      offset: options?.offset ?? 0,
    });
  }

  // Read a file from device (sensitive — contains file paths)
  readFile(deviceId: string, filePath: string, requestId: string): void {
    console.log(`[WS] Requesting read_file for device ${deviceId}`);
    this.emitSensitive('read_file', { deviceId, filePath, requestId });
  }

  // Pair a device via relay (mobile sends code, relay matches with CLI)
  pairDevice(pairingCode: string): void {
    // SECURITY: Validate format before sending over WebSocket
    if (!pairingCode || typeof pairingCode !== 'string') return;
    const trimmed = pairingCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{6,36}$/.test(trimmed)) return;

    this.socket?.emit('pair_device', { pairingCode: trimmed, mobileDeviceId: this.mobileDeviceId });
  }

  // Unpair a device via relay
  unpairDevice(deviceId: string): void {
    console.log('[WS] Sending unpair_device');
    this.socket?.emit('unpair_device', { deviceId, mobileDeviceId: this.mobileDeviceId });
  }

  // Register push token with relay for push notifications
  registerPushToken(token: string, platform: string): void {
    console.log('[WS] Registering push token');
    this.socket?.emit('register_push_token', {
      token,
      platform,
      mobileDeviceId: this.mobileDeviceId,
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.pendingMessages = [];
    this._anyE2EESessionEstablished = false;
    this.e2eeManager?.clearAllSessions();
  }

  /** Check if E2EE is active with a specific device */
  isE2EEActive(deviceId: string): boolean {
    return this.e2eeManager?.isSessionEstablished(deviceId) ?? false;
  }

  /** Get the E2EE manager for external use */
  getE2EEManager(): E2EEManager | null {
    return this.e2eeManager;
  }

  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const wsService = new WebSocketService();
export default wsService;
