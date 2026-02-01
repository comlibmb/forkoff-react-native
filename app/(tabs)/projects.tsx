import { useEffect, useState, useMemo, useCallback, useRef, memo } from 'react';
import { View, Text, FlatList, RefreshControl, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Folder,
  Terminal,
  Clock,
  ChevronRight,
  ChevronDown,
  Laptop,
  FolderOpen,
  MessageSquare,
} from 'lucide-react-native';
import { useClaudeStore } from '@/stores/claude.store';
import { useDeviceStore } from '@/stores/device.store';
import { ClaudeSession } from '@/types';
import { useTheme } from '@/theme/ThemeProvider';
import { TerminalLoader } from '@/components/claude/TerminalLoader';
import { colors } from '@/theme/colors';

// Memoized utility function (outside component to avoid recreation)
const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

// Memoized session item component
const SessionItem = memo(({
  session,
  deviceId,
  isLast,
  onPress,
  theme,
}: {
  session: ClaudeSession;
  deviceId: string;
  isLast: boolean;
  onPress: (deviceId: string, session: ClaudeSession) => void;
  theme: ReturnType<typeof useTheme>['theme'];
}) => {
  const isActive = session.state?.toUpperCase() === 'ACTIVE';

  const handlePress = useCallback(() => {
    onPress(deviceId, session);
  }, [deviceId, session, onPress]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[
        styles.sessionItem,
        !isLast && { borderBottomWidth: 1, borderBottomColor: theme.backgroundSecondary },
      ]}
    >
      <View style={styles.sessionContent}>
        <View
          style={[
            styles.sessionIcon,
            {
              backgroundColor: theme.backgroundSecondary,
              borderColor: theme.backgroundTertiary,
            },
          ]}
        >
          <MessageSquare
            size={14}
            color={isActive ? theme.primary : theme.textTertiary}
          />
        </View>
        <View style={styles.sessionInfo}>
          <View style={styles.sessionTitleRow}>
            {isActive && (
              <View style={[styles.activeDotSmall, { backgroundColor: theme.primary }]} />
            )}
            <Text
              style={[styles.sessionKey, { color: theme.textSecondary }]}
              numberOfLines={1}
            >
              {session.sessionKey}
            </Text>
          </View>
          <View style={styles.sessionMeta}>
            <Clock size={10} color={theme.border} />
            <Text style={[styles.sessionTime, { color: theme.border }]}>
              {formatTimeAgo(session.lastUsedAt)}
            </Text>
            {isActive && (
              <>
                <Text style={[styles.metaDot, { color: theme.backgroundTertiary }]}>
                  {'\u2022'}
                </Text>
                <Text style={[styles.activeLabel, { color: theme.primary }]}>Active</Text>
              </>
            )}
          </View>
        </View>
      </View>
      <ChevronRight size={16} color={theme.border} />
    </TouchableOpacity>
  );
});

