import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { ChevronLeft, Trophy, Filter } from 'lucide-react-native';
import { colors } from '@/theme/colors';
import { useAchievementsStore } from '@/stores/achievements.store';
import { AchievementBadge } from '@/components/achievements/AchievementBadge';
import { AchievementCategory } from '@/types';

const CATEGORIES: { key: AchievementCategory | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'TOKENS', label: 'Tokens' },
  { key: 'SESSIONS', label: 'Sessions' },
  { key: 'ENGAGEMENT', label: 'Engagement' },
];

export default function AchievementsScreen() {
  const {
    achievements,
    isLoading,
    fetchAchievements,
    toggleShowcase,
  } = useAchievementsStore();

  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | 'ALL'>('ALL');

  useEffect(() => {
    fetchAchievements();
  }, []);

  const filteredAchievements =
    selectedCategory === 'ALL'
      ? achievements
      : achievements.filter((a) => a.category === selectedCategory);

  const unlockedCount = achievements.filter((a) => a.userProgress?.unlockedAt).length;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: colors.dark[800] },
          headerTintColor: colors.dark[50],
          headerTitle: 'Achievements',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ChevronLeft size={24} color={colors.dark[50]} />
            </TouchableOpacity>
          ),
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {/* Summary header */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Trophy size={28} color={colors.primary[400]} />
          </View>
          <View style={styles.summaryContent}>
            <Text style={styles.summaryTitle}>
              {unlockedCount} / {achievements.length} Unlocked
            </Text>
            <Text style={styles.summarySubtitle}>
              Keep going to unlock more achievements!
            </Text>
          </View>
        </View>

        {/* Category filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryContent}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              style={[
                styles.categoryButton,
                selectedCategory === cat.key && styles.categoryButtonSelected,
              ]}
              onPress={() => setSelectedCategory(cat.key)}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === cat.key && styles.categoryTextSelected,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Achievements list */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={fetchAchievements} />
          }
        >
          {filteredAchievements.length === 0 ? (
            <View style={styles.emptyState}>
              <Filter size={32} color={colors.dark[500]} />
              <Text style={styles.emptyText}>No achievements in this category</Text>
            </View>
          ) : (
            <View style={styles.achievementsList}>
              {filteredAchievements.map((achievement) => (
                <AchievementBadge
                  key={achievement.id}
                  name={achievement.name}
                  description={achievement.description}
                  iconName={achievement.iconName}
                  tier={achievement.tier}
                  unlocked={!!achievement.userProgress?.unlockedAt}
                  progress={
                    achievement.userProgress
                      ? parseInt(achievement.userProgress.progress, 10)
                      : 0
                  }
                  threshold={parseInt(achievement.threshold, 10)}
                  showcased={achievement.userProgress?.showcased}
                  onPress={
                    achievement.userProgress?.unlockedAt
                      ? () => toggleShowcase(achievement.id)
                      : undefined
                  }
                />
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark[800],
  },
  backButton: {
    marginLeft: 8,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark[700],
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.dark[600],
  },
  summaryIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: colors.primary[500] + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  summaryContent: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.dark[50],
    marginBottom: 4,
  },
  summarySubtitle: {
    fontSize: 13,
    color: colors.dark[400],
  },
  categoryScroll: {
    maxHeight: 48,
    marginBottom: 8,
  },
  categoryContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.dark[700],
    borderWidth: 1,
    borderColor: colors.dark[600],
  },
  categoryButtonSelected: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark[300],
  },
  categoryTextSelected: {
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  achievementsList: {
    gap: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 15,
    color: colors.dark[400],
    marginTop: 12,
  },
});
