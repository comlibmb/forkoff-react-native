import { View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet, Linking } from 'react-native';
import { alert } from '@/components/ui/AlertModal';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  User,
  Bell,
  CreditCard,
  Moon,
  Sun,
  ChevronRight,
  ShieldOff,
  LogOut,
  HelpCircle,
  MessageCircle,
  ExternalLink,
  Sparkles,
  BarChart3,
  Trophy,
  Clock,
  Gift,
  Users,
  Compass,
} from 'lucide-react-native';
import { useAuthStore } from '@/stores/auth.store';
import { useTheme } from '@/theme/ThemeProvider';
import { useReferralStore } from '@/stores/referral.store';
import { useSessionSettingsStore } from '@/stores/session-settings.store';
import { useTutorialStore } from '@/stores/tutorial.store';
import { useState, useEffect } from 'react';

interface SettingsItemProps {
  icon: typeof User;
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
  const { user, signOut } = useAuthStore();
  const { isDark, theme, toggleTheme } = useTheme();
  const { stats: referralStats, fetchStats: fetchReferralStats } = useReferralStore();
  const { unrestrictedMode, hasSeenWarning, setUnrestrictedMode, setHasSeenWarning } = useSessionSettingsStore();
  const { resetTutorial, startTutorial: startTutorialAction } = useTutorialStore();
  const [notifications, setNotifications] = useState(true);

  useEffect(() => {
    fetchReferralStats();
  }, []);

  const handleReplayTutorial = () => {
    resetTutorial();
    setTimeout(() => {
      startTutorialAction();
      router.navigate('/(tabs)/projects');
    }, 100);
  };

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
        <Text style={[styles.headerSubtitle, { color: theme.textTertiary }]}>Preferences & account</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Card */}
        <TouchableOpacity
          onPress={() => router.push('/settings/account')}
          style={[styles.profileCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
        >
          <View style={styles.profileContent}>
            {/* Gradient glow */}
            <View style={[styles.profileGlow, { backgroundColor: theme.primary }]} />

            <View style={styles.profileRow}>
              {/* Initials avatar */}
              <View style={[styles.avatar, { backgroundColor: theme.primaryDark }]}>
                <Text style={styles.avatarText}>
                  {(user?.name || 'U').charAt(0).toUpperCase()}
                </Text>
              </View>

              <View style={styles.profileInfo}>
                <Text style={[styles.profileName, { color: theme.text }]}>
                  {user?.name || 'User'}
                </Text>
                <Text style={[styles.profileEmail, { color: theme.textSecondary }]}>{user?.email || 'email@example.com'}</Text>
                <View style={[styles.subscriptionBadge, { backgroundColor: theme.primaryBackground, borderColor: theme.primary + '30' }]}>
                  <Sparkles size={12} color={theme.primary} />
                  <Text style={[styles.subscriptionText, { color: theme.primary }]}>
                    {user?.subscription || 'Free'} Plan
                  </Text>
                </View>
              </View>
              <ChevronRight size={20} color={theme.textTertiary} />
            </View>
          </View>
        </TouchableOpacity>

        {/* Account Settings */}
        <SettingsSection title="Account" theme={theme}>
          <SettingsItem
            icon={User}
            title="Profile"
            subtitle="Edit your profile information"
            onPress={() => router.push('/settings/account')}
            theme={theme}
          />
        </SettingsSection>

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
          <View style={[styles.divider, { backgroundColor: theme.divider }]} />
          <SettingsItem
            icon={Clock}
            title="Prompt Queue"
            subtitle="Manage queued prompts and schedule"
            onPress={() => router.push('/queue')}
            theme={theme}
          />
        </SettingsSection>

        {/* Subscription */}
        <SettingsSection title="Subscription" theme={theme}>
          <SettingsItem
            icon={CreditCard}
            title="Manage Subscription"
            subtitle="Free plan - Upgrade for more features"
            onPress={() => router.push('/settings/subscription')}
            theme={theme}
          />
          <View style={[styles.divider, { backgroundColor: theme.divider }]} />
          <SettingsItem
            icon={Gift}
            title="Redeem Voucher"
            subtitle="Enter a promo or voucher code"
            onPress={() => router.push('/settings/vouchers')}
            theme={theme}
          />
          <View style={[styles.divider, { backgroundColor: theme.divider }]} />
          <SettingsItem
            icon={Users}
            title="Refer Friends"
            subtitle={
              referralStats?.rewardMonthsAvailable
                ? `${referralStats.rewardMonthsAvailable} reward${referralStats.rewardMonthsAvailable > 1 ? 's' : ''} available!`
                : 'Earn free PRO months'
            }
            onPress={() => router.push('/settings/referrals')}
            theme={theme}
            rightElement={
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {(referralStats?.rewardMonthsAvailable ?? 0) > 0 && (
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.primary }} />
                )}
                <ChevronRight size={20} color={theme.textTertiary} />
              </View>
            }
          />
        </SettingsSection>

        {/* Support */}
        <SettingsSection title="Support" theme={theme}>
          <SettingsItem
            icon={HelpCircle}
            title="Help Center"
            onPress={() => Linking.openURL('https://forkoff-website.vercel.app/docs')}
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

        {/* Sign Out */}
        <SettingsSection title="" theme={theme}>
          <SettingsItem
            icon={LogOut}
            title="Sign Out"
            onPress={handleSignOut}
            danger
            theme={theme}
          />
        </SettingsSection>

        {/* Version */}
        <Text style={[styles.version, { color: theme.textTertiary }]}>
          ForkOff v1.0.0
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
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
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
  subscriptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
    gap: 6,
  },
  subscriptionText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 16,
    marginBottom: 32,
  },
});
