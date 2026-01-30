/**
 * PermissionRequest - Mobile permission approval UI
 *
 * Shows a modal when Claude requests permission to use a tool.
 * Also supports Claude approval requests (yes/no/plan prompts).
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Switch,
  ScrollView,
} from 'react-native';
import { AlertTriangle, Check, X, Terminal, FileText, Edit3, HelpCircle, FilePlus, Search } from 'lucide-react-native';
import { colors } from '@/theme/colors';

export type PermissionType = 'tool_use' | 'file_write' | 'bash_command' | 'file_read';

export interface PermissionRequestData {
  requestId: string;
  type: PermissionType;
  toolName?: string;
  description: string;
  details?: any;
}

// Claude approval request (yes/no/plan prompts from CLI)
export interface ClaudeApprovalRequestData {
  approvalId: string;
  terminalSessionId: string;
  sessionKey?: string;
  deviceId?: string;
  context: string[];       // Recent output lines for context
  options: string[];       // Available options (e.g., ['y:yes', 'n:no', 'p:plan'])
  promptText: string;      // The actual prompt text
}

// Helper to parse and format approval request data
interface FormattedApproval {
  title: string;
  description: string;
  toolName?: string;
  filePath?: string;
  command?: string;
  content?: string;
  icon: 'file' | 'terminal' | 'edit' | 'search' | 'default';
}

function formatApprovalRequest(request: ClaudeApprovalRequestData): FormattedApproval {
  const { promptText, context } = request;

  // Extract tool name from promptText like "Claude is using: Write" or "Claude wants to use: Bash"
  const toolMatch = promptText.match(/Claude (?:is using|wants to use):?\s*(\w+)/i);
  const toolName = toolMatch?.[1] || '';

  // Parse context for file paths, commands, and content
  let filePath = '';
  let command = '';
  let content = '';

  for (const line of context) {
    // Skip JSON lines
    if (line.trim().startsWith('{') || line.trim().startsWith('[')) continue;

    // Extract file path
    const fileMatch = line.match(/File:\s*(.+)/i);
    if (fileMatch) {
      filePath = fileMatch[1].trim();
      continue;
    }

    // Extract command
    const cmdMatch = line.match(/Command:\s*(.+)/i);
    if (cmdMatch) {
      command = cmdMatch[1].trim();
      continue;
    }

    // Extract pattern (for search tools)
    const patternMatch = line.match(/Pattern:\s*(.+)/i);
    if (patternMatch) {
      content = patternMatch[1].trim();
      continue;
    }
  }

  // Determine icon based on tool
  let icon: FormattedApproval['icon'] = 'default';
  const lowerTool = toolName.toLowerCase();
  if (lowerTool.includes('write') || lowerTool.includes('notebookedit')) {
    icon = 'file';
  } else if (lowerTool.includes('bash')) {
    icon = 'terminal';
  } else if (lowerTool.includes('edit')) {
    icon = 'edit';
  } else if (lowerTool.includes('grep') || lowerTool.includes('glob') || lowerTool.includes('read')) {
    icon = 'search';
  }

  // Generate human-readable title and description
  let title = '';
  let description = '';

  switch (lowerTool) {
    case 'write':
      title = 'Create File';
      description = filePath ? `Create new file at:\n${getShortPath(filePath)}` : 'Create a new file';
      break;
    case 'edit':
      title = 'Edit File';
      description = filePath ? `Modify file:\n${getShortPath(filePath)}` : 'Edit an existing file';
      break;
    case 'bash':
      title = 'Run Command';
      description = command ? `Execute:\n${command.substring(0, 100)}${command.length > 100 ? '...' : ''}` : 'Run a terminal command';
      break;
    case 'read':
      title = 'Read File';
      description = filePath ? `Read file:\n${getShortPath(filePath)}` : 'Read a file';
      break;
    case 'grep':
      title = 'Search Content';
      description = content ? `Search for:\n${content}` : 'Search file contents';
      break;
    case 'glob':
      title = 'Find Files';
      description = content ? `Pattern:\n${content}` : 'Find files by pattern';
      break;
    default:
      title = toolName ? `Use ${toolName}` : 'Tool Request';
      description = promptText;
  }

  return {
    title,
    description,
    toolName,
    filePath,
    command,
    content,
    icon,
  };
}

// Get shortened path showing last 2-3 parts
function getShortPath(fullPath: string): string {
  const parts = fullPath.split(/[/\\]/);
  if (parts.length <= 3) return fullPath;
  return '...' + parts.slice(-3).join('/');
}

interface PermissionRequestProps {
  visible: boolean;
  request: PermissionRequestData | null;
  onApprove: (requestId: string, remember: boolean) => void;
  onDeny: (requestId: string, remember: boolean) => void;
}

// Props for Claude approval requests
interface ClaudeApprovalProps {
  visible: boolean;
  request: ClaudeApprovalRequestData | null;
  onRespond: (approvalId: string, response: string) => void;
  onDismiss: () => void;
}

const getIcon = (type: PermissionType, toolName?: string) => {
  if (toolName?.toLowerCase().includes('bash') || type === 'bash_command') {
    return <Terminal size={32} color={colors.warning[400]} />;
  }
  if (type === 'file_write' || toolName?.toLowerCase().includes('write') || toolName?.toLowerCase().includes('edit')) {
    return <Edit3 size={32} color={colors.warning[400]} />;
  }
  if (type === 'file_read' || toolName?.toLowerCase().includes('read')) {
    return <FileText size={32} color={colors.primary[400]} />;
  }
  return <AlertTriangle size={32} color={colors.warning[400]} />;
};

const getTypeLabel = (type: PermissionType): string => {
  switch (type) {
    case 'bash_command':
      return 'Execute Command';
    case 'file_write':
      return 'Write File';
    case 'file_read':
      return 'Read File';
    case 'tool_use':
    default:
      return 'Use Tool';
  }
};

export default function PermissionRequest({
  visible,
  request,
  onApprove,
  onDeny,
}: PermissionRequestProps) {
  const [rememberChoice, setRememberChoice] = useState(false);

  if (!request) return null;

  const handleApprove = () => {
    onApprove(request.requestId, rememberChoice);
    setRememberChoice(false);
  };

  const handleDeny = () => {
    onDeny(request.requestId, rememberChoice);
    setRememberChoice(false);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDeny}
    >
      <View className="flex-1 justify-center items-center bg-black/60 px-4">
        <View
          className="w-full max-w-sm overflow-hidden"
          style={{
            backgroundColor: colors.dark[800],
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.dark[600],
          }}
        >
          {/* macOS-style title bar */}
          <View
            className="flex-row items-center px-3 py-2.5"
            style={{
              backgroundColor: colors.dark[700],
              borderBottomWidth: 1,
              borderBottomColor: colors.dark[600],
              gap: 6,
            }}
          >
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.error[400] }} />
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.warning[300] }} />
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success[300] }} />
            <Text style={{ fontSize: 12, color: colors.dark[300], fontFamily: 'monospace', marginLeft: 8 }}>
              permission-request
            </Text>
          </View>

          {/* Header with icon */}
          <View className="px-5 pt-5 items-center">
            <View
              className="w-14 h-14 rounded-full items-center justify-center mb-4"
              style={{
                backgroundColor: colors.dark[700],
                borderWidth: 2,
                borderColor: colors.warning[500],
              }}
            >
              {getIcon(request.type, request.toolName)}
            </View>
            <Text className="text-dark-50 text-lg font-bold text-center mb-1">
              Permission Required
            </Text>
            <Text className="text-dark-400 text-sm mb-3">
              {getTypeLabel(request.type)}
            </Text>
          </View>

          {/* Content */}
          <View className="px-5">
            {request.toolName && (
              <View className="mb-3">
                <Text className="text-dark-400 text-xs uppercase tracking-wide mb-1.5 text-center">
                  Tool
                </Text>
                <View
                  className="p-2.5"
                  style={{
                    backgroundColor: colors.dark[700],
                    borderRadius: 6,
                  }}
                >
                  <Text className="text-dark-100 font-mono text-sm text-center">
                    {request.toolName}
                  </Text>
                </View>
              </View>
            )}

            <View className="mb-4">
              <Text className="text-dark-400 text-xs uppercase tracking-wide mb-1.5 text-center">
                Description
              </Text>
              <View
                className="p-3"
                style={{
                  backgroundColor: colors.dark[700],
                  borderRadius: 6,
                }}
              >
                <Text className="text-dark-200 text-sm leading-5 text-center">
                  {request.description}
                </Text>
              </View>
            </View>

            {request.details && (
              <View
                className="p-3 mb-4"
                style={{
                  backgroundColor: colors.dark[900],
                  borderRadius: 6,
                }}
              >
                <Text className="text-dark-400 text-xs uppercase tracking-wide mb-2">
                  Details
                </Text>
                <Text className="text-dark-300 font-mono text-xs" numberOfLines={10}>
                  {typeof request.details === 'string'
                    ? request.details
                    : JSON.stringify(request.details, null, 2)}
                </Text>
              </View>
            )}

            {/* Remember choice */}
            <View className="flex-row items-center justify-between py-3 mb-2">
              <Text className="text-dark-300 text-sm">
                Remember this choice
              </Text>
              <Switch
                value={rememberChoice}
                onValueChange={setRememberChoice}
                trackColor={{ false: colors.dark[600], true: colors.primary[600] }}
                thumbColor={rememberChoice ? colors.primary[400] : colors.dark[400]}
              />
            </View>
          </View>

          {/* Action Buttons */}
          <View className="px-5 pb-5 flex-row gap-2.5">
            <TouchableOpacity
              onPress={handleDeny}
              className="flex-1 py-3 rounded-lg flex-row items-center justify-center"
              style={{
                backgroundColor: colors.dark[600],
                borderWidth: 1,
                borderColor: colors.dark[500],
              }}
            >
              <X size={18} color={colors.dark[200]} />
              <Text className="text-dark-200 font-semibold ml-2">Deny</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleApprove}
              className="flex-1 py-3 rounded-lg flex-row items-center justify-center"
              style={{ backgroundColor: colors.primary[600] }}
            >
              <Check size={18} color="#fff" />
              <Text className="text-white font-semibold ml-2">Allow</Text>
            </TouchableOpacity>
          </View>

          {/* Bottom accent bar */}
          <View style={{ height: 3, backgroundColor: colors.warning[500] }} />
        </View>
      </View>
    </Modal>
  );
}

