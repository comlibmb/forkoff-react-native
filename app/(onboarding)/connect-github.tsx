import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { alert } from '@/components/ui/AlertModal';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Github, CheckCircle, ExternalLink, ArrowRight } from 'lucide-react-native';
import { authService } from '@/services/auth.service';
import * as WebBrowser from 'expo-web-browser';
import { useTheme } from '@/theme/ThemeProvider';

export default function ConnectGitHubScreen() {
  const { theme } = useTheme();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const handleConnectGitHub = async () => {
    setIsConnecting(true);

    try {
      const { url } = await authService.signInWithGitHub();

      const result = await WebBrowser.openAuthSessionAsync(url, 'forkoff://auth/callback');

      if (result.type === 'success') {
        setIsConnected(true);
      }
    } catch (error) {
      alert.error('Error', 'Failed to connect GitHub. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  if (isConnected) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <View style={{ flex: 1, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' }}>
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
              backgroundColor: theme.success + '20',
              shadowColor: theme.success,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.3,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            <CheckCircle size={56} color={theme.success} />
          </View>

          <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.text, textAlign: 'center', marginBottom: 16 }}>
            GitHub Connected!
          </Text>

          <Text style={{ color: theme.textSecondary, textAlign: 'center', fontSize: 16, marginBottom: 32 }}>
            You can now access your repositories and manage your code from ForkOff
          </Text>

          <TouchableOpacity
            onPress={() => router.replace('/(tabs)')}
            style={{
              backgroundColor: theme.primary,
              borderRadius: 12,
              padding: 16,
              width: '100%',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              shadowColor: theme.primary,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.2,
              shadowRadius: 12,
              elevation: 5,
            }}
          >
            <Text style={{ color: theme.textInverse, fontWeight: 'bold', fontSize: 16 }}>Get Started</Text>
            <ArrowRight size={18} color={theme.textInverse} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32 }}>
        {/* Header */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}
        >
          <ArrowLeft size={24} color={theme.textSecondary} />
          <Text style={{ color: theme.textSecondary, marginLeft: 8, fontWeight: '500' }}>Back</Text>
        </TouchableOpacity>

        <Text style={{ fontSize: 30, fontWeight: 'bold', color: theme.text, marginBottom: 8 }}>
          Connect GitHub
        </Text>
        <Text style={{ fontSize: 16, color: theme.textSecondary, marginBottom: 32 }}>
          Link your GitHub account to access repositories
        </Text>

        {/* Benefits */}
        <View style={{ flex: 1 }}>
          <View style={{ backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 24 }}>
            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  backgroundColor: theme.background,
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 32,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}
              >
                <Github size={32} color={theme.textSecondary} />
              </View>
              <Text style={{ color: theme.text, fontSize: 20, fontWeight: 'bold', textAlign: 'center' }}>
                GitHub Integration
              </Text>
            </View>

            <View style={{ gap: 16 }}>
              {[
                'Browse and clone your repositories',
                'Create new repos from mobile',
                'View commit history and branches',
                'Manage pull requests on the go',
              ].map((benefit, index) => (
                <View key={index} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <CheckCircle size={20} color={theme.success} />
                  <Text style={{ color: theme.textSecondary, marginLeft: 12 }}>{benefit}</Text>
                </View>
              ))}
            </View>
          </View>

          <View
            style={{
              marginTop: 24,
              backgroundColor: theme.backgroundSecondary,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 12,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <ExternalLink size={20} color={theme.textTertiary} />
            <Text style={{ color: theme.textTertiary, marginLeft: 12, flex: 1, fontSize: 14 }}>
              You'll be redirected to GitHub to authorize ForkOff
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={{ gap: 16 }}>
          <TouchableOpacity
            onPress={handleConnectGitHub}
            disabled={isConnecting}
            style={{
              backgroundColor: theme.primary,
              borderRadius: 12,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              shadowColor: theme.primary,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.2,
              shadowRadius: 12,
              elevation: 5,
              opacity: isConnecting ? 0.7 : 1,
            }}
          >
            <Github size={20} color={theme.textInverse} />
            <Text style={{ color: theme.textInverse, fontWeight: 'bold', fontSize: 16 }}>
              {isConnecting ? 'Connecting...' : 'Connect GitHub'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.replace('/(tabs)')}
            style={{ padding: 16, alignItems: 'center' }}
          >
            <Text style={{ color: theme.textTertiary, fontWeight: '500' }}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
