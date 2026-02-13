/**
 * StatusBar - Claude Code CLI-style status bar
 *
 * Shows current activity state with animations:
 * - "Thinking..." with pulsing brain icon
 * - "Formulating response..."
 * - "Reading file..." / "Writing file..." / "Running command..."
 * - Token usage display
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import {
  Brain,
  FileText,
  Terminal,
  Search,
  Pencil,
  Loader,
  Zap,
  MessageSquare,
  Code,
  ArrowUp,
  ArrowDown,
  ClipboardList,
} from 'lucide-react-native';
import { colors } from '@/theme/colors';

export type ActivityState =
  | 'idle'
  | 'thinking'
  | 'formulating'
  | 'reading'
  | 'writing'
  | 'editing'
  | 'searching'
  | 'running'
  | 'responding'
  | 'waiting'
  | 'planning';

interface StatusBarProps {
  activity: ActivityState;
  detail?: string; // e.g., file name being read
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
  };
  isVisible?: boolean;
}

// Activity configuration
const activityConfig: Record<ActivityState, {
  icon: React.ComponentType<any>;
  text: string;
  color: string;
  bgColor: string;
}> = {
  idle: {
    icon: MessageSquare,
    text: 'Ready',
    color: colors.dark[400],
    bgColor: 'transparent',
  },
  thinking: {
    icon: Brain,
    text: 'Thinking',
    color: colors.primary[400],
    bgColor: 'rgba(139, 92, 246, 0.15)',
  },
  formulating: {
    icon: Code,
    text: 'Formulating response',
    color: colors.primary[300],
    bgColor: 'rgba(139, 92, 246, 0.1)',
  },
  reading: {
    icon: FileText,
    text: 'Reading',
    color: colors.success[400],
    bgColor: 'rgba(74, 222, 128, 0.1)',
  },
  writing: {
    icon: Pencil,
    text: 'Writing',
    color: colors.warning[400],
    bgColor: 'rgba(251, 191, 36, 0.1)',
  },
  editing: {
    icon: Pencil,
    text: 'Editing',
    color: colors.warning[400],
    bgColor: 'rgba(251, 191, 36, 0.1)',
  },
  searching: {
    icon: Search,
    text: 'Searching',
    color: colors.info[400],
    bgColor: 'rgba(96, 165, 250, 0.1)',
  },
  running: {
    icon: Terminal,
    text: 'Running command',
    color: colors.error[400],
    bgColor: 'rgba(248, 113, 113, 0.1)',
  },
  responding: {
    icon: MessageSquare,
    text: 'Responding',
    color: colors.primary[400],
    bgColor: 'rgba(139, 92, 246, 0.1)',
  },
  waiting: {
    icon: Loader,
    text: 'Waiting',
    color: colors.dark[300],
    bgColor: 'rgba(100, 100, 100, 0.1)',
  },
  planning: {
    icon: ClipboardList,
    text: 'Planning',
    color: colors.info[300],
    bgColor: 'rgba(96, 165, 250, 0.1)',
  },
};

function AnimatedDots({ color }: { color: string }) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 350);
    return () => clearInterval(interval);
  }, []);

  return <Text style={[styles.dots, { color }]}>{dots}</Text>;
}

function formatTokenCount(count: number): string {
  if (count < 1000) return count.toString();
  if (count < 10000) return `${(count / 1000).toFixed(1)}K`;
  return `${Math.round(count / 1000)}K`;
}

export function StatusBar({
  activity,
  detail,
  tokenUsage,
  isVisible = true,
}: StatusBarProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  const config = activityConfig[activity];
  const Icon = config.icon;
  const isActive = activity !== 'idle';

  // Pulsing animation for active states
  useEffect(() => {
    if (isActive) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.4,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isActive]);

  // Spin animation for loading/running states
  useEffect(() => {
    if (activity === 'running' || activity === 'waiting') {
      const spin = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      spin.start();
      return () => spin.stop();
    } else {
      spinAnim.setValue(0);
    }
  }, [activity]);

  if (!isVisible) return null;

  const spinInterpolate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const needsSpin = activity === 'running' || activity === 'waiting';

  return (
    <View style={[styles.container, { backgroundColor: config.bgColor }]}>
      {/* Left: Activity indicator */}
      <View style={styles.activitySection}>
        <Animated.View
          style={[
            styles.iconContainer,
            {
              opacity: isActive ? pulseAnim : 1,
              transform: needsSpin ? [{ rotate: spinInterpolate }] : [],
            },
          ]}
        >
          <Icon size={14} color={config.color} />
        </Animated.View>

        <View style={styles.textContainer}>
          <Text style={[styles.activityText, { color: config.color }]}>
            {config.text}
          </Text>
          {isActive && <AnimatedDots color={config.color} />}
        </View>

        {detail && (
          <Text style={styles.detailText} numberOfLines={1}>
            {detail}
          </Text>
        )}
      </View>

      {/* Right: Token usage */}
      {tokenUsage && (tokenUsage.inputTokens > 0 || tokenUsage.outputTokens > 0) && (
        <View style={styles.tokenSection}>
          <Zap size={10} color={colors.warning[400]} />
          <View style={styles.tokenPair}>
            <ArrowUp size={9} color={colors.success[400]} strokeWidth={3} />
            <Text style={styles.tokenValue}>
              {formatTokenCount(tokenUsage.inputTokens)}
            </Text>
          </View>
          <View style={styles.tokenPair}>
            <ArrowDown size={9} color={colors.primary[400]} strokeWidth={3} />
            <Text style={styles.tokenValue}>
              {formatTokenCount(tokenUsage.outputTokens)}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

/**
 * Parse tool name to determine activity state
 */
export function getActivityFromTool(toolName?: string): ActivityState {
  if (!toolName) return 'responding';

  const name = toolName.toLowerCase();

  if (name === 'enterplanmode' || name === 'exitplanmode') return 'planning';
  if (name === 'read' || name.includes('read')) return 'reading';
  if (name === 'write') return 'writing';
  if (name === 'edit') return 'editing';
  if (name === 'grep' || name === 'glob' || name.includes('search')) return 'searching';
  if (name === 'bash' || name.includes('command')) return 'running';
  if (name.includes('task')) return 'formulating';

  return 'responding';
}

/**
 * Get a friendly detail string for the activity
 */
export function getActivityDetail(toolName?: string, toolInput?: any): string | undefined {
  if (!toolName || !toolInput) return undefined;

  const name = toolName.toLowerCase();

  // Try to extract file path or relevant info
  if (name === 'read' || name === 'write' || name === 'edit') {
    const filePath = toolInput?.file_path || toolInput?.path;
    if (filePath) {
      // Get just the filename
      return filePath.split(/[/\\]/).pop();
    }
  }

  if (name === 'grep' || name === 'glob') {
    const pattern = toolInput?.pattern;
    if (pattern) return pattern;
  }

  if (name === 'bash') {
    const command = toolInput?.command;
    if (command) {
      // Truncate long commands
      const short = command.substring(0, 30);
      return command.length > 30 ? `${short}...` : short;
    }
  }

  return undefined;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.dark[700],
  },
  activitySection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  iconContainer: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityText: {
    fontSize: 12,
    fontWeight: '500',
  },
  dots: {
    fontSize: 12,
    fontWeight: '500',
    width: 16,
    textAlign: 'left',
  },
  detailText: {
    fontSize: 11,
    color: colors.dark[400],
    marginLeft: 4,
    flex: 1,
  },
  tokenSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  tokenValue: {
    fontSize: 10,
    color: colors.dark[200],
    fontFamily: 'monospace',
    fontWeight: '600',
  },
});

export default StatusBar;
