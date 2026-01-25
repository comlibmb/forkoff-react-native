import React, { useState, useRef } from 'react';
import { View, TextInput, TouchableOpacity, Text } from 'react-native';
import { Send, ChevronUp, ChevronDown } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '@/theme/colors';

interface CommandInputProps {
  onSubmit: (command: string) => void;
  disabled?: boolean;
  prompt?: string;
  history?: string[];
}

export function CommandInput({
  onSubmit,
  disabled = false,
  prompt = '$',
  history = [],
}: CommandInputProps) {
  const [command, setCommand] = useState('');
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<TextInput>(null);

  const handleSubmit = () => {
    const trimmedCommand = command.trim();
    if (trimmedCommand && !disabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSubmit(trimmedCommand);
      setCommand('');
      setHistoryIndex(-1);
    }
  };

  const navigateHistory = (direction: 'up' | 'down') => {
    if (history.length === 0) return;

    Haptics.selectionAsync();

    if (direction === 'up') {
      const newIndex = Math.min(historyIndex + 1, history.length - 1);
      setHistoryIndex(newIndex);
      setCommand(history[history.length - 1 - newIndex] || '');
    } else {
      const newIndex = Math.max(historyIndex - 1, -1);
      setHistoryIndex(newIndex);
      if (newIndex === -1) {
        setCommand('');
      } else {
        setCommand(history[history.length - 1 - newIndex] || '');
      }
    }
  };

  return (
    <View className="bg-dark-800 border-t border-dark-700 px-4 py-3">
      <View className="flex-row items-center">
        {/* Prompt */}
        <Text className="text-primary-400 font-mono text-base mr-2">
          {prompt}
        </Text>

        {/* Input */}
        <TextInput
          ref={inputRef}
          className="flex-1 text-white font-mono text-base py-2"
          placeholder="Enter command..."
          placeholderTextColor={colors.dark[500]}
          value={command}
          onChangeText={(text) => {
            setCommand(text);
            setHistoryIndex(-1);
          }}
          onSubmitEditing={handleSubmit}
          editable={!disabled}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          returnKeyType="send"
          blurOnSubmit={false}
        />

        {/* History Navigation */}
        {history.length > 0 && (
          <View className="flex-row items-center mr-2">
            <TouchableOpacity
              onPress={() => navigateHistory('up')}
              disabled={disabled || historyIndex >= history.length - 1}
              className="p-1"
            >
              <ChevronUp
                size={20}
                color={
                  historyIndex >= history.length - 1
                    ? colors.dark[600]
                    : colors.dark[400]
                }
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigateHistory('down')}
              disabled={disabled || historyIndex <= -1}
              className="p-1"
            >
              <ChevronDown
                size={20}
                color={historyIndex <= -1 ? colors.dark[600] : colors.dark[400]}
              />
            </TouchableOpacity>
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={disabled || !command.trim()}
          className={`w-9 h-9 rounded-lg items-center justify-center ${
            command.trim() && !disabled ? 'bg-primary-500' : 'bg-dark-700'
          }`}
        >
          <Send
            size={18}
            color={command.trim() && !disabled ? '#fff' : colors.dark[500]}
          />
        </TouchableOpacity>
      </View>

      {/* Quick Commands */}
      <View className="flex-row flex-wrap gap-2 mt-3">
        {['clear', 'ls', 'pwd', 'git status'].map((cmd) => (
          <TouchableOpacity
            key={cmd}
            onPress={() => {
              setCommand(cmd);
              inputRef.current?.focus();
            }}
            disabled={disabled}
            className="bg-dark-700 px-3 py-1.5 rounded-lg"
          >
            <Text className="text-dark-300 font-mono text-xs">{cmd}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default CommandInput;
