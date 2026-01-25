import React from 'react';
import { View, Text } from 'react-native';
import { ChevronRight, Play, Square } from 'lucide-react-native';
import { Card } from '@/components/ui';
import { Project } from '@/types';
import { colors } from '@/theme/colors';

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
  const hasActiveServers = (project.servers || []).some((s) => s.status === 'running');
  const languageColor = languageColors[(project.language || 'typescript').toLowerCase()] || colors.dark[500];

  return (
    <Card padding="md" onPress={onPress}>
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <View className="flex-row items-center">
            <View
              className="w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: languageColor }}
            />
            <Text className="text-white font-semibold text-lg flex-1" numberOfLines={1}>
              {project.name}
            </Text>
          </View>

          <Text className="text-dark-400 text-sm mt-1">
            {project.language}
            {project.framework && ` • ${project.framework}`}
          </Text>

          {deviceName && (
            <Text className="text-dark-500 text-xs mt-2">{deviceName}</Text>
          )}
        </View>

        <View className="items-end">
          {hasActiveServers ? (
            <View className="flex-row items-center bg-success-500/20 px-2 py-1 rounded-full">
              <Play size={12} color={colors.success[500]} fill={colors.success[500]} />
              <Text className="text-success-500 text-xs ml-1 font-medium">
                Running
              </Text>
            </View>
          ) : (project.servers || []).length > 0 ? (
            <View className="flex-row items-center bg-dark-700 px-2 py-1 rounded-full">
              <Square size={12} color={colors.dark[400]} />
              <Text className="text-dark-400 text-xs ml-1">Stopped</Text>
            </View>
          ) : null}

          <ChevronRight
            size={20}
            color={colors.dark[500]}
            style={{ marginTop: 8 }}
          />
        </View>
      </View>

      {/* Tools */}
      {(project.tools || []).length > 0 && (
        <View className="flex-row flex-wrap gap-2 mt-4 pt-3 border-t border-dark-700">
          {(project.tools || [])
            .filter((t) => t.enabled)
            .map((tool) => (
              <View
                key={tool.toolType}
                className="bg-dark-700 px-3 py-1 rounded-full"
              >
                <Text className="text-dark-300 text-xs capitalize">
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
