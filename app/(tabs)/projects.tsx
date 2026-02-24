import { useEffect, useLayoutEffect, useState, useMemo, useCallback, useRef, memo } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Animated,
} from "react-native";
import {
  PanGestureHandler,
  State,
  type PanGestureHandlerGestureEvent,
  type PanGestureHandlerStateChangeEvent,
} from "react-native-gesture-handler";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Folder,
  Terminal,
  Clock,
  ChevronRight,
  Laptop,
  FolderOpen,
  FolderCog,
  X,
  Target,
  Eye,
  EyeOff,
  Plus,
  GripVertical,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { wsService } from "@/services/websocket.service";
import { useClaudeStore } from "@/stores/claude.store";
import { useDeviceStore } from "@/stores/device.store";
import { useProjectPreferencesStore } from "@/stores/project-preferences.store";
import { ClaudeSession } from "@/types";
import { useTheme } from "@/theme/ThemeProvider";
import { TerminalLoader } from "@/components/claude/TerminalLoader";
import { formatTimeAgo } from "@/components/project/SessionListItem";
import { colors } from "@/theme/colors";

// Folder status colors
const FOLDER_COLOR_ACTIVE = "#8b5cf6"; // purple (primary)
const FOLDER_COLOR_INACTIVE = "#6e7681"; // gray