// Parse option string like 'y:yes' into key and label
function parseOption(option: string): { key: string; label: string } {
  const [key, label] = option.split(':');
  return { key, label: label || key };
}

// Get color for option button based on the key
function getOptionColor(key: string): { bg: string; text: string; border: string } {
  switch (key.toLowerCase()) {
    case 'y':
      return {
        bg: 'bg-primary-600/20',
        text: 'text-primary-400',
        border: 'border-primary-600',
      };
    case 'n':
      return {
        bg: 'bg-error-600/20',
        text: 'text-error-400',
        border: 'border-error-600',
      };
    case 'p':
      return {
        bg: 'bg-warning-600/20',
        text: 'text-warning-400',
        border: 'border-warning-600',
      };
    default:
      return {
        bg: 'bg-dark-600/20',
        text: 'text-dark-200',
        border: 'border-dark-600',
      };
  }
}

// Get icon component based on formatted approval type
function getApprovalIcon(iconType: FormattedApproval['icon']) {
  switch (iconType) {
    case 'file':
      return <FilePlus size={32} color={colors.primary[400]} />;
    case 'terminal':
      return <Terminal size={32} color={colors.warning[400]} />;
    case 'edit':
      return <Edit3 size={32} color={colors.primary[400]} />;
    case 'search':
      return <Search size={32} color={colors.dark[300]} />;
    default:
      return <HelpCircle size={32} color={colors.warning[400]} />;
  }
}

