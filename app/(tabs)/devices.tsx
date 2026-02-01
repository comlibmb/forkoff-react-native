import { useState, useCallback, useMemo, memo } from 'react';
import { View, Text, FlatList, RefreshControl, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Plus,
  Laptop,
  Monitor,
  Server,
  Wifi,
  WifiOff,
  ChevronRight,
  Activity,
} from 'lucide-react-native';
import { useDevices } from '@/hooks/useDevices';
import { useClaudeStore } from '@/stores/claude.store';
import { Device, ConnectedTool } from '@/types';
import { useTheme } from '@/theme/ThemeProvider';

const deviceTypeIcons: Record<string, typeof Laptop> = {
  laptop: Laptop,
  desktop: Monitor,
  server: Server,
  LAPTOP: Laptop,
  DESKTOP: Monitor,
  SERVER: Server,
};

type FilterType = 'all' | 'online' | 'offline';

// Memoized tool badge component
const ToolBadge = memo(({
  tool,
  hasActiveClaudeSession,
  theme,
}: {
  tool: ConnectedTool;
  hasActiveClaudeSession: boolean;
  theme: ReturnType<typeof useTheme>['theme'];
}) => {
  const isClaudeTool = ['claude_code', 'claude-code', 'claude_terminal'].includes(tool.type.toLowerCase());
  const isToolActive = isClaudeTool ? hasActiveClaudeSession : tool.status === 'active';

  return (
    <View
      style={[
        styles.toolBadge,
        {
          backgroundColor: isToolActive ? theme.primary + '15' : theme.background,
          borderColor: isToolActive ? theme.primary + '4D' : theme.border,
        },
      ]}
    >
      <Activity size={10} color={isToolActive ? theme.primary : theme.textTertiary} />
      <Text
        style={[
          styles.toolBadgeText,
          { color: isToolActive ? theme.primaryLight : theme.textSecondary },
        ]}
      >
        {tool.name}
      </Text>
    </View>
  );
});

// Memoized device card component
const DeviceCard = memo(({
  device,
  hasActiveClaudeSession,
  onPress,
  theme,
}: {
  device: Device;
  hasActiveClaudeSession: boolean;
  onPress: (id: string) => void;
  theme: ReturnType<typeof useTheme>['theme'];
}) => {
  const Icon = deviceTypeIcons[device.type] || Laptop;
  const connectedTools = device.connectedTools || [];
  const isOnline = device.status?.toLowerCase() === 'online' || device.status?.toLowerCase() === 'syncing';
  const isSyncing = device.status?.toLowerCase() === 'syncing';

  const handlePress = useCallback(() => {
    onPress(device.id);
  }, [device.id, onPress]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[
        styles.deviceCard,
        {
          backgroundColor: theme.background,
          borderColor: theme.backgroundTertiary,
        },
      ]}
    >
      {isOnline && (
        <View style={[styles.glowEffect, { backgroundColor: theme.primary }]} />
      )}

      <View style={styles.deviceRow}>
        <View
          style={[
            styles.deviceIcon,
            {
              backgroundColor: theme.backgroundSecondary,
              borderColor: theme.border,
            },
          ]}
        >
          <Icon size={24} color={isOnline ? theme.primary : theme.textTertiary} />
        </View>

        <View style={styles.deviceInfo}>
          <View style={styles.deviceTitleRow}>
            <Text style={[styles.deviceName, { color: theme.text }]}>
              {device.name}
            </Text>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: isOnline ? theme.primary + '15' : theme.border + '4D',
                  borderColor: isOnline ? theme.primary + '33' : theme.border,
                },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: isOnline ? theme.primary : theme.textTertiary },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: isOnline ? theme.primary : theme.textSecondary },
                ]}
              >
                {isSyncing ? 'Syncing' : isOnline ? 'Online' : 'Offline'}
              </Text>
            </View>
          </View>

          <Text style={[styles.deviceMeta, { color: theme.textSecondary }]}>
            {device.platform || 'Unknown'} {'\u2022'} {device.type?.toLowerCase() || 'device'}
          </Text>

          {connectedTools.length > 0 && (
            <View style={styles.toolsContainer}>
              {connectedTools.map((tool) => (
                <ToolBadge
                  key={tool.id}
                  tool={tool}
                  hasActiveClaudeSession={hasActiveClaudeSession}
                  theme={theme}
                />
              ))}
            </View>
          )}
        </View>

        <ChevronRight size={20} color={theme.textTertiary} style={styles.chevron} />
      </View>

      {/* Accent bar */}
      <View
        style={[
          styles.accentBar,
          { backgroundColor: isOnline ? theme.primary : theme.backgroundTertiary },
        ]}
      />
    </TouchableOpacity>
  );
});

