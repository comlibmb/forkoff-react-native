import { useEffect, useState, useMemo, useCallback, useRef, memo } from 'react';
import { View, Text, FlatList, RefreshControl, TouchableOpacity, StyleSheet, Modal, Switch, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Folder,
  Terminal,
  Clock,
  ChevronRight,
  Laptop,
  FolderOpen,
  SlidersHorizontal,
  X,
  Target,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useClaudeStore } from '@/stores/claude.store';
import { useDeviceStore } from '@/stores/device.store';
import { useProjectPreferencesStore } from '@/stores/project-preferences.store';
import { ClaudeSession } from '@/types';
import { useTheme } from '@/theme/ThemeProvider';
import { TerminalLoader } from '@/components/claude/TerminalLoader';
import { formatTimeAgo } from '@/components/project/SessionListItem';
import { colors } from '@/theme/colors';

// Folder status colors
const FOLDER_COLOR_ACTIVE = '#8b5cf6';   // purple (primary)
const FOLDER_COLOR_INACTIVE = '#6e7681'; // gray

// Compute unique short display names for a list of directory paths.
// Uses just the final folder name when unique, otherwise adds parent
// segments until every name is distinct.
const getUniqueProjectNames = (directories: string[]): Map<string, string> => {
  const pathSegments = directories.map(dir => ({
    dir,
    segments: dir.replace(/\\/g, '/').split('/').filter(Boolean),
  }));

  const segmentCounts = new Map<string, number>();
  for (const { dir } of pathSegments) {
    segmentCounts.set(dir, 1);
  }

  let hasDuplicates = true;
  while (hasDuplicates) {
    hasDuplicates = false;

    const nameToDirectories = new Map<string, string[]>();
    for (const { dir, segments } of pathSegments) {
      const count = segmentCounts.get(dir)!;
      const name = segments.slice(-count).join('/');
      if (!nameToDirectories.has(name)) {
        nameToDirectories.set(name, []);
      }
      nameToDirectories.get(name)!.push(dir);
    }

    for (const [, dirs] of nameToDirectories) {
      if (dirs.length > 1) {
        hasDuplicates = true;
        for (const d of dirs) {
          const { segments } = pathSegments.find(p => p.dir === d)!;
          const current = segmentCounts.get(d)!;
          if (current < segments.length) {
            segmentCounts.set(d, current + 1);
          }
        }
      }
    }
  }

  const result = new Map<string, string>();
  for (const { dir, segments } of pathSegments) {
    const count = segmentCounts.get(dir)!;
    result.set(dir, segments.slice(-count).join('/'));
  }
  return result;
};

// formatTimeAgo is now imported from @/components/project/SessionListItem

// Memoized project card component
const ProjectCard = memo(({
  project,
  deviceId,
  displayName,
  deviceName,
  theme,
}: {
  project: {
    directory: string;
    sessions: ClaudeSession[];
    lastUsedAt: string;
    hasActive: boolean;
  };
  deviceId: string;
  displayName: string;
  deviceName: string;
  theme: ReturnType<typeof useTheme>['theme'];
}) => {
  const sessionCount = project.sessions.length;
  const folderColor = project.hasActive ? FOLDER_COLOR_ACTIVE : FOLDER_COLOR_INACTIVE;

  const handlePress = useCallback(() => {
    router.push({
      pathname: '/project-hub',
      params: {
        deviceId,
        directory: project.directory,
        deviceName,
      },
    });
  }, [deviceId, project.directory, deviceName]);

  return (
    <View style={[styles.projectCard, { backgroundColor: theme.backgroundSecondary }]}>
      {project.hasActive && (
        <View style={[styles.glowEffect, { backgroundColor: FOLDER_COLOR_ACTIVE }]} />
      )}

      <TouchableOpacity onPress={handlePress} style={styles.projectHeader}>
        <View style={styles.projectHeaderRow}>
          <View style={styles.projectHeaderLeft}>
            <View style={[styles.folderIcon, { backgroundColor: folderColor + '18' }]}>
              <Folder
                size={20}
                color={folderColor}
              />
            </View>
            <View style={styles.projectTitleContainer}>
              <View style={styles.projectTitleRow}>
                {project.hasActive && (
                  <View style={[styles.activeDot, { backgroundColor: FOLDER_COLOR_ACTIVE }]} />
                )}
                <Text style={[styles.projectName, { color: theme.text }]} numberOfLines={1}>
                  {displayName}
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
          <ChevronRight size={20} color={theme.textTertiary} />
        </View>
      </TouchableOpacity>
    </View>
  );
});

