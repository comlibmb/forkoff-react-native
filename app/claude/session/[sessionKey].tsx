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
import { ArrowLeft, Play, ChevronRight, ChevronDown, Terminal, ChevronUp, Send } from 'lucide-react-native';
import { wsService, TranscriptEntry, DiffHunk } from '@/services/websocket.service';
import { useClaudeStore } from '@/stores/claude.store';
import { colors } from '@/theme/colors';

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
  const [totalEntries, setTotalEntries] = useState(0);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
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

  useEffect(() => {
    if (!sessionKey || !deviceId || !session?.transcriptPath) {
      setIsLoading(false);
      return;
    }

    // Subscribe to transcript updates
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

    // Listen for history response
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

    // Listen for live updates
    const unsubUpdate = wsService.on('transcript_update', (data) => {
      if (data.sessionKey === sessionKey) {
        console.log('[Session] NEW ENTRY:', data.entry?.type, '- text:', data.entry?.content?.text?.substring(0, 30));
        setEntries((prev) => {
          if (!data.entry) return prev;
          // Check for duplicates by ID or lineNumber
          const entryId = data.entry.id;
          const lineNum = data.entry.lineNumber;
          const isDuplicate = prev.some(e => e.id === entryId || (lineNum > 0 && e.lineNumber === lineNum));
          if (isDuplicate) {
            console.log('[Session] Skipping duplicate entry:', entryId);
            return prev;
          }
          return [...prev, data.entry];
        });
        setTotalEntries((prev) => prev + 1);

        // Clear waiting state when we get any response from Claude (not user)
        if (data.entry?.type !== 'user') {
          console.log('[Session] Clearing waiting state for type:', data.entry?.type);
          setIsWaitingForResponse(false);
        }

        // Auto-scroll to bottom on new messages
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    });

    return () => {
      wsService.emit('transcript_unsubscribe', { deviceId, sessionKey });
      unsubHistory();
      unsubUpdate();
    };
  }, [sessionKey, deviceId, session?.transcriptPath]);

  // Listen for terminal output when taken over
  useEffect(() => {
    if (!hasTakenOver || !terminalSessionId) return;

    const unsubOutput = wsService.on('terminal_output', (data) => {
      if (data.terminalSessionId === terminalSessionId) {
        // Session is ready when we get first output
        if (!isSessionReady && (data.type === 'stdout' || data.type === 'stderr')) {
          setIsSessionReady(true);
          setIsTakingOver(false);
          inputRef.current?.focus();
        }
        // Terminal output is handled - Claude responses come via transcript_update
        if (data.type === 'exit') {
          setHasTakenOver(false);
          setIsSessionReady(false);
          setTerminalSessionId(null);
        }
      }
    });

    // Also listen for cwd updates as a sign session is ready
    const unsubCwd = wsService.on('terminal_cwd' as any, (data: any) => {
      if (data.terminalSessionId === terminalSessionId && !isSessionReady) {
        setIsSessionReady(true);
        setIsTakingOver(false);
        inputRef.current?.focus();
      }
    });

    return () => {
      unsubOutput();
      unsubCwd();
    };
  }, [hasTakenOver, terminalSessionId, isSessionReady]);

  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore || !session?.transcriptPath) return;

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
    const newTerminalSessionId = `claude-takeover-${sessionKey}-${Date.now()}`;
    setTerminalSessionId(newTerminalSessionId);
    console.log('[Session] terminalSessionId:', newTerminalSessionId);

    // Subscribe to terminal output
    wsService.subscribeToTerminal(newTerminalSessionId);

    // Request resume
    console.log('[Session] Sending claude_resume_session to device:', deviceId);
    wsService.emit('claude_resume_session', {
      deviceId,
      sessionKey,
      directory: session.directory,
      terminalSessionId: newTerminalSessionId,
    });

    // Mark as taken over - isTakingOver will be set false when session is ready
    setHasTakenOver(true);

    // Fallback timeout in case we don't get confirmation
    setTimeout(() => {
      if (!isSessionReady) {
        setIsSessionReady(true);
        setIsTakingOver(false);
        inputRef.current?.focus();
      }
    }, 3000);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !terminalSessionId || !deviceId || isSending || !isSessionReady) return;

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

    // Send command to terminal
    wsService.sendTerminalCommand(terminalSessionId, message + '\n', deviceId);

    // Reset sending state after a short delay (response comes via transcript_update)
    setTimeout(() => {
      setIsSending(false);
    }, 300);
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

    // Tool use - collapsible
    if (isToolUse) {
      return (
        <View className="mb-2">
          <TouchableOpacity
            onPress={() => toggleToolExpand(item.id)}
            className="flex-row items-center py-1"
          >
            {isExpanded ? (
              <ChevronDown size={14} color={colors.dark[300]} />
            ) : (
              <ChevronRight size={14} color={colors.dark[300]} />
            )}
            <Text className="text-dark-300 font-mono text-xs ml-1">
              {item.content?.toolName}
            </Text>
          </TouchableOpacity>
          {isExpanded && item.content?.text && (
            <View className="ml-4 pl-2 border-l border-dark-600">
              <Text className="text-dark-400 font-mono text-xs">
                {item.content.text.substring(0, 500)}
                {item.content.text.length > 500 ? '...' : ''}
              </Text>
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
              <Terminal size={16} color={colors.primary[500]} />
              <Text className="text-dark-100 font-mono text-sm ml-2">
                {directoryName}
              </Text>
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
