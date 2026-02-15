import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  NativeSyntheticEvent,
  NativeScrollEvent,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Animated,
  Easing,
  AppState,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Play, ChevronRight, ChevronDown, Terminal, ChevronUp, ArrowUp, Brain, Zap, Clock, ShieldOff } from 'lucide-react-native';
import { wsService, TranscriptEntry, DiffHunk, TaskInfo, ThinkingContentEvent, TokenUsageEvent, TaskProgressEvent } from '@/services/websocket.service';
import { alert } from '@/components/ui/AlertModal';
import { useClaudeStore } from '@/stores/claude.store';
import { useUsageStore } from '@/stores/usage.store';
import { useSessionSettingsStore } from '@/stores/session-settings.store';
import { usePermissionRulesStore } from '@/stores/permission-rules.store';
import { analyticsService } from '@/services/analytics.service';
import { sentryService } from '@/services/sentry.service';
import { useTheme } from '@/theme/ThemeProvider';
import { colors } from '@/theme/colors';
import { PermissionRequestData } from '@/components/claude/PermissionRequest';
import { PermissionQueue } from '@/components/claude/PermissionQueue';
import { ThinkingBlock, ThinkingIndicator } from '@/components/claude/ThinkingBlock';
import { TaskIndicator } from '@/components/claude/TaskIndicator';
import { TaskListModal } from '@/components/claude/TaskListModal';
import { TokenUsageDisplay, TokenUsageInline } from '@/components/claude/TokenUsageDisplay';
import { LocalCommandBlock, parseLocalCommandTags, isLocalCommandText } from '@/components/claude/LocalCommandBlock';
import { SystemReminderBlock, parseSystemReminderTags, stripSystemReminderTags, hasSystemReminderTags } from '@/components/claude/SystemReminderBlock';
import { StatusBar, ActivityState, getActivityFromTool, getActivityDetail } from '@/components/claude/StatusBar';
import { ToolUseBlock } from '@/components/claude/tools/ToolUseBlock';
import { PlanModeBanner } from '@/components/claude/PlanModeBanner';
import { TerminalLoader } from '@/components/claude/TerminalLoader';
import { LimitPaywallModal } from '@/components/subscription/LimitPaywallModal';

const INITIAL_LOAD = 200;
const LOAD_MORE_COUNT = 200;

function AnimatedConnectDots() {
  const { theme } = useTheme();
  const [dots, setDots] = useState('');
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 350);
    return () => clearInterval(interval);
  }, []);
  return <Text style={{ color: theme.primaryLight, fontFamily: 'monospace', fontSize: 13, width: 20 }}>{dots}</Text>;
}

/** Convert a permission_prompt or pending_permissions_sync prompt to PermissionRequestData */
function convertPromptToPermissionData(data: {
  promptId: string;
  toolName?: string;
  toolInput?: any;
}): PermissionRequestData {
  const toolName = data.toolName || 'Unknown';
  const toolInput = data.toolInput || {};
  let description = `Claude wants to use ${toolName}`;
  let type: 'tool_use' | 'file_write' | 'bash_command' = 'tool_use';

  if (toolName === 'Bash') {
    type = 'bash_command';
    description = toolInput.command
      ? `Run: ${String(toolInput.command).substring(0, 200)}`
      : 'Execute a terminal command';
  } else if (toolName === 'Write') {
    type = 'file_write';
    description = toolInput.file_path
      ? `Create file: ${toolInput.file_path}`
      : 'Create a new file';
  } else if (toolName === 'Edit') {
    type = 'file_write';
    description = toolInput.file_path
      ? `Edit file: ${toolInput.file_path}`
      : 'Edit an existing file';
  }

  return {
    requestId: data.promptId,
    type,
    toolName,
    description,
    details: toolInput,
  };
}

