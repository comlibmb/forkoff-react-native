import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

interface DiffLine {
  type: 'unchanged' | 'added' | 'removed';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

interface DiffViewerProps {
  oldContent: string;
  newContent: string;
  fileName?: string;
}

function computeDiff(oldLines: string[], newLines: string[]): DiffLine[] {
  // Simple line-by-line diff
  // In production, you'd use a proper diff algorithm like Myers diff
  const result: DiffLine[] = [];

  let oldIndex = 0;
  let newIndex = 0;
  let oldLineNum = 1;
  let newLineNum = 1;

  while (oldIndex < oldLines.length || newIndex < newLines.length) {
    if (oldIndex >= oldLines.length) {
      // All remaining lines are additions
      result.push({
        type: 'added',
        content: newLines[newIndex],
        newLineNumber: newLineNum++,
      });
      newIndex++;
    } else if (newIndex >= newLines.length) {
      // All remaining lines are removals
      result.push({
        type: 'removed',
        content: oldLines[oldIndex],
        oldLineNumber: oldLineNum++,
      });
      oldIndex++;
    } else if (oldLines[oldIndex] === newLines[newIndex]) {
      // Lines match
      result.push({
        type: 'unchanged',
        content: oldLines[oldIndex],
        oldLineNumber: oldLineNum++,
        newLineNumber: newLineNum++,
      });
      oldIndex++;
      newIndex++;
    } else {
      // Lines differ - check if it's a removal, addition, or modification
      // Simple heuristic: look ahead to see if old line appears later in new
      const oldLineInNew = newLines.slice(newIndex + 1).indexOf(oldLines[oldIndex]);
      const newLineInOld = oldLines.slice(oldIndex + 1).indexOf(newLines[newIndex]);

      if (newLineInOld !== -1 && (oldLineInNew === -1 || newLineInOld < oldLineInNew)) {
        // Old line appears later, so this is an addition
        result.push({
          type: 'added',
          content: newLines[newIndex],
          newLineNumber: newLineNum++,
        });
        newIndex++;
      } else {
        // Otherwise, treat as removal followed by any additions
        result.push({
          type: 'removed',
          content: oldLines[oldIndex],
          oldLineNumber: oldLineNum++,
        });
        oldIndex++;
      }
    }
  }

  return result;
}

export function DiffViewer({ oldContent, newContent, fileName }: DiffViewerProps) {
  const { theme, colors } = useTheme();
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  const diffLines = computeDiff(oldLines, newLines);

  const addedCount = diffLines.filter((l) => l.type === 'added').length;
  const removedCount = diffLines.filter((l) => l.type === 'removed').length;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      {fileName && (
        <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.card }]}>
          <Text style={[styles.fileName, { color: theme.textSecondary }]}>{fileName}</Text>
          <View style={styles.stats}>
            <Text style={[styles.addedStat, { color: theme.success }]}>+{addedCount}</Text>
            <Text style={[styles.removedStat, { color: theme.error }]}>-{removedCount}</Text>
          </View>
        </View>
      )}

      {/* Diff content */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.content}>
          {diffLines.map((line, index) => (
            <View
              key={index}
              style={[
                styles.line,
                line.type === 'added' && { backgroundColor: theme.success + '15' },
                line.type === 'removed' && { backgroundColor: theme.error + '15' },
              ]}
            >
              {/* Line numbers */}
              <Text style={[styles.lineNumber, { color: theme.border }]}>
                {line.oldLineNumber ?? ' '}
              </Text>
              <Text style={[styles.lineNumber, { color: theme.border }]}>
                {line.newLineNumber ?? ' '}
              </Text>

              {/* Change indicator */}
              <Text style={[
                styles.indicator,
                { color: theme.border },
                line.type === 'added' && { color: theme.success },
                line.type === 'removed' && { color: theme.error },
              ]}>
                {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
              </Text>

              {/* Content */}
              <Text style={[
                styles.code,
                { color: theme.textSecondary },
                line.type === 'added' && { color: colors.success[400] },
                line.type === 'removed' && { color: colors.error[400] },
              ]}>
                {line.content || ' '}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  fileName: {
    fontFamily: 'monospace',
    fontSize: 13,
  },
  stats: {
    flexDirection: 'row',
    gap: 12,
  },
  addedStat: {
    fontWeight: '600',
    fontSize: 13,
  },
  removedStat: {
    fontWeight: '600',
    fontSize: 13,
  },
  content: {
    paddingVertical: 8,
  },
  line: {
    flexDirection: 'row',
    paddingVertical: 1,
    minHeight: 22,
  },
  lineNumber: {
    width: 40,
    fontSize: 12,
    fontFamily: 'monospace',
    textAlign: 'right',
    paddingHorizontal: 8,
  },
  indicator: {
    width: 20,
    fontSize: 12,
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  code: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'monospace',
    paddingRight: 16,
  },
});

export default DiffViewer;
