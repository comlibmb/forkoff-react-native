import React from 'react';
import { View, Text } from 'react-native';
import { Info } from 'lucide-react-native';
import { colors } from '@/theme/colors';

interface SystemReminderBlockProps {
  content: string;
}

/**
 * Displays system reminder messages in a dimmed, subtle style.
 * These are automated messages from the system, not user or assistant content.
 */
export function SystemReminderBlock({ content }: SystemReminderBlockProps) {
  return (
    <View className="mb-3 opacity-60">
      <View className="flex-row items-start px-2 py-1 rounded bg-dark-800/50 border-l-2 border-dark-600">
        <Info size={12} color={colors.dark[500]} style={{ marginTop: 2, marginRight: 6 }} />
        <Text className="text-dark-400 font-mono text-xs flex-1" style={{ lineHeight: 16 }}>
          {content}
        </Text>
      </View>
    </View>
  );
}

/**
 * Parses text containing system-reminder tags and extracts the content.
 */
export function parseSystemReminderTags(text: string): string[] {
  const reminders: string[] = [];
  const regex = /<system-reminder>(.*?)<\/system-reminder>/gs;
  let match;
  while ((match = regex.exec(text)) !== null) {
    reminders.push(match[1].trim());
  }
  return reminders;
}

/**
 * Removes system-reminder tags from text, returning the clean text.
 */
export function stripSystemReminderTags(text: string): string {
  return text.replace(/<system-reminder>.*?<\/system-reminder>/gs, '').trim();
}

/**
 * Checks if text contains system-reminder tags.
 */
export function hasSystemReminderTags(text: string): boolean {
  return text.includes('<system-reminder>');
}

export default SystemReminderBlock;
