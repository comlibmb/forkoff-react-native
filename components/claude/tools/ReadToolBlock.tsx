import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronRight, ChevronDown } from 'lucide-react-native';
import { colors } from '@/theme/colors';

interface ReadToolBlockProps {
  filePath?: string;
  limit?: number;
  offset?: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export function ReadToolBlock({ filePath, limit, offset, isExpanded, onToggleExpand }: ReadToolBlockProps) {
  const fileName = filePath?.split(/[/\\]/).pop();

  let lineRange = '';
  if (offset && limit) {
    lineRange = `Lines ${offset}-${offset + limit}`;
  } else if (offset) {
    lineRange = `From line ${offset}`;
  } else if (limit) {
    lineRange = `First ${limit} lines`;
  }

  return (
    <View testID="read-tool-block" style={{ marginBottom: 6, backgroundColor: colors.dark[800], borderRadius: 8, overflow: 'hidden' }}>
      <TouchableOpacity
        onPress={onToggleExpand}
        style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10 }}
      >
        {isExpanded ? (
          <ChevronDown size={14} color={colors.success[400]} />
        ) : (
          <ChevronRight size={14} color={colors.success[400]} />
        )}
        <Text style={{ fontFamily: 'monospace', fontSize: 12, marginLeft: 8, color: colors.success[400], fontWeight: '500' }}>
          Read
        </Text>
        {fileName && (
          <Text style={{ color: colors.dark[300], fontFamily: 'monospace', fontSize: 12, marginLeft: 8 }} numberOfLines={1}>
            {fileName}
          </Text>
        )}
      </TouchableOpacity>
      {isExpanded && (
        <View style={{ marginLeft: 16, paddingLeft: 10, paddingBottom: 8, paddingRight: 10, borderLeftWidth: 1, borderLeftColor: colors.dark[600] }}>
          {filePath && (
            <Text style={{ fontFamily: 'monospace', fontSize: 11, color: colors.dark[300] }} numberOfLines={2}>
              {filePath}
            </Text>
          )}
          {lineRange ? (
            <Text style={{ fontFamily: 'monospace', fontSize: 11, color: colors.dark[400], marginTop: 2 }}>
              {lineRange}
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
}
