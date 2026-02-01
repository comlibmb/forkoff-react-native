import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { alert } from '@/components/ui/AlertModal';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Github, Check, LogOut, RefreshCw, ExternalLink } from 'lucide-react-native';
import { Button, Card } from '@/components/ui';
import { githubService } from '@/services/github.service';
import { authService } from '@/services/auth.service';
import { GitHubUser } from '@/types';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Linking from 'expo-linking';
import { useTheme } from '@/theme/ThemeProvider';

WebBrowser.maybeCompleteAuthSession();

export default function GitHubConnectScreen() {
  const { theme } = useTheme();
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

      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'forkoff',
        preferLocalhost: false,
      });

      console.log('[GitHub Connect] Opening OAuth with redirect:', redirectUri);

      const result = await WebBrowser.openAuthSessionAsync(url, redirectUri);

      console.log('[GitHub Connect] OAuth result:', result.type);

      if (result.type === 'success') {
        // Wait a moment for the session to be established
        await new Promise(resolve => setTimeout(resolve, 1000));
        await checkConnection();
      }
    } catch (error) {
      console.error('[GitHub Connect] Error:', error);
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
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
      {/* Header */}
      <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ flexDirection: 'row', alignItems: 'center' }}
        >
          <ArrowLeft size={24} color={theme.textTertiary} />
          <Text style={{ color: theme.textTertiary, marginLeft: 8 }}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1, paddingHorizontal: 24 }} contentContainerStyle={{ paddingBottom: 32 }}>
        <Text style={{ color: theme.text, fontSize: 24, fontWeight: 'bold', marginBottom: 8 }}>GitHub</Text>
        <Text style={{ color: theme.textTertiary, marginBottom: 24 }}>
          Connect your GitHub account to access repositories
        </Text>

        {isLoading ? (
          <Card padding="lg">
            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
              <RefreshCw size={32} color={theme.textTertiary} />
              <Text style={{ color: theme.textTertiary, marginTop: 16 }}>Checking connection...</Text>
            </View>
          </Card>
        ) : isConnected && githubUser ? (
          <>
            {/* Connected Account */}
            <Card padding="lg" variant="elevated" style={{ marginBottom: 24 }}>
              <View style={{ alignItems: 'center' }}>
                <View style={{ width: 96, height: 96, backgroundColor: theme.backgroundSecondary, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 16, overflow: 'hidden', borderWidth: 2, borderColor: theme.backgroundTertiary }}>
                  {githubUser.avatarUrl ? (
                    <Image
                      source={{ uri: githubUser.avatarUrl }}
                      style={{ width: 96, height: 96, borderRadius: 48 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <Github size={40} color={theme.textTertiary} />
                  )}
                </View>

                <Text style={{ color: theme.text, fontSize: 20, fontWeight: 'bold' }}>
                  {githubUser.name || githubUser.login}
                </Text>
                <Text style={{ color: theme.textTertiary }}>@{githubUser.login}</Text>

                {githubUser.bio && (
                  <Text style={{ color: theme.textTertiary, textAlign: 'center', marginTop: 8, paddingHorizontal: 16 }}>
                    {githubUser.bio}
                  </Text>
                )}

                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, backgroundColor: theme.success + '33', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 }}>
                  <Check size={16} color={theme.success} />
                  <Text style={{ color: theme.success, marginLeft: 8, fontWeight: '500' }}>
                    Connected
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => Linking.openURL(`https://github.com/${githubUser.login}`)}
                  style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}
                >
                  <ExternalLink size={14} color={theme.textTertiary} />
                  <Text style={{ color: theme.textTertiary, marginLeft: 4, fontSize: 14 }}>View on GitHub</Text>
                </TouchableOpacity>
              </View>
            </Card>

            {/* Quick Actions */}
            <View style={{ gap: 12, marginBottom: 24 }}>
              <Card
                padding="md"
                onPress={() => router.push('/github/repos')}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 40, height: 40, backgroundColor: theme.backgroundSecondary, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                      <Github size={20} color={theme.textTertiary} />
                    </View>
                    <Text style={{ color: theme.text, fontWeight: '500' }}>
                      Browse Repositories
                    </Text>
                  </View>
                </View>
              </Card>

              <Card
                padding="md"
                onPress={() => router.push('/github/create-repo')}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 40, height: 40, backgroundColor: theme.backgroundSecondary, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                      <Github size={20} color={theme.textTertiary} />
                    </View>
                    <Text style={{ color: theme.text, fontWeight: '500' }}>
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
            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              <View style={{ width: 64, height: 64, backgroundColor: theme.backgroundSecondary, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Github size={32} color={theme.textSecondary} />
              </View>
              <Text style={{ color: theme.text, fontSize: 20, fontWeight: '600', textAlign: 'center' }}>
                Connect GitHub
              </Text>
              <Text style={{ color: theme.textTertiary, textAlign: 'center', marginTop: 8 }}>
                Link your GitHub account to access your repositories
              </Text>
            </View>

            <View style={{ gap: 16, marginBottom: 24 }}>
              {[
                'Browse and clone your repositories',
                'Create new repos from mobile',
                'View commit history and branches',
                'Manage pull requests on the go',
              ].map((benefit, index) => (
                <View key={index} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Check size={20} color={theme.success} />
                  <Text style={{ color: theme.textSecondary, marginLeft: 12 }}>{benefit}</Text>
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
