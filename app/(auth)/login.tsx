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
import { useTheme } from '@/theme/ThemeProvider';

// Warm up the browser for faster OAuth flow
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { theme } = useTheme();
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
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                  backgroundColor: theme.primary,
                  shadowColor: theme.primary,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.3,
                  shadowRadius: 20,
                  elevation: 10,
                }}
              >
                <Text style={{ color: '#fff', fontSize: 30, fontWeight: 'bold' }}>F</Text>
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
                disabled={isLoading}
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
                  opacity: isLoading ? 0.7 : 1,
                }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                  {isLoading ? 'Sending...' : 'Continue'}
                </Text>
                {!isLoading && <ArrowRight size={18} color="#fff" />}
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
              <Text style={{ paddingHorizontal: 16, color: theme.textTertiary, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>or continue with</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
            </View>

            {/* Social Login */}
            <TouchableOpacity
              onPress={handleGitHubLogin}
              disabled={isGitHubLoading || isLoading}
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
                opacity: isGitHubLoading || isLoading ? 0.7 : 1,
              }}
            >
              {isGitHubLoading ? (
                <ActivityIndicator size="small" color={theme.text} />
              ) : (
                <Github size={20} color={theme.text} />
              )}
              <Text style={{ color: theme.text, fontWeight: '500' }}>
                {isGitHubLoading ? 'Connecting...' : 'Continue with GitHub'}
              </Text>
            </TouchableOpacity>

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
