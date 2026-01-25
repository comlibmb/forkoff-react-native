import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import {
  Server,
  Play,
  Square,
  RefreshCw,
  ExternalLink,
  Activity,
} from 'lucide-react-native';
import { Card, StatusBadge } from '@/components/ui';
import { colors } from '@/theme/colors';

export type ServerStatus = 'running' | 'stopped' | 'starting' | 'stopping' | 'error';

export interface ServerInfo {
  id: string;
  name: string;
  type: 'dev' | 'preview' | 'production' | 'custom';
  status: ServerStatus;
  url?: string;
  port?: number;
  uptime?: string;
  cpu?: number;
  memory?: number;
}

interface ServerCardProps {
  server: ServerInfo;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  onOpenUrl?: () => void;
  isLoading?: boolean;
}

const statusColors: Record<ServerStatus, 'success' | 'error' | 'warning' | 'info' | 'default'> = {
  running: 'success',
  stopped: 'default',
  starting: 'warning',
  stopping: 'warning',
  error: 'error',
};

const statusLabels: Record<ServerStatus, string> = {
  running: 'Running',
  stopped: 'Stopped',
  starting: 'Starting...',
  stopping: 'Stopping...',
  error: 'Error',
};

const typeLabels: Record<ServerInfo['type'], string> = {
  dev: 'Development',
  preview: 'Preview',
  production: 'Production',
  custom: 'Custom',
};

export function ServerCard({
  server,
  onStart,
  onStop,
  onRestart,
  onOpenUrl,
  isLoading = false,
}: ServerCardProps) {
  const isRunning = server.status === 'running';
  const canControl = !isLoading && !['starting', 'stopping'].includes(server.status);

  return (
    <Card padding="md">
      {/* Header */}
      <View className="flex-row items-center mb-4">
        <View
          className={`w-10 h-10 rounded-lg items-center justify-center mr-3 ${
            isRunning ? 'bg-success-500/20' : 'bg-dark-700'
          }`}
        >
          <Server
            size={20}
            color={isRunning ? colors.success[500] : colors.dark[400]}
          />
        </View>
        <View className="flex-1">
          <Text className="text-white font-medium">{server.name}</Text>
          <Text className="text-dark-400 text-sm">
            {typeLabels[server.type]}
            {server.port && ` • Port ${server.port}`}
          </Text>
        </View>
        <StatusBadge
          status={statusColors[server.status]}
          label={statusLabels[server.status]}
        />
      </View>

      {/* URL */}
      {server.url && isRunning && (
        <TouchableOpacity
          onPress={onOpenUrl}
          className="flex-row items-center bg-dark-700 rounded-lg px-3 py-2 mb-4"
        >
          <ExternalLink size={14} color={colors.primary[400]} />
          <Text
            className="text-primary-400 text-sm ml-2 flex-1"
            numberOfLines={1}
          >
            {server.url}
          </Text>
        </TouchableOpacity>
      )}

      {/* Stats */}
      {isRunning && (server.cpu !== undefined || server.memory !== undefined) && (
        <View className="flex-row gap-4 mb-4">
          {server.cpu !== undefined && (
            <View className="flex-1 bg-dark-700 rounded-lg p-3">
              <View className="flex-row items-center mb-1">
                <Activity size={12} color={colors.dark[400]} />
                <Text className="text-dark-400 text-xs ml-1">CPU</Text>
              </View>
              <Text className="text-white font-semibold">{server.cpu}%</Text>
            </View>
          )}
          {server.memory !== undefined && (
            <View className="flex-1 bg-dark-700 rounded-lg p-3">
              <View className="flex-row items-center mb-1">
                <Server size={12} color={colors.dark[400]} />
                <Text className="text-dark-400 text-xs ml-1">Memory</Text>
              </View>
              <Text className="text-white font-semibold">{server.memory}%</Text>
            </View>
          )}
          {server.uptime && (
            <View className="flex-1 bg-dark-700 rounded-lg p-3">
              <Text className="text-dark-400 text-xs mb-1">Uptime</Text>
              <Text className="text-white font-semibold">{server.uptime}</Text>
            </View>
          )}
        </View>
      )}

      {/* Controls */}
      <View className="flex-row gap-3">
        {isRunning ? (
          <>
            <TouchableOpacity
              onPress={onStop}
              disabled={!canControl}
              className={`flex-1 flex-row items-center justify-center py-3 rounded-xl ${
                canControl ? 'bg-error-500/20' : 'bg-dark-700 opacity-50'
              }`}
            >
              <Square size={16} color={colors.error[500]} />
              <Text className="text-error-500 font-medium ml-2">Stop</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onRestart}
              disabled={!canControl}
              className={`flex-1 flex-row items-center justify-center py-3 rounded-xl ${
                canControl ? 'bg-warning-500/20' : 'bg-dark-700 opacity-50'
              }`}
            >
              <RefreshCw size={16} color={colors.warning[500]} />
              <Text className="text-warning-500 font-medium ml-2">Restart</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            onPress={onStart}
            disabled={!canControl}
            className={`flex-1 flex-row items-center justify-center py-3 rounded-xl ${
              canControl ? 'bg-success-500/20' : 'bg-dark-700 opacity-50'
            }`}
          >
            <Play size={16} color={colors.success[500]} />
            <Text className="text-success-500 font-medium ml-2">Start</Text>
          </TouchableOpacity>
        )}
      </View>
    </Card>
  );
}

export default ServerCard;
