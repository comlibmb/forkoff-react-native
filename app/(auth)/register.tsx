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
  Linking,
} from 'react-native';
import { alert } from '@/components/ui/AlertModal';
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, User, ArrowRight, Github, Check } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { useAuthStore } from '@/stores/auth.store';
import { useTheme } from '@/theme/ThemeProvider';

WebBrowser.maybeCompleteAuthSession();

export default function RegisterScreen() {
  const { theme } = useTheme();
  const { signUpWithOtp, signInWithGitHub, isLoading, error, clearError } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isGitHubLoading, setIsGitHubLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
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

    if (!agreedToTerms) {
      return;
    }

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
                Create account
              </Text>
              <Text style={{ fontSize: 16, color: theme.textSecondary, textAlign: 'center' }}>
                Join ForkOff to control your AI tools
              </Text>
            </View>

            {/* Form */}
            <View style={{ marginBottom: 24 }}>
              {/* Name Input */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                  Name
                </Text>
                <View style={{ position: 'relative' }}>
                  <View style={{ position: 'absolute', left: 16, top: '50%', transform: [{ translateY: -9 }], zIndex: 10 }}>
                    <User size={18} color={theme.textTertiary} />
                  </View>
                  <TextInput
                    placeholder="Enter your name"
                    placeholderTextColor={theme.textTertiary}
                    autoCapitalize="words"
                    autoComplete="name"
                    value={name}
                    onChangeText={(text) => {
                      setName(text);
                      if (validationErrors.name) {
                        setValidationErrors((prev) => ({ ...prev, name: undefined }));
                      }
                    }}
                    style={{
                      backgroundColor: theme.backgroundSecondary,
                      borderWidth: 1,
                      borderColor: validationErrors.name ? theme.error : theme.border,
                      borderRadius: 12,
                      paddingLeft: 48,
                      paddingRight: 16,
                      paddingVertical: 16,
                      color: theme.text,
                      fontSize: 16,
                    }}
                  />
                </View>
                {validationErrors.name && (
                  <Text style={{ color: theme.error, fontSize: 12, marginTop: 6 }}>{validationErrors.name}</Text>
                )}
              </View>

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
                  We'll send you a 6-digit verification code to confirm your email address.{'\n'}No password required!
                </Text>
              </View>

              {/* Terms Checkbox */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                <TouchableOpacity
                  onPress={() => setAgreedToTerms(!agreedToTerms)}
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 4,
                    borderWidth: 1.5,
                    borderColor: agreedToTerms ? theme.primary : theme.border,
                    backgroundColor: agreedToTerms ? theme.primary : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {agreedToTerms && <Check size={14} color="#fff" />}
                </TouchableOpacity>
                <Text style={{ color: theme.textSecondary, fontSize: 13, flex: 1 }}>
                  I agree to the{' '}
                  <Text
                    style={{ color: theme.primary }}
                    onPress={() => Linking.openURL('https://forkoff.app/legal/terms')}
                  >
                    Terms of Service
                  </Text>
                  {' '}and{' '}
                  <Text
                    style={{ color: theme.primary }}
                    onPress={() => Linking.openURL('https://forkoff.app/legal/privacy')}
                  >
                    Privacy Policy
                  </Text>
                </Text>
              </View>

              {/* Continue Button */}
              <TouchableOpacity
                onPress={handleRegister}
                disabled={isLoading || isGitHubLoading || !agreedToTerms}
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
                  opacity: isLoading || isGitHubLoading || !agreedToTerms ? 0.7 : 1,
                }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                  {isLoading ? 'Creating...' : 'Continue'}
                </Text>
                {!isLoading && <ArrowRight size={18} color="#fff" />}
              </TouchableOpacity>

              {/* Divider */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 24 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
                <Text style={{ paddingHorizontal: 16, color: theme.textTertiary, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>or</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
              </View>

              {/* GitHub Sign Up */}
              <TouchableOpacity
                onPress={handleGitHubSignUp}
                disabled={isGitHubLoading || isLoading || !agreedToTerms}
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
                  opacity: isGitHubLoading || isLoading || !agreedToTerms ? 0.7 : 1,
                }}
              >
                {isGitHubLoading ? (
                  <ActivityIndicator size="small" color={theme.text} />
                ) : (
                  <Github size={20} color={theme.text} />
                )}
                <Text style={{ color: theme.text, fontWeight: '500' }}>
                  {isGitHubLoading ? 'Connecting...' : 'Sign up with GitHub'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 'auto', paddingTop: 32 }}>
              <Text style={{ color: theme.textTertiary }}>Already have an account? </Text>
              <Link href="/(auth)/login" asChild>
                <TouchableOpacity>
                  <Text style={{ color: theme.primary, fontWeight: 'bold' }}>Sign in</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
