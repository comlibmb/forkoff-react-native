import React from 'react';
import { View, Text } from 'react-native';
import { ChevronRight, Play, Square } from 'lucide-react-native';
import { Card } from '@/components/ui';
import { Project } from '@/types';
import { useTheme } from '@/theme/ThemeProvider';

interface ProjectCardProps {
  project: Project;
  onPress?: () => void;
  deviceName?: string;
}

const languageColors: Record<string, string> = {
  typescript: '#3178c6',
  javascript: '#f7df1e',
  python: '#3776ab',
  rust: '#dea584',
  go: '#00add8',
  java: '#b07219',
  kotlin: '#a97bff',
  swift: '#f05138',
  ruby: '#cc342d',
};

export function ProjectCard({ project, onPress, deviceName }: ProjectCardProps) {
  const { theme } = useTheme();
  const hasActiveServers = (project.servers || []).some((s) => s.status === 'running');
  const languageColor = languageColors[(project.language || 'typescript').toLowerCase()] || theme.border;

  return (
    <Card padding="md" onPress={onPress}>
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <View className="flex-row items-center">
            <View
              className="w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: languageColor }}
            />
            <Text className="font-semibold text-lg flex-1" style={{ color: theme.text }} numberOfLines={1}>
              {project.name}
            </Text>
          </View>

          <Text className="text-sm mt-1" style={{ color: theme.textTertiary }}>
            {project.language}
            {project.framework && ` • ${project.framework}`}
          </Text>

          {deviceName && (
            <Text className="text-xs mt-2" style={{ color: theme.border }}>{deviceName}</Text>
          )}
        </View>

        <View className="items-end">
          {hasActiveServers ? (
            <View
              className="flex-row items-center px-2 py-1 rounded-full"
              style={{ backgroundColor: theme.success + '33' }}
            >
              <Play size={12} color={theme.success} fill={theme.success} />
              <Text className="text-xs ml-1 font-medium" style={{ color: theme.success }}>
                Running
              </Text>
            </View>
          ) : (project.servers || []).length > 0 ? (
            <View
              className="flex-row items-center px-2 py-1 rounded-full"
              style={{ backgroundColor: theme.backgroundSecondary }}
            >
              <Square size={12} color={theme.textTertiary} />
              <Text className="text-xs ml-1" style={{ color: theme.textTertiary }}>Stopped</Text>
            </View>
          ) : null}

          <ChevronRight
            size={20}
            color={theme.border}
            style={{ marginTop: 8 }}
          />
        </View>
      </View>

      {/* Tools */}
      {(project.tools || []).length > 0 && (
        <View
          className="flex-row flex-wrap gap-2 mt-4 pt-3 border-t"
          style={{ borderColor: theme.backgroundSecondary }}
        >
          {(project.tools || [])
            .filter((t) => t.enabled)
            .map((tool) => (
              <View
                key={tool.toolType}
                className="px-3 py-1 rounded-full"
                style={{ backgroundColor: theme.backgroundSecondary }}
              >
                <Text className="text-xs capitalize" style={{ color: theme.textTertiary }}>
                  {tool.toolType.replace('-', ' ')}
                </Text>
              </View>
            ))}
        </View>
      )}
    </Card>
  );
}

export default ProjectCard;
