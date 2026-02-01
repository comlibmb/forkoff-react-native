import { Tabs } from 'expo-router';
import { Home, Laptop, FolderGit2, Settings, BarChart3 } from 'lucide-react-native';
import { colors } from '@/theme/colors';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.dark[800],
          borderTopColor: colors.dark[500],
          borderTopWidth: 1,
          height: 85,
          paddingTop: 8,
          paddingBottom: 28,
        },
        tabBarActiveTintColor: colors.primary[500],
        tabBarInactiveTintColor: colors.dark[300],
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="projects"
        options={{
          title: 'Projects',
          tabBarIcon: ({ color, size }) => <FolderGit2 size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="devices"
        options={{
          title: 'Devices',
          tabBarIcon: ({ color, size }) => <Laptop size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color, size }) => <BarChart3 size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
