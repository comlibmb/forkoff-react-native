import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { ParsedOption } from '@/types';

interface OptionButtonsProps {
  terminalOutput: string;
  onSelectOption: (key: string) => void;
  onOther?: () => void;
}

// Parse terminal output for numbered/lettered options
function parseOptions(output: string): ParsedOption[] | null {
  const lines = output.split('\n');
  const options: ParsedOption[] = [];

  // Patterns to match:
  // "1. Option text" or "1) Option text"
  // "[1] Option text"
  // "(a) Option text" or "(A) Option text"
  // "1: Option text"
  const patterns = [
    /^(\d+)[\.\):\s]\s*(.+)$/,       // "1. Option" or "1) Option" or "1: Option"
    /^\[(\d+)\]\s*(.+)$/,            // "[1] Option"
    /^\(([a-zA-Z])\)\s*(.+)$/,       // "(a) Option"
    /^([a-zA-Z])[\.\)]\s*(.+)$/,     // "a. Option" or "a) Option"
  ];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    for (const pattern of patterns) {
      const match = trimmed.match(pattern);
      if (match) {
        options.push({
          key: match[1],
          label: match[2].trim(),
          raw: trimmed,
        });
        break;
      }
    }
  }

  // Only return options if we found at least 2
  // (to avoid false positives from numbered lists in regular text)
  return options.length >= 2 ? options : null;
}

export default function OptionButtons({
  terminalOutput,
  onSelectOption,
  onOther,
}: OptionButtonsProps) {
  const options = useMemo(() => {
    // Only look at the last portion of output (last 2000 chars)
    const recentOutput = terminalOutput.slice(-2000);
    return parseOptions(recentOutput);
  }, [terminalOutput]);

  const handleSelect = (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectOption(key);
  };

  const handleOther = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onOther?.();
  };

  if (!options || options.length === 0) {
    return null;
  }

  return (
    <View className="border-t border-gray-800 bg-gray-900/80">
      <View className="px-3 py-1.5">
        <Text className="text-gray-500 text-xs uppercase tracking-wide">
          Quick Select
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="px-2 pb-2"
        keyboardShouldPersistTaps="handled"
      >
        {options.map((option) => (
          <TouchableOpacity
            key={option.key}
            onPress={() => handleSelect(option.key)}
            className="bg-indigo-500/20 border border-indigo-500/30 px-3 py-2 rounded-lg mr-2 max-w-[200px]"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center">
              <View className="bg-indigo-500 w-6 h-6 rounded items-center justify-center mr-2">
                <Text className="text-white font-bold text-sm">{option.key}</Text>
              </View>
              <Text className="text-gray-300 text-sm flex-shrink" numberOfLines={1}>
                {option.label}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
        {onOther && (
          <TouchableOpacity
            onPress={handleOther}
            className="bg-gray-800 border border-gray-700 px-3 py-2 rounded-lg"
            activeOpacity={0.7}
          >
            <Text className="text-gray-400 text-sm">Other...</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

// Export the parse function for testing
export { parseOptions };
