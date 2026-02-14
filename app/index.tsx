import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuthStore } from '@/stores/auth.store';
import { colors } from '@/theme/colors';

export default function Index() {
  const { isAuthenticated, isInitialized } = useAuthStore();

  // Show loading only while initializing (not during sign-in — login screen handles that)
  if (!isInitialized) {
    return (
      <View className="flex-1 items-center justify-center bg-dark-900">
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  // Redirect based on auth state
  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
