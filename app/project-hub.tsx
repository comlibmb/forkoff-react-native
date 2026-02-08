import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  Folder,
  Laptop,
  Clock,
  FileText,
  ChevronRight,
  WifiOff,
  Plus,
  CheckCircle2,
  Circle,
  Loader,
} from 'lucide-react-native';
import { useClaudeStore } from '@/stores/claude.store';
import { useDeviceStore } from '@/stores/device.store';
import { useProjectHubStore } from '@/stores/project-hub.store';
import { ClaudeSession } from '@/types';
import { useTheme } from '@/theme/ThemeProvider';
import { colors } from '@/theme/colors';
import { SessionListItem, formatTimeAgo } from '@/components/project/SessionListItem';
import { QuickActionGrid, QuickAction } from '@/components/project/QuickActionGrid';

const STATUS_CHECK_PROMPT = 'Quick status — git status, failing tests, recent changes. Keep it brief.';
const BRAINSTORM_PROMPT = 'Top 3 improvements, missing features, or tech debt items for this project. Be concise.';
const INITIALIZE_PROMPT = 'Create a CLAUDE.md file for this project with a brief description, tech stack, and key files.';

export default function ProjectHubScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { deviceId, directory, deviceName } = useLocalSearchParams<{
    deviceId: string;
    directory: string;
    deviceName: string;
  }>();

  // Store state
  const sessions = useClaudeStore((s) => s.sessions);
  const devices = useDeviceStore((s) => s.devices);
  const {
    claudeMdLoading,
    previewLoading,
    fetchClaudeMd,
    fetchLastActivity,
    cache,
    getCacheKey,
    extractTasks,
  } = useProjectHubStore();

  const [showTodos, setShowTodos] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Get device info
  const device = useMemo(
    () => devices.find((d) => d.id === deviceId),
    [devices, deviceId],
  );
  const isDeviceOnline = device?.status?.toUpperCase() === 'ONLINE';

  // Get project sessions (sorted by most recent)
  const projectSessions = useMemo(() => {
    const deviceSessions = sessions.get(deviceId!) || [];
    return deviceSessions
      .filter((s) => s.directory === directory)
      .sort((a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime());
  }, [sessions, deviceId, directory]);

  const mostRecentSession = projectSessions[0] || null;
  const hasActiveSession = projectSessions.some((s) => s.state?.toUpperCase() === 'ACTIVE');

  // Get project display name (last path segment)
  const projectName = useMemo(() => {
    return directory?.replace(/\\/g, '/').split('/').filter(Boolean).pop() || directory;
  }, [directory]);

  // Get cached hub data
  const cacheKey = getCacheKey(deviceId!, directory!);
  const cachedData = cache.get(cacheKey);
  const claudeMd = cachedData?.claudeMd || null;
  const claudeMdExists = cachedData?.claudeMdExists ?? false;

  // Get last activity from session-specific cache
  const sessionCacheKey = mostRecentSession
    ? `${deviceId}:session:${mostRecentSession.sessionKey}`
    : null;
  const activityData = sessionCacheKey ? cache.get(sessionCacheKey) : null;
  const lastEntries = activityData?.lastEntries || [];
  const tasks = activityData?.tasks || [];

  // Fetch data on mount
  useEffect(() => {
    if (!deviceId || !directory) return;

    if (isDeviceOnline) {
      fetchClaudeMd(deviceId, directory);
    }

    if (mostRecentSession?.transcriptPath) {
      fetchLastActivity(
        deviceId,
        mostRecentSession.sessionKey,
        mostRecentSession.transcriptPath,
      );
    }
  }, [deviceId, directory, isDeviceOnline, mostRecentSession?.sessionKey]);

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    if (isDeviceOnline && deviceId && directory) {
      fetchClaudeMd(deviceId, directory);
    }
    if (mostRecentSession?.transcriptPath && deviceId) {
      fetchLastActivity(
        deviceId,
        mostRecentSession.sessionKey,
        mostRecentSession.transcriptPath,
      );
    }
    setTimeout(() => setRefreshing(false), 1500);
  }, [deviceId, directory, isDeviceOnline, mostRecentSession, fetchClaudeMd, fetchLastActivity]);

  // Quick action handler
  const handleQuickAction = useCallback(
    (actionId: QuickAction['id']) => {
      if (!deviceId) return;

      switch (actionId) {
        case 'continue': {
          if (!mostRecentSession) return;
          router.push({
            pathname: '/claude/session/[sessionKey]',
            params: {
              sessionKey: mostRecentSession.sessionKey,
              deviceId,
            },
          });
          break;
        }
        case 'status_check': {
          if (!isDeviceOnline) return;
          const terminalId = `status-${Date.now()}`;
          router.push({
            pathname: '/claude/session/[sessionKey]',
            params: {
              sessionKey: terminalId,
              deviceId,
              autoPrompt: STATUS_CHECK_PROMPT,
              autoDirectory: directory!,
            },
          });
          break;
        }
        case 'brainstorm': {
          if (!isDeviceOnline) return;
          const brainTerminalId = `brainstorm-${Date.now()}`;
          router.push({
            pathname: '/claude/session/[sessionKey]',
            params: {
              sessionKey: brainTerminalId,
              deviceId,
              autoPrompt: BRAINSTORM_PROMPT,
              autoDirectory: directory!,
            },
          });
          break;
        }
        case 'view_todos': {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setShowTodos((prev) => !prev);
          break;
        }
      }
    },
    [deviceId, directory, mostRecentSession, isDeviceOnline, router],
  );

  // Session press handler
  const handleSessionPress = useCallback(
    (devId: string, session: ClaudeSession) => {
      router.push({
        pathname: '/claude/session/[sessionKey]',
        params: {
          sessionKey: session.sessionKey,
          deviceId: devId,
        },
      });
    },
    [router],
  );

  // Initialize project handler
  const handleInitialize = useCallback(() => {
    if (!deviceId || !isDeviceOnline) return;
    const terminalId = `init-${Date.now()}`;
    router.push({
      pathname: '/claude/session/[sessionKey]',
      params: {
        sessionKey: terminalId,
        deviceId,
        autoPrompt: INITIALIZE_PROMPT,
        autoDirectory: directory!,
      },
    });
  }, [deviceId, directory, isDeviceOnline, router]);

  // Get last user message from entries for preview
  const lastUserMessage = useMemo(() => {
    for (const entry of lastEntries) {
      if (entry.type === 'user' && entry.content?.text) {
        return entry.content.text;
      }
    }
    return null;
  }, [lastEntries]);

  // Task summary
  const taskSummary = useMemo(() => {
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const pending = tasks.filter((t) => t.status !== 'completed').length;
    return { completed, pending, total: tasks.length };
  }, [tasks]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.backgroundTertiary }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={22} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
              {projectName}
            </Text>
            <View style={styles.headerMeta}>
              <Laptop size={11} color={theme.textTertiary} />
              <Text style={[styles.headerSubtitle, { color: theme.textTertiary }]}>
                {deviceName || device?.name || 'Device'}
              </Text>
              <Text style={[styles.headerDot, { color: theme.textTertiary }]}>{'\u2022'}</Text>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: isDeviceOnline ? colors.success[300] : theme.textTertiary },
                ]}
              />
              <Text style={[styles.headerSubtitle, { color: theme.textTertiary }]}>
                {isDeviceOnline ? 'Online' : 'Offline'}
              </Text>
              {mostRecentSession && (
                <>
                  <Text style={[styles.headerDot, { color: theme.textTertiary }]}>{'\u2022'}</Text>
                  <Text style={[styles.headerSubtitle, { color: theme.textTertiary }]}>
                    {formatTimeAgo(mostRecentSession.lastUsedAt)}
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.primary}
            />
          }
        >
          {/* Summary Card */}
          <View style={[styles.card, { backgroundColor: theme.backgroundSecondary }]}>
            <View style={styles.cardHeader}>
              <FileText size={16} color={theme.textSecondary} />
              <Text style={[styles.cardTitle, { color: theme.textSecondary }]}>
                About this project
              </Text>
            </View>

            {claudeMdLoading ? (
              <ActivityIndicator size="small" color={theme.primary} style={{ marginTop: 8 }} />
            ) : claudeMdExists && claudeMd ? (
              <Text
                style={[styles.summaryText, { color: theme.text }]}
                numberOfLines={5}
              >
                {claudeMd.substring(0, 200)}
                {claudeMd.length > 200 ? '...' : ''}
              </Text>
            ) : !isDeviceOnline ? (
              <View style={styles.offlineRow}>
                <WifiOff size={14} color={theme.textTertiary} />
                <Text style={[styles.offlineText, { color: theme.textTertiary }]}>
                  Device offline
                </Text>
              </View>
            ) : (
              <View>
                <Text style={[styles.noSummaryText, { color: theme.textTertiary }]}>
                  No CLAUDE.md found
                </Text>
                <TouchableOpacity
                  onPress={handleInitialize}
                  style={[styles.initButton, { backgroundColor: theme.primary + '20' }]}
                >
                  <Plus size={14} color={theme.primary} />
                  <Text style={[styles.initButtonText, { color: theme.primary }]}>
                    Initialize Project
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Last Activity Card */}
          {mostRecentSession && (
            <View style={[styles.card, { backgroundColor: theme.backgroundSecondary }]}>
              <View style={styles.cardHeader}>
                <Clock size={16} color={theme.textSecondary} />
                <Text style={[styles.cardTitle, { color: theme.textSecondary }]}>
                  Where you left off
                </Text>
              </View>

              {previewLoading ? (
                <ActivityIndicator size="small" color={theme.primary} style={{ marginTop: 8 }} />
              ) : (
                <>
                  {lastUserMessage && (
                    <Text
                      style={[styles.lastPromptText, { color: theme.text }]}
                      numberOfLines={2}
                    >
                      "{lastUserMessage}"
                    </Text>
                  )}

                  {taskSummary.total > 0 && (
                    <View style={styles.taskSummaryRow}>
                      <Text style={[styles.taskSummaryText, { color: theme.textSecondary }]}>
                        {taskSummary.total} task{taskSummary.total !== 1 ? 's' : ''}:
                      </Text>
                      {taskSummary.completed > 0 && (
                        <View style={styles.taskBadge}>
                          <CheckCircle2 size={12} color={colors.success[300]} />
                          <Text style={[styles.taskBadgeText, { color: colors.success[300] }]}>
                            {taskSummary.completed}
                          </Text>
                        </View>
                      )}
                      {taskSummary.pending > 0 && (
                        <View style={styles.taskBadge}>
                          <Circle size={12} color={theme.textTertiary} />
                          <Text style={[styles.taskBadgeText, { color: theme.textTertiary }]}>
                            {taskSummary.pending} pending
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  <TouchableOpacity
                    onPress={() =>
                      handleSessionPress(deviceId!, mostRecentSession)
                    }
                    style={styles.openSessionRow}
                  >
                    <Text style={[styles.openSessionText, { color: theme.primary }]}>
                      Tap to open session
                    </Text>
                    <ChevronRight size={14} color={theme.primary} />
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              Quick Actions
            </Text>
            <QuickActionGrid
              onAction={handleQuickAction}
              disabled={false}
              hasMostRecentSession={!!mostRecentSession}
              hasTasks={tasks.length > 0}
            />
          </View>

          {/* Inline Todos (shown when View Todos is tapped) */}
          {showTodos && (
            <View style={[styles.card, { backgroundColor: theme.backgroundSecondary }]}>
              <Text style={[styles.cardTitle, { color: theme.textSecondary, marginBottom: 8 }]}>
                Tasks
              </Text>
              {tasks.length === 0 ? (
                <Text style={[styles.noSummaryText, { color: theme.textTertiary }]}>
                  No tasks found in recent session
                </Text>
              ) : (
                tasks.map((task) => (
                  <View key={task.id} style={styles.taskRow}>
                    {task.status === 'completed' ? (
                      <CheckCircle2 size={16} color={colors.success[300]} />
                    ) : task.status === 'in_progress' ? (
                      <Loader size={16} color={theme.primary} />
                    ) : (
                      <Circle size={16} color={theme.textTertiary} />
                    )}
                    <Text
                      style={[
                        styles.taskText,
                        {
                          color: task.status === 'completed' ? theme.textTertiary : theme.text,
                          textDecorationLine:
                            task.status === 'completed' ? 'line-through' : 'none',
                        },
                      ]}
                      numberOfLines={2}
                    >
                      {task.subject}
                    </Text>
                  </View>
                ))
              )}
            </View>
          )}

          {/* Sessions List */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                Sessions ({projectSessions.length})
              </Text>
            </View>

            {projectSessions.length === 0 ? (
              <Text style={[styles.noSummaryText, { color: theme.textTertiary }]}>
                No sessions yet
              </Text>
            ) : (
              <View
                style={[
                  styles.sessionListCard,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    borderColor: theme.backgroundTertiary,
                  },
                ]}
              >
                {projectSessions.slice(0, 5).map((session, index) => (
                  <SessionListItem
                    key={session.sessionKey}
                    session={session}
                    deviceId={deviceId!}
                    isLast={index === Math.min(projectSessions.length, 5) - 1}
                    onPress={handleSessionPress}
                  />
                ))}
              </View>
            )}

            {projectSessions.length > 5 && (
              <TouchableOpacity style={styles.seeAllButton}>
                <Text style={[styles.seeAllText, { color: theme.primary }]}>
                  See all {projectSessions.length} sessions
                </Text>
                <ChevronRight size={14} color={theme.primary} />
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  headerSubtitle: {
    fontSize: 12,
  },
  headerDot: {
    fontSize: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 20,
  },
  noSummaryText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  offlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  offlineText: {
    fontSize: 13,
  },
  initButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  initButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  lastPromptText: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  taskSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  taskSummaryText: {
    fontSize: 13,
  },
  taskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  taskBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  openSessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  openSessionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sessionListCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 8,
    paddingVertical: 8,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '500',
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 6,
  },
  taskText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
});
