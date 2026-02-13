import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronRight, ChevronDown } from 'lucide-react-native';
import { colors } from '@/theme/colors';

interface WriteToolBlockProps {
  toolInput: any;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

function parseWriteToolInput(toolInput: any): { filePath?: string; content?: string } {
  if (!toolInput) return {};

  if (typeof toolInput === 'string') {
    try {
      const parsed = JSON.parse(toolInput);
      return { filePath: parsed.file_path, content: parsed.content };
    } catch {
      return {};
    }
  }

  return { filePath: toolInput.file_path, content: toolInput.content };
}

export function WriteToolBlock({ toolInput, isExpanded, onToggleExpand }: WriteToolBlockProps) {
  const { filePath, content } = parseWriteToolInput(toolInput);
  const fileName = filePath?.split(/[/\\]/).pop() || 'new file';
  const lines = content?.split('\n') || [];
  const lineCount = lines.length;

  return (
    <View testID="write-tool-block" style={{ marginBottom: 6, backgroundColor: colors.dark[800], borderRadius: 8, overflow: 'hidden' }}>
      <TouchableOpacity
        onPress={onToggleExpand}
        style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10 }}
      >
        {isExpanded ? (
          <ChevronDown size={14} color={colors.primary[400]} />
        ) : (
          <ChevronRight size={14} color={colors.primary[400]} />
        )}
        <Text style={{ fontFamily: 'monospace', fontSize: 12, marginLeft: 8, color: colors.primary[400], fontWeight: '500' }}>
          Write
        </Text>
        {fileName && (
          <Text style={{ color: colors.dark[300], fontFamily: 'monospace', fontSize: 12, marginLeft: 8 }}>
            {fileName}
          </Text>
        )}
      </TouchableOpacity>
      {isExpanded && content && (
        <View style={{ marginLeft: 16, paddingLeft: 10, paddingBottom: 8, paddingRight: 10, borderLeftWidth: 1, borderLeftColor: colors.dark[600] }}>
          {/* New file header */}
          <View style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginBottom: 4 }}>
            <Text style={{ fontFamily: 'monospace', fontSize: 12, color: colors.success[400] }}>
              +++ {fileName} (new file, {lineCount} lines)
            </Text>
          </View>
          {/* Content as additions */}
          {lines.slice(0, 50).map((line, index) => (
            <View key={index} style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
              <Text style={{ fontFamily: 'monospace', fontSize: 12, color: colors.success[400] }}>
                +{line}
              </Text>
            </View>
          ))}
          {lines.length > 50 && (
            <View style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
              <Text style={{ fontFamily: 'monospace', fontSize: 12, color: colors.dark[400] }}>
                ... and {lines.length - 50} more lines
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
