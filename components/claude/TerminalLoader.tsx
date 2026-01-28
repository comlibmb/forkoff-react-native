/**
 * TerminalLoader - Animated terminal boot sequence loader
 *
 * A CLI-inspired loading animation that simulates a terminal boot,
 * with typing effects and sequential line reveals.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { colors } from '@/theme/colors';

interface TerminalLoaderProps {
  /** What we're loading */
  message?: string;
  /** Show the full boot sequence or just the spinner */
  variant?: 'boot' | 'minimal' | 'empty' | 'scanning';
  /** Directory name to show in boot sequence */
  directory?: string;
  /** Custom boot lines for scanning variant */
  scanLines?: Array<{ text: string; color: string; done?: boolean }>;
  /** Current scan step index */
  scanStep?: number;
}

// Quirky boot lines - randomized flavor text
const quirkyMessages = [
  ['Warming up the neurons', 'Brewing digital coffee', 'Stretching the context window'],
  ['Polishing the tokens', 'Untangling the weights', 'Calibrating the vibes'],
  ['Summoning Claude', 'Waking up the assistant', 'Poking the language model'],
  ['Loading conversation', 'Unrolling the scroll', 'Fetching the receipts'],
];

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getBootLines(directory?: string): Array<{ text: string; color: string; delay: number }> {
  const dir = directory || '~';
  return [
    { text: `$ cd ${dir}`, color: colors.success[100], delay: 0 },
    { text: pickRandom(quirkyMessages[0]), color: colors.dark[200], delay: 400 },
    { text: pickRandom(quirkyMessages[2]), color: colors.dark[300], delay: 900 },
    { text: pickRandom(quirkyMessages[3]), color: colors.dark[300], delay: 1400 },
  ];
}

function CursorBlink() {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 400,
          easing: Easing.step0,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 400,
          easing: Easing.step0,
          useNativeDriver: true,
        }),
      ])
    );
    blink.start();
    return () => blink.stop();
  }, []);

  return (
    <Animated.View style={[styles.cursor, { opacity }]} />
  );
}

function SpinnerDots({ color }: { color: string }) {
  const [frame, setFrame] = useState(0);
  const frames = ['   ', '.  ', '.. ', '...'];

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame(prev => (prev + 1) % frames.length);
    }, 300);
    return () => clearInterval(interval);
  }, []);

  return <Text style={{ color, fontFamily: 'monospace', fontSize: 13 }}>{frames[frame]}</Text>;
}

