import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  GitBranch,
  Star,
  GitFork,
  Globe,
  Lock,
  Download,
  ExternalLink,
  RefreshCw,
} from 'lucide-react-native';
import { Button, Card } from '@/components/ui';
import { githubService } from '@/services/github.service';
import { useDeviceStore } from '@/stores/device.store';
import { GitHubRepo, GitHubBranch } from '@/types';
import { colors } from '@/theme/colors';

export default function GitHubRepoDetailScreen() {
  const { fullName } = useLocalSearchParams<{ fullName: string }>();
  const { devices } = useDeviceStore();

  const [repo, setRepo] = useState<GitHubRepo | null>(null);
  const [branches, setBranches] = useState<GitHubBranch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCloning, setIsCloning] = useState(false);

  const onlineDevices = devices.filter((d) => d.status === 'online');

  useEffect(() => {
    loadRepoDetails();
  }, [fullName]);

  const loadRepoDetails = async () => {
    if (!fullName) return;

    setIsLoading(true);
    try {
      const decodedName = decodeURIComponent(fullName);
      const [owner, repoName] = decodedName.split('/');

      const [repoData, branchData] = await Promise.all([
        githubService.getRepository(owner, repoName),
        githubService.getBranches(owner, repoName),
      ]);

      setRepo(repoData);
      setBranches(branchData);
      setSelectedBranch(repoData.defaultBranch);
    } catch (error) {
      console.error('Failed to load repo:', error);
      Alert.alert('Error', 'Failed to load repository details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClone = async (deviceId: string) => {
    if (!repo) return;

    setIsCloning(true);
    try {
      const result = await githubService.cloneRepository(
        repo.cloneUrl,
        deviceId,
        `/projects/${repo.name}`,
        selectedBranch
      );

      Alert.alert('Success', 'Repository cloned successfully!', [
        {
          text: 'Open Project',
          onPress: () => router.push(`/project/${result.projectId}`),
        },
        { text: 'OK' },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to clone repository');
    } finally {
      setIsCloning(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-dark-900 items-center justify-center">
        <RefreshCw size={32} color={colors.dark[400]} />
        <Text className="text-dark-400 mt-4">Loading repository...</Text>
      </SafeAreaView>
    );
  }

  if (!repo) {
    return (
      <SafeAreaView className="flex-1 bg-dark-900 items-center justify-center">
        <Text className="text-dark-400 text-lg">Repository not found</Text>
        <Button
          title="Go Back"
          variant="ghost"
          onPress={() => router.back()}
          style={{ marginTop: 16 }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-dark-900" edges={['top']}>
      {/* Header */}
      <View className="px-6 pt-4 pb-4 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center"
        >
          <ArrowLeft size={24} color={colors.dark[300]} />
          <Text className="text-dark-300 ml-2">Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            // Open in browser
          }}
        >
          <ExternalLink size={20} color={colors.dark[300]} />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-6" contentContainerClassName="pb-8">
        {/* Repo Info */}
        <View className="mb-6">
          <View className="flex-row items-center mb-2">
            {repo.private ? (
              <Lock size={16} color={colors.dark[400]} />
            ) : (
              <Globe size={16} color={colors.dark[400]} />
            )}
            <Text className="text-dark-400 ml-2 text-sm">
              {repo.private ? 'Private' : 'Public'}
            </Text>
          </View>

          <Text className="text-white text-2xl font-bold">{repo.name}</Text>
          <Text className="text-dark-400 text-sm mt-1">{repo.fullName}</Text>

          {repo.description && (
            <Text className="text-dark-300 mt-3">{repo.description}</Text>
          )}

          <View className="flex-row items-center mt-4 gap-6">
            <View className="flex-row items-center">
              <Star size={16} color={colors.warning[500]} />
              <Text className="text-dark-300 ml-2">{repo.stars}</Text>
            </View>
            <View className="flex-row items-center">
              <GitFork size={16} color={colors.dark[400]} />
              <Text className="text-dark-300 ml-2">{repo.forks}</Text>
            </View>
          </View>
        </View>

        {/* Branch Selection */}
        <Text className="text-dark-200 font-medium mb-3">Select Branch</Text>
        <Card padding="none" className="mb-6">
          <View className="divide-y divide-dark-700">
            {branches.map((branch) => (
              <TouchableOpacity
                key={branch.name}
                onPress={() => setSelectedBranch(branch.name)}
                className="flex-row items-center justify-between px-4 py-3"
              >
                <View className="flex-row items-center">
                  <GitBranch size={16} color={colors.dark[400]} />
                  <Text className="text-white ml-3">{branch.name}</Text>
                  {branch.name === repo.defaultBranch && (
                    <View className="bg-dark-700 px-2 py-0.5 rounded ml-2">
                      <Text className="text-dark-400 text-xs">default</Text>
                    </View>
                  )}
                </View>
                {selectedBranch === branch.name && (
                  <View className="w-5 h-5 bg-primary-500 rounded-full items-center justify-center">
                    <View className="w-2 h-2 bg-white rounded-full" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Clone to Device */}
        <Text className="text-dark-200 font-medium mb-3">Clone to Device</Text>
        {onlineDevices.length === 0 ? (
          <Card padding="md">
            <View className="items-center py-4">
              <Text className="text-dark-400">No devices online</Text>
              <Text className="text-dark-500 text-sm mt-1">
                Connect a device to clone this repository
              </Text>
            </View>
          </Card>
        ) : (
          <View className="gap-3">
            {onlineDevices.map((device) => (
              <Card key={device.id} padding="md">
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-white font-medium">{device.name}</Text>
                    <Text className="text-dark-400 text-sm capitalize">
                      {device.platform} • {device.type}
                    </Text>
                  </View>
                  <Button
                    title="Clone"
                    size="sm"
                    onPress={() => handleClone(device.id)}
                    loading={isCloning}
                    icon={<Download size={14} color="#fff" />}
                  />
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
