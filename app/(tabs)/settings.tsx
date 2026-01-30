import { View, Text, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { alert } from '@/components/ui/AlertModal';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  User,
  Bell,
  Shield,
  CreditCard,
  Moon,
  ChevronRight,
  LogOut,
  Github,
  HelpCircle,
  MessageCircle,
  ExternalLink,
  Sparkles,
} from 'lucide-react-native';
import { useAuthStore } from '@/stores/auth.store';
import { colors } from '@/theme/colors';
import { useState } from 'react';

interface SettingsItemProps {
  icon: typeof User;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  danger?: boolean;
}

function SettingsItem({
  icon: Icon,
  title,
  subtitle,
  onPress,
  rightElement,
  danger,
}: SettingsItemProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      className="flex-row items-center py-4"
    >
      <View
        className={`w-10 h-10 rounded-lg items-center justify-center mr-4 ${
          danger ? 'bg-error-300/10' : 'bg-dark-800 border border-dark-500'
        }`}
      >
        <Icon
          size={20}
          color={danger ? colors.error[300] : colors.dark[200]}
        />
      </View>

      <View className="flex-1">
        <Text
          className={`font-medium ${danger ? 'text-error-300' : 'text-dark-50'}`}
        >
          {title}
        </Text>
        {subtitle && (
          <Text className="text-dark-200 text-xs mt-0.5">{subtitle}</Text>
        )}
      </View>

      {rightElement || (onPress && (
        <ChevronRight size={20} color={colors.dark[400]} />
      ))}
    </TouchableOpacity>
  );
}

function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-6">
      {title && (
        <Text className="text-dark-300 text-xs font-bold uppercase tracking-wider mb-2 px-1">
          {title}
        </Text>
      )}
      <View className="bg-dark-700 border border-dark-500 rounded-xl overflow-hidden">
        <View className="px-4 divide-y divide-dark-500">{children}</View>
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const { user, signOut } = useAuthStore();
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(true);

  const handleSignOut = async () => {
    const confirmed = await alert.confirm(
      'Sign Out',
      'Are you sure you want to sign out?',
      { confirmText: 'Sign Out', destructive: true }
    );
    if (confirmed) {
      await signOut();
      router.replace('/(auth)/login');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-dark-800" edges={['top']}>
      {/* Header */}
      <View className="bg-dark-800/95 border-b border-dark-500 px-4 pb-4 pt-2">
        <Text className="text-dark-50 text-2xl font-bold">Settings</Text>
      </View>

      <ScrollView
        className="flex-1 px-4"
        contentContainerClassName="py-4"
      >
        {/* Profile Card */}
        <TouchableOpacity
          onPress={() => router.push('/settings/account')}
          className="bg-dark-700 border border-dark-500 rounded-xl p-5 mb-6 overflow-hidden"
        >
          {/* Gradient glow */}
          <View
            className="absolute -top-12 -right-12 w-24 h-24 opacity-10"
            style={{ backgroundColor: colors.primary[500], borderRadius: 100, filter: 'blur(30px)' }}
          />

          <View className="flex-row items-center">
            {/* Initials avatar */}
            <View
              className="w-14 h-14 rounded-full items-center justify-center mr-4"
              style={{ backgroundColor: colors.primary[600] }}
            >
              <Text className="text-white text-lg font-bold">
                {(user?.name || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>

            <View className="flex-1">
              <Text className="text-dark-50 text-lg font-bold">
                {user?.name || 'User'}
              </Text>
              <Text className="text-dark-200 text-sm">{user?.email || 'email@example.com'}</Text>
              <View className="flex-row items-center mt-2">
                <View className="bg-primary-500/10 border border-primary-500/20 px-2.5 py-1 rounded flex-row items-center gap-1.5">
                  <Sparkles size={12} color={colors.primary[500]} />
                  <Text className="text-primary-500 text-xs font-bold uppercase tracking-wider">
                    {user?.subscription || 'Free'} Plan
                  </Text>
                </View>
              </View>
            </View>
            <ChevronRight size={20} color={colors.dark[400]} />
          </View>
        </TouchableOpacity>

        {/* Account Settings */}
        <SettingsSection title="Account">
          <SettingsItem
            icon={User}
            title="Profile"
            subtitle="Edit your profile information"
            onPress={() => router.push('/settings/account')}
          />
          <SettingsItem
            icon={Shield}
            title="Security"
            subtitle="Password, 2FA, biometrics"
            onPress={() => router.push('/settings/security')}
          />
          <SettingsItem
            icon={Github}
            title="GitHub"
            subtitle="Connected"
            onPress={() => router.push('/github/connect')}
          />
        </SettingsSection>

        {/* Preferences */}
        <SettingsSection title="Preferences">
          <SettingsItem
            icon={Bell}
            title="Notifications"
            subtitle="Push notifications, alerts"
            onPress={() => router.push('/settings/notifications')}
            rightElement={
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{
                  false: colors.dark[500],
                  true: colors.primary[500],
                }}
                thumbColor={notifications ? '#fff' : colors.dark[200]}
              />
            }
          />
          <SettingsItem
            icon={Moon}
            title="Dark Mode"
            subtitle="Always on"
            rightElement={
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                trackColor={{
                  false: colors.dark[500],
                  true: colors.primary[500],
                }}
                thumbColor={darkMode ? '#fff' : colors.dark[200]}
              />
            }
          />
        </SettingsSection>

        {/* Subscription */}
        <SettingsSection title="Subscription">
          <SettingsItem
            icon={CreditCard}
            title="Manage Subscription"
            subtitle="Free plan - Upgrade for more features"
            onPress={() => router.push('/settings/subscription')}
          />
        </SettingsSection>

        {/* Support */}
        <SettingsSection title="Support">
          <SettingsItem
            icon={HelpCircle}
            title="Help Center"
            onPress={() => {}}
            rightElement={<ExternalLink size={16} color={colors.dark[400]} />}
          />
          <SettingsItem
            icon={MessageCircle}
            title="Contact Support"
            onPress={() => {}}
          />
        </SettingsSection>

        {/* Sign Out */}
        <SettingsSection title="">
          <SettingsItem
            icon={LogOut}
            title="Sign Out"
            onPress={handleSignOut}
            danger
          />
        </SettingsSection>

        {/* Version */}
        <Text className="text-dark-400 text-center text-xs mt-4 mb-8">
          ForkOff v1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
