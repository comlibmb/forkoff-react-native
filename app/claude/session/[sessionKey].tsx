import React, { useEffect, useState, useRef, useCallback } from 'react';
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
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Play, ChevronRight, ChevronDown, Terminal, ChevronUp, Send, Brain } from 'lucide-react-native';
import { wsService, TranscriptEntry, DiffHunk, TaskInfo, ThinkingContentEvent, TokenUsageEvent, TaskProgressEvent } from '@/services/websocket.service';
import { useClaudeStore } from '@/stores/claude.store';
import { analyticsService } from '@/services/analytics.service';
import { sentryService } from '@/services/sentry.service';
import { useTheme } from '@/theme/ThemeProvider';
import { colors } from '@/theme/colors';
import PermissionRequest, { PermissionRequestData } from '@/components/claude/PermissionRequest';
import { ThinkingBlock, ThinkingIndicator } from '@/components/claude/ThinkingBlock';
import { TaskProgress } from '@/components/claude/TaskProgress';
import { TokenUsageDisplay, TokenUsageInline } from '@/components/claude/TokenUsageDisplay';
import { LocalCommandBlock, parseLocalCommandTags, isLocalCommandText } from '@/components/claude/LocalCommandBlock';
import { SystemReminderBlock, parseSystemReminderTags, stripSystemReminderTags, hasSystemReminderTags } from '@/components/claude/SystemReminderBlock';
import { StatusBar, ActivityState, getActivityFromTool, getActivityDetail } from '@/components/claude/StatusBar';
import { TerminalLoader } from '@/components/claude/TerminalLoader';

const INITIAL_LOAD = 400;
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

