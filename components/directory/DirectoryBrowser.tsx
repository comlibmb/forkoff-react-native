import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Folder,
  ChevronRight,
  ArrowLeft,
  Search,
  Check,
  X,
} from 'lucide-react-native';
import { useClaudeStore } from '@/stores/claude.store';
import { DirectoryEntry } from '@/types';
import { colors } from '@/theme/colors';

interface DirectoryBrowserProps {
  deviceId: string;
  onSelect: (path: string) => void;
  onCancel: () => void;
  initialPath?: string;
}

const QUICK_PATHS = [
  { label: 'Home', path: '~' },
  { label: 'Desktop', path: '~/Desktop' },
  { label: 'Documents', path: '~/Documents' },
  { label: 'Projects', path: '~/Projects' },
  { label: 'Code', path: '~/code' },
];

export default function DirectoryBrowser({
  deviceId,
  onSelect,
  onCancel,
  initialPath = '~',
}: DirectoryBrowserProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const {
    currentPath,
    directoryEntries,
    isLoadingDirectory,
    requestDirectoryListing,
    setCurrentPath,
  } = useClaudeStore();

  const path = currentPath.get(deviceId) || initialPath;
  const entries = directoryEntries.get(deviceId) || [];

  useEffect(() => {
    requestDirectoryListing(deviceId, initialPath);
  }, [deviceId]);

  const handleNavigate = (entry: DirectoryEntry) => {
    if (entry.type === 'directory') {
      setCurrentPath(deviceId, entry.path);
    }
  };

  const handleGoBack = () => {
    if (path === '~' || path === '/') return;
    const parentPath = path.split('/').slice(0, -1).join('/') || '~';
    setCurrentPath(deviceId, parentPath);
  };

  const handleQuickPath = (quickPath: string) => {
    setCurrentPath(deviceId, quickPath);
  };

  const filteredEntries = entries.filter((entry) => {
    if (!searchQuery) return true;
    return entry.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Only show directories
  const directories = filteredEntries.filter((e) => e.type === 'directory');

  // Parse breadcrumb segments
  const pathSegments = path.split('/').filter(Boolean);
  const breadcrumbs =
    path === '~'
      ? [{ label: '~', path: '~' }]
      : pathSegments.map((segment, index) => ({
          label: segment,
          path: pathSegments.slice(0, index + 1).join('/'),
        }));

  return (
    <SafeAreaView className="flex-1 bg-dark-800" edges={['top']}>
      {/* Header */}
      <View className="bg-dark-800/95 border-b border-dark-500 px-4 pb-4 pt-2">
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity onPress={onCancel} className="flex-row items-center">
            <X size={20} color={colors.dark[200]} />
            <Text className="text-dark-200 ml-1 font-medium">Cancel</Text>
          </TouchableOpacity>
          <Text className="text-dark-50 font-bold text-lg">Select Directory</Text>
          <TouchableOpacity
            onPress={() => onSelect(path)}
            className="flex-row items-center bg-primary-500 px-4 py-2 rounded-full"
          >
            <Check size={16} color="#fff" />
            <Text className="text-white ml-1.5 font-medium text-sm">Select</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View className="relative">
          <View className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
            <Search size={16} color={colors.dark[300]} />
          </View>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Filter directories..."
            placeholderTextColor={colors.dark[300]}
            className="bg-dark-700 border border-dark-500 rounded-xl pl-10 pr-4 py-3 text-dark-50"
          />
        </View>
      </View>

      {/* Quick Paths */}
      <View className="border-b border-dark-500">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 py-3">
          <View className="flex-row gap-2">
            {QUICK_PATHS.map((quick) => (
              <TouchableOpacity
                key={quick.path}
                onPress={() => handleQuickPath(quick.path)}
                className={`px-4 py-1.5 rounded-full border ${
                  path === quick.path || path.startsWith(quick.path + '/')
                    ? 'bg-primary-500/10 border-primary-500'
                    : 'bg-dark-700 border-dark-500'
                }`}
              >
                <Text
                  className={`text-xs font-medium ${
                    path === quick.path || path.startsWith(quick.path + '/')
                      ? 'text-primary-500'
                      : 'text-dark-200'
                  }`}
                >
                  {quick.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Breadcrumb */}
      <View className="border-b border-dark-500">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 py-3">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={handleGoBack}
              className="mr-3"
              disabled={path === '~' || path === '/'}
            >
              <ArrowLeft
                size={18}
                color={path === '~' || path === '/' ? colors.dark[400] : colors.primary[500]}
              />
            </TouchableOpacity>
            {breadcrumbs.map((crumb, index) => (
              <View key={crumb.path} className="flex-row items-center">
                {index > 0 && (
                  <ChevronRight size={14} color={colors.dark[400]} style={{ marginHorizontal: 4 }} />
                )}
                <TouchableOpacity
                  onPress={() => setCurrentPath(deviceId, crumb.path)}
                >
                  <Text
                    className={`text-sm font-medium ${
                      index === breadcrumbs.length - 1 ? 'text-dark-50' : 'text-dark-300'
                    }`}
                  >
                    {crumb.label}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Current Path Display */}
      <View className="px-4 py-2 bg-dark-700/50">
        <Text className="text-dark-300 text-xs font-mono" numberOfLines={1}>
          {path}
        </Text>
      </View>

      {/* Directory List */}
      <ScrollView className="flex-1 px-4" contentContainerClassName="py-4">
        {isLoadingDirectory ? (
          <View className="bg-dark-700 border border-dark-500 rounded-xl p-8 items-center">
            <ActivityIndicator size="large" color={colors.primary[500]} />
            <Text className="text-dark-200 mt-4">Loading...</Text>
          </View>
        ) : directories.length === 0 ? (
          <View className="bg-dark-700 border border-dark-500 rounded-xl p-8 items-center">
            <Folder size={48} color={colors.dark[400]} />
            <Text className="text-dark-200 mt-4 text-center">
              {searchQuery ? 'No matching directories' : 'No subdirectories'}
            </Text>
          </View>
        ) : (
          <View className="gap-2">
            {directories.map((entry) => (
              <TouchableOpacity
                key={entry.path}
                onPress={() => handleNavigate(entry)}
                className="bg-dark-700 border border-dark-500 rounded-xl p-4 flex-row items-center"
              >
                <View className="w-10 h-10 bg-dark-800 border border-dark-500 rounded-lg items-center justify-center mr-3">
                  <Folder size={20} color={colors.primary[500]} />
                </View>
                <Text className="text-dark-50 flex-1 font-medium" numberOfLines={1}>
                  {entry.name}
                </Text>
                <ChevronRight size={18} color={colors.dark[400]} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Select Current Directory Button */}
      <View className="p-4 border-t border-dark-500 bg-dark-800">
        <TouchableOpacity
          onPress={() => onSelect(path)}
          className="bg-primary-500 rounded-xl p-4 flex-row items-center justify-center gap-2"
          style={{
            shadowColor: colors.primary[500],
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.2,
            shadowRadius: 12,
            elevation: 5,
          }}
        >
          <Check size={18} color="#fff" />
          <Text className="text-white font-bold">Select This Directory</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
