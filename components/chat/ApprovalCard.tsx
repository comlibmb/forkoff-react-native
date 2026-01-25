import React from 'react';
import { View, Text } from 'react-native';
import { AlertTriangle, Check, X, FileCode, Terminal, FilePlus, Trash2 } from 'lucide-react-native';
import { Card, Button } from '@/components/ui';
import { ApprovalRequest } from '@/types';
import { colors } from '@/theme/colors';

interface ApprovalCardProps {
  approval: ApprovalRequest;
  onApprove: () => void;
  onReject: () => void;
  isLoading?: boolean;
}

const typeIcons = {
  file_change: FileCode,
  command_execution: Terminal,
  file_creation: FilePlus,
  file_deletion: Trash2,
};

const typeLabels = {
  file_change: 'File Change',
  command_execution: 'Command Execution',
  file_creation: 'File Creation',
  file_deletion: 'File Deletion',
};

export function ApprovalCard({
  approval,
  onApprove,
  onReject,
  isLoading = false,
}: ApprovalCardProps) {
  const Icon = typeIcons[approval.type] || AlertTriangle;
  const typeLabel = typeLabels[approval.type] || 'Action';

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card
      padding="md"
      style={{
        borderWidth: 1,
        borderColor: colors.warning[500],
        backgroundColor: colors.warning[500] + '10',
      }}
    >
      {/* Header */}
      <View className="flex-row items-center mb-3">
        <View className="w-10 h-10 bg-warning-500/20 rounded-lg items-center justify-center mr-3">
          <Icon size={20} color={colors.warning[500]} />
        </View>
        <View className="flex-1">
          <Text className="text-white font-semibold">Approval Required</Text>
          <Text className="text-dark-400 text-sm">{typeLabel}</Text>
        </View>
        <Text className="text-dark-500 text-xs">
          {formatTime(approval.requestedAt)}
        </Text>
      </View>

      {/* Description */}
      <Text className="text-dark-200 mb-4">{approval.description}</Text>

      {/* File Changes Summary */}
      {approval.changes.length > 0 && (
        <View className="bg-dark-800 rounded-lg p-3 mb-4">
          <Text className="text-dark-300 text-sm mb-2">
            {approval.changes.length} file(s) affected:
          </Text>
          {approval.changes.slice(0, 3).map((change, index) => (
            <Text
              key={change.id}
              className="text-dark-400 text-xs font-mono"
              numberOfLines={1}
            >
              {change.filePath}
            </Text>
          ))}
          {approval.changes.length > 3 && (
            <Text className="text-dark-500 text-xs mt-1">
              +{approval.changes.length - 3} more files
            </Text>
          )}
        </View>
      )}

      {/* Actions */}
      <View className="flex-row gap-3">
        <Button
          title="Reject"
          variant="outline"
          size="sm"
          onPress={onReject}
          disabled={isLoading}
          icon={<X size={16} color={colors.error[500]} />}
          style={{ flex: 1, borderColor: colors.error[500] }}
        />
        <Button
          title="Approve"
          size="sm"
          onPress={onApprove}
          loading={isLoading}
          icon={<Check size={16} color="#fff" />}
          style={{ flex: 1 }}
        />
      </View>
    </Card>
  );
}

export default ApprovalCard;