// Memoized project card component
const ProjectCard = memo(({
  project,
  deviceId,
  isExpanded,
  onToggle,
  onSessionPress,
  theme,
}: {
  project: {
    directory: string;
    sessions: ClaudeSession[];
    lastUsedAt: string;
    hasActive: boolean;
  };
  deviceId: string;
  isExpanded: boolean;
  onToggle: (key: string) => void;
  onSessionPress: (deviceId: string, session: ClaudeSession) => void;
  theme: ReturnType<typeof useTheme>['theme'];
}) => {
  const projectKey = `${deviceId}:${project.directory}`;
  const directoryName = useMemo(() =>
    project.directory.split('/').pop() ||
    project.directory.split('\\').pop() ||
    project.directory,
    [project.directory]
  );
  const sessionCount = project.sessions.length;

  const handleToggle = useCallback(() => {
    onToggle(projectKey);
  }, [onToggle, projectKey]);

  return (
    <View style={[styles.projectCard, { backgroundColor: theme.backgroundSecondary }]}>
      {project.hasActive && (
        <View style={[styles.glowEffect, { backgroundColor: theme.primary }]} />
      )}

      <TouchableOpacity onPress={handleToggle} style={styles.projectHeader}>
        <View style={styles.projectHeaderRow}>
          <View style={styles.projectHeaderLeft}>
            <View style={[styles.folderIcon, { backgroundColor: theme.backgroundTertiary }]}>
              <Folder
                size={20}
                color={project.hasActive ? theme.primary : theme.textTertiary}
              />
            </View>
            <View style={styles.projectTitleContainer}>
              <View style={styles.projectTitleRow}>
                {project.hasActive && (
                  <View style={[styles.activeDot, { backgroundColor: theme.primary }]} />
                )}
                <Text style={[styles.projectName, { color: theme.text }]} numberOfLines={1}>
                  {directoryName}
                </Text>
              </View>
              <Text
                style={[styles.projectPath, { color: theme.textTertiary }]}
                numberOfLines={1}
              >
                {project.directory}
              </Text>
              <View style={styles.projectMeta}>
                <Terminal size={10} color={theme.textTertiary} />
                <Text style={[styles.projectMetaText, { color: theme.textTertiary }]}>
                  {sessionCount} session{sessionCount !== 1 ? 's' : ''}
                </Text>
                <Text style={[styles.projectMetaDot, { color: theme.border }]}>
                  {'\u2022'}
                </Text>
                <Clock size={10} color={theme.textTertiary} />
                <Text style={[styles.projectMetaText, { color: theme.textTertiary }]}>
                  {formatTimeAgo(project.lastUsedAt)}
                </Text>
              </View>
            </View>
          </View>
          {isExpanded ? (
            <ChevronDown size={20} color={theme.textTertiary} />
          ) : (
            <ChevronRight size={20} color={theme.textTertiary} />
          )}
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View
          style={[
            styles.sessionList,
            {
              borderTopColor: theme.backgroundTertiary,
              backgroundColor: theme.backgroundTertiary,
            },
          ]}
        >
          {project.sessions.map((session, index) => (
            <SessionItem
              key={session.sessionKey}
              session={session}
              deviceId={deviceId}
              isLast={index === project.sessions.length - 1}
              onPress={onSessionPress}
              theme={theme}
            />
          ))}
        </View>
      )}
    </View>
  );
});

