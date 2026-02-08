import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { X, Zap, Lock, Crown, Ticket } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import { Button } from '@/components/ui';
import { PlanCard, Plan } from './PlanCard';
import { colors } from '@/theme/colors';
import { VoucherRedeemModal, VoucherSuccessModal } from '@/components/voucher';
import { VoucherRedemptionResult } from '@/types';
import { subscriptionService } from '@/services/subscription.service';

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  feature?: string;
  onSelectPlan: (plan: Plan) => void;
}

const STRIPE_PRO_PRICE_ID = process.env.EXPO_PUBLIC_STRIPE_PRO_PRICE_ID || '';

const plans: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    interval: 'month',
    features: [
      { name: '1 connected device', included: true },
      { name: '1 project', included: true },
      { name: 'Basic chat history', included: true },
      { name: 'Community support', included: true },
      { name: 'Unlimited devices', included: false },
      { name: 'Code diff viewer', included: false },
      { name: 'Priority support', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 9.99,
    interval: 'month',
    popular: true,
    stripePriceId: STRIPE_PRO_PRICE_ID,
    features: [
      { name: 'Unlimited devices', included: true },
      { name: 'Unlimited projects', included: true },
      { name: 'Full chat history', included: true },
      { name: 'Code diff viewer', included: true },
      { name: 'Terminal access', included: true },
      { name: 'Priority support', included: true },
      { name: 'Team features', included: false },
    ],
  },
  {
    id: 'team',
    name: 'Team',
    price: 29.99,
    interval: 'month',
    features: [
      { name: 'Everything in Pro', included: true },
      { name: 'Team collaboration', included: true },
      { name: 'Shared devices', included: true },
      { name: 'Admin dashboard', included: true },
      { name: 'SSO integration', included: true },
      { name: 'Dedicated support', included: true },
      { name: 'Custom integrations', included: true },
    ],
  },
];

export function PaywallModal({
  visible,
  onClose,
  feature,
  onSelectPlan,
}: PaywallModalProps) {
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [voucherResult, setVoucherResult] = useState<VoucherRedemptionResult | null>(null);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

  const handlePlanSelect = async (plan: Plan) => {
    if (plan.stripePriceId) {
      setIsCheckoutLoading(true);
      try {
        const result = await subscriptionService.createCheckoutSession(plan.stripePriceId);
        if (result.success && result.url) {
          await WebBrowser.openBrowserAsync(result.url);
          onClose();
        }
      } catch {
        // Fall back to the original handler
        onSelectPlan(plan);
      } finally {
        setIsCheckoutLoading(false);
      }
    } else {
      onSelectPlan(plan);
    }
  };

  const handleVoucherSuccess = (result: VoucherRedemptionResult) => {
    setVoucherResult(result);
  };

  const handleVoucherSuccessClose = () => {
    setVoucherResult(null);
    onClose(); // Close the paywall after successful voucher redemption
  };

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
            Upgrade Your Plan
          </Text>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color={colors.dark[400]} />
          </TouchableOpacity>
        </View>

        {/* Feature Lock Message */}
        {feature && (
          <View className="mx-6 mb-6 p-4 bg-primary-500/10 rounded-xl flex-row items-center">
            <View className="w-10 h-10 bg-primary-500/20 rounded-full items-center justify-center mr-3">
              <Lock size={20} color={colors.primary[500]} />
            </View>
            <View className="flex-1">
              <Text className="text-white font-medium">
                {feature} requires Pro
              </Text>
              <Text className="text-dark-400 text-sm">
                Upgrade to unlock this feature
              </Text>
            </View>
          </View>
        )}

        {/* Benefits */}
        <View className="px-6 mb-6">
          <View className="flex-row items-center mb-4">
            <Crown size={24} color={colors.warning[500]} />
            <Text className="text-white text-xl font-bold ml-2">
              Unlock Premium Features
            </Text>
          </View>

          <View className="flex-row gap-4">
            {[
              { icon: Zap, text: 'Unlimited access' },
              { icon: Lock, text: 'Advanced tools' },
            ].map((item, index) => (
              <View
                key={index}
                className="flex-1 flex-row items-center bg-dark-800 rounded-lg p-3"
              >
                <item.icon size={16} color={colors.primary[400]} />
                <Text className="text-dark-200 ml-2 text-sm">{item.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Plans */}
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-6 pb-8"
          showsVerticalScrollIndicator={false}
        >
          <View className="gap-4">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isCurrentPlan={plan.id === 'free'}
                onSelect={handlePlanSelect}
              />
            ))}
          </View>

          {/* Terms */}
          <Text className="text-dark-500 text-xs text-center mt-6 px-4">
            By subscribing, you agree to our Terms of Service and Privacy
            Policy. Subscriptions auto-renew unless cancelled at least 24 hours
            before the end of the current period.
          </Text>
        </ScrollView>

        {/* Voucher link */}
        <View className="px-6 pb-4">
          <TouchableOpacity
            onPress={() => setShowVoucherModal(true)}
            className="flex-row items-center justify-center py-2"
          >
            <Ticket size={16} color={colors.primary[400]} />
            <Text className="text-primary-400 ml-2 font-medium">
              Have a voucher code?
            </Text>
          </TouchableOpacity>
        </View>

        {/* Restore Purchases */}
        <View className="px-6 pb-8">
          <Button
            title="Restore Purchases"
            variant="ghost"
            onPress={() => {}}
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

export default PaywallModal;
