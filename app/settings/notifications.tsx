import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Bell,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  Laptop,
  Hammer,
} from 'lucide-react-native';
import { Card } from '@/components/ui';
import { colors } from '@/theme/colors';

interface NotificationSetting {
  key: string;
  icon: typeof Bell;
  title: string;
  description: string;
  enabled: boolean;
}

export default function NotificationsScreen() {
  const [settings, setSettings] = useState<NotificationSetting[]>([
    {
      key: 'all',
      icon: Bell,
      title: 'Push Notifications',
      description: 'Enable all push notifications',
      enabled: true,
    },
    {
      key: 'approvals',
      icon: AlertCircle,
      title: 'Approval Requests',
      description: 'When AI tools need your approval',
      enabled: true,
    },
    {
      key: 'tasks',
      icon: CheckCircle,
      title: 'Task Completion',
      description: 'When AI completes a task',
      enabled: true,
    },
    {
      key: 'errors',
      icon: AlertCircle,
      title: 'Errors',
      description: 'When errors occur in your projects',
      enabled: true,
    },
    {
      key: 'devices',
      icon: Laptop,
      title: 'Device Status',
      description: 'When devices go online or offline',
      enabled: false,
    },
    {
      key: 'chat',
      icon: MessageSquare,
      title: 'Chat Messages',
      description: 'New messages from AI tools',
      enabled: false,
    },
    {
      key: 'builds',
      icon: Hammer,
      title: 'Build Status',
      description: 'Build success or failure notifications',
      enabled: true,
    },
  ]);

  const toggleSetting = (key: string) => {
    setSettings((prev) =>
      prev.map((s) => (s.key === key ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const allEnabled = settings.find((s) => s.key === 'all')?.enabled ?? true;

  return (
    <SafeAreaView className="flex-1 bg-dark-900" edges={['top']}>
      {/* Header */}
      <View className="px-6 pt-4 pb-4 flex-row items-center">
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center"
        >
          <ArrowLeft size={24} color={colors.dark[300]} />
          <Text className="text-dark-300 ml-2">Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-6" contentContainerClassName="pb-8">
        <Text className="text-white text-2xl font-bold mb-2">
          Notifications
        </Text>
        <Text className="text-dark-400 mb-6">
          Configure which notifications you receive
        </Text>

        {/* Master Toggle */}
        <Card padding="md" className="mb-6">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <View className="w-10 h-10 bg-primary-500/20 rounded-lg items-center justify-center mr-4">
                <Bell size={20} color={colors.primary[500]} />
              </View>
              <View className="flex-1">
                <Text className="text-white font-semibold">
                  Push Notifications
                </Text>
                <Text className="text-dark-400 text-sm">
                  Enable all notifications
                </Text>
              </View>
            </View>
            <Switch
              value={allEnabled}
              onValueChange={() => toggleSetting('all')}
              trackColor={{
                false: colors.dark[600],
                true: colors.primary[500],
              }}
            />
          </View>
        </Card>

        {/* Individual Settings */}
        <Text className="text-dark-400 text-sm font-medium mb-3">
          NOTIFICATION TYPES
        </Text>
        <Card padding="none">
          {settings
            .filter((s) => s.key !== 'all')
            .map((setting, index) => (
              <View
                key={setting.key}
                className={`flex-row items-center justify-between px-4 py-4 ${
                  index > 0 ? 'border-t border-dark-700' : ''
                }`}
                style={{ opacity: allEnabled ? 1 : 0.5 }}
              >
                <View className="flex-row items-center flex-1">
                  <View className="w-10 h-10 bg-dark-700 rounded-lg items-center justify-center mr-4">
                    <setting.icon size={20} color={colors.dark[300]} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-medium">
                      {setting.title}
                    </Text>
                    <Text className="text-dark-400 text-sm">
                      {setting.description}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={setting.enabled && allEnabled}
                  onValueChange={() => toggleSetting(setting.key)}
                  disabled={!allEnabled}
                  trackColor={{
                    false: colors.dark[600],
                    true: colors.primary[500],
                  }}
                />
              </View>
            ))}
        </Card>

        <Text className="text-dark-500 text-sm text-center mt-6">
          You can also manage notifications in your device settings
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
