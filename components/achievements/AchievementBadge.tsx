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
import { useTheme } from '@/theme/ThemeProvider';
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
  const { theme } = useTheme();
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
      style={[
        styles.container,
        { backgroundColor: theme.card, borderColor: theme.backgroundTertiary },
        !unlocked && styles.containerLocked,
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      {/* Badge icon */}
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: unlocked ? tierBgColor : theme.backgroundTertiary },
        ]}
      >
        <Icon
          size={28}
          color={unlocked ? tierColor : theme.textTertiary}
        />
        {showcased && (
          <View style={[styles.showcasedBadge, { backgroundColor: theme.card, borderColor: theme.warning }]}>
            <Star size={10} color={theme.warning} fill={theme.warning} />
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={[styles.name, { color: theme.text }, !unlocked && { color: theme.textTertiary }]}>{name}</Text>
        <Text style={[styles.description, { color: theme.textTertiary }]} numberOfLines={2}>
          {description}
        </Text>

        {/* Progress bar */}
        {!unlocked && progressPercent < 100 && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: theme.backgroundTertiary }]}>
              <View
                style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: tierColor }]}
              />
            </View>
            <Text style={[styles.progressText, { color: theme.textTertiary }]}>
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
    borderRadius: 12,
    borderWidth: 1,
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
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  description: {
    fontSize: 12,
    lineHeight: 16,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 10,
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
