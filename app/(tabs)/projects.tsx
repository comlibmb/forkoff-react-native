import { useEffect, useState, useMemo, useCallback, useRef, memo } from 'react';
import { View, Text, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
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
import { colors } from '@/theme/colors';
import { TerminalLoader } from '@/components/claude/TerminalLoader';

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
  onPress
}: {
  session: ClaudeSession;
  deviceId: string;
  isLast: boolean;
  onPress: (deviceId: string, session: ClaudeSession) => void;
}) => {
  const isActive = session.state?.toUpperCase() === 'ACTIVE';

  const handlePress = useCallback(() => {
    onPress(deviceId, session);
  }, [deviceId, session, onPress]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      className={`px-4 py-3 flex-row items-center justify-between ${
        !isLast ? 'border-b border-dark-700' : ''
      }`}
    >
      <View className="flex-row items-center flex-1">
        <View className="w-8 h-8 bg-dark-700 border border-dark-600 rounded-lg items-center justify-center mr-3">
          <MessageSquare
            size={14}
            color={isActive ? colors.primary[500] : colors.dark[400]}
          />
        </View>
        <View className="flex-1">
          <View className="flex-row items-center">
            {isActive && (
              <View className="w-1.5 h-1.5 rounded-full bg-primary-500 mr-2" />
            )}
            <Text className="text-dark-200 text-sm font-mono" numberOfLines={1}>
              {session.sessionKey}
            </Text>
          </View>
          <View className="flex-row items-center mt-0.5">
            <Clock size={10} color={colors.dark[500]} />
            <Text className="text-dark-500 text-xs ml-1">
              {formatTimeAgo(session.lastUsedAt)}
            </Text>
            {isActive && (
              <>
                <Text className="text-dark-600 mx-2">•</Text>
                <Text className="text-primary-500 text-xs font-medium">Active</Text>
              </>
            )}
          </View>
        </View>
      </View>
      <ChevronRight size={16} color={colors.dark[500]} />
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
    <View className="bg-dark-700 border border-dark-500 rounded-xl overflow-hidden mb-3">
      {project.hasActive && (
        <View
          className="absolute -top-12 -right-12 w-24 h-24 opacity-10"
          style={{
            backgroundColor: colors.primary[500],
            borderRadius: 100,
          }}
        />
      )}

      <TouchableOpacity onPress={handleToggle} className="p-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1 mr-3">
            <View className="w-10 h-10 bg-dark-800 border border-dark-500 rounded-lg items-center justify-center mr-3">
              <Folder
                size={20}
                color={project.hasActive ? colors.primary[500] : colors.dark[300]}
              />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center mb-1">
                {project.hasActive && (
                  <View className="w-2 h-2 rounded-full bg-primary-500 mr-2" />
                )}
                <Text className="text-dark-50 font-bold" numberOfLines={1}>
                  {directoryName}
                </Text>
              </View>
              <Text className="text-dark-400 text-xs font-mono" numberOfLines={1}>
                {project.directory}
              </Text>
              <View className="flex-row items-center mt-1">
                <Terminal size={10} color={colors.dark[400]} />
                <Text className="text-dark-300 text-xs ml-1">
                  {sessionCount} session{sessionCount !== 1 ? 's' : ''}
                </Text>
                <Text className="text-dark-500 mx-2">•</Text>
                <Clock size={10} color={colors.dark[400]} />
                <Text className="text-dark-400 text-xs ml-1">
                  {formatTimeAgo(project.lastUsedAt)}
                </Text>
              </View>
            </View>
          </View>
          {isExpanded ? (
            <ChevronDown size={20} color={colors.dark[400]} />
          ) : (
            <ChevronRight size={20} color={colors.dark[400]} />
          )}
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View className="border-t border-dark-600 bg-dark-800">
          {project.sessions.map((session, index) => (
            <SessionItem
              key={session.sessionKey}
              session={session}
              deviceId={deviceId}
              isLast={index === project.sessions.length - 1}
              onPress={onSessionPress}
            />
          ))}
        </View>
      )}
    </View>
  );
});

// Memoized device group component
const DeviceGroup = memo(({
  deviceGroup,
  expandedProjects,
  onToggleProject,
  onSessionPress,
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
}) => (
  <View className="mb-6">
    <View className="flex-row items-center mb-3 px-2">
      <Laptop size={16} color={colors.dark[400]} />
      <Text className="text-dark-300 text-sm font-bold ml-2 uppercase tracking-wider">
        {deviceGroup.device.name}
      </Text>
      <View className="flex-1 h-px bg-dark-700 ml-3" />
    </View>

    {deviceGroup.projects.map((project) => (
      <ProjectCard
        key={project.directory}
        project={project}
        deviceId={deviceGroup.device.id}
        isExpanded={expandedProjects.has(`${deviceGroup.device.id}:${project.directory}`)}
        onToggle={onToggleProject}
        onSessionPress={onSessionPress}
      />
    ))}
  </View>
));

// Empty states as memoized components
const NoDevicesState = memo(() => (
  <View className="items-center py-12">
    <Laptop size={64} color={colors.dark[600]} />
    <Text className="text-dark-400 mt-4 text-center text-lg">
      No devices connected
    </Text>
    <Text className="text-dark-500 text-center mt-2">
      Connect a device to see Claude projects
    </Text>
  </View>
));

const NoSessionsState = memo(() => (
  <View className="items-center py-12">
    <FolderOpen size={64} color={colors.dark[600]} />
    <Text className="text-dark-400 mt-4 text-center text-lg">
      No Claude sessions yet
    </Text>
    <Text className="text-dark-500 text-center mt-2">
      Start a Claude session on any device to see it here
    </Text>
  </View>
));

export default function ProjectsScreen() {
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
      color: colors.dark[200],
      done: scanStep > 0,
    },
    {
      text: scanDeviceCount > 0
        ? `Found ${scanDeviceCount} device${scanDeviceCount !== 1 ? 's' : ''}`
        : 'Discovering devices',
      color: scanDeviceCount > 0 ? colors.success[100] : colors.dark[300],
      done: scanStep > 1,
    },
    {
      text: scanProjectCount > 0
        ? `Scanned ${scanProjectCount} project${scanProjectCount !== 1 ? 's' : ''}`
        : 'Scanning for projects',
      color: scanProjectCount > 0 ? colors.success[100] : colors.dark[300],
      done: scanStep > 2,
    },
    {
      text: 'All systems go',
      color: colors.success[100],
      done: scanStep > 3,
    },
  ], [scanStep, scanDeviceCount, scanProjectCount]);

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
    />
  ), [expandedProjects, toggleProject, handleOpenSession]);

  const keyExtractor = useCallback((item: typeof deviceProjects[0]) => item.device.id, []);

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
      return <NoDevicesState />;
    }
    if (deviceProjects.length === 0) {
      return <NoSessionsState />;
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
            tintColor={colors.primary[500]}
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
    <SafeAreaView className="flex-1 bg-dark-900" edges={['top']}>
      {/* Header */}
      <View className="px-6 pt-4 pb-4">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-white text-2xl font-bold">Projects</Text>
          <View className="bg-dark-700 px-3 py-1 rounded-full">
            <Text className="text-dark-300 text-sm">
              {totalProjects} project{totalProjects !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
        <Text className="text-dark-400 text-sm">
          Claude sessions grouped by directory
        </Text>
      </View>

      {/* Project List */}
      <View className="flex-1 px-4">
        {renderContent()}
      </View>
    </SafeAreaView>
  );
}