/**
 * ClaudeApproval - Claude approval request UI with macOS styling
 *
 * Shows a modal when Claude needs user input (yes/no/plan).
 * Uses macOS-style title bar with traffic light buttons.
 */
export function ClaudeApproval({
  visible,
  request,
  onRespond,
  onDismiss,
}: ClaudeApprovalProps) {
  if (!request) return null;

  const formatted = formatApprovalRequest(request);
  const parsedOptions = request.options.map(parseOption);

  const handleRespond = (key: string) => {
    onRespond(request.approvalId, key);
  };

  // Determine accent color based on tool type
  const getAccentColor = () => {
    switch (formatted.icon) {
      case 'terminal':
        return colors.warning[500];
      case 'file':
      case 'edit':
        return colors.primary[500];
      case 'search':
        return colors.dark[400];
      default:
        return colors.warning[500];
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View className="flex-1 justify-center items-center bg-black/60 px-4">
        <View
          className="w-full max-w-sm overflow-hidden"
          style={{
            backgroundColor: colors.dark[800],
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.dark[600],
          }}
        >
          {/* macOS-style title bar */}
          <View
            className="flex-row items-center px-3 py-2.5"
            style={{
              backgroundColor: colors.dark[700],
              borderBottomWidth: 1,
              borderBottomColor: colors.dark[600],
              gap: 6,
            }}
          >
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.error[400] }} />
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.warning[300] }} />
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success[300] }} />
            <Text style={{ fontSize: 12, color: colors.dark[300], fontFamily: 'monospace', marginLeft: 8 }}>
              claude-approval
            </Text>
          </View>

          {/* Header with icon */}
          <View className="px-5 pt-5 items-center">
            <View
              className="w-14 h-14 rounded-full items-center justify-center mb-4"
              style={{
                backgroundColor: colors.dark[700],
                borderWidth: 2,
                borderColor: getAccentColor(),
              }}
            >
              {getApprovalIcon(formatted.icon)}
            </View>
            <Text className="text-dark-50 text-lg font-bold text-center mb-1">
              {formatted.title}
            </Text>
            {formatted.toolName && (
              <Text className="text-dark-400 text-sm mb-3">
                Tool: {formatted.toolName}
              </Text>
            )}
          </View>

          {/* Content */}
          <ScrollView className="px-5 max-h-48">
            {/* Main description */}
            <View
              className="p-3 mb-3"
              style={{
                backgroundColor: colors.dark[700],
                borderRadius: 8,
              }}
            >
              <Text className="text-dark-200 text-sm leading-5 text-center">
                {formatted.description}
              </Text>
            </View>

            {/* File path if available */}
            {formatted.filePath && (
              <View className="mb-3">
                <Text className="text-dark-400 text-xs uppercase tracking-wide mb-1.5 text-center">
                  Path
                </Text>
                <View
                  className="p-2.5"
                  style={{
                    backgroundColor: colors.dark[900],
                    borderRadius: 6,
                  }}
                >
                  <Text className="text-dark-300 font-mono text-xs text-center" numberOfLines={2}>
                    {formatted.filePath}
                  </Text>
                </View>
              </View>
            )}

            {/* Command if available (for Bash) */}
            {formatted.command && formatted.command.length > 100 && (
              <View className="mb-3">
                <Text className="text-dark-400 text-xs uppercase tracking-wide mb-1.5 text-center">
                  Command
                </Text>
                <View
                  className="p-2.5"
                  style={{
                    backgroundColor: colors.dark[900],
                    borderRadius: 6,
                  }}
                >
                  <Text className="text-dark-300 font-mono text-xs">
                    {formatted.command}
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Action Buttons */}
          <View className="px-5 py-5">
            <View className="flex-row justify-center gap-2.5">
              {parsedOptions.map((option) => {
                const optionColor = getOptionColor(option.key);
                const isYes = option.key.toLowerCase() === 'y';
                const isNo = option.key.toLowerCase() === 'n';

                return (
                  <TouchableOpacity
                    key={option.key}
                    onPress={() => handleRespond(option.key)}
                    className="flex-1 py-3 rounded-lg items-center"
                    style={{
                      backgroundColor: isYes ? colors.primary[600] : isNo ? colors.dark[600] : colors.warning[600],
                      borderWidth: isNo ? 1 : 0,
                      borderColor: colors.dark[500],
                      maxWidth: 100,
                    }}
                  >
                    <Text
                      className="font-bold text-sm uppercase"
                      style={{ color: isNo ? colors.dark[200] : '#fff' }}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Dismiss text */}
            <TouchableOpacity
              onPress={onDismiss}
              className="mt-3 py-2 items-center"
            >
              <Text className="text-dark-500 text-xs">Tap outside to dismiss</Text>
            </TouchableOpacity>
          </View>

          {/* Bottom accent bar */}
          <View style={{ height: 3, backgroundColor: getAccentColor() }} />
        </View>
      </View>
    </Modal>
  );
}
