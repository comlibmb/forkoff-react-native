import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, TextInput } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Search, Lock, Globe, Star, GitFork, ChevronRight } from 'lucide-react-native';
import { Card } from '@/components/ui';
import { githubService } from '@/services/github.service';
import { GitHubRepo } from '@/types';
import { useTheme } from '@/theme/ThemeProvider';

const languageColors: Record<string, string> = {
  typescript: '#3178c6',
  javascript: '#f7df1e',
  python: '#3776ab',
  rust: '#dea584',
  go: '#00add8',
  java: '#b07219',
};

export default function GitHubReposScreen() {
  const { theme } = useTheme();
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
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {repo.private ? (
              <Lock size={14} color={theme.textTertiary} />
            ) : (
              <Globe size={14} color={theme.textTertiary} />
            )}
            <Text style={{ color: theme.text, fontWeight: '600', marginLeft: 8 }} numberOfLines={1}>
              {repo.name}
            </Text>
          </View>

          {repo.description && (
            <Text style={{ color: theme.textTertiary, fontSize: 14, marginTop: 8 }} numberOfLines={2}>
              {repo.description}
            </Text>
          )}

          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 16 }}>
            {repo.language && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    marginRight: 4,
                    backgroundColor:
                      languageColors[repo.language.toLowerCase()] || theme.textTertiary,
                  }}
                />
                <Text style={{ color: theme.textTertiary, fontSize: 12 }}>{repo.language}</Text>
              </View>
            )}

            {repo.stars > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Star size={12} color={theme.warning} />
                <Text style={{ color: theme.textTertiary, fontSize: 12, marginLeft: 4 }}>{repo.stars}</Text>
              </View>
            )}

            {repo.forks > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <GitFork size={12} color={theme.textTertiary} />
                <Text style={{ color: theme.textTertiary, fontSize: 12, marginLeft: 4 }}>{repo.forks}</Text>
              </View>
            )}

            <Text style={{ color: theme.border, fontSize: 12 }}>
              {formatDate(repo.updatedAt)}
            </Text>
          </View>
        </View>

        <ChevronRight size={20} color={theme.border} style={{ marginLeft: 8 }} />
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
      {/* Header */}
      <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ flexDirection: 'row', alignItems: 'center' }}
          >
            <ArrowLeft size={24} color={theme.textTertiary} />
            <Text style={{ color: theme.textTertiary, marginLeft: 8 }}>Back</Text>
          </TouchableOpacity>
        </View>

        <Text style={{ color: theme.text, fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>Repositories</Text>

        {/* Search */}
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.backgroundSecondary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 }}>
          <Search size={20} color={theme.textTertiary} />
          <TextInput
            style={{ flex: 1, color: theme.text, marginLeft: 12 }}
            placeholder="Search repositories..."
            placeholderTextColor={theme.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Repo List */}
      <ScrollView
        style={{ flex: 1, paddingHorizontal: 24 }}
        contentContainerStyle={{ paddingBottom: 32, gap: 12 }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={loadRepos}
            tintColor={theme.primary}
          />
        }
      >
        {filteredRepos.length === 0 && !isLoading ? (
          <View style={{ alignItems: 'center', paddingVertical: 48 }}>
            <Text style={{ color: theme.textTertiary, fontSize: 18 }}>
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
