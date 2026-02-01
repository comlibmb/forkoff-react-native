import React, { useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Trophy } from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useAnalyticsStore } from '@/stores/analytics.store';
import { useAchievementsStore } from '@/stores/achievements.store';
import { UsageSummaryCard } from '@/components/analytics/UsageSummaryCard';
import { UsageChart } from '@/components/analytics/UsageChart';
import { PeriodSelector } from '@/components/analytics/PeriodSelector';
import { AchievementBadge } from '@/components/achievements/AchievementBadge';
import { wsService } from '@/services/websocket.service';

export default function AnalyticsScreen() {
  const { theme } = useTheme();
  const {
    dailyUsage,
    usageStats,
    streakInfo,
    selectedPeriod,
    isLoading,
    fetchUsageStats,
    fetchDailyUsage,
    fetchStreakInfo,
    setSelectedPeriod,
    addRealtimeUsage,
  } = useAnalyticsStore();

  const { unlockedAchievements, fetchUnlockedAchievements } = useAchievementsStore();

  // Handle realtime token usage updates
  const handleTokenUsage = useCallback((data: { usage?: { inputTokens?: number; outputTokens?: number } }) => {
    if (data?.usage) {
      addRealtimeUsage(data.usage.inputTokens || 0, data.usage.outputTokens || 0);
    }
  }, [addRealtimeUsage]);

  useEffect(() => {
    fetchUsageStats();
    fetchStreakInfo();
    fetchUnlockedAchievements();

    // Get daily data for the past 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    fetchDailyUsage(
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0],
    );

    // Subscribe to realtime token usage updates
    wsService.on('token_usage', handleTokenUsage);

    return () => {
      wsService.off('token_usage', handleTokenUsage);
    };
  }, [handleTokenUsage]);

  const handleRefresh = () => {
    fetchUsageStats();
    fetchStreakInfo();
    fetchUnlockedAchievements();
  };

  // Format large numbers
  const formatNumber = (num: string | number): string => {
    const n = typeof num === 'string' ? parseInt(num, 10) : num;
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
  };

  // Get recent achievements (last 3)
  const recentAchievements = unlockedAchievements.slice(0, 3);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Analytics</Text>
        <Text style={[styles.headerSubtitle, { color: theme.textTertiary }]}>Track your Claude usage</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
        }
      >
        {/* Period selector */}
        <PeriodSelector selected={selectedPeriod} onSelect={setSelectedPeriod} theme={theme} />

        {/* Summary cards - Hero token card */}
        <View style={styles.heroCard}>
          <UsageSummaryCard
            title="Total Tokens"
            value={formatNumber(usageStats?.totalTokens || '0')}
            icon="tokens"
            large
          />
        </View>

        {/* Secondary stats row */}
        <View style={styles.cardsRow}>
          <UsageSummaryCard
            title="Sessions"
            value={formatNumber(usageStats?.totalSessionCount || 0)}
            icon="sessions"
          />
          <UsageSummaryCard
            title="Streak"
            value={`${streakInfo?.currentStreak || 0} days`}
            subtitle={`${streakInfo?.totalActiveDays || 0} active`}
            icon="streak"
          />
        </View>

        {/* Usage chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Usage Trend</Text>
          <UsageChart data={dailyUsage} height={240} />
        </View>

        {/* Token breakdown */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Token Breakdown</Text>
          <View style={[styles.breakdownCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.breakdownRow}>
              <View style={styles.breakdownItem}>
                <View style={[styles.breakdownDot, { backgroundColor: theme.primary }]} />
                <Text style={[styles.breakdownLabel, { color: theme.textTertiary }]}>Input Tokens</Text>
              </View>
              <Text style={[styles.breakdownValue, { color: theme.text }]}>
                {formatNumber(usageStats?.totalInputTokens || '0')}
              </Text>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.divider }]} />
            <View style={styles.breakdownRow}>
              <View style={styles.breakdownItem}>
                <View style={[styles.breakdownDot, { backgroundColor: theme.success }]} />
                <Text style={[styles.breakdownLabel, { color: theme.textTertiary }]}>Output Tokens</Text>
              </View>
              <Text style={[styles.breakdownValue, { color: theme.text }]}>
                {formatNumber(usageStats?.totalOutputTokens || '0')}
              </Text>
            </View>
          </View>
        </View>

        {/* Recent achievements */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Achievements</Text>
            <Text
              style={[styles.seeAllLink, { color: theme.primary }]}
              onPress={() => router.push('/achievements')}
            >
              See All
            </Text>
          </View>

          {recentAchievements.length === 0 ? (
            <View style={[styles.emptyAchievements, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <Trophy size={32} color={theme.textTertiary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No achievements yet</Text>
              <Text style={[styles.emptySubtext, { color: theme.textTertiary }]}>
                Keep using Claude to unlock achievements!
              </Text>
            </View>
          ) : (
            <View style={styles.achievementsList}>
              {recentAchievements.map((ua) => (
                <AchievementBadge
                  key={ua.achievement.id}
                  name={ua.achievement.name}
                  description={ua.achievement.description}
                  iconName={ua.achievement.iconName}
                  tier={ua.achievement.tier}
                  unlocked
                  showcased={ua.showcased}
                  onPress={() => router.push('/achievements')}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  heroCard: {
    marginTop: 16,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  seeAllLink: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
  },
  breakdownCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breakdownDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  breakdownLabel: {
    fontSize: 14,
  },
  breakdownValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  emptyAchievements: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    marginTop: 4,
  },
  achievementsList: {
    gap: 12,
  },
});
