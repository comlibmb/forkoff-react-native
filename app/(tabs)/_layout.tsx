import { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Home, Laptop, FolderGit2, Settings, BarChart3 } from 'lucide-react-native';
import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useReferralStore } from '@/stores/referral.store';
import { useTutorialStore } from '@/stores/tutorial.store';

export default function TabLayout() {
  const { theme, isDark } = useTheme();
  const { stats: referralStats } = useReferralStore();
  const { hasCompletedTutorial, isTutorialActive, startTutorial } = useTutorialStore();
  const hasHydrated = useTutorialStore.persist.hasHydrated();

  useEffect(() => {
    if (hasHydrated && !hasCompletedTutorial && !isTutorialActive) {
      const timer = setTimeout(() => startTutorial(), 500);
      return () => clearTimeout(timer);
    }
  }, [hasHydrated, hasCompletedTutorial, isTutorialActive]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          height: 85,
          paddingTop: 8,
          paddingBottom: 28,
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textTertiary,
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
          tabBarIcon: ({ color, size }) => (
            <View style={{ position: 'relative' }}>
              <Settings size={size} color={color} />
              {(referralStats?.rewardMonthsAvailable ?? 0) > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: -2,
                    right: -4,
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: theme.primary,
                  }}
                />
              )}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
