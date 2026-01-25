import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Smartphone, Cpu, GitBranch, Terminal, ArrowRight } from 'lucide-react-native';
import { colors } from '@/theme/colors';

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
  return (
    <SafeAreaView className="flex-1 bg-dark-800">
      <View className="flex-1 px-6 pt-8 pb-8">
        {/* Logo & Title */}
        <View className="items-center mb-12">
          <View
            className="w-20 h-20 rounded-2xl items-center justify-center mb-6"
            style={{
              backgroundColor: colors.primary[500],
              shadowColor: colors.primary[500],
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.3,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            <Text className="text-white text-4xl font-bold">F</Text>
          </View>
          <Text className="text-3xl font-bold text-dark-50 text-center mb-2">
            Welcome to ForkOff
          </Text>
          <Text className="text-base text-dark-200 text-center">
            Your AI coding companion in your pocket
          </Text>
        </View>

        {/* Features */}
        <View className="flex-1">
          {features.map((feature, index) => (
            <View
              key={index}
              className="flex-row items-center mb-4 bg-dark-700 border border-dark-500 rounded-xl p-4"
            >
              <View className="w-12 h-12 bg-dark-800 border border-dark-500 rounded-xl items-center justify-center mr-4">
                <feature.icon size={24} color={colors.primary[500]} />
              </View>
              <View className="flex-1">
                <Text className="text-dark-50 font-bold text-base">
                  {feature.title}
                </Text>
                <Text className="text-dark-200 text-sm">{feature.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Actions */}
        <View className="gap-4">
          <TouchableOpacity
            onPress={() => router.push('/(onboarding)/add-device')}
            className="bg-primary-500 rounded-xl p-4 flex-row items-center justify-center gap-2"
            style={{
              shadowColor: colors.primary[500],
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.2,
              shadowRadius: 12,
              elevation: 5,
            }}
          >
            <Text className="text-white font-bold text-base">Add Your First Device</Text>
            <ArrowRight size={18} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.replace('/(tabs)')}
            className="bg-dark-700 border border-dark-500 rounded-xl p-4 items-center"
          >
            <Text className="text-dark-200 font-medium">Skip for now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
