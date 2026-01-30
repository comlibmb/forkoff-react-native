import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { alert } from '@/components/ui/AlertModal';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Mail, User, AtSign, Sparkles, ChevronRight, Trash2, Check, X } from 'lucide-react-native';
import { useAuthStore } from '@/stores/auth.store';
import { colors } from '@/theme/colors';

export default function AccountScreen() {
  const { user, updateProfile, deleteAccount, validateUsername, checkUsernameAvailability, isLoading } = useAuthStore();
  const [isDeleting, setIsDeleting] = useState(false);

  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

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

  return (
    <SafeAreaView className="flex-1 bg-dark-800" edges={['top']}>
      {/* Header */}
      <View className="bg-dark-800/95 border-b border-dark-500 px-4 pb-4 pt-2 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center"
        >
          <ArrowLeft size={24} color={colors.dark[200]} />
          <Text className="text-dark-200 ml-2 font-medium">Back</Text>
        </TouchableOpacity>

        {hasChanges && (
          <TouchableOpacity
            onPress={handleSave}
            disabled={isLoading}
            className="bg-primary-500 px-4 py-2 rounded-full"
          >
            <Text className="text-white font-medium text-sm">
              {isLoading ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView className="flex-1 px-4" contentContainerClassName="py-4 pb-8">
        <Text className="text-dark-50 text-2xl font-bold mb-6">Account</Text>

        {/* Initials Avatar */}
        <View className="items-center mb-8">
          <View
            className="w-24 h-24 rounded-full items-center justify-center"
            style={{ backgroundColor: colors.primary[600] }}
          >
            <Text className="text-white text-3xl font-bold">
              {(user?.name || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Profile Info */}
        <View className="bg-dark-700 border border-dark-500 rounded-xl p-4 mb-6">
          {/* Username Input */}
          <View className="mb-4">
            <Text className="text-dark-300 text-xs font-bold uppercase tracking-wider mb-2">
              Username
            </Text>
            <View className="relative">
              <View className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                <AtSign size={18} color={colors.dark[300]} />
              </View>
              <TextInput
                placeholder="username"
                placeholderTextColor={colors.dark[400]}
                value={username}
                onChangeText={handleUsernameChange}
                autoCapitalize="none"
                autoCorrect={false}
                className={`bg-dark-800 border rounded-xl pl-12 pr-12 py-4 text-dark-50 ${
                  usernameError ? 'border-error-300' : isUsernameAvailable ? 'border-success-500' : 'border-dark-500'
                }`}
              />
              <View className="absolute right-4 top-1/2 -translate-y-1/2">
                {isCheckingUsername ? (
                  <ActivityIndicator size="small" color={colors.dark[300]} />
                ) : isUsernameAvailable === true ? (
                  <Check size={18} color={colors.success[500]} />
                ) : isUsernameAvailable === false ? (
                  <X size={18} color={colors.error[300]} />
                ) : null}
              </View>
            </View>
            {usernameError ? (
              <Text className="text-error-300 text-xs mt-2">{usernameError}</Text>
            ) : (
              <Text className="text-dark-400 text-xs mt-2">
                3-20 characters, letters, numbers, and underscores only
              </Text>
            )}
          </View>

          {/* Name Input */}
          <View className="mb-4">
            <Text className="text-dark-300 text-xs font-bold uppercase tracking-wider mb-2">
              Display Name
            </Text>
            <View className="relative">
              <View className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                <User size={18} color={colors.dark[300]} />
              </View>
              <TextInput
                placeholder="Your name"
                placeholderTextColor={colors.dark[400]}
                value={name}
                onChangeText={handleNameChange}
                className="bg-dark-800 border border-dark-500 rounded-xl pl-12 pr-4 py-4 text-dark-50"
              />
            </View>
          </View>

          {/* Email (Read-only) */}
          <View>
            <Text className="text-dark-300 text-xs font-bold uppercase tracking-wider mb-2">
              Email
            </Text>
            <View className="flex-row items-center bg-dark-800 border border-dark-500 rounded-xl px-4 py-4">
              <Mail size={18} color={colors.dark[300]} />
              <Text className="text-dark-300 ml-3">{user?.email}</Text>
            </View>
            <Text className="text-dark-400 text-xs mt-2">
              Email cannot be changed
            </Text>
          </View>
        </View>

        {/* Subscription */}
        <TouchableOpacity
          onPress={() => router.push('/settings/subscription')}
          className="bg-dark-700 border border-dark-500 rounded-xl p-4 mb-6"
        >
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-dark-50 font-medium">Subscription</Text>
              <Text className="text-dark-300 text-sm capitalize">
                {user?.subscription || 'Free'} Plan
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <View className="bg-primary-500/10 border border-primary-500/20 px-3 py-1 rounded-full flex-row items-center gap-1.5">
                <Sparkles size={12} color={colors.primary[500]} />
                <Text className="text-primary-500 text-xs font-bold">Upgrade</Text>
              </View>
              <ChevronRight size={18} color={colors.dark[400]} />
            </View>
          </View>
        </TouchableOpacity>

        {/* Account Created */}
        <View className="mb-8">
          <Text className="text-dark-400 text-xs text-center">
            Account created{' '}
            {user?.createdAt
              ? new Date(user.createdAt).toLocaleDateString()
              : 'Unknown'}
          </Text>
        </View>

        {/* Danger Zone */}
        <View className="pt-6 border-t border-dark-500">
          <Text className="text-dark-300 text-xs font-bold uppercase tracking-wider mb-3">
            Danger Zone
          </Text>
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
            className="bg-error-300/10 border border-error-300/20 rounded-xl p-4 flex-row items-center justify-center gap-2"
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color={colors.error[300]} />
            ) : (
              <Trash2 size={18} color={colors.error[300]} />
            )}
            <Text className="text-error-300 font-bold">
              {isDeleting ? 'Deleting...' : 'Delete Account'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
