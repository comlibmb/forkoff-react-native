import { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Settings,
  Terminal,
  Server,
  FolderTree,
  Play,
  Square,
  ChevronRight,
  Laptop,
  FolderGit2,
  GitBranch,
  Check,
} from 'lucide-react-native';
import { useProjectStore } from '@/stores/project.store';
import { useDeviceStore } from '@/stores/device.store';
import { colors } from '@/theme/colors';

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getProject, fetchFileTree, fileTree } = useProjectStore();
  const { devices } = useDeviceStore();

  const project = getProject(id);

  useEffect(() => {
    if (id) {
      fetchFileTree(id);
    }
  }, [id]);

  if (!project) {
    return (
      <SafeAreaView className="flex-1 bg-dark-800 items-center justify-center">
        <View className="bg-dark-700 border border-dark-500 rounded-xl p-8 items-center mx-4">
          <FolderGit2 size={48} color={colors.dark[400]} />
          <Text className="text-dark-200 text-lg mt-4">Project not found</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="mt-4 bg-dark-600 border border-dark-500 px-6 py-3 rounded-full"
          >
            <Text className="text-dark-50 font-medium">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const device = devices.find((d) => d.id === project.deviceId);
  const servers = project.servers || [];
  const tools = project.tools || [];
  const projectFiles = fileTree[id] || [];
  const isActive = project.status === 'active';
  const isDeviceOnline = device?.status?.toLowerCase() === 'online';

  return (
    <SafeAreaView className="flex-1 bg-dark-800" edges={['top']}>
      {/* Header */}
      <View className="bg-dark-800/95 border-b border-dark-500 px-4 pb-4 pt-2 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center"
        >
          <ArrowLeft size={24} color={colors.dark[200]} />
          <Text className="text-dark-200 ml-2 font-medium">Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push(`/project/${id}/settings`)}
          className="w-10 h-10 bg-dark-700 border border-dark-500 rounded-lg items-center justify-center"
        >
          <Settings size={20} color={colors.dark[200]} />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4" contentContainerClassName="py-4 pb-8">
        {/* Project Info Card */}
        <View className="bg-dark-700 border border-dark-500 rounded-xl p-5 mb-6 overflow-hidden">
          {isActive && (
            <View
              className="absolute -top-12 -right-12 w-24 h-24 opacity-10"
              style={{ backgroundColor: colors.primary[500], borderRadius: 100, filter: 'blur(30px)' }}
            />
          )}

          <View className="flex-row items-start justify-between mb-4">
            <View className="flex-row items-center gap-3">
              <View className="w-12 h-12 bg-dark-800 border border-dark-500 rounded-xl items-center justify-center">
                <FolderGit2 size={24} color={colors.primary[500]} />
              </View>
              <View>
                <Text className="text-dark-50 text-xl font-bold">{project.name}</Text>
                <Text className="text-dark-200 text-sm">
                  {project.language}
                  {project.framework && ` • ${project.framework}`}
                </Text>
              </View>
            </View>

            {/* Status Badge */}
            <View
              className={`px-2 py-1 rounded flex-row items-center gap-1.5 ${
                isActive
                  ? 'bg-primary-500/10 border border-primary-500/20'
                  : 'bg-dark-500/30 border border-dark-500'
              }`}
            >
              <View
                className={`w-1.5 h-1.5 rounded-full ${
                  isActive ? 'bg-primary-500' : 'bg-dark-200'
                }`}
              />
              <Text
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  isActive ? 'text-primary-500' : 'text-dark-200'
                }`}
              >
                {isActive ? 'Active' : 'Idle'}
              </Text>
            </View>
          </View>

          {/* Branch Info */}
          <View className="bg-dark-800 border border-dark-500 rounded-lg p-3 flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-2">
              <GitBranch size={14} color={colors.dark[200]} />
              <Text className="text-dark-200 text-sm font-mono">{project.branch || 'main'}</Text>
            </View>
            {project.uncommittedChanges ? (
              <Text className="text-warning-300 text-xs font-medium">
                {project.uncommittedChanges} changes
              </Text>
            ) : (
              <View className="flex-row items-center gap-1">
                <Check size={12} color={colors.success[500]} />
                <Text className="text-success-500 text-xs">Clean</Text>
              </View>
            )}
          </View>

          {/* Device Link */}
          {device && (
            <TouchableOpacity
              onPress={() => router.push(`/device/${device.id}`)}
              className="flex-row items-center justify-between"
            >
              <View className="flex-row items-center gap-2">
                <Laptop size={14} color={colors.dark[300]} />
                <Text className="text-dark-300 text-sm">{device.name}</Text>
              </View>
              <View
                className={`px-2 py-0.5 rounded flex-row items-center gap-1 ${
                  isDeviceOnline
                    ? 'bg-primary-500/10'
                    : 'bg-dark-500/30'
                }`}
              >
                <View
                  className={`w-1.5 h-1.5 rounded-full ${
                    isDeviceOnline ? 'bg-primary-500' : 'bg-dark-300'
                  }`}
                />
                <Text
                  className={`text-[10px] font-medium ${
                    isDeviceOnline ? 'text-primary-500' : 'text-dark-300'
                  }`}
                >
                  {isDeviceOnline ? 'Online' : 'Offline'}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Actions */}
        <View className="flex-row gap-3 mb-6">
          <TouchableOpacity
            onPress={() => router.push(`/project/${id}/terminals`)}
            className="flex-1 bg-dark-700 border border-dark-500 rounded-xl p-4 items-center"
          >
            <View className="w-10 h-10 bg-dark-800 border border-dark-500 rounded-lg items-center justify-center mb-2">
              <Terminal size={20} color={colors.success[500]} />
            </View>
            <Text className="text-dark-50 font-medium text-sm">Terminal</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push(`/project/${id}/code`)}
            className="flex-1 bg-dark-700 border border-dark-500 rounded-xl p-4 items-center"
          >
            <View className="w-10 h-10 bg-dark-800 border border-dark-500 rounded-lg items-center justify-center mb-2">
              <FolderTree size={20} color={colors.warning[300]} />
            </View>
            <Text className="text-dark-50 font-medium text-sm">Files</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push(`/project/${id}/servers`)}
            className="flex-1 bg-dark-700 border border-dark-500 rounded-xl p-4 items-center"
          >
            <View className="w-10 h-10 bg-dark-800 border border-dark-500 rounded-lg items-center justify-center mb-2">
              <Server size={20} color={colors.primary[500]} />
            </View>
            <Text className="text-dark-50 font-medium text-sm">Servers</Text>
          </TouchableOpacity>
        </View>

        {/* Servers */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-dark-300 text-xs font-bold uppercase tracking-wider">
              Servers ({servers.length})
            </Text>
            <TouchableOpacity
              onPress={() => router.push(`/project/${id}/servers`)}
              className="flex-row items-center"
            >
              <Text className="text-primary-500 text-xs mr-1">Manage</Text>
              <ChevronRight size={14} color={colors.primary[500]} />
            </TouchableOpacity>
          </View>

          {servers.length === 0 ? (
            <View className="bg-dark-700 border border-dark-500 rounded-xl p-6 items-center">
              <Server size={36} color={colors.dark[400]} />
              <Text className="text-dark-200 mt-3 text-center text-sm">
                No servers configured
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {servers.map((server) => {
                const isRunning = server.status === 'running';
                return (
                  <View
                    key={server.id}
                    className="bg-dark-700 border border-dark-500 rounded-xl p-4 overflow-hidden"
                  >
                    {isRunning && (
                      <View
                        className="absolute -top-12 -right-12 w-24 h-24 opacity-10"
                        style={{ backgroundColor: colors.success[500], borderRadius: 100, filter: 'blur(30px)' }}
                      />
                    )}
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center">
                        <View className="w-10 h-10 bg-dark-800 border border-dark-500 rounded-lg items-center justify-center mr-3">
                          <Server size={20} color={isRunning ? colors.success[500] : colors.dark[300]} />
                        </View>
                        <View>
                          <Text className="text-dark-50 font-medium">{server.name}</Text>
                          <Text className="text-dark-300 text-xs">Port {server.port}</Text>
                        </View>
                      </View>

                      <View className="flex-row items-center gap-2">
                        <View
                          className={`px-2 py-1 rounded flex-row items-center gap-1.5 ${
                            isRunning
                              ? 'bg-success-500/10 border border-success-500/20'
                              : 'bg-dark-500/30 border border-dark-500'
                          }`}
                        >
                          <View
                            className={`w-1.5 h-1.5 rounded-full ${
                              isRunning ? 'bg-success-500' : 'bg-dark-300'
                            }`}
                          />
                          <Text
                            className={`text-[10px] font-bold uppercase tracking-wider ${
                              isRunning ? 'text-success-500' : 'text-dark-200'
                            }`}
                          >
                            {isRunning ? 'Running' : 'Stopped'}
                          </Text>
                        </View>
                        <TouchableOpacity
                          className={`w-8 h-8 rounded-lg items-center justify-center ${
                            isRunning ? 'bg-error-300/10 border border-error-300/20' : 'bg-success-500/10 border border-success-500/20'
                          }`}
                        >
                          {isRunning ? (
                            <Square size={14} color={colors.error[300]} />
                          ) : (
                            <Play size={14} color={colors.success[500]} />
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* AI Tools */}
        <View className="mb-6">
          <Text className="text-dark-300 text-xs font-bold uppercase tracking-wider mb-3">
            AI Tools ({tools.length})
          </Text>

          {tools.length === 0 ? (
            <View className="bg-dark-700 border border-dark-500 rounded-xl p-6 items-center">
              <Terminal size={36} color={colors.dark[400]} />
              <Text className="text-dark-200 mt-3 text-center text-sm">
                No AI tools configured
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {tools.map((tool) => (
                <TouchableOpacity
                  key={tool.toolType}
                  className="bg-dark-700 border border-dark-500 rounded-xl p-4"
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <View className="w-10 h-10 bg-dark-800 border border-dark-500 rounded-lg items-center justify-center mr-3">
                        <Terminal size={20} color={tool.enabled ? colors.primary[500] : colors.dark[300]} />
                      </View>
                      <View>
                        <Text className="text-dark-50 font-medium capitalize">
                          {tool.toolType.replace('-', ' ')}
                        </Text>
                        <Text className="text-dark-300 text-xs">
                          {tool.enabled ? 'Enabled' : 'Disabled'}
                        </Text>
                      </View>
                    </View>
                    <ChevronRight size={18} color={colors.dark[400]} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Files Preview */}
        <View>
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-dark-300 text-xs font-bold uppercase tracking-wider">
              Files
            </Text>
            <TouchableOpacity
              onPress={() => router.push(`/project/${id}/code`)}
              className="flex-row items-center"
            >
              <Text className="text-primary-500 text-xs mr-1">Browse</Text>
              <ChevronRight size={14} color={colors.primary[500]} />
            </TouchableOpacity>
          </View>

          <View className="bg-dark-700 border border-dark-500 rounded-xl p-4">
            {projectFiles.length === 0 ? (
              <View className="items-center py-4">
                <FolderTree size={32} color={colors.dark[400]} />
                <Text className="text-dark-300 mt-2 text-sm">No files loaded</Text>
              </View>
            ) : (
              <View className="gap-2">
                {projectFiles.slice(0, 5).map((file) => (
                  <View
                    key={file.path}
                    className="flex-row items-center py-2"
                    style={{ paddingLeft: file.type === 'directory' ? 0 : 16 }}
                  >
                    <FolderTree
                      size={14}
                      color={file.type === 'directory' ? colors.warning[300] : colors.dark[300]}
                    />
                    <Text className="text-dark-200 ml-2 text-sm font-mono">{file.name}</Text>
                  </View>
                ))}
                {projectFiles.length > 5 && (
                  <Text className="text-dark-400 text-xs mt-2">
                    +{projectFiles.length - 5} more files
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
