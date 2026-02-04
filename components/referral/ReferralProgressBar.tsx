import React from 'react';
import { View, Text } from 'react-native';
import { Zap, Gift, TrendingUp } from 'lucide-react-native';
import { colors } from '@/theme/colors';

interface ReferralProgressBarProps {
  progress: number; // Current progress towards next tier
  target: number; // Conversions needed for next reward (3, 6, 9, ...)
  currentTier?: number; // Which reward tier we're working towards
}

export function ReferralProgressBar({
  progress,
  target,
  currentTier = 1,
}: ReferralProgressBarProps) {
  const percentage = Math.min((progress / target) * 100, 100);
  const remaining = target - progress;
  const isComplete = progress >= target;

  return (
    <View className="bg-dark-800 rounded-xl p-4">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <Gift size={18} color={colors.primary[400]} />
          <Text className="text-white font-semibold ml-2">
            Next Reward Progress
          </Text>
        </View>
        <View className="flex-row items-center">
          <Text className="text-dark-400">
            {progress}/{target}
          </Text>
          {target > 3 && (
            <View className="flex-row items-center ml-2 bg-accent/20 px-2 py-0.5 rounded">
              <TrendingUp size={12} color={colors.warning[500]} />
              <Text className="text-warning-500 text-xs ml-1">Tier {currentTier}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Progress bar */}
      <View className="h-3 bg-dark-700 rounded-full overflow-hidden">
        <View
          className="h-full bg-primary-500 rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </View>

      {/* Progress dots - show up to 6 max for visual clarity */}
      {target <= 6 && (
        <View className="flex-row justify-between mt-2">
          {Array.from({ length: target }).map((_, index) => (
            <View key={index} className="flex-row items-center">
              <View
                className={`w-6 h-6 rounded-full items-center justify-center ${
                  index < progress
                    ? 'bg-primary-500'
                    : 'bg-dark-700'
                }`}
              >
                {index < progress ? (
                  <Zap size={12} color="white" />
                ) : (
                  <Text className="text-dark-500 text-xs">{index + 1}</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Description */}
      <Text className="text-dark-400 text-sm text-center mt-3">
        {isComplete
          ? 'You have a reward available!'
          : `${remaining} more conversion${remaining === 1 ? '' : 's'} until your next free PRO month`}
      </Text>

      {/* Tier hint for higher tiers */}
      {target > 3 && (
        <Text className="text-dark-500 text-xs text-center mt-1">
          Each tier requires more conversions - keep going!
        </Text>
      )}
    </View>
  );
}

export default ReferralProgressBar;
