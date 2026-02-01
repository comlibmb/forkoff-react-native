import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';

interface PeriodSelectorProps {
  selected: 'day' | 'week' | 'month' | 'all';
  onSelect: (period: 'day' | 'week' | 'month' | 'all') => void;
}

const periods: { key: 'day' | 'week' | 'month' | 'all'; label: string }[] = [
  { key: 'day', label: 'Today' },
  { key: 'week', label: '7 Days' },
  { key: 'month', label: '30 Days' },
  { key: 'all', label: 'All Time' },
];

export function PeriodSelector({ selected, onSelect }: PeriodSelectorProps) {
  return (
    <View style={styles.container}>
      {periods.map((period) => (
        <TouchableOpacity
          key={period.key}
          style={[styles.button, selected === period.key && styles.buttonSelected]}
          onPress={() => onSelect(period.key)}
        >
          <Text
            style={[styles.buttonText, selected === period.key && styles.buttonTextSelected]}
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
    backgroundColor: colors.dark[700],
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.dark[600],
  },
  button: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonSelected: {
    backgroundColor: colors.primary[500],
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.dark[300],
  },
  buttonTextSelected: {
    color: '#fff',
  },
});

export default PeriodSelector;
