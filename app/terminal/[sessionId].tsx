import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import * as ExpoClipboard from 'expo-clipboard';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Terminal as TerminalIcon,
  MoreVertical,
  Send,
  Trash2,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Clipboard,
  CornerDownLeft,
} from 'lucide-react-native';
import { useTerminalStore } from '@/stores/terminal.store';
import { colors } from '@/theme/colors';
import { LinearGradient } from 'expo-linear-gradient';

// Helper function to convert hex to rgba
const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Theme-aware color helpers
const themeColors = {
  border: hexToRgba(colors.dark[500], 0.6),
  borderLight: hexToRgba(colors.dark[500], 0.3),
  terminalBg: colors.dark[950],
  primaryGlow: hexToRgba(colors.primary[500], 0.3),
  primaryBg: hexToRgba(colors.primary[500], 0.1),
};

// Quick command suggestions
const QUICK_COMMANDS = [
  'git status',
  'npm install',
  'ls -la',
  'cd ..',
  'npm run dev',
  'git pull',
];

export default function TerminalScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const [inputCommand, setInputCommand] = useState('');
  const [showKeyboardToolbar, setShowKeyboardToolbar] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const {
    terminals,
    sendCommand,
    clearTerminal,
    subscribeToTerminal,
  } = useTerminalStore();

  const terminal = terminals.find((t) => t.id === sessionId);

  useEffect(() => {
    if (sessionId) {
      const unsubscribe = subscribeToTerminal(sessionId);
      return unsubscribe;
    }
  }, [sessionId]);

  // Handle keyboard events
  useEffect(() => {
    const keyboardDidShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        setShowKeyboardToolbar(true);
      }
    );
    const keyboardDidHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
        setShowKeyboardToolbar(false);
      }
    );

    return () => {
      keyboardDidShow.remove();
      keyboardDidHide.remove();
    };
  }, []);

  useEffect(() => {
    // Scroll to bottom when new output arrives
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 50);
  }, [terminal?.output.length]);

  const handleSendCommand = () => {
    if (!inputCommand.trim() || !sessionId) return;

    sendCommand(sessionId, inputCommand.trim());
    setInputCommand('');
  };

  const handleQuickCommand = (command: string) => {
    if (!sessionId) return;
    sendCommand(sessionId, command);
  };

  const handleClear = () => {
    if (sessionId) {
      clearTerminal(sessionId);
    }
  };

  // Send special key sequences
  const sendControlSequence = (key: string) => {
    if (!sessionId) return;

    // Send the appropriate control character
    let controlChar = '';
    switch (key) {
      case 'c':
        controlChar = '\x03'; // Ctrl+C (ETX - End of Text / Interrupt)
        break;
      case 'd':
        controlChar = '\x04'; // Ctrl+D (EOT - End of Transmission)
        break;
      case 'tab':
        controlChar = '\t'; // Tab character
        break;
      case 'up':
        controlChar = '\x1b[A'; // Arrow Up escape sequence
        break;
      case 'down':
        controlChar = '\x1b[B'; // Arrow Down escape sequence
        break;
      case 'left':
        controlChar = '\x1b[D'; // Arrow Left escape sequence
        break;
      case 'right':
        controlChar = '\x1b[C'; // Arrow Right escape sequence
        break;
      default:
        return;
    }

    sendCommand(sessionId, controlChar);

    // Keep keyboard open by refocusing input
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  };

  // Copy terminal output to clipboard
  const handleCopy = async () => {
    if (!terminal) return;

    const outputText = terminal.output
      .map((line) => line.content)
      .join('\n');

    await ExpoClipboard.setStringAsync(outputText);

    // Keep keyboard open
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  };

  // Paste from clipboard into command input
  const handlePaste = async () => {
    const text = await ExpoClipboard.getStringAsync();
    if (text) {
      setInputCommand((prev) => prev + text);
    }

    // Keep keyboard open
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  };

  const getLineColor = (type: string) => {
    switch (type) {
      case 'input':
        return colors.success[500]; // Green for input prompt
      case 'error':
        return colors.error[300];
      default:
        return colors.dark[50];
    }
  };

  if (!terminal) {
    return (
      <SafeAreaView className="flex-1 bg-dark-800 items-center justify-center">
        <View className="bg-dark-700 border border-dark-500 rounded-xl p-8 items-center mx-4">
          <TerminalIcon size={48} color={colors.dark[400]} />
          <Text className="text-dark-200 mt-4 text-center">Terminal not found</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="mt-4 bg-dark-600 border border-dark-500 px-6 py-3 rounded-full"
          >
            <Text className="text-dark-50 font-medium">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Determine terminal status
  const isIdle = terminal.output.length === 0 ||
    terminal.output[terminal.output.length - 1]?.type !== 'output';

  return (
    <SafeAreaView className="flex-1 bg-dark-800" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="bg-dark-700 border-b border-dark-500 px-4 py-3 flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={20} color={colors.dark[200]} />
          </TouchableOpacity>
          <View>
            <View className="flex-row items-center gap-2">
              <TerminalIcon size={16} color={colors.dark[50]} />
              <Text className="text-dark-50 font-bold text-sm">
                {terminal.name || 'Terminal'}
              </Text>
            </View>
            <Text className="text-dark-300 text-[10px] font-mono">
              {terminal.cwd}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-2">
          {/* Status Badge */}
          <View
            className="px-2 py-1 rounded flex-row items-center gap-1.5"
            style={{ backgroundColor: themeColors.borderLight, borderWidth: 1, borderColor: colors.dark[500] }}
          >
            <View
              className={`w-1.5 h-1.5 rounded-full ${
                isIdle ? 'bg-dark-300' : 'bg-success-500'
              }`}
            />
            <Text className={`text-[10px] font-bold uppercase tracking-wider ${
              isIdle ? 'text-dark-300' : 'text-success-500'
            }`}>
              {isIdle ? 'Idle' : 'Running'}
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleClear}
            className="p-2 rounded-lg"
          >
            <MoreVertical size={16} color={colors.dark[300]} />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 30}
      >
        {/* Terminal Output - Black background */}
        <ScrollView
          ref={scrollViewRef}
          className="flex-1 p-4"
          style={{ backgroundColor: themeColors.terminalBg }}
          contentContainerStyle={{ paddingBottom: 16 }}
        >
          {/* Welcome message */}
          {terminal.output.length === 0 && (
            <Text className="text-dark-300 text-xs opacity-50 mb-4">
              Last login: {new Date().toLocaleString()}
            </Text>
          )}

          {terminal.output.map((line, index) => (
            <View key={line.id} className="mb-0.5">
              {line.type === 'input' ? (
                <Text className="font-mono text-xs">
                  <Text style={{ color: colors.success[500] }}>➜ </Text>
                  <Text style={{ color: colors.primary[500] }}>{terminal.cwd} </Text>
                  <Text style={{ color: colors.dark[50] }}>{line.content}</Text>
                </Text>
              ) : (
                <Text
                  className="font-mono text-xs leading-4"
                  style={{ color: getLineColor(line.type) }}
                  selectable
                >
                  {line.content}
                </Text>
              )}
            </View>
          ))}

          {/* Cursor line when idle */}
          {terminal.output.length > 0 && isIdle && (
            <View className="flex-row items-center mt-1 border-t pt-2" style={{ borderColor: themeColors.borderLight }}>
              <Text className="font-mono text-xs" style={{ color: colors.success[500] }}>➜ </Text>
              <Text className="font-mono text-xs" style={{ color: colors.primary[500] }}>{terminal.cwd} </Text>
              <Text className="font-mono text-xs" style={{ color: colors.dark[300] }}>git:(main) </Text>
              <View className="w-2 h-3.5 bg-dark-50" />
            </View>
          )}
        </ScrollView>

        {/* Keyboard Toolbar - shown when input is focused */}
        {showKeyboardToolbar && (
          <View
            className="border-b p-2"
            style={{ backgroundColor: colors.dark[700], borderColor: themeColors.border }}
          >
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row items-center gap-1">
                {/* Ctrl+C */}
                <TouchableOpacity
                  onPress={() => sendControlSequence('c')}
                  className="rounded-lg border items-center justify-center"
                  style={{
                    width: 48,
                    height: 48,
                    borderColor: themeColors.border,
                    backgroundColor: colors.dark[800],
                  }}
                >
                  <Text className="text-dark-300 text-[9px]">Ctrl</Text>
                  <Text className="text-dark-50 font-bold text-xs">C</Text>
                </TouchableOpacity>

                {/* Ctrl+D */}
                <TouchableOpacity
                  onPress={() => sendControlSequence('d')}
                  className="rounded-lg border items-center justify-center"
                  style={{
                    width: 48,
                    height: 48,
                    borderColor: themeColors.border,
                    backgroundColor: colors.dark[800],
                  }}
                >
                  <Text className="text-dark-300 text-[9px]">Ctrl</Text>
                  <Text className="text-dark-50 font-bold text-xs">D</Text>
                </TouchableOpacity>

                {/* Tab */}
                <TouchableOpacity
                  onPress={() => sendControlSequence('tab')}
                  className="rounded-lg border items-center justify-center mr-2"
                  style={{
                    width: 48,
                    height: 48,
                    borderColor: themeColors.border,
                    backgroundColor: colors.dark[800],
                  }}
                >
                  <Text className="text-dark-50 font-bold text-xs">Tab</Text>
                </TouchableOpacity>

                {/* Separator */}
                <View className="w-px h-12 mx-1" style={{ backgroundColor: themeColors.border }} />

                {/* Arrow keys */}
                <View className="items-center mr-2">
                  <TouchableOpacity
                    onPress={() => sendControlSequence('up')}
                    className="rounded-lg border items-center justify-center"
                    style={{
                      width: 40,
                      height: 40,
                      borderColor: themeColors.border,
                      backgroundColor: colors.dark[800],
                    }}
                  >
                    <ChevronUp size={16} color={colors.dark[50]} />
                  </TouchableOpacity>
                  <View className="flex-row gap-1 mt-1">
                    <TouchableOpacity
                      onPress={() => sendControlSequence('left')}
                      className="rounded-lg border items-center justify-center"
                      style={{
                        width: 40,
                        height: 40,
                        borderColor: themeColors.border,
                        backgroundColor: colors.dark[800],
                      }}
                    >
                      <ChevronLeft size={16} color={colors.dark[50]} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => sendControlSequence('down')}
                      className="rounded-lg border items-center justify-center"
                      style={{
                        width: 40,
                        height: 40,
                        borderColor: themeColors.border,
                        backgroundColor: colors.dark[800],
                      }}
                    >
                      <ChevronDown size={16} color={colors.dark[50]} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => sendControlSequence('right')}
                      className="rounded-lg border items-center justify-center"
                      style={{
                        width: 40,
                        height: 40,
                        borderColor: themeColors.border,
                        backgroundColor: colors.dark[800],
                      }}
                    >
                      <ChevronRight size={16} color={colors.dark[50]} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Separator */}
                <View className="w-px h-12 mx-1" style={{ backgroundColor: themeColors.border }} />

                {/* Copy/Paste with violet highlight */}
                <TouchableOpacity
                  onPress={handleCopy}
                  className="rounded-lg border items-center justify-center"
                  style={{
                    width: 48,
                    height: 48,
                    borderColor: themeColors.primaryGlow,
                    backgroundColor: themeColors.primaryBg,
                    shadowColor: colors.primary[500],
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.1,
                    shadowRadius: 10,
                  }}
                >
                  <Text className="text-primary-500 text-[9px]">Copy</Text>
                  <Copy size={16} color={colors.primary[500]} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handlePaste}
                  className="rounded-lg border items-center justify-center"
                  style={{
                    width: 48,
                    height: 48,
                    borderColor: themeColors.primaryGlow,
                    backgroundColor: themeColors.primaryBg,
                    shadowColor: colors.primary[500],
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.1,
                    shadowRadius: 10,
                  }}
                >
                  <Text className="text-primary-500 text-[9px]">Paste</Text>
                  <Clipboard size={16} color={colors.primary[500]} />
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        )}

        {/* Input Area */}
        <View
          className="border-t pt-3 px-3"
          style={{
            backgroundColor: colors.dark[700],
            borderColor: colors.dark[500],
            paddingBottom: showKeyboardToolbar ? 12 : 32,
          }}
        >
          {/* Quick Command Buttons */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-2 pb-3"
          >
            <View className="flex-row gap-2">
              {QUICK_COMMANDS.map((cmd) => (
                <TouchableOpacity
                  key={cmd}
                  onPress={() => handleQuickCommand(cmd)}
                  className="px-3 py-1.5 rounded border"
                  style={{
                    backgroundColor: colors.dark[800],
                    borderColor: colors.dark[500],
                  }}
                >
                  <Text className="text-dark-50 text-xs font-mono">{cmd}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Command Input */}
          <View className="relative">
            <View
              className="flex-row items-center rounded-lg border overflow-hidden"
              style={{
                backgroundColor: colors.dark[800],
                borderColor: colors.dark[500],
              }}
            >
              {/* Terminal icon */}
              <View className="pl-3 pr-2">
                <TerminalIcon size={16} color={colors.dark[400]} />
              </View>

              {/* Input field */}
              <TextInput
                ref={inputRef}
                className="flex-1 py-3.5 pr-24 text-dark-50 font-mono text-sm"
                placeholder="Enter command..."
                placeholderTextColor={colors.dark[400]}
                value={inputCommand}
                onChangeText={setInputCommand}
                onSubmitEditing={handleSendCommand}
                returnKeyType="send"
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
              />

              {/* Action buttons */}
              <View className="absolute right-2 flex-row items-center gap-1">
                {/* Clear button */}
                <TouchableOpacity
                  onPress={handleClear}
                  className="p-1.5 rounded"
                >
                  <Trash2 size={16} color={colors.dark[400]} />
                </TouchableOpacity>

                {/* Send button */}
                <TouchableOpacity
                  onPress={handleSendCommand}
                  className="p-1.5 rounded"
                  style={{ backgroundColor: colors.primary[500] }}
                  disabled={!inputCommand.trim()}
                >
                  <Send size={16} color="#000" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
