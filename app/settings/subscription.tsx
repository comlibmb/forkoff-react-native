import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { alert } from '@/components/ui/AlertModal';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Check, Zap, Star, Users, ArrowRight } from 'lucide-react-native';
import { useAuthStore } from '@/stores/auth.store';
import { colors } from '@/theme/colors';

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    icon: Star,
    color: colors.dark[300],
    features: [
      '1 connected device',
      'Basic chat with AI tools',
      'View code changes',
      'Community support',
    ],
    limitations: [
      'Limited to 100 messages/day',
      'No priority support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$9.99',
    period: 'per month',
    icon: Zap,
    color: colors.primary[500],
    popular: true,
    features: [
      '5 connected devices',
      'Unlimited AI chat',
      'Code diff viewer',
      'Terminal access',
      'Push notifications',
      'Priority support',
    ],
    limitations: [],
  },
  {
    id: 'team',
    name: 'Team',
    price: '$29.99',
    period: 'per month',
    icon: Users,
    color: colors.warning[300],
    features: [
      'Unlimited devices',
      'Everything in Pro',
      'Team collaboration',
      'Shared projects',
      'Admin dashboard',
      'SSO support',
      'Dedicated support',
    ],
    limitations: [],
  },
];

type PlanId = 'free' | 'pro' | 'team';

export default function SubscriptionScreen() {
  const { user } = useAuthStore();
  const [selectedPlan, setSelectedPlan] = useState<PlanId>((user?.subscription as PlanId) || 'free');
  const [isLoading, setIsLoading] = useState(false);

  const currentPlan = user?.subscription || 'free';

  const handleSubscribe = async (planId: string) => {
    if (planId === currentPlan) return;

    setIsLoading(true);

    // Simulate subscription process
    await new Promise((resolve) => setTimeout(resolve, 1500));

    await alert.success(
      'Subscription Updated',
      `You've been upgraded to the ${planId.charAt(0).toUpperCase() + planId.slice(1)} plan!`
    );
    router.back();

    setIsLoading(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-dark-800" edges={['top']}>
      {/* Header */}
      <View className="bg-dark-800/95 border-b border-dark-500 px-4 pb-4 pt-2 flex-row items-center">
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center"
        >
          <ArrowLeft size={24} color={colors.dark[200]} />
          <Text className="text-dark-200 ml-2 font-medium">Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4" contentContainerClassName="py-4 pb-8">
        <Text className="text-dark-50 text-2xl font-bold mb-2">
          Choose Your Plan
        </Text>
        <Text className="text-dark-200 mb-6">
          Unlock more features with a premium subscription
        </Text>

        {/* Plans */}
        {plans.map((plan) => {
          const Icon = plan.icon;
          const isCurrentPlan = plan.id === currentPlan;
          const isSelected = plan.id === selectedPlan;

          return (
            <TouchableOpacity
              key={plan.id}
              onPress={() => setSelectedPlan(plan.id as PlanId)}
              activeOpacity={0.7}
              className={`bg-dark-700 rounded-xl p-4 mb-4 overflow-hidden ${
                isSelected ? 'border-2' : 'border border-dark-500'
              }`}
              style={{
                borderColor: isSelected ? plan.color : colors.dark[500],
              }}
            >
              {plan.popular && (
                <View
                  className="absolute top-0 right-0 px-3 py-1 rounded-bl-lg"
                  style={{ backgroundColor: plan.color }}
                >
                  <Text className="text-white text-xs font-bold">
                    POPULAR
                  </Text>
                </View>
              )}

              <View className="flex-row items-center mb-4">
                <View
                  className="w-12 h-12 rounded-xl items-center justify-center mr-4"
                  style={{ backgroundColor: plan.color + '20' }}
                >
                  <Icon size={24} color={plan.color} />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center">
                    <Text className="text-dark-50 text-xl font-bold">
                      {plan.name}
                    </Text>
                    {isCurrentPlan && (
                      <View className="ml-2 bg-success-500/10 border border-success-500/20 px-2 py-0.5 rounded">
                        <Text className="text-success-500 text-xs font-bold">
                          Current
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-dark-300">
                    <Text className="text-dark-50 text-lg font-bold">
                      {plan.price}
                    </Text>{' '}
                    {plan.period}
                  </Text>
                </View>

                {isSelected && (
                  <View
                    className="w-6 h-6 rounded-full items-center justify-center"
                    style={{ backgroundColor: plan.color }}
                  >
                    <Check size={14} color="#fff" />
                  </View>
                )}
              </View>

              {/* Features */}
              <View className="gap-2">
                {plan.features.map((feature, index) => (
                  <View key={index} className="flex-row items-center">
                    <Check size={16} color={colors.success[500]} />
                    <Text className="text-dark-200 ml-2 text-sm">{feature}</Text>
                  </View>
                ))}

                {plan.limitations.map((limitation, index) => (
                  <View key={index} className="flex-row items-center">
                    <View className="w-4 h-4 items-center justify-center">
                      <View className="w-1 h-1 bg-dark-400 rounded-full" />
                    </View>
                    <Text className="text-dark-400 ml-2 text-sm">{limitation}</Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Subscribe Button */}
        <TouchableOpacity
          onPress={() => handleSubscribe(selectedPlan)}
          disabled={selectedPlan === currentPlan || isLoading}
          className="bg-primary-500 rounded-xl p-4 flex-row items-center justify-center gap-2"
          style={{
            shadowColor: colors.primary[500],
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.2,
            shadowRadius: 12,
            elevation: 5,
            opacity: selectedPlan === currentPlan || isLoading ? 0.5 : 1,
          }}
        >
          <Text className="text-white font-bold text-base">
            {isLoading
              ? 'Processing...'
              : selectedPlan === currentPlan
              ? 'Current Plan'
              : `Upgrade to ${selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)}`}
          </Text>
          {!isLoading && selectedPlan !== currentPlan && <ArrowRight size={18} color="#fff" />}
        </TouchableOpacity>

        <Text className="text-dark-400 text-center text-xs mt-4">
          Cancel anytime. No hidden fees.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
