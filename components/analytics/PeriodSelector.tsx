import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ThemeColors } from '@/theme/ThemeProvider';

interface PeriodSelectorProps {
  selected: 'day' | 'week' | 'month' | 'all';
  onSelect: (period: 'day' | 'week' | 'month' | 'all') => void;
  theme: ThemeColors;
}

const periods: { key: 'day' | 'week' | 'month' | 'all'; label: string }[] = [
  { key: 'day', label: 'Today' },
  { key: 'week', label: '7 Days' },
  { key: 'month', label: '30 Days' },
  { key: 'all', label: 'All Time' },
];

export function PeriodSelector({ selected, onSelect, theme }: PeriodSelectorProps) {
  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      {periods.map((period) => (
        <TouchableOpacity
          key={period.key}
          style={[
            styles.button,
            selected === period.key && { backgroundColor: theme.primary },
          ]}
          onPress={() => onSelect(period.key)}
        >
          <Text
            style={[
              styles.buttonText,
              { color: theme.textTertiary },
              selected === period.key && styles.buttonTextSelected,
            ]}
          >
            {period.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
  },
  button: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  buttonTextSelected: {
    color: '#fff',
  },
});

export default PeriodSelector;
