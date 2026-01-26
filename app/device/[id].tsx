import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
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
import { colors } from '@/theme/colors';

const deviceTypeIcons: Record<string, typeof Laptop> = {
  laptop: Laptop,
  desktop: Monitor,
  server: Server,
  LAPTOP: Laptop,
  DESKTOP: Monitor,
  SERVER: Server,
};

export default function DeviceDetailScreen() {
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
      <SafeAreaView className="flex-1 bg-dark-800 items-center justify-center">
        <Laptop size={48} color={colors.dark[400]} />
        <Text className="text-dark-200 text-lg mt-4">Device not found</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-4 bg-dark-700 border border-dark-500 px-6 py-3 rounded-full"
        >
          <Text className="text-dark-50 font-medium">Go Back</Text>
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
        Alert.alert('Error', 'Failed to rename device');
      }
    }
    setIsEditing(false);
  };

  const handleRemove = () => {
    Alert.alert(
      'Remove Device',
      `Are you sure you want to remove "${device.name}"? This will disconnect all tools.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeDevice(device.id);
              router.back();
            } catch (error) {
              Alert.alert('Error', 'Failed to remove device');
            }
          },
        },
      ]
    );
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
    const isClaudeTool = ['claude_code', 'claude-code', 'claude_terminal'].includes(tool.type.toLowerCase());
    // For Claude tools, check if any session is active; for other tools, use tool.status
    const isToolActive = isClaudeTool ? hasActiveClaudeSession : tool.status === 'active';

    return (
      <TouchableOpacity
        onPress={isClaudeTool ? () => handleToolPress(tool) : undefined}
        className="bg-dark-700 border border-dark-500 rounded-xl p-4 overflow-hidden"
      >
        {isToolActive && (
          <View
            className="absolute -top-12 -right-12 w-24 h-24 opacity-10"
            style={{ backgroundColor: colors.primary[500], borderRadius: 100, filter: 'blur(30px)' }}
          />
        )}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View className="w-10 h-10 bg-dark-800 border border-dark-500 rounded-lg items-center justify-center mr-3">
              <Cpu size={20} color={isToolActive ? colors.primary[500] : colors.dark[300]} />
            </View>
            <View>
              <Text className="text-dark-50 font-medium">{tool.name}</Text>
              <Text className="text-dark-200 text-xs">v{tool.version}</Text>
            </View>
          </View>
          <View className="flex-row items-center gap-2">
            <View
              className={`px-2 py-1 rounded flex-row items-center gap-1.5 ${
                isToolActive
                  ? 'bg-primary-500/10 border border-primary-500/20'
                  : 'bg-dark-500/30 border border-dark-500'
              }`}
            >
              <View
                className={`w-1.5 h-1.5 rounded-full ${
                  isToolActive ? 'bg-primary-500' : 'bg-dark-300'
                }`}
              />
              <Text
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  isToolActive ? 'text-primary-500' : 'text-dark-200'
                }`}
              >
                {isToolActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
            {isClaudeTool && <ChevronRight size={16} color={colors.dark[400]} />}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-dark-800" edges={['top']}>
      {/* Header */}
      <View className="bg-dark-800/95 border-b border-dark-500 px-4 pb-4 pt-2 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center"
        >
          <ArrowLeft size={24} color={colors.dark[200]} />
          <Text className="text-dark-200 ml-2 font-medium">Back</Text>
        </TouchableOpacity>

        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={() => refreshDeviceStatus(device.id)}
            className="w-10 h-10 bg-dark-700 border border-dark-500 rounded-lg items-center justify-center"
          >
            <RefreshCw size={18} color={colors.dark[200]} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleRemove}
            className="w-10 h-10 bg-error-300/10 border border-error-300/20 rounded-lg items-center justify-center"
          >
            <Trash2 size={18} color={colors.error[300]} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 px-4" contentContainerClassName="py-4 pb-8">
        {/* Device Info Card */}
        <View className="bg-dark-700 border border-dark-500 rounded-xl p-6 mb-6 overflow-hidden">
          {/* Glow effect */}
          {isOnline && (
            <View
              className="absolute -top-16 -right-16 w-32 h-32 opacity-10"
              style={{ backgroundColor: colors.primary[500], borderRadius: 100, filter: 'blur(40px)' }}
            />
          )}

          <View className="items-center">
            {/* Device Icon */}
            <View className="w-20 h-20 bg-dark-800 border border-dark-500 rounded-2xl items-center justify-center mb-4">
              <Icon size={40} color={isOnline ? colors.primary[500] : colors.dark[300]} />
            </View>

            {/* Name (editable) */}
            {isEditing ? (
              <View className="flex-row items-center mb-3">
                <TextInput
                  value={newName}
                  onChangeText={setNewName}
                  className="text-dark-50 text-xl font-bold text-center border-b-2 border-primary-500 px-4 py-1 min-w-[150px]"
                  autoFocus
                />
                <TouchableOpacity
                  onPress={handleRename}
                  className="ml-3 w-9 h-9 bg-success-500 rounded-full items-center justify-center"
                >
                  <Check size={18} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setNewName(device.name);
                    setIsEditing(false);
                  }}
                  className="ml-2 w-9 h-9 bg-dark-600 border border-dark-500 rounded-full items-center justify-center"
                >
                  <X size={18} color={colors.dark[200]} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setIsEditing(true)}
                className="flex-row items-center mb-3"
              >
                <Text className="text-dark-50 text-xl font-bold mr-2">
                  {device.name}
                </Text>
                <Edit3 size={16} color={colors.dark[300]} />
              </TouchableOpacity>
            )}

            {/* Status Badge */}
            <View
              className={`px-3 py-1.5 rounded-full flex-row items-center gap-2 ${
                isOnline
                  ? 'bg-primary-500/10 border border-primary-500/20'
                  : 'bg-dark-500/30 border border-dark-500'
              }`}
            >
              <View
                className={`w-2 h-2 rounded-full ${
                  isOnline ? 'bg-primary-500' : 'bg-dark-300'
                }`}
              />
              <Text
                className={`text-xs font-bold uppercase tracking-wider ${
                  isOnline ? 'text-primary-500' : 'text-dark-200'
                }`}
              >
                {isOnline ? 'Online' : 'Offline'}
              </Text>
            </View>
          </View>

          {/* Device Stats */}
          <View className="flex-row mt-6 pt-6 border-t border-dark-500">
            <View className="flex-1 items-center">
              <View className="flex-row items-center mb-1">
                <Wifi size={14} color={colors.dark[300]} />
                <Text className="text-dark-300 text-xs ml-2">Platform</Text>
              </View>
              <Text className="text-dark-50 font-medium capitalize">
                {device.platform?.toLowerCase() || 'unknown'}
              </Text>
            </View>

            <View className="w-px bg-dark-500" />

            <View className="flex-1 items-center">
              <View className="flex-row items-center mb-1">
                <Clock size={14} color={colors.dark[300]} />
                <Text className="text-dark-300 text-xs ml-2">Last seen</Text>
              </View>
              <Text className="text-dark-50 font-medium">
                {formatLastSeen(device.lastSeen || device.lastSeenAt || new Date().toISOString())}
              </Text>
            </View>
          </View>
        </View>

        {/* Connected Tools */}
        <View className="mb-6">
          <Text className="text-dark-50 text-lg font-bold mb-4">
            Connected Tools ({device.connectedTools?.length || 0})
          </Text>

          {(device.connectedTools?.length || 0) === 0 ? (
            <View className="bg-dark-700 border border-dark-500 rounded-xl p-6 items-center">
              <Cpu size={48} color={colors.dark[400]} />
              <Text className="text-dark-200 mt-4 text-center">
                No tools connected to this device
              </Text>
              <Text className="text-dark-300 text-xs text-center mt-2">
                Install Cursor, Copilot, or Claude Terminal on your device
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {(device.connectedTools || []).map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </View>
          )}
        </View>

        {/* Terminal Section */}
        <View>
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-dark-50 text-lg font-bold">
              Terminal
            </Text>
            {isOnline && (
              <TouchableOpacity
                onPress={handleOpenTerminal}
                className="bg-primary-500 px-4 py-2 rounded-full flex-row items-center gap-2"
              >
                <Plus size={16} color="#fff" />
                <Text className="text-white font-medium text-sm">New Terminal</Text>
              </TouchableOpacity>
            )}
          </View>

          {!isOnline ? (
            <View className="bg-dark-700 border border-dark-500 rounded-xl p-6 items-center">
              <Terminal size={48} color={colors.dark[400]} />
              <Text className="text-dark-200 mt-4 text-center">
                Device is offline
              </Text>
              <Text className="text-dark-300 text-xs text-center mt-2">
                Terminal access requires the device to be online
              </Text>
            </View>
          ) : deviceTerminals.length === 0 ? (
            <View className="bg-dark-700 border border-dark-500 rounded-xl p-6 items-center">
              <Terminal size={48} color={colors.dark[400]} />
              <Text className="text-dark-200 mt-4 text-center">
                No active terminal sessions
              </Text>
              <Text className="text-dark-300 text-xs text-center mt-2">
                Open a terminal to run commands on this device
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {deviceTerminals.map((terminal) => (
                <TouchableOpacity
                  key={terminal.id}
                  onPress={() => router.push(`/terminal/${terminal.id}`)}
                  className="bg-dark-700 border border-dark-500 rounded-xl p-4"
                >
                  <View className="flex-row items-center">
                    <View className="w-10 h-10 bg-dark-800 border border-dark-500 rounded-lg items-center justify-center mr-3">
                      <Terminal size={20} color={colors.primary[500]} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-dark-50 font-medium">{terminal.name}</Text>
                      <Text className="text-dark-200 text-xs font-mono">{terminal.cwd}</Text>
                    </View>
                    <View className="flex-row items-center gap-2">
                      <View className={`w-2 h-2 rounded-full ${terminal.isActive ? 'bg-success-500' : 'bg-dark-400'}`} />
                      <ChevronRight size={16} color={colors.dark[400]} />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* IP Address */}
        {device.ipAddress && (
          <View className="mt-6 bg-dark-700 border border-dark-500 rounded-xl p-4">
            <Text className="text-dark-300 text-xs uppercase tracking-wider mb-1">IP Address</Text>
            <Text className="text-dark-50 font-mono">{device.ipAddress}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
