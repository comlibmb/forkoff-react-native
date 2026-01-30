import { useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { alert } from '@/components/ui/AlertModal';
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Github, ArrowRight } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { useAuthStore } from '@/stores/auth.store';
import { colors } from '@/theme/colors';

// Warm up the browser for faster OAuth flow
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { signInWithOtp, signInWithGitHub, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [isGitHubLoading, setIsGitHubLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    email?: string;
  }>({});

  const validateForm = () => {
    const errors: { email?: string } = {};

    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Please enter a valid email';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async () => {
    clearError();

    if (!validateForm()) {
      return;
    }

    try {
      await signInWithOtp(email);
      router.push('/(auth)/verify-otp');
    } catch (err) {
      alert.error(
        'Sign In Failed',
        error || 'Please try again'
      );
    }
  };

  const handleGitHubLogin = async () => {
    try {
      setIsGitHubLoading(true);
      clearError();

      const { url } = await signInWithGitHub();

      // Get the redirect URI that matches what we sent to Supabase
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'forkoff',
        preferLocalhost: false,
      });

      console.log('[Login] Opening GitHub OAuth with redirect:', redirectUri);

      // Open the OAuth URL in a browser
      const result = await WebBrowser.openAuthSessionAsync(url, redirectUri);

      console.log('[Login] OAuth result:', result.type);

      if (result.type === 'success' && result.url) {
        // Extract the URL and navigate to callback handler
        console.log('[Login] OAuth success, URL:', result.url);
        router.replace('/auth/callback');
      } else if (result.type === 'cancel') {
        console.log('[Login] GitHub auth cancelled by user');
      }
    } catch (err) {
      console.error('[Login] GitHub auth error:', err);
      alert.error(
        'GitHub Sign In Failed',
        error || 'Please try again'
      );
    } finally {
      setIsGitHubLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-dark-800">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 px-6 pt-12 pb-8">
            {/* Logo/Brand */}
            <View className="items-center mb-8">
              <View
                className="w-16 h-16 rounded-2xl items-center justify-center mb-4"
                style={{
                  backgroundColor: colors.primary[500],
                  shadowColor: colors.primary[500],
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.3,
                  shadowRadius: 20,
                  elevation: 10,
                }}
              >
                <Text className="text-white text-3xl font-bold">F</Text>
              </View>
            </View>

            {/* Header */}
            <View className="mb-8">
              <Text className="text-3xl font-bold text-dark-50 mb-2 text-center">
                Welcome back
              </Text>
              <Text className="text-base text-dark-200 text-center">
                Sign in to continue to ForkOff
              </Text>
            </View>

            {/* Form */}
            <View className="mb-6">
              {/* Email Input */}
              <View className="mb-4">
                <Text className="text-dark-200 text-xs font-bold uppercase tracking-wider mb-2">
                  Email
                </Text>
                <View className="relative">
                  <View className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                    <Mail size={18} color={colors.dark[300]} />
                  </View>
                  <TextInput
                    placeholder="Enter your email"
                    placeholderTextColor={colors.dark[300]}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (validationErrors.email) {
                        setValidationErrors((prev) => ({ ...prev, email: undefined }));
                      }
                    }}
                    className={`bg-dark-700 border rounded-xl pl-12 pr-4 py-4 text-dark-50 ${
                      validationErrors.email ? 'border-error-300' : 'border-dark-500'
                    }`}
                  />
                </View>
                {validationErrors.email && (
                  <Text className="text-error-300 text-xs mt-1.5">{validationErrors.email}</Text>
                )}
              </View>

              {/* Info Text */}
              <View className="bg-dark-700 border border-dark-500 rounded-xl p-4 mb-6">
                <Text className="text-dark-200 text-sm text-center">
                  We'll send you a 6-digit code to sign in securely.{'\n'}No password needed!
                </Text>
              </View>

              {/* Continue Button */}
              <TouchableOpacity
                onPress={handleLogin}
                disabled={isLoading}
                className="bg-primary-500 rounded-xl p-4 flex-row items-center justify-center gap-2"
                style={{
                  shadowColor: colors.primary[500],
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.2,
                  shadowRadius: 12,
                  elevation: 5,
                  opacity: isLoading ? 0.7 : 1,
                }}
              >
                <Text className="text-white font-bold text-base">
                  {isLoading ? 'Sending...' : 'Continue'}
                </Text>
                {!isLoading && <ArrowRight size={18} color="#fff" />}
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View className="flex-row items-center mb-6">
              <View className="flex-1 h-px bg-dark-500" />
              <Text className="px-4 text-dark-300 text-xs uppercase tracking-wider">or continue with</Text>
              <View className="flex-1 h-px bg-dark-500" />
            </View>

            {/* Social Login */}
            <TouchableOpacity
              onPress={handleGitHubLogin}
              disabled={isGitHubLoading || isLoading}
              className="bg-dark-700 border border-dark-500 rounded-xl p-4 flex-row items-center justify-center gap-3"
              style={{ opacity: isGitHubLoading || isLoading ? 0.7 : 1 }}
            >
              {isGitHubLoading ? (
                <ActivityIndicator size="small" color={colors.dark[50]} />
              ) : (
                <Github size={20} color={colors.dark[50]} />
              )}
              <Text className="text-dark-50 font-medium">
                {isGitHubLoading ? 'Connecting...' : 'Continue with GitHub'}
              </Text>
            </TouchableOpacity>

            {/* Footer */}
            <View className="flex-row justify-center mt-auto pt-8">
              <Text className="text-dark-300">Don't have an account? </Text>
              <Link href="/(auth)/register" asChild>
                <TouchableOpacity>
                  <Text className="text-primary-500 font-bold">Sign up</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
