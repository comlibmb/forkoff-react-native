import React from 'react';
import { View, Text } from 'react-native';
import { Zap, Gift } from 'lucide-react-native';
import { colors } from '@/theme/colors';

interface ReferralProgressBarProps {
  progress: number; // 0-2 (progress towards next reward)
  total?: number; // Total needed for reward (default 3)
}

export function ReferralProgressBar({
  progress,
  total = 3,
}: ReferralProgressBarProps) {
  const percentage = Math.min((progress / total) * 100, 100);
  const isComplete = progress >= total;

  return (
    <View className="bg-dark-800 rounded-xl p-4">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <Gift size={18} color={colors.primary[400]} />
          <Text className="text-white font-semibold ml-2">
            Next Reward Progress
          </Text>
        </View>
        <Text className="text-dark-400">
          {progress}/{total} conversions
        </Text>
      </View>

      {/* Progress bar */}
      <View className="h-3 bg-dark-700 rounded-full overflow-hidden">
        <View
          className="h-full bg-primary-500 rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </View>

      {/* Progress indicators */}
      <View className="flex-row justify-between mt-2">
        {Array.from({ length: total }).map((_, index) => (
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

      {/* Description */}
      <Text className="text-dark-400 text-sm text-center mt-3">
        {isComplete
          ? 'You have a reward available!'
          : `${total - progress} more conversion${total - progress === 1 ? '' : 's'} until your next free PRO month`}
      </Text>
    </View>
  );
}

export default ReferralProgressBar;
