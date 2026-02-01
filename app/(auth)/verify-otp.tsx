import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { alert } from '@/components/ui/AlertModal';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';
import { useAuthStore } from '@/stores/auth.store';
import { useTheme } from '@/theme/ThemeProvider';

const OTP_LENGTH = 6;

export default function VerifyOtpScreen() {
  const { theme } = useTheme();
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
      alert.warning('Invalid Code', 'Please enter the complete 6-digit code');
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
      alert.error('Verification Failed', error || 'Invalid verification code');
    }
  };

  const handleResend = async () => {
    try {
      await resendOtp();
      setResendTimer(60);
      alert.success('Code Sent', 'A new verification code has been sent to your email');
    } catch (err) {
      alert.error('Error', 'Failed to resend verification code');
    }
  };

  const handleBack = () => {
    clearOtpState();
    router.back();
  };

  const isComplete = otp.join('').length === OTP_LENGTH;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32 }}>
          {/* Back Button */}
          <TouchableOpacity
            onPress={handleBack}
            style={{
              width: 40,
              height: 40,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
              backgroundColor: theme.backgroundSecondary,
              borderWidth: 1,
              borderColor: theme.border,
              marginBottom: 32,
            }}
          >
            <ArrowLeft size={20} color={theme.textSecondary} />
          </TouchableOpacity>

          {/* Header */}
          <View style={{ marginBottom: 40 }}>
            <Text style={{ fontSize: 30, fontWeight: 'bold', color: theme.text, marginBottom: 8 }}>
              Enter verification code
            </Text>
            <Text style={{ fontSize: 16, color: theme.textSecondary }}>
              We've sent a 6-digit code to{'\n'}
              <Text style={{ color: theme.primary }}>{pendingEmail}</Text>
            </Text>
          </View>

          {/* OTP Input */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 }}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => { inputRefs.current[index] = ref; }}
                style={{
                  width: 48,
                  height: 56,
                  borderRadius: 12,
                  textAlign: 'center',
                  fontSize: 24,
                  fontWeight: 'bold',
                  color: theme.text,
                  backgroundColor: digit ? theme.primaryBackground : theme.backgroundSecondary,
                  borderWidth: 2,
                  borderColor: digit ? theme.primary : theme.border,
                }}
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
            <View style={{ backgroundColor: theme.error + '1A', borderWidth: 1, borderColor: theme.error + '33', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <Text style={{ color: theme.error, textAlign: 'center' }}>{error}</Text>
            </View>
          )}

          {/* Verify Button */}
          <TouchableOpacity
            onPress={handleVerify}
            disabled={!isComplete || isLoading}
            style={{
              backgroundColor: theme.primary,
              borderRadius: 12,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              shadowColor: theme.primary,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.2,
              shadowRadius: 12,
              elevation: 5,
              opacity: !isComplete || isLoading ? 0.5 : 1,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
              {isLoading ? 'Verifying...' : 'Verify'}
            </Text>
            {!isLoading && <ArrowRight size={18} color="#fff" />}
          </TouchableOpacity>

          {/* Resend Code */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24 }}>
            <Text style={{ color: theme.textTertiary }}>Didn't receive the code? </Text>
            {resendTimer > 0 ? (
              <Text style={{ color: theme.textSecondary }}>
                Resend in {resendTimer}s
              </Text>
            ) : (
              <TouchableOpacity onPress={handleResend} disabled={isLoading}>
                <Text style={{ color: theme.primary, fontWeight: 'bold' }}>Resend</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Mock mode hint */}
          {__DEV__ && (
            <View style={{ marginTop: 32, backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 16 }}>
              <Text style={{ color: theme.textTertiary, textAlign: 'center', fontSize: 14 }}>
                Development mode: Use code "123456"
              </Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
