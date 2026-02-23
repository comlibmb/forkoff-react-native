import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { alert } from '@/components/ui/AlertModal';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, CameraView } from 'expo-camera';
import { X, CheckCircle, Flashlight, FlashlightOff, Keyboard, QrCode, ArrowLeft } from 'lucide-react-native';
import { useDeviceStore } from '@/stores/device.store';
import { useTheme } from '@/theme/ThemeProvider';
import { pairingService } from '@/services/pairing.service';
import { wsService } from '@/services/websocket.service';

/** Connect to relay and wait for the socket to actually be connected */
async function connectAndWait(timeoutMs = 10000): Promise<void> {
  wsService.disconnect();
  await wsService.connect();

  // If already connected, return immediately
  if (wsService.isConnected) return;

  // Otherwise wait for the 'connected' event
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      unsub();
      reject(new Error('Connection timed out. Check that CLI is running and you are on the same network.'));
    }, timeoutMs);

    const unsub = wsService.on('connected', () => {
      clearTimeout(timeout);
      unsub();
      resolve();
    });
  });
}

type PairMethod = 'qr' | 'code';

export default function PairDeviceScreen() {
  const { theme } = useTheme();
  const { pairDevice, isLoading } = useDeviceStore();
  const [method, setMethod] = useState<PairMethod>('qr');
  const [manualCode, setManualCode] = useState('');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [isPaired, setIsPaired] = useState(false);
  const [pairedDeviceName, setPairedDeviceName] = useState('');
  const [flashOn, setFlashOn] = useState(false);
  const [relayAddress, setRelayAddress] = useState('');

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
      // Parse URL: forkoff://pair/CODE or forkoff://pair/CODE?relay=ws://...
      let urlPath = data.replace('forkoff://pair/', '');
      let pairingCode = urlPath;
      let relayUrl: string | null = null;

      // Check for query params (relay URL embedded by CLI)
      const queryIndex = urlPath.indexOf('?');
      if (queryIndex !== -1) {
        pairingCode = urlPath.substring(0, queryIndex);
        const queryString = urlPath.substring(queryIndex + 1);
        const params = new URLSearchParams(queryString);
        const rawRelay = params.get('relay');
        if (rawRelay) {
          relayUrl = decodeURIComponent(rawRelay);
        }
      }

      // Validate pairing code format (alphanumeric, 6-36 chars)
      if (!/^[A-Za-z0-9_-]{6,36}$/.test(pairingCode)) {
        throw new Error('Invalid pairing code format');
      }

      // Set relay URL and connect to CLI's embedded server before pairing
      if (relayUrl) {
        await pairingService.setRelayUrl(relayUrl);
      }
      await connectAndWait();

      const device = await pairDevice(pairingCode);
      setPairedDeviceName(device.name);
      setIsPaired(true);
    } catch (error) {
      await alert.error('Pairing Failed', 'Invalid QR code or device not found. Please try again.');
      isProcessingRef.current = false;
      setScanned(false);
    }
  };

  const handleManualPair = async () => {
    if (manualCode.length < 8 || isLoading) {
      if (manualCode.length < 8) {
        alert.warning('Invalid Code', 'Please enter the 8-character pairing code.');
      }
      return;
    }

    const addr = relayAddress.trim();
    if (!addr) {
      alert.warning('Relay Address Required', 'Enter the relay address shown in your terminal (e.g., 192.168.1.5:3000).');
      return;
    }

    try {
      // Build relay URL from address (add ws:// if not present)
      let relayUrl = addr;
      if (!relayUrl.startsWith('ws://') && !relayUrl.startsWith('wss://')) {
        relayUrl = `ws://${relayUrl}`;
      }

      await pairingService.setRelayUrl(relayUrl);
      await connectAndWait();

      const device = await pairDevice(manualCode.toUpperCase());
      setPairedDeviceName(device.name);
      setIsPaired(true);
    } catch (error) {
      alert.error('Pairing Failed', 'Could not connect to CLI. Check the relay address and pairing code.');
    }
  };

  if (isPaired) {
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
              backgroundColor: theme.success + '33',
              shadowColor: theme.success,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.3,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            <CheckCircle size={56} color={theme.success} />
          </View>

          <Text style={{ fontSize: 24, fontWeight: '700', color: theme.text, textAlign: 'center', marginBottom: 16 }}>
            Device Paired!
          </Text>

          <Text style={{ color: theme.textSecondary, textAlign: 'center', fontSize: 16, marginBottom: 8 }}>
            Successfully connected to
          </Text>
          <Text style={{ color: theme.text, fontWeight: '700', fontSize: 20, marginBottom: 32 }}>
            {pairedDeviceName}
          </Text>

          <View style={{ width: '100%', gap: 16 }}>
            <TouchableOpacity
              onPress={() => {
                setIsPaired(false);
                setScanned(false);
              }}
              style={{ backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 16, alignItems: 'center' }}
            >
              <Text style={{ color: theme.text, fontWeight: '500' }}>Pair Another Device</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{
                backgroundColor: theme.primary,
                borderRadius: 12,
                padding: 16,
                alignItems: 'center',
                shadowColor: theme.primary,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.2,
                shadowRadius: 12,
                elevation: 5,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (hasPermission === null) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: theme.textSecondary }}>Requesting camera permission...</Text>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <View style={{ flex: 1, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: theme.text, fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 16 }}>
            Camera Permission Required
          </Text>
          <Text style={{ color: theme.textSecondary, textAlign: 'center', marginBottom: 24 }}>
            ForkOff needs camera access to scan QR codes for device pairing.
          </Text>
          <TouchableOpacity
            onPress={async () => {
              const { status } = await Camera.requestCameraPermissionsAsync();
              setHasPermission(status === 'granted');
            }}
            style={{
              backgroundColor: theme.primary,
              borderRadius: 12,
              paddingHorizontal: 24,
              paddingVertical: 16,
              marginBottom: 12,
              shadowColor: theme.primary,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.2,
              shadowRadius: 12,
              elevation: 5,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ paddingHorizontal: 24, paddingVertical: 12 }}
          >
            <Text style={{ color: theme.textSecondary, fontWeight: '500' }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Header */}
      <View style={{ backgroundColor: theme.background + 'F2', borderBottomWidth: 1, borderBottomColor: theme.border, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ flexDirection: 'row', alignItems: 'center' }}
        >
          <ArrowLeft size={24} color={theme.textSecondary} />
          <Text style={{ color: theme.textSecondary, marginLeft: 8, fontWeight: '500' }}>Back</Text>
        </TouchableOpacity>

        <Text style={{ color: theme.text, fontSize: 18, fontWeight: '700' }}>Pair Device</Text>

        {method === 'qr' ? (
          <TouchableOpacity
            onPress={() => setFlashOn(!flashOn)}
            style={{ width: 40, height: 40, backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.border, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}
          >
            {flashOn ? (
              <Flashlight size={20} color={theme.warning} />
            ) : (
              <FlashlightOff size={20} color={theme.textTertiary} />
            )}
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* Method Toggle */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 16, flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity
          onPress={() => setMethod('qr')}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            paddingVertical: 12,
            borderRadius: 12,
            borderWidth: 1,
            backgroundColor: method === 'qr' ? theme.primary + '1A' : theme.backgroundSecondary,
            borderColor: method === 'qr' ? theme.primary : theme.border,
          }}
        >
          <QrCode size={18} color={method === 'qr' ? theme.primary : theme.textTertiary} />
          <Text
            style={{
              fontWeight: '500',
              color: method === 'qr' ? theme.primary : theme.textSecondary,
            }}
          >
            Scan QR
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setMethod('code')}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            paddingVertical: 12,
            borderRadius: 12,
            borderWidth: 1,
            backgroundColor: method === 'code' ? theme.primary + '1A' : theme.backgroundSecondary,
            borderColor: method === 'code' ? theme.primary : theme.border,
          }}
        >
          <Keyboard size={18} color={method === 'code' ? theme.primary : theme.textTertiary} />
          <Text
            style={{
              fontWeight: '500',
              color: method === 'code' ? theme.primary : theme.textSecondary,
            }}
          >
            Enter Code
          </Text>
        </TouchableOpacity>
      </View>

      {method === 'qr' ? (
        <View style={{ flex: 1, paddingHorizontal: 16, paddingBottom: 16 }}>
          <View style={{ flex: 1, borderRadius: 16, overflow: 'hidden', position: 'relative', borderWidth: 1, borderColor: theme.border }}>
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
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 256, height: 256, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 16 }}>
                <View style={{ position: 'absolute', top: 0, left: 0, width: 32, height: 32, borderTopWidth: 4, borderLeftWidth: 4, borderColor: theme.primary, borderTopLeftRadius: 16 }} />
                <View style={{ position: 'absolute', top: 0, right: 0, width: 32, height: 32, borderTopWidth: 4, borderRightWidth: 4, borderColor: theme.primary, borderTopRightRadius: 16 }} />
                <View style={{ position: 'absolute', bottom: 0, left: 0, width: 32, height: 32, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: theme.primary, borderBottomLeftRadius: 16 }} />
                <View style={{ position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderBottomWidth: 4, borderRightWidth: 4, borderColor: theme.primary, borderBottomRightRadius: 16 }} />
              </View>
            </View>

            {isLoading && (
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: theme.text, fontSize: 18, fontWeight: '500' }}>Pairing device...</Text>
              </View>
            )}
          </View>

          {/* Instructions */}
          <View style={{ backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 16, marginTop: 16 }}>
            <Text style={{ color: theme.textSecondary, fontSize: 14, textAlign: 'center' }}>
              On your computer, run:{'\n'}
              <Text style={{ color: theme.primary, fontFamily: 'monospace' }}>forkoff pair</Text>
              {'\n'}and scan the QR code that appears
            </Text>
          </View>
        </View>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: 16, paddingBottom: 16 }}>
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: '700', marginBottom: 8 }}>Enter Pairing Code</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 14, marginBottom: 24 }}>
              Enter the 8-character code shown in your terminal
            </Text>

            <TextInput
              value={manualCode}
              onChangeText={(text) => setManualCode(text.toUpperCase())}
              placeholder="e.g., ABC12345"
              placeholderTextColor={theme.textTertiary}
              maxLength={8}
              autoCapitalize="characters"
              autoCorrect={false}
              style={{
                backgroundColor: theme.backgroundSecondary,
                borderWidth: 1,
                borderColor: theme.border,
                color: theme.text,
                fontSize: 24,
                fontFamily: 'monospace',
                textAlign: 'center',
                paddingVertical: 16,
                paddingHorizontal: 24,
                borderRadius: 12,
                letterSpacing: 4,
                marginBottom: 16,
              }}
            />

            <Text style={{ color: theme.textSecondary, fontSize: 14, marginBottom: 8 }}>Relay Address</Text>
            <TextInput
              value={relayAddress}
              onChangeText={setRelayAddress}
              placeholder="e.g., 192.168.1.5:3000"
              placeholderTextColor={theme.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              style={{
                backgroundColor: theme.backgroundSecondary,
                borderWidth: 1,
                borderColor: theme.border,
                color: theme.text,
                fontSize: 16,
                fontFamily: 'monospace',
                textAlign: 'center',
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 12,
                marginBottom: 24,
              }}
            />

            <TouchableOpacity
              onPress={handleManualPair}
              disabled={manualCode.length < 8 || isLoading}
              style={{
                backgroundColor: theme.primary,
                borderRadius: 12,
                padding: 16,
                alignItems: 'center',
                shadowColor: theme.primary,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.2,
                shadowRadius: 12,
                elevation: 5,
                opacity: manualCode.length < 8 || isLoading ? 0.5 : 1,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>
                {isLoading ? 'Pairing...' : 'Pair Device'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Instructions */}
          <View style={{ backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 16 }}>
            <Text style={{ color: theme.textSecondary, fontSize: 14, textAlign: 'center' }}>
              On your computer, run:{'\n'}
              <Text style={{ color: theme.primary, fontFamily: 'monospace' }}>forkoff pair</Text>
              {'\n'}Enter the code and relay address shown in your terminal
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
