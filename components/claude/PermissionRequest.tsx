/**
 * PermissionRequest - Mobile permission approval UI
 *
 * Shows a modal when Claude requests permission to use a tool.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Switch,
} from 'react-native';
import { AlertTriangle, Check, X, Terminal, FileText, Edit3 } from 'lucide-react-native';
import { colors } from '@/theme/colors';

export type PermissionType = 'tool_use' | 'file_write' | 'bash_command' | 'file_read';

export interface PermissionRequestData {
  requestId: string;
  type: PermissionType;
  toolName?: string;
  description: string;
  details?: any;
}

interface PermissionRequestProps {
  visible: boolean;
  request: PermissionRequestData | null;
  onApprove: (requestId: string, remember: boolean) => void;
  onDeny: (requestId: string, remember: boolean) => void;
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
      <View className="flex-1 justify-center items-center bg-black/80 px-6">
        <View className="bg-dark-800 rounded-2xl w-full max-w-md overflow-hidden">
          {/* Header */}
          <View className="bg-dark-700 px-6 py-4 flex-row items-center">
            {getIcon(request.type, request.toolName)}
            <View className="ml-4 flex-1">
              <Text className="text-dark-100 font-bold text-lg">
                Permission Required
              </Text>
              <Text className="text-dark-400 text-sm">
                {getTypeLabel(request.type)}
              </Text>
            </View>
          </View>

          {/* Content */}
          <View className="px-6 py-4">
            {request.toolName && (
              <View className="mb-3">
                <Text className="text-dark-400 text-xs uppercase tracking-wide mb-1">
                  Tool
                </Text>
                <Text className="text-dark-100 font-mono text-sm">
                  {request.toolName}
                </Text>
              </View>
            )}

            <View className="mb-4">
              <Text className="text-dark-400 text-xs uppercase tracking-wide mb-1">
                Description
              </Text>
              <Text className="text-dark-200 text-sm leading-5">
                {request.description}
              </Text>
            </View>

            {request.details && (
              <View className="bg-dark-900 rounded-lg p-3 mb-4">
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
            <View className="flex-row items-center justify-between py-2">
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

          {/* Actions */}
          <View className="flex-row border-t border-dark-600">
            <TouchableOpacity
              onPress={handleDeny}
              className="flex-1 py-4 flex-row items-center justify-center border-r border-dark-600"
            >
              <X size={20} color={colors.error[400]} />
              <Text className="text-error-400 font-semibold ml-2">Deny</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleApprove}
              className="flex-1 py-4 flex-row items-center justify-center bg-primary-600/20"
            >
              <Check size={20} color={colors.primary[400]} />
              <Text className="text-primary-400 font-semibold ml-2">Allow</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
