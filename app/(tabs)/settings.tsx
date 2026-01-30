import { View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet } from 'react-native';
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
      style={styles.settingsItem}
    >
      <View
        style={[
          styles.itemIcon,
          danger && styles.itemIconDanger,
        ]}
      >
        <Icon
          size={20}
          color={danger ? colors.error[300] : colors.dark[200]}
        />
      </View>

      <View style={styles.itemContent}>
        <Text
          style={[
            styles.itemTitle,
            danger && styles.itemTitleDanger,
          ]}
        >
          {title}
        </Text>
        {subtitle && (
          <Text style={styles.itemSubtitle}>{subtitle}</Text>
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
    <View style={styles.section}>
      {title && (
        <Text style={styles.sectionTitle}>
          {title}
        </Text>
      )}
      <View style={styles.sectionCard}>
        <View style={styles.sectionContent}>{children}</View>
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
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
        <Text style={styles.headerSubtitle}>Preferences & account</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Card */}
        <TouchableOpacity
          onPress={() => router.push('/settings/account')}
          style={styles.profileCard}
        >
          <View style={styles.profileContent}>
            {/* Gradient glow */}
            <View style={styles.profileGlow} />

            <View style={styles.profileRow}>
              {/* Initials avatar */}
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(user?.name || 'U').charAt(0).toUpperCase()}
                </Text>
              </View>

              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>
                  {user?.name || 'User'}
                </Text>
                <Text style={styles.profileEmail}>{user?.email || 'email@example.com'}</Text>
                <View style={styles.subscriptionBadge}>
                  <Sparkles size={12} color={colors.primary[500]} />
                  <Text style={styles.subscriptionText}>
                    {user?.subscription || 'Free'} Plan
                  </Text>
                </View>
              </View>
              <ChevronRight size={20} color={colors.dark[400]} />
            </View>
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
          <View style={styles.divider} />
          <SettingsItem
            icon={Shield}
            title="Security"
            subtitle="Password, 2FA, biometrics"
            onPress={() => router.push('/settings/security')}
          />
          <View style={styles.divider} />
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
          <View style={styles.divider} />
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
          <View style={styles.divider} />
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
        <Text style={styles.version}>
          ForkOff v1.0.0
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
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark[600],
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.dark[50],
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.dark[300],
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
    backgroundColor: colors.dark[700],
    borderWidth: 1,
    borderColor: colors.dark[500],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  itemIconDanger: {
    backgroundColor: colors.error[300] + '15',
    borderColor: colors.error[300] + '30',
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    color: colors.dark[50],
    fontSize: 15,
    fontWeight: '600',
  },
  itemTitleDanger: {
    color: colors.error[300],
  },
  itemSubtitle: {
    color: colors.dark[200],
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.dark[600],
    marginLeft: 56,
  },
  profileCard: {
    backgroundColor: colors.dark[700],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.dark[600],
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
    backgroundColor: colors.primary[500],
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
    backgroundColor: colors.primary[600],
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
    color: colors.dark[50],
    fontSize: 18,
    fontWeight: '700',
  },
  profileEmail: {
    color: colors.dark[200],
    fontSize: 14,
    marginTop: 2,
  },
  subscriptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[500] + '15',
    borderWidth: 1,
    borderColor: colors.primary[500] + '30',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
    gap: 6,
  },
  subscriptionText: {
    color: colors.primary[500],
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  version: {
    color: colors.dark[400],
    textAlign: 'center',
    fontSize: 12,
    marginTop: 16,
    marginBottom: 32,
  },
});
