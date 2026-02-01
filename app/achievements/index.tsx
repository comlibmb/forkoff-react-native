import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { ChevronLeft, Trophy, Filter } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { useAchievementsStore } from "@/stores/achievements.store";
import { AchievementBadge } from "@/components/achievements/AchievementBadge";
import { AchievementCategory } from "@/types";

const CATEGORIES: { key: AchievementCategory | "ALL"; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "TOKENS", label: "Tokens" },
  { key: "SESSIONS", label: "Sessions" },
  { key: "ENGAGEMENT", label: "Engagement" },
];

export default function AchievementsScreen() {
  const { theme } = useTheme();
  const { achievements, isLoading, fetchAchievements, toggleShowcase } =
    useAchievementsStore();

  const [selectedCategory, setSelectedCategory] = useState<
    AchievementCategory | "ALL"
  >("ALL");

  useEffect(() => {
    fetchAchievements();
  }, []);

  const filteredAchievements =
    selectedCategory === "ALL"
      ? achievements
      : achievements.filter((a) => a.category === selectedCategory);

  const unlockedCount = achievements.filter(
    (a) => a.userProgress?.unlockedAt,
  ).length;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
          headerTitle: "Achievements",
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginLeft: 8 }}
            >
              <ChevronLeft size={24} color={theme.text} />
            </TouchableOpacity>
          ),
        }}
      />
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={["bottom"]}>
        {/* Summary header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: theme.card,
            margin: 16,
            padding: 16,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.backgroundTertiary,
          }}
        >
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              backgroundColor: theme.primary + "20",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 16,
            }}
          >
            <Trophy size={28} color={theme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: theme.text,
                marginBottom: 4,
              }}
            >
              {unlockedCount} / {achievements.length} Unlocked
            </Text>
            <Text style={{ fontSize: 13, color: theme.textSecondary }}>
              Keep going to unlock more achievements!
            </Text>
          </View>
        </View>

        {/* Category filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ maxHeight: 48, marginBottom: 8 }}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              style={{
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 25,
                alignContent: "center",
                justifyContent: "center",
                backgroundColor:
                  selectedCategory === cat.key ? theme.primary : theme.card,
                borderWidth: 1,
                borderColor:
                  selectedCategory === cat.key
                    ? theme.primary
                    : theme.backgroundTertiary,
              }}
              onPress={() => setSelectedCategory(cat.key)}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: selectedCategory === cat.key ? "#fff" : theme.textTertiary,
                }}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Achievements list */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={fetchAchievements}
            />
          }
        >
          {filteredAchievements.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 48 }}>
              <Filter size={32} color={theme.border} />
              <Text
                style={{
                  fontSize: 15,
                  color: theme.textSecondary,
                  marginTop: 12,
                }}
              >
                No achievements in this category
              </Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
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
