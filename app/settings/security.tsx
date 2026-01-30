import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Modal, TextInput, ActivityIndicator } from 'react-native';
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
import { colors } from '@/theme/colors';

export default function SecurityScreen() {
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

  const handleChangePassword = () => {
    setShowChangePasswordModal(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
  };

  const handleSubmitPasswordChange = async () => {
    // Validate
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

  return (
    <SafeAreaView className="flex-1 bg-dark-800" edges={['top']}>
      {/* Header */}
      <View className="bg-dark-800/95 border-b border-dark-500 px-4 pb-4 pt-2 flex-row items-center">
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center"
        >
          <ArrowLeft size={24} color={colors.dark[200]} />
          <Text className="text-dark-200 ml-2 font-medium">Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4" contentContainerClassName="py-4 pb-8">
        <Text className="text-dark-50 text-2xl font-bold mb-2">Security</Text>
        <Text className="text-dark-200 mb-6">
          Manage your account security settings
        </Text>

        {/* Password Section */}
        <View className="bg-dark-700 border border-dark-500 rounded-xl p-4 mb-4">
          <TouchableOpacity
            onPress={handleChangePassword}
            className="flex-row items-center mb-3 pb-3 border-b border-dark-600"
          >
            <View className="w-10 h-10 bg-dark-800 border border-dark-500 rounded-lg items-center justify-center mr-4">
              <Key size={20} color={colors.dark[200]} />
            </View>
            <View className="flex-1">
              <Text className="text-dark-50 font-medium">Change Password</Text>
              <Text className="text-dark-300 text-sm">
                Update your password
              </Text>
            </View>
            <ChevronRight size={20} color={colors.dark[400]} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSendResetLink}
            className="flex-row items-center"
          >
            <View className="w-10 h-10 bg-dark-800 border border-dark-500 rounded-lg items-center justify-center mr-4">
              <Key size={20} color={colors.primary[400]} />
            </View>
            <View className="flex-1">
              <Text className="text-dark-50 font-medium">Reset via Email</Text>
              <Text className="text-dark-300 text-sm">
                Send reset link to {user?.email}
              </Text>
            </View>
            <ChevronRight size={20} color={colors.dark[400]} />
          </TouchableOpacity>
        </View>

        {/* Two-Factor Authentication */}
        <View className="bg-dark-700 border border-dark-500 rounded-xl p-4 mb-4">
          <View className="flex-row items-center">
            <View className="w-10 h-10 bg-dark-800 border border-dark-500 rounded-lg items-center justify-center mr-4">
              <Smartphone size={20} color={colors.dark[200]} />
            </View>
            <View className="flex-1">
              <Text className="text-dark-50 font-medium">
                Two-Factor Authentication
              </Text>
              <Text className="text-dark-300 text-sm">
                {twoFactorEnabled ? 'Enabled' : 'Add extra security layer'}
              </Text>
            </View>
            <Switch
              value={twoFactorEnabled}
              onValueChange={handleToggle2FA}
              trackColor={{
                false: colors.dark[500],
                true: colors.primary[500],
              }}
              thumbColor={twoFactorEnabled ? '#fff' : colors.dark[200]}
            />
          </View>
        </View>

        {/* Biometric Authentication */}
        <View className="bg-dark-700 border border-dark-500 rounded-xl p-4 mb-4">
          <View className="flex-row items-center">
            <View className="w-10 h-10 bg-dark-800 border border-dark-500 rounded-lg items-center justify-center mr-4">
              <Fingerprint size={20} color={colors.dark[200]} />
            </View>
            <View className="flex-1">
              <Text className="text-dark-50 font-medium">
                Biometric Authentication
              </Text>
              <Text className="text-dark-300 text-sm">
                {biometricEnabled
                  ? 'Face ID / Fingerprint enabled'
                  : 'Use biometrics to unlock'}
              </Text>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={handleToggleBiometric}
              trackColor={{
                false: colors.dark[500],
                true: colors.primary[500],
              }}
              thumbColor={biometricEnabled ? '#fff' : colors.dark[200]}
            />
          </View>
        </View>

        {/* Active Sessions */}
        <View className="mt-6">
          <Text className="text-dark-300 text-xs font-bold uppercase tracking-wider mb-3">
            Active Sessions
          </Text>

          <View className="bg-dark-700 border border-dark-500 rounded-xl p-4 mb-3">
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-success-500/10 border border-success-500/20 rounded-lg items-center justify-center mr-4">
                <Shield size={20} color={colors.success[500]} />
              </View>
              <View className="flex-1">
                <Text className="text-dark-50 font-medium">Current Device</Text>
                <Text className="text-dark-300 text-sm">
                  iPhone 15 Pro • Active now
                </Text>
              </View>
              <View className="bg-success-500/10 border border-success-500/20 px-2 py-1 rounded">
                <Text className="text-success-500 text-xs font-bold">Current</Text>
              </View>
            </View>
          </View>

          <View className="bg-dark-700 border border-dark-500 rounded-xl p-4 mb-3">
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-dark-800 border border-dark-500 rounded-lg items-center justify-center mr-4">
                <Smartphone size={20} color={colors.dark[300]} />
              </View>
              <View className="flex-1">
                <Text className="text-dark-50 font-medium">MacBook Pro</Text>
                <Text className="text-dark-300 text-sm">
                  Last active 2 hours ago
                </Text>
              </View>
              <TouchableOpacity>
                <Text className="text-error-300 text-sm font-medium">Revoke</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Sign Out All Devices */}
        <View className="mt-6">
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
            className="bg-dark-700 border border-dark-500 rounded-xl p-4 items-center"
          >
            <Text className="text-dark-50 font-medium">Sign Out All Other Devices</Text>
          </TouchableOpacity>
        </View>

        {/* Security Tips */}
        <View className="mt-6 bg-warning-300/10 border border-warning-300/20 rounded-xl p-4 flex-row">
          <AlertTriangle size={20} color={colors.warning[300]} />
          <View className="flex-1 ml-3">
            <Text className="text-warning-300 font-bold mb-1">
              Security Tip
            </Text>
            <Text className="text-dark-200 text-sm">
              Enable two-factor authentication and use a strong, unique password
              to keep your account secure.
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
        <SafeAreaView className="flex-1 bg-dark-800">
          {/* Modal Header */}
          <View className="flex-row items-center justify-between px-4 py-4 border-b border-dark-600">
            <TouchableOpacity onPress={() => setShowChangePasswordModal(false)}>
              <X size={24} color={colors.dark[300]} />
            </TouchableOpacity>
            <Text className="text-dark-50 text-lg font-bold">Change Password</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView className="flex-1 px-4 py-6">
            {/* Current Password */}
            <View className="mb-4">
              <Text className="text-dark-300 text-sm font-medium mb-2">Current Password</Text>
              <View className="relative">
                <TextInput
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry={!showCurrentPassword}
                  placeholder="Enter current password"
                  placeholderTextColor={colors.dark[400]}
                  className="bg-dark-700 border border-dark-500 rounded-xl px-4 py-4 pr-12 text-dark-50"
                />
                <TouchableOpacity
                  onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                >
                  {showCurrentPassword ? (
                    <EyeOff size={20} color={colors.dark[400]} />
                  ) : (
                    <Eye size={20} color={colors.dark[400]} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* New Password */}
            <View className="mb-4">
              <Text className="text-dark-300 text-sm font-medium mb-2">New Password</Text>
              <View className="relative">
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPassword}
                  placeholder="Enter new password (min 6 characters)"
                  placeholderTextColor={colors.dark[400]}
                  className="bg-dark-700 border border-dark-500 rounded-xl px-4 py-4 pr-12 text-dark-50"
                />
                <TouchableOpacity
                  onPress={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                >
                  {showNewPassword ? (
                    <EyeOff size={20} color={colors.dark[400]} />
                  ) : (
                    <Eye size={20} color={colors.dark[400]} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password */}
            <View className="mb-6">
              <Text className="text-dark-300 text-sm font-medium mb-2">Confirm New Password</Text>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showNewPassword}
                placeholder="Confirm new password"
                placeholderTextColor={colors.dark[400]}
                className="bg-dark-700 border border-dark-500 rounded-xl px-4 py-4 text-dark-50"
              />
            </View>

            {/* Error Message */}
            {passwordError ? (
              <View className="bg-error-300/10 border border-error-300/20 rounded-xl p-3 mb-4">
                <Text className="text-error-300 text-sm">{passwordError}</Text>
              </View>
            ) : null}

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleSubmitPasswordChange}
              disabled={isChangingPassword}
              className={`py-4 rounded-xl items-center ${
                isChangingPassword ? 'bg-primary-600/50' : 'bg-primary-600'
              }`}
            >
              {isChangingPassword ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text className="text-white font-bold text-base">Change Password</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
