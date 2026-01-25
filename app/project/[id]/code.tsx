import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Folder, File, ChevronRight, ChevronDown } from 'lucide-react-native';
import { Card } from '@/components/ui';
import { useProjectStore } from '@/stores/project.store';
import { projectService } from '@/services/project.service';
import { FileNode } from '@/types';
import { colors } from '@/theme/colors';

const fileExtensionColors: Record<string, string> = {
  ts: '#3178c6',
  tsx: '#3178c6',
  js: '#f7df1e',
  jsx: '#f7df1e',
  py: '#3776ab',
  rs: '#dea584',
  go: '#00add8',
  json: '#cbcb41',
  md: '#083fa1',
  css: '#563d7c',
  html: '#e34c26',
};

function getFileColor(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return fileExtensionColors[ext] || colors.dark[400];
}

interface FileItemProps {
  node: FileNode;
  depth: number;
  projectId: string;
  expandedPaths: Set<string>;
  toggleExpanded: (path: string) => void;
}

function FileItem({
  node,
  depth,
  projectId,
  expandedPaths,
  toggleExpanded,
}: FileItemProps) {
  const isExpanded = expandedPaths.has(node.path);
  const isDirectory = node.type === 'directory';
  const hasChildren = isDirectory && node.children && node.children.length > 0;

  const handlePress = () => {
    if (isDirectory) {
      toggleExpanded(node.path);
    } else {
      router.push(`/project/${projectId}/file?path=${encodeURIComponent(node.path)}`);
    }
  };

  return (
    <View>
      <TouchableOpacity
        onPress={handlePress}
        className="flex-row items-center py-3 border-b border-dark-800"
        style={{ paddingLeft: 16 + depth * 20 }}
      >
        {isDirectory ? (
          <>
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown size={16} color={colors.dark[400]} />
              ) : (
                <ChevronRight size={16} color={colors.dark[400]} />
              )
            ) : (
              <View style={{ width: 16 }} />
            )}
            <Folder
              size={18}
              color={colors.warning[500]}
              style={{ marginLeft: 8 }}
            />
          </>
        ) : (
          <>
            <View style={{ width: 16 }} />
            <File
              size={18}
              color={getFileColor(node.name)}
              style={{ marginLeft: 8 }}
            />
          </>
        )}
        <Text
          className="text-dark-100 ml-3 flex-1"
          numberOfLines={1}
        >
          {node.name}
        </Text>
        {!isDirectory && (
          <ChevronRight size={16} color={colors.dark[500]} />
        )}
      </TouchableOpacity>

      {isExpanded &&
        hasChildren &&
        node.children?.map((child) => (
          <FileItem
            key={child.path}
            node={child}
            depth={depth + 1}
            projectId={projectId}
            expandedPaths={expandedPaths}
            toggleExpanded={toggleExpanded}
          />
        ))}
    </View>
  );
}

export default function CodeBrowserScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { fileTree, fetchFileTree } = useProjectStore();
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  const files = fileTree[id] || [];

  useEffect(() => {
    if (id) {
      fetchFileTree(id);
    }
  }, [id]);

  const toggleExpanded = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-dark-900" edges={['top']}>
      {/* Header */}
      <View className="px-6 pt-4 pb-4 flex-row items-center border-b border-dark-800">
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center"
        >
          <ArrowLeft size={24} color={colors.dark[300]} />
          <Text className="text-dark-300 ml-2">Back</Text>
        </TouchableOpacity>

        <Text className="text-white font-semibold ml-4">Files</Text>
      </View>

      <ScrollView className="flex-1">
        {files.length === 0 ? (
          <View className="items-center py-12">
            <Folder size={48} color={colors.dark[600]} />
            <Text className="text-dark-400 mt-4">No files found</Text>
          </View>
        ) : (
          files.map((file) => (
            <FileItem
              key={file.path}
              node={file}
              depth={0}
              projectId={id}
              expandedPaths={expandedPaths}
              toggleExpanded={toggleExpanded}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
