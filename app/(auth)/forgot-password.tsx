import { useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { alert } from '@/components/ui/AlertModal';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react-native';
import { Button, Input } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { colors } from '@/theme/colors';

export default function ForgotPasswordScreen() {
  const { resetPassword, isLoading, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isEmailSent, setIsEmailSent] = useState(false);

  const validateEmail = () => {
    if (!email.trim()) {
      setEmailError('Email is required');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Please enter a valid email');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleResetPassword = async () => {
    clearError();

    if (!validateEmail()) {
      return;
    }

    const result = await resetPassword(email);

    if (result.success) {
      setIsEmailSent(true);
    } else {
      alert.error('Error', result.error || 'Failed to send reset email');
    }
  };

  if (isEmailSent) {
    return (
      <SafeAreaView className="flex-1 bg-dark-900">
        <View className="flex-1 px-6 pt-12 pb-8 items-center justify-center">
          <View className="bg-success-500/20 w-20 h-20 rounded-full items-center justify-center mb-6">
            <CheckCircle size={48} color={colors.success[500]} />
          </View>

          <Text className="text-2xl font-bold text-white text-center mb-4">
            Check your email
          </Text>

          <Text className="text-dark-400 text-center text-lg mb-8 px-4">
            We've sent a password reset link to{'\n'}
            <Text className="text-white font-medium">{email}</Text>
          </Text>

          <Button
            title="Back to Login"
            variant="outline"
            onPress={() => router.replace('/(auth)/login')}
            fullWidth
          />

          <TouchableOpacity
            onPress={() => setIsEmailSent(false)}
            className="mt-6"
          >
            <Text className="text-primary-400">
              Didn't receive email? Try again
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-dark-900">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 px-6 pt-4 pb-8">
            {/* Back Button */}
            <TouchableOpacity
              onPress={() => router.back()}
              className="flex-row items-center mb-8"
            >
              <ArrowLeft size={24} color={colors.dark[300]} />
              <Text className="text-dark-300 ml-2">Back</Text>
            </TouchableOpacity>

            {/* Header */}
            <View className="mb-10">
              <Text className="text-4xl font-bold text-white mb-2">
                Reset password
              </Text>
              <Text className="text-lg text-dark-400">
                Enter your email and we'll send you a link to reset your password
              </Text>
            </View>

            {/* Form */}
            <View className="mb-8">
              <Input
                label="Email"
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (emailError) setEmailError('');
                }}
                error={emailError}
                leftIcon={<Mail size={20} color={colors.dark[400]} />}
              />

              <Button
                title="Send Reset Link"
                onPress={handleResetPassword}
                loading={isLoading}
                fullWidth
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