// Compute unique short display names for a list of directory paths.
// Uses just the final folder name when unique, otherwise adds parent
// segments until every name is distinct.
const getUniqueProjectNames = (directories: string[]): Map<string, string> => {
  const pathSegments = directories.map((dir) => ({
    dir,
    segments: dir.replace(/\\/g, "/").split("/").filter(Boolean),
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
      const name = segments.slice(-count).join("/");
      if (!nameToDirectories.has(name)) {
        nameToDirectories.set(name, []);
      }
      nameToDirectories.get(name)!.push(dir);
    }

    for (const [, dirs] of nameToDirectories) {
      if (dirs.length > 1) {
        hasDuplicates = true;
        for (const d of dirs) {
          const { segments } = pathSegments.find((p) => p.dir === d)!;
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
    result.set(dir, segments.slice(-count).join("/"));
  }
  return result;
};

// formatTimeAgo is now imported from @/components/project/SessionListItem

// Memoized project card component
const ProjectCard = memo(
  ({
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
    theme: ReturnType<typeof useTheme>["theme"];
  }) => {
    const sessionCount = project.sessions.length;
    const folderColor = project.hasActive
      ? FOLDER_COLOR_ACTIVE
      : FOLDER_COLOR_INACTIVE;

    const handlePress = useCallback(() => {
      router.push({
        pathname: "/project-hub",
        params: {
          deviceId,
          directory: project.directory,
          deviceName,
        },
      });
    }, [deviceId, project.directory, deviceName]);

    return (
      <View
        style={[
          styles.projectCard,
          { backgroundColor: theme.backgroundSecondary },
        ]}
      >
        {project.hasActive && (
          <View
            style={[
              styles.glowEffect,
              { backgroundColor: FOLDER_COLOR_ACTIVE },
            ]}
          />
        )}

        <TouchableOpacity onPress={handlePress} style={styles.projectHeader}>
          <View style={styles.projectHeaderRow}>
            <View style={styles.projectHeaderLeft}>
              <View
                style={[
                  styles.folderIcon,
                  { backgroundColor: folderColor + "18" },
                ]}
              >
                <Folder size={20} color={folderColor} />
              </View>
              <View style={styles.projectTitleContainer}>
                <View style={styles.projectTitleRow}>
                  {project.hasActive && (
                    <View
                      style={[
                        styles.activeDot,
                        { backgroundColor: FOLDER_COLOR_ACTIVE },
                      ]}
                    />
                  )}
                  <Text
                    style={[styles.projectName, { color: theme.text }]}
                    numberOfLines={1}
                  >
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
                  <Text
                    style={[
                      styles.projectMetaText,
                      { color: theme.textTertiary },
                    ]}
                  >
                    {sessionCount} session{sessionCount !== 1 ? "s" : ""}
                  </Text>
                  <Text
                    style={[styles.projectMetaDot, { color: theme.border }]}
                  >
                    {"\u2022"}
                  </Text>
                  <Clock size={10} color={theme.textTertiary} />
                  <Text
                    style={[
                      styles.projectMetaText,
                      { color: theme.textTertiary },
                    ]}
                  >
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
  },
);

// Memoized device group component - styled as macOS window
const DeviceGroup = memo(
  ({
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
    theme: ReturnType<typeof useTheme>["theme"];
  }) => {
    const hasActiveProject = deviceGroup.projects.some((p) => p.hasActive);

    const projectDisplayNames = useMemo(
      () => getUniqueProjectNames(deviceGroup.projects.map((p) => p.directory)),
      [deviceGroup.projects],
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
            <View
              style={[styles.trafficDot, { backgroundColor: theme.error }]}
            />
            <View
              style={[styles.trafficDot, { backgroundColor: theme.warning }]}
            />
            <View
              style={[styles.trafficDot, { backgroundColor: theme.success }]}
            />
          </View>
          <View style={styles.deviceTitleContent}>
            <Laptop size={14} color={deviceGroup.device.status?.toUpperCase() === 'ONLINE' ? theme.primary : theme.textTertiary} />
            <Text
              style={[styles.deviceTitleText, { color: deviceGroup.device.status?.toUpperCase() === 'ONLINE' ? theme.primary : theme.textSecondary }]}
            >
              {deviceGroup.device.name}
            </Text>
          </View>
          <View style={styles.deviceTitleRight}>
            <Text style={[styles.projectCount, { color: theme.textTertiary }]}>
              {deviceGroup.projects.length} project
              {deviceGroup.projects.length !== 1 ? "s" : ""}
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
              displayName={
                projectDisplayNames.get(project.directory) || project.directory
              }
              deviceName={deviceGroup.device.name}
              theme={theme}
            />
          ))}
        </View>

        {/* Accent bar */}
        <View
          style={[
            styles.deviceAccentBar,
            {
              backgroundColor: hasActiveProject
                ? theme.primary
                : theme.backgroundTertiary,
            },
          ]}
        />
      </View>
    );
  },
);

// Empty states as memoized components
const NoDevicesState = memo(
  ({ theme }: { theme: ReturnType<typeof useTheme>["theme"] }) => (
    <View style={styles.emptyStateContainer}>
      <Laptop size={64} color={theme.backgroundTertiary} />
      <Text style={[styles.emptyStateTitle, { color: theme.textTertiary }]}>
        No devices connected
      </Text>
      <Text style={[styles.emptyStateSubtitle, { color: theme.border }]}>
        Head over to the Devices tab to pair your first device
      </Text>
      <TouchableOpacity
        style={[styles.emptyStateButton, { backgroundColor: theme.primary }]}
        onPress={() => router.push("/(tabs)/devices")}
        activeOpacity={0.7}
      >
        <Laptop size={16} color="#fff" />
        <Text style={styles.emptyStateButtonText}>Go to Devices</Text>
      </TouchableOpacity>
    </View>
  ),
);

const NoSessionsState = memo(
  ({ theme }: { theme: ReturnType<typeof useTheme>["theme"] }) => (
    <View style={styles.emptyStateContainer}>
      <FolderOpen size={64} color={theme.backgroundTertiary} />
      <Text style={[styles.emptyStateTitle, { color: theme.textTertiary }]}>
        No Claude sessions yet
      </Text>
      <Text style={[styles.emptyStateSubtitle, { color: theme.border }]}>
        Start a Claude session on any device to see it here
      </Text>
    </View>
  ),
);

const PulsingIcon = memo(({ color }: { color: string }) => {
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  return (
    <Animated.View style={{ opacity: pulseAnim, marginBottom: 16 }}>
      <Folder size={48} color={color} />
    </Animated.View>
  );
});

const LoadingSessionsState = memo(
  ({ theme }: { theme: ReturnType<typeof useTheme>["theme"] }) => (
    <View style={styles.emptyStateContainer}>
      <PulsingIcon color={theme.primary} />
      <Text style={[styles.emptyStateTitle, { color: theme.textTertiary }]}>
        Loading projects...
      </Text>
      <Text style={[styles.emptyStateSubtitle, { color: theme.border }]}>
        Fetching sessions from your device
      </Text>
    </View>
  ),
);

const NoPinnedState = memo(
  ({
    theme,
    onManage,
  }: {
    theme: ReturnType<typeof useTheme>["theme"];
    onManage: () => void;
  }) => {
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.4,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    }, [pulseAnim]);

    return (
      <View style={styles.emptyStateContainer}>
        <Animated.View style={{ opacity: pulseAnim }}>
          <Target size={64} color={theme.primary} />
        </Animated.View>
        <Text style={[styles.emptyStateTitle, { color: theme.textTertiary }]}>
          No projects in focus
        </Text>
        <Text style={[styles.emptyStateSubtitle, { color: theme.border }]}>
          Your projects have been scanned and detected
        </Text>
        <TouchableOpacity
          style={[styles.emptyStateButton, { backgroundColor: theme.primary }]}
          onPress={onManage}
          activeOpacity={0.7}
        >
          <Folder size={16} color="#fff" />
          <Text style={styles.emptyStateButtonText}>
            Show your first project
          </Text>
        </TouchableOpacity>
      </View>
    );
  },
);

