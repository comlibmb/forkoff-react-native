import { View, Text, TouchableOpacity, Image, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Eye, ShieldCheck, MonitorSmartphone, Lock, ListChecks, ArrowRight } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';

const features = [
  {
    icon: Eye,
    title: 'Watch Claude Think',
    description: 'Stream reasoning, code edits, and actions live',
  },
  {
    icon: ShieldCheck,
    title: 'Approve from Anywhere',
    description: 'Review and approve file changes and commands on the go',
  },
  {
    icon: MonitorSmartphone,
    title: 'All Your Machines',
    description: 'Connect multiple workstations and switch between them',
  },
  {
    icon: ListChecks,
    title: 'Track Task Progress',
    description: 'See what Claude is working on and how far along it is',
  },
  {
    icon: Lock,
    title: 'End-to-End Encryption',
    description: 'Your code and sessions stay private and secure',
  },
];

export default function WelcomeScreen() {
  const { theme } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 }}>
        {/* Logo & Title */}
        <View style={{ alignItems: 'center', marginBottom: 40, marginTop: -10 }}>
          <View
            style={{
              width: 100,
              height: 100,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
            }}
          >
            <Image
              source={require('@/assets/logo.png')}
              style={{ width: 140, height: 140 }}
              resizeMode="contain"
            />
          </View>
          <Text style={{ fontSize: 28, fontWeight: '800', color: theme.text, textAlign: 'center', marginBottom: 8, marginTop: -40 }}>
            Welcome to ForkOff
          </Text>
          <Text style={{ fontSize: 15, color: theme.textSecondary, textAlign: 'center', lineHeight: 22 }}>
            Your AI coding sessions, controlled{'\n'}from your pocket
          </Text>
        </View>

        {/* Features */}
        <View style={{ gap: 12, marginTop: -10, marginBottom: 'auto' }}>
          {features.map((feature, index) => (
            <View
              key={index}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: theme.backgroundSecondary,
                borderRadius: 14,
                padding: 16,
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  backgroundColor: theme.primary + '15',
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 14,
                }}
              >
                <feature.icon size={22} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontWeight: '600', fontSize: 15, marginBottom: 2 }}>
                  {feature.title}
                </Text>
                <Text style={{ color: theme.textTertiary, fontSize: 13 }}>{feature.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Actions */}
        <View style={{ gap: 12, paddingTop: 27 }}>
          <TouchableOpacity
            onPress={() => router.push('/(onboarding)/add-device')}
            activeOpacity={0.8}
            style={{
              backgroundColor: theme.primary,
              borderRadius: 14,
              paddingVertical: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Get Started</Text>
            <ArrowRight size={18} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.replace('/(tabs)')}
            activeOpacity={0.7}
            style={{
              paddingVertical: 14,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: theme.textTertiary, fontSize: 14 }}>I'll set up later</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
