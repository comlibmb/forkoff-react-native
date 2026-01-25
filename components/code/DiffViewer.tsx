import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';

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
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  const diffLines = computeDiff(oldLines, newLines);

  const addedCount = diffLines.filter((l) => l.type === 'added').length;
  const removedCount = diffLines.filter((l) => l.type === 'removed').length;

  return (
    <View style={styles.container}>
      {/* Header */}
      {fileName && (
        <View style={styles.header}>
          <Text style={styles.fileName}>{fileName}</Text>
          <View style={styles.stats}>
            <Text style={styles.addedStat}>+{addedCount}</Text>
            <Text style={styles.removedStat}>-{removedCount}</Text>
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
                line.type === 'added' && styles.addedLine,
                line.type === 'removed' && styles.removedLine,
              ]}
            >
              {/* Line numbers */}
              <Text style={styles.lineNumber}>
                {line.oldLineNumber ?? ' '}
              </Text>
              <Text style={styles.lineNumber}>
                {line.newLineNumber ?? ' '}
              </Text>

              {/* Change indicator */}
              <Text style={[styles.indicator,
                line.type === 'added' && styles.addedIndicator,
                line.type === 'removed' && styles.removedIndicator,
              ]}>
                {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
              </Text>

              {/* Content */}
              <Text style={[styles.code,
                line.type === 'added' && styles.addedText,
                line.type === 'removed' && styles.removedText,
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
    backgroundColor: colors.dark[900],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.dark[800],
    borderBottomWidth: 1,
    borderBottomColor: colors.dark[700],
  },
  fileName: {
    color: colors.dark[200],
    fontFamily: 'monospace',
    fontSize: 13,
  },
  stats: {
    flexDirection: 'row',
    gap: 12,
  },
  addedStat: {
    color: colors.success[500],
    fontWeight: '600',
    fontSize: 13,
  },
  removedStat: {
    color: colors.error[500],
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
  addedLine: {
    backgroundColor: colors.success[500] + '15',
  },
  removedLine: {
    backgroundColor: colors.error[500] + '15',
  },
  lineNumber: {
    width: 40,
    color: colors.dark[500],
    fontSize: 12,
    fontFamily: 'monospace',
    textAlign: 'right',
    paddingHorizontal: 8,
  },
  indicator: {
    width: 20,
    color: colors.dark[500],
    fontSize: 12,
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  addedIndicator: {
    color: colors.success[500],
  },
  removedIndicator: {
    color: colors.error[500],
  },
  code: {
    flex: 1,
    color: colors.dark[200],
    fontSize: 12,
    fontFamily: 'monospace',
    paddingRight: 16,
  },
  addedText: {
    color: colors.success[400],
  },
  removedText: {
    color: colors.error[400],
  },
});

export default DiffViewer;
