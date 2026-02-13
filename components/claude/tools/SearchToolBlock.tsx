import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronRight, ChevronDown } from 'lucide-react-native';
import { colors } from '@/theme/colors';

interface SearchToolBlockProps {
  toolName: 'Grep' | 'Glob';
  pattern?: string;
  path?: string;
  glob?: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export function SearchToolBlock({ toolName, pattern, path, glob, isExpanded, onToggleExpand }: SearchToolBlockProps) {
  return (
    <View testID="search-tool-block" style={{ marginBottom: 6, backgroundColor: colors.dark[800], borderRadius: 8, overflow: 'hidden' }}>
      <TouchableOpacity
        onPress={onToggleExpand}
        style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10 }}
      >
        {isExpanded ? (
          <ChevronDown size={14} color={colors.info[400]} />
        ) : (
          <ChevronRight size={14} color={colors.info[400]} />
        )}
        <Text style={{ fontFamily: 'monospace', fontSize: 12, marginLeft: 8, color: colors.info[400], fontWeight: '500' }}>
          {toolName}
        </Text>
        {pattern && (
          <Text style={{ color: colors.dark[200], fontFamily: 'monospace', fontSize: 12, marginLeft: 8, flex: 1 }} numberOfLines={1}>
            {pattern}
          </Text>
        )}
      </TouchableOpacity>
      {isExpanded && (
        <View style={{ marginLeft: 16, paddingLeft: 10, paddingBottom: 8, paddingRight: 10, borderLeftWidth: 1, borderLeftColor: colors.dark[600] }}>
          {path && (
            <Text style={{ fontFamily: 'monospace', fontSize: 11, color: colors.dark[300] }} numberOfLines={2}>
              Path: {path}
            </Text>
          )}
          {glob && (
            <Text style={{ fontFamily: 'monospace', fontSize: 11, color: colors.dark[400], marginTop: 2 }}>
              Filter: {glob}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}