function PulseBar() {
  const translateX = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const slide = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(translateX, {
            toValue: 250,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(translateX, {
            toValue: -100,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 750,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.3,
            duration: 750,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    slide.start();
    return () => slide.stop();
  }, []);

  return (
    <View style={styles.pulseBarTrack}>
      <Animated.View
        style={[
          styles.pulseBarFill,
          {
            transform: [{ translateX }],
            opacity,
          },
        ]}
      />
    </View>
  );
}

export function TerminalLoader({ message, variant = 'boot', directory, scanLines, scanStep = 0 }: TerminalLoaderProps) {
  const [visibleLines, setVisibleLines] = useState(0);
  const fadeAnims = useRef<Animated.Value[]>([]).current;
  const bootLines = getBootLines(directory);

  // Initialize fade anims
  useEffect(() => {
    while (fadeAnims.length < bootLines.length) {
      fadeAnims.push(new Animated.Value(0));
    }
  }, []);

  // Sequential reveal
  useEffect(() => {
    if (variant !== 'boot') return;

    bootLines.forEach((line, index) => {
      setTimeout(() => {
        if (fadeAnims[index]) {
          Animated.timing(fadeAnims[index], {
            toValue: 1,
            duration: 200,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }).start();
        }
        setVisibleLines(index + 1);
      }, line.delay);
    });
  }, [variant]);

  // Scanning variant - externally controlled steps
  if (variant === 'scanning' && scanLines) {
    return (
      <View style={styles.bootContainer}>
        <View style={styles.terminalWindow}>
          {/* Title bar */}
          <View style={styles.terminalTitleBar}>
            <View style={styles.terminalDot} />
            <View style={[styles.terminalDot, { backgroundColor: colors.warning[300] }]} />
            <View style={[styles.terminalDot, { backgroundColor: colors.success[300] }]} />
            <Text style={styles.terminalTitle}>forkoff</Text>
          </View>

          {/* Terminal body */}
          <View style={styles.bootBody}>
            {scanLines.map((line, index) => {
              if (index > scanStep) return null;

              const isDone = line.done || index < scanStep;
              const isCurrent = index === scanStep && !line.done;

              return (
                <View key={index} style={styles.bootLine}>
                  <View style={styles.bootLineRow}>
                    <Text style={[styles.bootCheckmark, {
                      color: isDone ? colors.success[200] : isCurrent ? colors.primary[400] : colors.dark[500],
                    }]}>
                      {isDone ? '\u2713' : '\u2022'}
                    </Text>
                    <Text style={[styles.bootText, { color: line.color }]}>
                      {line.text}
                    </Text>
                    {isCurrent && <SpinnerDots color={colors.primary[400]} />}
                  </View>
                </View>
              );
            })}

            {/* Blinking cursor */}
            <View style={styles.bootLine}>
              <View style={styles.cursorLine}>
                <Text style={styles.bootPrompt}>$ </Text>
                <CursorBlink />
              </View>
            </View>
          </View>

          {/* Progress bar */}
          <PulseBar />
        </View>
      </View>
    );
  }

  // Empty state
  if (variant === 'empty') {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyTerminal}>
          <View style={styles.terminalTitleBar}>
            <View style={styles.terminalDot} />
            <View style={[styles.terminalDot, { backgroundColor: colors.warning[300] }]} />
            <View style={[styles.terminalDot, { backgroundColor: colors.success[300] }]} />
          </View>
          <View style={styles.terminalBody}>
            <Text style={styles.emptyPrompt}>
              <Text style={{ color: colors.success[100] }}>$</Text>
              <Text style={{ color: colors.dark[300] }}> _</Text>
            </Text>
            <CursorBlink />
          </View>
        </View>
        <Text style={styles.emptyTitle}>It's quiet in here</Text>
        <Text style={styles.emptySubtitle}>
          Take over the session and say something
        </Text>
      </View>
    );
  }

  // Minimal spinner
  if (variant === 'minimal') {
    return (
      <View style={styles.minimalContainer}>
        <View style={styles.minimalRow}>
          <Text style={styles.minimalPrompt}>$</Text>
          <Text style={styles.minimalText}>{message || 'Loading'}</Text>
          <SpinnerDots color={colors.primary[400]} />
        </View>
        <PulseBar />
      </View>
    );
  }

  // Boot sequence
  return (
    <View style={styles.bootContainer}>
      <View style={styles.terminalWindow}>
        {/* Title bar */}
        <View style={styles.terminalTitleBar}>
          <View style={styles.terminalDot} />
          <View style={[styles.terminalDot, { backgroundColor: colors.warning[300] }]} />
          <View style={[styles.terminalDot, { backgroundColor: colors.success[300] }]} />
          <Text style={styles.terminalTitle}>claude</Text>
        </View>

        {/* Terminal body */}
        <View style={styles.bootBody}>
          {bootLines.map((line, index) => {
            if (index >= visibleLines && !fadeAnims[index]) return null;

            return (
              <Animated.View
                key={index}
                style={[
                  styles.bootLine,
                  {
                    opacity: fadeAnims[index] || 0,
                  },
                ]}
              >
                {index === 0 ? (
                  <Text style={[styles.bootText, { color: line.color }]}>
                    {line.text}
                  </Text>
                ) : (
                  <View style={styles.bootLineRow}>
                    <Text style={styles.bootCheckmark}>
                      {index < visibleLines - 1 ? '\u2713' : '\u2022'}
                    </Text>
                    <Text style={[styles.bootText, { color: line.color }]}>
                      {line.text}
                    </Text>
                    {index === visibleLines - 1 && (
                      <SpinnerDots color={colors.primary[400]} />
                    )}
                  </View>
                )}
              </Animated.View>
            );
          })}

          {/* Blinking cursor at end */}
          {visibleLines >= bootLines.length && (
            <View style={styles.bootLine}>
              <View style={styles.cursorLine}>
                <Text style={styles.bootPrompt}>$ </Text>
                <CursorBlink />
              </View>
            </View>
          )}
        </View>

        {/* Progress bar */}
        <PulseBar />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Boot sequence
  bootContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  terminalWindow: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.dark[800],
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.dark[600],
  },
  terminalTitleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.dark[700],
    borderBottomWidth: 1,
    borderBottomColor: colors.dark[600],
    gap: 6,
  },
  terminalDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.error[400],
  },
  terminalTitle: {
    fontSize: 12,
    color: colors.dark[300],
    fontFamily: 'monospace',
    marginLeft: 8,
  },
  bootBody: {
    padding: 16,
    minHeight: 120,
  },
  bootLine: {
    marginBottom: 8,
  },
  bootLineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bootText: {
    fontSize: 13,
    fontFamily: 'monospace',
    lineHeight: 20,
  },
  bootCheckmark: {
    fontSize: 13,
    color: colors.success[200],
    fontFamily: 'monospace',
    width: 14,
  },
  bootPrompt: {
    fontSize: 13,
    color: colors.success[100],
    fontFamily: 'monospace',
  },
  cursorLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cursor: {
    width: 8,
    height: 16,
    backgroundColor: colors.primary[400],
    borderRadius: 1,
  },

  // Pulse bar
  pulseBarTrack: {
    height: 2,
    backgroundColor: colors.dark[700],
    overflow: 'hidden',
  },
  pulseBarFill: {
    width: 80,
    height: 2,
    backgroundColor: colors.primary[500],
    borderRadius: 1,
  },

  // Minimal
  minimalContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  minimalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  minimalPrompt: {
    fontSize: 14,
    color: colors.success[100],
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  minimalText: {
    fontSize: 14,
    color: colors.dark[200],
    fontFamily: 'monospace',
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  emptyTerminal: {
    width: 200,
    backgroundColor: colors.dark[800],
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.dark[600],
    marginBottom: 8,
  },
  terminalBody: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  emptyPrompt: {
    fontSize: 14,
    fontFamily: 'monospace',
  },
  emptyTitle: {
    fontSize: 16,
    color: colors.dark[200],
    fontWeight: '600',
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.dark[400],
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default TerminalLoader;
