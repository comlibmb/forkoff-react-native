import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import { alert } from '@/components/ui/AlertModal';
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, ArrowRight } from 'lucide-react-native';
import { useAuthStore } from '@/stores/auth.store';
import { useTheme } from '@/theme/ThemeProvider';

export default function LoginScreen() {
  const { theme } = useTheme();
  const { signInWithOtp, signInWithGoogle, signInWithApple, signOut, isLoading, error, clearError, isAuthenticated, user, checkDeviceForLogin, registerDeviceFingerprint } = useAuthStore();
  const [email, setEmail] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [isCheckingDevice, setIsCheckingDevice] = useState(false);
  // Ref to suppress reactive navigation while a post-OAuth device check is running
  const oauthDeviceCheckRef = useRef(false);

  // Reactive navigation: when auth state changes (e.g. OAuth completes),
  // navigate away regardless of whether the async handler finished
  useEffect(() => {
    if (oauthDeviceCheckRef.current) return; // Suppress during post-OAuth device check
    if (isAuthenticated && user) {
      const isNewUser = !user.username;
      router.replace(isNewUser ? '/(onboarding)' : '/(tabs)');
    }
  }, [isAuthenticated, user]);
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

    // Check device fingerprint before sending OTP
    setIsCheckingDevice(true);
    try {
      const deviceCheck = await checkDeviceForLogin(email);
      if (!deviceCheck.allowed) {
        setIsCheckingDevice(false);
        alert.warning('Device Restricted', deviceCheck.message || 'This device is linked to another account.');
        return;
      }
    } catch {
      // Fail open — continue with login
    }
    setIsCheckingDevice(false);

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

  const handleGoogleLogin = async () => {
    try {
      setIsGoogleLoading(true);
      clearError();
      oauthDeviceCheckRef.current = true; // Suppress reactive navigation
      const user = await signInWithGoogle();

      // Post-auth device check — if device belongs to different account, sign out
      const deviceCheck = await checkDeviceForLogin(user.email);
      if (!deviceCheck.allowed) {
        await signOut();
        oauthDeviceCheckRef.current = false;
        alert.warning('Device Restricted', deviceCheck.message || 'This device is linked to another account.');
        return;
      }

      oauthDeviceCheckRef.current = false;
      // Register fingerprint on login so this device is bound to this account
      registerDeviceFingerprint().catch(() => {});
      const isNewUser = !user.username;
      router.replace(isNewUser ? '/(onboarding)' : '/(tabs)');
    } catch (err) {
      oauthDeviceCheckRef.current = false;
      if (err instanceof Error && err.message === 'Google sign in was cancelled') return;
      alert.error('Google Sign In Failed', error || 'Please try again');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    try {
      setIsAppleLoading(true);
      clearError();
      oauthDeviceCheckRef.current = true; // Suppress reactive navigation
      const user = await signInWithApple();

      // Post-auth device check — if device belongs to different account, sign out
      const deviceCheck = await checkDeviceForLogin(user.email);
      if (!deviceCheck.allowed) {
        await signOut();
        oauthDeviceCheckRef.current = false;
        alert.warning('Device Restricted', deviceCheck.message || 'This device is linked to another account.');
        return;
      }

      oauthDeviceCheckRef.current = false;
      // Register fingerprint on login so this device is bound to this account
      registerDeviceFingerprint().catch(() => {});
      const isNewUser = !user.username;
      router.replace(isNewUser ? '/(onboarding)' : '/(tabs)');
    } catch (err) {
      oauthDeviceCheckRef.current = false;
      if (err instanceof Error && err.message.includes('cancelled')) return;
      const msg = err instanceof Error ? err.message : 'Please try again';
      alert.error('Apple Sign In Failed', msg);
    } finally {
      setIsAppleLoading(false);
    }
  };

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
          <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 48, paddingBottom: 32 }}>
            {/* Logo/Brand */}
            <View style={{ alignItems: 'center', marginBottom: 32 }}>
              <View
                style={{
                  width: 80,
                  height: 80,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                  overflow: 'visible',
                }}
              >
                <Image
                  source={require('@/assets/logo.png')}
                  style={{ width: 187, height: 187 }}
                  resizeMode="contain"
                />
              </View>
            </View>

            {/* Header */}
            <View style={{ marginBottom: 32 }}>
              <Text style={{ fontSize: 30, fontWeight: 'bold', color: theme.text, marginBottom: 8, textAlign: 'center' }}>
                Welcome back
              </Text>
              <Text style={{ fontSize: 16, color: theme.textSecondary, textAlign: 'center' }}>
                Sign in to continue to ForkOff
              </Text>
            </View>

            {/* Form */}
            <View style={{ marginBottom: 24 }}>
              {/* Email Input */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                  Email
                </Text>
                <View style={{ position: 'relative' }}>
                  <View style={{ position: 'absolute', left: 16, top: '50%', transform: [{ translateY: -9 }], zIndex: 10 }}>
                    <Mail size={18} color={theme.textTertiary} />
                  </View>
                  <TextInput
                    placeholder="Enter your email"
                    placeholderTextColor={theme.textTertiary}
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
                    style={{
                      backgroundColor: theme.backgroundSecondary,
                      borderWidth: 1,
                      borderColor: validationErrors.email ? theme.error : theme.border,
                      borderRadius: 12,
                      paddingLeft: 48,
                      paddingRight: 16,
                      paddingVertical: 16,
                      color: theme.text,
                      fontSize: 16,
                    }}
                  />
                </View>
                {validationErrors.email && (
                  <Text style={{ color: theme.error, fontSize: 12, marginTop: 6 }}>{validationErrors.email}</Text>
                )}
              </View>

              {/* Info Text */}
              <View style={{ backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 16, marginBottom: 24 }}>
                <Text style={{ color: theme.textSecondary, fontSize: 14, textAlign: 'center' }}>
                  We'll send you a 6-digit code to sign in securely.{'\n'}No password needed!
                </Text>
              </View>

              {/* Continue Button */}
              <TouchableOpacity
                onPress={handleLogin}
                disabled={isLoading || isCheckingDevice}
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
                  opacity: isLoading || isCheckingDevice ? 0.7 : 1,
                }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                  {isCheckingDevice ? 'Checking...' : isLoading ? 'Sending...' : 'Continue'}
                </Text>
                {!isLoading && !isCheckingDevice && <ArrowRight size={18} color="#fff" />}
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
              <Text style={{ paddingHorizontal: 16, color: theme.textTertiary, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>or continue with</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
            </View>

            {/* Social Login */}
            <View style={{ gap: 12 }}>
              <TouchableOpacity
                onPress={handleGoogleLogin}
                disabled={isGoogleLoading || isAppleLoading || isLoading}
                style={{
                  backgroundColor: theme.backgroundSecondary,
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 12,
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  opacity: isGoogleLoading || isAppleLoading || isLoading ? 0.7 : 1,
                }}
              >
                {isGoogleLoading ? (
                  <ActivityIndicator size="small" color={theme.text} />
                ) : (
                  <Text style={{ fontSize: 18, fontWeight: 'bold' }}>G</Text>
                )}
                <Text style={{ color: theme.text, fontWeight: '500' }}>
                  {isGoogleLoading ? 'Connecting...' : 'Continue with Google'}
                </Text>
              </TouchableOpacity>

              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  onPress={handleAppleLogin}
                  disabled={isAppleLoading || isGoogleLoading || isLoading}
                  style={{
                    backgroundColor: theme.text,
                    borderRadius: 12,
                    padding: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 12,
                    opacity: isAppleLoading || isGoogleLoading || isLoading ? 0.7 : 1,
                  }}
                >
                  {isAppleLoading ? (
                    <ActivityIndicator size="small" color={theme.background} />
                  ) : (
                    <Text style={{ fontSize: 20, color: theme.background }}>&#xF8FF;</Text>
                  )}
                  <Text style={{ color: theme.background, fontWeight: '500' }}>
                    {isAppleLoading ? 'Connecting...' : 'Continue with Apple'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Footer */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 'auto', paddingTop: 32 }}>
              <Text style={{ color: theme.textTertiary }}>Don't have an account? </Text>
              <Link href="/(auth)/register" asChild>
                <TouchableOpacity>
                  <Text style={{ color: theme.primary, fontWeight: 'bold' }}>Sign up</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
