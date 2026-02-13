import React from 'react';
import { View, Text } from 'react-native';
import { ClipboardList, CheckCircle2 } from 'lucide-react-native';
import { colors } from '@/theme/colors';

interface PlanModeBlockProps {
  mode: 'enter' | 'exit';
}

export function PlanModeBlock({ mode }: PlanModeBlockProps) {
  const isEnter = mode === 'enter';
  const bgColor = isEnter ? 'rgba(96, 165, 250, 0.12)' : 'rgba(34, 197, 94, 0.12)';
  const borderColor = isEnter ? colors.info[400] : colors.success[400];
  const textColor = isEnter ? colors.info[400] : colors.success[400];
  const Icon = isEnter ? ClipboardList : CheckCircle2;
  const label = isEnter ? 'Entering Plan Mode' : 'Plan Complete';

  return (
    <View testID="plan-mode-block" style={{
      marginBottom: 8,
      backgroundColor: bgColor,
      borderRadius: 8,
      borderLeftWidth: 3,
      borderLeftColor: borderColor,
      paddingVertical: 10,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
    }}>
      <Icon size={16} color={textColor} />
      <Text style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: '600', color: textColor, marginLeft: 8 }}>
        {label}
      </Text>
    </View>
  );
}
