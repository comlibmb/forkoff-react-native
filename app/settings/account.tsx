import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, StyleSheet } from 'react-native';
import { alert } from '@/components/ui/AlertModal';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Mail, User, AtSign, Sparkles, ChevronRight, Trash2, Check, X } from 'lucide-react-native';
import { useAuthStore } from '@/stores/auth.store';
import { useTheme } from '@/theme/ThemeProvider';

export default function AccountScreen() {
  const { theme } = useTheme();
  const { user, updateProfile, deleteAccount, validateUsername, checkUsernameAvailability, isLoading } = useAuthStore();
  const [isDeleting, setIsDeleting] = useState(false);

  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const styles = useMemo(() => createStyles(theme), [theme]);

  const handleNameChange = (text: string) => {
    setName(text);
    checkForChanges(text, username);
  };

  const checkForChanges = (newName: string, newUsername: string) => {
    const nameChanged = newName !== (user?.name || '');
    const usernameChanged = newUsername !== (user?.username || '');
    setHasChanges(nameChanged || usernameChanged);
  };

  // Debounced username validation
  useEffect(() => {
    if (!username) {
      setUsernameError(null);
      setIsUsernameAvailable(null);
      return;
    }

    // If username hasn't changed from current, mark as valid
    if (username === user?.username) {
      setUsernameError(null);
      setIsUsernameAvailable(true);
      return;
    }

    // Local validation first
    const validation = validateUsername(username);
    if (!validation.valid) {
      setUsernameError(validation.error || 'Invalid username');
      setIsUsernameAvailable(false);
      return;
    }

    // Check availability with debounce
    setIsCheckingUsername(true);
    setUsernameError(null);
    setIsUsernameAvailable(null);

    const timer = setTimeout(async () => {
      try {
        const result = await checkUsernameAvailability(username);
        setIsUsernameAvailable(result.available);
        if (!result.available) {
          setUsernameError(result.error || 'Username is already taken');
        }
      } catch (error) {
        setUsernameError('Failed to check username');
        setIsUsernameAvailable(false);
      } finally {
        setIsCheckingUsername(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username, user?.username]);

  const handleUsernameChange = (text: string) => {
    // Only allow valid characters while typing
    const cleanText = text.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(cleanText);
    checkForChanges(name, cleanText);
  };

  const handleSave = async () => {
    if (!hasChanges) return;

    // Validate username if changed
    if (username !== (user?.username || '') && !isUsernameAvailable) {
      alert.error('Error', usernameError || 'Please fix username errors');
      return;
    }

    try {
      const updates: { name?: string; username?: string } = {};
      if (name !== user?.name) updates.name = name;
      if (username !== (user?.username || '')) updates.username = username;

      await updateProfile(updates);
      alert.success('Success', 'Profile updated successfully');
      setHasChanges(false);
    } catch (error) {
      alert.error('Error', error instanceof Error ? error.message : 'Failed to update profile');
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

        {hasChanges && (
          <TouchableOpacity
            onPress={handleSave}
            disabled={isLoading}
            style={styles.saveButton}
          >
            <Text style={styles.saveButtonText}>
              {isLoading ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.pageTitle}>Account</Text>

        {/* Avatar Section */}
        <Section title="Avatar">
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(user?.name || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.avatarHint}>Tap to change avatar</Text>
          </View>
        </Section>

        {/* Profile Info Section */}
        <Section title="Profile">
          {/* Username Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Username</Text>
            <View style={styles.inputWrapper}>
              <View style={styles.inputIcon}>
                <AtSign size={18} color={theme.textTertiary} />
              </View>
              <TextInput
                placeholder="username"
                placeholderTextColor={theme.textTertiary}
                value={username}
                onChangeText={handleUsernameChange}
                autoCapitalize="none"
                autoCorrect={false}
                style={[
                  styles.textInput,
                  usernameError ? styles.inputError : isUsernameAvailable ? styles.inputSuccess : null
                ]}
              />
              <View style={styles.inputStatus}>
                {isCheckingUsername ? (
                  <ActivityIndicator size="small" color={theme.textTertiary} />
                ) : isUsernameAvailable === true ? (
                  <Check size={18} color={theme.success} />
                ) : isUsernameAvailable === false ? (
                  <X size={18} color={theme.error} />
                ) : null}
              </View>
            </View>
            {usernameError ? (
              <Text style={styles.errorText}>{usernameError}</Text>
            ) : (
              <Text style={styles.hintText}>
                3-20 characters, letters, numbers, and underscores only
              </Text>
            )}
          </View>

          {/* Name Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Display Name</Text>
            <View style={styles.inputWrapper}>
              <View style={styles.inputIcon}>
                <User size={18} color={theme.textTertiary} />
              </View>
              <TextInput
                placeholder="Your name"
                placeholderTextColor={theme.textTertiary}
                value={name}
                onChangeText={handleNameChange}
                style={styles.textInput}
              />
            </View>
          </View>

          {/* Email (Read-only) */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <View style={styles.readOnlyField}>
              <Mail size={18} color={theme.textTertiary} />
              <Text style={styles.readOnlyText}>{user?.email}</Text>
            </View>
            <Text style={styles.hintText}>Email cannot be changed</Text>
          </View>
        </Section>

        {/* Subscription Section */}
        <Section title="Subscription">
          <TouchableOpacity
            onPress={() => router.push('/settings/subscription')}
            style={styles.subscriptionRow}
          >
            <View>
              <Text style={styles.subscriptionTitle}>Current Plan</Text>
              <Text style={styles.subscriptionPlan}>
                {user?.subscription || 'Free'} Plan
              </Text>
            </View>
            <View style={styles.upgradeRow}>
              <View style={styles.upgradeBadge}>
                <Sparkles size={12} color={theme.primary} />
                <Text style={styles.upgradeText}>Upgrade</Text>
              </View>
              <ChevronRight size={18} color={theme.textTertiary} />
            </View>
          </TouchableOpacity>
        </Section>

        {/* Account Info */}
        <View style={styles.accountInfo}>
          <Text style={styles.accountInfoText}>
            Account created{' '}
            {user?.createdAt
              ? new Date(user.createdAt).toLocaleDateString()
              : 'Unknown'}
          </Text>
        </View>

        {/* Danger Zone */}
        <Section title="Danger Zone">
          <TouchableOpacity
            onPress={async () => {
              const confirmed = await alert.confirm(
                'Delete Account',
                'Are you sure you want to delete your account? This will permanently delete all your data including devices, projects, and sessions. This action cannot be undone.',
                { confirmText: 'Delete', destructive: true }
              );
              if (confirmed) {
                const confirmation = await alert.prompt(
                  'Confirm Deletion',
                  'Type "DELETE" to confirm account deletion:',
                  { placeholder: 'DELETE', confirmText: 'Confirm' }
                );
                if (confirmation?.toUpperCase() !== 'DELETE') {
                  if (confirmation !== null) {
                    alert.error('Error', 'Please type DELETE to confirm');
                  }
                  return;
                }

                setIsDeleting(true);
                try {
                  await deleteAccount();
                  router.replace('/(auth)/login');
                } catch (error) {
                  alert.error(
                    'Error',
                    error instanceof Error ? error.message : 'Failed to delete account'
                  );
                } finally {
                  setIsDeleting(false);
                }
              }
            }}
            disabled={isDeleting}
            style={styles.deleteButton}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color={theme.error} />
            ) : (
              <Trash2 size={18} color={theme.error} />
            )}
            <Text style={styles.deleteButtonText}>
              {isDeleting ? 'Deleting...' : 'Delete Account'}
            </Text>
          </TouchableOpacity>
        </Section>
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
    justifyContent: 'space-between',
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
  saveButton: {
    backgroundColor: theme.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
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
  // Avatar
  avatarContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
  },
  avatarHint: {
    color: theme.textTertiary,
    fontSize: 12,
  },
  // Inputs
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: theme.textTertiary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  inputWrapper: {
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: 14,
    top: '50%',
    transform: [{ translateY: -9 }],
    zIndex: 1,
  },
  textInput: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingLeft: 44,
    paddingRight: 44,
    paddingVertical: 14,
    color: theme.text,
    fontSize: 15,
  },
  inputError: {
    borderColor: theme.error,
  },
  inputSuccess: {
    borderColor: theme.success,
  },
  inputStatus: {
    position: 'absolute',
    right: 14,
    top: '50%',
    transform: [{ translateY: -9 }],
  },
  errorText: {
    color: theme.error,
    fontSize: 12,
    marginTop: 6,
  },
  hintText: {
    color: theme.textTertiary,
    fontSize: 12,
    marginTop: 6,
  },
  readOnlyField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  readOnlyText: {
    color: theme.textTertiary,
    marginLeft: 12,
    fontSize: 15,
  },
  // Subscription
  subscriptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subscriptionTitle: {
    color: theme.text,
    fontWeight: '600',
    fontSize: 15,
  },
  subscriptionPlan: {
    color: theme.textTertiary,
    fontSize: 14,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  upgradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  upgradeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.primary + '15',
    borderWidth: 1,
    borderColor: theme.primary + '30',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  upgradeText: {
    color: theme.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  // Account Info
  accountInfo: {
    marginVertical: 8,
  },
  accountInfoText: {
    color: theme.textTertiary,
    fontSize: 12,
    textAlign: 'center',
  },
  // Delete
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.error + '15',
    borderWidth: 1,
    borderColor: theme.error + '30',
    borderRadius: 10,
    paddingVertical: 14,
    gap: 8,
  },
  deleteButtonText: {
    color: theme.error,
    fontWeight: '700',
    fontSize: 15,
  },
});