export default function ClaudeSessionScreen() {
  const { theme } = useTheme();
  const { sessionKey, deviceId, autoPrompt, autoDirectory } = useLocalSearchParams<{
    sessionKey: string;
    deviceId: string;
    autoPrompt?: string;
    autoDirectory?: string;
  }>();
  const router = useRouter();
  const [entries, setEntries] = useState<TranscriptEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isTakingOver, setIsTakingOver] = useState(false);
  const [hasTakenOver, setHasTakenOver] = useState(false);
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [terminalSessionId, setTerminalSessionId] = useState<string | null>(null);
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const streamingMessageIdRef = useRef<string | null>(null);
  const sendingRef = useRef(false); // Guard against rapid duplicate sends
  const recentUserMessagesRef = useRef<Set<string>>(new Set()); // Track recent user message content to prevent duplicates
  const [totalEntries, setTotalEntries] = useState(0);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [permissionQueue, setPermissionQueue] = useState<PermissionRequestData[]>([]);
  const [thinkingOpacity, setThinkingOpacity] = useState(1);

  // New state for thinking, tokens, and tasks
  const [thinkingContent, setThinkingContent] = useState<{ id: string; content: string; isStreaming: boolean } | null>(null);
  const [tokenUsage, setTokenUsage] = useState<{ inputTokens: number; outputTokens: number } | null>(null);
  const [tasks, setTasks] = useState<TaskInfo[]>([]);
  const [showTaskListModal, setShowTaskListModal] = useState(false);

  // Limit reached state (server-side enforcement)
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [limitResetAt, setLimitResetAt] = useState<string | null>(null);
  const [limitCurrentUsage, setLimitCurrentUsage] = useState(0);
  const [limitMax, setLimitMax] = useState(20);
  const [countdownText, setCountdownText] = useState('');
  const [showPaywall, setShowPaywall] = useState(false);

  // Auto-prompt state (for quick actions from Project Hub)
  const [autoPromptSent, setAutoPromptSent] = useState(false);
  const autoPromptSentRef = useRef(false);

  // Track which permission requestIds are from the hook system (vs legacy RPC)
  const hookPromptIdsRef = useRef<Set<string>>(new Set());

  // Unrestricted mode - per-session override, defaults to global setting
  const globalUnrestricted = useSessionSettingsStore((s) => s.unrestrictedMode);
  const globalHasSeenWarning = useSessionSettingsStore((s) => s.hasSeenWarning);
  const setGlobalHasSeenWarning = useSessionSettingsStore((s) => s.setHasSeenWarning);
  const [sessionUnrestricted, setSessionUnrestricted] = useState(globalUnrestricted);

  // Usage store for optimistic local increment (server is authoritative)
  const { incrementMessages } = useUsageStore();

  // Activity state for status bar
  const [activityState, setActivityState] = useState<ActivityState>('idle');
  const [activityDetail, setActivityDetail] = useState<string | undefined>(undefined);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollPositionRef = useRef(0);
  const contentHeightRef = useRef(0);
  const inputRef = useRef<TextInput>(null);
  const viewportHeightRef = useRef(0);
  const scrollToBottomOpacity = useRef(new Animated.Value(0)).current;
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const unreadDividerIndexRef = useRef<number | null>(null);
  const isAtBottomRef = useRef(true);

  // Premium input state & animations
  const [isFocused, setIsFocused] = useState(false);
  const sendButtonScale = useRef(new Animated.Value(1)).current;
  const sendButtonBg = useRef(new Animated.Value(0)).current;
  const focusBorder = useRef(new Animated.Value(0)).current;
  const summoningGlow = useRef(new Animated.Value(0.5)).current;
  const takeOverScale = useRef(new Animated.Value(1)).current;
  const upgradeScale = useRef(new Animated.Value(1)).current;

  const session = useClaudeStore((state) =>
    state.sessions
      .get(deviceId as string)
      ?.find((s) => s.sessionKey === sessionKey)
  );

  // Track session duration for analytics
  const sessionOpenedAtRef = useRef(Date.now());

  // Track if we've done initial load
  const initialLoadDoneRef = useRef(false);

  // Track session duration on unmount
  useEffect(() => {
    return () => {
      const durationSeconds = Math.round((Date.now() - sessionOpenedAtRef.current) / 1000);
      analyticsService.track('claude_session_duration', { sessionKey, duration_seconds: durationSeconds });
    };
  }, [sessionKey]);

  // Stable transcript path ref — prevents effect re-runs when session object updates
  const transcriptPathRef = useRef(session?.transcriptPath);
  if (session?.transcriptPath && session.transcriptPath !== transcriptPathRef.current) {
    transcriptPathRef.current = session.transcriptPath;
  }

  // Animate thinking indicator with simple interval
  useEffect(() => {
    if (!isThinking) {
      setThinkingOpacity(1);
      return;
    }

    let increasing = false;
    const interval = setInterval(() => {
      setThinkingOpacity((prev) => {
        if (prev <= 0.3) increasing = true;
        if (prev >= 1) increasing = false;
        return increasing ? prev + 0.1 : prev - 0.1;
      });
    }, 80);

    return () => clearInterval(interval);
  }, [isThinking]);

  // Countdown timer for limit reset
  useEffect(() => {
    if (!isLimitReached || !limitResetAt) {
      setCountdownText('');
      return;
    }

    const updateCountdown = () => {
      const now = new Date().getTime();
      const resetTime = new Date(limitResetAt).getTime();
      const diff = resetTime - now;

      if (diff <= 0) {
        // Reset has passed, clear the limit
        setIsLimitReached(false);
        setLimitResetAt(null);
        setCountdownText('');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) {
        setCountdownText(`${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setCountdownText(`${minutes}m ${seconds}s`);
      } else {
        setCountdownText(`${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [isLimitReached, limitResetAt]);

  // Sync local session unrestricted state with global when it changes (unless user overrode)
  useEffect(() => {
    setSessionUnrestricted(globalUnrestricted);
  }, [globalUnrestricted]);

  // Animated interpolations for premium input
  const sendBgColor = sendButtonBg.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.backgroundTertiary, colors.primary[600]],
  });
  const cardBorderColor = focusBorder.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.border, theme.primary + '40'],
  });
  const inputBorderColor = focusBorder.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', theme.primary + '80'],
  });

  // Animate send button bg when inputText changes
  useEffect(() => {
    Animated.timing(sendButtonBg, {
      toValue: inputText.trim() && !isSending && isSessionReady ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [inputText, isSending, isSessionReady]);

  // Animate focus border
  useEffect(() => {
    Animated.timing(focusBorder, {
      toValue: isFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isFocused]);

  // Pulsing glow for summoning state
  useEffect(() => {
    if (isTakingOver) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(summoningGlow, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(summoningGlow, {
            toValue: 0.5,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isTakingOver]);

  // Track session opened
  useEffect(() => {
    if (sessionKey && deviceId) {
      analyticsService.track('claude_session_opened', {
        sessionKey,
        deviceId,
        directory: session?.directory,
      });

      sentryService.addBreadcrumb('Claude session opened', 'navigation', {
        sessionKey,
        deviceId,
      });
    }
  }, [sessionKey, deviceId]);

  useEffect(() => {
    if (!sessionKey || !deviceId) {
      setIsLoading(false);
      return;
    }

    // Listen for direct SDK streaming messages
    const unsubClaudeMessage = wsService.on('claude_message', (data) => {
      if (data.sessionKey !== sessionKey) return;

      const msg = data.message;
      console.log('[Session] claude_message:', msg.type, msg.partial ? '(partial)' : '');

      // Update activity state based on message type
      if (msg.type === 'tool_use') {
        const activity = getActivityFromTool(msg.toolName);
        const detail = getActivityDetail(msg.toolName, msg.toolInput);
        setActivityState(activity);
        setActivityDetail(detail);
      } else if (msg.type === 'assistant') {
        if (msg.partial) {
          setActivityState('responding');
          setActivityDetail(undefined);
        } else {
          // Message complete - back to idle
          setActivityState('idle');
          setActivityDetail(undefined);
        }
      }

      setEntries((prev) => {
        // Skip if we already have this exact entry (prevents duplicates from multiple event sources)
        if (prev.some(e => e.id === msg.id)) {
          // For partial updates, still update the content
          if (msg.partial) {
            return prev.map((entry) =>
              entry.id === msg.id
                ? { ...entry, content: { ...entry.content, text: msg.content } }
                : entry
            );
          }
          console.log('[Session] claude_message: Skipping duplicate ID:', msg.id);
          return prev;
        }

        // If this is a partial message, update existing entry
        if (msg.partial && streamingMessageIdRef.current === msg.id) {
          return prev.map((entry) =>
            entry.id === msg.id
              ? { ...entry, content: { ...entry.content, text: msg.content } }
              : entry
          );
        }

        // If this is a new partial message, start tracking it
        if (msg.partial) {
          streamingMessageIdRef.current = msg.id;
          const newEntry: TranscriptEntry = {
            id: msg.id,
            type: msg.type,
            timestamp: new Date().toISOString(),
            lineNumber: 0,
            content: {
              text: msg.content,
              toolName: msg.toolName,
              toolInput: msg.toolInput,
              isError: msg.isError,
            },
          };
          return [...prev, newEntry];
        }

        // Final message - update if exists, otherwise add
        streamingMessageIdRef.current = null;
        const existingIdx = prev.findIndex((e) => e.id === msg.id);
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            content: { ...updated[existingIdx].content, text: msg.content },
          };
          return updated;
        }

        // For user messages, check if there's an optimistic entry with same content
        // This prevents showing duplicate user messages
        if (msg.type === 'user') {
          const msgText = msg.content || '';
          const optimisticDuplicate = prev.find(e =>
            e.id.startsWith('local-') &&
            e.type === 'user' &&
            e.content?.text === msgText
          );
          if (optimisticDuplicate) {
            console.log('[Session] claude_message: Replacing optimistic entry:', optimisticDuplicate.id, '->', msg.id);
            // Replace optimistic entry with real one
            return prev.map(e => e.id === optimisticDuplicate.id ? {
              id: msg.id,
              type: msg.type,
              timestamp: new Date().toISOString(),
              lineNumber: 0,
              content: {
                text: msg.content,
                toolName: msg.toolName,
                toolInput: msg.toolInput,
                isError: msg.isError,
              },
            } : e);
          }
        }

        // New complete message
        const newEntry: TranscriptEntry = {
          id: msg.id,
          type: msg.type,
          timestamp: new Date().toISOString(),
          lineNumber: 0,
          content: {
            text: msg.content,
            toolName: msg.toolName,
            toolInput: msg.toolInput,
            isError: msg.isError,
          },
        };
        return [...prev, newEntry];
      });

      // Clear waiting state for non-user messages
      if (msg.type !== 'user') {
        setIsWaitingForResponse(false);
      }

      // Auto-scroll on new messages (only if user is at bottom)
      if (isAtBottomRef.current) {
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        setUnreadCount(c => c + 1);
        if (unreadDividerIndexRef.current === null) {
          setEntries(prev => {
            unreadDividerIndexRef.current = prev.length - 1;
            return prev;
          });
        }
      }
    });

    // Listen for thinking state changes
    const unsubThinking = wsService.on('thinking_state', (data) => {
      if (data.sessionKey === sessionKey) {
        console.log('[Session] thinking_state:', data.thinking);
        setIsThinking(data.thinking);
        // Update activity state
        if (data.thinking) {
          setActivityState('thinking');
          setActivityDetail(undefined);
        }
      }
    });

    // Listen for permission requests (legacy RPC-based)
    const unsubPermission = wsService.on('permission_request', (data) => {
      if (data.sessionKey === sessionKey) {
        console.log('[Session] permission_request:', data.type, data.toolName);
        setPermissionQueue(prev => {
          if (prev.some(p => p.requestId === data.requestId)) return prev;
          return [...prev, {
            requestId: data.requestId,
            type: data.type,
            toolName: data.toolName,
            description: data.description,
            details: data.details,
          }];
        });
      }
    });

    // Listen for interactive permission prompts (hook-based approval system)
    const unsubPermissionPrompt = wsService.on('permission_prompt', (data) => {
      if (data.sessionKey && data.sessionKey !== sessionKey && data.terminalSessionId !== sessionKey) return;
      console.log('[Session] permission_prompt:', data.toolName, data.promptId);

      hookPromptIdsRef.current.add(data.promptId);
      setPermissionQueue(prev => {
        if (prev.some(p => p.requestId === data.promptId)) return prev; // dedupe
        return [...prev, convertPromptToPermissionData(data)];
      });
      setActivityState('waiting');
      setActivityDetail(`Waiting for approval: ${data.toolName || 'Unknown'}`);
    });

    // Listen for pending permissions sync (catches up mobile on take-over)
    const unsubPermissionsSync = wsService.on('pending_permissions_sync', (syncData) => {
      if (syncData.sessionKey !== sessionKey) return;
      console.log('[Session] pending_permissions_sync:', syncData.prompts?.length, 'prompts');

      if (syncData.prompts && syncData.prompts.length > 0) {
        setPermissionQueue(prev => {
          const newPrompts = syncData.prompts
            .filter(p => !prev.some(q => q.requestId === p.promptId))
            .map(p => {
              hookPromptIdsRef.current.add(p.promptId);
              return convertPromptToPermissionData(p);
            });
          if (newPrompts.length === 0) return prev;
          return [...prev, ...newPrompts];
        });
        setActivityState('waiting');
      }
    });

    // Listen for session events (ready, switch, etc.)
    const unsubSessionEvent = wsService.on('claude_session_event', (data) => {
      if (data.sessionKey === sessionKey) {
        console.log('[Session] claude_session_event:', data.event.type);
        if (data.event.type === 'ready') {
          setIsWaitingForResponse(false);
          setIsSessionReady(true);
          setActivityState('idle');
          setActivityDetail(undefined);
        } else if (data.event.type === 'message') {
          // Status message from CLI
          console.log('[Session] Status message:', data.event.message);
        }
      }
    });

    // Listen for session connected event (CLI connected with session scope)
    const unsubSessionConnected = wsService.on('session_connected', (data) => {
      if (data.sessionId === sessionKey) {
        console.log('[Session] Session CLI connected');
        setIsSessionReady(true);
        setIsTakingOver(false);
      }
    });

    // Listen for thinking content (extended thinking text)
    const unsubThinkingContent = wsService.on('thinking_content', (data: ThinkingContentEvent) => {
      if (data.sessionKey !== sessionKey && data.terminalSessionId !== sessionKey) return;
      console.log('[Session] thinking_content:', data.thinkingId, data.partial ? '(streaming)' : '(complete)');

      if (data.partial) {
        // Streaming thinking - accumulate content
        setThinkingContent((prev) => {
          if (prev?.id === data.thinkingId) {
            return { ...prev, content: prev.content + data.content };
          }
          return { id: data.thinkingId, content: data.content, isStreaming: true };
        });
        // Set activity to formulating when receiving thinking content
        setActivityState('formulating');
        setActivityDetail(undefined);
      } else {
        // Thinking complete - add as transcript entry if there's content
        setThinkingContent((prev) => {
          if (prev?.id === data.thinkingId && prev.content) {
            // Add thinking block to entries
            const thinkingEntry: TranscriptEntry = {
              id: `thinking-${data.thinkingId}`,
              type: 'assistant' as const,
              timestamp: new Date().toISOString(),
              lineNumber: 0,
              content: {
                text: prev.content,
                thinkingText: prev.content, // Special marker for thinking blocks
              } as any,
            };
            setEntries((entries) => [...entries, thinkingEntry]);
          }
          return null;
        });
      }
    });

    // Listen for token usage
    const unsubTokenUsage = wsService.on('token_usage', (data: TokenUsageEvent) => {
      if (data.sessionKey !== sessionKey && data.terminalSessionId !== sessionKey) return;
      console.log('[Session] token_usage:', data.usage.inputTokens, '/', data.usage.outputTokens);
      setTokenUsage(data.usage);
    });

    // Listen for task progress
    const unsubTaskProgress = wsService.on('task_progress', (data: TaskProgressEvent) => {
      if (data.sessionKey !== sessionKey && data.terminalSessionId !== sessionKey) return;
      console.log('[Session] task_progress:', data.type, data.task?.subject || data.tasks?.length);

      if (data.type === 'list' && data.tasks) {
        setTasks(data.tasks);
      } else if (data.type === 'created' && data.task) {
        setTasks((prev) => [...prev, data.task!]);
      } else if ((data.type === 'updated' || data.type === 'completed') && data.task) {
        setTasks((prev) =>
          prev.map((t) => (t.id === data.task!.id ? { ...t, ...data.task } : t))
        );
      }
    });

    // Listen for tool activity (non-blocking status updates from CLI)
    const unsubToolActivity = wsService.on('tool_activity', (data) => {
      if (data.sessionKey && data.sessionKey !== sessionKey && data.terminalSessionId !== sessionKey) return;
      const activity = getActivityFromTool(data.toolName);
      const detail = getActivityDetail(data.toolName, { file_path: data.inputSummary?.replace('File: ', ''), command: data.inputSummary?.replace('Command: ', '') });
      setActivityState(activity);
      setActivityDetail(detail);
    });

    // Listen for limit reached events (server-side enforcement)
    const unsubLimitReached = wsService.on('limit_reached', (data) => {
      console.log('[Session] limit_reached:', data.limitType, data.currentUsage, data.limit);
      if (data.limitType === 'messages_daily') {
        // Sync local state with server's authoritative count
        useUsageStore.setState({
          messagesUsedToday: data.currentUsage || 0,
          messageLimitResetAt: data.resetAt || useUsageStore.getState().messageLimitResetAt,
        });
        // Show paywall modal and inline limit reached UI, stop all loading states
        setShowPaywall(true);
        setIsLimitReached(true);
        setLimitResetAt(data.resetAt || null);
        setLimitCurrentUsage(data.currentUsage || 0);
        setLimitMax(data.limit || 20);
        setIsSending(false);
        setIsWaitingForResponse(false);
        setIsThinking(false);
        setThinkingContent(null);
        setActivityState('idle');
        setActivityDetail(undefined);
        sendingRef.current = false;
      }
    });

    return () => {
      unsubClaudeMessage();
      unsubThinking();
      unsubPermission();
      unsubPermissionPrompt();
      unsubPermissionsSync();
      unsubSessionEvent();
      unsubSessionConnected();
      unsubThinkingContent();
      unsubTokenUsage();
      unsubTaskProgress();
      unsubToolActivity();
      unsubLimitReached();
    };
  }, [sessionKey, deviceId]);

  useEffect(() => {
    if (!sessionKey || !deviceId) {
      setIsLoading(false);
      return;
    }

    let loadingTimeout: ReturnType<typeof setTimeout> | null = null;

    // Set up event listeners for transcript events (used when transcriptPath exists)
    const unsubHistory = wsService.on('transcript_history', (data) => {
      if (data.sessionKey === sessionKey) {
        setEntries((prev) => {
          // Check if this is loading more (prev has items and data.offset > 0)
          if (prev.length > 0 && data.offset > 0) {
            // Prepend older entries
            return [...data.entries, ...prev];
          } else {
            // Initial load
            initialLoadDoneRef.current = true;
            return data.entries;
          }
        });
        setIsLoading(false);
        setIsLoadingMore(false);
        setTotalEntries(data.totalEntries);
        setHasMore(data.hasMore);
        setCurrentOffset((prev) => prev + data.entries.length);
      }
    });

    // Listen for SDK session history (from database)
    const unsubSdkHistory = wsService.on('sdk_session_history', (data) => {
      if (data.sessionKey === sessionKey) {
        console.log('[Session] Received SDK session history:', data.entries?.length, 'entries');
        initialLoadDoneRef.current = true;
        const historyEntries = data.entries || [];

        // Merge with existing optimistic entries (local- or auto-) to avoid wiping them
        setEntries(prev => {
          const optimistic = prev.filter(e =>
            e.id.startsWith('local-') || e.id.startsWith('auto-')
          );
          if (optimistic.length === 0) return historyEntries;
          // Check for content duplicates between history and optimistic entries
          const historyTexts = new Set(historyEntries.filter(e => e.type === 'user').map(e => e.content?.text));
          const uniqueOptimistic = optimistic.filter(e => !historyTexts.has(e.content?.text));
          return [...historyEntries, ...uniqueOptimistic];
        });

        setIsLoading(false);
        setTotalEntries(data.totalEntries || 0);
        setHasMore(data.hasMore || false);
        setCurrentOffset(historyEntries.length);

        // Scroll to bottom after loading history
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: false });
        }, 100);
      }
    });

    // Listen for live updates - FIX: properly synchronized state updates
    const unsubUpdate = wsService.on('transcript_update', (data) => {
      if (data.sessionKey === sessionKey) {
        console.log('[Session] Received transcript_update:', data.entry?.type, data.entry?.id);

        if (!data.entry) {
          console.log('[Session] No entry in update, skipping');
          return;
        }

        setEntries((prev) => {
          // Check for duplicates by ID
          const isDuplicateById = prev.some(e => e.id === data.entry.id);
          if (isDuplicateById) {
            console.log('[Session] Skipping duplicate by ID:', data.entry.id);
            return prev;
          }

          // For user messages, check for content duplicates (Claude sometimes writes same message twice with different IDs)
          if (data.entry.type === 'user') {
            const entryText = data.entry.content?.text || '';

            // Use ref to track recently processed user messages (handles race conditions)
            if (recentUserMessagesRef.current.has(entryText)) {
              console.log('[Session] Skipping duplicate user message (ref check):', data.entry.id);
              return prev;
            }

            // Check if we already have a user message with the exact same content
            // Only check recent messages (last 5) to avoid false positives
            const recentUserMessages = prev.slice(-5).filter(e => e.type === 'user');
            const contentDuplicate = recentUserMessages.find(e => e.content?.text === entryText);
            if (contentDuplicate) {
              console.log('[Session] Skipping duplicate user message by content:', data.entry.id);
              return prev;
            }

            // Also check for optimistic entries
            const optimisticDuplicate = prev.find(e =>
              e.id.startsWith('local-') &&
              e.type === 'user' &&
              e.content?.text === entryText
            );
            if (optimisticDuplicate) {
              console.log('[Session] Replacing optimistic entry with real entry:', optimisticDuplicate.id, '->', data.entry.id);
              // Track this content so we skip the duplicate that arrives shortly after
              recentUserMessagesRef.current.add(entryText);
              // Clean up after 5 seconds
              setTimeout(() => recentUserMessagesRef.current.delete(entryText), 5000);
              // Replace optimistic entry with real one (don't increment total)
              return prev.map(e => e.id === optimisticDuplicate.id ? data.entry : e);
            }

            // Track this content for duplicate detection
            recentUserMessagesRef.current.add(entryText);
            setTimeout(() => recentUserMessagesRef.current.delete(entryText), 5000);
          }

          console.log('[Session] Adding entry:', data.entry.type, data.entry.id);

          // Increment total INSIDE the callback to stay in sync
          setTotalEntries((t) => t + 1);

          return [...prev, data.entry];
        });

        // Clear waiting state for non-user messages
        if (data.entry?.type !== 'user') {
          setIsWaitingForResponse(false);
        }

        // Update activity state based on transcript updates
        if (data.entry?.type === 'tool_use') {
          const activity = getActivityFromTool(data.entry.content?.toolName);
          const detail = getActivityDetail(data.entry.content?.toolName, data.entry.content?.toolInput);
          setActivityState(activity);
          setActivityDetail(detail);
        } else if (data.entry?.type === 'assistant') {
          // Final assistant message means Claude is done
          setActivityState('idle');
          setActivityDetail(undefined);
        } else if (data.entry?.type === 'tool_result') {
          // Tool finished, Claude will respond next
          setActivityState('formulating');
          setActivityDetail(undefined);
        }

        // Auto-scroll only if user is at bottom
        if (isAtBottomRef.current) {
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, 100);
        } else {
          setUnreadCount(c => c + 1);
          if (unreadDividerIndexRef.current === null) {
            setEntries(prev => {
              unreadDividerIndexRef.current = prev.length - 1;
              return prev;
            });
          }
        }
      }
    });

    // Subscribe and fetch based on mode
    const transcriptPath = transcriptPathRef.current;
    if (transcriptPath && transcriptPath.length > 0) {
      // Legacy transcript watching mode - subscribe and fetch from file
      console.log('[Session] Subscribing to transcript:', sessionKey, transcriptPath);
      wsService.emit('transcript_subscribe', {
        deviceId,
        sessionKey,
        transcriptPath,
      });

      // Fetch initial history - get last 400 entries (reverse=true by default)
      if (!initialLoadDoneRef.current) {
        wsService.emit('transcript_fetch', {
          deviceId,
          sessionKey,
          transcriptPath,
          offset: 0,
          limit: INITIAL_LOAD,
          reverse: true,
        });
      }

      // Fallback: if no response in 10 seconds, stop loading
      loadingTimeout = setTimeout(() => {
        if (!initialLoadDoneRef.current) {
          console.log('[Session] Loading timeout - stopping loader');
          setIsLoading(false);
        }
      }, 10000);
    } else {
      // SDK streaming mode - join room and fetch history from database
      console.log('[Session] SDK streaming mode - joining transcript room for:', sessionKey);
      wsService.emit('transcript_subscribe_sdk', {
        deviceId,
        sessionKey,
      });

      // Request message history from CLI (via API relay)
      console.log('[Session] Requesting SDK session history, claudeSessionId:', session?.claudeSessionId);
      wsService.emit('sdk_session_history', {
        deviceId,
        sessionKey,
        claudeSessionId: session?.claudeSessionId, // Pass claude session ID if we have it
        directory: session?.directory, // Used by CLI to filter fallback sessions
        limit: INITIAL_LOAD,
        offset: 0,
      });

      // Fallback: if no response in 10 seconds, stop loading
      loadingTimeout = setTimeout(() => {
        if (!initialLoadDoneRef.current) {
          console.log('[Session] Loading timeout - stopping loader');
          setIsLoading(false);
        }
      }, 10000);
    }

    return () => {
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
      // Unsubscribe from whichever mode we were in
      if (transcriptPath && transcriptPath.length > 0) {
        wsService.emit('transcript_unsubscribe', { deviceId, sessionKey });
      } else {
        wsService.emit('transcript_unsubscribe_sdk', { deviceId, sessionKey });
      }
      unsubHistory();
      unsubSdkHistory();
      unsubUpdate();
    };
  }, [sessionKey, deviceId]);

  // Re-subscribe and re-fetch when app returns from background or WebSocket reconnects
  useEffect(() => {
    if (!sessionKey || !deviceId) return;

    const refetchTranscript = () => {
      const transcriptPath = transcriptPathRef.current;
      if (transcriptPath && transcriptPath.length > 0) {
        // Re-subscribe to transcript room (room membership is lost on reconnect)
        wsService.emit('transcript_subscribe', { deviceId, sessionKey, transcriptPath });
        // Re-fetch latest entries
        wsService.emit('transcript_fetch', {
          deviceId,
          sessionKey,
          transcriptPath,
          offset: 0,
          limit: INITIAL_LOAD,
          reverse: true,
        });
      } else {
        wsService.emit('transcript_subscribe_sdk', { deviceId, sessionKey });
        wsService.emit('sdk_session_history', {
          deviceId,
          sessionKey,
          claudeSessionId: session?.claudeSessionId,
          directory: session?.directory,
          limit: INITIAL_LOAD,
          offset: 0,
        });
      }
    };

    // Re-fetch when app comes back to foreground
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        console.log('[Session] App foregrounded — re-fetching transcript');
        refetchTranscript();
        setUnreadCount(0);
        unreadDividerIndexRef.current = null;
      }
    });

    // Re-fetch when WebSocket reconnects (room memberships are lost)
    const unsubReconnect = wsService.on('connected', () => {
      console.log('[Session] WebSocket reconnected — re-subscribing and re-fetching');
      refetchTranscript();
      setUnreadCount(0);
      unreadDividerIndexRef.current = null;
    });

    return () => {
      appStateSub.remove();
      unsubReconnect();
    };
  }, [sessionKey, deviceId, session?.claudeSessionId, session?.directory]);

  // Listen for session lifecycle when taken over
  useEffect(() => {
    if (!hasTakenOver) return;

    // Listen for session disconnected
    const unsubDisconnected = wsService.on('session_disconnected', (data) => {
      if (data.sessionId === sessionKey) {
        console.log('[Session] Session CLI disconnected');
        setHasTakenOver(false);
        setIsSessionReady(false);
      }
    });

    // Listen for session alive as confirmation CLI is running
    const unsubAlive = wsService.on('session_alive', (data) => {
      if (data.sessionId === sessionKey && !isSessionReady) {
        console.log('[Session] Session alive received - marking as ready');
        setIsSessionReady(true);
        setIsTakingOver(false);
        inputRef.current?.focus();
      }
    });

    return () => {
      unsubDisconnected();
      unsubAlive();
    };
  }, [hasTakenOver, sessionKey, isSessionReady]);

  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore || !session?.transcriptPath || session.transcriptPath.length === 0) return;

    setIsLoadingMore(true);
    wsService.emit('transcript_fetch', {
      deviceId,
      sessionKey,
      transcriptPath: session.transcriptPath,
      offset: currentOffset,
      limit: LOAD_MORE_COUNT,
      reverse: true,
    });
  }, [deviceId, sessionKey, session?.transcriptPath, currentOffset, hasMore, isLoadingMore]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    scrollPositionRef.current = contentOffset.y;
    viewportHeightRef.current = layoutMeasurement.height;
    const distanceFromBottom = contentSize.height - contentOffset.y - layoutMeasurement.height;
    const shouldShow = distanceFromBottom > 100;
    isAtBottomRef.current = !shouldShow;
    if (shouldShow !== showScrollToBottom) {
      setShowScrollToBottom(shouldShow);
    }

    // Clear unread when user scrolls to bottom
    if (!shouldShow && unreadCount > 0) {
      setUnreadCount(0);
      unreadDividerIndexRef.current = null;
    }

    // Load more when scrolled near top (within 100px)
    if (contentOffset.y < 100 && hasMore && !isLoadingMore) {
      loadMore();
    }
  }, [hasMore, isLoadingMore, loadMore, showScrollToBottom, unreadCount]);

  useEffect(() => {
    Animated.timing(scrollToBottomOpacity, {
      toValue: showScrollToBottom ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [showScrollToBottom]);

  const handleToggleSessionUnrestricted = async (value: boolean) => {
    if (!value) {
      setSessionUnrestricted(false);
      return;
    }

    const title = 'Enable Unrestricted Mode?';
    const body = globalHasSeenWarning
      ? 'Claude will run without permission checks for this session. It can execute commands, edit files, and make network requests without asking for approval.'
      : 'This runs Claude without permission checks. It can execute commands, edit files, and make changes without asking for approval.\n\nOnly enable this if you trust your prompts and understand the risks.';

    const confirmed = await new Promise<boolean>((resolve) => {
      alert.show(title, body, [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Enable', style: 'default', onPress: () => resolve(true) },
      ], { variant: 'warning' });
    });

    if (confirmed) {
      setSessionUnrestricted(true);
      if (!globalHasSeenWarning) setGlobalHasSeenWarning();
    }
  };

  // Auto-prompt: Send user_message directly with directory so CLI spawns a fresh session
  // Used by quick actions from the Project Hub (Status Check, Brainstorm, Initialize)
  useEffect(() => {
    if (!autoPrompt || !autoDirectory || !deviceId) return;
    if (autoPromptSentRef.current) return;
    autoPromptSentRef.current = true;

    console.log('[Session] Auto-prompt: sending message with directory', autoDirectory);
    setAutoPromptSent(true);

    // Mark as taken over so the session lifecycle hooks work
    setIsTakingOver(false);
    setHasTakenOver(true);
    setIsSessionReady(true);

    // Sync permission rules to CLI before starting session
    if (!sessionUnrestricted) {
      const rules = usePermissionRulesStore.getState().rules;
      wsService.emit('permission_rules_sync', {
        deviceId,
        sessionKey,
        terminalSessionId: sessionKey,
        rules,
      });
    }

    // Send user_message with directory — CLI will spawn fresh claude + write message in one step
    wsService.sendUserMessage(deviceId, autoPrompt, {
      sessionKey: sessionKey,
      directory: autoDirectory,
      interactivePermissions: !sessionUnrestricted,
    });
    setIsWaitingForResponse(true);

    // Add optimistic user message
    const optimisticEntry: TranscriptEntry = {
      id: `auto-${Date.now()}`,
      type: 'user',
      timestamp: new Date().toISOString(),
      lineNumber: 0,
      content: { text: autoPrompt, role: 'user' },
    };
    setEntries((prev) => [...prev, optimisticEntry]);
  }, [autoPrompt, autoDirectory, deviceId, sessionKey]);

  const handleTakeOver = async () => {
    if (!session || !deviceId) return;

    console.log('[Session] handleTakeOver called');
    setIsTakingOver(true);
    setIsSessionReady(false);

    // Track session take over
    analyticsService.track('claude_session_takeover', {
      sessionKey,
      deviceId,
      directory: session.directory,
    });

    sentryService.addBreadcrumb('Claude session take over', 'user_action', {
      sessionKey,
      deviceId,
    });

    // Request resume - CLI will connect with session-scoped connection
    // and start routing messages to this session
    // Use sessionKey as terminalSessionId to uniquely identify this process
    console.log('[Session] Sending claude_resume_session to device:', deviceId);
    wsService.emit('claude_resume_session', {
      deviceId,
      sessionKey,
      directory: session.directory,
      terminalSessionId: sessionKey, // Use sessionKey as the process identifier
      dangerouslySkipPermissions: sessionUnrestricted,
      interactivePermissions: !sessionUnrestricted, // Enable hook-based approval when not unrestricted
    });

    // Sync permission rules to CLI so the hook script uses user's configuration
    if (!sessionUnrestricted) {
      const rules = usePermissionRulesStore.getState().rules;
      wsService.emit('permission_rules_sync', {
        deviceId,
        sessionKey,
        terminalSessionId: sessionKey,
        rules,
      });
    }

    // Mark as taken over - isTakingOver will be set false when session is ready
    // (via session_connected or claude_session_event ready)
    setHasTakenOver(true);

    // Fallback timeout in case we don't get confirmation
    setTimeout(() => {
      if (!isSessionReady) {
        console.log('[Session] Fallback: marking session as ready');
        setIsSessionReady(true);
        setIsTakingOver(false);
        inputRef.current?.focus();
      }
    }, 5000);
  };

  const handleSendMessage = async () => {
    // Capture and clear input FIRST to prevent double-sends from onSubmitEditing + button tap
    const message = inputText.trim();
    if (!message) return;

    // If limit is already reached, don't allow sending (server enforces this too)
    if (isLimitReached) return;

    // Clear input immediately to prevent capturing the same message twice
    setInputText('');

    // Haptic feedback + pop animation
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.spring(sendButtonScale, {
        toValue: 0.85,
        tension: 200,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.spring(sendButtonScale, {
        toValue: 1,
        tension: 200,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();

    // Use ref guard to prevent rapid duplicate sends (state may not update fast enough)
    if (sendingRef.current) {
      console.log('[Session] Blocked duplicate send - already sending');
      return;
    }
    if (!deviceId || isSending || !isSessionReady) return;

    // Increment message count (optimistically, server will enforce)
    incrementMessages();

    // Set ref guard immediately (synchronous)
    sendingRef.current = true;
    setIsSending(true);

    // Track message sent
    analyticsService.track('claude_message_sent', {
      sessionKey,
      deviceId,
      messageLength: message.length,
    });

    // Add user message optimistically (show immediately)
    const optimisticEntry: TranscriptEntry = {
      id: `local-${Date.now()}`,
      type: 'user',
      timestamp: new Date().toISOString(),
      lineNumber: 0,
      content: { text: message, role: 'user' }
    };
    setEntries((prev) => [...prev, optimisticEntry]);
    setTotalEntries((prev) => prev + 1);
    setIsWaitingForResponse(true);
    setActivityState('waiting');
    setActivityDetail(undefined);

    // Auto-scroll to show the new message
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 50);

    // Send message via user_message event (routes to session-scoped CLI)
    console.log('[Session] Sending user message:', message.substring(0, 50));
    wsService.sendUserMessage(deviceId, message, {
      sessionKey: sessionKey,
      permissionMode: sessionUnrestricted ? 'bypassPermissions' : undefined,
      interactivePermissions: !sessionUnrestricted,
    });

    // Reset sending state after response arrives or timeout
    // Use longer delay to prevent rapid re-sends
    setTimeout(() => {
      sendingRef.current = false;
      setIsSending(false);
    }, 1000); // 1 second cooldown
  };

  const sendPermissionResponse = (requestId: string, decision: 'allow' | 'deny') => {
    if (hookPromptIdsRef.current.has(requestId)) {
      hookPromptIdsRef.current.delete(requestId);
      wsService.respondToPermissionPrompt(requestId, decision, {
        reason: `User ${decision === 'allow' ? 'approved' : 'denied'} via mobile`,
        deviceId: deviceId as string,
        sessionKey: sessionKey as string,
      });
    } else {
      wsService.emit('rpc_response', {
        requestId,
        result: { approved: decision === 'allow', remember: false },
      });
    }
  };

  const handlePermissionApprove = (requestId: string) => {
    console.log('[Session] Permission approved:', requestId);
    const request = permissionQueue.find(p => p.requestId === requestId);

    analyticsService.track('claude_permission_approved', {
      sessionKey,
      deviceId,
      requestId,
      permissionType: request?.type,
      toolName: request?.toolName,
    });

    setPermissionQueue(prev => prev.filter(p => p.requestId !== requestId));
    setActivityState('formulating');
    setActivityDetail(undefined);
    sendPermissionResponse(requestId, 'allow');
  };

  const handlePermissionDeny = (requestId: string) => {
    console.log('[Session] Permission denied:', requestId);
    const request = permissionQueue.find(p => p.requestId === requestId);

    analyticsService.track('claude_permission_denied', {
      sessionKey,
      deviceId,
      requestId,
      permissionType: request?.type,
      toolName: request?.toolName,
    });

    setPermissionQueue(prev => prev.filter(p => p.requestId !== requestId));
    setActivityState('formulating');
    setActivityDetail(undefined);
    sendPermissionResponse(requestId, 'deny');
  };

  const handlePermissionApproveAll = () => {
    console.log('[Session] Approve all permissions:', permissionQueue.length);
    for (const request of permissionQueue) {
      sendPermissionResponse(request.requestId, 'allow');
    }
    setPermissionQueue([]);
    setActivityState('formulating');
    setActivityDetail(undefined);
  };

  const handlePermissionDenyAll = () => {
    console.log('[Session] Deny all permissions:', permissionQueue.length);
    for (const request of permissionQueue) {
      sendPermissionResponse(request.requestId, 'deny');
    }
    setPermissionQueue([]);
    setActivityState('formulating');
    setActivityDetail(undefined);
  };

  const toggleToolExpand = (id: string) => {
    setExpandedTools((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const renderDiffLine = (line: string, index: number) => {
    const isAddition = line.startsWith('+');
    const isDeletion = line.startsWith('-');

    let bgColor = 'transparent';
    let textColor = theme.textTertiary;

    if (isAddition) {
      bgColor = 'rgba(34, 197, 94, 0.15)';
      textColor = colors.success[400];
    } else if (isDeletion) {
      bgColor = 'rgba(239, 68, 68, 0.15)';
      textColor = colors.error[400];
    }

    return (
      <View key={index} style={{ backgroundColor: bgColor }}>
        <Text style={{ fontFamily: 'monospace', fontSize: 12, color: textColor }}>
          {line}
        </Text>
      </View>
    );
  };

  const renderDiff = (diff: DiffHunk[]) => {
    return (
      <View style={{ marginTop: 8, borderRadius: 4, backgroundColor: theme.background, overflow: 'hidden' }}>
        {diff.map((hunk, hunkIndex) => (
          <View key={hunkIndex}>
            <View style={{ backgroundColor: theme.backgroundSecondary, paddingHorizontal: 8, paddingVertical: 4 }}>
              <Text style={{ fontFamily: 'monospace', fontSize: 12, color: theme.textTertiary }}>
                @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
              </Text>
            </View>
            <View style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
              {hunk.lines.map((line, lineIndex) => renderDiffLine(line, lineIndex))}
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderEntry = (item: TranscriptEntry) => {
    const isUser = item.type === 'user';
    const isToolUse = item.type === 'tool_use';
    const isToolResult = item.type === 'tool_result';
    const isExpanded = expandedTools.has(item.id);
    const hasDiff = item.content?.diff && item.content.diff.length > 0;

    // Check if this is a thinking block (has thinkingText in content)
    const isThinkingBlock = (item.content as any)?.thinkingText;
    if (isThinkingBlock) {
      return (
        <ThinkingBlock
          content={(item.content as any).thinkingText}
          thinkingId={item.id}
        />
      );
    }

    // Check if this contains local command tags (CLI slash commands)
    const text = item.content?.text || '';
    if (isLocalCommandText(text)) {
      const parsed = parseLocalCommandTags(text);
      if (parsed) {
        return (
          <LocalCommandBlock
            commandName={parsed.commandName}
            commandMessage={parsed.commandMessage}
            commandArgs={parsed.commandArgs}
            stdout={parsed.stdout}
            caveat={parsed.caveat}
          />
        );
      }
    }

    // User input - shown as prompt with accent card
    if (isUser) {
      return (
        <View style={{
          marginBottom: 16,
          backgroundColor: colors.primary[500] + '0C',
          borderRadius: 10,
          borderLeftWidth: 2,
          borderLeftColor: colors.primary[400],
          paddingVertical: 10,
          paddingHorizontal: 14,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <Text style={{ color: colors.primary[400], fontFamily: 'monospace', marginRight: 8, fontSize: 14, lineHeight: 20, fontWeight: '600' }}>{'>'}</Text>
            <Text style={{ color: '#ffffff', fontFamily: 'monospace', flex: 1, fontSize: 14, lineHeight: 20 }}>
              {item.content?.text}
            </Text>
          </View>
        </View>
      );
    }

    // Tool use - routed to specialized components via ToolUseBlock
    if (isToolUse) {
      return (
        <ToolUseBlock
          entry={item}
          isExpanded={isExpanded}
          onToggleExpand={() => toggleToolExpand(item.id)}
        />
      );
    }

    // Tool result - with diff support
    if (isToolResult) {
      const hasContent = item.content?.text || hasDiff;
      if (!hasContent) return null;

      return (
        <View style={{ marginBottom: 6, marginLeft: 12, backgroundColor: colors.dark[800] + '80', borderRadius: 6, overflow: 'hidden' }}>
          <TouchableOpacity
            onPress={() => toggleToolExpand(item.id)}
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 10 }}
          >
            {isExpanded ? (
              <ChevronDown size={14} color={hasDiff ? colors.primary[400] : colors.dark[300]} />
            ) : (
              <ChevronRight size={14} color={hasDiff ? colors.primary[400] : colors.dark[300]} />
            )}
            <Text style={{
              fontFamily: 'monospace',
              fontSize: 12,
              marginLeft: 6,
              fontWeight: '500',
              color: item.content?.isError
                ? theme.error
                : hasDiff
                  ? colors.primary[400]
                  : colors.dark[200]
            }}>
              {item.content?.isError ? 'error' : hasDiff ? item.content?.text || 'diff' : 'result'}
            </Text>
            {item.content?.filePath && (
              <Text style={{ fontFamily: 'monospace', fontSize: 12, marginLeft: 8, color: colors.dark[300] }}>
                {item.content.filePath.split(/[/\\]/).pop()}
              </Text>
            )}
          </TouchableOpacity>
          {isExpanded && (
            <View style={{ marginLeft: 16, marginTop: 2, paddingBottom: 8, paddingHorizontal: 10 }}>
              {hasDiff ? (
                renderDiff(item.content!.diff!)
              ) : (
                <Text style={{ fontFamily: 'monospace', fontSize: 12, color: item.content?.isError ? theme.error : theme.textTertiary }}>
                  {item.content?.text}
                </Text>
              )}
            </View>
          )}
        </View>
      );
    }

    // Assistant message - main content
    // Check for and handle system reminders within the text
    const rawText = item.content?.text || '';
    const systemReminders = hasSystemReminderTags(rawText) ? parseSystemReminderTags(rawText) : [];
    const cleanText = hasSystemReminderTags(rawText) ? stripSystemReminderTags(rawText) : rawText;

    return (
      <View style={{ marginBottom: 16, paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: colors.dark[600] }}>
        {/* Show system reminders if present */}
        {systemReminders.map((reminder, idx) => (
          <SystemReminderBlock key={`reminder-${idx}`} content={reminder} />
        ))}
        {/* Main assistant text */}
        {cleanText && (
          <Text style={{ color: '#ffffff', fontFamily: 'monospace', fontSize: 14, lineHeight: 22 }}>
            {cleanText}
          </Text>
        )}
      </View>
    );
  };

  const isPlanMode = useMemo(() => {
    for (let i = entries.length - 1; i >= 0; i--) {
      const name = entries[i].content?.toolName;
      if (name === 'EnterPlanMode') return true;
      if (name === 'ExitPlanMode') return false;
    }
    return false;
  }, [entries]);

  const directoryName =
    session?.directory.split('/').pop() ||
    session?.directory.split('\\').pop() ||
    'Session';

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      {/* Permission Queue Modal */}
      <PermissionQueue
        visible={permissionQueue.length > 0}
        queue={permissionQueue}
        onApprove={handlePermissionApprove}
        onDeny={handlePermissionDeny}
        onApproveAll={handlePermissionApproveAll}
        onDenyAll={handlePermissionDenyAll}
        onDismiss={() => {}}
      />
      {/* Task List Modal */}
      <TaskListModal
        visible={showTaskListModal}
        tasks={tasks}
        onClose={() => setShowTaskListModal(false)}
      />
      {/* Limit Paywall Modal */}
      <LimitPaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        limitType="messages_daily"
        resetAt={limitResetAt || undefined}
        currentUsage={limitCurrentUsage}
        limit={limitMax}
      />
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.dark[900] }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          {/* Header — unified compact bar */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.dark[700], backgroundColor: colors.dark[800] }}>
            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{ padding: 4, marginRight: 10 }}
            >
              <ArrowLeft size={20} color={colors.dark[200]} />
            </TouchableOpacity>

            {/* Center: Title + path stacked, or thinking indicator */}
            <View style={{ flex: 1, marginRight: 12 }}>
              {isThinking ? (
                <ThinkingIndicator isThinking={true} />
              ) : (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Terminal size={13} color={colors.primary[400]} />
                    <Text style={{ color: '#ffffff', fontFamily: 'monospace', fontSize: 14, fontWeight: '600', marginLeft: 6 }} numberOfLines={1}>
                      {directoryName}
                    </Text>
                  </View>
                  <Text style={{ color: colors.dark[300], fontFamily: 'monospace', fontSize: 11, marginTop: 2, marginLeft: 19 }} numberOfLines={1}>
                    {session?.directory}
                  </Text>
                </>
              )}
            </View>

            {/* Right: Token usage and entry count */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {tokenUsage && (
                <TokenUsageDisplay
                  inputTokens={tokenUsage.inputTokens}
                  outputTokens={tokenUsage.outputTokens}
                  style="header"
                />
              )}
              <TaskIndicator tasks={tasks} onPress={() => setShowTaskListModal(true)} />
            </View>
          </View>

          {/* Plan Mode Banner */}
          <PlanModeBanner isActive={isPlanMode} />

          {/* Streaming thinking indicator */}
          {thinkingContent?.isStreaming && (
            <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
              <ThinkingBlock
                content={thinkingContent.content}
                isStreaming={true}
                thinkingId={thinkingContent.id}
              />
            </View>
          )}

          {/* Load more indicator */}
          {hasMore && (
            <TouchableOpacity
              onPress={loadMore}
              disabled={isLoadingMore}
              activeOpacity={0.7}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 16, backgroundColor: colors.dark[800], borderRadius: 10, marginHorizontal: 16, marginVertical: 6, borderWidth: 1, borderColor: colors.dark[700] }}
            >
              {isLoadingMore ? (
                <ActivityIndicator size="small" color={theme.textTertiary} />
              ) : (
                <>
                  <ChevronUp size={14} color={theme.textTertiary} />
                  <Text style={{ color: theme.textTertiary, fontSize: 12, marginLeft: 4 }}>Load older messages</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Terminal-style output */}
          {isLoading ? (
            <TerminalLoader variant="boot" directory={directoryName} />
          ) : entries.length === 0 && (isWaitingForResponse || autoPromptSent || isTakingOver) ? (
            <TerminalLoader variant="minimal" message="Waiting for Claude" />
          ) : entries.length === 0 ? (
            <TerminalLoader variant="empty" />
          ) : (
            <View style={{ flex: 1, position: 'relative' }}>
              <ScrollView
                ref={scrollViewRef}
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 16, paddingBottom: 20 }}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                onContentSizeChange={(w, h) => {
                  contentHeightRef.current = h;
                  // Scroll to bottom on initial load
                  if (currentOffset <= INITIAL_LOAD) {
                    scrollViewRef.current?.scrollToEnd({ animated: false });
                  }
                }}
                showsVerticalScrollIndicator={true}
                scrollIndicatorInsets={{ right: 1 }}
                keyboardShouldPersistTaps="handled"
              >
                {entries.map((entry, index) => (
                  <React.Fragment key={`${entry.id}-${entry.lineNumber}-${index}`}>
                    {index === unreadDividerIndexRef.current && unreadCount > 0 && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 8, paddingHorizontal: 12 }}>
                        <View style={{ flex: 1, height: 1, backgroundColor: colors.primary[500] }} />
                        <Text style={{ color: colors.primary[400], fontSize: 12, fontWeight: '600', marginHorizontal: 8 }}>
                          {unreadCount} new update{unreadCount !== 1 ? 's' : ''}
                        </Text>
                        <View style={{ flex: 1, height: 1, backgroundColor: colors.primary[500] }} />
                      </View>
                    )}
                    {renderEntry(entry)}
                  </React.Fragment>
                ))}
              </ScrollView>
              <Animated.View
                pointerEvents={showScrollToBottom ? 'auto' : 'none'}
                style={{
                  position: 'absolute',
                  right: 16,
                  bottom: 8,
                  opacity: scrollToBottomOpacity,
                }}
              >
                <TouchableOpacity
                  onPress={() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                    setUnreadCount(0);
                    unreadDividerIndexRef.current = null;
                  }}
                  activeOpacity={0.7}
                  style={{
                    width: 38, height: 38, borderRadius: 19,
                    backgroundColor: colors.dark[700],
                    borderWidth: 1, borderColor: colors.dark[500],
                    alignItems: 'center', justifyContent: 'center',
                    shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.15, shadowRadius: 8, elevation: 6,
                  }}
                >
                  <ChevronDown size={18} color={colors.dark[100]} />
                </TouchableOpacity>
                {unreadCount > 0 && (
                  <View style={{
                    position: 'absolute', top: -6, right: -6,
                    backgroundColor: colors.primary[500], borderRadius: 10,
                    minWidth: 20, height: 20, paddingHorizontal: 4,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                      {unreadCount}
                    </Text>
                  </View>
                )}
              </Animated.View>
            </View>
          )}

          {/* Status Bar - shows activity state like Claude Code CLI */}
          {hasTakenOver && isSessionReady && (
            <StatusBar
              activity={activityState}
              detail={activityDetail}
              tokenUsage={tokenUsage || undefined}
              isVisible={true}
            />
          )}

          {/* Auto-prompt indicator */}
          {autoPromptSent && (
            <View style={{ paddingHorizontal: 16, paddingVertical: 6, backgroundColor: colors.primary[500] + '12' }}>
              <Text style={{ color: colors.primary[400], fontSize: 12, fontFamily: 'monospace', textAlign: 'center' }}>
                Auto-prompt sent
              </Text>
            </View>
          )}

          {/* Bottom: Take Over button OR Input field */}
          <View style={{ borderTopWidth: 1, borderTopColor: colors.dark[700], backgroundColor: colors.dark[900] }}>
            {!hasTakenOver ? (
              /* State 1: Before Take Over — Premium CTA */
              <View style={{
                backgroundColor: colors.dark[800],
                borderWidth: 1,
                borderColor: colors.primary[500] + '25',
                borderRadius: 20,
                marginHorizontal: 16,
                marginVertical: 12,
                padding: 16,
                shadowColor: colors.primary[500],
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 20,
                elevation: 8,
              }}>
                {/* Per-session unrestricted mode toggle */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: sessionUnrestricted ? theme.warning + '12' : colors.dark[700], borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <ShieldOff size={14} color={sessionUnrestricted ? theme.warning : colors.dark[300]} />
                    <Text style={{ color: sessionUnrestricted ? theme.warning : colors.dark[200], fontSize: 13, fontWeight: '600' }}>Unrestricted</Text>
                  </View>
                  <Switch
                    value={sessionUnrestricted}
                    onValueChange={handleToggleSessionUnrestricted}
                    trackColor={{ false: colors.dark[500], true: theme.warning }}
                    thumbColor={sessionUnrestricted ? '#fff' : colors.dark[200]}
                    style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
                  />
                </View>
                <Animated.View style={{ transform: [{ scale: takeOverScale }] }}>
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      Animated.sequence([
                        Animated.spring(takeOverScale, { toValue: 0.96, tension: 200, friction: 10, useNativeDriver: true }),
                        Animated.spring(takeOverScale, { toValue: 1, tension: 200, friction: 10, useNativeDriver: true }),
                      ]).start();
                      handleTakeOver();
                    }}
                    disabled={isTakingOver || !session}
                    activeOpacity={0.85}
                    style={{
                      borderRadius: 14,
                      overflow: 'hidden',
                      opacity: isTakingOver || !session ? 0.5 : 1,
                    }}
                  >
                    <LinearGradient
                      colors={isTakingOver || !session ? [colors.dark[600], colors.dark[600]] : [colors.primary[500], colors.primary[700]]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        paddingVertical: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        shadowColor: colors.primary[400],
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.4,
                        shadowRadius: 8,
                      }}
                    >
                      {isTakingOver ? (
                        <>
                          <Animated.View style={{ opacity: summoningGlow }}>
                            <ActivityIndicator size="small" color="white" />
                          </Animated.View>
                          <Text style={{ color: 'white', fontWeight: '700', fontSize: 16, marginLeft: 8, letterSpacing: 0.3 }}>Connecting...</Text>
                        </>
                      ) : (
                        <>
                          <Play size={18} color="white" />
                          <Text style={{ color: 'white', fontWeight: '700', fontSize: 16, marginLeft: 10, letterSpacing: 0.3 }}>Take Over Session</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              </View>
            ) : isTakingOver ? (
              /* State 2: Summoning Claude — Atmospheric */
              <View style={{
                backgroundColor: colors.dark[800],
                borderWidth: 1,
                borderColor: colors.primary[500] + '30',
                borderRadius: 20,
                marginHorizontal: 16,
                marginVertical: 12,
                paddingHorizontal: 20,
                paddingVertical: 16,
                shadowColor: colors.primary[500],
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 16,
                elevation: 6,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Animated.Text style={{ color: colors.primary[300], fontFamily: 'monospace', fontSize: 14, fontWeight: '700', opacity: summoningGlow }}>$</Animated.Text>
                  <Text style={{ color: colors.dark[100], fontFamily: 'monospace', fontSize: 13, fontWeight: '500' }}>Summoning Claude</Text>
                  <AnimatedConnectDots />
                </View>
              </View>
            ) : isLimitReached ? (
              /* State 3: Limit Reached */
              <View style={{
                backgroundColor: colors.dark[800],
                borderWidth: 1,
                borderColor: colors.dark[600],
                borderRadius: 20,
                marginHorizontal: 16,
                marginVertical: 12,
                padding: 16,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 12,
                elevation: 6,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                  <Text style={{ color: theme.textSecondary, fontSize: 13, fontFamily: 'monospace' }}>
                    Daily limit reached ({limitCurrentUsage}/{limitMax} messages)
                  </Text>
                </View>
                <Animated.View style={{ transform: [{ scale: upgradeScale }] }}>
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      Animated.sequence([
                        Animated.spring(upgradeScale, { toValue: 0.97, tension: 200, friction: 10, useNativeDriver: true }),
                        Animated.spring(upgradeScale, { toValue: 1, tension: 200, friction: 10, useNativeDriver: true }),
                      ]).start();
                      router.push('/settings/subscription');
                    }}
                    activeOpacity={0.85}
                    style={{
                      borderRadius: 14,
                      overflow: 'hidden',
                    }}
                  >
                    <LinearGradient
                      colors={[colors.primary[500], colors.primary[700]]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        paddingVertical: 14,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Zap size={18} color="white" />
                      <Text style={{ color: 'white', fontWeight: '700', fontSize: 16, marginLeft: 8, letterSpacing: 0.3 }}>
                        Upgrade to Pro
                      </Text>
                      {countdownText && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 12, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                          <Clock size={12} color="rgba(255,255,255,0.9)" />
                          <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, marginLeft: 4, fontFamily: 'monospace', fontWeight: '600' }}>
                            {countdownText}
                          </Text>
                        </View>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              </View>
            ) : (
              /* State 4: Message Input — Premium */
              <Animated.View style={{
                backgroundColor: colors.dark[800],
                borderWidth: 1,
                borderColor: cardBorderColor,
                borderRadius: 20,
                marginHorizontal: 16,
                marginVertical: 12,
                padding: 8,
                shadowColor: colors.primary[500],
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 12,
                elevation: 4,
                flexDirection: 'row',
                alignItems: 'flex-end',
                opacity: isWaitingForResponse && !inputText ? 0.7 : 1,
              }}>
                <Animated.View style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: inputBorderColor,
                  borderRadius: 14,
                  backgroundColor: colors.dark[700],
                }}>
                  <TextInput
                    ref={inputRef}
                    value={inputText}
                    onChangeText={setInputText}
                    placeholder={isWaitingForResponse ? "Waiting for Claude..." : "Message Claude..."}
                    placeholderTextColor={colors.dark[300]}
                    multiline={true}
                    blurOnSubmit={false}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      color: '#ffffff',
                      fontFamily: 'monospace',
                      fontSize: 14,
                      minHeight: 44,
                      maxHeight: 120,
                      textAlignVertical: 'center',
                    }}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    editable={!isSending && isSessionReady}
                  />
                </Animated.View>
                <Animated.View style={{
                  transform: [{ scale: sendButtonScale }],
                  marginLeft: 8,
                  marginBottom: 4,
                }}>
                  <TouchableOpacity
                    onPress={handleSendMessage}
                    disabled={!inputText.trim() || isSending || !isSessionReady}
                    activeOpacity={0.7}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Animated.View style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: sendBgColor,
                    }}>
                      {isSending ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <ArrowUp size={18} color={inputText.trim() && isSessionReady ? 'white' : theme.textTertiary} />
                      )}
                    </Animated.View>
                  </TouchableOpacity>
                </Animated.View>
              </Animated.View>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}