// Memoized device group component - styled as macOS window
const DeviceGroup = memo(({
  deviceGroup,
  expandedProjects,
  onToggleProject,
  onSessionPress,
  theme,
}: {
  deviceGroup: {
    device: { id: string; name: string };
    projects: {
      directory: string;
      sessions: ClaudeSession[];
      lastUsedAt: string;
      hasActive: boolean;
    }[];
  };
  expandedProjects: Set<string>;
  onToggleProject: (key: string) => void;
  onSessionPress: (deviceId: string, session: ClaudeSession) => void;
  theme: ReturnType<typeof useTheme>['theme'];
}) => {
  const hasActiveProject = deviceGroup.projects.some(p => p.hasActive);

  return (
    <View
      style={[
        styles.deviceWindow,
        {
          backgroundColor: theme.background,
          borderColor: theme.backgroundTertiary,
        },
      ]}
    >
      {/* macOS Title Bar */}
      <View
        style={[
          styles.deviceTitleBar,
          {
            backgroundColor: theme.backgroundSecondary,
            borderBottomColor: theme.backgroundTertiary,
          },
        ]}
      >
        <View style={styles.trafficLights}>
          <View style={[styles.trafficDot, { backgroundColor: theme.error }]} />
          <View style={[styles.trafficDot, { backgroundColor: theme.warning }]} />
          <View style={[styles.trafficDot, { backgroundColor: theme.success }]} />
        </View>
        <View style={styles.deviceTitleContent}>
          <Laptop size={14} color={theme.textTertiary} />
          <Text style={[styles.deviceTitleText, { color: theme.textSecondary }]}>
            {deviceGroup.device.name}
          </Text>
        </View>
        <View style={styles.deviceTitleRight}>
          <Text style={[styles.projectCount, { color: theme.textTertiary }]}>
            {deviceGroup.projects.length} project{deviceGroup.projects.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {/* Projects Content */}
      <View style={styles.deviceContent}>
        {deviceGroup.projects.map((project) => (
          <ProjectCard
            key={project.directory}
            project={project}
            deviceId={deviceGroup.device.id}
            isExpanded={expandedProjects.has(`${deviceGroup.device.id}:${project.directory}`)}
            onToggle={onToggleProject}
            onSessionPress={onSessionPress}
            theme={theme}
          />
        ))}
      </View>

      {/* Accent bar */}
      <View
        style={[
          styles.deviceAccentBar,
          { backgroundColor: hasActiveProject ? theme.primary : theme.backgroundTertiary },
        ]}
      />
    </View>
  );
});

// Empty states as memoized components
const NoDevicesState = memo(({ theme }: { theme: ReturnType<typeof useTheme>['theme'] }) => (
  <View style={styles.emptyStateContainer}>
    <Laptop size={64} color={theme.backgroundTertiary} />
    <Text style={[styles.emptyStateTitle, { color: theme.textTertiary }]}>
      No devices connected
    </Text>
    <Text style={[styles.emptyStateSubtitle, { color: theme.border }]}>
      Connect a device to see Claude projects
    </Text>
  </View>
));

const NoSessionsState = memo(({ theme }: { theme: ReturnType<typeof useTheme>['theme'] }) => (
  <View style={styles.emptyStateContainer}>
    <FolderOpen size={64} color={theme.backgroundTertiary} />
    <Text style={[styles.emptyStateTitle, { color: theme.textTertiary }]}>
      No Claude sessions yet
    </Text>
    <Text style={[styles.emptyStateSubtitle, { color: theme.border }]}>
      Start a Claude session on any device to see it here
    </Text>
  </View>
));

export default function ProjectsScreen() {
  const { theme } = useTheme();
  // Use specific selectors to minimize re-renders
  const sessions = useClaudeStore((state) => state.sessions);
  const fetchSessions = useClaudeStore((state) => state.fetchSessions);
  const subscribeToUpdates = useClaudeStore((state) => state.subscribeToUpdates);
  const devices = useDeviceStore((state) => state.devices);
  const fetchDevices = useDeviceStore((state) => state.fetchDevices);

  const [refreshing, setRefreshing] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(() => new Set());

  // Scanning state
  const [isScanning, setIsScanning] = useState(true);
  const [scanStep, setScanStep] = useState(0);
  const [scanDeviceCount, setScanDeviceCount] = useState(0);
  const [scanProjectCount, setScanProjectCount] = useState(0);
  const hasInitializedRef = useRef(false);

  // Scan lines for the terminal loader
  const scanLines = useMemo(() => [
    {
      text: 'Looking for devices',
      color: theme.textSecondary,
      done: scanStep > 0,
    },
    {
      text: scanDeviceCount > 0
        ? `Found ${scanDeviceCount} device${scanDeviceCount !== 1 ? 's' : ''}`
        : 'Discovering devices',
      color: scanDeviceCount > 0 ? colors.success[100] : theme.textTertiary,
      done: scanStep > 1,
    },
    {
      text: scanProjectCount > 0
        ? `Scanned ${scanProjectCount} project${scanProjectCount !== 1 ? 's' : ''}`
        : 'Scanning for projects',
      color: scanProjectCount > 0 ? colors.success[100] : theme.textTertiary,
      done: scanStep > 2,
    },
    {
      text: 'All systems go',
      color: colors.success[100],
      done: scanStep > 3,
    },
  ], [scanStep, scanDeviceCount, scanProjectCount, theme]);

  // Auto-scan on mount
  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    const scan = async () => {
      // Step 0: Looking for devices
      setScanStep(0);

      await fetchDevices();

      // Step 1: Found devices
      const deviceState = useDeviceStore.getState();
      const foundDevices = deviceState.devices;
      setScanDeviceCount(foundDevices.length);
      setScanStep(1);

      if (foundDevices.length === 0) {
        // No devices - skip to done
        setTimeout(() => {
          setScanStep(3);
          setTimeout(() => setIsScanning(false), 400);
        }, 500);
        return;
      }

      // Step 2: Scanning projects per device
      await new Promise(r => setTimeout(r, 400));
      setScanStep(2);

      const sessionPromises = foundDevices.map(d => fetchSessions(d.id));
      await Promise.allSettled(sessionPromises);

      // Count projects
      const claudeState = useClaudeStore.getState();
      let projectCount = 0;
      const dirs = new Set<string>();
      for (const device of foundDevices) {
        const deviceSessions = claudeState.sessions.get(device.id) || [];
        for (const s of deviceSessions) {
          dirs.add(s.directory);
        }
      }
      projectCount = dirs.size;
      setScanProjectCount(projectCount);

      // Step 3: All systems go
      await new Promise(r => setTimeout(r, 500));
      setScanStep(3);

      // Done scanning
      await new Promise(r => setTimeout(r, 600));
      setIsScanning(false);
    };

    scan();
  }, [fetchDevices, fetchSessions]);

  // Subscribe to updates and set up polling - use device IDs as dependency
  const deviceIds = useMemo(() => devices.map(d => d.id).join(','), [devices]);

  useEffect(() => {
    if (devices.length === 0) return;
    // Don't start subscriptions during initial scan
    if (isScanning) return;

    const unsubscribers: (() => void)[] = [];

    for (const device of devices) {
      const unsub = subscribeToUpdates(device.id);
      unsubscribers.push(unsub);
    }

    const pollInterval = setInterval(() => {
      for (const device of devices) {
        fetchSessions(device.id);
      }
    }, 45000);

    return () => {
      unsubscribers.forEach((unsub) => unsub());
      clearInterval(pollInterval);
    };
  }, [deviceIds, fetchSessions, subscribeToUpdates, isScanning]);

  // Memoized grouped projects computation
  const deviceProjects = useMemo(() => {
    const result: {
      device: { id: string; name: string };
      projects: {
        directory: string;
        sessions: ClaudeSession[];
        lastUsedAt: string;
        hasActive: boolean;
      }[];
    }[] = [];

    for (const device of devices) {
      const deviceSessions = sessions.get(device.id) || [];
      if (deviceSessions.length === 0) continue;

      const grouped = new Map<string, ClaudeSession[]>();
      for (const session of deviceSessions) {
        const dir = session.directory;
        if (!grouped.has(dir)) {
          grouped.set(dir, []);
        }
        grouped.get(dir)!.push(session);
      }

      for (const projectSessions of grouped.values()) {
        projectSessions.sort(
          (a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime()
        );
      }

      const projects = Array.from(grouped.entries())
        .map(([directory, projectSessions]) => ({
          directory,
          sessions: projectSessions,
          lastUsedAt: projectSessions[0]?.lastUsedAt || new Date().toISOString(),
          hasActive: projectSessions.some((s) => s.state?.toUpperCase() === 'ACTIVE'),
        }))
        .sort((a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime());

      if (projects.length > 0) {
        result.push({
          device: { id: device.id, name: device.name },
          projects,
        });
      }
    }

    result.sort((a, b) => {
      const aLatest = a.projects[0]?.lastUsedAt || '';
      const bLatest = b.projects[0]?.lastUsedAt || '';
      return new Date(bLatest).getTime() - new Date(aLatest).getTime();
    });

    return result;
  }, [devices, sessions]);

  // Stable callbacks
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDevices();
    for (const device of devices) {
      await fetchSessions(device.id);
    }
    setRefreshing(false);
  }, [fetchDevices, fetchSessions, devices]);

  const toggleProject = useCallback((projectKey: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectKey)) {
        next.delete(projectKey);
      } else {
        next.add(projectKey);
      }
      return next;
    });
  }, []);

  const handleOpenSession = useCallback((deviceId: string, session: ClaudeSession) => {
    router.push({
      pathname: '/claude/session/[sessionKey]',
      params: {
        sessionKey: session.sessionKey,
        deviceId: deviceId,
      },
    });
  }, []);

  const totalProjects = useMemo(() =>
    deviceProjects.reduce((sum, d) => sum + d.projects.length, 0),
    [deviceProjects]
  );

  // Render item for FlatList
  const renderDeviceGroup = useCallback(({ item }: { item: typeof deviceProjects[0] }) => (
    <DeviceGroup
      deviceGroup={item}
      expandedProjects={expandedProjects}
      onToggleProject={toggleProject}
      onSessionPress={handleOpenSession}
      theme={theme}
    />
  ), [expandedProjects, toggleProject, handleOpenSession, theme]);

  const keyExtractor = useCallback((item: typeof deviceProjects[0]) => item.device.id, []);

  // Project count badge
  const projectBadge = (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: theme.backgroundSecondary,
          borderColor: theme.border,
        },
      ]}
    >
      <Text style={[styles.badgeText, { color: theme.textTertiary }]}>
        {totalProjects} project{totalProjects !== 1 ? 's' : ''}
      </Text>
    </View>
  );

  // Render content based on state
  const renderContent = () => {
    if (isScanning) {
      return (
        <TerminalLoader
          variant="scanning"
          scanLines={scanLines}
          scanStep={scanStep}
        />
      );
    }
    if (devices.length === 0) {
      return <NoDevicesState theme={theme} />;
    }
    if (deviceProjects.length === 0) {
      return <NoSessionsState theme={theme} />;
    }
    return (
      <FlatList
        data={deviceProjects}
        renderItem={renderDeviceGroup}
        keyExtractor={keyExtractor}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
          />
        }
        // Performance optimizations
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        windowSize={5}
        initialNumToRender={3}
      />
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.backgroundTertiary }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Projects</Text>
            <Text style={[styles.headerSubtitle, { color: theme.textTertiary }]}>
              Claude sessions grouped by directory
            </Text>
          </View>
          {projectBadge}
        </View>
      </View>

      {/* Project List */}
      <View style={[styles.contentContainer, { backgroundColor: theme.background }]}>
        {renderContent()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  // Device Window (macOS style)
  deviceWindow: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 20,
  },
  deviceTitleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  trafficLights: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trafficDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  deviceTitleContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
    gap: 8,
  },
  deviceTitleText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  deviceTitleRight: {
    marginLeft: 'auto',
  },
  projectCount: {
    fontSize: 11,
  },
  deviceContent: {
    padding: 12,
  },
  deviceAccentBar: {
    height: 3,
  },
  projectCard: {
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  glowEffect: {
    position: 'absolute',
    top: -48,
    right: -48,
    width: 96,
    height: 96,
    borderRadius: 48,
    opacity: 0.1,
  },
  projectHeader: {
    padding: 12,
  },
  projectHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  projectHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  folderIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  projectTitleContainer: {
    flex: 1,
  },
  projectTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  activeDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  projectName: {
    fontWeight: 'bold',
  },
  projectPath: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  projectMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  projectMetaText: {
    fontSize: 12,
    marginLeft: 4,
  },
  projectMetaDot: {
    marginHorizontal: 8,
  },
  sessionList: {
    borderTopWidth: 1,
  },
  sessionItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sessionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sessionIcon: {
    width: 32,
    height: 32,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionKey: {
    fontSize: 14,
    fontFamily: 'monospace',
  },
  sessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  sessionTime: {
    fontSize: 12,
    marginLeft: 4,
  },
  metaDot: {
    marginHorizontal: 8,
  },
  activeLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateTitle: {
    marginTop: 16,
    textAlign: 'center',
    fontSize: 18,
  },
  emptyStateSubtitle: {
    textAlign: 'center',
    marginTop: 8,
  },
});
