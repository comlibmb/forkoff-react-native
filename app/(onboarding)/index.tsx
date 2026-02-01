import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Smartphone, Cpu, GitBranch, Terminal, ArrowRight } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';

const features = [
  {
    icon: Smartphone,
    title: 'Remote Control',
    description: 'Control your AI coding tools from anywhere',
  },
  {
    icon: Cpu,
    title: 'Multi-Device',
    description: 'Connect and manage multiple workstations',
  },
  {
    icon: Terminal,
    title: 'Terminal Access',
    description: 'Run commands and manage Claude sessions',
  },
  {
    icon: GitBranch,
    title: 'GitHub Integration',
    description: 'Clone repos and manage branches on the go',
  },
];

export default function WelcomeScreen() {
  const { theme } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 32, paddingBottom: 32 }}>
        {/* Logo & Title */}
        <View style={{ alignItems: 'center', marginBottom: 48 }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
              backgroundColor: theme.primary,
              shadowColor: theme.primary,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.3,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            <Text style={{ color: theme.textInverse, fontSize: 36, fontWeight: 'bold' }}>F</Text>
          </View>
          <Text style={{ fontSize: 30, fontWeight: 'bold', color: theme.text, textAlign: 'center', marginBottom: 8 }}>
            Welcome to ForkOff
          </Text>
          <Text style={{ fontSize: 16, color: theme.textSecondary, textAlign: 'center' }}>
            Your AI coding companion in your pocket
          </Text>
        </View>

        {/* Features */}
        <View style={{ flex: 1 }}>
          {features.map((feature, index) => (
            <View
              key={index}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 16,
                backgroundColor: theme.backgroundSecondary,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 12,
                padding: 16,
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  backgroundColor: theme.background,
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 16,
                }}
              >
                <feature.icon size={24} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 16 }}>
                  {feature.title}
                </Text>
                <Text style={{ color: theme.textSecondary, fontSize: 14 }}>{feature.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Actions */}
        <View style={{ gap: 16 }}>
          <TouchableOpacity
            onPress={() => router.push('/(onboarding)/add-device')}
            style={{
              backgroundColor: theme.primary,
              borderRadius: 12,
              padding: 16,
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
            <Text style={{ color: theme.textInverse, fontWeight: 'bold', fontSize: 16 }}>Add Your First Device</Text>
            <ArrowRight size={18} color={theme.textInverse} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.replace('/(tabs)')}
            style={{
              backgroundColor: theme.backgroundSecondary,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 12,
              padding: 16,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: theme.textSecondary, fontWeight: '500' }}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
