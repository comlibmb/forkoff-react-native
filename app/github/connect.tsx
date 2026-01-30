import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { alert } from '@/components/ui/AlertModal';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Github, Check, LogOut, RefreshCw } from 'lucide-react-native';
import { Button, Card } from '@/components/ui';
import { githubService } from '@/services/github.service';
import { authService } from '@/services/auth.service';
import { GitHubUser } from '@/types';
import * as WebBrowser from 'expo-web-browser';
import { colors } from '@/theme/colors';

export default function GitHubConnectScreen() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [githubUser, setGithubUser] = useState<GitHubUser | null>(null);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    setIsLoading(true);
    try {
      const connected = await githubService.isConnected();
      setIsConnected(connected);

      if (connected) {
        const user = await githubService.getUser();
        setGithubUser(user);
      }
    } catch (error) {
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);

    try {
      const { url } = await authService.signInWithGitHub();

      const result = await WebBrowser.openAuthSessionAsync(
        url,
        'forkoff://auth/callback'
      );

      if (result.type === 'success') {
        await checkConnection();
      }
    } catch (error) {
      alert.error('Error', 'Failed to connect GitHub. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    const confirmed = await alert.confirm(
      'Disconnect GitHub',
      'Are you sure you want to disconnect your GitHub account?',
      { confirmText: 'Disconnect', destructive: true }
    );
    if (confirmed) {
      try {
        await githubService.disconnect();
        setIsConnected(false);
        setGithubUser(null);
      } catch (error) {
        alert.error('Error', 'Failed to disconnect GitHub');
      }
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-dark-900" edges={['top']}>
      {/* Header */}
      <View className="px-6 pt-4 pb-4 flex-row items-center">
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center"
        >
          <ArrowLeft size={24} color={colors.dark[300]} />
          <Text className="text-dark-300 ml-2">Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-6" contentContainerClassName="pb-8">
        <Text className="text-white text-2xl font-bold mb-2">GitHub</Text>
        <Text className="text-dark-400 mb-6">
          Connect your GitHub account to access repositories
        </Text>

        {isLoading ? (
          <Card padding="lg">
            <View className="items-center py-8">
              <RefreshCw size={32} color={colors.dark[400]} />
              <Text className="text-dark-400 mt-4">Checking connection...</Text>
            </View>
          </Card>
        ) : isConnected && githubUser ? (
          <>
            {/* Connected Account */}
            <Card padding="lg" variant="elevated" className="mb-6">
              <View className="items-center">
                <View className="w-20 h-20 bg-dark-700 rounded-full items-center justify-center mb-4 overflow-hidden">
                  {githubUser.avatarUrl ? (
                    <View className="w-20 h-20 bg-dark-600 rounded-full" />
                  ) : (
                    <Github size={40} color={colors.dark[300]} />
                  )}
                </View>

                <Text className="text-white text-xl font-bold">
                  {githubUser.name}
                </Text>
                <Text className="text-dark-400">@{githubUser.login}</Text>

                <View className="flex-row items-center mt-4 bg-success-500/20 px-4 py-2 rounded-full">
                  <Check size={16} color={colors.success[500]} />
                  <Text className="text-success-500 ml-2 font-medium">
                    Connected
                  </Text>
                </View>
              </View>
            </Card>

            {/* Quick Actions */}
            <View className="gap-3 mb-6">
              <Card
                padding="md"
                onPress={() => router.push('/github/repos')}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <View className="w-10 h-10 bg-dark-700 rounded-lg items-center justify-center mr-3">
                      <Github size={20} color={colors.dark[300]} />
                    </View>
                    <Text className="text-white font-medium">
                      Browse Repositories
                    </Text>
                  </View>
                </View>
              </Card>

              <Card
                padding="md"
                onPress={() => router.push('/github/create-repo')}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <View className="w-10 h-10 bg-dark-700 rounded-lg items-center justify-center mr-3">
                      <Github size={20} color={colors.dark[300]} />
                    </View>
                    <Text className="text-white font-medium">
                      Create New Repository
                    </Text>
                  </View>
                </View>
              </Card>
            </View>

            {/* Disconnect */}
            <Button
              title="Disconnect GitHub"
              variant="danger"
              onPress={handleDisconnect}
              icon={<LogOut size={16} color="#fff" />}
              fullWidth
            />
          </>
        ) : (
          <Card padding="lg" variant="elevated">
            <View className="items-center mb-6">
              <View className="w-16 h-16 bg-dark-700 rounded-full items-center justify-center mb-4">
                <Github size={32} color={colors.dark[200]} />
              </View>
              <Text className="text-white text-xl font-semibold text-center">
                Connect GitHub
              </Text>
              <Text className="text-dark-400 text-center mt-2">
                Link your GitHub account to access your repositories
              </Text>
            </View>

            <View className="gap-4 mb-6">
              {[
                'Browse and clone your repositories',
                'Create new repos from mobile',
                'View commit history and branches',
                'Manage pull requests on the go',
              ].map((benefit, index) => (
                <View key={index} className="flex-row items-center">
                  <Check size={20} color={colors.success[500]} />
                  <Text className="text-dark-200 ml-3">{benefit}</Text>
                </View>
              ))}
            </View>

            <Button
              title="Connect with GitHub"
              onPress={handleConnect}
              loading={isConnecting}
              icon={<Github size={20} color="#fff" />}
              fullWidth
            />
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
