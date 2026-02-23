import { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { alert } from '@/components/ui/AlertModal';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Server, Check, X, RotateCw, Trash2, Shield } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { pairingService } from '@/services/pairing.service';
import { wsService } from '@/services/websocket.service';

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

export default function RelaySettingsScreen() {
  const { theme } = useTheme();
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [inputUrl, setInputUrl] = useState('');
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testError, setTestError] = useState('');
  const [loading, setLoading] = useState(true);

  const styles = useMemo(() => createStyles(theme), [theme]);

  const defaultUrl = process.env.EXPO_PUBLIC_WS_URL || 'wss://api.forkoff.app';

  useEffect(() => {
    pairingService.getRelayUrl().then((url) => {
      setCurrentUrl(url);
      setInputUrl(url || '');
      setLoading(false);
    });
  }, []);

  const handleTestConnection = async () => {
    const url = inputUrl.trim();
    if (!url) return;

    setTestStatus('testing');
    setTestError('');

    try {
      // Normalize URL for health check: ws(s):// -> http(s)://
      let healthUrl = url
        .replace(/^wss:\/\//, 'https://')
        .replace(/^ws:\/\//, 'http://');
      // Remove trailing slash
      healthUrl = healthUrl.replace(/\/$/, '');
      healthUrl += '/health';

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(healthUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      if (data.status !== 'ok') {
        throw new Error('Server health check failed');
      }

      setTestStatus('success');
    } catch (error) {
      setTestStatus('error');
      const msg = (error as Error).message;
      if (msg.includes('abort')) {
        setTestError('Connection timed out (8s)');
      } else {
        setTestError(msg);
      }
    }
  };

  const handleSave = async () => {
    const url = inputUrl.trim();
    if (!url) return;

    try {
      await pairingService.setRelayUrl(url);
      setCurrentUrl(url);

      // Reconnect with new URL
      wsService.disconnect();
      setTimeout(() => wsService.connect(), 500);

      await alert.show('Relay Updated', 'Reconnecting to the new relay server...', [
        { text: 'OK', style: 'default' },
      ]);
    } catch (error) {
      await alert.show('Invalid URL', (error as Error).message, [
        { text: 'OK', style: 'default' },
      ]);
    }
  };

  const handleReset = async () => {
    const confirmed = await alert.confirm(
      'Reset to Default',
      `Switch back to the default relay server?\n\n${defaultUrl}`,
      { confirmText: 'Reset' }
    );
    if (confirmed) {
      await pairingService.setRelayUrl(null);
      setCurrentUrl(null);
      setInputUrl('');
      setTestStatus('idle');
      setTestError('');

      // Reconnect with default URL
      wsService.disconnect();
      setTimeout(() => wsService.connect(), 500);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ActivityIndicator size="large" color={theme.primary} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  const isCustom = currentUrl !== null;
  const hasChanges = inputUrl.trim() !== (currentUrl || '');
  const canSave = inputUrl.trim().length > 0 && hasChanges;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.textSecondary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.pageTitle}>Relay Server</Text>

        {/* Current Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CURRENT SERVER</Text>
          <View style={styles.sectionCard}>
            <View style={styles.sectionContent}>
              <View style={styles.statusRow}>
                <Server size={18} color={isCustom ? theme.warning : theme.primary} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.statusLabel}>
                    {isCustom ? 'Custom Relay' : 'Default Relay'}
                  </Text>
                  <Text style={styles.statusUrl} numberOfLines={1}>
                    {currentUrl || defaultUrl}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Custom URL Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CUSTOM RELAY URL</Text>
          <View style={styles.sectionCard}>
            <View style={styles.sectionContent}>
              <TextInput
                style={styles.urlInput}
                value={inputUrl}
                onChangeText={(text) => {
                  setInputUrl(text);
                  setTestStatus('idle');
                  setTestError('');
                }}
                placeholder="wss://your-relay.example.com"
                placeholderTextColor={theme.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />

              {/* Test Result */}
              {testStatus === 'success' && (
                <View style={[styles.testResult, { backgroundColor: theme.success + '15' }]}>
                  <Check size={16} color={theme.success} />
                  <Text style={[styles.testResultText, { color: theme.success }]}>
                    Connection successful
                  </Text>
                </View>
              )}
              {testStatus === 'error' && (
                <View style={[styles.testResult, { backgroundColor: theme.error + '15' }]}>
                  <X size={16} color={theme.error} />
                  <Text style={[styles.testResultText, { color: theme.error }]}>
                    {testError || 'Connection failed'}
                  </Text>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  onPress={handleTestConnection}
                  disabled={!inputUrl.trim() || testStatus === 'testing'}
                  style={[
                    styles.testButton,
                    { borderColor: theme.border },
                    (!inputUrl.trim() || testStatus === 'testing') && { opacity: 0.4 },
                  ]}
                >
                  {testStatus === 'testing' ? (
                    <ActivityIndicator size="small" color={theme.primary} />
                  ) : (
                    <RotateCw size={16} color={theme.primary} />
                  )}
                  <Text style={[styles.testButtonText, { color: theme.primary }]}>
                    Test
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSave}
                  disabled={!canSave}
                  style={[
                    styles.saveButton,
                    { backgroundColor: theme.primary },
                    !canSave && { opacity: 0.4 },
                  ]}
                >
                  <Text style={styles.saveButtonText}>Save & Connect</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Reset to Default */}
        {isCustom && (
          <View style={styles.section}>
            <View style={styles.sectionCard}>
              <View style={styles.sectionContent}>
                <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
                  <Trash2 size={16} color={theme.error} />
                  <Text style={[styles.resetButtonText, { color: theme.error }]}>
                    Reset to Default Relay
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Info */}
        <View style={styles.section}>
          <View style={styles.sectionCard}>
            <View style={styles.sectionContent}>
              <View style={styles.infoRow}>
                <Shield size={16} color={theme.primary} />
                <Text style={styles.infoText}>
                  The relay server only forwards encrypted messages between your devices.
                  It cannot read your code or session data thanks to end-to-end encryption.
                  Self-host your own relay for full control.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.backgroundTertiary,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    color: theme.textSecondary,
    marginLeft: 8,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 20,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: theme.textTertiary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: theme.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    overflow: 'hidden',
  },
  sectionContent: {
    padding: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusLabel: {
    color: theme.text,
    fontWeight: '600',
    fontSize: 15,
  },
  statusUrl: {
    color: theme.textSecondary,
    fontFamily: 'monospace',
    fontSize: 12,
    marginTop: 2,
  },
  urlInput: {
    backgroundColor: theme.backgroundSecondary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.text,
    fontFamily: 'monospace',
    fontSize: 14,
  },
  testResult: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  testResultText: {
    fontSize: 13,
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  testButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  saveButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  resetButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 10,
  },
  infoText: {
    color: theme.textSecondary,
    fontSize: 13,
    flex: 1,
    lineHeight: 20,
  },
});
