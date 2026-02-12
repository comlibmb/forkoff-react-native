/**
 * PermissionQueue - Queue-based permission approval UI
 *
 * Replaces the single-permission modal when multiple prompts are pending.
 * - 0 items: hidden
 * - 1 item: same visual as the original PermissionRequest modal
 * - N items: scrollable list with individual approve/deny + bulk actions
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { AlertTriangle, Check, X, Terminal, Edit3, FileText } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { PermissionRequestData, PermissionType } from './PermissionRequest';

interface PermissionQueueProps {
  visible: boolean;
  queue: PermissionRequestData[];
  onApprove: (requestId: string) => void;
  onDeny: (requestId: string) => void;
  onApproveAll: () => void;
  onDenyAll: () => void;
  onDismiss: () => void;
}

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

function PermissionIcon({ type, toolName, size = 24 }: { type: PermissionType; toolName?: string; size?: number }) {
  const { colors } = useTheme();

  if (toolName?.toLowerCase().includes('bash') || type === 'bash_command') {
    return <Terminal size={size} color={colors.warning[400]} />;
  }
  if (type === 'file_write' || toolName?.toLowerCase().includes('write') || toolName?.toLowerCase().includes('edit')) {
    return <Edit3 size={size} color={colors.warning[400]} />;
  }
  if (type === 'file_read' || toolName?.toLowerCase().includes('read')) {
    return <FileText size={size} color={colors.primary[400]} />;
  }
  return <AlertTriangle size={size} color={colors.warning[400]} />;
}

/** Single-item view — identical to original PermissionRequest modal */
function SinglePermissionView({
  request,
  onApprove,
  onDeny,
}: {
  request: PermissionRequestData;
  onApprove: () => void;
  onDeny: () => void;
}) {
  const { theme, colors } = useTheme();

  return (
    <View
      className="w-full max-w-sm overflow-hidden"
      style={{
        backgroundColor: theme.background,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.backgroundTertiary,
      }}
    >
      {/* macOS-style title bar */}
      <View
        className="flex-row items-center px-3 py-2.5"
        style={{
          backgroundColor: theme.backgroundSecondary,
          borderBottomWidth: 1,
          borderBottomColor: theme.backgroundTertiary,
          gap: 6,
        }}
      >
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.error[400] }} />
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.warning[300] }} />
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success[300] }} />
        <Text style={{ fontSize: 12, color: theme.textTertiary, fontFamily: 'monospace', marginLeft: 8 }}>
          permission-request
        </Text>
      </View>

      {/* Header with icon */}
      <View className="px-5 pt-5 items-center">
        <View
          className="w-14 h-14 rounded-full items-center justify-center mb-4"
          style={{
            backgroundColor: theme.backgroundSecondary,
            borderWidth: 2,
            borderColor: colors.warning[500],
          }}
        >
          <PermissionIcon type={request.type} toolName={request.toolName} size={32} />
        </View>
        <Text style={{ color: theme.text, fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 }}>
          Permission Required
        </Text>
        <Text style={{ color: theme.textTertiary, fontSize: 14, marginBottom: 12 }}>
          {getTypeLabel(request.type)}
        </Text>
      </View>

      {/* Content */}
      <View className="px-5">
        {request.toolName && (
          <View className="mb-3">
            <Text style={{ color: theme.textTertiary, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, textAlign: 'center' }}>
              Tool
            </Text>
            <View
              className="p-2.5"
              style={{
                backgroundColor: theme.backgroundSecondary,
                borderRadius: 6,
              }}
            >
              <Text style={{ color: theme.text, fontFamily: 'monospace', fontSize: 14, textAlign: 'center' }}>
                {request.toolName}
              </Text>
            </View>
          </View>
        )}

        <View className="mb-4">
          <Text style={{ color: theme.textTertiary, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, textAlign: 'center' }}>
            Description
          </Text>
          <View
            className="p-3"
            style={{
              backgroundColor: theme.backgroundSecondary,
              borderRadius: 6,
            }}
          >
            <Text style={{ color: theme.textSecondary, fontSize: 14, lineHeight: 20, textAlign: 'center' }}>
              {request.description}
            </Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View className="px-5 pb-5 flex-row gap-2.5">
        <TouchableOpacity
          onPress={onDeny}
          className="flex-1 py-3 rounded-lg flex-row items-center justify-center"
          style={{
            backgroundColor: theme.backgroundTertiary,
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <X size={18} color={theme.textSecondary} />
          <Text style={{ color: theme.textSecondary, fontWeight: '600', marginLeft: 8 }}>Deny</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onApprove}
          className="flex-1 py-3 rounded-lg flex-row items-center justify-center"
          style={{ backgroundColor: colors.primary[600] }}
        >
          <Check size={18} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '600', marginLeft: 8 }}>Allow</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom accent bar */}
      <View style={{ height: 3, backgroundColor: colors.warning[500] }} />
    </View>
  );
}

