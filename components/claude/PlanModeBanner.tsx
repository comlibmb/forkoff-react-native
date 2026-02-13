import React from 'react';
import { View, Text } from 'react-native';
import { ClipboardList } from 'lucide-react-native';
import { colors } from '@/theme/colors';

interface PlanModeBannerProps {
  isActive: boolean;
}

export function PlanModeBanner({ isActive }: PlanModeBannerProps) {
  if (!isActive) return null;

  return (
    <View testID="plan-mode-banner" style={{
      marginHorizontal: 16,
      marginVertical: 6,
      backgroundColor: 'rgba(96, 165, 250, 0.1)',
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(96, 165, 250, 0.2)',
    }}>
      <ClipboardList size={14} color={colors.info[400]} />
      <Text style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: '600', color: colors.info[400], marginLeft: 8 }}>
        Plan Mode Active
      </Text>
    </View>
  );
}
