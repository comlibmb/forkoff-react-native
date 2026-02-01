import { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Settings,
  Terminal,
  Server,
  FolderTree,
  Play,
  Square,
  ChevronRight,
  Laptop,
  FolderGit2,
  GitBranch,
  Check,
} from 'lucide-react-native';
import { useProjectStore } from '@/stores/project.store';
import { useDeviceStore } from '@/stores/device.store';
import { useTheme } from '@/theme/ThemeProvider';

export default function ProjectDetailScreen() {
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getProject, fetchFileTree, fileTree } = useProjectStore();
  const { devices } = useDeviceStore();

  const project = getProject(id);

  useEffect(() => {
    if (id) {
      fetchFileTree(id);
    }
  }, [id]);

  if (!project) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 32, alignItems: 'center', marginHorizontal: 16 }}>
          <FolderGit2 size={48} color={theme.textTertiary} />
          <Text style={{ color: theme.textSecondary, fontSize: 18, marginTop: 16 }}>Project not found</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginTop: 16, backgroundColor: theme.backgroundTertiary, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 999 }}
          >
            <Text style={{ color: theme.text, fontWeight: '500' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const device = devices.find((d) => d.id === project.deviceId);
  const servers = project.servers || [];
  const tools = project.tools || [];
  const projectFiles = fileTree[id] || [];
  const isActive = project.status === 'active';
  const isDeviceOnline = device?.status?.toLowerCase() === 'online';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
      {/* Header */}
      <View style={{ backgroundColor: theme.background, borderBottomWidth: 1, borderBottomColor: theme.border, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ flexDirection: 'row', alignItems: 'center' }}
        >
          <ArrowLeft size={24} color={theme.textSecondary} />
          <Text style={{ color: theme.textSecondary, marginLeft: 8, fontWeight: '500' }}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push(`/project/${id}/settings`)}
          style={{ width: 40, height: 40, backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.border, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}
        >
          <Settings size={20} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1, paddingHorizontal: 16 }} contentContainerStyle={{ paddingVertical: 16, paddingBottom: 32 }}>
        {/* Project Info Card */}
        <View style={{ backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 20, marginBottom: 24, overflow: 'hidden' }}>
          {isActive && (
            <View
              style={{ position: 'absolute', top: -48, right: -48, width: 96, height: 96, opacity: 0.1, backgroundColor: theme.primary, borderRadius: 100 }}
            />
          )}

          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 48, height: 48, backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
                <FolderGit2 size={24} color={theme.primary} />
              </View>
              <View>
                <Text style={{ color: theme.text, fontSize: 20, fontWeight: 'bold' }}>{project.name}</Text>
                <Text style={{ color: theme.textSecondary, fontSize: 14 }}>
                  {project.language}
                  {project.framework && ` \u2022 ${project.framework}`}
                </Text>
              </View>
            </View>

            {/* Status Badge */}
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 4,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: isActive ? theme.primary + '1A' : theme.border + '4D',
                borderWidth: 1,
                borderColor: isActive ? theme.primary + '33' : theme.border,
              }}
            >
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: isActive ? theme.primary : theme.textSecondary,
                }}
              />
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  color: isActive ? theme.primary : theme.textSecondary,
                }}
              >
                {isActive ? 'Active' : 'Idle'}
              </Text>
            </View>
          </View>

          {/* Branch Info */}
          <View style={{ backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <GitBranch size={14} color={theme.textSecondary} />
              <Text style={{ color: theme.textSecondary, fontSize: 14, fontFamily: 'monospace' }}>{project.branch || 'main'}</Text>
            </View>
            {project.uncommittedChanges ? (
              <Text style={{ color: theme.warning, fontSize: 12, fontWeight: '500' }}>
                {project.uncommittedChanges} changes
              </Text>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Check size={12} color={theme.success} />
                <Text style={{ color: theme.success, fontSize: 12 }}>Clean</Text>
              </View>
            )}
          </View>

          {/* Device Link */}
          {device && (
            <TouchableOpacity
              onPress={() => router.push(`/device/${device.id}`)}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Laptop size={14} color={theme.textTertiary} />
                <Text style={{ color: theme.textTertiary, fontSize: 14 }}>{device.name}</Text>
              </View>
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 4,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: isDeviceOnline ? theme.primary + '1A' : theme.border + '4D',
                }}
              >
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: isDeviceOnline ? theme.primary : theme.textTertiary,
                  }}
                />
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: '500',
                    color: isDeviceOnline ? theme.primary : theme.textTertiary,
                  }}
                >
                  {isDeviceOnline ? 'Online' : 'Offline'}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Actions */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
          <TouchableOpacity
            onPress={() => router.push(`/project/${id}/terminals`)}
            style={{ flex: 1, backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 16, alignItems: 'center' }}
          >
            <View style={{ width: 40, height: 40, backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
              <Terminal size={20} color={theme.success} />
            </View>
            <Text style={{ color: theme.text, fontWeight: '500', fontSize: 14 }}>Terminal</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push(`/project/${id}/code`)}
            style={{ flex: 1, backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 16, alignItems: 'center' }}
          >
            <View style={{ width: 40, height: 40, backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
              <FolderTree size={20} color={theme.warning} />
            </View>
            <Text style={{ color: theme.text, fontWeight: '500', fontSize: 14 }}>Files</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push(`/project/${id}/servers`)}
            style={{ flex: 1, backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 16, alignItems: 'center' }}
          >
            <View style={{ width: 40, height: 40, backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
              <Server size={20} color={theme.primary} />
            </View>
            <Text style={{ color: theme.text, fontWeight: '500', fontSize: 14 }}>Servers</Text>
          </TouchableOpacity>
        </View>

        {/* Servers */}
        <View style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ color: theme.textTertiary, fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Servers ({servers.length})
            </Text>
            <TouchableOpacity
              onPress={() => router.push(`/project/${id}/servers`)}
              style={{ flexDirection: 'row', alignItems: 'center' }}
            >
              <Text style={{ color: theme.primary, fontSize: 12, marginRight: 4 }}>Manage</Text>
              <ChevronRight size={14} color={theme.primary} />
            </TouchableOpacity>
          </View>

          {servers.length === 0 ? (
            <View style={{ backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 24, alignItems: 'center' }}>
              <Server size={36} color={theme.textTertiary} />
              <Text style={{ color: theme.textSecondary, marginTop: 12, textAlign: 'center', fontSize: 14 }}>
                No servers configured
              </Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {servers.map((server) => {
                const isRunning = server.status === 'running';
                return (
                  <View
                    key={server.id}
                    style={{ backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 16, overflow: 'hidden' }}
                  >
                    {isRunning && (
                      <View
                        style={{ position: 'absolute', top: -48, right: -48, width: 96, height: 96, opacity: 0.1, backgroundColor: theme.success, borderRadius: 100 }}
                      />
                    )}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ width: 40, height: 40, backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                          <Server size={20} color={isRunning ? theme.success : theme.textTertiary} />
                        </View>
                        <View>
                          <Text style={{ color: theme.text, fontWeight: '500' }}>{server.name}</Text>
                          <Text style={{ color: theme.textTertiary, fontSize: 12 }}>Port {server.port}</Text>
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
                            backgroundColor: isRunning ? theme.success + '1A' : theme.border + '4D',
                            borderWidth: 1,
                            borderColor: isRunning ? theme.success + '33' : theme.border,
                          }}
                        >
                          <View
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: 3,
                              backgroundColor: isRunning ? theme.success : theme.textTertiary,
                            }}
                          />
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: 'bold',
                              textTransform: 'uppercase',
                              letterSpacing: 0.5,
                              color: isRunning ? theme.success : theme.textSecondary,
                            }}
                          >
                            {isRunning ? 'Running' : 'Stopped'}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: isRunning ? theme.error + '1A' : theme.success + '1A',
                            borderWidth: 1,
                            borderColor: isRunning ? theme.error + '33' : theme.success + '33',
                          }}
                        >
                          {isRunning ? (
                            <Square size={14} color={theme.error} />
                          ) : (
                            <Play size={14} color={theme.success} />
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* AI Tools */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: theme.textTertiary, fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
            AI Tools ({tools.length})
          </Text>

          {tools.length === 0 ? (
            <View style={{ backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 24, alignItems: 'center' }}>
              <Terminal size={36} color={theme.textTertiary} />
              <Text style={{ color: theme.textSecondary, marginTop: 12, textAlign: 'center', fontSize: 14 }}>
                No AI tools configured
              </Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {tools.map((tool) => (
                <TouchableOpacity
                  key={tool.toolType}
                  style={{ backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 16 }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ width: 40, height: 40, backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                        <Terminal size={20} color={tool.enabled ? theme.primary : theme.textTertiary} />
                      </View>
                      <View>
                        <Text style={{ color: theme.text, fontWeight: '500', textTransform: 'capitalize' }}>
                          {tool.toolType.replace('-', ' ')}
                        </Text>
                        <Text style={{ color: theme.textTertiary, fontSize: 12 }}>
                          {tool.enabled ? 'Enabled' : 'Disabled'}
                        </Text>
                      </View>
                    </View>
                    <ChevronRight size={18} color={theme.textTertiary} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Files Preview */}
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ color: theme.textTertiary, fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Files
            </Text>
            <TouchableOpacity
              onPress={() => router.push(`/project/${id}/code`)}
              style={{ flexDirection: 'row', alignItems: 'center' }}
            >
              <Text style={{ color: theme.primary, fontSize: 12, marginRight: 4 }}>Browse</Text>
              <ChevronRight size={14} color={theme.primary} />
            </TouchableOpacity>
          </View>

          <View style={{ backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 16 }}>
            {projectFiles.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                <FolderTree size={32} color={theme.textTertiary} />
                <Text style={{ color: theme.textTertiary, marginTop: 8, fontSize: 14 }}>No files loaded</Text>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {projectFiles.slice(0, 5).map((file) => (
                  <View
                    key={file.path}
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingLeft: file.type === 'directory' ? 0 : 16 }}
                  >
                    <FolderTree
                      size={14}
                      color={file.type === 'directory' ? theme.warning : theme.textTertiary}
                    />
                    <Text style={{ color: theme.textSecondary, marginLeft: 8, fontSize: 14, fontFamily: 'monospace' }}>{file.name}</Text>
                  </View>
                ))}
                {projectFiles.length > 5 && (
                  <Text style={{ color: theme.textTertiary, fontSize: 12, marginTop: 8 }}>
                    +{projectFiles.length - 5} more files
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
