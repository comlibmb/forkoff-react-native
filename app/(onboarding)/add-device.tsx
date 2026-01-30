import { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { alert } from '@/components/ui/AlertModal';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, QrCode, Keyboard, CheckCircle, ArrowRight } from 'lucide-react-native';
import { useDeviceStore } from '@/stores/device.store';
import { colors } from '@/theme/colors';

type AddMethod = 'qr' | 'code';

export default function AddDeviceScreen() {
  const { pairDevice, isLoading } = useDeviceStore();
  const [method, setMethod] = useState<AddMethod>('qr');
  const [pairingCode, setPairingCode] = useState('');
  const [isPaired, setIsPaired] = useState(false);

  const handlePairWithCode = async () => {
    if (!pairingCode.trim()) {
      alert.error('Error', 'Please enter a pairing code');
      return;
    }

    try {
      await pairDevice(pairingCode);
      setIsPaired(true);
    } catch (error) {
      alert.error('Error', 'Failed to pair device. Please try again.');
    }
  };

  if (isPaired) {
    return (
      <SafeAreaView className="flex-1 bg-dark-800">
        <View className="flex-1 px-6 items-center justify-center">
          <View
            className="w-24 h-24 rounded-full items-center justify-center mb-6"
            style={{
              backgroundColor: colors.success[500] + '20',
              shadowColor: colors.success[500],
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.3,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            <CheckCircle size={56} color={colors.success[500]} />
          </View>

          <Text className="text-2xl font-bold text-dark-50 text-center mb-4">
            Device Paired!
          </Text>

          <Text className="text-dark-200 text-center text-base mb-8">
            Your device has been successfully connected to ForkOff
          </Text>

          <View className="w-full gap-4">
            <TouchableOpacity
              onPress={() => {
                setIsPaired(false);
                setPairingCode('');
              }}
              className="bg-dark-700 border border-dark-500 rounded-xl p-4 items-center"
            >
              <Text className="text-dark-50 font-medium">Add Another Device</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/(onboarding)/connect-github')}
              className="bg-primary-500 rounded-xl p-4 flex-row items-center justify-center gap-2"
              style={{
                shadowColor: colors.primary[500],
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.2,
                shadowRadius: 12,
                elevation: 5,
              }}
            >
              <Text className="text-white font-bold text-base">Continue</Text>
              <ArrowRight size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-dark-800">
      <View className="flex-1 px-6 pt-4 pb-8">
        {/* Header */}
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center mb-6"
        >
          <ArrowLeft size={24} color={colors.dark[200]} />
          <Text className="text-dark-200 ml-2 font-medium">Back</Text>
        </TouchableOpacity>

        <Text className="text-3xl font-bold text-dark-50 mb-2">Add Device</Text>
        <Text className="text-base text-dark-200 mb-8">
          Connect your computer to control it remotely
        </Text>

        {/* Method Selector */}
        <View className="flex-row gap-3 mb-8">
          <TouchableOpacity
            onPress={() => setMethod('qr')}
            className={`flex-1 p-4 rounded-xl border ${
              method === 'qr'
                ? 'bg-primary-500/10 border-primary-500'
                : 'bg-dark-700 border-dark-500'
            }`}
          >
            <QrCode
              size={32}
              color={method === 'qr' ? colors.primary[500] : colors.dark[300]}
            />
            <Text
              className={`mt-2 font-bold ${
                method === 'qr' ? 'text-primary-500' : 'text-dark-200'
              }`}
            >
              Scan QR Code
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setMethod('code')}
            className={`flex-1 p-4 rounded-xl border ${
              method === 'code'
                ? 'bg-primary-500/10 border-primary-500'
                : 'bg-dark-700 border-dark-500'
            }`}
          >
            <Keyboard
              size={32}
              color={method === 'code' ? colors.primary[500] : colors.dark[300]}
            />
            <Text
              className={`mt-2 font-bold ${
                method === 'code' ? 'text-primary-500' : 'text-dark-200'
              }`}
            >
              Enter Code
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content based on method */}
        {method === 'qr' ? (
          <View className="flex-1">
            <View className="bg-dark-700 border border-dark-500 rounded-xl p-6">
              <View className="items-center">
                <View className="w-48 h-48 bg-dark-800 border border-dark-500 rounded-xl items-center justify-center mb-4">
                  <QrCode size={64} color={colors.dark[400]} />
                  <Text className="text-dark-300 mt-4 text-center text-sm">
                    Camera access required
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => router.push('/device/pair')}
                  className="bg-primary-500 rounded-xl p-4 w-full items-center"
                  style={{
                    shadowColor: colors.primary[500],
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.2,
                    shadowRadius: 12,
                    elevation: 5,
                  }}
                >
                  <Text className="text-white font-bold">Open Camera</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View className="mt-6 bg-dark-700 border border-dark-500 rounded-xl p-4">
              <Text className="text-dark-200 text-sm text-center">
                On your computer, run:{'\n'}
                <Text className="text-primary-500 font-mono">
                  npx forkoff pair
                </Text>
              </Text>
            </View>
          </View>
        ) : (
          <View className="flex-1">
            <View className="mb-4">
              <Text className="text-dark-200 text-xs font-bold uppercase tracking-wider mb-2">
                Pairing Code
              </Text>
              <TextInput
                placeholder="e.g., ABC12345"
                placeholderTextColor={colors.dark[400]}
                value={pairingCode}
                onChangeText={(text) => setPairingCode(text.toUpperCase())}
                autoCapitalize="characters"
                maxLength={8}
                className="bg-dark-700 border border-dark-500 rounded-xl px-4 py-4 text-dark-50 text-lg font-mono text-center tracking-widest"
              />
            </View>

            <View className="mb-6 bg-dark-700 border border-dark-500 rounded-xl p-4">
              <Text className="text-dark-200 text-sm text-center">
                On your computer, run:{'\n'}
                <Text className="text-primary-500 font-mono">
                  forkoff pair
                </Text>
                {'\n'}and enter the code shown
              </Text>
            </View>

            <TouchableOpacity
              onPress={handlePairWithCode}
              disabled={pairingCode.length !== 8 || isLoading}
              className="bg-primary-500 rounded-xl p-4 items-center"
              style={{
                shadowColor: colors.primary[500],
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.2,
                shadowRadius: 12,
                elevation: 5,
                opacity: pairingCode.length !== 8 || isLoading ? 0.5 : 1,
              }}
            >
              <Text className="text-white font-bold">
                {isLoading ? 'Pairing...' : 'Pair Device'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Skip */}
        <TouchableOpacity
          onPress={() => router.push('/(onboarding)/connect-github')}
          className="mt-4 p-4 items-center"
        >
          <Text className="text-dark-300 font-medium">Skip for now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
