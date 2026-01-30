import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet } from 'react-native';
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
import { colors } from '@/theme/colors';

function Section({ title, children }: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      {title && <Text style={styles.sectionTitle}>{title}</Text>}
      <View style={styles.sectionCard}>
        <View style={styles.sectionContent}>{children}</View>
      </View>
    </View>
  );
}

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
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={colors.dark[200]} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.pageTitle}>Notifications</Text>
        <Text style={styles.pageSubtitle}>Configure which notifications you receive</Text>

        {/* Master Toggle */}
        <Section title="Master Toggle">
          <View style={styles.settingRow}>
            <View style={[styles.settingIcon, { backgroundColor: colors.primary[500] + '20' }]}>
              <Bell size={20} color={colors.primary[500]} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Push Notifications</Text>
              <Text style={styles.settingSubtitle}>Enable all notifications</Text>
            </View>
            <Switch
              value={allEnabled}
              onValueChange={() => toggleSetting('all')}
              trackColor={{ false: colors.dark[500], true: colors.primary[500] }}
              thumbColor={allEnabled ? '#fff' : colors.dark[200]}
            />
          </View>
        </Section>

        {/* Individual Settings */}
        <Section title="Notification Types">
          {settings
            .filter((s) => s.key !== 'all')
            .map((setting, index) => (
              <View key={setting.key}>
                {index > 0 && <View style={styles.divider} />}
                <View style={[styles.settingRow, !allEnabled && styles.settingRowDisabled]}>
                  <View style={styles.settingIcon}>
                    <setting.icon size={20} color={colors.dark[300]} />
                  </View>
                  <View style={styles.settingContent}>
                    <Text style={styles.settingTitle}>{setting.title}</Text>
                    <Text style={styles.settingSubtitle}>{setting.description}</Text>
                  </View>
                  <Switch
                    value={setting.enabled && allEnabled}
                    onValueChange={() => toggleSetting(setting.key)}
                    disabled={!allEnabled}
                    trackColor={{ false: colors.dark[500], true: colors.primary[500] }}
                    thumbColor={setting.enabled && allEnabled ? '#fff' : colors.dark[200]}
                  />
                </View>
              </View>
            ))}
        </Section>

        <Text style={styles.disclaimer}>
          You can also manage notifications in your device settings
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark[800],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark[600],
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    color: colors.dark[200],
    marginLeft: 8,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.dark[50],
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 14,
    color: colors.dark[300],
    marginBottom: 20,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: colors.dark[300],
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: colors.dark[700],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.dark[600],
    overflow: 'hidden',
  },
  sectionContent: {
    padding: 16,
  },
  // Settings
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingRowDisabled: {
    opacity: 0.5,
  },
  settingIcon: {
    width: 40,
    height: 40,
    backgroundColor: colors.dark[700],
    borderWidth: 1,
    borderColor: colors.dark[500],
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    color: colors.dark[50],
    fontWeight: '600',
    fontSize: 15,
  },
  settingSubtitle: {
    color: colors.dark[300],
    fontSize: 13,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.dark[600],
    marginVertical: 12,
    marginLeft: 52,
  },
  disclaimer: {
    color: colors.dark[400],
    textAlign: 'center',
    fontSize: 12,
    marginTop: 8,
  },
});
