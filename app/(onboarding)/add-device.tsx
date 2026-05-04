import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { alert } from '@/components/ui/AlertModal';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, QrCode, Keyboard, CheckCircle, ArrowRight } from 'lucide-react-native';
import { useDeviceStore } from '@/stores/device.store';
import { useTheme } from '@/theme/ThemeProvider';
import { pairingService } from '@/services/pairing.service';
import { wsService } from '@/services/websocket.service';

async function connectAndWait(timeoutMs = 10000): Promise<void> {
  wsService.disconnect();
  await wsService.connect();
  if (wsService.isConnected) return;
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

type AddMethod = 'qr' | 'code';

export default function AddDeviceScreen() {
  const { theme } = useTheme();
  const { pairDevice, isLoading, devices } = useDeviceStore();
  const [method, setMethod] = useState<AddMethod>('qr');
  const [pairingCode, setPairingCode] = useState('');
  const [relayAddress, setRelayAddress] = useState('');
  const [isPaired, setIsPaired] = useState(false);
  const deviceCountOnMount = useRef(devices.length);

  // Detect if a device was paired via the pair screen (user navigated back)
  useEffect(() => {
    if (!isPaired && devices.length > deviceCountOnMount.current) {
      setIsPaired(true);
    }
  }, [devices.length, isPaired]);

  const handlePairWithCode = async () => {
    if (!pairingCode.trim()) {
      alert.error('Error', 'Please enter a pairing code');
      return;
    }

    try {
      const addr = relayAddress.trim();

      if (addr) {
        let relayUrl = addr;
        if (!relayUrl.startsWith('ws://') && !relayUrl.startsWith('wss://')) {
          relayUrl = `ws://${relayUrl}`;
        }
        await pairingService.setRelayUrl(relayUrl);
      } else {
        // No relay address — try tunnel URL from Supabase via pairing code
        const tunnelUrl = await wsService.fetchTunnelUrlByPairingCode(pairingCode.toUpperCase());
        if (tunnelUrl) {
          let wsUrl = tunnelUrl;
          if (wsUrl.startsWith('https://')) {
            wsUrl = wsUrl.replace('https://', 'wss://');
          } else if (wsUrl.startsWith('http://')) {
            wsUrl = wsUrl.replace('http://', 'ws://');
          }
          await pairingService.setRelayUrl(wsUrl);
        } else {
          await pairingService.setRelayUrl(null);
        }
      }

      wsService.disconnect();
      await wsService.connect();

      if (!wsService.isConnected) {
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            unsub();
            reject(new Error('Connection timed out'));
          }, 10000);
          const unsub = wsService.on('connected', () => {
            clearTimeout(timeout);
            unsub();
            resolve();
          });
        });
      }

      await pairDevice(pairingCode.toUpperCase());
      setIsPaired(true);
    } catch (error: any) {
      const msg = error?.message || String(error);
      alert.error('Pairing Failed', msg);
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
            Device Paired!
          </Text>

          <Text style={{ color: theme.textSecondary, textAlign: 'center', fontSize: 16, marginBottom: 32 }}>
            Your device has been successfully connected to ForkOff
          </Text>

          <View style={{ width: '100%', gap: 16 }}>
            <TouchableOpacity
              onPress={() => {
                setIsPaired(false);
                setPairingCode('');
              }}
              style={{
                backgroundColor: theme.backgroundSecondary,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 12,
                padding: 16,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: theme.text, fontWeight: '500' }}>Add Another Device</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.replace('/(tabs)')}
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
              <Text style={{ color: theme.textInverse, fontWeight: 'bold', fontSize: 16 }}>Continue</Text>
              <ArrowRight size={18} color={theme.textInverse} />
            </TouchableOpacity>
          </View>
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

        <Text style={{ fontSize: 30, fontWeight: 'bold', color: theme.text, marginBottom: 8 }}>Add Device</Text>
        <Text style={{ fontSize: 16, color: theme.textSecondary, marginBottom: 32 }}>
          Connect your computer to control it remotely
        </Text>

        {/* Method Selector */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 32 }}>
          <TouchableOpacity
            onPress={() => setMethod('qr')}
            style={{
              flex: 1,
              padding: 16,
              borderRadius: 12,
              borderWidth: 1,
              backgroundColor: method === 'qr' ? theme.primaryBackground : theme.backgroundSecondary,
              borderColor: method === 'qr' ? theme.primary : theme.border,
            }}
          >
            <QrCode
              size={32}
              color={method === 'qr' ? theme.primary : theme.textTertiary}
            />
            <Text
              style={{
                marginTop: 8,
                fontWeight: 'bold',
                color: method === 'qr' ? theme.primary : theme.textSecondary,
              }}
            >
              Scan QR Code
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setMethod('code')}
            style={{
              flex: 1,
              padding: 16,
              borderRadius: 12,
              borderWidth: 1,
              backgroundColor: method === 'code' ? theme.primaryBackground : theme.backgroundSecondary,
              borderColor: method === 'code' ? theme.primary : theme.border,
            }}
          >
            <Keyboard
              size={32}
              color={method === 'code' ? theme.primary : theme.textTertiary}
            />
            <Text
              style={{
                marginTop: 8,
                fontWeight: 'bold',
                color: method === 'code' ? theme.primary : theme.textSecondary,
              }}
            >
              Enter Code
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content based on method */}
        {method === 'qr' ? (
          <View>
            <View style={{ backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 24 }}>
              <View style={{ alignItems: 'center' }}>
                <View
                  style={{
                    width: 192,
                    height: 192,
                    backgroundColor: theme.background,
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16,
                  }}
                >
                  <QrCode size={64} color={theme.textTertiary} />
                  <Text style={{ color: theme.textTertiary, marginTop: 16, textAlign: 'center', fontSize: 14 }}>
                    Camera access required
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => router.push('/device/pair')}
                  style={{
                    backgroundColor: theme.primary,
                    borderRadius: 12,
                    padding: 16,
                    width: '100%',
                    alignItems: 'center',
                    shadowColor: theme.primary,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.2,
                    shadowRadius: 12,
                    elevation: 5,
                  }}
                >
                  <Text style={{ color: theme.textInverse, fontWeight: 'bold' }}>Open Camera</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ marginTop: 24, backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 16 }}>
              <Text style={{ color: theme.textSecondary, fontSize: 14, textAlign: 'center' }}>
                First, install ForkOff CLI:{'\n'}
                <Text style={{ color: theme.primary, fontFamily: 'monospace' }}>
                  npm i -g forkoff
                </Text>
                {'\n\n'}Then run:{'\n'}
                <Text style={{ color: theme.primary, fontFamily: 'monospace' }}>
                  forkoff pair
                </Text>
              </Text>
            </View>
          </View>
        ) : (
          <View style={{ backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 24 }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: theme.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 24 }}>
                Enter the pairing code shown in your terminal after running{'\n'}
                <Text style={{ color: theme.primary, fontFamily: 'monospace' }}>forkoff pair</Text>
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/device/pair?method=code')}
                style={{
                  backgroundColor: theme.primary,
                  borderRadius: 12,
                  padding: 16,
                  width: '100%',
                  alignItems: 'center',
                  shadowColor: theme.primary,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.2,
                  shadowRadius: 12,
                  elevation: 5,
                }}
              >
                <Text style={{ color: theme.textInverse, fontWeight: 'bold' }}>Enter Pairing Code</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Skip */}
        <TouchableOpacity
          onPress={() => router.replace('/(tabs)')}
          style={{ marginTop: 'auto', padding: 16, paddingBottom: 32, alignItems: 'center' }}
        >
          <Text style={{ color: theme.textTertiary, fontWeight: '500' }}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
