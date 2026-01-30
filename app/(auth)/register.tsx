import { useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { alert } from '@/components/ui/AlertModal';
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, User, ArrowRight } from 'lucide-react-native';
import { useAuthStore } from '@/stores/auth.store';
import { colors } from '@/theme/colors';

export default function RegisterScreen() {
  const { signUpWithOtp, isLoading, clearError } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
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
    } catch (error) {
      alert.error(
        'Registration Failed',
        error instanceof Error ? error.message : 'Please try again'
      );
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
                  {isLoading ? 'Creating...' : 'Continue'}
                </Text>
                {!isLoading && <ArrowRight size={18} color="#fff" />}
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
