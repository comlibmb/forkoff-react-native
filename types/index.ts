// User type is no longer needed for auth — kept minimal for interface compatibility
export interface User {
  id: string;
  name: string;
}

// Subscription tier kept for interface compatibility (always 'free' in open source)
export type SubscriptionTier = 'free';

// Device Types
export type DeviceStatus = 'online' | 'offline' | 'syncing' | 'ONLINE' | 'OFFLINE' | 'SYNCING';
export type DeviceType = 'desktop' | 'laptop' | 'server' | 'DESKTOP' | 'LAPTOP' | 'SERVER';
export type DevicePlatform = 'windows' | 'macos' | 'linux' | 'WINDOWS' | 'MACOS' | 'LINUX';

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  status: DeviceStatus;
  platform: DevicePlatform;
  lastSeen?: string;
  lastSeenAt?: string; // Backend field name
  ipAddress?: string;
  hostname?: string; // Backend field name
  connectedTools?: ConnectedTool[];
  userId?: string | null;
  cliVersion?: string; // CLI version from device_status events
}

export interface ConnectedTool {
  id: string;
  type: ToolType;
  name: string;
  version: string;
  status: 'active' | 'inactive' | 'error';
  lastActivity?: string;
}

export type ToolType = 'cursor' | 'copilot' | 'claude-terminal' | 'claude' | 'vscode' | 'other';

// Project Types
export type ProjectStatus = 'active' | 'idle' | 'error';

export interface Project {
  id: string;
  name: string;
  path: string;
  language?: string;
  framework?: string;
  lastModified?: string;
  deviceId: string;
  device?: Device;
  tools?: ToolConfig[];
  terminals?: Terminal[];
  servers?: Server[];
  // UI state properties
  status?: ProjectStatus;
  isFavorite?: boolean;
  hasErrors?: boolean;
  branch?: string;
  uncommittedChanges?: number;
}

export interface ToolConfig {
  toolType: ToolType;
  enabled: boolean;
  settings: Record<string, unknown>;
}

// Chat Types
export type MessageRole = 'user' | 'assistant' | 'system';
export type MessageStatus = 'pending' | 'streaming' | 'complete' | 'error';

export interface ChatSession {
  id: string;
  projectId: string;
  toolType: ToolType;
  tool: ToolType;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  lastMessage?: string;
  unreadCount: number;
  hasPendingApproval: boolean;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  status: MessageStatus;
  timestamp: string;
  codeChanges?: CodeChange[];
  approvalRequest?: ApprovalRequest;
}

export interface CodeChange {
  id: string;
  filePath: string;
  language: string;
  oldContent: string;
  newContent: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface ApprovalRequest {
  id: string;
  type: 'file_change' | 'command_execution' | 'file_creation' | 'file_deletion';
  description: string;
  changes: CodeChange[];
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  respondedAt?: string;
}

// Terminal Types
export interface Terminal {
  id: string;
  projectId: string;
  deviceId: string;
  name: string;
  cwd: string;
  isActive: boolean;
  output: TerminalLine[];
}

export interface TerminalLine {
  id: string;
  content: string;
  type: 'input' | 'output' | 'error';
  timestamp: string;
}

// Server Types
export type ServerStatus = 'running' | 'stopped' | 'starting' | 'stopping' | 'error';

export interface Server {
  id: string;
  projectId: string;
  name: string;
  type: 'dev' | 'preview' | 'production';
  port: number;
  status: ServerStatus;
  url?: string;
  logs: ServerLog[];
  startedAt?: string;
}

export interface ServerLog {
  id: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: string;
}

// Notification Types
export type NotificationType =
  | 'approval_request'
  | 'task_complete'
  | 'error'
  | 'device_offline'
  | 'build_status'
  | 'chat_message';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

// Settings Types
export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  notifications: NotificationSettings;
  haptics: boolean;
  biometricAuth: boolean;
}