// Draggable row for the Added section in the manage modal
const ROW_HEIGHT = 60;

const DraggableAddedRow = memo(
  ({
    project,
    index,
    totalCount,
    draggingKey,
    onDragStart,
    onReorder,
    onDragEnd,
    onRemove,
    theme,
  }: {
    project: {
      deviceId: string;
      deviceName: string;
      directory: string;
      displayName: string;
      hasActive: boolean;
      sessionCount: number;
    };
    index: number;
    totalCount: number;
    draggingKey: string | null;
    onDragStart: (key: string) => void;
    onReorder: (fromIndex: number, toIndex: number) => void;
    onDragEnd: () => void;
    onRemove: () => void;
    theme: ReturnType<typeof useTheme>["theme"];
  }) => {
    const projectKey = `${project.deviceId}:${project.directory}`;
    const isBeingDragged = draggingKey === projectKey;

    // Dragged item follows the finger
    const translateY = useRef(new Animated.Value(0)).current;
    // Non-dragged items spring into their new slot when bumped
    const bumpAnim = useRef(new Animated.Value(0)).current;
    const combinedY = useRef(Animated.add(translateY, bumpAnim)).current;

    const originalIndex = useRef(0);
    const prevIndex = useRef(index);
    const indexRef = useRef(index);
    const totalRef = useRef(totalCount);
    const onDragStartRef = useRef(onDragStart);
    const onReorderRef = useRef(onReorder);
    const onDragEndRef = useRef(onDragEnd);

    // When this row's index changes (it got bumped by a reorder),
    // animate it sliding from its old position to the new one
    useLayoutEffect(() => {
      if (!isBeingDragged && prevIndex.current !== index) {
        const diff = (prevIndex.current - index) * ROW_HEIGHT;
        bumpAnim.stopAnimation();
        bumpAnim.setValue(diff);
        Animated.timing(bumpAnim, {
          toValue: 0,
          duration: 650,
          useNativeDriver: true,
          easing: require('react-native').Easing.bezier(0.25, 0.1, 0.25, 1),
        }).start();
      }
      prevIndex.current = index;
      indexRef.current = index;
    }, [index, isBeingDragged, bumpAnim]);

    totalRef.current = totalCount;
    onDragStartRef.current = onDragStart;
    onReorderRef.current = onReorder;
    onDragEndRef.current = onDragEnd;

    const onGestureEvent = useCallback(
      (event: PanGestureHandlerGestureEvent) => {
        const { translationY: ty } = event.nativeEvent;

        // Target slot = where the finger IS, relative to where we started
        const target = Math.max(
          0,
          Math.min(
            totalRef.current - 1,
            originalIndex.current + Math.round(ty / ROW_HEIGHT),
          ),
        );

        if (target !== indexRef.current) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onReorderRef.current(indexRef.current, target);
          indexRef.current = target;
        }

        // Compensate for the layout shift so the row stays under the finger
        const layoutShift =
          (indexRef.current - originalIndex.current) * ROW_HEIGHT;
        translateY.setValue(ty - layoutShift);
      },
      [translateY],
    );

    const onHandlerStateChange = useCallback(
      (event: PanGestureHandlerStateChangeEvent) => {
        const { state, oldState } = event.nativeEvent;

        if (state === State.ACTIVE) {
          translateY.stopAnimation();
          translateY.setValue(0);
          bumpAnim.setValue(0);
          originalIndex.current = indexRef.current;
          onDragStartRef.current(projectKey);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        if (oldState === State.ACTIVE) {
          onDragEndRef.current();
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 300,
            friction: 25,
          }).start();
        }
      },
      [translateY, bumpAnim, projectKey],
    );

    return (
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        activeOffsetY={[-5, 5]}
        enabled={draggingKey === null || isBeingDragged}
      >
        <Animated.View
          style={[
            styles.modalProjectRow,
            {
              backgroundColor: theme.background,
              borderBottomColor: theme.backgroundTertiary,
              transform: [{ translateY: combinedY }],
              zIndex: isBeingDragged ? 10 : 1,
              elevation: isBeingDragged ? 5 : 0,
              opacity: isBeingDragged ? 0.9 : 1,
            },
          ]}
        >
          <View style={styles.modalProjectInfo}>
            <View style={styles.modalProjectNameRow}>
              <View
                style={[
                  styles.modalFolderIcon,
                  { backgroundColor: theme.primary + "18" },
                ]}
              >
                <Eye size={16} color={theme.primary} />
              </View>
              <View style={styles.modalProjectText}>
                <Text
                  style={[styles.modalProjectName, { color: theme.text }]}
                  numberOfLines={1}
                >
                  {project.displayName}
                </Text>
                <Text
                  style={[
                    styles.modalProjectMeta,
                    { color: theme.textTertiary },
                  ]}
                  numberOfLines={1}
                >
                  {project.deviceName} · {project.sessionCount}{" "}
                  session{project.sessionCount !== 1 ? "s" : ""}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.modalRowActions}>
            <TouchableOpacity
              onPress={onRemove}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.modalActionButton}
            >
              <EyeOff size={18} color={theme.error + "aa"} />
            </TouchableOpacity>
            <View style={styles.dragHandle}>
              <GripVertical size={18} color={theme.textTertiary} />
            </View>
          </View>
        </Animated.View>
      </PanGestureHandler>
    );
  },
);

