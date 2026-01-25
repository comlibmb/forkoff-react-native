import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native';
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
} from 'lucide-react-native';
import { colors } from '@/theme/colors';

export default function SecurityScreen() {
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  const handleChangePassword = () => {
    Alert.alert(
      'Change Password',
      'A password reset link will be sent to your email.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Link',
          onPress: () => {
            Alert.alert('Success', 'Password reset link sent to your email.');
          },
        },
      ]
    );
  };

  const handleToggle2FA = () => {
    if (twoFactorEnabled) {
      Alert.alert(
        'Disable 2FA',
        'Are you sure you want to disable two-factor authentication? This will make your account less secure.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: () => setTwoFactorEnabled(false),
          },
        ]
      );
    } else {
      Alert.alert(
        'Enable 2FA',
        'Two-factor authentication adds an extra layer of security to your account.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Enable',
            onPress: () => setTwoFactorEnabled(true),
          },
        ]
      );
    }
  };

  const handleToggleBiometric = () => {
    if (biometricEnabled) {
      setBiometricEnabled(false);
    } else {
      Alert.alert(
        'Enable Biometric',
        'Use Face ID or fingerprint to unlock the app.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Enable',
            onPress: () => setBiometricEnabled(true),
          },
        ]
      );
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
            className="flex-row items-center"
          >
            <View className="w-10 h-10 bg-dark-800 border border-dark-500 rounded-lg items-center justify-center mr-4">
              <Key size={20} color={colors.dark[200]} />
            </View>
            <View className="flex-1">
              <Text className="text-dark-50 font-medium">Change Password</Text>
              <Text className="text-dark-300 text-sm">
                Update your password regularly
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
            onPress={() => {
              Alert.alert(
                'Sign Out All Devices',
                'This will sign out all other devices. You will remain logged in on this device.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Sign Out All',
                    style: 'destructive',
                    onPress: () => {},
                  },
                ]
              );
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
    </SafeAreaView>
  );
}