// Memoized device group component - styled as macOS window
const DeviceGroup = memo(({
  deviceGroup,
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
  theme: ReturnType<typeof useTheme>['theme'];
}) => {
  const hasActiveProject = deviceGroup.projects.some(p => p.hasActive);

  const projectDisplayNames = useMemo(() =>
    getUniqueProjectNames(deviceGroup.projects.map(p => p.directory)),
    [deviceGroup.projects]
  );

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
            displayName={projectDisplayNames.get(project.directory) || project.directory}
            deviceName={deviceGroup.device.name}
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

const NoPinnedState = memo(({ theme, onManage }: { theme: ReturnType<typeof useTheme>['theme']; onManage: () => void }) => (
  <View style={styles.emptyStateContainer}>
    <Target size={64} color={theme.backgroundTertiary} />
    <Text style={[styles.emptyStateTitle, { color: theme.textTertiary }]}>
      No projects in focus
    </Text>
    <Text style={[styles.emptyStateSubtitle, { color: theme.border }]}>
      Choose which projects to show on this screen
    </Text>
    <TouchableOpacity
      style={[styles.emptyStateButton, { backgroundColor: theme.primary }]}
      onPress={onManage}
      activeOpacity={0.7}
    >
      <Folder size={16} color="#fff" />
      <Text style={styles.emptyStateButtonText}>Add your first project</Text>
    </TouchableOpacity>
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

  const pinnedProjects = useProjectPreferencesStore((state) => state.pinnedProjects);
  const togglePin = useProjectPreferencesStore((state) => state.togglePin);

  const [refreshing, setRefreshing] = useState(false);
  const [manageModalVisible, setManageModalVisible] = useState(false);

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

  // Memoized grouped projects computation (all projects)
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

  // Filter to only pinned projects for the main view
  const filteredDeviceProjects = useMemo(() => {
    return deviceProjects
      .map((group) => ({
        ...group,
        projects: group.projects.filter((p) =>
          pinnedProjects.includes(`${group.device.id}:${p.directory}`)
        ),
      }))
      .filter((group) => group.projects.length > 0);
  }, [deviceProjects, pinnedProjects]);

  // Flat list of all projects for the manage modal
  const allProjects = useMemo(() => {
    const result: {
      deviceId: string;
      deviceName: string;
      directory: string;
      displayName: string;
      hasActive: boolean;
      sessionCount: number;
    }[] = [];

    for (const group of deviceProjects) {
      const names = getUniqueProjectNames(group.projects.map(p => p.directory));
      for (const project of group.projects) {
        result.push({
          deviceId: group.device.id,
          deviceName: group.device.name,
          directory: project.directory,
          displayName: names.get(project.directory) || project.directory,
          hasActive: project.hasActive,
          sessionCount: project.sessions.length,
        });
      }
    }

    return result;
  }, [deviceProjects]);

  const handleTogglePin = useCallback((deviceId: string, directory: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    togglePin(deviceId, directory);
  }, [togglePin]);

  // Stable callbacks
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDevices();
    for (const device of devices) {
      await fetchSessions(device.id);
    }
    setRefreshing(false);
  }, [fetchDevices, fetchSessions, devices]);

  const totalProjects = useMemo(() =>
    filteredDeviceProjects.reduce((sum, d) => sum + d.projects.length, 0),
    [filteredDeviceProjects]
  );

  // Render item for FlatList
  const renderDeviceGroup = useCallback(({ item }: { item: typeof deviceProjects[0] }) => (
    <DeviceGroup
      deviceGroup={item}
      theme={theme}
    />
  ), [theme]);

  const keyExtractor = useCallback((item: typeof deviceProjects[0]) => item.device.id, []);

  const openManageModal = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setManageModalVisible(true);
  }, []);

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
    if (filteredDeviceProjects.length === 0) {
      return <NoPinnedState theme={theme} onManage={openManageModal} />;
    }
    return (
      <FlatList
        data={filteredDeviceProjects}
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
          <View style={styles.headerActions}>
            {!isScanning && deviceProjects.length > 0 && (
              <TouchableOpacity
                style={[styles.manageButton, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
                onPress={openManageModal}
                activeOpacity={0.7}
              >
                <SlidersHorizontal size={16} color={theme.textTertiary} />
              </TouchableOpacity>
            )}
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
          </View>
        </View>
      </View>

      {/* Project List */}
      <View style={[styles.contentContainer, { backgroundColor: theme.background }]}>
        {renderContent()}
      </View>

      {/* Manage Projects Modal */}
      <Modal
        visible={manageModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setManageModalVisible(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]} edges={['top']}>
          {/* Modal Header */}
          <View style={[styles.modalHeader, { borderBottomColor: theme.backgroundTertiary }]}>
            <View>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Manage Projects</Text>
              <Text style={[styles.modalSubtitle, { color: theme.textTertiary }]}>
                Choose which projects appear on your main screen
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setManageModalVisible(false)}
              style={[styles.modalCloseButton, { backgroundColor: theme.backgroundSecondary }]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Project List */}
          <ScrollView style={styles.modalContent} contentContainerStyle={{ paddingBottom: 32 }}>
            {allProjects.map((project) => {
              const key = `${project.deviceId}:${project.directory}`;
              const isAdded = pinnedProjects.includes(key);
              return (
                <View
                  key={key}
                  style={[styles.modalProjectRow, { borderBottomColor: theme.backgroundTertiary }]}
                >
                  <View style={styles.modalProjectInfo}>
                    <View style={styles.modalProjectNameRow}>
                      <View style={[styles.modalFolderIcon, { backgroundColor: (project.hasActive ? FOLDER_COLOR_ACTIVE : FOLDER_COLOR_INACTIVE) + '18' }]}>
                        <Folder
                          size={16}
                          color={project.hasActive ? FOLDER_COLOR_ACTIVE : FOLDER_COLOR_INACTIVE}
                        />
                      </View>
                      <View style={styles.modalProjectText}>
                        <Text style={[styles.modalProjectName, { color: theme.text }]} numberOfLines={1}>
                          {project.displayName}
                        </Text>
                        <Text style={[styles.modalProjectMeta, { color: theme.textTertiary }]} numberOfLines={1}>
                          {project.deviceName} · {project.sessionCount} session{project.sessionCount !== 1 ? 's' : ''}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Switch
                    value={isAdded}
                    onValueChange={() => handleTogglePin(project.deviceId, project.directory)}
                    trackColor={{ false: theme.switchTrackOff, true: theme.primary }}
                    thumbColor={theme.switchThumb}
                  />
                </View>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  manageButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyStateButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  // Manage modal
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  modalProjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalProjectInfo: {
    flex: 1,
    marginRight: 12,
  },
  modalProjectNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalFolderIcon: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  modalProjectText: {
    flex: 1,
  },
  modalProjectName: {
    fontSize: 15,
    fontWeight: '600',
  },
  modalProjectMeta: {
    fontSize: 12,
    marginTop: 2,
  },
});
