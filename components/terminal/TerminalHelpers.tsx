import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { ChevronUp, ChevronDown, CornerDownLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface TerminalHelpersProps {
  onTabPress: () => void;
  onArrowUp: () => void;
  onArrowDown: () => void;
  onEnter: () => void;
  onCtrlC: () => void;
  onCtrlD: () => void;
  tabCompletions?: string[];
  onSelectCompletion?: (completion: string) => void;
}

export default function TerminalHelpers({
  onTabPress,
  onArrowUp,
  onArrowDown,
  onEnter,
  onCtrlC,
  onCtrlD,
  tabCompletions = [],
  onSelectCompletion,
}: TerminalHelpersProps) {
  const handlePress = (action: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    action();
  };

  const HelperButton = ({
    label,
    onPress,
    variant = 'default',
    children,
  }: {
    label?: string;
    onPress: () => void;
    variant?: 'default' | 'danger' | 'action';
    children?: React.ReactNode;
  }) => {
    const bgColor =
      variant === 'danger'
        ? 'bg-red-500/20'
        : variant === 'action'
        ? 'bg-indigo-500/20'
        : 'bg-gray-800';

    const textColor =
      variant === 'danger'
        ? 'text-red-400'
        : variant === 'action'
        ? 'text-indigo-400'
        : 'text-gray-300';

    return (
      <TouchableOpacity
        onPress={() => handlePress(onPress)}
        className={`${bgColor} px-3 py-2 rounded-lg mr-2 min-w-[44px] items-center justify-center`}
        activeOpacity={0.7}
      >
        {children || <Text className={`${textColor} font-mono text-sm`}>{label}</Text>}
      </TouchableOpacity>
    );
  };

  return (
    <View className="border-t border-gray-800">
      {/* Tab Completions */}
      {tabCompletions.length > 0 && (
        <View className="border-b border-gray-800">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="p-2"
            keyboardShouldPersistTaps="handled"
          >
            {tabCompletions.map((completion, index) => (
              <TouchableOpacity
                key={`${completion}-${index}`}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onSelectCompletion?.(completion);
                }}
                className="bg-indigo-500/20 px-3 py-1.5 rounded-full mr-2"
              >
                <Text className="text-indigo-400 font-mono text-sm">{completion}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Helper Buttons */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="p-2"
        keyboardShouldPersistTaps="handled"
      >
        <HelperButton label="Tab" onPress={onTabPress} variant="action" />
        <HelperButton onPress={onArrowUp}>
          <ChevronUp size={18} color="#9ca3af" />
        </HelperButton>
        <HelperButton onPress={onArrowDown}>
          <ChevronDown size={18} color="#9ca3af" />
        </HelperButton>
        <HelperButton onPress={onEnter}>
          <CornerDownLeft size={18} color="#9ca3af" />
        </HelperButton>
        <View className="w-2" />
        <HelperButton label="^C" onPress={onCtrlC} variant="danger" />
        <HelperButton label="^D" onPress={onCtrlD} variant="danger" />
      </ScrollView>
    </View>
  );
}
