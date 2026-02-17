import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { alert } from '@/components/ui/AlertModal';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Laptop,
  Monitor,
  Server,
  RefreshCw,
  Trash2,
  Edit3,
  Wifi,
  Clock,
  Cpu,
  Check,
  X,
  Terminal,
  Plus,
  ChevronRight,
  Activity,
} from 'lucide-react-native';
import { useDeviceStore } from '@/stores/device.store';
import { useTerminalStore } from '@/stores/terminal.store';
import { useClaudeStore } from '@/stores/claude.store';
import { wsService } from '@/services/websocket.service';
import { ConnectedTool } from '@/types';
import { useTheme } from '@/theme/ThemeProvider';

const deviceTypeIcons: Record<string, typeof Laptop> = {
  laptop: Laptop,
  desktop: Monitor,
  server: Server,
  LAPTOP: Laptop,
  DESKTOP: Monitor,
  SERVER: Server,
};

export default function DeviceDetailScreen() {
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getDevice, renameDevice, removeDevice, refreshDeviceStatus, isLoading } =
    useDeviceStore();
  const { terminals, addTerminal } = useTerminalStore();
  const { sessions } = useClaudeStore();

  const device = getDevice(id);

  // Check if any Claude session is active for this device
  const deviceSessions = sessions.get(id) || [];
  const hasActiveClaudeSession = deviceSessions.some(s => s.state?.toLowerCase() === 'active');
  const deviceTerminals = terminals.filter(t => t.deviceId === id);
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(device?.name || '');

  const isOnline = device?.status?.toLowerCase() === 'online' || device?.status?.toLowerCase() === 'syncing';

  const handleOpenTerminal = () => {
    const terminalId = `terminal-${id}-${Date.now()}`;
    const initialCwd = '~';

    addTerminal({
      id: terminalId,
      deviceId: id,
      projectId: '',
      name: `Terminal - ${device?.name || 'Device'}`,
      cwd: initialCwd,
      isActive: true,
      output: [],
    });

    wsService.subscribeToTerminal(terminalId);
    wsService.createTerminalSession(terminalId, id, initialCwd);

    router.push(`/terminal/${terminalId}`);
  };

  useEffect(() => {
    if (device) {
      setNewName(device.name);
    }
  }, [device]);

  if (!device) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center' }}>
        <Laptop size={48} color={theme.textTertiary} />
        <Text style={{ color: theme.textSecondary, fontSize: 18, marginTop: 16 }}>Device not found</Text>
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/devices');
            }
          }}
          style={{ marginTop: 16, backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 9999 }}
        >
          <Text style={{ color: theme.text, fontWeight: '500' }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const Icon = deviceTypeIcons[device.type] || Laptop;

  const handleRename = async () => {
    if (newName.trim() && newName !== device.name) {
      try {
        await renameDevice(device.id, newName.trim());
      } catch (error) {
        alert.error('Error', 'Failed to rename device');
      }
    }
    setIsEditing(false);
  };

  const handleRemove = async () => {
    const confirmed = await alert.confirm(
      'Remove Device',
      `Are you sure you want to remove "${device.name}"? This will disconnect all tools.`,
      { confirmText: 'Remove', destructive: true }
    );
    if (confirmed) {
      try {
        await removeDevice(device.id);
        router.back();
      } catch (error) {
        alert.error('Error', 'Failed to remove device');
      }
    }
  };

  const formatLastSeen = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const handleToolPress = (tool: ConnectedTool) => {
    const toolType = tool.type.toLowerCase();
    if (toolType === 'claude_code' || toolType === 'claude-code' || toolType === 'claude_terminal') {
      router.push(`/tool/claude/${device.id}` as any);
    }
  };

  const ToolCard = ({ tool }: { tool: ConnectedTool }) => {
    const isToolActive = hasActiveClaudeSession;

    return (
      <TouchableOpacity
        onPress={() => handleToolPress(tool)}
        style={{
          backgroundColor: theme.backgroundSecondary,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 12,
          padding: 16,
          overflow: 'hidden',
        }}
      >
        {isToolActive && (
          <View
            style={{
              position: 'absolute',
              top: -48,
              right: -48,
              width: 96,
              height: 96,
              opacity: 0.1,
              backgroundColor: theme.primary,
              borderRadius: 100,
            }}
          />
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 40, height: 40, backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <Cpu size={20} color={isToolActive ? theme.primary : theme.textTertiary} />
            </View>
            <View>
              <Text style={{ color: theme.text, fontWeight: '500' }}>{tool.name}</Text>
              <Text style={{ color: theme.textSecondary, fontSize: 12 }}>v{tool.version}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 4,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: isToolActive ? theme.primary + '1A' : theme.border + '4D',
                borderWidth: 1,
                borderColor: isToolActive ? theme.primary + '33' : theme.border,
              }}
            >
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: isToolActive ? theme.primary : theme.textTertiary,
                }}
              />
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  color: isToolActive ? theme.primary : theme.textSecondary,
                }}
              >
                {isToolActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
            <ChevronRight size={16} color={theme.textTertiary} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
      {/* Header */}
      <View style={{ backgroundColor: theme.background + 'F2', borderBottomWidth: 1, borderBottomColor: theme.border, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/devices');
            }
          }}
          style={{ flexDirection: 'row', alignItems: 'center' }}
        >
          <ArrowLeft size={24} color={theme.textSecondary} />
          <Text style={{ color: theme.textSecondary, marginLeft: 8, fontWeight: '500' }}>Back</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={() => refreshDeviceStatus(device.id)}
            style={{ width: 40, height: 40, backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.border, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}
          >
            <RefreshCw size={18} color={theme.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleRemove}
            style={{ width: 40, height: 40, backgroundColor: theme.error + '1A', borderWidth: 1, borderColor: theme.error + '33', borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}
          >
            <Trash2 size={18} color={theme.error} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={{ flex: 1, paddingHorizontal: 16 }} contentContainerStyle={{ paddingVertical: 16, paddingBottom: 32 }}>
        {/* Device Info Card */}
        <View style={{ backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 24, marginBottom: 24, overflow: 'hidden' }}>
          {/* Glow effect */}
          {isOnline && (
            <View
              style={{
                position: 'absolute',
                top: -64,
                right: -64,
                width: 128,
                height: 128,
                opacity: 0.1,
                backgroundColor: theme.primary,
                borderRadius: 100,
              }}
            />
          )}

          <View style={{ alignItems: 'center' }}>
            {/* Device Icon */}
            <View style={{ width: 80, height: 80, backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Icon size={40} color={isOnline ? theme.primary : theme.textTertiary} />
            </View>

            {/* Name (editable) */}
            {isEditing ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <TextInput
                  value={newName}
                  onChangeText={setNewName}
                  style={{ color: theme.text, fontSize: 20, fontWeight: '700', textAlign: 'center', borderBottomWidth: 2, borderBottomColor: theme.primary, paddingHorizontal: 16, paddingVertical: 4, minWidth: 150 }}
                  autoFocus
                />
                <TouchableOpacity
                  onPress={handleRename}
                  style={{ marginLeft: 12, width: 36, height: 36, backgroundColor: theme.success, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Check size={18} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setNewName(device.name);
                    setIsEditing(false);
                  }}
                  style={{ marginLeft: 8, width: 36, height: 36, backgroundColor: theme.backgroundTertiary, borderWidth: 1, borderColor: theme.border, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={18} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setIsEditing(true)}
                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}
              >
                <Text style={{ color: theme.text, fontSize: 20, fontWeight: '700', marginRight: 8 }}>
                  {device.name}
                </Text>
                <Edit3 size={16} color={theme.textTertiary} />
              </TouchableOpacity>
            )}

            {/* Status Badge */}
            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 9999,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                backgroundColor: isOnline ? theme.primary + '1A' : theme.border + '4D',
                borderWidth: 1,
                borderColor: isOnline ? theme.primary + '33' : theme.border,
              }}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: isOnline ? theme.primary : theme.textTertiary,
                }}
              />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  color: isOnline ? theme.primary : theme.textSecondary,
                }}
              >
                {isOnline ? 'Online' : 'Offline'}
              </Text>
            </View>
          </View>

          {/* Device Stats */}
          <View style={{ flexDirection: 'row', marginTop: 24, paddingTop: 24, borderTopWidth: 1, borderTopColor: theme.border }}>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Wifi size={14} color={theme.textTertiary} />
                <Text style={{ color: theme.textTertiary, fontSize: 12, marginLeft: 8 }}>Platform</Text>
              </View>
              <Text style={{ color: theme.text, fontWeight: '500', textTransform: 'capitalize' }}>
                {device.platform?.toLowerCase() || 'unknown'}
              </Text>
            </View>

            <View style={{ width: 1, backgroundColor: theme.border }} />

            <View style={{ flex: 1, alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Clock size={14} color={theme.textTertiary} />
                <Text style={{ color: theme.textTertiary, fontSize: 12, marginLeft: 8 }}>Last seen</Text>
              </View>
              <Text style={{ color: theme.text, fontWeight: '500' }}>
                {formatLastSeen(device.lastSeen || device.lastSeenAt || new Date().toISOString())}
              </Text>
            </View>
          </View>
        </View>

        {/* Connected Tools */}
        <View style={{ marginBottom: 24 }}>
          {(() => {
            const supportedTools = (device.connectedTools || []).filter((tool) => {
              const t = tool.type.toLowerCase();
              return ['claude_code', 'claude-code', 'claude_terminal'].includes(t);
            });
            return (
              <>
                <Text style={{ color: theme.text, fontSize: 18, fontWeight: '700', marginBottom: 16 }}>
                  Tools ({supportedTools.length})
                </Text>

                {supportedTools.length === 0 ? (
                  <View style={{ backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 24, alignItems: 'center' }}>
                    <Cpu size={48} color={theme.textTertiary} />
                    <Text style={{ color: theme.textSecondary, marginTop: 16, textAlign: 'center' }}>
                      No tools connected to this device
                    </Text>
                    <Text style={{ color: theme.textTertiary, fontSize: 12, textAlign: 'center', marginTop: 8 }}>
                      Run ForkOff Connect on your device to get started
                    </Text>
                  </View>
                ) : (
                  <View style={{ gap: 12 }}>
                    {supportedTools.map((tool) => (
                      <ToolCard key={tool.id} tool={tool} />
                    ))}
                  </View>
                )}
              </>
            );
          })()}
        </View>

        {/* Terminal Section */}
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: '700' }}>
              Terminal
            </Text>
            {isOnline && (
              <TouchableOpacity
                onPress={handleOpenTerminal}
                style={{ backgroundColor: theme.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9999, flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                <Plus size={16} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '500', fontSize: 14 }}>New Terminal</Text>
              </TouchableOpacity>
            )}
          </View>

          {!isOnline ? (
            <View style={{ backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 24, alignItems: 'center' }}>
              <Terminal size={48} color={theme.textTertiary} />
              <Text style={{ color: theme.textSecondary, marginTop: 16, textAlign: 'center' }}>
                Device is offline
              </Text>
              <Text style={{ color: theme.textTertiary, fontSize: 12, textAlign: 'center', marginTop: 8 }}>
                Terminal access requires the device to be online
              </Text>
            </View>
          ) : deviceTerminals.length === 0 ? (
            <View style={{ backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 24, alignItems: 'center' }}>
              <Terminal size={48} color={theme.textTertiary} />
              <Text style={{ color: theme.textSecondary, marginTop: 16, textAlign: 'center' }}>
                No active terminal sessions
              </Text>
              <Text style={{ color: theme.textTertiary, fontSize: 12, textAlign: 'center', marginTop: 8 }}>
                Open a terminal to run commands on this device
              </Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {deviceTerminals.map((terminal) => (
                <TouchableOpacity
                  key={terminal.id}
                  onPress={() => router.push(`/terminal/${terminal.id}`)}
                  style={{ backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 16 }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 40, height: 40, backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                      <Terminal size={20} color={theme.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.text, fontWeight: '500' }}>{terminal.name}</Text>
                      <Text style={{ color: theme.textSecondary, fontSize: 12, fontFamily: 'monospace' }}>{terminal.cwd}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: terminal.isActive ? theme.success : theme.textTertiary }} />
                      <ChevronRight size={16} color={theme.textTertiary} />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* IP Address */}
        {device.ipAddress && (
          <View style={{ marginTop: 24, backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 16 }}>
            <Text style={{ color: theme.textTertiary, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>IP Address</Text>
            <Text style={{ color: theme.text, fontFamily: 'monospace' }}>{device.ipAddress}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
