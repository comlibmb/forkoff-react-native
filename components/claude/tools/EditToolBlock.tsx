import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronRight, ChevronDown } from 'lucide-react-native';
import { colors } from '@/theme/colors';

interface EditToolBlockProps {
  filePath?: string;
  oldString?: string;
  newString?: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

function countLines(str?: string): number {
  if (!str) return 0;
  return str.split('\n').length;
}

export function EditToolBlock({ filePath, oldString, newString, isExpanded, onToggleExpand }: EditToolBlockProps) {
  const fileName = filePath?.split(/[/\\]/).pop();
  const removedLines = countLines(oldString);
  const addedLines = countLines(newString);

  let summary = '';
  if (oldString && newString) {
    summary = `${removedLines} removed, ${addedLines} added`;
  } else if (newString) {
    summary = `${addedLines} lines added`;
  } else if (oldString) {
    summary = `${removedLines} lines removed`;
  }

  return (
    <View testID="edit-tool-block" style={{ marginBottom: 6, backgroundColor: colors.dark[800], borderRadius: 8, overflow: 'hidden' }}>
      <TouchableOpacity
        onPress={onToggleExpand}
        style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10 }}
      >
        {isExpanded ? (
          <ChevronDown size={14} color={colors.warning[400]} />
        ) : (
          <ChevronRight size={14} color={colors.warning[400]} />
        )}
        <Text style={{ fontFamily: 'monospace', fontSize: 12, marginLeft: 8, color: colors.warning[400], fontWeight: '500' }}>
          Edit
        </Text>
        {fileName && (
          <Text style={{ color: colors.dark[300], fontFamily: 'monospace', fontSize: 12, marginLeft: 8 }}>
            {fileName}
          </Text>
        )}
        {!isExpanded && summary ? (
          <Text style={{ color: colors.dark[400], fontFamily: 'monospace', fontSize: 11, marginLeft: 8 }}>
            ({summary})
          </Text>
        ) : null}
      </TouchableOpacity>
      {isExpanded && (
        <View style={{ marginLeft: 16, paddingLeft: 10, paddingBottom: 8, paddingRight: 10, borderLeftWidth: 1, borderLeftColor: colors.dark[600] }}>
          {oldString ? (
            oldString.split('\n').slice(0, 30).map((line, i) => (
              <View key={`old-${i}`} style={{ backgroundColor: 'rgba(218, 54, 51, 0.1)' }}>
                <Text style={{ fontFamily: 'monospace', fontSize: 12, color: colors.error[300] }}>
                  -{line}
                </Text>
              </View>
            ))
          ) : null}
          {newString ? (
            newString.split('\n').slice(0, 30).map((line, i) => (
              <View key={`new-${i}`} style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
                <Text style={{ fontFamily: 'monospace', fontSize: 12, color: colors.success[300] }}>
                  +{line}
                </Text>
              </View>
            ))
          ) : null}
        </View>
      )}
    </View>
  );
}
