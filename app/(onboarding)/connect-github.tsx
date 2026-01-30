import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { alert } from '@/components/ui/AlertModal';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Github, CheckCircle, ExternalLink, ArrowRight } from 'lucide-react-native';
import { authService } from '@/services/auth.service';
import * as WebBrowser from 'expo-web-browser';
import { colors } from '@/theme/colors';

export default function ConnectGitHubScreen() {
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
      <SafeAreaView className="flex-1 bg-dark-800">
        <View className="flex-1 px-6 items-center justify-center">
          <View
            className="w-24 h-24 rounded-full items-center justify-center mb-6"
            style={{
              backgroundColor: colors.success[500] + '20',
              shadowColor: colors.success[500],
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.3,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            <CheckCircle size={56} color={colors.success[500]} />
          </View>

          <Text className="text-2xl font-bold text-dark-50 text-center mb-4">
            GitHub Connected!
          </Text>

          <Text className="text-dark-200 text-center text-base mb-8">
            You can now access your repositories and manage your code from ForkOff
          </Text>

          <TouchableOpacity
            onPress={() => router.replace('/(tabs)')}
            className="bg-primary-500 rounded-xl p-4 w-full flex-row items-center justify-center gap-2"
            style={{
              shadowColor: colors.primary[500],
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.2,
              shadowRadius: 12,
              elevation: 5,
            }}
          >
            <Text className="text-white font-bold text-base">Get Started</Text>
            <ArrowRight size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-dark-800">
      <View className="flex-1 px-6 pt-4 pb-8">
        {/* Header */}
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center mb-6"
        >
          <ArrowLeft size={24} color={colors.dark[200]} />
          <Text className="text-dark-200 ml-2 font-medium">Back</Text>
        </TouchableOpacity>

        <Text className="text-3xl font-bold text-dark-50 mb-2">
          Connect GitHub
        </Text>
        <Text className="text-base text-dark-200 mb-8">
          Link your GitHub account to access repositories
        </Text>

        {/* Benefits */}
        <View className="flex-1">
          <View className="bg-dark-700 border border-dark-500 rounded-xl p-6">
            <View className="items-center mb-6">
              <View className="w-16 h-16 bg-dark-800 border border-dark-500 rounded-full items-center justify-center mb-4">
                <Github size={32} color={colors.dark[200]} />
              </View>
              <Text className="text-dark-50 text-xl font-bold text-center">
                GitHub Integration
              </Text>
            </View>

            <View className="gap-4">
              {[
                'Browse and clone your repositories',
                'Create new repos from mobile',
                'View commit history and branches',
                'Manage pull requests on the go',
              ].map((benefit, index) => (
                <View key={index} className="flex-row items-center">
                  <CheckCircle size={20} color={colors.success[500]} />
                  <Text className="text-dark-200 ml-3">{benefit}</Text>
                </View>
              ))}
            </View>
          </View>

          <View className="mt-6 bg-dark-700 border border-dark-500 rounded-xl p-4 flex-row items-center">
            <ExternalLink size={20} color={colors.dark[300]} />
            <Text className="text-dark-300 ml-3 flex-1 text-sm">
              You'll be redirected to GitHub to authorize ForkOff
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View className="gap-4">
          <TouchableOpacity
            onPress={handleConnectGitHub}
            disabled={isConnecting}
            className="bg-primary-500 rounded-xl p-4 flex-row items-center justify-center gap-3"
            style={{
              shadowColor: colors.primary[500],
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.2,
              shadowRadius: 12,
              elevation: 5,
              opacity: isConnecting ? 0.7 : 1,
            }}
          >
            <Github size={20} color="#fff" />
            <Text className="text-white font-bold text-base">
              {isConnecting ? 'Connecting...' : 'Connect GitHub'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.replace('/(tabs)')}
            className="p-4 items-center"
          >
            <Text className="text-dark-300 font-medium">Skip for now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
