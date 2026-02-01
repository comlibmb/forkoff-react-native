import React, { useState, useRef } from 'react';
import { View, TextInput, TouchableOpacity, Keyboard, Platform } from 'react-native';
import { Send, Paperclip, Mic, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme/ThemeProvider';

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
  const { theme } = useTheme();
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
    <View
      className="px-4 py-3"
      style={{ borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: theme.background }}
    >
      <View
        className="flex-row items-end rounded-2xl px-4 py-2"
        style={{
          backgroundColor: theme.backgroundSecondary,
          borderWidth: 1,
          borderColor: isFocused ? `${theme.primary}80` : 'transparent',
        }}
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
              color={disabled ? theme.backgroundTertiary : theme.textTertiary}
            />
          </TouchableOpacity>
        )}

        {/* Text Input */}
        <View className="flex-1 flex-row items-end">
          <TextInput
            ref={inputRef}
            className="flex-1 text-base py-2 max-h-32"
            style={{ color: theme.text }}
            placeholder={placeholder}
            placeholderTextColor={theme.textTertiary}
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
              <X size={16} color={theme.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Voice / Send Button */}
        <View className="ml-2">
          {canSend ? (
            <TouchableOpacity
              onPress={handleSend}
              className="w-9 h-9 rounded-full items-center justify-center"
              style={{ backgroundColor: theme.primary }}
            >
              <Send size={18} color={theme.textInverse} />
            </TouchableOpacity>
          ) : onVoice ? (
            <TouchableOpacity
              onPress={onVoice}
              disabled={disabled}
              className="w-9 h-9 rounded-full items-center justify-center"
            >
              <Mic
                size={20}
                color={disabled ? theme.backgroundTertiary : theme.textTertiary}
              />
            </TouchableOpacity>
          ) : (
            <View className="w-9 h-9 rounded-full items-center justify-center opacity-50">
              <Send size={18} color={theme.textTertiary} />
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

export default ChatInput;
