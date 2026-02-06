import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';

export function AnalyticsSkeleton() {
  return (
    <View style={styles.container}>
      {/* Period selector bar */}
      <SkeletonLoader width="100%" height={40} borderRadius={8} />

      {/* Hero card */}
      <SkeletonLoader width="100%" height={130} borderRadius={12} style={styles.heroCard} />

      {/* Two side-by-side stat cards */}
      <View style={styles.cardsRow}>
        <SkeletonLoader width={0} height={110} borderRadius={12} style={styles.flex1} />
        <SkeletonLoader width={0} height={110} borderRadius={12} style={styles.flex1} />
      </View>

      {/* Section title */}
      <SkeletonLoader width={120} height={16} borderRadius={4} style={styles.sectionTitle} />

      {/* Chart placeholder */}
      <SkeletonLoader width="100%" height={240} borderRadius={12} />

      {/* Section title */}
      <SkeletonLoader width={160} height={16} borderRadius={4} style={styles.sectionTitle} />

      {/* Token breakdown card */}
      <SkeletonLoader width="100%" height={100} borderRadius={12} />

      {/* Section title */}
      <SkeletonLoader width={180} height={16} borderRadius={4} style={styles.sectionTitle} />

      {/* 3 achievement rows */}
      <SkeletonLoader width="100%" height={72} borderRadius={12} />
      <SkeletonLoader width="100%" height={72} borderRadius={12} style={styles.achievementRow} />
      <SkeletonLoader width="100%" height={72} borderRadius={12} style={styles.achievementRow} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  flex1: {
    flex: 1,
  },
  sectionTitle: {
    marginTop: 24,
    marginBottom: 12,
  },
  achievementRow: {
    marginTop: 12,
  },
});