/** Multi-item list view — scrollable with individual + bulk actions */
function MultiPermissionView({
  queue,
  onApprove,
  onDeny,
  onApproveAll,
  onDenyAll,
}: {
  queue: PermissionRequestData[];
  onApprove: (requestId: string) => void;
  onDeny: (requestId: string) => void;
  onApproveAll: () => void;
  onDenyAll: () => void;
}) {
  const { theme, colors } = useTheme();

  return (
    <View
      className="w-full max-w-sm overflow-hidden"
      style={{
        backgroundColor: theme.background,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.backgroundTertiary,
        maxHeight: '80%',
      }}
    >
      {/* macOS-style title bar */}
      <View
        className="flex-row items-center px-3 py-2.5"
        style={{
          backgroundColor: theme.backgroundSecondary,
          borderBottomWidth: 1,
          borderBottomColor: theme.backgroundTertiary,
          gap: 6,
        }}
      >
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.error[400] }} />
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.warning[300] }} />
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success[300] }} />
        <Text style={{ fontSize: 12, color: theme.textTertiary, fontFamily: 'monospace', marginLeft: 8 }}>
          permission-queue
        </Text>
      </View>

      {/* Header */}
      <View className="px-5 pt-4 pb-3 items-center">
        <Text style={{ color: theme.text, fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 }}>
          {queue.length} permissions pending
        </Text>
        <Text style={{ color: theme.textTertiary, fontSize: 14 }}>
          Claude is waiting for approval
        </Text>
      </View>

      {/* Scrollable list */}
      <ScrollView className="px-4" style={{ maxHeight: 300 }}>
        {queue.map((request) => (
          <View
            key={request.requestId}
            className="mb-3 p-3"
            style={{
              backgroundColor: theme.backgroundSecondary,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <View className="flex-row items-center mb-2">
              <PermissionIcon type={request.type} toolName={request.toolName} size={20} />
              <Text style={{ color: theme.text, fontWeight: '600', fontSize: 14, marginLeft: 8, flex: 1 }}>
                {request.toolName || getTypeLabel(request.type)}
              </Text>
            </View>
            <Text style={{ color: theme.textSecondary, fontSize: 13, marginBottom: 8 }} numberOfLines={2}>
              {request.description}
            </Text>
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => onDeny(request.requestId)}
                className="flex-1 py-2 rounded items-center"
                style={{
                  backgroundColor: theme.backgroundTertiary,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <Text style={{ color: theme.textSecondary, fontSize: 13, fontWeight: '600' }}>Deny</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onApprove(request.requestId)}
                className="flex-1 py-2 rounded items-center"
                style={{ backgroundColor: colors.primary[600] }}
              >
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Allow</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Bulk action footer */}
      <View className="px-5 py-4 flex-row gap-2.5" style={{ borderTopWidth: 1, borderTopColor: theme.border }}>
        <TouchableOpacity
          onPress={onDenyAll}
          className="flex-1 py-3 rounded-lg items-center"
          style={{
            backgroundColor: theme.backgroundTertiary,
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <Text style={{ color: theme.textSecondary, fontWeight: '600' }}>Deny All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onApproveAll}
          className="flex-1 py-3 rounded-lg items-center"
          style={{ backgroundColor: colors.primary[600] }}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>Approve All</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom accent bar */}
      <View style={{ height: 3, backgroundColor: colors.warning[500] }} />
    </View>
  );
}

export function PermissionQueue({
  visible,
  queue,
  onApprove,
  onDeny,
  onApproveAll,
  onDenyAll,
  onDismiss,
}: PermissionQueueProps) {
  if (queue.length === 0) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View className="flex-1 justify-center items-center bg-black/60 px-4">
        {queue.length === 1 ? (
          <SinglePermissionView
            request={queue[0]}
            onApprove={() => onApprove(queue[0].requestId)}
            onDeny={() => onDeny(queue[0].requestId)}
          />
        ) : (
          <MultiPermissionView
            queue={queue}
            onApprove={onApprove}
            onDeny={onDeny}
            onApproveAll={onApproveAll}
            onDenyAll={onDenyAll}
          />
        )}
      </View>
    </Modal>
  );
}
