// User & Auth Types
export interface User {
  id: string;
  email: string;
  username?: string;
  name: string;
  avatarUrl?: string;
  createdAt: string;
  subscription: SubscriptionTier;
  country?: string;
}

export type SubscriptionTier = 'free' | 'pro' | 'team';

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  name: string;
}

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
  githubRepo?: GitHubRepo;
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

// GitHub Types
export interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  description?: string;
  private: boolean;
  defaultBranch: string;
  language?: string;
  url: string;
  cloneUrl: string;
  stars: number;
  forks: number;
  updatedAt: string;
}

export interface GitHubBranch {
  name: string;
  commit: string;
  protected: boolean;
}

export interface GitHubUser {
  id: number;
  login: string;
  name: string;
  avatarUrl: string;
  email?: string;
  bio?: string;
  publicRepos?: number;
  followers?: number;
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

// ==================== QUEUE TYPES ====================

export type QueueItemStatus =
  | 'PENDING'
  | 'SCHEDULED'
  | 'EXECUTING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface PromptQueueItem {
  id: string;
  userId: string;
  deviceId: string;
  sessionKey: string | null;
  prompt: string;
  status: QueueItemStatus;
  priority: number;
  rateLimitReason: string | null;
  retryAfter: string | null;
  scheduledFor: string | null;
  executedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QueueSchedule {
  id: string;
  userId: string;
  enabled: boolean;
  scheduledTime: string; // HH:mm format
  daysOfWeek: number[]; // 0=Sunday, 1=Monday, etc.
  createdAt: string;
  updatedAt: string;
}

// ==================== SUBSCRIPTION LIMITS TYPES ====================

export type LimitType =
  | 'messages_daily'
  | 'sessions_monthly'
  | 'projects_max'
  | 'devices_max'
  | 'repairs_monthly'
  | 'phone_session';

export interface SubscriptionUsage {
  messagesUsedToday: number;
  messageLimitResetAt: string;
  sessionsUsedThisMonth: number;
  repairsUsedThisMonth: number;
  monthlyLimitResetAt: string;
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
  maxPhoneSessions?: number;
}

// ==================== VOUCHER TYPES ====================

export type VoucherType = 'LIFETIME_PRO' | 'CAMPAIGN' | 'SINGLE_USE';
export type VoucherBenefitType = 'FREE_MONTHS' | 'LIFETIME_PRO' | 'DISCOUNT_PERCENT';

export interface VoucherBenefit {
  type: VoucherBenefitType;
  value: number;
  expiresAt?: string;
  description: string;
}

export interface VoucherRedemptionResult {
  success: boolean;
  message: string;
  benefit?: VoucherBenefit;
}

export interface VoucherValidationResult {
  valid: boolean;
  message: string;
  benefit?: VoucherBenefit;
}

export interface VoucherRedemptionHistory {
  id: string;
  code: string;
  benefitType: VoucherBenefitType;
  benefitValue: number;
  benefitExpiresAt?: string;
  redeemedAt: string;
  campaignName?: string;
}

// ==================== REFERRAL TYPES ====================

export interface ReferralStats {
  totalReferrals: number;
  successfulConversions: number;
  rewardMonthsAvailable: number;
  nextRewardProgress: number; // Progress towards next tier
  nextRewardTarget: number; // Conversions needed for next reward (3, 6, 9, ...)
}

export interface ReferralCodeResponse {
  referralCode: string;
  shareUrl: string;
  stats: ReferralStats;
}

export interface ReferralListItem {
  id: string;
  referredUserEmail?: string;
  signedUpAt: string;
  isConverted: boolean;
  convertedAt?: string;
}

export interface ClaimRewardResult {
  success: boolean;
  message: string;
  monthsClaimed?: number;
  newExpiresAt?: string;
}

export interface ApplyReferralResult {
  success: boolean;
  message: string;
}
