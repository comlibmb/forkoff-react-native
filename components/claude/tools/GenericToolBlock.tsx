import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronRight, ChevronDown } from 'lucide-react-native';
import { colors } from '@/theme/colors';

interface GenericToolBlockProps {
  toolName: string;
  fileName?: string;
  content?: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export function GenericToolBlock({ toolName, fileName, content, isExpanded, onToggleExpand }: GenericToolBlockProps) {
  const hasContent = !!content;

  return (
    <View testID="generic-tool-block" style={{ marginBottom: 6, backgroundColor: colors.dark[800], borderRadius: 8, overflow: 'hidden' }}>
      {hasContent ? (
        <TouchableOpacity
          onPress={onToggleExpand}
          style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10 }}
        >
          {isExpanded ? (
            <ChevronDown size={14} color={colors.dark[300]} />
          ) : (
            <ChevronRight size={14} color={colors.dark[300]} />
          )}
          <Text style={{ fontFamily: 'monospace', fontSize: 12, marginLeft: 8, color: colors.dark[200], fontWeight: '500' }}>
            {toolName}
          </Text>
          {fileName && (
            <Text style={{ color: colors.dark[300], fontFamily: 'monospace', fontSize: 12, marginLeft: 8 }}>
              {fileName}
            </Text>
          )}
        </TouchableOpacity>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10 }}>
          <Text style={{ fontFamily: 'monospace', fontSize: 12, color: colors.dark[200], fontWeight: '500' }}>
            {toolName}
          </Text>
          {fileName && (
            <Text style={{ color: colors.dark[300], fontFamily: 'monospace', fontSize: 12, marginLeft: 8 }}>
              {fileName}
            </Text>
          )}
        </View>
      )}
      {isExpanded && hasContent && (
        <View style={{ marginLeft: 16, paddingLeft: 10, paddingBottom: 8, paddingRight: 10, borderLeftWidth: 1, borderLeftColor: colors.dark[600] }}>
          <Text style={{ color: colors.dark[400], fontFamily: 'monospace', fontSize: 12 }}>
            {content.substring(0, 500)}
            {content.length > 500 ? '...' : ''}
          </Text>
        </View>
      )}
    </View>
  );
}
