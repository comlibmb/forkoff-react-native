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
import { Mail, User, ArrowRight, Github } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { useAuthStore } from '@/stores/auth.store';
import { colors } from '@/theme/colors';

WebBrowser.maybeCompleteAuthSession();

export default function RegisterScreen() {
  const { signUpWithOtp, signInWithGitHub, isLoading, error, clearError } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isGitHubLoading, setIsGitHubLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    name?: string;
    email?: string;
  }>({});

  const validateForm = () => {
    const errors: {
      name?: string;
      email?: string;
    } = {};

    if (!name.trim()) {
      errors.name = 'Name is required';
    }

    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Please enter a valid email';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegister = async () => {
    clearError();

    if (!validateForm()) {
      return;
    }

    try {
      await signUpWithOtp(email, name);
      router.push('/(auth)/verify-otp');
    } catch (err) {
      alert.error(
        'Registration Failed',
        err instanceof Error ? err.message : 'Please try again'
      );
    }
  };

  const handleGitHubSignUp = async () => {
    try {
      setIsGitHubLoading(true);
      clearError();

      const { url } = await signInWithGitHub();

      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'forkoff',
        preferLocalhost: false,
      });

      console.log('[Register] Opening GitHub OAuth with redirect:', redirectUri);

      const result = await WebBrowser.openAuthSessionAsync(url, redirectUri);

      console.log('[Register] OAuth result:', result.type);

      if (result.type === 'success' && result.url) {
        console.log('[Register] OAuth success, URL:', result.url);
        router.replace('/auth/callback');
      } else if (result.type === 'cancel') {
        console.log('[Register] GitHub auth cancelled by user');
      }
    } catch (err) {
      console.error('[Register] GitHub auth error:', err);
      alert.error(
        'GitHub Sign Up Failed',
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
                Create account
              </Text>
              <Text className="text-base text-dark-200 text-center">
                Join ForkOff to control your AI tools
              </Text>
            </View>

            {/* Form */}
            <View className="mb-6">
              {/* Name Input */}
              <View className="mb-4">
                <Text className="text-dark-200 text-xs font-bold uppercase tracking-wider mb-2">
                  Name
                </Text>
                <View className="relative">
                  <View className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                    <User size={18} color={colors.dark[300]} />
                  </View>
                  <TextInput
                    placeholder="Enter your name"
                    placeholderTextColor={colors.dark[300]}
                    autoCapitalize="words"
                    autoComplete="name"
                    value={name}
                    onChangeText={(text) => {
                      setName(text);
                      if (validationErrors.name) {
                        setValidationErrors((prev) => ({ ...prev, name: undefined }));
                      }
                    }}
                    className={`bg-dark-700 border rounded-xl pl-12 pr-4 py-4 text-dark-50 ${
                      validationErrors.name ? 'border-error-300' : 'border-dark-500'
                    }`}
                  />
                </View>
                {validationErrors.name && (
                  <Text className="text-error-300 text-xs mt-1.5">{validationErrors.name}</Text>
                )}
              </View>

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
                  We'll send you a 6-digit verification code to confirm your email address.{'\n'}No password required!
                </Text>
              </View>

              {/* Terms */}
              <Text className="text-dark-300 text-center text-xs mb-6">
                By creating an account, you agree to our{' '}
                <Text className="text-primary-500">Terms of Service</Text> and{' '}
                <Text className="text-primary-500">Privacy Policy</Text>
              </Text>

              {/* Continue Button */}
              <TouchableOpacity
                onPress={handleRegister}
                disabled={isLoading || isGitHubLoading}
                className="bg-primary-500 rounded-xl p-4 flex-row items-center justify-center gap-2"
                style={{
                  shadowColor: colors.primary[500],
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.2,
                  shadowRadius: 12,
                  elevation: 5,
                  opacity: isLoading || isGitHubLoading ? 0.7 : 1,
                }}
              >
                <Text className="text-white font-bold text-base">
                  {isLoading ? 'Creating...' : 'Continue'}
                </Text>
                {!isLoading && <ArrowRight size={18} color="#fff" />}
              </TouchableOpacity>

              {/* Divider */}
              <View className="flex-row items-center my-6">
                <View className="flex-1 h-px bg-dark-500" />
                <Text className="px-4 text-dark-300 text-xs uppercase tracking-wider">or</Text>
                <View className="flex-1 h-px bg-dark-500" />
              </View>

              {/* GitHub Sign Up */}
              <TouchableOpacity
                onPress={handleGitHubSignUp}
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
                  {isGitHubLoading ? 'Connecting...' : 'Sign up with GitHub'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View className="flex-row justify-center mt-auto pt-8">
              <Text className="text-dark-300">Already have an account? </Text>
              <Link href="/(auth)/login" asChild>
                <TouchableOpacity>
                  <Text className="text-primary-500 font-bold">Sign in</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
