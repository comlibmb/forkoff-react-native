import React from 'react';
import { View, Text } from 'react-native';
import { Terminal, ChevronRight } from 'lucide-react-native';
import { colors } from '@/theme/colors';

interface LocalCommandBlockProps {
  commandName: string;
  commandMessage?: string;
  commandArgs?: string;
  stdout?: string;
  caveat?: string;
}

/**
 * Displays local CLI commands in a style matching Claude Code CLI.
 *
 * Example display:
 * ╭─ /compact
 * │  Compacted (ctrl+o to see full summary)
 * ╰─
 */
export function LocalCommandBlock({
  commandName,
  commandMessage,
  commandArgs,
  stdout,
  caveat,
}: LocalCommandBlockProps) {
  // Strip ANSI escape codes from stdout
  const cleanStdout = stdout?.replace(/\x1b\[[0-9;]*m/g, '').trim();

  // Format command display
  const fullCommand = commandArgs
    ? `${commandName} ${commandArgs}`
    : commandName;

  return (
    <View className="mb-4">
      {/* Command header */}
      <View className="flex-row items-center">
        <View className="w-4 items-center">
          <Text className="text-dark-500 font-mono text-xs">╭</Text>
        </View>
        <Text className="text-dark-500 font-mono text-xs">─</Text>
        <View className="flex-row items-center ml-1">
          <Terminal size={12} color={colors.dark[400]} />
          <Text className="text-primary-400 font-mono text-sm ml-1 font-medium">
            {fullCommand}
          </Text>
        </View>
      </View>

      {/* Output content */}
      {cleanStdout && (
        <View className="flex-row">
          <View className="w-4 items-center">
            <Text className="text-dark-500 font-mono text-xs">│</Text>
          </View>
          <View className="flex-1 ml-2 py-1">
            <Text className="text-dark-300 font-mono text-xs">
              {cleanStdout}
            </Text>
          </View>
        </View>
      )}

      {/* Caveat message - dimmed */}
      {caveat && (
        <View className="flex-row">
          <View className="w-4 items-center">
            <Text className="text-dark-500 font-mono text-xs">│</Text>
          </View>
          <View className="flex-1 ml-2 py-1">
            <Text className="text-dark-500 font-mono text-xs italic">
              {caveat}
            </Text>
          </View>
        </View>
      )}

      {/* Command footer */}
      <View className="flex-row items-center">
        <View className="w-4 items-center">
          <Text className="text-dark-500 font-mono text-xs">╰</Text>
        </View>
        <Text className="text-dark-500 font-mono text-xs">─</Text>
      </View>
    </View>
  );
}

/**
 * Parses text containing local command XML tags and extracts structured data.
 */
export interface ParsedLocalCommand {
  commandName: string;
  commandMessage?: string;
  commandArgs?: string;
  stdout?: string;
  caveat?: string;
}

export function parseLocalCommandTags(text: string): ParsedLocalCommand | null {
  // Check if this text contains local command tags
  if (!text.includes('<command-name>') && !text.includes('<local-command-stdout>')) {
    return null;
  }

  const extract = (tag: string): string | undefined => {
    const regex = new RegExp(`<${tag}>(.*?)</${tag}>`, 's');
    const match = text.match(regex);
    return match?.[1]?.trim();
  };

  const commandName = extract('command-name');
  if (!commandName) {
    return null;
  }

  return {
    commandName,
    commandMessage: extract('command-message'),
    commandArgs: extract('command-args'),
    stdout: extract('local-command-stdout'),
    caveat: extract('local-command-caveat'),
  };
}

/**
 * Checks if text is primarily a local command block (should be rendered as LocalCommandBlock)
 */
export function isLocalCommandText(text: string): boolean {
  return text.includes('<command-name>') ||
         (text.includes('<local-command-') && text.includes('<command-'));
}

export default LocalCommandBlock;
