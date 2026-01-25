import React from 'react';
import { View, Text } from 'react-native';
import { ChatMessage } from '@/types';
import { colors } from '@/theme/colors';

interface ChatBubbleProps {
  message: ChatMessage;
  showTimestamp?: boolean;
}

export function ChatBubble({ message, showTimestamp = false }: ChatBubbleProps) {
  const isUser = message.role === 'user';
  const isStreaming = message.status === 'streaming';

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View className={`flex-row ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <View
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isUser ? 'bg-primary-500' : 'bg-dark-800'
        }`}
        style={{
          borderBottomRightRadius: isUser ? 4 : 16,
          borderBottomLeftRadius: isUser ? 16 : 4,
        }}
      >
        <Text className={`${isUser ? 'text-white' : 'text-dark-100'} text-base`}>
          {message.content}
        </Text>

        {isStreaming && (
          <View className="flex-row items-center mt-2 gap-1">
            <View
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: isUser ? '#fff' : colors.primary[400], opacity: 0.8 }}
            />
            <View
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: isUser ? '#fff' : colors.primary[400], opacity: 0.5 }}
            />
            <View
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: isUser ? '#fff' : colors.primary[400], opacity: 0.3 }}
            />
          </View>
        )}

        {showTimestamp && (
          <Text
            className={`text-xs mt-2 ${
              isUser ? 'text-white/60' : 'text-dark-500'
            }`}
          >
            {formatTime(message.timestamp)}
          </Text>
        )}
      </View>
    </View>
  );
}

export default ChatBubble;
