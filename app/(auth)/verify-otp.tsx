import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';
import { useAuthStore } from '@/stores/auth.store';
import { colors } from '@/theme/colors';

const OTP_LENGTH = 6;

export default function VerifyOtpScreen() {
  const {
    pendingEmail,
    pendingName,
    isLoading,
    error,
    verifyOtp,
    resendOtp,
    clearOtpState,
    clearError,
  } = useAuthStore();

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [resendTimer, setResendTimer] = useState(60);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Redirect if no pending email
  useEffect(() => {
    if (!pendingEmail) {
      router.replace('/(auth)/login');
    }
  }, [pendingEmail]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleOtpChange = (value: string, index: number) => {
    if (value.length > 1) {
      // Handle paste
      const pastedOtp = value.slice(0, OTP_LENGTH).split('');
      const newOtp = [...otp];
      pastedOtp.forEach((char, i) => {
        if (index + i < OTP_LENGTH) {
          newOtp[index + i] = char;
        }
      });
      setOtp(newOtp);

      // Focus last filled or next empty
      const focusIndex = Math.min(index + pastedOtp.length, OTP_LENGTH - 1);
      inputRefs.current[focusIndex]?.focus();
    } else {
      // Handle single character
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      // Auto-focus next input
      if (value && index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    }

    clearError();
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');

    if (code.length !== OTP_LENGTH) {
      Alert.alert('Invalid Code', 'Please enter the complete 6-digit code');
      return;
    }

    try {
      await verifyOtp(code);

      // Check if this is a new user (signup flow)
      if (pendingName) {
        router.replace('/(onboarding)');
      } else {
        router.replace('/(tabs)');
      }
    } catch (err) {
      Alert.alert('Verification Failed', error || 'Invalid verification code');
    }
  };

  const handleResend = async () => {
    try {
      await resendOtp();
      setResendTimer(60);
      Alert.alert('Code Sent', 'A new verification code has been sent to your email');
    } catch (err) {
      Alert.alert('Error', 'Failed to resend verification code');
    }
  };

  const handleBack = () => {
    clearOtpState();
    router.back();
  };

  const isComplete = otp.join('').length === OTP_LENGTH;

  return (
    <SafeAreaView className="flex-1 bg-dark-800">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 px-6 pt-4 pb-8">
          {/* Back Button */}
          <TouchableOpacity
            onPress={handleBack}
            className="w-10 h-10 items-center justify-center rounded-lg bg-dark-700 border border-dark-500 mb-8"
          >
            <ArrowLeft size={20} color={colors.dark[200]} />
          </TouchableOpacity>

          {/* Header */}
          <View className="mb-10">
            <Text className="text-3xl font-bold text-dark-50 mb-2">
              Enter verification code
            </Text>
            <Text className="text-base text-dark-200">
              We've sent a 6-digit code to{'\n'}
              <Text className="text-primary-500">{pendingEmail}</Text>
            </Text>
          </View>

          {/* OTP Input */}
          <View className="flex-row justify-between mb-8">
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => { inputRefs.current[index] = ref; }}
                className={`w-12 h-14 rounded-xl text-center text-2xl font-bold ${
                  digit
                    ? 'bg-primary-500/10 border-2 border-primary-500 text-dark-50'
                    : 'bg-dark-700 border-2 border-dark-500 text-dark-50'
                }`}
                value={digit}
                onChangeText={(value) => handleOtpChange(value.replace(/[^0-9]/g, ''), index)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                keyboardType="number-pad"
                maxLength={OTP_LENGTH}
                selectTextOnFocus
              />
            ))}
          </View>

          {/* Error Message */}
          {error && (
            <View className="bg-error-300/10 border border-error-300/20 rounded-xl p-4 mb-4">
              <Text className="text-error-300 text-center">{error}</Text>
            </View>
          )}

          {/* Verify Button */}
          <TouchableOpacity
            onPress={handleVerify}
            disabled={!isComplete || isLoading}
            className="bg-primary-500 rounded-xl p-4 flex-row items-center justify-center gap-2"
            style={{
              shadowColor: colors.primary[500],
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.2,
              shadowRadius: 12,
              elevation: 5,
              opacity: !isComplete || isLoading ? 0.5 : 1,
            }}
          >
            <Text className="text-white font-bold text-base">
              {isLoading ? 'Verifying...' : 'Verify'}
            </Text>
            {!isLoading && <ArrowRight size={18} color="#fff" />}
          </TouchableOpacity>

          {/* Resend Code */}
          <View className="flex-row justify-center items-center mt-6">
            <Text className="text-dark-300">Didn't receive the code? </Text>
            {resendTimer > 0 ? (
              <Text className="text-dark-400">
                Resend in {resendTimer}s
              </Text>
            ) : (
              <TouchableOpacity onPress={handleResend} disabled={isLoading}>
                <Text className="text-primary-500 font-bold">Resend</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Mock mode hint */}
          {__DEV__ && (
            <View className="mt-8 bg-dark-700 border border-dark-500 rounded-xl p-4">
              <Text className="text-dark-300 text-center text-sm">
                Development mode: Use code "123456"
              </Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
