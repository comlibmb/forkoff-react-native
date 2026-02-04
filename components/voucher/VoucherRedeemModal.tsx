import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { X, Gift, Ticket } from 'lucide-react-native';
import { Button, Input } from '@/components/ui';
import { colors } from '@/theme/colors';
import { useVoucherStore } from '@/stores/voucher.store';
import { VoucherRedemptionResult } from '@/types';

interface VoucherRedeemModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (result: VoucherRedemptionResult) => void;
}

export function VoucherRedeemModal({
  visible,
  onClose,
  onSuccess,
}: VoucherRedeemModalProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  const { isRedeeming, redeemVoucher } = useVoucherStore();

  const handleRedeem = async () => {
    if (!code.trim()) {
      setError('Please enter a voucher code');
      return;
    }

    setError(null);
    const result = await redeemVoucher(code);

    if (result.success) {
      setCode('');
      onClose();
      onSuccess?.(result);
    } else {
      setError(result.message);
    }
  };

  const handleClose = () => {
    setCode('');
    setError(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
      onShow={() => {
        setTimeout(() => inputRef.current?.focus(), 100);
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 bg-dark-900"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 pt-6 pb-4">
          <View className="w-10" />
          <Text className="text-white text-lg font-semibold">
            Redeem Voucher
          </Text>
          <TouchableOpacity onPress={handleClose}>
            <X size={24} color={colors.dark[400]} />
          </TouchableOpacity>
        </View>

        <View className="flex-1 px-6">
          {/* Icon */}
          <View className="items-center my-8">
            <View className="w-20 h-20 bg-primary-500/20 rounded-full items-center justify-center">
              <Gift size={40} color={colors.primary[500]} />
            </View>
          </View>

          {/* Description */}
          <Text className="text-dark-300 text-center mb-6">
            Enter your voucher code below to unlock PRO features or special benefits.
          </Text>

          {/* Input */}
          <View className="mb-4">
            <Input
              ref={inputRef}
              placeholder="Enter voucher code"
              value={code}
              onChangeText={(text) => {
                setCode(text.toUpperCase());
                setError(null);
              }}
              autoCapitalize="characters"
              autoCorrect={false}
              error={error || undefined}
              leftIcon={<Ticket size={20} color={colors.dark[400]} />}
              returnKeyType="done"
              onSubmitEditing={handleRedeem}
              editable={!isRedeeming}
            />
          </View>

          {/* Example codes info */}
          <View className="bg-dark-800 rounded-xl p-4 mb-6">
            <Text className="text-dark-400 text-sm">
              Voucher codes can be found in promotional emails, partner offers, or special campaigns.
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View className="px-6 pb-8 gap-3">
          <Button
            title={isRedeeming ? 'Redeeming...' : 'Redeem Voucher'}
            onPress={handleRedeem}
            fullWidth
            loading={isRedeeming}
            disabled={!code.trim() || isRedeeming}
          />
          <Button
            title="Cancel"
            variant="ghost"
            onPress={handleClose}
            fullWidth
            disabled={isRedeeming}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default VoucherRedeemModal;
