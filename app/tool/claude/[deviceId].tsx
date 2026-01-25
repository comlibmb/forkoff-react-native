import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Terminal,
  Play,
  Trash2,
  FolderOpen,
  Clock,
  ArrowLeft,
  X,
} from 'lucide-react-native';
import { useClaudeStore } from '@/stores/claude.store';
import { useDeviceStore } from '@/stores/device.store';
import { useTerminalStore } from '@/stores/terminal.store';
import { ClaudeSession } from '@/types';
import DirectoryBrowser from '@/components/directory/DirectoryBrowser';
import { colors } from '@/theme/colors';

export default function ClaudeToolDetailScreen() {
  const { deviceId } = useLocalSearchParams<{ deviceId: string }>();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [showDirectoryBrowser, setShowDirectoryBrowser] = useState(false);

  const {
    sessions,
    activeToolStatus,
    isLoading,
    error,
    fetchSessions,
    subscribeToUpdates,
    startNewSession,
    deleteSession,
    getToolStatus,
    clearError,
  } = useClaudeStore();

  const { getDevice } = useDeviceStore();

  const device = deviceId ? getDevice(deviceId) : undefined;
  const deviceSessions = deviceId ? sessions.get(deviceId) || [] : [];
  const toolStatus = deviceId ? getToolStatus(deviceId) : 'inactive';
  const isActive = toolStatus === 'active';

  useEffect(() => {
    if (deviceId) {
      fetchSessions(deviceId);
      const unsubscribe = subscribeToUpdates(deviceId);
      return () => {
        unsubscribe();
      };
    }
  }, [deviceId]);

  const onRefresh = async () => {
    if (!deviceId) return;
    setRefreshing(true);
    await fetchSessions(deviceId);
    setRefreshing(false);
  };

  const handleResumeSession = async (session: ClaudeSession) => {
    if (!deviceId) return;

    // Navigate to conversation view (which shows history + Take Over button)
    router.push({
      pathname: '/claude/session/[sessionKey]',
      params: {
        sessionKey: session.sessionKey,
        deviceId: deviceId,
      },
    });
  };

  const handleDeleteSession = async (session: ClaudeSession) => {
    Alert.alert(
      'Delete Session',
      `Are you sure you want to delete this session from ${session.directory}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!deviceId) return;
            await deleteSession(session.id || session.sessionKey, deviceId);
          },
        },
      ]
    );
  };

  const handleStartNewSession = async (directory: string) => {
    if (!deviceId) return;

    const terminalSessionId = `claude-new-${Date.now()}`;
    const directoryName = directory.split('/').pop() || directory.split('\\').pop() || 'Claude';

    // Create terminal in store
    const { addTerminal } = useTerminalStore.getState();
    addTerminal({
      id: terminalSessionId,
      projectId: '',
      deviceId: deviceId,
      name: `Claude - ${directoryName}`,
      cwd: directory,
      isActive: true,
      output: [],
    });

    // Send start request
    await startNewSession(deviceId, directory, terminalSessionId);
    setShowDirectoryBrowser(false);

    // Navigate to terminal
    router.push(`/terminal/${terminalSessionId}`);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (showDirectoryBrowser && deviceId) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Select Directory',
            headerShown: false,
          }}
        />
        <DirectoryBrowser
          deviceId={deviceId}
          onSelect={handleStartNewSession}
          onCancel={() => setShowDirectoryBrowser(false)}
        />
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <SafeAreaView className="flex-1 bg-dark-800" edges={['bottom', 'left', 'right']}>
        {/* Back button - top left */}
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center px-4 pt-12 pb-2"
        >
          <ArrowLeft size={20} color={colors.dark[200]} />
          <Text className="text-dark-200 ml-1 text-sm">Back</Text>
        </TouchableOpacity>

        {/* Header Card */}
        <View className="bg-dark-700 mx-4 mt-2 rounded-xl p-4 border border-dark-500">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Terminal size={24} color={isActive ? colors.primary[500] : colors.dark[300]} />
              <View className="ml-3">
                <Text className="text-dark-50 text-lg font-bold">Claude Code</Text>
                <Text className="text-dark-400 text-sm">{device?.name || 'Unknown Device'}</Text>
              </View>
            </View>
            {/* Status Badge */}
            <View
              className={`px-3 py-1.5 rounded-full flex-row items-center gap-2 ${
                isActive
                  ? 'bg-primary-500/10 border border-primary-500/20'
                  : 'bg-dark-500/30 border border-dark-500'
              }`}
            >
              <View
                className={`w-2 h-2 rounded-full ${
                  isActive ? 'bg-primary-500' : 'bg-dark-300'
                }`}
              />
              <Text
                className={`text-xs font-bold uppercase tracking-wider ${
                  isActive ? 'text-primary-500' : 'text-dark-200'
                }`}
              >
                {isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
        </View>

        <ScrollView
          className="flex-1 px-4"
          contentContainerClassName="py-4"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary[500]}
            />
          }
        >
          {/* New Session Button */}
          <TouchableOpacity
            onPress={() => setShowDirectoryBrowser(true)}
            className="bg-primary-500 rounded-xl p-4 flex-row items-center justify-center gap-3 mb-4"
            style={{
              shadowColor: colors.primary[500],
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.2,
              shadowRadius: 12,
              elevation: 5,
            }}
          >
            <FolderOpen size={20} color="#fff" />
            <Text className="text-white font-bold text-base">Start New Session</Text>
          </TouchableOpacity>

          {/* Sessions List Header */}
          <View className="mb-4">
            <Text className="text-dark-300 text-xs font-bold uppercase tracking-wider">
              Recent Sessions ({deviceSessions.length})
            </Text>
          </View>

          {isLoading && deviceSessions.length === 0 ? (
            <View className="bg-dark-700 border border-dark-500 rounded-xl p-8 items-center">
              <ActivityIndicator size="large" color={colors.primary[500]} />
              <Text className="text-dark-200 mt-4">Loading sessions...</Text>
            </View>
          ) : deviceSessions.length === 0 ? (
            <View className="bg-dark-700 border border-dark-500 rounded-xl p-8 items-center">
              <Terminal size={48} color={colors.dark[400]} />
              <Text className="text-dark-200 mt-4 text-center">
                No Claude sessions yet.{'\n'}Start a new session to begin.
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {deviceSessions.map((session) => {
                const isSessionActive = session.state.toUpperCase() === 'ACTIVE';
                const directoryName = session.directory.split('/').pop() || session.directory.split('\\').pop() || session.directory;

                return (
                  <View
                    key={session.sessionKey || session.id}
                    className="bg-dark-700 border border-dark-500 rounded-xl p-4 overflow-hidden"
                  >
                    {isSessionActive && (
                      <View
                        className="absolute -top-12 -right-12 w-24 h-24 opacity-10"
                        style={{ backgroundColor: colors.primary[500], borderRadius: 100, filter: 'blur(30px)' }}
                      />
                    )}

                    <View className="flex-row items-start justify-between">
                      <View className="flex-1 mr-3">
                        {/* Session name and status */}
                        <View className="flex-row items-center mb-1">
                          <View
                            className={`w-2 h-2 rounded-full mr-2 ${
                              isSessionActive ? 'bg-primary-500' : 'bg-dark-400'
                            }`}
                          />
                          <Text className="text-dark-50 font-bold" numberOfLines={1}>
                            {directoryName}
                          </Text>
                        </View>

                        {/* Full path */}
                        <Text className="text-dark-300 text-xs mb-2 font-mono" numberOfLines={1}>
                          {session.directory}
                        </Text>

                        {/* Last used */}
                        <View className="flex-row items-center">
                          <Clock size={12} color={colors.dark[300]} />
                          <Text className="text-dark-300 text-xs ml-1.5">
                            {formatTimeAgo(session.lastUsedAt)}
                          </Text>
                        </View>
                      </View>

                      {/* Action buttons */}
                      <View className="flex-row gap-2">
                        <TouchableOpacity
                          onPress={() => handleResumeSession(session)}
                          className="bg-primary-500/10 border border-primary-500/20 p-2.5 rounded-lg"
                        >
                          <Play size={18} color={colors.primary[500]} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteSession(session)}
                          className="bg-error-300/10 border border-error-300/20 p-2.5 rounded-lg"
                        >
                          <Trash2 size={18} color={colors.error[300]} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {error && (
            <View className="bg-error-300/10 border border-error-300/20 rounded-xl p-4 mt-4">
              <Text className="text-error-300 text-center">{error}</Text>
              <TouchableOpacity onPress={clearError} className="mt-2">
                <Text className="text-error-200 text-center text-sm underline">Dismiss</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
