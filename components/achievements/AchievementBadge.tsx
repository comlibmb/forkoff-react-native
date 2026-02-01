import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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
} from 'lucide-react-native';
import { colors } from '@/theme/colors';
import { AchievementTier } from '@/types';

interface AchievementBadgeProps {
  name: string;
  description: string;
  iconName: string;
  tier: AchievementTier;
  unlocked: boolean;
  progress?: number;
  threshold?: number;
  showcased?: boolean;
  onPress?: () => void;
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

const tierBgColors: Record<AchievementTier, string> = {
  BRONZE: '#CD7F3220',
  SILVER: '#C0C0C020',
  GOLD: '#FFD70020',
  PLATINUM: '#E5E4E220',
  DIAMOND: '#B9F2FF20',
};

export function AchievementBadge({
  name,
  description,
  iconName,
  tier,
  unlocked,
  progress,
  threshold,
  showcased,
  onPress,
}: AchievementBadgeProps) {
  const Icon = iconMap[iconName] || Trophy;
  const tierColor = tierColors[tier];
  const tierBgColor = tierBgColors[tier];

  const progressPercent =
    progress !== undefined && threshold !== undefined
      ? Math.min(100, (progress / threshold) * 100)
      : unlocked
        ? 100
        : 0;

  return (
    <TouchableOpacity
      style={[styles.container, !unlocked && styles.containerLocked]}
      onPress={onPress}
      disabled={!onPress}
    >
      {/* Badge icon */}
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: unlocked ? tierBgColor : colors.dark[600] },
        ]}
      >
        <Icon
          size={28}
          color={unlocked ? tierColor : colors.dark[400]}
        />
        {showcased && (
          <View style={styles.showcasedBadge}>
            <Star size={10} color={colors.warning[400]} fill={colors.warning[400]} />
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={[styles.name, !unlocked && styles.textLocked]}>{name}</Text>
        <Text style={styles.description} numberOfLines={2}>
          {description}
        </Text>

        {/* Progress bar */}
        {!unlocked && progressPercent < 100 && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: tierColor }]}
              />
            </View>
            <Text style={styles.progressText}>
              {progress?.toLocaleString()}/{threshold?.toLocaleString()}
            </Text>
          </View>
        )}
      </View>

      {/* Tier badge */}
      <View style={[styles.tierBadge, { backgroundColor: tierBgColor }]}>
        <Text style={[styles.tierText, { color: tierColor }]}>{tier}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.dark[700],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.dark[600],
    padding: 12,
    alignItems: 'center',
  },
  containerLocked: {
    opacity: 0.7,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  showcasedBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.dark[700],
    borderWidth: 1,
    borderColor: colors.warning[400],
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.dark[50],
    marginBottom: 2,
  },
  textLocked: {
    color: colors.dark[300],
  },
  description: {
    fontSize: 12,
    color: colors.dark[400],
    lineHeight: 16,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.dark[600],
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 10,
    color: colors.dark[400],
    marginTop: 4,
  },
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  tierText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default AchievementBadge;
