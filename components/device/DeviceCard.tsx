import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Laptop, Monitor, Server, ChevronRight } from 'lucide-react-native';
import { Card, StatusBadge } from '@/components/ui';
import { Device, DeviceType } from '@/types';
import { colors } from '@/theme/colors';

interface DeviceCardProps {
  device: Device;
  onPress?: () => void;
  compact?: boolean;
}

// Use lowercase keys and normalize at runtime
type NormalizedDeviceType = 'laptop' | 'desktop' | 'server';
const deviceTypeIcons: Record<NormalizedDeviceType, typeof Laptop> = {
  laptop: Laptop,
  desktop: Monitor,
  server: Server,
};

export function DeviceCard({ device, onPress, compact = false }: DeviceCardProps) {
  // Normalize device type to lowercase to handle backend enum values
  const normalizedType = (device.type?.toLowerCase() || 'laptop') as NormalizedDeviceType;
  const Icon = deviceTypeIcons[normalizedType] || Laptop;

  if (compact) {
    return (
      <TouchableOpacity
        onPress={onPress}
        className="flex-row items-center bg-dark-800 rounded-xl p-3"
      >
        <View className="w-8 h-8 bg-dark-700 rounded-lg items-center justify-center mr-3">
          <Icon size={16} color={colors.dark[300]} />
        </View>
        <Text className="text-white font-medium flex-1" numberOfLines={1}>
          {device.name}
        </Text>
        <StatusBadge status={device.status} size="sm" showDot label="" />
      </TouchableOpacity>
    );
  }

  return (
    <Card padding="md" onPress={onPress}>
      <View className="flex-row items-start">
        <View className="w-12 h-12 bg-dark-700 rounded-xl items-center justify-center mr-4">
          <Icon size={24} color={colors.dark[300]} />
        </View>

        <View className="flex-1">
          <View className="flex-row items-center justify-between">
            <Text className="text-white font-semibold text-lg">
              {device.name}
            </Text>
            <StatusBadge status={device.status} size="sm" />
          </View>

          <Text className="text-dark-400 text-sm mt-1 capitalize">
            {device.platform} • {device.type}
          </Text>

          {(device.connectedTools?.length || 0) > 0 && (
            <View className="flex-row flex-wrap gap-2 mt-3">
              {(device.connectedTools || []).map((tool) => (
                <View
                  key={tool.id}
                  className="bg-dark-700 px-3 py-1 rounded-full"
                >
                  <Text className="text-dark-300 text-xs capitalize">
                    {tool.name}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <ChevronRight size={20} color={colors.dark[500]} className="ml-2" />
      </View>
    </Card>
  );
}

export default DeviceCard;
