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
import { wsService, TranscriptEntry, DiffHunk } from '@/services/websocket.service';
import { useClaudeStore } from '@/stores/claude.store';
import { colors } from '@/theme/colors';
import PermissionRequest, { PermissionRequestData } from '@/components/claude/PermissionRequest';

const INITIAL_LOAD = 400;
const LOAD_MORE_COUNT = 200;

export default function ClaudeSessionScreen() {
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
  const [totalEntries, setTotalEntries] = useState(0);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [permissionRequest, setPermissionRequest] = useState<PermissionRequestData | null>(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [thinkingOpacity, setThinkingOpacity] = useState(1);
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

      setEntries((prev) => {
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

    return () => {
      unsubClaudeMessage();
      unsubThinking();
      unsubPermission();
      unsubSessionEvent();
      unsubSessionConnected();
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

          // For user messages, check if there's an optimistic entry with same content
          // This prevents showing duplicate user messages when the transcript update arrives
          if (data.entry.type === 'user') {
            const entryText = data.entry.content?.text || '';
            const optimisticDuplicate = prev.find(e =>
              e.id.startsWith('local-') &&
              e.type === 'user' &&
              e.content?.text === entryText
            );
            if (optimisticDuplicate) {
              console.log('[Session] Replacing optimistic entry with real entry:', optimisticDuplicate.id, '->', data.entry.id);
              // Replace optimistic entry with real one (don't increment total)
              return prev.map(e => e.id === optimisticDuplicate.id ? data.entry : e);
            }
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
    // Use ref guard to prevent rapid duplicate sends (state may not update fast enough)
    if (sendingRef.current) {
      console.log('[Session] Blocked duplicate send - already sending');
      return;
    }
    if (!inputText.trim() || !deviceId || isSending || !isSessionReady) return;

    // Set ref guard immediately (synchronous)
    sendingRef.current = true;

    const message = inputText.trim();
    setInputText('');
    setIsSending(true);

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

    let bgColor = '';
    let textColor = 'text-dark-300';

    if (isAddition) {
      bgColor = 'bg-green-900/30';
      textColor = 'text-green-400';
    } else if (isDeletion) {
      bgColor = 'bg-red-900/30';
      textColor = 'text-red-400';
    }

    return (
      <View key={index} className={`${bgColor}`}>
        <Text className={`font-mono text-xs ${textColor}`}>
          {line}
        </Text>
      </View>
    );
  };

  const renderDiff = (diff: DiffHunk[]) => {
    return (
      <View className="mt-2 rounded bg-dark-800 overflow-hidden">
        {diff.map((hunk, hunkIndex) => (
          <View key={hunkIndex}>
            <View className="bg-dark-700 px-2 py-1">
              <Text className="font-mono text-xs text-dark-400">
                @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
              </Text>
            </View>
            <View className="px-2 py-1">
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
      <View className="mt-2 rounded bg-dark-800 overflow-hidden">
        {/* Header showing it's a new file */}
        <View className="bg-green-900/30 px-2 py-1 border-b border-dark-700">
          <Text className="font-mono text-xs text-green-400">
            +++ {fileName} (new file, {lineCount} lines)
          </Text>
        </View>
        {/* Content as additions */}
        <View className="px-2 py-1">
          {lines.slice(0, 50).map((line, index) => (
            <View key={index} className="bg-green-900/20">
              <Text className="font-mono text-xs text-green-400">
                +{line}
              </Text>
            </View>
          ))}
          {lines.length > 50 && (
            <View className="bg-dark-700 px-2 py-1">
              <Text className="font-mono text-xs text-dark-400">
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

    // User input - shown as prompt
    if (isUser) {
      return (
        <View className="mb-4">
          <View className="flex-row items-start">
            <Text className="text-primary-400 font-mono mr-2">{'>'}</Text>
            <Text className="text-dark-50 font-mono flex-1">
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
        <View className="mb-2">
          <TouchableOpacity
            onPress={() => toggleToolExpand(item.id)}
            className="flex-row items-center py-1"
          >
            {isExpanded ? (
              <ChevronDown size={14} color={isWrite ? colors.primary[400] : colors.dark[300]} />
            ) : (
              <ChevronRight size={14} color={isWrite ? colors.primary[400] : colors.dark[300]} />
            )}
            <Text className={`font-mono text-xs ml-1 ${isWrite ? 'text-primary-400' : 'text-dark-300'}`}>
              {item.content?.toolName}
            </Text>
            {fileName && (
              <Text className="text-dark-400 font-mono text-xs ml-2">
                {fileName}
              </Text>
            )}
          </TouchableOpacity>
          {isExpanded && (
            <View className="ml-4 pl-2 border-l border-dark-600">
              {/* Show file content as diff for Write operations */}
              {isWrite && hasFileContent ? (
                renderNewFileContent(writeData!.content!, filePath)
              ) : item.content?.text ? (
                <Text className="text-dark-400 font-mono text-xs">
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
        <View className="mb-2 ml-4">
          <TouchableOpacity
            onPress={() => toggleToolExpand(item.id)}
            className="flex-row items-center"
          >
            {isExpanded ? (
              <ChevronDown size={12} color={hasDiff ? colors.primary[400] : colors.dark[400]} />
            ) : (
              <ChevronRight size={12} color={hasDiff ? colors.primary[400] : colors.dark[400]} />
            )}
            <Text className={`font-mono text-xs ml-1 ${
              item.content?.isError
                ? 'text-error-300'
                : hasDiff
                  ? 'text-primary-400'
                  : 'text-dark-400'
            }`}>
              {item.content?.isError ? 'error' : hasDiff ? item.content?.text || 'diff' : 'result'}
            </Text>
            {item.content?.filePath && (
              <Text className="font-mono text-xs ml-2 text-dark-500">
                {item.content.filePath.split(/[/\\]/).pop()}
              </Text>
            )}
          </TouchableOpacity>
          {isExpanded && (
            <View className="ml-4 mt-1">
              {hasDiff ? (
                renderDiff(item.content!.diff!)
              ) : (
                <Text className={`font-mono text-xs ${item.content?.isError ? 'text-error-200' : 'text-dark-300'}`}>
                  {item.content?.text}
                </Text>
              )}
            </View>
          )}
        </View>
      );
    }

    // Assistant message - main content
    return (
      <View style={{ marginBottom: 16 }}>
        <Text style={{ color: '#E5E7EB', fontFamily: 'monospace', fontSize: 14, lineHeight: 20 }}>
          {item.content?.text}
        </Text>
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
      <SafeAreaView className="flex-1 bg-black">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-dark-700 bg-dark-900">
            <TouchableOpacity
              onPress={() => router.back()}
              className="flex-row items-center"
            >
              <ArrowLeft size={20} color={colors.dark[200]} />
              <Text className="text-dark-200 ml-2 text-sm">Back</Text>
            </TouchableOpacity>

            <View className="flex-row items-center">
              {isThinking ? (
                <View style={{ opacity: thinkingOpacity }} className="flex-row items-center">
                  <Brain size={16} color={colors.primary[400]} />
                  <Text className="text-primary-400 font-mono text-sm ml-2">
                    Thinking...
                  </Text>
                </View>
              ) : (
                <>
                  <Terminal size={16} color={colors.primary[500]} />
                  <Text className="text-dark-100 font-mono text-sm ml-2">
                    {directoryName}
                  </Text>
                </>
              )}
            </View>

            {/* Entry count */}
            <Text className="text-dark-500 font-mono text-xs">
              {entries.length}/{totalEntries}
            </Text>
          </View>

          {/* Session path */}
          <View className="px-4 py-2 bg-dark-900/50 border-b border-dark-800">
            <Text className="text-dark-400 font-mono text-xs" numberOfLines={1}>
              {session?.directory}
            </Text>
          </View>

          {/* Load more indicator */}
          {hasMore && (
            <TouchableOpacity
              onPress={loadMore}
              disabled={isLoadingMore}
              className="flex-row items-center justify-center py-2 bg-dark-800/50"
            >
              {isLoadingMore ? (
                <ActivityIndicator size="small" color={colors.dark[400]} />
              ) : (
                <>
                  <ChevronUp size={14} color={colors.dark[400]} />
                  <Text className="text-dark-400 text-xs ml-1">Load older messages</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Terminal-style output */}
          {isLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color={colors.primary[500]} />
              <Text className="text-dark-400 mt-4 font-mono">Loading transcript...</Text>
            </View>
          ) : entries.length === 0 ? (
            <View className="flex-1 items-center justify-center px-8">
              <Terminal size={40} color={colors.dark[500]} />
              <Text className="text-dark-400 mt-4 text-center font-mono">
                No conversation history
              </Text>
              <Text className="text-dark-500 mt-2 text-center font-mono text-xs">
                Transcript will appear as Claude works
              </Text>
            </View>
          ) : (
            <ScrollView
              ref={scrollViewRef}
              className="flex-1"
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

          {/* Bottom: Take Over button OR Input field */}
          <View className="border-t border-dark-700 bg-dark-900">
            {!hasTakenOver ? (
              <View className="px-4 py-3">
                <TouchableOpacity
                  onPress={handleTakeOver}
                  disabled={isTakingOver || !session}
                  className={`py-3 rounded-xl flex-row items-center justify-center ${
                    isTakingOver || !session ? 'bg-dark-700' : 'bg-primary-600'
                  }`}
                >
                  {isTakingOver ? (
                    <>
                      <ActivityIndicator size="small" color="white" />
                      <Text className="text-white font-bold text-base ml-2">Connecting...</Text>
                    </>
                  ) : (
                    <>
                      <Play size={18} color="white" />
                      <Text className="text-white font-bold text-base ml-2">Take Over Session</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : isTakingOver ? (
              <View className="px-4 py-4 flex-row items-center justify-center">
                <ActivityIndicator size="small" color={colors.primary[500]} />
                <Text className="text-dark-300 ml-3 font-mono text-sm">Connecting to Claude...</Text>
              </View>
            ) : (
              <View className="flex-row items-center px-3 py-2">
                <TextInput
                  ref={inputRef}
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder="Type a message to Claude..."
                  placeholderTextColor={colors.dark[400]}
                  className="flex-1 bg-dark-700 rounded-xl px-4 py-3 text-dark-50 font-mono text-sm"
                  onSubmitEditing={handleSendMessage}
                  returnKeyType="send"
                  editable={!isSending && isSessionReady}
                />
                <TouchableOpacity
                  onPress={handleSendMessage}
                  disabled={!inputText.trim() || isSending || !isSessionReady}
                  className={`ml-2 p-3 rounded-xl ${
                    inputText.trim() && !isSending && isSessionReady ? 'bg-primary-600' : 'bg-dark-700'
                  }`}
                >
                  {isSending ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Send size={20} color={inputText.trim() && isSessionReady ? 'white' : colors.dark[400]} />
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
