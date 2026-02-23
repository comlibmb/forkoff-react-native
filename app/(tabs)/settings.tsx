import { View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet, Linking } from 'react-native';
import { alert } from '@/components/ui/AlertModal';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Smartphone,
  Bell,
  Moon,
  Sun,
  ChevronRight,
  ShieldOff,
  Shield,
  LogOut,
  HelpCircle,
  MessageCircle,
  ExternalLink,
  BarChart3,
  Trophy,
  Compass,
} from 'lucide-react-native';
import { useIdentityStore } from '@/stores/identity.store';
import { useDeviceStore } from '@/stores/device.store';
import { useTheme } from '@/theme/ThemeProvider';
import { useSessionSettingsStore } from '@/stores/session-settings.store';
import { useTutorialStore } from '@/stores/tutorial.store';
import { wsService } from '@/services/websocket.service';
import { useState } from 'react';

interface SettingsItemProps {
  icon: typeof Smartphone;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  danger?: boolean;
  theme: ReturnType<typeof useTheme>['theme'];
}

function SettingsItem({
  icon: Icon,
  title,
  subtitle,
  onPress,
  rightElement,
  danger,
  theme,
}: SettingsItemProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      style={styles.settingsItem}
    >
      <View
        style={[
          styles.itemIcon,
          { backgroundColor: theme.card, borderColor: theme.border },
          danger && { backgroundColor: theme.error + '15', borderColor: theme.error + '30' },
        ]}
      >
        <Icon
          size={20}
          color={danger ? theme.error : theme.textSecondary}
        />
      </View>

      <View style={styles.itemContent}>
        <Text
          style={[
            styles.itemTitle,
            { color: theme.text },
            danger && { color: theme.error },
          ]}
        >
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.itemSubtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
        )}
      </View>

      {rightElement || (onPress && (
        <ChevronRight size={20} color={theme.textTertiary} />
      ))}
    </TouchableOpacity>
  );
}

