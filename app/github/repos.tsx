import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, TextInput } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Search, Lock, Globe, Star, GitFork, ChevronRight } from 'lucide-react-native';
import { Card } from '@/components/ui';
import { githubService } from '@/services/github.service';
import { GitHubRepo } from '@/types';
import { colors } from '@/theme/colors';

const languageColors: Record<string, string> = {
  typescript: '#3178c6',
  javascript: '#f7df1e',
  python: '#3776ab',
  rust: '#dea584',
  go: '#00add8',
  java: '#b07219',
};

export default function GitHubReposScreen() {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadRepos();
  }, []);

  const loadRepos = async () => {
    setIsLoading(true);
    try {
      const data = await githubService.getRepositories();
      setRepos(data);
    } catch (error) {
      console.error('Failed to load repos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRepos = repos.filter((repo) =>
    repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    repo.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / 86400000);

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return d.toLocaleDateString();
  };

  const RepoCard = ({ repo }: { repo: GitHubRepo }) => (
    <Card
      padding="md"
      onPress={() => {
        // Navigate to clone/details screen
        router.push({
          pathname: '/github/repo/[fullName]',
          params: { fullName: repo.fullName },
        });
      }}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <View className="flex-row items-center">
            {repo.private ? (
              <Lock size={14} color={colors.dark[400]} />
            ) : (
              <Globe size={14} color={colors.dark[400]} />
            )}
            <Text className="text-white font-semibold ml-2" numberOfLines={1}>
              {repo.name}
            </Text>
          </View>

          {repo.description && (
            <Text className="text-dark-400 text-sm mt-2" numberOfLines={2}>
              {repo.description}
            </Text>
          )}

          <View className="flex-row items-center mt-3 gap-4">
            {repo.language && (
              <View className="flex-row items-center">
                <View
                  className="w-3 h-3 rounded-full mr-1"
                  style={{
                    backgroundColor:
                      languageColors[repo.language.toLowerCase()] || colors.dark[400],
                  }}
                />
                <Text className="text-dark-400 text-xs">{repo.language}</Text>
              </View>
            )}

            {repo.stars > 0 && (
              <View className="flex-row items-center">
                <Star size={12} color={colors.warning[500]} />
                <Text className="text-dark-400 text-xs ml-1">{repo.stars}</Text>
              </View>
            )}

            {repo.forks > 0 && (
              <View className="flex-row items-center">
                <GitFork size={12} color={colors.dark[400]} />
                <Text className="text-dark-400 text-xs ml-1">{repo.forks}</Text>
              </View>
            )}

            <Text className="text-dark-500 text-xs">
              {formatDate(repo.updatedAt)}
            </Text>
          </View>
        </View>

        <ChevronRight size={20} color={colors.dark[500]} style={{ marginLeft: 8 }} />
      </View>
    </Card>
  );

  return (
    <SafeAreaView className="flex-1 bg-dark-900" edges={['top']}>
      {/* Header */}
      <View className="px-6 pt-4 pb-4">
        <View className="flex-row items-center mb-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="flex-row items-center"
          >
            <ArrowLeft size={24} color={colors.dark[300]} />
            <Text className="text-dark-300 ml-2">Back</Text>
          </TouchableOpacity>
        </View>

        <Text className="text-white text-2xl font-bold mb-4">Repositories</Text>

        {/* Search */}
        <View className="flex-row items-center bg-dark-800 rounded-xl px-4 py-3">
          <Search size={20} color={colors.dark[400]} />
          <TextInput
            className="flex-1 text-white ml-3"
            placeholder="Search repositories..."
            placeholderTextColor={colors.dark[400]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Repo List */}
      <ScrollView
        className="flex-1 px-6"
        contentContainerClassName="pb-8 gap-3"
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={loadRepos}
            tintColor={colors.primary[500]}
          />
        }
      >
        {filteredRepos.length === 0 && !isLoading ? (
          <View className="items-center py-12">
            <Text className="text-dark-400 text-lg">
              {searchQuery ? 'No repositories found' : 'No repositories'}
            </Text>
          </View>
        ) : (
          filteredRepos.map((repo) => <RepoCard key={repo.id} repo={repo} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
