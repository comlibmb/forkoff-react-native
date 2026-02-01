import { Stack } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';

export default function OnboardingLayout() {
  const { theme } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="add-device" />
      <Stack.Screen name="connect-github" />
    </Stack>
  );
}
