import { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Modal, TextInput, ActivityIndicator, StyleSheet } from 'react-native';
import { alert } from '@/components/ui/AlertModal';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Key,
  Smartphone,
  Shield,
  Fingerprint,
  ChevronRight,
  AlertTriangle,
  X,
  Eye,
  EyeOff,
} from 'lucide-react-native';
import { useAuthStore } from '@/stores/auth.store';
import { useTheme } from '@/theme/ThemeProvider';

export default function SecurityScreen() {
  const { theme } = useTheme();
  const { user, changePassword, resetPassword, isLoading } = useAuthStore();
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const styles = useMemo(() => createStyles(theme), [theme]);

  const handleChangePassword = () => {
    setShowChangePasswordModal(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
  };

  const handleSubmitPasswordChange = async () => {
    if (!currentPassword) {
      setPasswordError('Current password is required');
      return;
    }
    if (!newPassword) {
      setPasswordError('New password is required');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    if (currentPassword === newPassword) {
      setPasswordError('New password must be different from current password');
      return;
    }

    setIsChangingPassword(true);
    setPasswordError('');

    try {
      await changePassword(currentPassword, newPassword);
      setShowChangePasswordModal(false);
      alert.success('Success', 'Password changed successfully');
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSendResetLink = async () => {
    if (!user?.email) return;

    try {
      await resetPassword(user.email);
      alert.success('Success', 'Password reset link sent to your email');
    } catch (error) {
      alert.error('Error', 'Failed to send reset link');
    }
  };

  const handleToggle2FA = async () => {
    if (twoFactorEnabled) {
      const confirmed = await alert.confirm(
        'Disable 2FA',
        'Are you sure you want to disable two-factor authentication? This will make your account less secure.',
        { confirmText: 'Disable', destructive: true }
      );
      if (confirmed) {
        setTwoFactorEnabled(false);
      }
    } else {
      const confirmed = await alert.confirm(
        'Enable 2FA',
        'Two-factor authentication adds an extra layer of security to your account.',
        { confirmText: 'Enable' }
      );
      if (confirmed) {
        setTwoFactorEnabled(true);
      }
    }
  };

  const handleToggleBiometric = async () => {
    if (biometricEnabled) {
      setBiometricEnabled(false);
    } else {
      const confirmed = await alert.confirm(
        'Enable Biometric',
        'Use Face ID or fingerprint to unlock the app.',
        { confirmText: 'Enable' }
      );
      if (confirmed) {
        setBiometricEnabled(true);
      }
    }
  };

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
        <Text style={styles.pageTitle}>Security</Text>
        <Text style={styles.pageSubtitle}>Manage your account security settings</Text>

        {/* Password Section */}
        <Section title="Password">
          <TouchableOpacity
            onPress={handleChangePassword}
            style={styles.settingRow}
          >
            <View style={styles.settingIcon}>
              <Key size={20} color={theme.textSecondary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Change Password</Text>
              <Text style={styles.settingSubtitle}>Update your password</Text>
            </View>
            <ChevronRight size={20} color={theme.textTertiary} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            onPress={handleSendResetLink}
            style={styles.settingRow}
          >
            <View style={[styles.settingIcon, { backgroundColor: theme.primary + '20' }]}>
              <Key size={20} color={theme.primaryLight} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Reset via Email</Text>
              <Text style={styles.settingSubtitle}>Send reset link to {user?.email}</Text>
            </View>
            <ChevronRight size={20} color={theme.textTertiary} />
          </TouchableOpacity>
        </Section>

        {/* Two-Factor Authentication */}
        <Section title="Two-Factor Auth">
          <View style={styles.settingRow}>
            <View style={styles.settingIcon}>
              <Smartphone size={20} color={theme.textSecondary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Two-Factor Authentication</Text>
              <Text style={styles.settingSubtitle}>
                {twoFactorEnabled ? 'Enabled' : 'Add extra security layer'}
              </Text>
            </View>
            <Switch
              value={twoFactorEnabled}
              onValueChange={handleToggle2FA}
              trackColor={{ false: theme.switchTrackOff, true: theme.primary }}
              thumbColor={twoFactorEnabled ? '#fff' : theme.switchThumb}
            />
          </View>
        </Section>

        {/* Biometric Authentication */}
        <Section title="Biometrics">
          <View style={styles.settingRow}>
            <View style={styles.settingIcon}>
              <Fingerprint size={20} color={theme.textSecondary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Biometric Authentication</Text>
              <Text style={styles.settingSubtitle}>
                {biometricEnabled ? 'Face ID / Fingerprint enabled' : 'Use biometrics to unlock'}
              </Text>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={handleToggleBiometric}
              trackColor={{ false: theme.switchTrackOff, true: theme.primary }}
              thumbColor={biometricEnabled ? '#fff' : theme.switchThumb}
            />
          </View>
        </Section>

        {/* Active Sessions */}
        <Section title="Active Sessions">
          <View style={styles.sessionRow}>
            <View style={[styles.settingIcon, { backgroundColor: theme.success + '20', borderColor: theme.success + '30' }]}>
              <Shield size={20} color={theme.success} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Current Device</Text>
              <Text style={styles.settingSubtitle}>iPhone 15 Pro - Active now</Text>
            </View>
            <View style={styles.currentBadge}>
              <Text style={styles.currentBadgeText}>Current</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.sessionRow}>
            <View style={styles.settingIcon}>
              <Smartphone size={20} color={theme.textTertiary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>MacBook Pro</Text>
              <Text style={styles.settingSubtitle}>Last active 2 hours ago</Text>
            </View>
            <TouchableOpacity>
              <Text style={styles.revokeText}>Revoke</Text>
            </TouchableOpacity>
          </View>
        </Section>

        {/* Sign Out All Devices */}
        <Section title="Sign Out">
          <TouchableOpacity
            onPress={async () => {
              const confirmed = await alert.confirm(
                'Sign Out All Devices',
                'This will sign out all other devices. You will remain logged in on this device.',
                { confirmText: 'Sign Out All', destructive: true }
              );
              if (confirmed) {
                // TODO: Implement sign out all devices
              }
            }}
            style={styles.signOutButton}
          >
            <Text style={styles.signOutButtonText}>Sign Out All Other Devices</Text>
          </TouchableOpacity>
        </Section>

        {/* Security Tips */}
        <View style={styles.tipCard}>
          <AlertTriangle size={20} color={theme.warning} />
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>Security Tip</Text>
            <Text style={styles.tipText}>
              Enable two-factor authentication and use a strong, unique password to keep your account secure.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal
        visible={showChangePasswordModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowChangePasswordModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowChangePasswordModal(false)}>
              <X size={24} color={theme.textTertiary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Change Password</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Current Password</Text>
              <View style={styles.passwordInputWrapper}>
                <TextInput
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry={!showCurrentPassword}
                  placeholder="Enter current password"
                  placeholderTextColor={theme.textTertiary}
                  style={styles.passwordInput}
                />
                <TouchableOpacity
                  onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                  style={styles.eyeButton}
                >
                  {showCurrentPassword ? (
                    <EyeOff size={20} color={theme.textTertiary} />
                  ) : (
                    <Eye size={20} color={theme.textTertiary} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>New Password</Text>
              <View style={styles.passwordInputWrapper}>
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPassword}
                  placeholder="Enter new password (min 6 characters)"
                  placeholderTextColor={theme.textTertiary}
                  style={styles.passwordInput}
                />
                <TouchableOpacity
                  onPress={() => setShowNewPassword(!showNewPassword)}
                  style={styles.eyeButton}
                >
                  {showNewPassword ? (
                    <EyeOff size={20} color={theme.textTertiary} />
                  ) : (
                    <Eye size={20} color={theme.textTertiary} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm New Password</Text>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showNewPassword}
                placeholder="Confirm new password"
                placeholderTextColor={theme.textTertiary}
                style={styles.confirmInput}
              />
            </View>

            {passwordError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{passwordError}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              onPress={handleSubmitPasswordChange}
              disabled={isChangingPassword}
              style={[styles.submitButton, isChangingPassword && styles.submitButtonDisabled]}
            >
              {isChangingPassword ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.submitButtonText}>Change Password</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  currentBadge: {
    backgroundColor: theme.success + '20',
    borderWidth: 1,
    borderColor: theme.success + '30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  currentBadgeText: {
    color: theme.success,
    fontSize: 11,
    fontWeight: '700',
  },
  revokeText: {
    color: theme.error,
    fontSize: 14,
    fontWeight: '600',
  },
  signOutButton: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  signOutButtonText: {
    color: theme.text,
    fontWeight: '600',
    fontSize: 15,
  },
  // Tip card
  tipCard: {
    flexDirection: 'row',
    backgroundColor: theme.warning + '15',
    borderWidth: 1,
    borderColor: theme.warning + '30',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  tipContent: {
    flex: 1,
    marginLeft: 12,
  },
  tipTitle: {
    color: theme.warning,
    fontWeight: '700',
    marginBottom: 4,
  },
  tipText: {
    color: theme.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: theme.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.backgroundTertiary,
  },
  modalTitle: {
    color: theme.text,
    fontSize: 18,
    fontWeight: '700',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: theme.textTertiary,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  passwordInputWrapper: {
    position: 'relative',
  },
  passwordInput: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingRight: 48,
    color: theme.text,
    fontSize: 15,
  },
  confirmInput: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: theme.text,
    fontSize: 15,
  },
  eyeButton: {
    position: 'absolute',
    right: 14,
    top: '50%',
    transform: [{ translateY: -10 }],
  },
  errorBox: {
    backgroundColor: theme.error + '15',
    borderWidth: 1,
    borderColor: theme.error + '30',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: theme.error,
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: theme.primaryDark,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
