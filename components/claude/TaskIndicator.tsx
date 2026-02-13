/**
 * TaskIndicator - Colored dot reflecting aggregate task state
 *
 * Replaces the old entries counter in the session header.
 * Tap to open TaskListModal.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { colors } from '@/theme/colors';
import { TaskInfo } from '@/services/websocket.service';

type AggregateState = 'none' | 'in_progress' | 'pending' | 'all_completed';

function getAggregateState(tasks: TaskInfo[]): AggregateState {
  if (tasks.length === 0) return 'none';
  if (tasks.some(t => t.status === 'in_progress')) return 'in_progress';
  if (tasks.every(t => t.status === 'completed')) return 'all_completed';
  return 'pending';
}

const stateColors: Record<AggregateState, string> = {
  none: colors.dark[400],
  in_progress: colors.primary[500],
  pending: colors.warning[400],
  all_completed: colors.success[400],
};

interface TaskIndicatorProps {
  tasks: TaskInfo[];
  onPress: () => void;
}

export function TaskIndicator({ tasks, onPress }: TaskIndicatorProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const state = getAggregateState(tasks);
  const dotColor = stateColors[state];

  useEffect(() => {
    if (state === 'in_progress') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.4,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
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
  }, [state]);

  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={styles.touchable}
      activeOpacity={0.7}
    >
      <View style={styles.dotContainer}>
        {/* Pulse ring — only when in_progress */}
        {state === 'in_progress' && (
          <Animated.View
            style={[
              styles.pulseRing,
              {
                borderColor: dotColor,
                transform: [{ scale: pulseAnim }],
                opacity: pulseAnim.interpolate({
                  inputRange: [1, 1.4],
                  outputRange: [0.6, 0],
                }),
              },
            ]}
          />
        )}

        {/* Solid dot */}
        <View style={[styles.dot, { backgroundColor: dotColor }]} />

        {/* Count badge */}
        {tasks.length > 0 && (
          <View style={[styles.badge, { backgroundColor: dotColor }]}>
            <Text style={styles.badgeText}>{tasks.length}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const DOT_SIZE = 10;

const styles = StyleSheet.create({
  touchable: {
    padding: 4,
  },
  dotContainer: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
  pulseRing: {
    position: 'absolute',
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    borderWidth: 2,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#fff',
  },
});

export default TaskIndicator;
