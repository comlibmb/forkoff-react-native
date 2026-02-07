import { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { alert } from '@/components/ui/AlertModal';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle, ArrowRight, Users } from 'lucide-react-native';
import { useReferralStore } from '@/stores/referral.store';
import { useTheme } from '@/theme/ThemeProvider';

export default function ReferralCodeScreen() {
  const { theme } = useTheme();
  const { applyReferralCode } = useReferralStore();
  const [code, setCode] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [isApplied, setIsApplied] = useState(false);

  const handleApplyCode = async () => {
    if (!code.trim()) {
      alert.error('Error', 'Please enter a referral code');
      return;
    }

    setIsApplying(true);
    try {
      const result = await applyReferralCode(code);
      if (result.success) {
        setIsApplied(true);
      } else {
        alert.error('Invalid Code', result.message || 'This referral code is not valid.');
      }
    } catch (error) {
      alert.error('Error', 'Failed to apply referral code. Please try again.');
    } finally {
      setIsApplying(false);
    }
  };

  if (isApplied) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <View style={{ flex: 1, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' }}>
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
              backgroundColor: theme.success + '20',
              shadowColor: theme.success,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.3,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            <CheckCircle size={56} color={theme.success} />
          </View>

          <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.text, textAlign: 'center', marginBottom: 16 }}>
            Referral Applied!
          </Text>

          <Text style={{ color: theme.textSecondary, textAlign: 'center', fontSize: 16, marginBottom: 32 }}>
            You're all set. Welcome to ForkOff!
          </Text>

          <TouchableOpacity
            onPress={() => router.replace('/(tabs)')}
            style={{
              backgroundColor: theme.primary,
              borderRadius: 12,
              padding: 16,
              width: '100%',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              shadowColor: theme.primary,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.2,
              shadowRadius: 12,
              elevation: 5,
            }}
          >
            <Text style={{ color: theme.textInverse, fontWeight: 'bold', fontSize: 16 }}>Get Started</Text>
            <ArrowRight size={18} color={theme.textInverse} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32 }}>
        {/* Header */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}
        >
          <ArrowLeft size={24} color={theme.textSecondary} />
          <Text style={{ color: theme.textSecondary, marginLeft: 8, fontWeight: '500' }}>Back</Text>
        </TouchableOpacity>

        <Text style={{ fontSize: 30, fontWeight: 'bold', color: theme.text, marginBottom: 8 }}>
          Got a referral code?
        </Text>
        <Text style={{ fontSize: 16, color: theme.textSecondary, marginBottom: 32 }}>
          If a friend invited you, enter their code to get started
        </Text>

        {/* Referral Code Input */}
        <View style={{ flex: 1 }}>
          <View
            style={{
              backgroundColor: theme.backgroundSecondary,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 12,
              padding: 24,
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                backgroundColor: theme.background,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 32,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <Users size={32} color={theme.textSecondary} />
            </View>

            <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              Referral Code
            </Text>
            <TextInput
              placeholder="e.g., ABC12345"
              placeholderTextColor={theme.textTertiary}
              value={code}
              onChangeText={(text) => setCode(text.toUpperCase())}
              autoCapitalize="characters"
              maxLength={8}
              style={{
                backgroundColor: theme.background,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 16,
                color: theme.text,
                fontSize: 18,
                fontFamily: 'monospace',
                textAlign: 'center',
                letterSpacing: 4,
                width: '100%',
              }}
            />
          </View>

          <TouchableOpacity
            onPress={handleApplyCode}
            disabled={code.length !== 8 || isApplying}
            style={{
              backgroundColor: theme.primary,
              borderRadius: 12,
              padding: 16,
              alignItems: 'center',
              marginTop: 24,
              shadowColor: theme.primary,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.2,
              shadowRadius: 12,
              elevation: 5,
              opacity: code.length !== 8 || isApplying ? 0.5 : 1,
            }}
          >
            <Text style={{ color: theme.textInverse, fontWeight: 'bold', fontSize: 16 }}>
              {isApplying ? 'Applying...' : 'Apply Code'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Skip */}
        <TouchableOpacity
          onPress={() => router.replace('/(tabs)')}
          style={{ marginTop: 16, padding: 16, alignItems: 'center' }}
        >
          <Text style={{ color: theme.textTertiary, fontWeight: '500' }}>Skip</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
