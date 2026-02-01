import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

interface CodeViewerProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
  highlightLines?: number[];
  startLine?: number;
}

// Basic syntax highlighting patterns
const patterns = {
  keyword: /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|default|async|await|try|catch|throw|new|this|typeof|instanceof)\b/g,
  string: /(["'`])(?:(?=(\\?))\2.)*?\1/g,
  comment: /\/\/.*$|\/\*[\s\S]*?\*\//gm,
  number: /\b\d+\.?\d*\b/g,
  function: /\b([a-zA-Z_]\w*)\s*(?=\()/g,
  type: /\b(string|number|boolean|void|null|undefined|any|never|object|Array|Promise)\b/g,
};

function highlightCode(code: string): { text: string; type: string }[] {
  // This is a simplified highlighter
  // In production, you'd use a proper syntax highlighting library
  const tokens: { text: string; type: string; index: number }[] = [];

  // Find all matches
  Object.entries(patterns).forEach(([type, pattern]) => {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(code)) !== null) {
      tokens.push({
        text: match[0],
        type,
        index: match.index,
      });
    }
  });

  // Sort by index
  tokens.sort((a, b) => a.index - b.index);

  // Build result
  const result: { text: string; type: string }[] = [];
  let lastIndex = 0;

  tokens.forEach((token) => {
    // Add any text before this token
    if (token.index > lastIndex) {
      result.push({
        text: code.slice(lastIndex, token.index),
        type: 'plain',
      });
    }

    // Don't add overlapping tokens
    if (token.index >= lastIndex) {
      result.push(token);
      lastIndex = token.index + token.text.length;
    }
  });

  // Add remaining text
  if (lastIndex < code.length) {
    result.push({
      text: code.slice(lastIndex),
      type: 'plain',
    });
  }

  return result;
}

export function CodeViewer({
  code,
  language = 'typescript',
  showLineNumbers = true,
  highlightLines = [],
  startLine = 1,
}: CodeViewerProps) {
  const { theme, colors } = useTheme();
  const lines = code.split('\n');

  const tokenColors: Record<string, string> = {
    keyword: colors.primary[400],
    string: theme.success,
    comment: theme.border,
    number: colors.warning[500],
    function: '#dcdcaa',
    type: '#4ec9b0',
    plain: theme.textSecondary,
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      <View>
        {lines.map((line, index) => {
          const lineNumber = startLine + index;
          const isHighlighted = highlightLines.includes(lineNumber);
          const tokens = highlightCode(line || ' ');

          return (
            <View
              key={index}
              style={[
                styles.line,
                isHighlighted && { backgroundColor: theme.primary + '20' },
              ]}
            >
              {showLineNumbers && (
                <Text style={[styles.lineNumber, { color: theme.border }]}>{lineNumber}</Text>
              )}
              <Text style={[styles.code, { color: theme.textSecondary }]}>
                {tokens.map((token, i) => (
                  <Text
                    key={i}
                    style={{ color: tokenColors[token.type] || tokenColors.plain }}
                  >
                    {token.text}
                  </Text>
                ))}
              </Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  line: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    minHeight: 22,
  },
  lineNumber: {
    width: 40,
    fontSize: 13,
    fontFamily: 'monospace',
    textAlign: 'right',
    marginRight: 16,
  },
  code: {
    fontSize: 13,
    fontFamily: 'monospace',
  },
});

export default CodeViewer;
