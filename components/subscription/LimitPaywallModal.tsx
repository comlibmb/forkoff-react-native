import React, { useMemo } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, Image } from 'react-native';
import { X, Zap, MessageSquare, FolderOpen, Monitor, RefreshCw, Smartphone, Gift, Clock, Crown } from 'lucide-react-native';
import { Button } from '@/components/ui';
import { LimitType } from '@/types';
import { colors } from '@/theme/colors';
import { useRouter } from 'expo-router';
import { analyticsService } from '@/services/analytics.service';

interface LimitPaywallModalProps {
  visible: boolean;
  onClose: () => void;
  limitType: LimitType | 'onboarding' | null;
  resetAt?: string;
  currentUsage?: number;
  limit?: number;
}

interface PaywallContent {
  icon: React.ComponentType<{ size: number; color: string }>;
  subheading: string;
  description: string;
}

const PAYWALL_CONTENT: Record<LimitType | 'onboarding', PaywallContent> = {
  messages_daily: {
    icon: MessageSquare,
    subheading: "You're on fire today!",
    description: "You've burned through all 20 messages. Go Pro and never hit a wall again.",
  },
  sessions_monthly: {
    icon: Zap,
    subheading: 'Session overload!',
    description: "10 sessions this month - you're a power user. Time to upgrade?",
  },
  projects_max: {
    icon: FolderOpen,
    subheading: "Two's company...",
    description: 'But unlimited projects is a party. Go Pro to keep building.',
  },
  devices_max: {
    icon: Monitor,
    subheading: 'One PC feeling lonely?',
    description: "Free tier = 1 device. Pro = pair 'em all.",
  },
  repairs_monthly: {
    icon: RefreshCw,
    subheading: 'Musical chairs, eh?',
    description: '3 re-pairs this month. Pro users can swap devices anytime.',
  },
  phone_session: {
    icon: Smartphone,
    subheading: "You're already forking somewhere else!",
    description: 'Pro accounts work on one phone at a time. Take over this session?',
  },
  onboarding: {
    icon: Gift,
    subheading: 'Welcome to ForkOff!',
    description: 'Start free with limits, or go Pro and code without boundaries.',
  },
};

function formatTimeUntilReset(resetAt?: string): string | null {
  if (!resetAt) return null;

  const resetTime = new Date(resetAt).getTime();
  const now = Date.now();
  const diffMs = resetTime - now;

  if (diffMs <= 0) return null;

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `Resets in ${days} day${days > 1 ? 's' : ''}`;
  }

  if (hours > 0) {
    return `Resets in ${hours}h ${minutes}m`;
  }

  return `Resets in ${minutes} minute${minutes !== 1 ? 's' : ''}`;
}

export function LimitPaywallModal({
  visible,
  onClose,
  limitType,
  resetAt,
  currentUsage,
  limit,
}: LimitPaywallModalProps) {
  const router = useRouter();

  const content = useMemo(() => {
    if (!limitType) return null;
    return PAYWALL_CONTENT[limitType];
  }, [limitType]);

  const resetTimeText = useMemo(() => formatTimeUntilReset(resetAt), [resetAt]);

  const handleUpgrade = () => {
    analyticsService.track('paywall_upgrade_clicked', {
      limitType,
    });
    onClose();
    router.push('/settings/subscription');
  };

  if (!content || !limitType) return null;

  const isOnboarding = limitType === 'onboarding';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-dark-900">
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 pt-6 pb-4">
          <View className="w-10" />
          <Text className="text-white text-lg font-semibold">
            Want this wall to ForkOff?
          </Text>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color={colors.dark[400]} />
          </TouchableOpacity>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="px-6 pb-8"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo with Pro badge */}
          <View className="items-center py-8">
            <View className="w-24 h-24 items-center justify-center mb-6">
              <Image
                source={require('@/assets/logo.png')}
                style={{ width: 80, height: 80, opacity: 0.9 }}
                resizeMode="contain"
              />
              {/* Pro badge overlay */}
              <View
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  backgroundColor: colors.primary[500],
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Crown size={12} color="white" />
                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 11 }}>PRO</Text>
              </View>
            </View>

            <Text className="text-white text-2xl font-bold text-center mb-2">
              {content.subheading}
            </Text>

            <Text className="text-dark-300 text-base text-center px-4 mb-4">
              {content.description}
            </Text>

            {/* Usage indicator */}
            {currentUsage !== undefined && limit !== undefined && limit !== Infinity && (
              <View className="flex-row items-center bg-dark-800 rounded-lg px-4 py-2 mb-4">
                <Text className="text-primary-400 font-bold">{currentUsage}</Text>
                <Text className="text-dark-400 mx-1">/</Text>
                <Text className="text-dark-400">{limit}</Text>
                <Text className="text-dark-500 ml-2">used</Text>
              </View>
            )}

            {/* Reset time indicator */}
            {resetTimeText && !isOnboarding && (
              <View className="flex-row items-center bg-dark-800/50 rounded-lg px-3 py-2">
                <Clock size={14} color={colors.dark[400]} />
                <Text className="text-dark-400 text-sm ml-2">{resetTimeText}</Text>
              </View>
            )}
          </View>

          {/* Pro benefits */}
          <View className="bg-dark-800 rounded-2xl p-6 mb-6">
            <Text className="text-white text-lg font-semibold mb-4">Go Pro and get:</Text>
            <View className="gap-3">
              {[
                'Unlimited messages',
                'Unlimited sessions',
                'Unlimited projects',
                'Unlimited paired PCs',
                'Full history retention',
              ].map((benefit, index) => (
                <View key={index} className="flex-row items-center">
                  <View className="w-5 h-5 bg-primary-500/20 rounded-full items-center justify-center mr-3">
                    <Zap size={12} color={colors.primary[400]} />
                  </View>
                  <Text className="text-dark-200">{benefit}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Price */}
          <View className="items-center mb-6">
            <View className="flex-row items-baseline">
              <Text className="text-white text-4xl font-bold">$9.99</Text>
              <Text className="text-dark-400 text-lg ml-1">/month</Text>
            </View>
            <Text className="text-dark-500 text-sm mt-1">Cancel anytime</Text>
          </View>
        </ScrollView>

        {/* Action buttons */}
        <View className="px-6 pb-8 gap-3">
          <Button
            title="Make It ForkOff"
            onPress={handleUpgrade}
            fullWidth
          />
          <Button
            title="Maybe Later"
            variant="ghost"
            onPress={onClose}
            fullWidth
          />
        </View>
      </View>
    </Modal>
  );
}

export default LimitPaywallModal;
