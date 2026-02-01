import React, { useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTheme, ThemeColors } from '@/theme/ThemeProvider';

export interface TerminalLine {
  id: string;
  content: string;
  type: 'input' | 'output' | 'error' | 'info' | 'success';
  timestamp: string;
}

interface TerminalOutputProps {
  lines: TerminalLine[];
  autoScroll?: boolean;
  showTimestamps?: boolean;
  maxLines?: number;
}

const getLineColors = (theme: ThemeColors): Record<TerminalLine['type'], string> => ({
  input: theme.primaryLight,
  output: theme.textSecondary,
  error: theme.error,
  info: theme.info,
  success: theme.success,
});

const linePrefix: Record<TerminalLine['type'], string> = {
  input: '$ ',
  output: '',
  error: '! ',
  info: '> ',
  success: '✓ ',
};

export function TerminalOutput({
  lines,
  autoScroll = true,
  showTimestamps = false,
  maxLines = 1000,
}: TerminalOutputProps) {
  const { theme } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  const lineColors = getLineColors(theme);

  useEffect(() => {
    if (autoScroll && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [lines, autoScroll]);

  const displayLines = lines.slice(-maxLines);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const styles = createStyles(theme);

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={true}
    >
      {displayLines.map((line) => (
        <View key={line.id} style={styles.lineContainer}>
          {showTimestamps && (
            <Text style={styles.timestamp}>
              {formatTimestamp(line.timestamp)}
            </Text>
          )}
          <Text
            style={[
              styles.lineText,
              { color: lineColors[line.type] },
            ]}
            selectable
          >
            <Text style={styles.prefix}>{linePrefix[line.type]}</Text>
            {line.content}
          </Text>
        </View>
      ))}

      {lines.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            Terminal output will appear here...
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      padding: 12,
      paddingBottom: 24,
    },
    lineContainer: {
      flexDirection: 'row',
      paddingVertical: 2,
    },
    timestamp: {
      fontFamily: 'monospace',
      fontSize: 10,
      color: theme.backgroundTertiary,
      marginRight: 8,
      minWidth: 70,
    },
    lineText: {
      fontFamily: 'monospace',
      fontSize: 13,
      lineHeight: 20,
      flex: 1,
    },
    prefix: {
      fontWeight: '600',
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 40,
    },
    emptyText: {
      fontFamily: 'monospace',
      fontSize: 13,
      color: theme.border,
    },
  });

export default TerminalOutput;
