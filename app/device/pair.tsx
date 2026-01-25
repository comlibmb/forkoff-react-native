import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, TextInput } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, CameraView } from 'expo-camera';
import { X, CheckCircle, Flashlight, FlashlightOff, Keyboard, QrCode, ArrowLeft } from 'lucide-react-native';
import { useDeviceStore } from '@/stores/device.store';
import { colors } from '@/theme/colors';

type PairMethod = 'qr' | 'code';

export default function PairDeviceScreen() {
  const { pairDevice, isLoading } = useDeviceStore();
  const [method, setMethod] = useState<PairMethod>('qr');
  const [manualCode, setManualCode] = useState('');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [isPaired, setIsPaired] = useState(false);
  const [pairedDeviceName, setPairedDeviceName] = useState('');
  const [flashOn, setFlashOn] = useState(false);

  const isProcessingRef = useRef(false);

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };

    getCameraPermissions();
  }, []);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (isProcessingRef.current || scanned || isLoading) return;
    isProcessingRef.current = true;
    setScanned(true);

    try {
      const pairingCode = data.replace('forkoff://pair/', '');
      const device = await pairDevice(pairingCode);
      setPairedDeviceName(device.name);
      setIsPaired(true);
    } catch (error) {
      Alert.alert('Pairing Failed', 'Invalid QR code or device not found. Please try again.', [
        {
          text: 'Try Again',
          onPress: () => {
            isProcessingRef.current = false;
            setScanned(false);
          },
        },
      ]);
    }
  };

  const handleManualPair = async () => {
    if (manualCode.length < 8 || isLoading) {
      if (manualCode.length < 8) {
        Alert.alert('Invalid Code', 'Please enter the 8-character pairing code.');
      }
      return;
    }

    try {
      const device = await pairDevice(manualCode.toUpperCase());
      setPairedDeviceName(device.name);
      setIsPaired(true);
    } catch (error) {
      Alert.alert('Pairing Failed', 'Invalid pairing code or device not found. Please try again.');
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

          <Text className="text-dark-200 text-center text-base mb-2">
            Successfully connected to
          </Text>
          <Text className="text-dark-50 font-bold text-xl mb-8">
            {pairedDeviceName}
          </Text>

          <View className="w-full gap-4">
            <TouchableOpacity
              onPress={() => {
                setIsPaired(false);
                setScanned(false);
              }}
              className="bg-dark-700 border border-dark-500 rounded-xl p-4 items-center"
            >
              <Text className="text-dark-50 font-medium">Pair Another Device</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.back()}
              className="bg-primary-500 rounded-xl p-4 items-center"
              style={{
                shadowColor: colors.primary[500],
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.2,
                shadowRadius: 12,
                elevation: 5,
              }}
            >
              <Text className="text-white font-bold">Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (hasPermission === null) {
    return (
      <SafeAreaView className="flex-1 bg-dark-800 items-center justify-center">
        <Text className="text-dark-200">Requesting camera permission...</Text>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView className="flex-1 bg-dark-800">
        <View className="flex-1 px-6 items-center justify-center">
          <Text className="text-dark-50 text-xl font-bold text-center mb-4">
            Camera Permission Required
          </Text>
          <Text className="text-dark-200 text-center mb-6">
            ForkOff needs camera access to scan QR codes for device pairing.
          </Text>
          <TouchableOpacity
            onPress={async () => {
              const { status } = await Camera.requestCameraPermissionsAsync();
              setHasPermission(status === 'granted');
            }}
            className="bg-primary-500 rounded-xl px-6 py-4 mb-3"
            style={{
              shadowColor: colors.primary[500],
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.2,
              shadowRadius: 12,
              elevation: 5,
            }}
          >
            <Text className="text-white font-bold">Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.back()}
            className="px-6 py-3"
          >
            <Text className="text-dark-200 font-medium">Cancel</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-dark-800">
      {/* Header */}
      <View className="bg-dark-800/95 border-b border-dark-500 px-4 pb-4 pt-2 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center"
        >
          <ArrowLeft size={24} color={colors.dark[200]} />
          <Text className="text-dark-200 ml-2 font-medium">Back</Text>
        </TouchableOpacity>

        <Text className="text-dark-50 text-lg font-bold">Pair Device</Text>

        {method === 'qr' ? (
          <TouchableOpacity
            onPress={() => setFlashOn(!flashOn)}
            className="w-10 h-10 bg-dark-700 border border-dark-500 rounded-lg items-center justify-center"
          >
            {flashOn ? (
              <Flashlight size={20} color={colors.warning[300]} />
            ) : (
              <FlashlightOff size={20} color={colors.dark[300]} />
            )}
          </TouchableOpacity>
        ) : (
          <View className="w-10" />
        )}
      </View>

      {/* Method Toggle */}
      <View className="px-4 py-4 flex-row gap-2">
        <TouchableOpacity
          onPress={() => setMethod('qr')}
          className={`flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl border ${
            method === 'qr'
              ? 'bg-primary-500/10 border-primary-500'
              : 'bg-dark-700 border-dark-500'
          }`}
        >
          <QrCode size={18} color={method === 'qr' ? colors.primary[500] : colors.dark[300]} />
          <Text
            className={`font-medium ${
              method === 'qr' ? 'text-primary-500' : 'text-dark-200'
            }`}
          >
            Scan QR
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setMethod('code')}
          className={`flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl border ${
            method === 'code'
              ? 'bg-primary-500/10 border-primary-500'
              : 'bg-dark-700 border-dark-500'
          }`}
        >
          <Keyboard size={18} color={method === 'code' ? colors.primary[500] : colors.dark[300]} />
          <Text
            className={`font-medium ${
              method === 'code' ? 'text-primary-500' : 'text-dark-200'
            }`}
          >
            Enter Code
          </Text>
        </TouchableOpacity>
      </View>

      {method === 'qr' ? (
        <View className="flex-1 px-4 pb-4">
          <View className="flex-1 rounded-2xl overflow-hidden relative border border-dark-500">
            <CameraView
              style={StyleSheet.absoluteFillObject}
              facing="back"
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
              enableTorch={flashOn}
            />

            {/* Overlay */}
            <View className="absolute inset-0 items-center justify-center">
              <View className="w-64 h-64 border-2 border-white/30 rounded-2xl">
                <View className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary-500 rounded-tl-2xl" />
                <View className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary-500 rounded-tr-2xl" />
                <View className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary-500 rounded-bl-2xl" />
                <View className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary-500 rounded-br-2xl" />
              </View>
            </View>

            {isLoading && (
              <View className="absolute inset-0 bg-dark-900/80 items-center justify-center">
                <Text className="text-dark-50 text-lg font-medium">Pairing device...</Text>
              </View>
            )}
          </View>

          {/* Instructions */}
          <View className="bg-dark-700 border border-dark-500 rounded-xl p-4 mt-4">
            <Text className="text-dark-200 text-sm text-center">
              On your computer, run:{'\n'}
              <Text className="text-primary-500 font-mono">forkoff pair</Text>
              {'\n'}and scan the QR code that appears
            </Text>
          </View>
        </View>
      ) : (
        <View className="flex-1 px-4 pb-4">
          <View className="flex-1 justify-center">
            <Text className="text-dark-50 text-lg font-bold mb-2">Enter Pairing Code</Text>
            <Text className="text-dark-200 text-sm mb-6">
              Enter the 8-character code shown in your terminal
            </Text>

            <TextInput
              value={manualCode}
              onChangeText={(text) => setManualCode(text.toUpperCase())}
              placeholder="e.g., ABC12345"
              placeholderTextColor={colors.dark[400]}
              maxLength={8}
              autoCapitalize="characters"
              autoCorrect={false}
              className="bg-dark-700 border border-dark-500 text-dark-50 text-2xl font-mono text-center py-4 px-6 rounded-xl tracking-widest mb-6"
            />

            <TouchableOpacity
              onPress={handleManualPair}
              disabled={manualCode.length < 8 || isLoading}
              className="bg-primary-500 rounded-xl p-4 items-center"
              style={{
                shadowColor: colors.primary[500],
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.2,
                shadowRadius: 12,
                elevation: 5,
                opacity: manualCode.length < 8 || isLoading ? 0.5 : 1,
              }}
            >
              <Text className="text-white font-bold">
                {isLoading ? 'Pairing...' : 'Pair Device'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Instructions */}
          <View className="bg-dark-700 border border-dark-500 rounded-xl p-4">
            <Text className="text-dark-200 text-sm text-center">
              On your computer, run:{'\n'}
              <Text className="text-primary-500 font-mono">forkoff pair</Text>
              {'\n'}and enter the code shown below the QR code
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
