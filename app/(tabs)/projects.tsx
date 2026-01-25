import { useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, TextInput } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, FolderGit2, Plus, ChevronRight, Play, Square } from 'lucide-react-native';
import { Card, StatusBadge, Button } from '@/components/ui';
import { useProjectStore } from '@/stores/project.store';
import { useDeviceStore } from '@/stores/device.store';
import { Project } from '@/types';
import { colors } from '@/theme/colors';

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

export default function ProjectsScreen() {
  const { projects, fetchProjects, isLoading } = useProjectStore();
  const { devices } = useDeviceStore();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchProjects();
  }, []);

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getDeviceName = (deviceId: string) => {
    const device = devices.find((d) => d.id === deviceId);
    return device?.name || 'Unknown Device';
  };

  const getLanguageColor = (language: string) => {
    return languageColors[language.toLowerCase()] || colors.dark[500];
  };

  const ProjectCard = ({ project }: { project: Project }) => {
    const servers = project.servers || [];
    const tools = project.tools || [];
    const hasActiveServers = servers.some((s) => s.status === 'running');

    return (
      <Card padding="md" onPress={() => router.push(`/project/${project.id}`)}>
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            <View className="flex-row items-center">
              <View
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: getLanguageColor(project.language || 'unknown') }}
              />
              <Text className="text-white font-semibold text-lg flex-1" numberOfLines={1}>
                {project.name}
              </Text>
            </View>

            <Text className="text-dark-400 text-sm mt-1">
              {project.language || 'Unknown'}
              {project.framework && ` • ${project.framework}`}
            </Text>

            <View className="flex-row items-center mt-3">
              <Text className="text-dark-500 text-xs">
                {getDeviceName(project.deviceId)}
              </Text>
            </View>
          </View>

          <View className="items-end">
            {hasActiveServers ? (
              <View className="flex-row items-center bg-success-500/20 px-2 py-1 rounded-full">
                <Play size={12} color={colors.success[500]} fill={colors.success[500]} />
                <Text className="text-success-500 text-xs ml-1 font-medium">
                  Running
                </Text>
              </View>
            ) : servers.length > 0 ? (
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
        {tools.length > 0 && (
          <View className="flex-row flex-wrap gap-2 mt-4 pt-3 border-t border-dark-700">
            {tools
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
  };

  return (
    <SafeAreaView className="flex-1 bg-dark-900" edges={['top']}>
      {/* Header */}
      <View className="px-6 pt-4 pb-4">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-white text-2xl font-bold">Projects</Text>
          <Button
            title="New"
            size="sm"
            onPress={() => router.push('/project/new')}
            icon={<Plus size={16} color="#fff" />}
          />
        </View>

        {/* Search */}
        <View className="flex-row items-center bg-dark-800 rounded-xl px-4 py-3">
          <Search size={20} color={colors.dark[400]} />
          <TextInput
            className="flex-1 text-white ml-3"
            placeholder="Search projects..."
            placeholderTextColor={colors.dark[400]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Project List */}
      <ScrollView
        className="flex-1 px-6"
        contentContainerClassName="pb-8 gap-4"
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={fetchProjects}
            tintColor={colors.primary[500]}
          />
        }
      >
        {filteredProjects.length === 0 ? (
          <View className="items-center py-12">
            <FolderGit2 size={64} color={colors.dark[600]} />
            <Text className="text-dark-400 mt-4 text-center text-lg">
              {searchQuery ? 'No projects found' : 'No projects yet'}
            </Text>
            {!searchQuery && (
              <Text className="text-dark-500 text-center mt-2">
                Clone a repository or create a new project
              </Text>
            )}
          </View>
        ) : (
          filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
