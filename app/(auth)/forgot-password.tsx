import { useState, useRef, useEffect } from 'react';
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
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, ArrowLeft, CheckCircle, Lock, Eye, EyeOff } from 'lucide-react-native';
import { Button, Input } from '@/components/ui';
import { authService } from '@/services/auth.service';
import { colors } from '@/theme/colors';

type Step = 'email' | 'otp' | 'password' | 'success';

export default function ForgotPasswordScreen() {
  const [step, setStep] = useState<Step>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const otpRefs = useRef<(TextInput | null)[]>([]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

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

  const validatePassword = () => {
    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return false;
    }
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handleSendOtp = async () => {
    if (!validateEmail()) return;

    setIsLoading(true);
    try {
      await authService.signInWithOtp(email);
      setStep('otp');
      setResendCooldown(60);
    } catch (error) {
      alert.error('Error', error instanceof Error ? error.message : 'Failed to send code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;

    setIsLoading(true);
    try {
      await authService.resendOtp(email);
      setResendCooldown(60);
      alert.success('Code Sent', 'A new verification code has been sent to your email');
    } catch (error) {
      alert.error('Error', error instanceof Error ? error.message : 'Failed to resend code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    if (value.length > 1) {
      // Handle paste
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      const newOtp = [...otp];
      digits.forEach((digit, i) => {
        if (index + i < 6) {
          newOtp[index + i] = digit;
        }
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + digits.length, 5);
      otpRefs.current[nextIndex]?.focus();
    } else {
      const newOtp = [...otp];
      newOtp[index] = value.replace(/\D/g, '');
      setOtp(newOtp);

      if (value && index < 5) {
        otpRefs.current[index + 1]?.focus();
      }
    }
    setOtpError('');
  };

  const handleOtpKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setOtpError('Please enter the complete 6-digit code');
      return;
    }

    setIsLoading(true);
    try {
      await authService.verifyOtp(email, otpCode);
      setStep('password');
    } catch (error) {
      setOtpError(error instanceof Error ? error.message : 'Invalid code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetPassword = async () => {
    if (!validatePassword()) return;

    setIsLoading(true);
    try {
      await authService.updatePassword(password);
      setStep('success');
    } catch (error) {
      alert.error('Error', error instanceof Error ? error.message : 'Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  // Success Screen
  if (step === 'success') {
    return (
      <SafeAreaView className="flex-1 bg-dark-900">
        <View className="flex-1 px-6 pt-12 pb-8 items-center justify-center">
          <View className="bg-success-500/20 w-20 h-20 rounded-full items-center justify-center mb-6">
            <CheckCircle size={48} color={colors.success[500]} />
          </View>

          <Text className="text-2xl font-bold text-white text-center mb-4">
            Password Updated!
          </Text>

          <Text className="text-dark-400 text-center text-lg mb-8 px-4">
            Your password has been successfully updated. You can now sign in with your new password.
          </Text>

          <Button
            title="Back to Login"
            onPress={() => router.replace('/(auth)/login')}
            fullWidth
          />
        </View>
      </SafeAreaView>
    );
  }

  // OTP Verification Screen
  if (step === 'otp') {
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
              <TouchableOpacity
                onPress={() => setStep('email')}
                className="flex-row items-center mb-8"
              >
                <ArrowLeft size={24} color={colors.dark[300]} />
                <Text className="text-dark-300 ml-2">Back</Text>
              </TouchableOpacity>

              <View className="mb-10">
                <Text className="text-4xl font-bold text-white mb-2">
                  Enter code
                </Text>
                <Text className="text-lg text-dark-400">
                  We sent a 6-digit code to{'\n'}
                  <Text className="text-white">{email}</Text>
                </Text>
              </View>

              {/* OTP Input */}
              <View className="flex-row justify-between mb-4">
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => (otpRefs.current[index] = ref)}
                    value={digit}
                    onChangeText={(value) => handleOtpChange(value, index)}
                    onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, index)}
                    keyboardType="number-pad"
                    maxLength={6}
                    className={`w-12 h-14 bg-dark-800 border ${
                      otpError ? 'border-error-500' : 'border-dark-700'
                    } rounded-xl text-white text-2xl text-center font-bold`}
                    selectionColor={colors.primary[500]}
                  />
                ))}
              </View>

              {otpError ? (
                <Text className="text-error-500 text-sm mb-4">{otpError}</Text>
              ) : null}

              <Button
                title="Verify Code"
                onPress={handleVerifyOtp}
                loading={isLoading}
                fullWidth
              />

              <TouchableOpacity
                onPress={handleResendOtp}
                disabled={resendCooldown > 0}
                className="mt-6 items-center"
              >
                <Text className={resendCooldown > 0 ? 'text-dark-500' : 'text-primary-400'}>
                  {resendCooldown > 0
                    ? `Resend code in ${resendCooldown}s`
                    : "Didn't receive code? Resend"}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // New Password Screen
  if (step === 'password') {
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
              <View className="mb-10 mt-8">
                <Text className="text-4xl font-bold text-white mb-2">
                  New password
                </Text>
                <Text className="text-lg text-dark-400">
                  Create a new password for your account
                </Text>
              </View>

              <View className="mb-8">
                <Input
                  label="New Password"
                  placeholder="Enter new password"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (passwordError) setPasswordError('');
                  }}
                  leftIcon={<Lock size={20} color={colors.dark[400]} />}
                  rightIcon={
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                      {showPassword ? (
                        <EyeOff size={20} color={colors.dark[400]} />
                      ) : (
                        <Eye size={20} color={colors.dark[400]} />
                      )}
                    </TouchableOpacity>
                  }
                />

                <Input
                  label="Confirm Password"
                  placeholder="Confirm new password"
                  secureTextEntry={!showPassword}
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    if (passwordError) setPasswordError('');
                  }}
                  error={passwordError}
                  leftIcon={<Lock size={20} color={colors.dark[400]} />}
                />

                <Button
                  title="Update Password"
                  onPress={handleSetPassword}
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

  // Email Input Screen (default)
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
            <TouchableOpacity
              onPress={() => router.back()}
              className="flex-row items-center mb-8"
            >
              <ArrowLeft size={24} color={colors.dark[300]} />
              <Text className="text-dark-300 ml-2">Back</Text>
            </TouchableOpacity>

            <View className="mb-10">
              <Text className="text-4xl font-bold text-white mb-2">
                Reset password
              </Text>
              <Text className="text-lg text-dark-400">
                Enter your email and we'll send you a 6-digit code to verify your identity
              </Text>
            </View>

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
                title="Send Code"
                onPress={handleSendOtp}
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
