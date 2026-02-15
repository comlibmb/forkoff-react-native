import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Check } from 'lucide-react-native';
import { Card } from '@/components/ui';
import { colors } from '@/theme/colors';

export interface PlanFeature {
  name: string;
  included: boolean;
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  interval: 'month' | 'year';
  features: PlanFeature[];
  popular?: boolean;
  badge?: string;
  stripePriceId?: string;
}

interface PlanCardProps {
  plan: Plan;
  isCurrentPlan?: boolean;
  onSelect: (plan: Plan) => void;
}

export function PlanCard({ plan, isCurrentPlan, onSelect }: PlanCardProps) {
  const formatPrice = (price: number, interval: string) => {
    if (price === 0) return 'Free';
    return `$${price}/${interval === 'year' ? 'yr' : 'mo'}`;
  };

  return (
    <TouchableOpacity
      onPress={() => onSelect(plan)}
      disabled={isCurrentPlan}
      activeOpacity={0.7}
    >
      <Card
        padding="lg"
        style={{
          borderWidth: plan.popular ? 2 : 1,
          borderColor: plan.popular ? colors.primary[500] : colors.dark[700],
          opacity: isCurrentPlan ? 0.7 : 1,
        }}
      >
        {/* Badge */}
        {(plan.badge || plan.popular) && (
          <View className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-500 px-3 py-1 rounded-full">
            <Text className="text-white text-xs font-semibold">
              {plan.badge || 'Most Popular'}
            </Text>
          </View>
        )}

        {/* Plan Header */}
        <View className="items-center mb-4 pt-2">
          <Text className="text-dark-400 text-sm uppercase tracking-wider mb-1">
            {plan.name}
          </Text>
          <View className="flex-row items-center">
            {plan.originalPrice != null && plan.originalPrice > plan.price && (
              <Text className="text-dark-500 text-lg mr-2" style={{ textDecorationLine: 'line-through' }}>
                ${plan.originalPrice}
              </Text>
            )}
            <Text className="text-white text-3xl font-bold">
              {formatPrice(plan.price, plan.interval)}
            </Text>
          </View>
          {plan.price > 0 && (
            <Text className="text-dark-500 text-sm">
              Billed {plan.interval}ly
            </Text>
          )}
        </View>

        {/* Features */}
        <View className="border-t border-dark-700 pt-4 mb-4">
          {plan.features.map((feature, index) => (
            <View key={index} className="flex-row items-center mb-3">
              <View
                className={`w-5 h-5 rounded-full items-center justify-center mr-3 ${
                  feature.included ? 'bg-success-500/20' : 'bg-dark-700'
                }`}
              >
                {feature.included ? (
                  <Check size={12} color={colors.success[500]} />
                ) : (
                  <Text className="text-dark-500 text-xs">-</Text>
                )}
              </View>
              <Text
                className={`flex-1 ${
                  feature.included ? 'text-dark-200' : 'text-dark-500'
                }`}
              >
                {feature.name}
              </Text>
            </View>
          ))}
        </View>

        {/* Action Button */}
        <View
          className={`py-3 rounded-xl items-center ${
            isCurrentPlan
              ? 'bg-dark-700'
              : plan.popular
              ? 'bg-primary-500'
              : 'bg-dark-600'
          }`}
        >
          <Text
            className={`font-semibold ${
              isCurrentPlan
                ? 'text-dark-400'
                : plan.popular
                ? 'text-white'
                : 'text-dark-200'
            }`}
          >
            {isCurrentPlan ? 'Current Plan' : 'Select Plan'}
          </Text>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

export default PlanCard;
