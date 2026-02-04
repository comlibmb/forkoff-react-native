import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Share, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Users, Copy, Share2, Gift, CheckCircle, Crown } from 'lucide-react-native';
import { Button } from '@/components/ui';
import { colors } from '@/theme/colors';
import { ReferralStats } from '@/types';
import { ReferralProgressBar } from './ReferralProgressBar';

interface ReferralCardProps {
  referralCode: string;
  shareUrl: string;
  stats: ReferralStats;
  onClaimReward?: () => void;
  isClaiming?: boolean;
}

export function ReferralCard({
  referralCode,
  shareUrl,
  stats,
  onClaimReward,
  isClaiming = false,
}: ReferralCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(referralCode);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: Platform.OS === 'ios'
          ? `Join me on ForkOff - the app that lets you control your PC's AI tools from your phone! Use my referral code: ${referralCode}`
          : `Join me on ForkOff! Use my referral code: ${referralCode}\n\n${shareUrl}`,
        url: Platform.OS === 'ios' ? shareUrl : undefined,
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <View className="bg-dark-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <View className="bg-primary-500/10 px-6 py-4 border-b border-dark-700">
        <View className="flex-row items-center">
          <View className="w-10 h-10 bg-primary-500/20 rounded-full items-center justify-center mr-3">
            <Users size={20} color={colors.primary[500]} />
          </View>
          <View className="flex-1">
            <Text className="text-white font-semibold text-lg">
              Refer Friends
            </Text>
            <Text className="text-dark-400 text-sm">
              Earn 1 free PRO month for every 3 friends who subscribe
            </Text>
          </View>
        </View>
      </View>

      {/* Content */}
      <View className="p-6">
        {/* Referral code */}
        <View className="mb-6">
          <Text className="text-dark-400 text-sm mb-2">Your referral code</Text>
          <View className="flex-row items-center bg-dark-700 rounded-xl p-4">
            <Text className="text-white text-2xl font-bold tracking-wider flex-1">
              {referralCode}
            </Text>
            <TouchableOpacity
              onPress={handleCopyCode}
              className="bg-dark-600 rounded-lg p-3"
            >
              {copied ? (
                <CheckCircle size={20} color={colors.success[500]} />
              ) : (
                <Copy size={20} color={colors.dark[300]} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <View className="flex-row mb-6 gap-3">
          <View className="flex-1 bg-dark-700 rounded-xl p-4 items-center">
            <Text className="text-primary-400 text-3xl font-bold">
              {stats.totalReferrals}
            </Text>
            <Text className="text-dark-400 text-sm">Referrals</Text>
          </View>
          <View className="flex-1 bg-dark-700 rounded-xl p-4 items-center">
            <Text className="text-success-400 text-3xl font-bold">
              {stats.successfulConversions}
            </Text>
            <Text className="text-dark-400 text-sm">Conversions</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View className="mb-6">
          <ReferralProgressBar
            progress={stats.nextRewardProgress}
            target={stats.nextRewardTarget || 3}
            currentTier={Math.floor(stats.successfulConversions / 3) + 1}
          />
        </View>

        {/* Rewards available */}
        {stats.rewardMonthsAvailable > 0 && (
          <View className="bg-success-500/10 rounded-xl p-4 mb-6 flex-row items-center">
            <View className="w-10 h-10 bg-success-500/20 rounded-full items-center justify-center mr-3">
              <Crown size={20} color={colors.success[500]} />
            </View>
            <View className="flex-1">
              <Text className="text-success-400 font-semibold">
                {stats.rewardMonthsAvailable} reward month{stats.rewardMonthsAvailable > 1 ? 's' : ''} available!
              </Text>
              <Text className="text-dark-400 text-sm">
                Claim your free PRO access
              </Text>
            </View>
          </View>
        )}

        {/* Action buttons */}
        <View className="gap-3">
          {stats.rewardMonthsAvailable > 0 && (
            <Button
              title={`Claim ${stats.rewardMonthsAvailable} Free Month${stats.rewardMonthsAvailable > 1 ? 's' : ''}`}
              onPress={onClaimReward}
              fullWidth
              loading={isClaiming}
              icon={<Gift size={18} color="white" />}
            />
          )}
          <Button
            title="Share with Friends"
            variant={stats.rewardMonthsAvailable > 0 ? 'outline' : 'primary'}
            onPress={handleShare}
            fullWidth
            icon={<Share2 size={18} color={stats.rewardMonthsAvailable > 0 ? colors.primary[500] : 'white'} />}
          />
        </View>
      </View>
    </View>
  );
}

export default ReferralCard;
