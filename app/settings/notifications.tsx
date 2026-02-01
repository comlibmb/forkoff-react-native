import { useState, useMemo } from 'react';
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
import { useTheme } from '@/theme/ThemeProvider';

interface NotificationSetting {
  key: string;
  icon: typeof Bell;
  title: string;
  description: string;
  enabled: boolean;
}

export default function NotificationsScreen() {
  const { theme } = useTheme();
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

  const styles = useMemo(() => createStyles(theme), [theme]);

  const toggleSetting = (key: string) => {
    setSettings((prev) =>
      prev.map((s) => (s.key === key ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const allEnabled = settings.find((s) => s.key === 'all')?.enabled ?? true;

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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={theme.textSecondary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.pageTitle}>Notifications</Text>
        <Text style={styles.pageSubtitle}>Configure which notifications you receive</Text>

        {/* Master Toggle */}
        <Section title="Master Toggle">
          <View style={styles.settingRow}>
            <View style={[styles.settingIcon, { backgroundColor: theme.primary + '20' }]}>
              <Bell size={20} color={theme.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Push Notifications</Text>
              <Text style={styles.settingSubtitle}>Enable all notifications</Text>
            </View>
            <Switch
              value={allEnabled}
              onValueChange={() => toggleSetting('all')}
              trackColor={{ false: theme.switchTrackOff, true: theme.primary }}
              thumbColor={allEnabled ? '#fff' : theme.switchThumb}
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
                    <setting.icon size={20} color={theme.textTertiary} />
                  </View>
                  <View style={styles.settingContent}>
                    <Text style={styles.settingTitle}>{setting.title}</Text>
                    <Text style={styles.settingSubtitle}>{setting.description}</Text>
                  </View>
                  <Switch
                    value={setting.enabled && allEnabled}
                    onValueChange={() => toggleSetting(setting.key)}
                    disabled={!allEnabled}
                    trackColor={{ false: theme.switchTrackOff, true: theme.primary }}
                    thumbColor={setting.enabled && allEnabled ? '#fff' : theme.switchThumb}
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

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.backgroundTertiary,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    color: theme.textSecondary,
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
    color: theme.text,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 14,
    color: theme.textTertiary,
    marginBottom: 20,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: theme.textTertiary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: theme.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.cardBorder,
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
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    color: theme.text,
    fontWeight: '600',
    fontSize: 15,
  },
  settingSubtitle: {
    color: theme.textTertiary,
    fontSize: 13,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: theme.divider,
    marginVertical: 12,
    marginLeft: 52,
  },
  disclaimer: {
    color: theme.textTertiary,
    textAlign: 'center',
    fontSize: 12,
    marginTop: 8,
  },
});