export default function ClaudeSessionScreen() {
  const { theme } = useTheme();
  const { sessionKey, deviceId } = useLocalSearchParams<{
    sessionKey: string;
    deviceId: string;
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
  const [permissionRequest, setPermissionRequest] = useState<PermissionRequestData | null>(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [thinkingOpacity, setThinkingOpacity] = useState(1);

  // New state for thinking, tokens, and tasks
  const [thinkingContent, setThinkingContent] = useState<{ id: string; content: string; isStreaming: boolean } | null>(null);
  const [tokenUsage, setTokenUsage] = useState<{ inputTokens: number; outputTokens: number } | null>(null);
  const [tasks, setTasks] = useState<TaskInfo[]>([]);
  const [showTasksPanel, setShowTasksPanel] = useState(false);

  // Activity state for status bar
  const [activityState, setActivityState] = useState<ActivityState>('idle');
  const [activityDetail, setActivityDetail] = useState<string | undefined>(undefined);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollPositionRef = useRef(0);
  const contentHeightRef = useRef(0);
  const inputRef = useRef<TextInput>(null);

  const session = useClaudeStore((state) =>
    state.sessions
      .get(deviceId as string)
      ?.find((s) => s.sessionKey === sessionKey)
  );

  // Track if we've done initial load
  const initialLoadDoneRef = useRef(false);

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

      // Auto-scroll on new messages
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
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

    // Listen for permission requests
    const unsubPermission = wsService.on('permission_request', (data) => {
      if (data.sessionKey === sessionKey) {
        console.log('[Session] permission_request:', data.type, data.toolName);
        setPermissionRequest({
          requestId: data.requestId,
          type: data.type,
          toolName: data.toolName,
          description: data.description,
          details: data.details,
        });
        setShowPermissionModal(true);
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
      if (data.sessionKey !== sessionKey) return;
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
      if (data.sessionKey !== sessionKey) return;
      console.log('[Session] token_usage:', data.usage.inputTokens, '/', data.usage.outputTokens);
      setTokenUsage(data.usage);
    });

    // Listen for task progress
    const unsubTaskProgress = wsService.on('task_progress', (data: TaskProgressEvent) => {
      if (data.sessionKey !== sessionKey) return;
      console.log('[Session] task_progress:', data.type, data.task?.subject || data.tasks?.length);

      if (data.type === 'list' && data.tasks) {
        setTasks(data.tasks);
      } else if (data.type === 'created' && data.task) {
        setTasks((prev) => [...prev, data.task!]);
        setShowTasksPanel(true);
      } else if ((data.type === 'updated' || data.type === 'completed') && data.task) {
        setTasks((prev) =>
          prev.map((t) => (t.id === data.task!.id ? { ...t, ...data.task } : t))
        );
      }
    });

    return () => {
      unsubClaudeMessage();
      unsubThinking();
      unsubPermission();
      unsubSessionEvent();
      unsubSessionConnected();
      unsubThinkingContent();
      unsubTokenUsage();
      unsubTaskProgress();
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
        setEntries(data.entries || []);
        setIsLoading(false);
        setTotalEntries(data.totalEntries || 0);
        setHasMore(data.hasMore || false);
        setCurrentOffset(data.entries?.length || 0);

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

        // Auto-scroll
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    });

    // Subscribe and fetch based on mode
    if (session?.transcriptPath && session.transcriptPath.length > 0) {
      // Legacy transcript watching mode - subscribe and fetch from file
      console.log('[Session] Subscribing to transcript:', sessionKey, session.transcriptPath);
      wsService.emit('transcript_subscribe', {
        deviceId,
        sessionKey,
        transcriptPath: session.transcriptPath,
      });

      // Fetch initial history - get last 400 entries (reverse=true by default)
      if (!initialLoadDoneRef.current) {
        wsService.emit('transcript_fetch', {
          deviceId,
          sessionKey,
          transcriptPath: session.transcriptPath,
          offset: 0,
          limit: INITIAL_LOAD,
          reverse: true,
        });
      }

      // Fallback: if no response in 3 seconds, stop loading
      loadingTimeout = setTimeout(() => {
        if (!initialLoadDoneRef.current) {
          console.log('[Session] Loading timeout - stopping loader');
          setIsLoading(false);
        }
      }, 3000);
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
        limit: INITIAL_LOAD,
        offset: 0,
      });

      // Fallback: if no response in 3 seconds, stop loading
      loadingTimeout = setTimeout(() => {
        if (!initialLoadDoneRef.current) {
          console.log('[Session] Loading timeout - stopping loader');
          setIsLoading(false);
        }
      }, 3000);
    }

    return () => {
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
      // Unsubscribe from whichever mode we were in
      if (session?.transcriptPath && session.transcriptPath.length > 0) {
        wsService.emit('transcript_unsubscribe', { deviceId, sessionKey });
      } else {
        wsService.emit('transcript_unsubscribe_sdk', { deviceId, sessionKey });
      }
      unsubHistory();
      unsubSdkHistory();
      unsubUpdate();
    };
  }, [sessionKey, deviceId, session?.transcriptPath]);

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
    const { contentOffset } = event.nativeEvent;
    scrollPositionRef.current = contentOffset.y;

    // Load more when scrolled near top (within 100px)
    if (contentOffset.y < 100 && hasMore && !isLoadingMore) {
      loadMore();
    }
  }, [hasMore, isLoadingMore, loadMore]);

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
    });

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

    // Clear input immediately to prevent capturing the same message twice
    setInputText('');

    // Use ref guard to prevent rapid duplicate sends (state may not update fast enough)
    if (sendingRef.current) {
      console.log('[Session] Blocked duplicate send - already sending');
      return;
    }
    if (!deviceId || isSending || !isSessionReady) return;

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
    });

    // Reset sending state after response arrives or timeout
    // Use longer delay to prevent rapid re-sends
    setTimeout(() => {
      sendingRef.current = false;
      setIsSending(false);
    }, 1000); // 1 second cooldown
  };

  const handlePermissionApprove = (requestId: string, remember: boolean) => {
    console.log('[Session] Permission approved:', requestId, 'remember:', remember);

    // Track permission approved
    analyticsService.track('claude_permission_approved', {
      sessionKey,
      deviceId,
      requestId,
      remember,
      permissionType: permissionRequest?.type,
      toolName: permissionRequest?.toolName,
    });

    setShowPermissionModal(false);
    setPermissionRequest(null);

    // Send approval response via RPC
    wsService.emit('rpc_response', {
      requestId,
      result: { approved: true, remember },
    });
  };

  const handlePermissionDeny = (requestId: string, remember: boolean) => {
    console.log('[Session] Permission denied:', requestId, 'remember:', remember);

    // Track permission denied
    analyticsService.track('claude_permission_denied', {
      sessionKey,
      deviceId,
      requestId,
      remember,
      permissionType: permissionRequest?.type,
      toolName: permissionRequest?.toolName,
    });

    setShowPermissionModal(false);
    setPermissionRequest(null);

    // Send denial response via RPC
    wsService.emit('rpc_response', {
      requestId,
      result: { approved: false, remember },
    });
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

  // Render new file content as additions (like a diff for new files)
  const renderNewFileContent = (content: string, filePath?: string) => {
    const lines = content.split('\n');
    const fileName = filePath?.split(/[/\\]/).pop() || 'new file';
    const lineCount = lines.length;

    return (
      <View style={{ marginTop: 8, borderRadius: 4, backgroundColor: theme.background, overflow: 'hidden' }}>
        {/* Header showing it's a new file */}
        <View style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', paddingHorizontal: 8, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: theme.borderLight }}>
          <Text style={{ fontFamily: 'monospace', fontSize: 12, color: colors.success[400] }}>
            +++ {fileName} (new file, {lineCount} lines)
          </Text>
        </View>
        {/* Content as additions */}
        <View style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
          {lines.slice(0, 50).map((line, index) => (
            <View key={index} style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
              <Text style={{ fontFamily: 'monospace', fontSize: 12, color: colors.success[400] }}>
                +{line}
              </Text>
            </View>
          ))}
          {lines.length > 50 && (
            <View style={{ backgroundColor: theme.backgroundSecondary, paddingHorizontal: 8, paddingVertical: 4 }}>
              <Text style={{ fontFamily: 'monospace', fontSize: 12, color: theme.textTertiary }}>
                ... and {lines.length - 50} more lines
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  // Parse tool input to extract file content for Write operations
  const parseWriteToolInput = (toolInput: any): { filePath?: string; content?: string } => {
    if (!toolInput) return {};

    // Handle string input (JSON)
    if (typeof toolInput === 'string') {
      try {
        const parsed = JSON.parse(toolInput);
        return {
          filePath: parsed.file_path,
          content: parsed.content,
        };
      } catch {
        return {};
      }
    }

    // Handle object input
    return {
      filePath: toolInput.file_path,
      content: toolInput.content,
    };
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

    // User input - shown as prompt
    if (isUser) {
      return (
        <View style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <Text style={{ color: theme.primaryLight, fontFamily: 'monospace', marginRight: 8 }}>{'>'}</Text>
            <Text style={{ color: theme.text, fontFamily: 'monospace', flex: 1 }}>
              {item.content?.text}
            </Text>
          </View>
        </View>
      );
    }

    // Tool use - collapsible with special handling for Write
    if (isToolUse) {
      const toolName = item.content?.toolName?.toLowerCase() || '';
      const isWrite = toolName === 'write';
      const isEdit = toolName === 'edit';

      // Parse Write tool input for file content
      const writeData = isWrite ? parseWriteToolInput(item.content?.toolInput || item.content?.text) : null;
      const hasFileContent = writeData?.content && writeData.content.length > 0;

      // Get file path for display
      const filePath = writeData?.filePath || item.content?.toolInput?.file_path;
      const fileName = filePath?.split(/[/\\]/).pop();

      return (
        <View style={{ marginBottom: 8 }}>
          <TouchableOpacity
            onPress={() => toggleToolExpand(item.id)}
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4 }}
          >
            {isExpanded ? (
              <ChevronDown size={14} color={isWrite ? theme.primaryLight : theme.textTertiary} />
            ) : (
              <ChevronRight size={14} color={isWrite ? theme.primaryLight : theme.textTertiary} />
            )}
            <Text style={{ fontFamily: 'monospace', fontSize: 12, marginLeft: 4, color: isWrite ? theme.primaryLight : theme.textTertiary }}>
              {item.content?.toolName}
            </Text>
            {fileName && (
              <Text style={{ color: theme.textTertiary, fontFamily: 'monospace', fontSize: 12, marginLeft: 8 }}>
                {fileName}
              </Text>
            )}
          </TouchableOpacity>
          {isExpanded && (
            <View style={{ marginLeft: 16, paddingLeft: 8, borderLeftWidth: 1, borderLeftColor: theme.backgroundTertiary }}>
              {/* Show file content as diff for Write operations */}
              {isWrite && hasFileContent ? (
                renderNewFileContent(writeData!.content!, filePath)
              ) : item.content?.text ? (
                <Text style={{ color: theme.textTertiary, fontFamily: 'monospace', fontSize: 12 }}>
                  {item.content.text.substring(0, 500)}
                  {item.content.text.length > 500 ? '...' : ''}
                </Text>
              ) : null}
            </View>
          )}
        </View>
      );
    }

    // Tool result - with diff support
    if (isToolResult) {
      const hasContent = item.content?.text || hasDiff;
      if (!hasContent) return null;

      return (
        <View style={{ marginBottom: 8, marginLeft: 16 }}>
          <TouchableOpacity
            onPress={() => toggleToolExpand(item.id)}
            style={{ flexDirection: 'row', alignItems: 'center' }}
          >
            {isExpanded ? (
              <ChevronDown size={12} color={hasDiff ? theme.primaryLight : theme.textTertiary} />
            ) : (
              <ChevronRight size={12} color={hasDiff ? theme.primaryLight : theme.textTertiary} />
            )}
            <Text style={{
              fontFamily: 'monospace',
              fontSize: 12,
              marginLeft: 4,
              color: item.content?.isError
                ? theme.error
                : hasDiff
                  ? theme.primaryLight
                  : theme.textTertiary
            }}>
              {item.content?.isError ? 'error' : hasDiff ? item.content?.text || 'diff' : 'result'}
            </Text>
            {item.content?.filePath && (
              <Text style={{ fontFamily: 'monospace', fontSize: 12, marginLeft: 8, color: theme.border }}>
                {item.content.filePath.split(/[/\\]/).pop()}
              </Text>
            )}
          </TouchableOpacity>
          {isExpanded && (
            <View style={{ marginLeft: 16, marginTop: 4 }}>
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
      <View style={{ marginBottom: 16 }}>
        {/* Show system reminders if present */}
        {systemReminders.map((reminder, idx) => (
          <SystemReminderBlock key={`reminder-${idx}`} content={reminder} />
        ))}
        {/* Main assistant text */}
        {cleanText && (
          <Text style={{ color: theme.text, fontFamily: 'monospace', fontSize: 14, lineHeight: 20 }}>
            {cleanText}
          </Text>
        )}
      </View>
    );
  };

  const directoryName =
    session?.directory.split('/').pop() ||
    session?.directory.split('\\').pop() ||
    'Session';

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      {/* Permission Request Modal */}
      <PermissionRequest
        visible={showPermissionModal}
        request={permissionRequest}
        onApprove={handlePermissionApprove}
        onDeny={handlePermissionDeny}
      />
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000000' }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.borderLight, backgroundColor: colors.dark[900] }}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ flexDirection: 'row', alignItems: 'center' }}
            >
              <ArrowLeft size={20} color={theme.textSecondary} />
              <Text style={{ color: theme.textSecondary, marginLeft: 8, fontSize: 14 }}>Back</Text>
            </TouchableOpacity>

            {/* Center: Directory name or thinking indicator */}
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'center', marginHorizontal: 16 }}>
              {isThinking ? (
                <ThinkingIndicator isThinking={true} />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Terminal size={14} color={theme.primary} />
                  <Text style={{ color: colors.dark[100], fontFamily: 'monospace', fontSize: 14, marginLeft: 8 }} numberOfLines={1}>
                    {directoryName}
                  </Text>
                </View>
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
              <Text style={{ color: theme.border, fontFamily: 'monospace', fontSize: 12 }}>
                {entries.length}/{totalEntries}
              </Text>
            </View>
          </View>

          {/* Session path */}
          <View style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: 'rgba(0, 0, 0, 0.5)', borderBottomWidth: 1, borderBottomColor: colors.dark[800] }}>
            <Text style={{ color: theme.textTertiary, fontFamily: 'monospace', fontSize: 12 }} numberOfLines={1}>
              {session?.directory}
            </Text>
          </View>

          {/* Task Progress Panel */}
          {tasks.length > 0 && (
            <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
              <TaskProgress
                tasks={tasks}
                isCollapsed={!showTasksPanel}
                onToggleCollapse={() => setShowTasksPanel(!showTasksPanel)}
              />
            </View>
          )}

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
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, backgroundColor: 'rgba(0, 0, 0, 0.25)' }}
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
          ) : entries.length === 0 ? (
            <TerminalLoader variant="empty" />
          ) : (
            <ScrollView
              ref={scrollViewRef}
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 16, paddingBottom: 16 }}
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
              keyboardShouldPersistTaps="handled"
            >
              {entries.map((entry, index) => (
                <React.Fragment key={`${entry.id}-${entry.lineNumber}-${index}`}>
                  {renderEntry(entry)}
                </React.Fragment>
              ))}
            </ScrollView>
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

          {/* Bottom: Take Over button OR Input field */}
          <View style={{ borderTopWidth: 1, borderTopColor: theme.borderLight, backgroundColor: colors.dark[900] }}>
            {!hasTakenOver ? (
              <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
                <TouchableOpacity
                  onPress={handleTakeOver}
                  disabled={isTakingOver || !session}
                  style={{
                    paddingVertical: 12,
                    borderRadius: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isTakingOver || !session ? theme.backgroundSecondary : colors.primary[600]
                  }}
                >
                  {isTakingOver ? (
                    <>
                      <ActivityIndicator size="small" color="white" />
                      <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16, marginLeft: 8 }}>Connecting...</Text>
                    </>
                  ) : (
                    <>
                      <Play size={18} color="white" />
                      <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16, marginLeft: 8 }}>Take Over Session</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : isTakingOver ? (
              <View style={{ paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ color: colors.success[100], fontFamily: 'monospace', fontSize: 13, fontWeight: '700' }}>$</Text>
                  <Text style={{ color: theme.textSecondary, fontFamily: 'monospace', fontSize: 13 }}>Summoning Claude</Text>
                  <AnimatedConnectDots />
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8 }}>
                <TextInput
                  ref={inputRef}
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder="Type a message to Claude..."
                  placeholderTextColor={theme.textTertiary}
                  style={{ flex: 1, backgroundColor: theme.backgroundSecondary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, color: theme.text, fontFamily: 'monospace', fontSize: 14 }}
                  onSubmitEditing={handleSendMessage}
                  returnKeyType="send"
                  editable={!isSending && isSessionReady}
                />
                <TouchableOpacity
                  onPress={handleSendMessage}
                  disabled={!inputText.trim() || isSending || !isSessionReady}
                  style={{
                    marginLeft: 8,
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: inputText.trim() && !isSending && isSessionReady ? colors.primary[600] : theme.backgroundSecondary
                  }}
                >
                  {isSending ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Send size={20} color={inputText.trim() && isSessionReady ? 'white' : theme.textTertiary} />
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}
