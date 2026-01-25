import { useState } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
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
import { Device } from '@/types';
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

export default function DevicesScreen() {
  const { devices, fetchDevices, isLoading } = useDevices();
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredDevices = devices.filter((device) => {
    const status = device.status?.toLowerCase();
    if (filter === 'all') return true;
    if (filter === 'online') return status === 'online' || status === 'syncing';
    return status === 'offline';
  });

  const onlineCount = devices.filter((d) => {
    const status = d.status?.toLowerCase();
    return status === 'online' || status === 'syncing';
  }).length;

  const filters: { key: FilterType; label: string; icon?: typeof Wifi }[] = [
    { key: 'all', label: 'All' },
    { key: 'online', label: 'Online', icon: Wifi },
    { key: 'offline', label: 'Offline', icon: WifiOff },
  ];

  const DeviceCard = ({ device }: { device: Device }) => {
    const Icon = deviceTypeIcons[device.type] || Laptop;
    const connectedTools = device.connectedTools || [];
    const isOnline = device.status?.toLowerCase() === 'online' || device.status?.toLowerCase() === 'syncing';
    const isSyncing = device.status?.toLowerCase() === 'syncing';

    return (
      <TouchableOpacity
        onPress={() => router.push(`/device/${device.id}`)}
        className="bg-dark-700 border border-dark-500 rounded-xl p-5 overflow-hidden"
      >
        {/* Glow effect for online devices */}
        {isOnline && (
          <View
            className="absolute -top-12 -right-12 w-24 h-24 opacity-10"
            style={{ backgroundColor: colors.primary[500], borderRadius: 100, filter: 'blur(30px)' }}
          />
        )}

        <View className="flex-row items-start">
          {/* Device Icon */}
          <View className="w-12 h-12 bg-dark-800 border border-dark-500 rounded-xl items-center justify-center mr-4">
            <Icon size={24} color={isOnline ? colors.primary[500] : colors.dark[300]} />
          </View>

          <View className="flex-1">
            {/* Name and Status */}
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-dark-50 font-bold text-base">
                {device.name}
              </Text>
              {/* Status Badge */}
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

            {/* Platform and Type */}
            <Text className="text-dark-200 text-xs mb-3">
              {device.platform || 'Unknown'} {'\u2022'} {device.type?.toLowerCase() || 'device'}
            </Text>

            {/* Connected Tools */}
            {connectedTools.length > 0 && (
              <View className="flex-row flex-wrap gap-2">
                {connectedTools.map((tool) => (
                  <View
                    key={tool.id}
                    className="bg-dark-800 border border-dark-500 px-2.5 py-1 rounded flex-row items-center gap-1.5"
                  >
                    <Activity size={10} color={colors.success[500]} />
                    <Text className="text-dark-200 text-xs capitalize">
                      {tool.name}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Chevron */}
          <ChevronRight size={20} color={colors.dark[400]} className="ml-2" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-dark-800" edges={['top']}>
      {/* Header */}
      <View className="bg-dark-800/95 border-b border-dark-500 px-4 pb-4 pt-2">
        {/* Title Row */}
        <View className="flex-row items-center justify-between mb-4">
          <View>
            <Text className="text-dark-50 text-2xl font-bold">Devices</Text>
            <Text className="text-dark-200 text-sm mt-0.5">
              {onlineCount} of {devices.length} online
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/device/pair')}
            className="bg-primary-500 px-4 py-2 rounded-full flex-row items-center gap-2"
          >
            <Plus size={16} color="#fff" />
            <Text className="text-white font-medium text-sm">Add</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2">
            {filters.map((f) => {
              const FilterIcon = f.icon;
              return (
                <TouchableOpacity
                  key={f.key}
                  onPress={() => setFilter(f.key)}
                  className={`px-4 py-1.5 rounded-full border flex-row items-center gap-2 ${
                    filter === f.key
                      ? 'bg-primary-500/10 border-primary-500'
                      : 'bg-dark-700 border-dark-500'
                  }`}
                >
                  {FilterIcon && (
                    <FilterIcon
                      size={12}
                      color={filter === f.key ? colors.primary[500] : colors.dark[200]}
                    />
                  )}
                  <Text
                    className={`text-xs font-medium ${
                      filter === f.key ? 'text-primary-500' : 'text-dark-200'
                    }`}
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Device List */}
      <ScrollView
        className="flex-1 px-4"
        contentContainerClassName="py-4 gap-4"
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={fetchDevices}
            tintColor={colors.primary[500]}
          />
        }
      >
        {filteredDevices.length === 0 ? (
          <View className="bg-dark-700 border border-dark-500 rounded-xl p-6 items-center">
            <Laptop size={48} color={colors.dark[400]} />
            <Text className="text-dark-200 mt-4 text-center">
              {filter === 'all'
                ? 'No devices connected.\nAdd a device to get started.'
                : `No ${filter} devices`}
            </Text>
            {filter === 'all' && (
              <TouchableOpacity
                onPress={() => router.push('/device/pair')}
                className="mt-4 bg-primary-500 px-6 py-3 rounded-full flex-row items-center gap-2"
              >
                <Plus size={18} color="#fff" />
                <Text className="text-white font-medium">Add Device</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredDevices.map((device) => (
            <DeviceCard key={device.id} device={device} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
