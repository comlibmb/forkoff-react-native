import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Laptop, Monitor, Server, ChevronRight } from 'lucide-react-native';
import { Card, StatusBadge } from '@/components/ui';
import { Device, DeviceType } from '@/types';
import { useTheme } from '@/theme/ThemeProvider';

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
  const { theme } = useTheme();
  // Normalize device type to lowercase to handle backend enum values
  const normalizedType = (device.type?.toLowerCase() || 'laptop') as NormalizedDeviceType;
  const Icon = deviceTypeIcons[normalizedType] || Laptop;

  if (compact) {
    return (
      <TouchableOpacity
        onPress={onPress}
        className="flex-row items-center rounded-xl p-3"
        style={{ backgroundColor: theme.background }}
      >
        <View
          className="w-8 h-8 rounded-lg items-center justify-center mr-3"
          style={{ backgroundColor: theme.backgroundSecondary }}
        >
          <Icon size={16} color={theme.textTertiary} />
        </View>
        <Text className="font-medium flex-1" style={{ color: theme.text }} numberOfLines={1}>
          {device.name}
        </Text>
        <StatusBadge status={device.status} size="sm" showDot label="" />
      </TouchableOpacity>
    );
  }

  return (
    <Card padding="md" onPress={onPress}>
      <View className="flex-row items-start">
        <View
          className="w-12 h-12 rounded-xl items-center justify-center mr-4"
          style={{ backgroundColor: theme.backgroundSecondary }}
        >
          <Icon size={24} color={theme.textTertiary} />
        </View>

        <View className="flex-1">
          <View className="flex-row items-center justify-between">
            <Text className="font-semibold text-lg flex-1 mr-2" style={{ color: theme.text }} numberOfLines={1}>
              {device.name}
            </Text>
            <StatusBadge status={device.status} size="sm" />
          </View>

          <Text className="text-sm mt-1 capitalize" style={{ color: theme.textTertiary }}>
            {device.platform} • {device.type}
          </Text>

          {(device.connectedTools?.length || 0) > 0 && (
            <View className="flex-row flex-wrap gap-2 mt-3">
              {(device.connectedTools || []).map((tool) => (
                <View
                  key={tool.id}
                  className="px-3 py-1 rounded-full"
                  style={{ backgroundColor: theme.backgroundSecondary }}
                >
                  <Text className="text-xs capitalize" style={{ color: theme.textTertiary }}>
                    {tool.name}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <ChevronRight size={20} color={theme.border} className="ml-2" />
      </View>
    </Card>
  );
}

export default DeviceCard;
