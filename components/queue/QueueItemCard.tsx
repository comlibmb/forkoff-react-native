import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  Clock,
  Play,
  X,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader,
} from 'lucide-react-native';
import { colors } from '@/theme/colors';
import { PromptQueueItem, QueueItemStatus } from '@/types';

interface QueueItemCardProps {
  item: PromptQueueItem;
  onExecute?: () => void;
  onCancel?: () => void;
}

const statusConfig: Record<
  QueueItemStatus,
  { icon: React.ComponentType<any>; color: string; label: string }
> = {
  PENDING: { icon: Clock, color: colors.warning[400], label: 'Pending' },
  SCHEDULED: { icon: Clock, color: colors.primary[400], label: 'Scheduled' },
  EXECUTING: { icon: Loader, color: colors.primary[500], label: 'Executing' },
  COMPLETED: { icon: CheckCircle, color: colors.success[400], label: 'Completed' },
  FAILED: { icon: XCircle, color: colors.error[400], label: 'Failed' },
  CANCELLED: { icon: AlertCircle, color: colors.dark[400], label: 'Cancelled' },
};

export function QueueItemCard({ item, onExecute, onCancel }: QueueItemCardProps) {
  const status = statusConfig[item.status];
  const StatusIcon = status.icon;

  const canExecute = ['PENDING', 'SCHEDULED'].includes(item.status);
  const canCancel = ['PENDING', 'SCHEDULED', 'EXECUTING'].includes(item.status);

  // Format the prompt preview
  const promptPreview =
    item.prompt.length > 100 ? item.prompt.substring(0, 100) + '...' : item.prompt;

  // Format dates
  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.statusBadge}>
          <StatusIcon size={14} color={status.color} />
          <Text style={[styles.statusText, { color: status.color }]}>
            {status.label}
          </Text>
        </View>
        <Text style={styles.timestamp}>{formatTime(item.createdAt)}</Text>
      </View>

      {/* Prompt preview */}
      <Text style={styles.prompt} numberOfLines={3}>
        {promptPreview}
      </Text>

      {/* Rate limit info */}
      {item.rateLimitReason && (
        <View style={styles.rateLimitBadge}>
          <AlertCircle size={12} color={colors.warning[400]} />
          <Text style={styles.rateLimitText}>{item.rateLimitReason}</Text>
        </View>
      )}

      {/* Scheduled time */}
      {item.scheduledFor && (
        <View style={styles.scheduledBadge}>
          <Clock size={12} color={colors.primary[400]} />
          <Text style={styles.scheduledText}>
            Scheduled for {formatTime(item.scheduledFor)}
          </Text>
        </View>
      )}

      {/* Error message */}
      {item.errorMessage && (
        <View style={styles.errorBadge}>
          <XCircle size={12} color={colors.error[400]} />
          <Text style={styles.errorText}>{item.errorMessage}</Text>
        </View>
      )}

      {/* Actions */}
      {(canExecute || canCancel) && (
        <View style={styles.actions}>
          {canExecute && onExecute && (
            <TouchableOpacity style={styles.executeButton} onPress={onExecute}>
              <Play size={14} color="#fff" />
              <Text style={styles.executeButtonText}>Execute Now</Text>
            </TouchableOpacity>
          )}
          {canCancel && onCancel && (
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <X size={14} color={colors.error[400]} />
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.dark[700],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.dark[600],
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.dark[600],
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 11,
    color: colors.dark[400],
  },
  prompt: {
    fontSize: 14,
    color: colors.dark[200],
    lineHeight: 20,
    marginBottom: 12,
  },
  rateLimitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  rateLimitText: {
    fontSize: 12,
    color: colors.warning[400],
  },
  scheduledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  scheduledText: {
    fontSize: 12,
    color: colors.primary[400],
  },
  errorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: colors.error[400],
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  executeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary[500],
    paddingVertical: 10,
    borderRadius: 8,
  },
  executeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.error[400] + '40',
    backgroundColor: colors.error[400] + '10',
  },
  cancelButtonText: {
    color: colors.error[400],
    fontSize: 14,
    fontWeight: '600',
  },
});

export default QueueItemCard;
