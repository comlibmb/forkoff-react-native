/**
 * TokenUsageDisplay - Token count display matching Claude Code CLI style
 *
 * Shows input/output token counts prominently.
 * Format: "↑ 12.5K ↓ 1.2K" with colored arrows
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { ArrowUp, ArrowDown, Zap } from 'lucide-react-native';
import { colors } from '@/theme/colors';

interface TokenUsageDisplayProps {
  inputTokens: number;
  outputTokens: number;
  showIcon?: boolean;
  compact?: boolean;
  style?: 'header' | 'inline' | 'full';
}

/**
 * Format token count for display
 * - Under 1000: show exact number
 * - 1000-9999: show with 1 decimal (e.g., 1.2K)
 * - 10000+: show rounded to nearest K (e.g., 12K)
 */
function formatTokenCount(count: number): string {
  if (count < 1000) {
    return count.toString();
  }
  if (count < 10000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return `${Math.round(count / 1000)}K`;
}

export function TokenUsageDisplay({
  inputTokens,
  outputTokens,
  showIcon = true,
  compact = false,
  style = 'inline',
}: TokenUsageDisplayProps) {
  if (inputTokens === 0 && outputTokens === 0) {
    return null;
  }

  const inputFormatted = formatTokenCount(inputTokens);
  const outputFormatted = formatTokenCount(outputTokens);

  // Header style - compact for the top bar
  if (style === 'header' || compact) {
    return (
      <View style={styles.headerContainer}>
        <View style={styles.tokenPair}>
          <ArrowUp size={10} color={colors.success[400]} strokeWidth={3} />
          <Text style={styles.headerValue}>{inputFormatted}</Text>
        </View>
        <View style={styles.tokenPair}>
          <ArrowDown size={10} color={colors.primary[400]} strokeWidth={3} />
          <Text style={styles.headerValue}>{outputFormatted}</Text>
        </View>
      </View>
    );
  }

  // Full style - for status bar or detailed view
  if (style === 'full') {
    return (
      <View style={styles.fullContainer}>
        <Zap size={14} color={colors.warning[400]} />
        <View style={styles.fullTokens}>
          <View style={styles.fullTokenItem}>
            <ArrowUp size={12} color={colors.success[400]} strokeWidth={2.5} />
            <Text style={styles.fullLabel}>in</Text>
            <Text style={styles.fullValue}>{inputFormatted}</Text>
          </View>
          <Text style={styles.fullSeparator}>·</Text>
          <View style={styles.fullTokenItem}>
            <ArrowDown size={12} color={colors.primary[400]} strokeWidth={2.5} />
            <Text style={styles.fullLabel}>out</Text>
            <Text style={styles.fullValue}>{outputFormatted}</Text>
          </View>
        </View>
      </View>
    );
  }

  // Inline style (default)
  return (
    <View style={styles.inlineContainer}>
      {showIcon && <Zap size={12} color={colors.warning[400]} />}
      <Text style={styles.inlineText}>
        <Text style={styles.inlineUp}>↑</Text>{inputFormatted}
        <Text style={styles.inlineSep}> · </Text>
        <Text style={styles.inlineDown}>↓</Text>{outputFormatted}
      </Text>
    </View>
  );
}

// Inline version for use in text or headers
export function TokenUsageInline({
  inputTokens,
  outputTokens,
}: {
  inputTokens: number;
  outputTokens: number;
}) {
  if (inputTokens === 0 && outputTokens === 0) {
    return null;
  }

  return (
    <Text style={styles.inlineOnlyText}>
      <Text style={styles.inlineUp}>↑</Text>{formatTokenCount(inputTokens)}
      <Text style={styles.inlineSep}> </Text>
      <Text style={styles.inlineDown}>↓</Text>{formatTokenCount(outputTokens)}
    </Text>
  );
}

const styles = StyleSheet.create({
  // Header style (compact, for top bar)
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.dark[800],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tokenPair: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  headerValue: {
    fontSize: 11,
    color: colors.dark[100],
    fontFamily: 'monospace',
    fontWeight: '600',
  },

  // Full style (status bar)
  fullContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.dark[800],
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  fullTokens: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fullTokenItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fullLabel: {
    fontSize: 11,
    color: colors.dark[400],
    textTransform: 'uppercase',
  },
  fullValue: {
    fontSize: 13,
    color: colors.dark[50],
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  fullSeparator: {
    fontSize: 14,
    color: colors.dark[500],
  },

  // Inline style
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inlineText: {
    fontSize: 12,
    color: colors.dark[200],
    fontFamily: 'monospace',
  },
  inlineUp: {
    color: colors.success[400],
    fontWeight: '700',
  },
  inlineDown: {
    color: colors.primary[400],
    fontWeight: '700',
  },
  inlineSep: {
    color: colors.dark[500],
  },
  inlineOnlyText: {
    fontSize: 11,
    color: colors.dark[200],
    fontFamily: 'monospace',
  },
});

export default TokenUsageDisplay;
