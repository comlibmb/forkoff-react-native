import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Folder, File, ChevronRight, ChevronDown } from 'lucide-react-native';
import { FileNode } from '@/types';
import { useTheme, ThemeColors } from '@/theme/ThemeProvider';

interface FileTreePreviewProps {
  files: FileNode[];
  onFileSelect?: (file: FileNode) => void;
  maxDepth?: number;
}

interface FileNodeItemProps {
  node: FileNode;
  depth: number;
  onSelect?: (file: FileNode) => void;
  maxDepth: number;
  expandedPaths: Set<string>;
  toggleExpanded: (path: string) => void;
  theme: ThemeColors;
}

const fileExtensionColors: Record<string, string> = {
  ts: '#3178c6',
  tsx: '#3178c6',
  js: '#f7df1e',
  jsx: '#f7df1e',
  py: '#3776ab',
  rs: '#dea584',
  go: '#00add8',
  java: '#b07219',
  json: '#cbcb41',
  md: '#083fa1',
  css: '#563d7c',
  html: '#e34c26',
  scss: '#c6538c',
};

function getFileColor(name: string, fallbackColor: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return fileExtensionColors[ext] || fallbackColor;
}

function FileNodeItem({
  node,
  depth,
  onSelect,
  maxDepth,
  expandedPaths,
  toggleExpanded,
  theme,
}: FileNodeItemProps) {
  const isExpanded = expandedPaths.has(node.path);
  const isDirectory = node.type === 'directory';
  const hasChildren = isDirectory && node.children && node.children.length > 0;
  const shouldShowChildren = isExpanded && hasChildren && depth < maxDepth;

  const handlePress = () => {
    if (isDirectory) {
      toggleExpanded(node.path);
    } else {
      onSelect?.(node);
    }
  };

  return (
    <View>
      <TouchableOpacity
        onPress={handlePress}
        className="flex-row items-center py-2"
        style={{ paddingLeft: depth * 16 }}
      >
        {isDirectory ? (
          <>
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown size={14} color={theme.textTertiary} />
              ) : (
                <ChevronRight size={14} color={theme.textTertiary} />
              )
            ) : (
              <View style={{ width: 14 }} />
            )}
            <Folder
              size={16}
              color={theme.warning}
              style={{ marginLeft: 4 }}
            />
          </>
        ) : (
          <>
            <View style={{ width: 14 }} />
            <File
              size={16}
              color={getFileColor(node.name, theme.textTertiary)}
              style={{ marginLeft: 4 }}
            />
          </>
        )}
        <Text
          className="ml-2 flex-1"
          style={{ color: theme.textSecondary }}
          numberOfLines={1}
        >
          {node.name}
        </Text>
      </TouchableOpacity>

      {shouldShowChildren &&
        node.children?.map((child) => (
          <FileNodeItem
            key={child.path}
            node={child}
            depth={depth + 1}
            onSelect={onSelect}
            maxDepth={maxDepth}
            expandedPaths={expandedPaths}
            toggleExpanded={toggleExpanded}
            theme={theme}
          />
        ))}
    </View>
  );
}

export function FileTreePreview({
  files,
  onFileSelect,
  maxDepth = 3,
}: FileTreePreviewProps) {
  const { theme } = useTheme();
  const [expandedPaths, setExpandedPaths] = React.useState<Set<string>>(
    new Set()
  );

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

  if (files.length === 0) {
    return (
      <View className="items-center py-8">
        <Folder size={48} color={theme.backgroundTertiary} />
        <Text className="mt-4" style={{ color: theme.textTertiary }}>No files to display</Text>
      </View>
    );
  }

  return (
    <View>
      {files.map((file) => (
        <FileNodeItem
          key={file.path}
          node={file}
          depth={0}
          onSelect={onFileSelect}
          maxDepth={maxDepth}
          expandedPaths={expandedPaths}
          toggleExpanded={toggleExpanded}
          theme={theme}
        />
      ))}
    </View>
  );
}

export default FileTreePreview;
