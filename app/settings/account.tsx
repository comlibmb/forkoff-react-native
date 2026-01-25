import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Camera, Mail, User, Sparkles, ChevronRight, Trash2 } from 'lucide-react-native';
import { useAuthStore } from '@/stores/auth.store';
import { colors } from '@/theme/colors';

export default function AccountScreen() {
  const { user, updateProfile, isLoading } = useAuthStore();

  const [name, setName] = useState(user?.name || '');
  const [hasChanges, setHasChanges] = useState(false);

  const handleNameChange = (text: string) => {
    setName(text);
    setHasChanges(text !== user?.name);
  };

  const handleSave = async () => {
    if (!hasChanges) return;

    try {
      await updateProfile({ name });
      Alert.alert('Success', 'Profile updated successfully');
      setHasChanges(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
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

        {/* Avatar */}
        <View className="items-center mb-8">
          <TouchableOpacity className="relative">
            <View
              className="w-24 h-24 rounded-full items-center justify-center"
              style={{
                borderWidth: 2,
                borderColor: 'transparent',
                backgroundImage: 'linear-gradient(135deg, #8b5cf6 0%, #238636 100%)',
              }}
            >
              <View className="w-[88px] h-[88px] rounded-full bg-dark-800 items-center justify-center">
                <Text className="text-dark-50 text-2xl font-bold">
                  {getInitials(user?.name || 'User')}
                </Text>
              </View>
            </View>
            <View className="absolute bottom-0 right-0 w-8 h-8 bg-dark-700 border border-dark-500 rounded-full items-center justify-center">
              <Camera size={14} color={colors.dark[200]} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity className="mt-3">
            <Text className="text-primary-500 font-medium">Change Photo</Text>
          </TouchableOpacity>
        </View>

        {/* Profile Info */}
        <View className="bg-dark-700 border border-dark-500 rounded-xl p-4 mb-6">
          {/* Name Input */}
          <View className="mb-4">
            <Text className="text-dark-300 text-xs font-bold uppercase tracking-wider mb-2">
              Name
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
            onPress={() => {
              Alert.alert(
                'Delete Account',
                'Are you sure you want to delete your account? This action cannot be undone.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                      // Handle account deletion
                    },
                  },
                ]
              );
            }}
            className="bg-error-300/10 border border-error-300/20 rounded-xl p-4 flex-row items-center justify-center gap-2"
          >
            <Trash2 size={18} color={colors.error[300]} />
            <Text className="text-error-300 font-bold">Delete Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