export interface NotificationSettings {
  enabled: boolean;
  approvalRequests: boolean;
  taskComplete: boolean;
  errors: boolean;
  deviceStatus: boolean;
  chatMessages: boolean;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// WebSocket Event Types
export type WebSocketEvent =
  | { type: 'device_status'; payload: { deviceId: string; status: DeviceStatus } }
  | { type: 'chat_message'; payload: ChatMessage }
  | { type: 'terminal_output'; payload: { terminalId: string; line: TerminalLine } }
  | { type: 'server_status'; payload: { serverId: string; status: ServerStatus } }
  | { type: 'approval_request'; payload: ApprovalRequest }
  | { type: 'code_change'; payload: CodeChange };

// File Tree Types
export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  language?: string;
  size?: number;
  modifiedAt?: string;
}

// Claude Session Types
export type ClaudeSessionState = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'active' | 'inactive' | 'suspended';

export interface ClaudeSession {
  id: string;
  deviceId: string;
  sessionKey: string;
  directory: string;
  name?: string; // Auto-set from first user message as session summary
  state: ClaudeSessionState;
  lastUsedAt: string;
  transcriptPath?: string;
  claudeSessionId?: string; // The actual Claude conversation ID (used in JSONL filenames)
  createdAt: string;
  updatedAt: string;
}

// Directory Entry Types (for directory browser)
export interface DirectoryEntry {
  name: string;
  type: 'file' | 'directory';
  path: string;
}

// Tab Completion Types
export interface TabCompletionResult {
  completions: string[];
  commonPrefix?: string;
}

// Parsed Option Types (for option buttons)
export interface ParsedOption {
  key: string; // "1", "2", "a", "b", etc.
  label: string; // The option text
  raw: string; // The full matched line
}

// ==================== ANALYTICS TYPES ====================

export interface TokenUsageDaily {
  date: string;
  inputTokens: string;
  outputTokens: string;
  totalTokens: string;
  sessionCount: number;
  estimatedCostUsd: number | null;
}

export interface UsageStats {
  totalInputTokens: string;
  totalOutputTokens: string;
  totalTokens: string;
  totalSessionCount: number;
  estimatedCostUsd: number;
  period: 'day' | 'week' | 'month' | 'all';
}

export interface StreakInfo {
  currentStreak: number;
  totalActiveDays: number;
}

// ==================== ACHIEVEMENTS TYPES ====================

export type AchievementTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';
export type AchievementCategory = 'TOKENS' | 'SESSIONS' | 'ENGAGEMENT' | 'SPECIAL';

export interface Achievement {
  id: string;
  key: string;
  name: string;
  description: string;
  category: AchievementCategory;
  iconName: string;
  tier: AchievementTier;
  threshold: string;
  createdAt: string;
}

export interface AchievementWithProgress extends Achievement {
  userProgress: {
    unlockedAt: string | null;
    progress: string;
    showcased: boolean;
  } | null;
}

export interface UnlockedAchievement {
  achievement: Achievement;
  unlockedAt: string;
  progress: string;
  showcased: boolean;
}

// ==================== SUBSCRIPTION LIMITS TYPES (open source: all unlimited) ====================

export type LimitType =
  | 'messages_daily'
  | 'sessions_monthly'
  | 'projects_max'
  | 'devices_max'
  | 'repairs_monthly';

export interface SubscriptionUsage {
  messagesUsedToday: number;
  sessionsUsedThisMonth: number;
  repairsUsedThisMonth: number;
  activeProjectCount: number;
  pairedDeviceCount: number;
}

export interface LimitCheckResult {
  allowed: boolean;
  limitType?: LimitType;
  currentUsage?: number;
  limit?: number;
  resetAt?: string;
}

export interface SubscriptionLimits {
  messagesPerDay: number;
  sessionsPerMonth: number;
  maxProjects: number;
  maxDevices: number;
  repairsPerMonth: number;
  historyRetentionDays: number;
}
