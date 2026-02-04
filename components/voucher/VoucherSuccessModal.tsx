import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { X, CheckCircle, Crown, Zap, Clock } from 'lucide-react-native';
import { Button } from '@/components/ui';
import { colors } from '@/theme/colors';
import { VoucherRedemptionResult, VoucherBenefitType } from '@/types';

interface VoucherSuccessModalProps {
  visible: boolean;
  onClose: () => void;
  result: VoucherRedemptionResult | null;
}

function getBenefitIcon(type?: VoucherBenefitType) {
  switch (type) {
    case 'LIFETIME_PRO':
      return Crown;
    case 'FREE_MONTHS':
      return Clock;
    case 'DISCOUNT_PERCENT':
      return Zap;
    default:
      return CheckCircle;
  }
}

function formatExpiryDate(dateString?: string): string | null {
  if (!dateString) return null;

  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function VoucherSuccessModal({
  visible,
  onClose,
  result,
}: VoucherSuccessModalProps) {
  if (!result?.success || !result.benefit) return null;

  const BenefitIcon = getBenefitIcon(result.benefit.type);
  const expiryDate = formatExpiryDate(result.benefit.expiresAt);

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
            Success!
          </Text>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color={colors.dark[400]} />
          </TouchableOpacity>
        </View>

        <View className="flex-1 px-6 justify-center">
          {/* Success icon */}
          <View className="items-center mb-8">
            <View className="w-24 h-24 bg-success-500/20 rounded-full items-center justify-center mb-4">
              <CheckCircle size={48} color={colors.success[500]} />
            </View>

            <Text className="text-white text-2xl font-bold text-center mb-2">
              {result.message}
            </Text>
          </View>

          {/* Benefit card */}
          <View className="bg-dark-800 rounded-2xl p-6 mb-6">
            <View className="flex-row items-center mb-4">
              <View className="w-12 h-12 bg-primary-500/20 rounded-full items-center justify-center mr-4">
                <BenefitIcon size={24} color={colors.primary[500]} />
              </View>
              <View className="flex-1">
                <Text className="text-white font-semibold text-lg">
                  {result.benefit.description}
                </Text>
                {result.benefit.type === 'LIFETIME_PRO' && (
                  <Text className="text-primary-400 text-sm">
                    Never expires
                  </Text>
                )}
              </View>
            </View>

            {expiryDate && result.benefit.type !== 'LIFETIME_PRO' && (
              <View className="flex-row items-center bg-dark-700 rounded-lg px-4 py-3">
                <Clock size={16} color={colors.dark[400]} />
                <Text className="text-dark-300 ml-2">
                  Valid until {expiryDate}
                </Text>
              </View>
            )}
          </View>

          {/* PRO features reminder */}
          {(result.benefit.type === 'LIFETIME_PRO' || result.benefit.type === 'FREE_MONTHS') && (
            <View className="bg-primary-500/10 rounded-xl p-4">
              <Text className="text-primary-400 font-semibold mb-2">
                You now have access to:
              </Text>
              <View className="gap-2">
                {['Unlimited messages', 'Unlimited sessions', 'Unlimited projects', 'Unlimited paired PCs'].map((feature, index) => (
                  <View key={index} className="flex-row items-center">
                    <Zap size={14} color={colors.primary[400]} />
                    <Text className="text-dark-200 ml-2">{feature}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Actions */}
        <View className="px-6 pb-8">
          <Button
            title="Get Started"
            onPress={onClose}
            fullWidth
          />
        </View>
      </View>
    </Modal>
  );
}

export default VoucherSuccessModal;
