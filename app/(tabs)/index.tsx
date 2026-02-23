import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, TextInput } from 'react-native';
import { router, Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Plus,
  ChevronRight,
  Laptop,
  Search,
  Terminal,
  MessageSquare,
  GitBranch,
  FolderGit2,
  Check,
} from 'lucide-react-native';
import { useDeviceStore } from '@/stores/device.store';
import { useProjectStore } from '@/stores/project.store';
import { colors } from '@/theme/colors';

type FilterType = 'all' | 'active' | 'favorites' | 'errors';

export default function HomeScreen() {
  // Redirect to projects tab - it's the main landing page
  return <Redirect href="/(tabs)/projects" />;

  const { devices, fetchDevices, isLoading: devicesLoading } = useDeviceStore();
  const { projects, fetchProjects, isLoading: projectsLoading } = useProjectStore();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchDevices();
    fetchProjects();
  }, []);

  const handleRefresh = () => {
    fetchDevices();
    fetchProjects();
  };

  // Filter projects based on active filter
  const filteredProjects = projects.filter((project) => {
    if (searchQuery) {
      return project.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    switch (activeFilter) {
      case 'active':
        return project.status === 'active';
      case 'favorites':
        return project.isFavorite;
      case 'errors':
        return project.hasErrors;
      default:
        return true;
    }
  });

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'favorites', label: 'Favorites' },
    { key: 'errors', label: 'Errors' },
  ];

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <SafeAreaView className="flex-1 bg-dark-800" edges={['top']}>
      {/* Header with blur effect */}
      <View className="bg-dark-800/95 border-b border-dark-500 px-4 pb-4 pt-2">
        {/* Title Row */}
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-dark-50 text-2xl font-bold">Projects</Text>
          <View className="flex-row items-center gap-3">
            {/* Notification Bell */}
            <TouchableOpacity className="p-2">
              <View className="w-5 h-5 items-center justify-center">
                <View className="w-2 h-2 bg-primary-500 rounded-full absolute -top-0.5 -right-0.5" />
              </View>
            </TouchableOpacity>
            {/* Avatar */}
            <View
              className="w-9 h-9 rounded-full items-center justify-center"
              style={{
                borderWidth: 1,
                borderColor: 'transparent',
                backgroundImage: 'linear-gradient(135deg, #8b5cf6 0%, #238636 100%)',
              }}
            >
              <View className="w-[34px] h-[34px] rounded-full bg-dark-800 items-center justify-center">
                <Text className="text-dark-50 text-xs font-bold">
                  {getInitials(user?.name || 'JD')}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Search Input */}
        <View className="relative mb-4">
          <View className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
            <Search size={16} color={colors.dark[200]} />
          </View>
          <TextInput
            className="bg-dark-700 border border-dark-500 rounded-xl pl-10 pr-4 py-4 text-dark-50"
            placeholder="Search projects..."
            placeholderTextColor={colors.dark[200]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2">
            {filters.map((filter) => (
              <TouchableOpacity
                key={filter.key}
                onPress={() => setActiveFilter(filter.key)}
                className={`px-4 py-1.5 rounded-full border ${
                  activeFilter === filter.key
                    ? 'bg-primary-500/10 border-primary-500'
                    : 'bg-dark-700 border-dark-500'
                }`}
              >
                <Text
                  className={`text-xs font-medium ${
                    activeFilter === filter.key ? 'text-primary-500' : 'text-dark-200'
                  }`}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Projects List */}
      <ScrollView
        className="flex-1 px-4"
        contentContainerClassName="py-4 gap-4"
        refreshControl={
          <RefreshControl
            refreshing={devicesLoading || projectsLoading}
            onRefresh={handleRefresh}
            tintColor={colors.primary[500]}
          />
        }
      >
        {filteredProjects.length === 0 ? (
          <View className="bg-dark-700 border border-dark-500 rounded-xl p-6 items-center">
            <FolderGit2 size={48} color={colors.dark[400]} />
            <Text className="text-dark-200 mt-4 text-center">
              No projects yet.{'\n'}Add a device to get started.
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/device/pair')}
              className="mt-4 bg-primary-500 px-6 py-3 rounded-full flex-row items-center gap-2"
            >
              <Plus size={18} color="#fff" />
              <Text className="text-white font-medium">Add Device</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredProjects.map((project) => {
            const device = devices.find((d) => d.id === project.deviceId);
            const isActive = project.status === 'active';

            return (
              <TouchableOpacity
                key={project.id}
                onPress={() => router.push(`/project/${project.id}`)}
                className="bg-dark-700 border border-dark-500 rounded-xl p-5 overflow-hidden"
              >
                {/* Glow effect for active projects */}
                {isActive && (
                  <View
                    className="absolute -top-12 -right-12 w-24 h-24 opacity-10"
                    style={{ backgroundColor: colors.primary[500], borderRadius: 100, filter: 'blur(30px)' }}
                  />
                )}

                {/* Header Row */}
                <View className="flex-row items-start justify-between mb-4">
                  <View className="flex-row items-center gap-3">
                    {/* Project Icon */}
                    <View className="w-10 h-10 bg-dark-800 border border-dark-500 rounded-lg items-center justify-center">
                      <FolderGit2 size={20} color={colors.primary[500]} />
                    </View>
                    {/* Project Info */}
                    <View>
                      <Text className="text-dark-50 text-base font-bold">{project.name}</Text>
                      <View className="flex-row items-center gap-1 mt-0.5">
                        <Laptop size={12} color={colors.dark[200]} />
                        <Text className="text-dark-200 text-xs" numberOfLines={1}>
                          {device?.name || 'Unknown Device'}
                        </Text>
                      </View>
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
                <View className="bg-dark-800 border border-dark-500 rounded p-2 flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center gap-2">
                    <GitBranch size={12} color={colors.dark[200]} />
                    <Text className="text-dark-200 text-xs font-mono">
                      {project.branch || 'main'}
                    </Text>
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

                {/* Action Buttons */}
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => router.push(`/terminal/${project.id}`)}
                    className="flex-1 bg-dark-600 border border-dark-500 rounded py-2 flex-row items-center justify-center gap-2"
                  >
                    <Terminal size={12} color={colors.dark[50]} />
                    <Text className="text-dark-50 text-xs font-medium">Terminal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => router.push(`/project/${project.id}`)}
                    className="flex-1 bg-dark-600 border border-dark-500 rounded py-2 flex-row items-center justify-center gap-2"
                  >
                    <MessageSquare size={12} color={colors.dark[50]} />
                    <Text className="text-dark-50 text-xs font-medium">Details</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        onPress={() => router.push('/device/pair')}
        className="absolute bottom-24 right-6 w-14 h-14 bg-primary-500 rounded-full items-center justify-center"
        style={{
          shadowColor: colors.primary[500],
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.3,
          shadowRadius: 20,
          elevation: 10,
        }}
      >
        <Plus size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