function SettingsSection({
  title,
  children,
  theme,
}: {
  title: string;
  children: React.ReactNode;
  theme: ReturnType<typeof useTheme>['theme'];
}) {
  return (
    <View style={styles.section}>
      {title && (
        <Text style={[styles.sectionTitle, { color: theme.textTertiary }]}>
          {title}
        </Text>
      )}
      <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={styles.sectionContent}>{children}</View>
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const { mobileDeviceId, pairedDevices, unpairAll } = useIdentityStore();
  const { devices } = useDeviceStore();
  const { isDark, theme, toggleTheme } = useTheme();
  const { unrestrictedMode, hasSeenWarning, setUnrestrictedMode, setHasSeenWarning } = useSessionSettingsStore();
  const { resetTutorial, startTutorial: startTutorialAction } = useTutorialStore();
  const [notifications, setNotifications] = useState(true);

  const handleReplayTutorial = () => {
    resetTutorial();
    setTimeout(() => {
      startTutorialAction();
      router.navigate('/(tabs)/projects');
    }, 100);
  };

  const handleUnpairAll = async () => {
    const confirmed = await alert.confirm(
      'Unpair All Devices',
      'This will remove all paired devices and disconnect from the relay. You will need to re-pair to use ForkOff.',
      { confirmText: 'Unpair All', destructive: true }
    );
    if (confirmed) {
      wsService.disconnect();
      await unpairAll();
      router.replace('/(onboarding)');
    }
  };

  const handleToggleUnrestricted = async (value: boolean) => {
    if (!value) {
      setUnrestrictedMode(false);
      return;
    }

    const title = 'Enable Unrestricted Mode?';
    const body = hasSeenWarning
      ? 'Claude will run without permission checks. It can execute commands, edit files, and make network requests without asking for approval.'
      : 'This runs Claude without permission checks. It can execute commands, edit files, and make changes without asking for approval.\n\nOnly enable this if you trust your prompts and understand the risks.';

    const confirmed = await new Promise<boolean>((resolve) => {
      alert.show(title, body, [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Enable', style: 'default', onPress: () => resolve(true) },
      ], { variant: 'warning' });
    });

    if (confirmed) {
      setUnrestrictedMode(true);
      if (!hasSeenWarning) setHasSeenWarning();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Settings</Text>
        <Text style={[styles.headerSubtitle, { color: theme.textTertiary }]}>Preferences & devices</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Device Identity Card */}
        <TouchableOpacity
          onPress={() => router.push('/settings/account')}
          style={[styles.profileCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
        >
          <View style={styles.profileContent}>
            <View style={[styles.profileGlow, { backgroundColor: theme.primary }]} />
            <View style={styles.profileRow}>
              <View style={[styles.avatar, { backgroundColor: theme.primaryDark }]}>
                <Smartphone size={24} color="#fff" />
              </View>
              <View style={styles.profileInfo}>
                <Text style={[styles.profileName, { color: theme.text }]}>
                  {pairedDevices.length} Paired Device{pairedDevices.length !== 1 ? 's' : ''}
                </Text>
                <Text style={[styles.profileEmail, { color: theme.textSecondary }]} numberOfLines={1}>
                  {mobileDeviceId ? `ID: ${mobileDeviceId.slice(0, 16)}...` : 'Not initialized'}
                </Text>
              </View>
              <ChevronRight size={20} color={theme.textTertiary} />
            </View>
          </View>
        </TouchableOpacity>

        {/* Preferences */}
        <SettingsSection title="Preferences" theme={theme}>
          <SettingsItem
            icon={Bell}
            title="Notifications"
            subtitle="Push notifications, alerts"
            onPress={() => router.push('/settings/notifications')}
            theme={theme}
            rightElement={
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{
                  false: theme.switchTrackOff,
                  true: theme.primary,
                }}
                thumbColor={notifications ? '#fff' : theme.switchThumb}
              />
            }
          />
          <View style={[styles.divider, { backgroundColor: theme.divider }]} />
          <SettingsItem
            icon={isDark ? Moon : Sun}
            title="Dark Mode"
            subtitle={isDark ? 'On' : 'Off'}
            theme={theme}
            rightElement={
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{
                  false: theme.switchTrackOff,
                  true: theme.primary,
                }}
                thumbColor={isDark ? '#fff' : theme.switchThumb}
              />
            }
          />
          <View style={[styles.divider, { backgroundColor: theme.divider }]} />
          <View style={unrestrictedMode ? { backgroundColor: theme.warning + '10', marginHorizontal: -16, paddingHorizontal: 16 } : undefined}>
            <SettingsItem
              icon={ShieldOff}
              title="Unrestricted Mode"
              subtitle="Skip permission prompts"
              theme={theme}
              rightElement={
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {unrestrictedMode && (
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.warning }} />
                  )}
                  <Switch
                    value={unrestrictedMode}
                    onValueChange={handleToggleUnrestricted}
                    trackColor={{
                      false: theme.switchTrackOff,
                      true: theme.warning,
                    }}
                    thumbColor={unrestrictedMode ? '#fff' : theme.switchThumb}
                  />
                </View>
              }
            />
          </View>
          <View style={[styles.divider, { backgroundColor: theme.divider }]} />
          <SettingsItem
            icon={Shield}
            title="Permission Rules"
            subtitle="Configure tool approval rules"
            onPress={() => router.push('/settings/permissions')}
            theme={theme}
          />
          <View style={[styles.divider, { backgroundColor: theme.divider }]} />
          <SettingsItem
            icon={Compass}
            title="Replay Tutorial"
            subtitle="Take the guided tour again"
            onPress={handleReplayTutorial}
            theme={theme}
          />
        </SettingsSection>

        {/* Analytics & Achievements */}
        <SettingsSection title="Analytics & Achievements" theme={theme}>
          <SettingsItem
            icon={BarChart3}
            title="Usage Analytics"
            subtitle="Token usage and cost tracking"
            onPress={() => router.push('/(tabs)/analytics')}
            theme={theme}
          />
          <View style={[styles.divider, { backgroundColor: theme.divider }]} />
          <SettingsItem
            icon={Trophy}
            title="Achievements"
            subtitle="View your milestones and badges"
            onPress={() => router.push('/achievements')}
            theme={theme}
          />
        </SettingsSection>

        {/* Support */}
        <SettingsSection title="Support" theme={theme}>
          <SettingsItem
            icon={HelpCircle}
            title="Help Center"
            onPress={() => Linking.openURL('https://forkoff.app/docs')}
            theme={theme}
            rightElement={<ExternalLink size={16} color={theme.textTertiary} />}
          />
          <View style={[styles.divider, { backgroundColor: theme.divider }]} />
          <SettingsItem
            icon={MessageCircle}
            title="Contact Support"
            onPress={() => Linking.openURL('mailto:support@forkoff.app')}
            theme={theme}
          />
        </SettingsSection>

        {/* Unpair All */}
        <SettingsSection title="" theme={theme}>
          <SettingsItem
            icon={LogOut}
            title="Unpair All Devices"
            onPress={handleUnpairAll}
            danger
            theme={theme}
          />
        </SettingsSection>

        {/* Version */}
        <Text style={[styles.version, { color: theme.textTertiary }]}>
          ForkOff v1.0.0 (Open Source)
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sectionContent: {
    paddingHorizontal: 16,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  itemSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginLeft: 56,
  },
  profileCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 24,
  },
  profileContent: {
    padding: 20,
    overflow: 'hidden',
  },
  profileGlow: {
    position: 'absolute',
    top: -48,
    right: -48,
    width: 96,
    height: 96,
    borderRadius: 48,
    opacity: 0.1,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
  },
  profileEmail: {
    fontSize: 14,
    marginTop: 2,
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 16,
    marginBottom: 32,
  },
});
