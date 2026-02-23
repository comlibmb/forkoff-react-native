import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useIdentityStore } from '@/stores/identity.store';
import { colors } from '@/theme/colors';

export default function Index() {
  const { isPaired, isReady } = useIdentityStore();

  if (!isReady) {
    return (
      <View className="flex-1 items-center justify-center bg-dark-900">
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  // Paired → main app, otherwise → onboarding (device pairing)
  if (isPaired) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(onboarding)" />;
}