// Filter pill component
const FilterPill = memo(({
  filterKey,
  label,
  icon: FilterIcon,
  isActive,
  onPress,
  theme,
}: {
  filterKey: FilterType;
  label: string;
  icon?: typeof Wifi;
  isActive: boolean;
  onPress: (key: FilterType) => void;
  theme: ReturnType<typeof useTheme>['theme'];
}) => {
  const handlePress = useCallback(() => {
    onPress(filterKey);
  }, [filterKey, onPress]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[
        styles.filterPill,
        {
          backgroundColor: isActive ? theme.primary + '15' : theme.backgroundSecondary,
          borderColor: isActive ? theme.primary : theme.border,
        },
      ]}
    >
      {FilterIcon && (
        <FilterIcon
          size={12}
          color={isActive ? theme.primary : theme.textSecondary}
        />
      )}
      <Text
        style={[
          styles.filterPillText,
          { color: isActive ? theme.primary : theme.textSecondary },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
});

// Empty state component
const EmptyState = memo(({
  filter,
  onAddDevice,
  theme,
}: {
  filter: FilterType;
  onAddDevice: () => void;
  theme: ReturnType<typeof useTheme>['theme'];
}) => (
  <View
    style={[
      styles.emptyState,
      {
        backgroundColor: theme.background,
        borderColor: theme.backgroundTertiary,
      },
    ]}
  >
    <Laptop size={48} color={theme.textTertiary} />
    <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
      {filter === 'all'
        ? 'No devices connected.\nAdd a device to get started.'
        : `No ${filter} devices`}
    </Text>
    {filter === 'all' && (
      <TouchableOpacity
        onPress={onAddDevice}
        style={[styles.addDeviceButton, { backgroundColor: theme.primary }]}
      >
        <Plus size={18} color="#fff" />
        <Text style={styles.addDeviceButtonText}>Add Device</Text>
      </TouchableOpacity>
    )}
  </View>
));

const filters: { key: FilterType; label: string; icon?: typeof Wifi }[] = [
  { key: 'all', label: 'All' },
  { key: 'online', label: 'Online', icon: Wifi },
  { key: 'offline', label: 'Offline', icon: WifiOff },
];

export default function DevicesScreen() {
  const { theme } = useTheme();
  const { devices, fetchDevices, isLoading } = useDevices();
  const sessions = useClaudeStore((state) => state.sessions);
  const [filter, setFilter] = useState<FilterType>('all');

  // Memoized filtered devices
  const filteredDevices = useMemo(() => {
    return devices.filter((device) => {
      const status = device.status?.toLowerCase();
      if (filter === 'all') return true;
      if (filter === 'online') return status === 'online' || status === 'syncing';
      return status === 'offline';
    });
  }, [devices, filter]);

  // Memoized online count
  const onlineCount = useMemo(() => {
    return devices.filter((d) => {
      const status = d.status?.toLowerCase();
      return status === 'online' || status === 'syncing';
    }).length;
  }, [devices]);

  // Memoized active sessions lookup
  const activeSessionsByDevice = useMemo(() => {
    const result = new Map<string, boolean>();
    sessions.forEach((deviceSessions, deviceId) => {
      const hasActive = deviceSessions.some(s => s.state?.toLowerCase() === 'active');
      result.set(deviceId, hasActive);
    });
    return result;
  }, [sessions]);

  // Stable callbacks
  const handleDevicePress = useCallback((id: string) => {
    router.push(`/device/${id}`);
  }, []);

  const handleAddDevice = useCallback(() => {
    router.push('/device/pair');
  }, []);

  const handleFilterChange = useCallback((key: FilterType) => {
    setFilter(key);
  }, []);

  // FlatList render functions
  const renderDevice = useCallback(({ item }: { item: Device }) => (
    <DeviceCard
      device={item}
      hasActiveClaudeSession={activeSessionsByDevice.get(item.id) || false}
      onPress={handleDevicePress}
      theme={theme}
    />
  ), [activeSessionsByDevice, handleDevicePress, theme]);

  const keyExtractor = useCallback((item: Device) => item.id, []);

  const ListEmptyComponent = useMemo(() => (
    <EmptyState filter={filter} onAddDevice={handleAddDevice} theme={theme} />
  ), [filter, handleAddDevice, theme]);

  // Add device button for header
  const addButton = (
    <TouchableOpacity
      onPress={handleAddDevice}
      style={[styles.addButton, { backgroundColor: theme.primary }]}
    >
      <Plus size={16} color="#fff" />
      <Text style={styles.addButtonText}>Add</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.backgroundTertiary }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Devices</Text>
            <Text style={[styles.headerSubtitle, { color: theme.textTertiary }]}>
              {onlineCount} of {devices.length} online
            </Text>
          </View>
          {addButton}
        </View>
      </View>

      {/* Filter Pills */}
      <View style={[styles.filterContainer, { borderBottomColor: theme.backgroundTertiary }]}>
        {filters.map((f) => (
          <FilterPill
            key={f.key}
            filterKey={f.key}
            label={f.label}
            icon={f.icon}
            isActive={filter === f.key}
            onPress={handleFilterChange}
            theme={theme}
          />
        ))}
      </View>

      {/* Device List */}
      <FlatList
        data={filteredDevices}
        renderItem={renderDevice}
        keyExtractor={keyExtractor}
        ListEmptyComponent={ListEmptyComponent}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={fetchDevices}
            tintColor={theme.primary}
          />
        }
        // Performance optimizations
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={5}
      />
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
  deviceCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
    paddingBottom: 0,
    overflow: 'hidden',
    marginBottom: 16,
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
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  deviceIcon: {
    width: 48,
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  deviceName: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  deviceMeta: {
    fontSize: 12,
    marginBottom: 12,
  },
  toolsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  toolBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
  },
  toolBadgeText: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
  chevron: {
    marginLeft: 8,
  },
  accentBar: {
    height: 3,
    marginTop: 20,
    marginHorizontal: -20,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyState: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  emptyStateText: {
    marginTop: 16,
    textAlign: 'center',
    lineHeight: 20,
  },
  addDeviceButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addDeviceButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
