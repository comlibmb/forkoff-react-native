import React, { useState, useRef } from 'react';
import { View, TextInput, TouchableOpacity, Keyboard, Platform } from 'react-native';
import { Send, Paperclip, Mic, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '@/theme/colors';

interface ChatInputProps {
  onSend: (message: string) => void;
  onAttachment?: () => void;
  onVoice?: () => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function ChatInput({
  onSend,
  onAttachment,
  onVoice,
  placeholder = 'Type a message...',
  disabled = false,
  autoFocus = false,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (trimmedMessage && !disabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSend(trimmedMessage);
      setMessage('');
    }
  };

  const handleClear = () => {
    setMessage('');
    inputRef.current?.focus();
  };

  const canSend = message.trim().length > 0 && !disabled;

  return (
    <View className="border-t border-dark-700 bg-dark-800 px-4 py-3">
      <View
        className={`flex-row items-end bg-dark-700 rounded-2xl px-4 py-2 ${
          isFocused ? 'border border-primary-500/50' : 'border border-transparent'
        }`}
      >
        {/* Attachment Button */}
        {onAttachment && (
          <TouchableOpacity
            onPress={onAttachment}
            disabled={disabled}
            className="mr-2 p-1"
          >
            <Paperclip
              size={20}
              color={disabled ? colors.dark[600] : colors.dark[400]}
            />
          </TouchableOpacity>
        )}

        {/* Text Input */}
        <View className="flex-1 flex-row items-end">
          <TextInput
            ref={inputRef}
            className="flex-1 text-white text-base py-2 max-h-32"
            placeholder={placeholder}
            placeholderTextColor={colors.dark[500]}
            value={message}
            onChangeText={setMessage}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            multiline
            editable={!disabled}
            autoFocus={autoFocus}
            returnKeyType="default"
            blurOnSubmit={false}
            textAlignVertical="center"
          />

          {/* Clear Button */}
          {message.length > 0 && (
            <TouchableOpacity
              onPress={handleClear}
              className="ml-2 p-1"
            >
              <X size={16} color={colors.dark[500]} />
            </TouchableOpacity>
          )}
        </View>

        {/* Voice / Send Button */}
        <View className="ml-2">
          {canSend ? (
            <TouchableOpacity
              onPress={handleSend}
              className="bg-primary-500 w-9 h-9 rounded-full items-center justify-center"
            >
              <Send size={18} color="#fff" />
            </TouchableOpacity>
          ) : onVoice ? (
            <TouchableOpacity
              onPress={onVoice}
              disabled={disabled}
              className="w-9 h-9 rounded-full items-center justify-center"
            >
              <Mic
                size={20}
                color={disabled ? colors.dark[600] : colors.dark[400]}
              />
            </TouchableOpacity>
          ) : (
            <View className="w-9 h-9 rounded-full items-center justify-center opacity-50">
              <Send size={18} color={colors.dark[500]} />
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

export default ChatInput;
