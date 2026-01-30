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
import { colors } from '@/theme/colors';

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
}: {
  tool: ConnectedTool;
  hasActiveClaudeSession: boolean;
}) => {
  const isClaudeTool = ['claude_code', 'claude-code', 'claude_terminal'].includes(tool.type.toLowerCase());
  const isToolActive = isClaudeTool ? hasActiveClaudeSession : tool.status === 'active';

  return (
    <View
      className={`px-2.5 py-1 rounded flex-row items-center gap-1.5 ${
        isToolActive
          ? 'bg-primary-500/10 border border-primary-500/30'
          : 'bg-dark-800 border border-dark-500'
      }`}
    >
      <Activity size={10} color={isToolActive ? colors.primary[500] : colors.dark[400]} />
      <Text className={`text-xs capitalize ${isToolActive ? 'text-primary-400' : 'text-dark-200'}`}>
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
}: {
  device: Device;
  hasActiveClaudeSession: boolean;
  onPress: (id: string) => void;
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
      style={styles.deviceCard}
    >
      {isOnline && <View style={styles.glowEffect} />}

      <View className="flex-row items-start">
        <View style={styles.deviceIcon}>
          <Icon size={24} color={isOnline ? colors.primary[500] : colors.dark[300]} />
        </View>

        <View className="flex-1">
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-dark-50 font-bold text-base">
              {device.name}
            </Text>
            <View
              className={`px-2 py-1 rounded flex-row items-center gap-1.5 ${
                isOnline
                  ? 'bg-primary-500/10 border border-primary-500/20'
                  : 'bg-dark-500/30 border border-dark-500'
              }`}
            >
              <View
                className={`w-1.5 h-1.5 rounded-full ${
                  isOnline ? 'bg-primary-500' : 'bg-dark-300'
                }`}
              />
              <Text
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  isOnline ? 'text-primary-500' : 'text-dark-200'
                }`}
              >
                {isSyncing ? 'Syncing' : isOnline ? 'Online' : 'Offline'}
              </Text>
            </View>
          </View>

          <Text className="text-dark-200 text-xs mb-3">
            {device.platform || 'Unknown'} {'\u2022'} {device.type?.toLowerCase() || 'device'}
          </Text>

          {connectedTools.length > 0 && (
            <View className="flex-row flex-wrap gap-2">
              {connectedTools.map((tool) => (
                <ToolBadge
                  key={tool.id}
                  tool={tool}
                  hasActiveClaudeSession={hasActiveClaudeSession}
                />
              ))}
            </View>
          )}
        </View>

        <ChevronRight size={20} color={colors.dark[400]} className="ml-2" />
      </View>

      {/* Accent bar */}
      <View style={[styles.accentBar, { backgroundColor: isOnline ? colors.primary[500] : colors.dark[600] }]} />
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
}: {
  filterKey: FilterType;
  label: string;
  icon?: typeof Wifi;
  isActive: boolean;
  onPress: (key: FilterType) => void;
}) => {
  const handlePress = useCallback(() => {
    onPress(filterKey);
  }, [filterKey, onPress]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[
        styles.filterPill,
        isActive && styles.filterPillActive,
      ]}
    >
      {FilterIcon && (
        <FilterIcon
          size={12}
          color={isActive ? colors.primary[500] : colors.dark[200]}
        />
      )}
      <Text
        style={[
          styles.filterPillText,
          isActive && styles.filterPillTextActive,
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
}: {
  filter: FilterType;
  onAddDevice: () => void;
}) => (
  <View style={styles.emptyState}>
    <Laptop size={48} color={colors.dark[400]} />
    <Text style={styles.emptyStateText}>
      {filter === 'all'
        ? 'No devices connected.\nAdd a device to get started.'
        : `No ${filter} devices`}
    </Text>
    {filter === 'all' && (
      <TouchableOpacity
        onPress={onAddDevice}
        style={styles.addDeviceButton}
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
    />
  ), [activeSessionsByDevice, handleDevicePress]);

  const keyExtractor = useCallback((item: Device) => item.id, []);

  const ListEmptyComponent = useMemo(() => (
    <EmptyState filter={filter} onAddDevice={handleAddDevice} />
  ), [filter, handleAddDevice]);

  // Add device button for header
  const addButton = (
    <TouchableOpacity
      onPress={handleAddDevice}
      style={styles.addButton}
    >
      <Plus size={16} color="#fff" />
      <Text style={styles.addButtonText}>Add</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-dark-800" edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Devices</Text>
            <Text style={styles.headerSubtitle}>{onlineCount} of {devices.length} online</Text>
          </View>
          {addButton}
        </View>
      </View>

      {/* Filter Pills */}
      <View style={styles.filterContainer}>
        {filters.map((f) => (
          <FilterPill
            key={f.key}
            filterKey={f.key}
            label={f.label}
            icon={f.icon}
            isActive={filter === f.key}
            onPress={handleFilterChange}
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
            tintColor={colors.primary[500]}
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
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark[600],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.dark[50],
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.dark[300],
    marginTop: 4,
  },
  deviceCard: {
    backgroundColor: colors.dark[800],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.dark[600],
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
    backgroundColor: colors.primary[500],
    borderRadius: 48,
    opacity: 0.1,
  },
  deviceIcon: {
    width: 48,
    height: 48,
    backgroundColor: colors.dark[700],
    borderWidth: 1,
    borderColor: colors.dark[500],
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
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
    borderBottomColor: colors.dark[600],
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.dark[700],
    borderWidth: 1,
    borderColor: colors.dark[500],
    gap: 6,
  },
  filterPillActive: {
    backgroundColor: colors.primary[500] + '15',
    borderColor: colors.primary[500],
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.dark[200],
  },
  filterPillTextActive: {
    color: colors.primary[500],
  },
  emptyState: {
    backgroundColor: colors.dark[800],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.dark[600],
    padding: 24,
    alignItems: 'center',
  },
  emptyStateText: {
    color: colors.dark[200],
    marginTop: 16,
    textAlign: 'center',
    lineHeight: 20,
  },
  addDeviceButton: {
    marginTop: 16,
    backgroundColor: colors.primary[500],
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
    backgroundColor: colors.primary[500],
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
