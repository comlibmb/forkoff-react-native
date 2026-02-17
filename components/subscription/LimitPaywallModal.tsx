import React, { useMemo, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, Image, Linking } from 'react-native';
import { X, Zap, MessageSquare, FolderOpen, Monitor, RefreshCw, Smartphone, Gift, Clock, Crown, Ticket, Users } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import { Button } from '@/components/ui';
import { LimitType, VoucherRedemptionResult } from '@/types';
import { colors } from '@/theme/colors';
import { useRouter } from 'expo-router';
import { analyticsService } from '@/services/analytics.service';
import { subscriptionService } from '@/services/subscription.service';
import { VoucherRedeemModal, VoucherSuccessModal } from '@/components/voucher';
import { useUsageStore } from '@/stores/usage.store';

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

function getPaywallContent(limits: { messagesPerDay: number; sessionsPerMonth: number; maxProjects: number; maxDevices: number; repairsPerMonth: number }): Record<LimitType | 'onboarding', PaywallContent> {
  return {
    messages_daily: {
      icon: MessageSquare,
      subheading: "You're on fire today!",
      description: `You've burned through all ${limits.messagesPerDay} messages. Go Pro and never hit a wall again.`,
    },
    sessions_monthly: {
      icon: Zap,
      subheading: 'Session overload!',
      description: `${limits.sessionsPerMonth} sessions this month - you're a power user. Time to upgrade?`,
    },
    projects_max: {
      icon: FolderOpen,
      subheading: "Two's company...",
      description: 'But unlimited projects is a party. Go Pro to keep building.',
    },
    devices_max: {
      icon: Monitor,
      subheading: 'One PC feeling lonely?',
      description: `Free tier = ${limits.maxDevices} device${limits.maxDevices !== 1 ? 's' : ''}. Pro = pair 'em all.`,
    },
    repairs_monthly: {
      icon: RefreshCw,
      subheading: 'Musical chairs, eh?',
      description: `${limits.repairsPerMonth} re-pairs this month. Pro users can swap devices anytime.`,
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
}

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
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [voucherResult, setVoucherResult] = useState<VoucherRedemptionResult | null>(null);

  const handleVoucherSuccess = (result: VoucherRedemptionResult) => {
    setVoucherResult(result);
  };

  const handleVoucherSuccessClose = () => {
    setVoucherResult(null);
    onClose(); // Close the paywall after successful voucher redemption
  };

  // Select the raw serverLimits reference (stable — same object until setServerLimits is called)
  const serverLimits = useUsageStore((state) => state.serverLimits);

  const freeLimits = useMemo(() => {
    if (serverLimits) {
      const f = serverLimits.free;
      const map = (v: number) => (v === -1 ? Infinity : v);
      return {
        messagesPerDay: map(f.messagesPerDay),
        sessionsPerMonth: map(f.sessionsPerMonth),
        maxProjects: map(f.maxProjects),
        maxDevices: map(f.maxDevices),
        repairsPerMonth: map(f.repairsPerMonth),
      };
    }
    return { messagesPerDay: 10, sessionsPerMonth: 10, maxProjects: 2, maxDevices: 1, repairsPerMonth: 3 };
  }, [serverLimits]);

  const content = useMemo(() => {
    if (!limitType) return null;
    return getPaywallContent(freeLimits)[limitType];
  }, [limitType, freeLimits]);

  const resetTimeText = useMemo(() => formatTimeUntilReset(resetAt), [resetAt]);

  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

  const handleUpgrade = async () => {
    analyticsService.track('paywall_upgrade_clicked', {
      limitType,
    });

    const proPriceId = process.env.EXPO_PUBLIC_STRIPE_PRO_PRICE_ID;
    if (proPriceId) {
      setIsCheckoutLoading(true);
      try {
        const result = await subscriptionService.createCheckoutSession(proPriceId);
        if (result.success && result.url) {
          await WebBrowser.openBrowserAsync(result.url, {
            dismissButtonStyle: 'close',
            presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
          });
          // Close modal when browser dismisses
          onClose();
          return;
        }
      } catch {
        // Fall back to navigation
      } finally {
        setIsCheckoutLoading(false);
      }
    }

    // Fallback: navigate to subscription screen
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
          <View className="items-center" style={{ marginTop: -49, paddingBottom: 32 }}>
            <View style={{ width: 172, height: 172, alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
              <Image
                source={require('@/assets/logo.png')}
                style={{ width: 144, height: 144, opacity: 0.9 }}
                resizeMode="contain"
              />
              {/* Pro badge overlay */}
              <View
                style={{
                  position: 'absolute',
                  bottom: 39,
                  right: 4,
                  backgroundColor: colors.primary[500],
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <Crown size={14} color="white" />
                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 13 }}>PRO</Text>
              </View>
            </View>

            <Text className="text-white text-2xl font-bold text-center mb-2" style={{ marginTop: -15 }}>
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
              {(() => {
                const cached = subscriptionService.getCachedPlans();
                const proPlan = cached?.plans.find((p) => p.id === 'pro_monthly');
                const price = proPlan?.price ?? 9.99;
                const originalPrice = proPlan?.originalPrice;
                return (
                  <>
                    {originalPrice != null && originalPrice > price && (
                      <Text className="text-dark-500 text-xl mr-2" style={{ textDecorationLine: 'line-through' }}>
                        ${originalPrice}
                      </Text>
                    )}
                    <Text className="text-white text-4xl font-bold">${price}</Text>
                  </>
                );
              })()}
              <Text className="text-dark-400 text-lg ml-1">/month</Text>
            </View>
            <Text className="text-dark-500 text-sm mt-1">Cancel anytime</Text>
          </View>

          {/* Referral CTA */}
          <TouchableOpacity
            onPress={() => {
              onClose();
              router.push('/settings/referrals');
            }}
            className="bg-dark-800/50 rounded-xl px-4 py-3 flex-row items-center mb-6"
          >
            <Users size={18} color={colors.primary[400]} />
            <Text className="text-primary-400 text-sm ml-3 flex-1">
              Or earn free PRO months — refer friends
            </Text>
            <Text className="text-dark-500 text-lg ml-2">›</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Voucher link */}
        <View className="px-6 pb-2">
          <TouchableOpacity
            onPress={() => setShowVoucherModal(true)}
            className="flex-row items-center justify-center py-2"
          >
            <Ticket size={14} color={colors.dark[400]} />
            <Text className="text-dark-400 ml-2 text-sm">
              Have a promo code?
            </Text>
          </TouchableOpacity>
        </View>

        {/* Terms */}
        <Text className="text-dark-500 text-xs text-center px-6 pb-2">
          By subscribing, you agree to our{' '}
          <Text
            className="text-primary-400"
            onPress={() => Linking.openURL('https://forkoff.app/legal/terms')}
          >
            Terms of Service
          </Text>{' '}
          and{' '}
          <Text
            className="text-primary-400"
            onPress={() => Linking.openURL('https://forkoff.app/legal/privacy')}
          >
            Privacy Policy
          </Text>
          .
        </Text>

        {/* Action buttons */}
        <View className="px-6 pb-8 gap-3">
          <Button
            title={isCheckoutLoading ? 'Opening checkout...' : 'Make It ForkOff'}
            onPress={handleUpgrade}
            disabled={isCheckoutLoading}
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

      {/* Voucher Modal */}
      <VoucherRedeemModal
        visible={showVoucherModal}
        onClose={() => setShowVoucherModal(false)}
        onSuccess={handleVoucherSuccess}
      />

      {/* Voucher Success Modal */}
      <VoucherSuccessModal
        visible={!!voucherResult}
        onClose={handleVoucherSuccessClose}
        result={voucherResult}
      />
    </Modal>
  );
}

export default LimitPaywallModal;
