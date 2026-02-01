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
import { useTheme } from '@/theme/ThemeProvider';
import { colors } from '@/theme/colors';
import { LinearGradient } from 'expo-linear-gradient';

// Helper function to convert hex to rgba
const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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
  const { theme } = useTheme();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const [inputCommand, setInputCommand] = useState('');
  const [showKeyboardToolbar, setShowKeyboardToolbar] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Theme-aware color helpers
  const themeColors = {
    border: hexToRgba(theme.border, 0.6),
    borderLight: hexToRgba(theme.border, 0.3),
    terminalBg: colors.dark[950],
    primaryGlow: hexToRgba(theme.primary, 0.3),
    primaryBg: hexToRgba(theme.primary, 0.1),
  };

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
        return theme.success; // Green for input prompt
      case 'error':
        return theme.error;
      default:
        return theme.text;
    }
  };

  if (!terminal) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 32, alignItems: 'center', marginHorizontal: 16 }}>
          <TerminalIcon size={48} color={theme.textTertiary} />
          <Text style={{ color: theme.textSecondary, marginTop: 16, textAlign: 'center' }}>Terminal not found</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginTop: 16, backgroundColor: theme.backgroundTertiary, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 9999 }}
          >
            <Text style={{ color: theme.text, fontWeight: '500' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Determine terminal status
  const isIdle = terminal.output.length === 0 ||
    terminal.output[terminal.output.length - 1]?.type !== 'output';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={{ backgroundColor: theme.backgroundSecondary, borderBottomWidth: 1, borderBottomColor: theme.border, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={20} color={theme.textSecondary} />
          </TouchableOpacity>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TerminalIcon size={16} color={theme.text} />
              <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 14 }}>
                {terminal.name || 'Terminal'}
              </Text>
            </View>
            <Text style={{ color: theme.textTertiary, fontSize: 10, fontFamily: 'monospace' }}>
              {terminal.cwd}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {/* Status Badge */}
          <View
            style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: themeColors.borderLight, borderWidth: 1, borderColor: theme.border }}
          >
            <View
              style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: isIdle ? theme.textTertiary : theme.success }}
            />
            <Text style={{ fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5, color: isIdle ? theme.textTertiary : theme.success }}>
              {isIdle ? 'Idle' : 'Running'}
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleClear}
            style={{ padding: 8, borderRadius: 8 }}
          >
            <MoreVertical size={16} color={theme.textTertiary} />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 30}
      >
        {/* Terminal Output - Black background */}
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1, padding: 16, backgroundColor: themeColors.terminalBg }}
          contentContainerStyle={{ paddingBottom: 16 }}
        >
          {/* Welcome message */}
          {terminal.output.length === 0 && (
            <Text style={{ color: theme.textTertiary, fontSize: 12, opacity: 0.5, marginBottom: 16 }}>
              Last login: {new Date().toLocaleString()}
            </Text>
          )}

          {terminal.output.map((line, index) => (
            <View key={line.id} style={{ marginBottom: 2 }}>
              {line.type === 'input' ? (
                <Text style={{ fontFamily: 'monospace', fontSize: 12 }}>
                  <Text style={{ color: theme.success }}>{'>'} </Text>
                  <Text style={{ color: theme.primary }}>{terminal.cwd} </Text>
                  <Text style={{ color: theme.text }}>{line.content}</Text>
                </Text>
              ) : (
                <Text
                  style={{ fontFamily: 'monospace', fontSize: 12, lineHeight: 16, color: getLineColor(line.type) }}
                  selectable
                >
                  {line.content}
                </Text>
              )}
            </View>
          ))}

          {/* Cursor line when idle */}
          {terminal.output.length > 0 && isIdle && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, borderTopWidth: 1, paddingTop: 8, borderColor: themeColors.borderLight }}>
              <Text style={{ fontFamily: 'monospace', fontSize: 12, color: theme.success }}>{'>'} </Text>
              <Text style={{ fontFamily: 'monospace', fontSize: 12, color: theme.primary }}>{terminal.cwd} </Text>
              <Text style={{ fontFamily: 'monospace', fontSize: 12, color: theme.textTertiary }}>git:(main) </Text>
              <View style={{ width: 8, height: 14, backgroundColor: theme.text }} />
            </View>
          )}
        </ScrollView>

        {/* Keyboard Toolbar - shown when input is focused */}
        {showKeyboardToolbar && (
          <View
            style={{ borderBottomWidth: 1, padding: 8, backgroundColor: theme.backgroundSecondary, borderColor: themeColors.border }}
          >
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                {/* Ctrl+C */}
                <TouchableOpacity
                  onPress={() => sendControlSequence('c')}
                  style={{
                    borderRadius: 8,
                    borderWidth: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 48,
                    height: 48,
                    borderColor: themeColors.border,
                    backgroundColor: theme.background,
                  }}
                >
                  <Text style={{ color: theme.textTertiary, fontSize: 9 }}>Ctrl</Text>
                  <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 12 }}>C</Text>
                </TouchableOpacity>

                {/* Ctrl+D */}
                <TouchableOpacity
                  onPress={() => sendControlSequence('d')}
                  style={{
                    borderRadius: 8,
                    borderWidth: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 48,
                    height: 48,
                    borderColor: themeColors.border,
                    backgroundColor: theme.background,
                  }}
                >
                  <Text style={{ color: theme.textTertiary, fontSize: 9 }}>Ctrl</Text>
                  <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 12 }}>D</Text>
                </TouchableOpacity>

                {/* Tab */}
                <TouchableOpacity
                  onPress={() => sendControlSequence('tab')}
                  style={{
                    borderRadius: 8,
                    borderWidth: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 8,
                    width: 48,
                    height: 48,
                    borderColor: themeColors.border,
                    backgroundColor: theme.background,
                  }}
                >
                  <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 12 }}>Tab</Text>
                </TouchableOpacity>

                {/* Separator */}
                <View style={{ width: 1, height: 48, marginHorizontal: 4, backgroundColor: themeColors.border }} />

                {/* Arrow keys */}
                <View style={{ alignItems: 'center', marginRight: 8 }}>
                  <TouchableOpacity
                    onPress={() => sendControlSequence('up')}
                    style={{
                      borderRadius: 8,
                      borderWidth: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 40,
                      height: 40,
                      borderColor: themeColors.border,
                      backgroundColor: theme.background,
                    }}
                  >
                    <ChevronUp size={16} color={theme.text} />
                  </TouchableOpacity>
                  <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
                    <TouchableOpacity
                      onPress={() => sendControlSequence('left')}
                      style={{
                        borderRadius: 8,
                        borderWidth: 1,
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 40,
                        height: 40,
                        borderColor: themeColors.border,
                        backgroundColor: theme.background,
                      }}
                    >
                      <ChevronLeft size={16} color={theme.text} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => sendControlSequence('down')}
                      style={{
                        borderRadius: 8,
                        borderWidth: 1,
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 40,
                        height: 40,
                        borderColor: themeColors.border,
                        backgroundColor: theme.background,
                      }}
                    >
                      <ChevronDown size={16} color={theme.text} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => sendControlSequence('right')}
                      style={{
                        borderRadius: 8,
                        borderWidth: 1,
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 40,
                        height: 40,
                        borderColor: themeColors.border,
                        backgroundColor: theme.background,
                      }}
                    >
                      <ChevronRight size={16} color={theme.text} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Separator */}
                <View style={{ width: 1, height: 48, marginHorizontal: 4, backgroundColor: themeColors.border }} />

                {/* Copy/Paste with violet highlight */}
                <TouchableOpacity
                  onPress={handleCopy}
                  style={{
                    borderRadius: 8,
                    borderWidth: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 48,
                    height: 48,
                    borderColor: themeColors.primaryGlow,
                    backgroundColor: themeColors.primaryBg,
                    shadowColor: theme.primary,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.1,
                    shadowRadius: 10,
                  }}
                >
                  <Text style={{ color: theme.primary, fontSize: 9 }}>Copy</Text>
                  <Copy size={16} color={theme.primary} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handlePaste}
                  style={{
                    borderRadius: 8,
                    borderWidth: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 48,
                    height: 48,
                    borderColor: themeColors.primaryGlow,
                    backgroundColor: themeColors.primaryBg,
                    shadowColor: theme.primary,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.1,
                    shadowRadius: 10,
                  }}
                >
                  <Text style={{ color: theme.primary, fontSize: 9 }}>Paste</Text>
                  <Clipboard size={16} color={theme.primary} />
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        )}

        {/* Input Area */}
        <View
          style={{
            borderTopWidth: 1,
            paddingTop: 12,
            paddingHorizontal: 12,
            backgroundColor: theme.backgroundSecondary,
            borderColor: theme.border,
            paddingBottom: showKeyboardToolbar ? 12 : 32,
          }}
        >
          {/* Quick Command Buttons */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 8, paddingBottom: 12 }}
          >
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {QUICK_COMMANDS.map((cmd) => (
                <TouchableOpacity
                  key={cmd}
                  onPress={() => handleQuickCommand(cmd)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 4,
                    borderWidth: 1,
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                  }}
                >
                  <Text style={{ color: theme.text, fontSize: 12, fontFamily: 'monospace' }}>{cmd}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Command Input */}
          <View style={{ position: 'relative' }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                borderRadius: 8,
                borderWidth: 1,
                overflow: 'hidden',
                backgroundColor: theme.background,
                borderColor: theme.border,
              }}
            >
              {/* Terminal icon */}
              <View style={{ paddingLeft: 12, paddingRight: 8 }}>
                <TerminalIcon size={16} color={theme.textTertiary} />
              </View>

              {/* Input field */}
              <TextInput
                ref={inputRef}
                style={{ flex: 1, paddingVertical: 14, paddingRight: 96, color: theme.text, fontFamily: 'monospace', fontSize: 14 }}
                placeholder="Enter command..."
                placeholderTextColor={theme.textTertiary}
                value={inputCommand}
                onChangeText={setInputCommand}
                onSubmitEditing={handleSendCommand}
                returnKeyType="send"
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
              />

              {/* Action buttons */}
              <View style={{ position: 'absolute', right: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                {/* Clear button */}
                <TouchableOpacity
                  onPress={handleClear}
                  style={{ padding: 6, borderRadius: 4 }}
                >
                  <Trash2 size={16} color={theme.textTertiary} />
                </TouchableOpacity>

                {/* Send button */}
                <TouchableOpacity
                  onPress={handleSendCommand}
                  style={{ padding: 6, borderRadius: 4, backgroundColor: theme.primary }}
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
