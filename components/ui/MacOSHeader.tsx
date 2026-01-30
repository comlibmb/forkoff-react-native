/**
 * MacOSHeader - Reusable macOS-styled header component
 *
 * Features the classic traffic light dots and terminal-style title bar
 * for consistent macOS design language across the app.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '@/theme/colors';

interface MacOSHeaderProps {
  /** Title shown in the title bar */
  title?: string;
  /** Screen title shown below the title bar */
  screenTitle?: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Right side element (button, badge, etc) */
  rightElement?: React.ReactNode;
  /** Show border at bottom */
  showBorder?: boolean;
  /** Compact mode - smaller padding */
  compact?: boolean;
}

export function MacOSHeader({
  title = 'forkoff',
  screenTitle,
  subtitle,
  rightElement,
  showBorder = true,
  compact = false,
}: MacOSHeaderProps) {
  return (
    <View style={[styles.container, showBorder && styles.containerBorder]}>
      {/* macOS Title Bar with traffic light dots */}
      <View style={styles.titleBar}>
        <View style={styles.dotsContainer}>
          <View style={[styles.dot, styles.dotRed]} />
          <View style={[styles.dot, styles.dotYellow]} />
          <View style={[styles.dot, styles.dotGreen]} />
        </View>
        <Text style={styles.titleBarText}>{title}</Text>
      </View>

      {/* Screen Title */}
      {screenTitle && (
        <View style={[styles.screenHeader, compact && styles.screenHeaderCompact]}>
          <View style={styles.titleRow}>
            <View style={styles.titleContainer}>
              <Text style={styles.screenTitle}>{screenTitle}</Text>
              {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>
            {rightElement}
          </View>
        </View>
      )}
    </View>
  );
}

/**
 * MacOSTitleBar - Standalone title bar for cards and sections
 */
export function MacOSTitleBar({
  title = 'forkoff',
  showDots = true,
}: {
  title?: string;
  showDots?: boolean;
}) {
  return (
    <View style={styles.titleBar}>
      {showDots && (
        <View style={styles.dotsContainer}>
          <View style={[styles.dot, styles.dotRed]} />
          <View style={[styles.dot, styles.dotYellow]} />
          <View style={[styles.dot, styles.dotGreen]} />
        </View>
      )}
      <Text style={styles.titleBarText}>{title}</Text>
    </View>
  );
}

/**
 * MacOSCard - Card with macOS styling
 */
export function MacOSCard({
  title,
  children,
  showTitleBar = true,
  style,
}: {
  title?: string;
  children: React.ReactNode;
  showTitleBar?: boolean;
  style?: object;
}) {
  return (
    <View style={[styles.card, style]}>
      {showTitleBar && <MacOSTitleBar title={title} />}
      <View style={styles.cardContent}>{children}</View>
      <View style={styles.accentBar} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.dark[800],
  },
  containerBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.dark[500],
  },
  titleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.dark[700],
    borderBottomWidth: 1,
    borderBottomColor: colors.dark[600],
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotRed: {
    backgroundColor: colors.error[300],
  },
  dotYellow: {
    backgroundColor: colors.warning[300],
  },
  dotGreen: {
    backgroundColor: colors.success[200],
  },
  titleBarText: {
    fontSize: 12,
    color: colors.dark[300],
    fontFamily: 'monospace',
    marginLeft: 10,
  },
  screenHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  screenHeaderCompact: {
    paddingTop: 12,
    paddingBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  titleContainer: {
    flex: 1,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.dark[50],
  },
  subtitle: {
    fontSize: 14,
    color: colors.dark[300],
    marginTop: 4,
  },
  card: {
    backgroundColor: colors.dark[800],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.dark[600],
    overflow: 'hidden',
  },
  cardContent: {
    padding: 16,
  },
  accentBar: {
    height: 3,
    backgroundColor: colors.primary[500],
  },
});

export default MacOSHeader;
