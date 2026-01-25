import { Stack } from 'expo-router';

export default function ProjectLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0f172a' },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="code" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="terminals" />
      <Stack.Screen name="servers" />
    </Stack>
  );
}
