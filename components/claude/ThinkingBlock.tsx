/**
 * ThinkingBlock - Animated thinking display matching Claude Code CLI
 *
 * Features:
 * - Animated wave bar when streaming
 * - Pulsing brain icon with glow effect
 * - Smooth expand/collapse with content preview
 * - "live" badge with breathing dot
 * - Word count and duration display when complete
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { Brain, ChevronDown, ChevronRight, Eye, EyeOff } from 'lucide-react-native';
import { colors } from '@/theme/colors';

interface ThinkingBlockProps {
  content?: string;
  isStreaming?: boolean;
  thinkingId?: string;
}

// Animated dots with variable speed
function AnimatedDots({ color, speed = 350 }: { color: string; speed?: number }) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, speed);
    return () => clearInterval(interval);
  }, [speed]);

  return (
    <Text style={{ color, fontFamily: 'monospace', fontSize: 13, fontWeight: '600', width: 20 }}>
      {dots}
    </Text>
  );
}

// Animated wave bar - simulates activity
function WaveBar() {
  const bars = [
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.5)).current,
    useRef(new Animated.Value(0.7)).current,
    useRef(new Animated.Value(0.4)).current,
    useRef(new Animated.Value(0.6)).current,
  ];

  useEffect(() => {
    const animations = bars.map((bar, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(bar, {
            toValue: 1,
            duration: 400 + i * 100,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(bar, {
            toValue: 0.2,
            duration: 400 + i * 100,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      )
    );
    animations.forEach(a => a.start());
    return () => animations.forEach(a => a.stop());
  }, []);

  return (
    <View style={waveStyles.container}>
      {bars.map((bar, i) => (
        <Animated.View
          key={i}
          style={[
            waveStyles.bar,
            {
              opacity: bar,
              transform: [{
                scaleY: bar.interpolate({
                  inputRange: [0.2, 1],
                  outputRange: [0.4, 1],
                }),
              }],
            },
          ]}
        />
      ))}
    </View>
  );
}

const waveStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 14,
  },
  bar: {
    width: 3,
    height: 14,
    borderRadius: 1.5,
    backgroundColor: colors.primary[400],
  },
});

// Streaming shimmer line
function ShimmerLine() {
  const translateX = useRef(new Animated.Value(-200)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(translateX, {
          toValue: 300,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: -200,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    shimmer.start();
    return () => shimmer.stop();
  }, []);

  return (
    <View style={shimmerStyles.track}>
      <Animated.View
        style={[
          shimmerStyles.fill,
          { transform: [{ translateX }] },
        ]}
      />
    </View>
  );
}

const shimmerStyles = StyleSheet.create({
  track: {
    height: 2,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    overflow: 'hidden',
    borderRadius: 1,
  },
  fill: {
    width: 100,
    height: 2,
    backgroundColor: colors.primary[500],
    borderRadius: 1,
    opacity: 0.6,
  },
});

export function ThinkingBlock({ content, isStreaming = false }: ThinkingBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const glowAnim = useRef(new Animated.Value(0.5)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [startTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);

  // Glow + scale animation for streaming
  useEffect(() => {
    if (isStreaming) {
      const glow = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.3,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      glow.start();

      // Subtle breathing scale
      const scale = Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.05,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      scale.start();

      // Track elapsed time
      const timer = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);

      return () => {
        glow.stop();
        scale.stop();
        clearInterval(timer);
      };
    } else {
      glowAnim.setValue(1);
      scaleAnim.setValue(1);
    }
  }, [isStreaming]);

  if (!content && !isStreaming) {
    return null;
  }

  const wordCount = content ? content.split(/\s+/).filter(Boolean).length : 0;
  const previewLength = 200;
  const hasMore = (content?.length || 0) > previewLength;
  const previewText = content?.substring(0, previewLength) || '';

  const formatElapsed = (s: number) => {
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: isStreaming ? scaleAnim : 1 }] }]}>
      {/* Shimmer bar at top when streaming */}
      {isStreaming && <ShimmerLine />}

      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          {isStreaming ? (
            <Animated.View style={{ opacity: glowAnim }}>
              <Brain size={16} color={colors.primary[400]} />
            </Animated.View>
          ) : (
            <Brain size={16} color={colors.primary[400]} />
          )}

          <Text style={styles.headerText}>Thinking</Text>

          {isStreaming ? (
            <>
              <AnimatedDots color={colors.primary[300]} />
              <WaveBar />
            </>
          ) : (
            <Text style={styles.metaText}>
              {wordCount} words
            </Text>
          )}
        </View>

        <View style={styles.headerRight}>
          {isStreaming ? (
            <View style={styles.liveBadge}>
              <Animated.View style={[styles.liveDot, { opacity: glowAnim }]} />
              <Text style={styles.liveText}>{formatElapsed(elapsed)}</Text>
            </View>
          ) : (
            <View style={styles.toggleHint}>
              {isExpanded ? (
                <EyeOff size={14} color={colors.dark[400]} />
              ) : (
                <Eye size={14} color={colors.dark[400]} />
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* Content area */}
      {(isExpanded || isStreaming) && content ? (
        <View style={styles.contentContainer}>
          <View style={styles.contentGutter} />
          <Text style={styles.contentText} selectable>
            {content}
            {isStreaming && (
              <Text style={styles.streamCursor}>{'\u2588'}</Text>
            )}
          </Text>
        </View>
      ) : !isStreaming && content ? (
        // Collapsed preview
        <TouchableOpacity
          style={styles.previewContainer}
          onPress={() => setIsExpanded(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.previewText} numberOfLines={2}>
            {previewText}
            {hasMore && <Text style={styles.ellipsis}>...</Text>}
          </Text>
        </TouchableOpacity>
      ) : null}

      {/* Bottom shimmer when streaming */}
      {isStreaming && <ShimmerLine />}
    </Animated.View>
  );
}

/**
 * Compact thinking indicator for inline use
 */
export function ThinkingIndicator({ isThinking }: { isThinking: boolean }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isThinking) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isThinking]);

  if (!isThinking) return null;

  return (
    <View style={styles.indicatorContainer}>
      <Animated.View style={{ opacity: pulseAnim }}>
        <Brain size={14} color={colors.primary[400]} />
      </Animated.View>
      <Text style={styles.indicatorText}>Thinking</Text>
      <AnimatedDots color={colors.primary[300]} speed={300} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.dark[800],
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary[500],
    marginVertical: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary[300],
    letterSpacing: 0.3,
  },
  metaText: {
    fontSize: 11,
    color: colors.dark[400],
    marginLeft: 4,
    fontFamily: 'monospace',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(139, 92, 246, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary[400],
  },
  liveText: {
    fontSize: 10,
    color: colors.primary[300],
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  toggleHint: {
    padding: 4,
  },
  contentContainer: {
    flexDirection: 'row',
    paddingRight: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 92, 246, 0.08)',
  },
  contentGutter: {
    width: 3,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    marginLeft: 12,
    marginRight: 10,
    borderRadius: 1.5,
  },
  contentText: {
    fontSize: 12,
    color: colors.dark[200],
    lineHeight: 19,
    fontFamily: 'monospace',
    flex: 1,
  },
  streamCursor: {
    color: colors.primary[400],
    fontSize: 12,
  },
  previewContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 92, 246, 0.05)',
  },
  previewText: {
    fontSize: 11,
    color: colors.dark[400],
    lineHeight: 17,
    fontFamily: 'monospace',
    fontStyle: 'italic',
  },
  ellipsis: {
    color: colors.dark[500],
  },
  // Compact indicator
  indicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  indicatorText: {
    fontSize: 12,
    color: colors.primary[300],
    fontWeight: '600',
  },
});

export default ThinkingBlock;
