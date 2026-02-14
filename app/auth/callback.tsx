import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth.store';
import { analyticsService } from '@/services/analytics.service';
import { sentryService } from '@/services/sentry.service';
import { colors } from '@/theme/colors';

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams();
  const { setUser } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      // Wait a moment for Supabase to process the OAuth callback
      await new Promise(resolve => setTimeout(resolve, 500));

      // Get the current user after OAuth
      const user = await authService.getCurrentUser();

      if (user) {
        // Set user in store
        setUser(user);

        // Track successful OAuth sign in
        analyticsService.identify(user.id, {
          email: user.email,
          name: user.name,
        });
        analyticsService.track('user_signed_in', {
          method: 'oauth',
        });
        sentryService.setUser({
          id: user.id,
          email: user.email,
          name: user.name,
        });

        // Determine if this is a new user (no username set)
        const isNewUser = !user.username;

        if (isNewUser) {
          router.replace('/(onboarding)');
        } else {
          router.replace('/(tabs)');
        }
      } else {
        setError('Failed to complete sign in. Please try again.');
      }
    } catch (err) {
      console.error('OAuth callback error:', err);
      sentryService.captureException(err, { context: 'oauth_callback' });
      setError(err instanceof Error ? err.message : 'Authentication failed');
    }
  };

  if (error) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.dark[800] }}
        edges={['top']}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text style={{ color: colors.error[300], fontSize: 18, fontWeight: '600', marginBottom: 8 }}>
            Sign In Failed
          </Text>
          <Text style={{ color: colors.dark[300], textAlign: 'center', marginBottom: 24 }}>
            {error}
          </Text>
          <Text
            style={{ color: colors.primary[500], fontWeight: '600' }}
            onPress={() => router.replace('/(auth)/login')}
          >
            Back to Login
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.dark[800] }}
      edges={['top']}
    >
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={{ color: colors.dark[200], marginTop: 16, fontSize: 16 }}>
          Completing sign in...
        </Text>
      </View>
    </SafeAreaView>
  );
}
