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
import { useTheme } from '@/theme/ThemeProvider';

type Step = 'email' | 'otp' | 'password' | 'success';

export default function ForgotPasswordScreen() {
  const { theme } = useTheme();
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
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 48, paddingBottom: 32, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ backgroundColor: theme.success + '33', width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
            <CheckCircle size={48} color={theme.success} />
          </View>

          <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.text, textAlign: 'center', marginBottom: 16 }}>
            Password Updated!
          </Text>

          <Text style={{ color: theme.textSecondary, textAlign: 'center', fontSize: 18, marginBottom: 32, paddingHorizontal: 16 }}>
            Your password has been successfully updated. You can now sign in with your new password.
          </Text>

          <Button
            title="Back to Login"
            onPress={() => router.replace('/(auth)/login')}
            fullWidth
            theme={theme}
          />
        </View>
      </SafeAreaView>
    );
  }

  // OTP Verification Screen
  if (step === 'otp') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32 }}>
              <TouchableOpacity
                onPress={() => setStep('email')}
                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 32 }}
              >
                <ArrowLeft size={24} color={theme.textTertiary} />
                <Text style={{ color: theme.textTertiary, marginLeft: 8 }}>Back</Text>
              </TouchableOpacity>

              <View style={{ marginBottom: 40 }}>
                <Text style={{ fontSize: 32, fontWeight: 'bold', color: theme.text, marginBottom: 8 }}>
                  Enter code
                </Text>
                <Text style={{ fontSize: 18, color: theme.textSecondary }}>
                  We sent a 6-digit code to{'\n'}
                  <Text style={{ color: theme.text }}>{email}</Text>
                </Text>
              </View>

              {/* OTP Input */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => { otpRefs.current[index] = ref; }}
                    value={digit}
                    onChangeText={(value) => handleOtpChange(value, index)}
                    onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, index)}
                    keyboardType="number-pad"
                    maxLength={6}
                    style={{
                      width: 48,
                      height: 56,
                      backgroundColor: theme.backgroundSecondary,
                      borderWidth: 1,
                      borderColor: otpError ? theme.error : theme.border,
                      borderRadius: 12,
                      color: theme.text,
                      fontSize: 24,
                      textAlign: 'center',
                      fontWeight: 'bold',
                    }}
                    selectionColor={theme.primary}
                  />
                ))}
              </View>

              {otpError ? (
                <Text style={{ color: theme.error, fontSize: 14, marginBottom: 16 }}>{otpError}</Text>
              ) : null}

              <Button
                title="Verify Code"
                onPress={handleVerifyOtp}
                loading={isLoading}
                fullWidth
                theme={theme}
              />

              <TouchableOpacity
                onPress={handleResendOtp}
                disabled={resendCooldown > 0}
                style={{ marginTop: 24, alignItems: 'center' }}
              >
                <Text style={{ color: resendCooldown > 0 ? theme.textTertiary : theme.primary }}>
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
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32 }}>
              <View style={{ marginBottom: 40, marginTop: 32 }}>
                <Text style={{ fontSize: 32, fontWeight: 'bold', color: theme.text, marginBottom: 8 }}>
                  New password
                </Text>
                <Text style={{ fontSize: 18, color: theme.textSecondary }}>
                  Create a new password for your account
                </Text>
              </View>

              <View style={{ marginBottom: 32 }}>
                <Input
                  label="New Password"
                  placeholder="Enter new password"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (passwordError) setPasswordError('');
                  }}
                  leftIcon={<Lock size={20} color={theme.textSecondary} />}
                  rightIcon={
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                      {showPassword ? (
                        <EyeOff size={20} color={theme.textSecondary} />
                      ) : (
                        <Eye size={20} color={theme.textSecondary} />
                      )}
                    </TouchableOpacity>
                  }
                  theme={theme}
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
                  leftIcon={<Lock size={20} color={theme.textSecondary} />}
                  theme={theme}
                />

                <Button
                  title="Update Password"
                  onPress={handleSetPassword}
                  loading={isLoading}
                  fullWidth
                  theme={theme}
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
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32 }}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 32 }}
            >
              <ArrowLeft size={24} color={theme.textTertiary} />
              <Text style={{ color: theme.textTertiary, marginLeft: 8 }}>Back</Text>
            </TouchableOpacity>

            <View style={{ marginBottom: 40 }}>
              <Text style={{ fontSize: 32, fontWeight: 'bold', color: theme.text, marginBottom: 8 }}>
                Reset password
              </Text>
              <Text style={{ fontSize: 18, color: theme.textSecondary }}>
                Enter your email and we'll send you a 6-digit code to verify your identity
              </Text>
            </View>

            <View style={{ marginBottom: 32 }}>
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
                leftIcon={<Mail size={20} color={theme.textSecondary} />}
                theme={theme}
              />

              <Button
                title="Send Code"
                onPress={handleSendOtp}
                loading={isLoading}
                fullWidth
                theme={theme}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
