import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Coins, TrendingUp, MessageSquare, Flame } from 'lucide-react-native';
import { colors } from '@/theme/colors';

interface UsageSummaryCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: 'tokens' | 'sessions' | 'streak';
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  large?: boolean;
}

const iconMap = {
  tokens: Coins,
  sessions: MessageSquare,
  streak: Flame,
};

const iconColors = {
  tokens: colors.primary[400],
  sessions: colors.success[400],
  streak: colors.error[400],
};

export function UsageSummaryCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  large,
}: UsageSummaryCardProps) {
  const Icon = iconMap[icon];
  const iconColor = iconColors[icon];

  return (
    <View style={[styles.card, large && styles.cardLarge]}>
      <View style={styles.header}>
        <View style={[
          styles.iconContainer,
          large && styles.iconContainerLarge,
          { backgroundColor: iconColor + '20' }
        ]}>
          <Icon size={large ? 28 : 20} color={iconColor} />
        </View>
        {trend && trendValue && (
          <View
            style={[
              styles.trendBadge,
              trend === 'up' && styles.trendUp,
              trend === 'down' && styles.trendDown,
            ]}
          >
            <Text
              style={[
                styles.trendText,
                trend === 'up' && styles.trendTextUp,
                trend === 'down' && styles.trendTextDown,
              ]}
            >
              {trend === 'up' ? '+' : ''}{trendValue}
            </Text>
          </View>
        )}
      </View>

      <Text style={[styles.value, large && styles.valueLarge]}>{value}</Text>
      <Text style={[styles.title, large && styles.titleLarge]}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.dark[700],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.dark[600],
    padding: 16,
    flex: 1,
    minWidth: 140,
  },
  cardLarge: {
    padding: 20,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerLarge: {
    width: 52,
    height: 52,
    borderRadius: 12,
  },
  trendBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.dark[600],
  },
  trendUp: {
    backgroundColor: colors.success[400] + '20',
  },
  trendDown: {
    backgroundColor: colors.error[400] + '20',
  },
  trendText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.dark[300],
  },
  trendTextUp: {
    color: colors.success[400],
  },
  trendTextDown: {
    color: colors.error[400],
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.dark[50],
    marginBottom: 4,
  },
  valueLarge: {
    fontSize: 36,
    marginBottom: 6,
  },
  title: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.dark[300],
  },
  titleLarge: {
    fontSize: 15,
  },
  subtitle: {
    fontSize: 11,
    color: colors.dark[400],
    marginTop: 2,
  },
});

export default UsageSummaryCard;