export default function ProjectsScreen() {
  const { theme } = useTheme();
  // Use specific selectors to minimize re-renders
  const sessions = useClaudeStore((state) => state.sessions);
  const fetchSessions = useClaudeStore((state) => state.fetchSessions);
  const subscribeToUpdates = useClaudeStore(
    (state) => state.subscribeToUpdates,
  );
  const devices = useDeviceStore((state) => state.devices);
  const fetchDevices = useDeviceStore((state) => state.fetchDevices);

  const pinnedProjects = useProjectPreferencesStore(
    (state) => state.pinnedProjects,
  );
  const togglePin = useProjectPreferencesStore((state) => state.togglePin);
  const reorderPinned = useProjectPreferencesStore(
    (state) => state.reorderPinned,
  );

  const [refreshing, setRefreshing] = useState(false);
  const [manageModalVisible, setManageModalVisible] = useState(false);
  const [modalScrollEnabled, setModalScrollEnabled] = useState(true);
  const [draggingKey, setDraggingKey] = useState<string | null>(null);

  // Scanning state
  const [isScanning, setIsScanning] = useState(true);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [scanDeviceCount, setScanDeviceCount] = useState(0);
  const [scanProjectCount, setScanProjectCount] = useState(0);
  const hasInitializedRef = useRef(false);

  // Scan lines for the terminal loader
  const scanLines = useMemo(
    () => [
      {
        text: "Looking for devices",
        color: theme.textSecondary,
        done: scanStep > 0,
      },
      {
        text:
          scanDeviceCount > 0
            ? `Found ${scanDeviceCount} device${scanDeviceCount !== 1 ? "s" : ""}`
            : "Discovering devices",
        color: scanDeviceCount > 0 ? colors.success[100] : theme.textTertiary,
        done: scanStep > 1,
      },
      {
        text:
          scanProjectCount > 0
            ? `Scanned ${scanProjectCount} project${scanProjectCount !== 1 ? "s" : ""}`
            : "Scanning for projects",
        color: scanProjectCount > 0 ? colors.success[100] : theme.textTertiary,
        done: scanStep > 2,
      },
      {
        text: "All systems go",
        color: colors.success[100],
        done: scanStep > 3,
      },
    ],
    [scanStep, scanDeviceCount, scanProjectCount, theme],
  );

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
      await new Promise((r) => setTimeout(r, 400));
      setScanStep(2);

      // Subscribe to device rooms BEFORE requesting sessions,
      // otherwise the CLI's response arrives in a room we haven't joined yet
      for (const d of foundDevices) {
        wsService.subscribeToDevice(d.id);
      }

      const sessionPromises = foundDevices.map((d) => fetchSessions(d.id));
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
      await new Promise((r) => setTimeout(r, 500));
      setScanStep(3);

      // Done scanning — if no sessions arrived yet, show loading state
      // (sessions arrive asynchronously via encrypted batch update)
      if (projectCount === 0 && foundDevices.length > 0) {
        setIsLoadingSessions(true);
      }

      await new Promise((r) => setTimeout(r, 600));
      setIsScanning(false);
    };

    scan();
  }, [fetchDevices, fetchSessions]);

  // Clear loading state when sessions arrive or after timeout
  useEffect(() => {
    if (!isLoadingSessions) return;

    // Check if sessions have arrived
    const claudeState = useClaudeStore.getState();
    let hasAny = false;
    for (const device of devices) {
      if ((claudeState.sessions.get(device.id) || []).length > 0) {
        hasAny = true;
        break;
      }
    }
    if (hasAny) {
      setIsLoadingSessions(false);
      return;
    }

    // Timeout after 15 seconds — sessions may genuinely be empty
    const timeout = setTimeout(() => setIsLoadingSessions(false), 15000);
    return () => clearTimeout(timeout);
  }, [isLoadingSessions, sessions, devices]);

  // Subscribe to updates and set up polling - use device IDs as dependency
  const deviceIds = useMemo(
    () => devices.map((d) => d.id).join(","),
    [devices],
  );

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
          (a, b) =>
            new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime(),
        );
      }

      const projects = Array.from(grouped.entries())
        .map(([directory, projectSessions]) => ({
          directory,
          sessions: projectSessions,
          lastUsedAt:
            projectSessions[0]?.lastUsedAt || new Date().toISOString(),
          hasActive: projectSessions.some(
            (s) => s.state?.toUpperCase() === "ACTIVE",
          ),
        }))
        .sort(
          (a, b) =>
            new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime(),
        );

      if (projects.length > 0) {
        result.push({
          device: { id: device.id, name: device.name, status: device.status },
          projects,
        });
      }
    }

    result.sort((a, b) => {
      const aLatest = a.projects[0]?.lastUsedAt || "";
      const bLatest = b.projects[0]?.lastUsedAt || "";
      return new Date(bLatest).getTime() - new Date(aLatest).getTime();
    });

    return result;
  }, [devices, sessions]);

  // Filter to only pinned projects for the main view, sorted by pin order
  const filteredDeviceProjects = useMemo(() => {
    return deviceProjects
      .map((group) => ({
        ...group,
        projects: group.projects
          .filter((p) =>
            pinnedProjects.includes(`${group.device.id}:${p.directory}`),
          )
          .sort((a, b) => {
            const aIdx = pinnedProjects.indexOf(
              `${group.device.id}:${a.directory}`,
            );
            const bIdx = pinnedProjects.indexOf(
              `${group.device.id}:${b.directory}`,
            );
            return aIdx - bIdx;
          }),
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
      const names = getUniqueProjectNames(
        group.projects.map((p) => p.directory),
      );
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

  const handleTogglePin = useCallback(
    (deviceId: string, directory: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      togglePin(deviceId, directory);
    },
    [togglePin],
  );

  const handleDragStart = useCallback((key: string) => {
    setDraggingKey(key);
    setModalScrollEnabled(false);
  }, []);

  const handleReorder = useCallback(
    (fromIndex: number, toIndex: number) => {
      reorderPinned(fromIndex, toIndex);
    },
    [reorderPinned],
  );

  const handleDragEnd = useCallback(() => {
    setDraggingKey(null);
    setModalScrollEnabled(true);
  }, []);

  // Split allProjects into added (pinned) and available (not pinned)
  const addedProjects = useMemo(() => {
    // Return in pinned order
    return pinnedProjects
      .map((key) =>
        allProjects.find((p) => `${p.deviceId}:${p.directory}` === key),
      )
      .filter(Boolean) as typeof allProjects;
  }, [allProjects, pinnedProjects]);

  const availableProjects = useMemo(() => {
    return allProjects.filter(
      (p) => !pinnedProjects.includes(`${p.deviceId}:${p.directory}`),
    );
  }, [allProjects, pinnedProjects]);

  // Stable callbacks
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDevices();
    for (const device of devices) {
      await fetchSessions(device.id);
    }
    setRefreshing(false);
  }, [fetchDevices, fetchSessions, devices]);

  const totalProjects = useMemo(
    () => deviceProjects.reduce((sum, d) => sum + d.projects.length, 0),
    [deviceProjects],
  );

  // Render item for FlatList
  const renderDeviceGroup = useCallback(
    ({ item }: { item: (typeof deviceProjects)[0] }) => (
      <DeviceGroup deviceGroup={item} theme={theme} />
    ),
    [theme],
  );

  const keyExtractor = useCallback(
    (item: (typeof deviceProjects)[0]) => item.device.id,
    [],
  );

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
    if (deviceProjects.length === 0 && isLoadingSessions) {
      return <LoadingSessionsState theme={theme} />;
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
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={["top"]}
    >
      {/* Header */}
      <View
        style={[styles.header, { borderBottomColor: theme.backgroundTertiary }]}
      >
        <View>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Projects
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.textTertiary }]}>
            Manage your projects and sessions here
          </Text>
        </View>
      </View>

      {/* Sub-header actions (below divider) */}
      <View style={styles.subHeaderRow}>
        <View
          style={[
            styles.badge,
            {
              backgroundColor: theme.backgroundSecondary,
              borderColor: theme.border,
            },
          ]}
        >
          <Text style={[styles.badgeText, { color: theme.success }]}>
            {totalProjects} detected
          </Text>
        </View>
        {!isScanning && deviceProjects.length > 0 && (
          <TouchableOpacity
            style={[
              styles.manageButton,
              {
                backgroundColor: theme.backgroundSecondary,
                borderColor: theme.border,
              },
            ]}
            onPress={openManageModal}
            activeOpacity={0.7}
          >
            <FolderCog size={16} color={theme.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Project List */}
      <View
        style={[styles.contentContainer, { backgroundColor: theme.background }]}
      >
        {renderContent()}
      </View>

      {/* Manage Projects Modal */}
      <Modal
        visible={manageModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setManageModalVisible(false)}
      >
        <SafeAreaView
          style={[styles.modalContainer, { backgroundColor: theme.background }]}
          edges={["top"]}
        >
          {/* Modal Header */}
          <View
            style={[
              styles.modalHeader,
              { borderBottomColor: theme.backgroundTertiary },
            ]}
          >
            <View>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Manage Projects
              </Text>
              <Text
                style={[styles.modalSubtitle, { color: theme.textTertiary }]}
              >
                Choose which projects appear on your main screen
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setManageModalVisible(false)}
              style={[
                styles.modalCloseButton,
                { backgroundColor: theme.backgroundSecondary },
              ]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Project List */}
          <ScrollView
            style={styles.modalContent}
            contentContainerStyle={{ paddingTop: 4, paddingBottom: 32 }}
            scrollEnabled={modalScrollEnabled}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
          >
            {/* Added Section */}
            {addedProjects.length > 0 && (
              <>
                <Text
                  style={[
                    styles.modalSectionTitle,
                    { color: theme.textSecondary },
                  ]}
                >
                  Added
                </Text>
                {addedProjects.map((project, idx) => (
                  <DraggableAddedRow
                    key={`${project.deviceId}:${project.directory}`}
                    project={project}
                    index={idx}
                    totalCount={addedProjects.length}
                    draggingKey={draggingKey}
                    onDragStart={handleDragStart}
                    onReorder={handleReorder}
                    onDragEnd={handleDragEnd}
                    onRemove={() =>
                      handleTogglePin(project.deviceId, project.directory)
                    }
                    theme={theme}
                  />
                ))}
              </>
            )}

            {/* Available Section */}
            {availableProjects.length > 0 && (
              <>
                <Text
                  style={[
                    styles.modalSectionTitle,
                    {
                      color: theme.textSecondary,
                      marginTop: addedProjects.length > 0 ? 24 : 8,
                    },
                  ]}
                >
                  Available
                </Text>
                {availableProjects.map((project) => {
                  const key = `${project.deviceId}:${project.directory}`;
                  return (
                    <View
                      key={key}
                      style={[
                        styles.modalProjectRow,
                        { borderBottomColor: theme.backgroundTertiary },
                      ]}
                    >
                      <View style={styles.modalProjectInfo}>
                        <View style={styles.modalProjectNameRow}>
                          <View
                            style={[
                              styles.modalFolderIcon,
                              {
                                backgroundColor:
                                  (project.hasActive
                                    ? FOLDER_COLOR_ACTIVE
                                    : FOLDER_COLOR_INACTIVE) + "18",
                              },
                            ]}
                          >
                            <Folder
                              size={16}
                              color={
                                project.hasActive
                                  ? FOLDER_COLOR_ACTIVE
                                  : FOLDER_COLOR_INACTIVE
                              }
                            />
                          </View>
                          <View style={styles.modalProjectText}>
                            <Text
                              style={[
                                styles.modalProjectName,
                                { color: theme.text },
                              ]}
                              numberOfLines={1}
                            >
                              {project.displayName}
                            </Text>
                            <Text
                              style={[
                                styles.modalProjectMeta,
                                { color: theme.textTertiary },
                              ]}
                              numberOfLines={1}
                            >
                              {project.deviceName} · {project.sessionCount}{" "}
                              session{project.sessionCount !== 1 ? "s" : ""}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={() =>
                          handleTogglePin(project.deviceId, project.directory)
                        }
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={styles.modalActionButton}
                      >
                        <Plus size={20} color={theme.success} />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </>
            )}
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
  subHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
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
    alignItems: "center",
    justifyContent: "center",
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
    overflow: "hidden",
    marginBottom: 20,
  },
  deviceTitleBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  trafficLights: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  trafficDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  deviceTitleContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 12,
    gap: 8,
  },
  deviceTitleText: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "monospace",
  },
  deviceTitleRight: {
    marginLeft: "auto",
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
    overflow: "hidden",
    marginBottom: 8,
  },
  glowEffect: {
    position: "absolute",
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  projectHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  folderIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  projectTitleContainer: {
    flex: 1,
  },
  projectTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  projectName: {
    fontWeight: "bold",
  },
  projectPath: {
    fontSize: 12,
    fontFamily: "monospace",
  },
  projectMeta: {
    flexDirection: "row",
    alignItems: "center",
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
    fontWeight: "500",
  },
  emptyStateContainer: {
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyStateTitle: {
    marginTop: 16,
    textAlign: "center",
    fontSize: 18,
  },
  emptyStateSubtitle: {
    textAlign: "center",
    marginTop: 8,
  },
  emptyStateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyStateButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  // Manage modal
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  modalSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  modalProjectRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalProjectInfo: {
    flex: 1,
    marginRight: 12,
  },
  modalProjectNameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  modalFolderIcon: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  modalProjectText: {
    flex: 1,
  },
  modalProjectName: {
    fontSize: 15,
    fontWeight: "600",
  },
  modalProjectMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  modalSectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 8,
  },
  modalRowActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalActionButton: {
    padding: 6,
  },
  dragHandle: {
    padding: 8,
    marginLeft: 2,
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
});
