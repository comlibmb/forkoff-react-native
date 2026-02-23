import { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { alert } from '@/components/ui/AlertModal';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Smartphone, Trash2, Shield, Copy, Check } from 'lucide-react-native';
import { useIdentityStore } from '@/stores/identity.store';
import { useDeviceStore } from '@/stores/device.store';
import { useTheme } from '@/theme/ThemeProvider';
import * as Clipboard from 'expo-clipboard';

export default function AccountScreen() {
  const { theme } = useTheme();
  const { mobileDeviceId, pairedDevices, removePairedDevice, unpairAll } = useIdentityStore();
  const { devices, removeDevice } = useDeviceStore();
  const [copiedId, setCopiedId] = useState(false);

  const styles = useMemo(() => createStyles(theme), [theme]);

  const handleCopyDeviceId = async () => {
    if (mobileDeviceId) {
      await Clipboard.setStringAsync(mobileDeviceId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleRemoveDevice = async (deviceId: string, deviceName: string) => {
    const confirmed = await alert.confirm(
      'Remove Device',
      `Remove "${deviceName}" from your paired devices? You will need to re-pair to reconnect.`,
      { confirmText: 'Remove', destructive: true }
    );
    if (confirmed) {
      await removePairedDevice(deviceId);
      await removeDevice(deviceId);
    }
  };

  const handleUnpairAll = async () => {
    const confirmed = await alert.confirm(
      'Unpair All Devices',
      'Remove all paired devices and reset your identity? This cannot be undone.',
      { confirmText: 'Unpair All', destructive: true }
    );
    if (confirmed) {
      await unpairAll();
      router.replace('/(onboarding)');
    }
  };

  function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <View style={styles.section}>
        {title && <Text style={styles.sectionTitle}>{title}</Text>}
        <View style={styles.sectionCard}>
          <View style={styles.sectionContent}>{children}</View>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={theme.textSecondary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.pageTitle}>Device Identity</Text>

        {/* Device ID Section */}
        <Section title="Mobile Device ID">
          <TouchableOpacity onPress={handleCopyDeviceId} style={styles.deviceIdRow}>
            <View style={styles.deviceIdInfo}>
              <Shield size={18} color={theme.primary} />
              <Text style={styles.deviceIdText} numberOfLines={1}>
                {mobileDeviceId || 'Not initialized'}
              </Text>
            </View>
            {copiedId ? (
              <Check size={18} color={theme.success} />
            ) : (
              <Copy size={18} color={theme.textTertiary} />
            )}
          </TouchableOpacity>
          <Text style={styles.hintText}>
            Your unique device identity, stored securely on this device. Tap to copy.
          </Text>
        </Section>

        {/* Paired Devices Section */}
        <Section title={`Paired Devices (${pairedDevices.length})`}>
          {pairedDevices.length === 0 ? (
            <Text style={styles.emptyText}>No devices paired yet</Text>
          ) : (
            pairedDevices.map((device, index) => {
              const liveDevice = devices.find((d) => d.id === device.id);
              return (
                <View key={device.id}>
                  {index > 0 && <View style={styles.divider} />}
                  <View style={styles.pairedDeviceRow}>
                    <View style={styles.pairedDeviceIcon}>
                      <Smartphone size={20} color={theme.textSecondary} />
                    </View>
                    <View style={styles.pairedDeviceInfo}>
                      <Text style={styles.pairedDeviceName}>{device.name}</Text>
                      <Text style={styles.pairedDeviceMeta}>
                        {device.platform} — {liveDevice?.status === 'online' ? 'Online' : 'Offline'}
                      </Text>
                      <Text style={styles.pairedDeviceDate}>
                        Paired {new Date(device.pairedAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRemoveDevice(device.id, device.name)}
                      style={styles.removeButton}
                    >
                      <Trash2 size={16} color={theme.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </Section>

        {/* Security Info */}
        <Section title="Security">
          <View style={styles.securityInfo}>
            <Shield size={16} color={theme.primary} />
            <Text style={styles.securityText}>
              All communication between your phone and paired devices is end-to-end encrypted.
              Your device ID and encryption keys are stored in the device's secure hardware keychain.
            </Text>
          </View>
        </Section>

        {/* Danger Zone */}
        {pairedDevices.length > 0 && (
          <Section title="Danger Zone">
            <TouchableOpacity onPress={handleUnpairAll} style={styles.deleteButton}>
              <Trash2 size={18} color={theme.error} />
              <Text style={styles.deleteButtonText}>Unpair All Devices</Text>
            </TouchableOpacity>
          </Section>
        )}
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
    justifyContent: 'space-between',
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
    textTransform: 'uppercase',
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
  deviceIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deviceIdInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  deviceIdText: {
    color: theme.text,
    fontFamily: 'monospace',
    fontSize: 13,
    flex: 1,
  },
  hintText: {
    color: theme.textTertiary,
    fontSize: 12,
    marginTop: 10,
  },
  emptyText: {
    color: theme.textTertiary,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 16,
  },
  pairedDeviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  pairedDeviceIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: theme.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  pairedDeviceInfo: {
    flex: 1,
  },
  pairedDeviceName: {
    color: theme.text,
    fontWeight: '600',
    fontSize: 15,
  },
  pairedDeviceMeta: {
    color: theme.textSecondary,
    fontSize: 12,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  pairedDeviceDate: {
    color: theme.textTertiary,
    fontSize: 11,
    marginTop: 2,
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: theme.error + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: theme.divider,
    marginLeft: 52,
  },
  securityInfo: {
    flexDirection: 'row',
    gap: 10,
  },
  securityText: {
    color: theme.textSecondary,
    fontSize: 13,
    flex: 1,
    lineHeight: 20,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.error + '15',
    borderWidth: 1,
    borderColor: theme.error + '30',
    borderRadius: 10,
    paddingVertical: 14,
    gap: 8,
  },
  deleteButtonText: {
    color: theme.error,
    fontWeight: '700',
    fontSize: 15,
  },
});
