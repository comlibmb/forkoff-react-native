import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronRight, ChevronDown } from 'lucide-react-native';
import { colors } from '@/theme/colors';

interface BashToolBlockProps {
  command: string;
  description?: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export function BashToolBlock({ command, description, isExpanded, onToggleExpand }: BashToolBlockProps) {
  return (
    <View testID="bash-tool-block" style={{ marginBottom: 6, backgroundColor: '#1a1a2e', borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: colors.dark[600] }}>
      <TouchableOpacity
        onPress={onToggleExpand}
        style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10 }}
      >
        {isExpanded ? (
          <ChevronDown size={14} color={colors.error[400]} />
        ) : (
          <ChevronRight size={14} color={colors.error[400]} />
        )}
        <Text style={{ fontFamily: 'monospace', fontSize: 12, marginLeft: 8, color: colors.success[300], fontWeight: '700' }}>$</Text>
        <Text
          numberOfLines={isExpanded ? undefined : 1}
          style={{ fontFamily: 'monospace', fontSize: 12, marginLeft: 6, color: colors.dark[50], flex: 1 }}
        >
          {command}
        </Text>
      </TouchableOpacity>
      {isExpanded && description && (
        <View style={{ paddingHorizontal: 10, paddingBottom: 8, marginLeft: 36 }}>
          <Text style={{ fontFamily: 'monospace', fontSize: 11, color: colors.dark[300], fontStyle: 'italic' }}>
            {description}
          </Text>
        </View>
      )}
    </View>
  );
}
