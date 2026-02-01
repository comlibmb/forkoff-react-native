import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Coins, TrendingUp, MessageSquare, Flame } from 'lucide-react-native';
import { useTheme, ThemeColors } from '@/theme/ThemeProvider';

interface UsageSummaryCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: 'tokens' | 'sessions' | 'streak';
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  large?: boolean;
  theme?: ThemeColors;
}

const iconMap = {
  tokens: Coins,
  sessions: MessageSquare,
  streak: Flame,
};

export function UsageSummaryCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  large,
  theme: themeProp,
}: UsageSummaryCardProps) {
  const { theme: contextTheme, colors } = useTheme();
  const theme = themeProp || contextTheme;

  const Icon = iconMap[icon];

  const iconColors = {
    tokens: colors.primary[400],
    sessions: colors.success[400],
    streak: colors.error[400],
  };

  const iconColor = iconColors[icon];

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.backgroundTertiary }, large && styles.cardLarge]}>
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
              { backgroundColor: theme.backgroundTertiary },
              trend === 'up' && { backgroundColor: colors.success[400] + '20' },
              trend === 'down' && { backgroundColor: colors.error[400] + '20' },
            ]}
          >
            <Text
              style={[
                styles.trendText,
                { color: theme.textTertiary },
                trend === 'up' && { color: colors.success[400] },
                trend === 'down' && { color: colors.error[400] },
              ]}
            >
              {trend === 'up' ? '+' : ''}{trendValue}
            </Text>
          </View>
        )}
      </View>

      <Text style={[styles.value, { color: theme.text }, large && styles.valueLarge]}>{value}</Text>
      <Text style={[styles.title, { color: theme.textTertiary }, large && styles.titleLarge]}>{title}</Text>
      {subtitle && <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
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
  },
  trendText: {
    fontSize: 11,
    fontWeight: '600',
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  valueLarge: {
    fontSize: 36,
    marginBottom: 6,
  },
  title: {
    fontSize: 13,
    fontWeight: '500',
  },
  titleLarge: {
    fontSize: 15,
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
  },
});

export default UsageSummaryCard;
