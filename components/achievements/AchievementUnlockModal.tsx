import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import {
  Coins,
  MessageSquare,
  Calendar,
  Flame,
  Crown,
  Trophy,
  Star,
  Award,
  LucideIcon,
  X,
} from 'lucide-react-native';
import { colors } from '@/theme/colors';
import { Achievement, AchievementTier } from '@/types';

interface AchievementUnlockModalProps {
  visible: boolean;
  achievement: Achievement | null;
  onClose: () => void;
}

// Map icon names to Lucide icons
const iconMap: Record<string, LucideIcon> = {
  Coins: Coins,
  MessageSquare: MessageSquare,
  Calendar: Calendar,
  Flame: Flame,
  Crown: Crown,
  Trophy: Trophy,
  Star: Star,
  Award: Award,
};

// Tier colors
const tierColors: Record<AchievementTier, string> = {
  BRONZE: '#CD7F32',
  SILVER: '#C0C0C0',
  GOLD: '#FFD700',
  PLATINUM: '#E5E4E2',
  DIAMOND: '#B9F2FF',
};

export function AchievementUnlockModal({
  visible,
  achievement,
  onClose,
}: AchievementUnlockModalProps) {
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && achievement) {
      // Reset animations
      scaleAnim.setValue(0.5);
      opacityAnim.setValue(0);
      glowAnim.setValue(0);

      // Animate in
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Glow animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1500,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }
  }, [visible, achievement]);

  if (!achievement) return null;

  const Icon = iconMap[achievement.iconName] || Trophy;
  const tierColor = tierColors[achievement.tier as AchievementTier];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Close button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={20} color={colors.dark[400]} />
          </TouchableOpacity>

          {/* Achievement icon with glow */}
          <View style={styles.iconWrapper}>
            <Animated.View
              style={[
                styles.glow,
                {
                  backgroundColor: tierColor,
                  opacity: glowAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.2, 0.5],
                  }),
                  transform: [
                    {
                      scale: glowAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.3],
                      }),
                    },
                  ],
                },
              ]}
            />
            <View style={[styles.iconContainer, { backgroundColor: tierColor + '30' }]}>
              <Icon size={48} color={tierColor} />
            </View>
          </View>

          {/* Content */}
          <Text style={styles.unlockText}>Achievement Unlocked!</Text>
          <Text style={styles.name}>{achievement.name}</Text>
          <Text style={styles.description}>{achievement.description}</Text>

          {/* Tier badge */}
          <View style={[styles.tierBadge, { backgroundColor: tierColor + '30' }]}>
            <Text style={[styles.tierText, { color: tierColor }]}>{achievement.tier}</Text>
          </View>

          {/* Dismiss button */}
          <TouchableOpacity style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>Awesome!</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  container: {
    backgroundColor: colors.dark[800],
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.dark[600],
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.dark[700],
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    position: 'relative',
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unlockText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary[400],
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.dark[50],
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: colors.dark[300],
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  tierBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 24,
  },
  tierText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  button: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 10,
    width: '100%',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default AchievementUnlockModal;
