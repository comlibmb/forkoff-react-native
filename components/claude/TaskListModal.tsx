/**
 * TaskListModal - Full task list shown on tapping TaskIndicator
 *
 * Follows PermissionQueue modal pattern: transparent + fade + overlay.
 */

import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { ListTodo, X } from 'lucide-react-native';
import { colors } from '@/theme/colors';
import { TaskInfo } from '@/services/websocket.service';
import { TaskStatusIcon } from '@/components/claude/TaskProgress';

interface TaskListModalProps {
  visible: boolean;
  tasks: TaskInfo[];
  onClose: () => void;
}

export function TaskListModal({ visible, tasks, onClose }: TaskListModalProps) {
  const completedCount = tasks.filter(t => t.status === 'completed').length;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          style={styles.card}
          activeOpacity={1}
          onPress={() => {}}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <ListTodo size={18} color={colors.primary[400]} />
              <Text style={styles.headerTitle}>
                Tasks ({completedCount}/{tasks.length})
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={20} color={colors.dark[200]} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          {tasks.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No tasks yet</Text>
            </View>
          ) : (
            <ScrollView style={styles.list} bounces={false}>
              {tasks.map((task) => (
                <View key={task.id} style={styles.taskRow}>
                  <TaskStatusIcon status={task.status} />
                  <View style={styles.taskContent}>
                    <Text
                      style={[
                        styles.taskSubject,
                        task.status === 'completed' && styles.taskCompleted,
                        task.status === 'in_progress' && styles.taskInProgress,
                      ]}
                      numberOfLines={2}
                    >
                      {task.subject}
                    </Text>
                    {task.status === 'in_progress' && task.activeForm && (
                      <Text style={styles.taskActiveForm} numberOfLines={1}>
                        {task.activeForm}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: colors.dark[800],
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.dark[600],
    width: '100%',
    maxHeight: '70%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark[600],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.dark[50],
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.dark[400],
  },
  list: {
    padding: 12,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  taskContent: {
    flex: 1,
  },
  taskSubject: {
    fontSize: 14,
    color: colors.dark[50],
    lineHeight: 20,
  },
  taskCompleted: {
    color: colors.dark[200],
    textDecorationLine: 'line-through',
  },
  taskInProgress: {
    color: colors.primary[400],
    fontWeight: '500',
  },
  taskActiveForm: {
    fontSize: 12,
    color: colors.dark[300],
    marginTop: 2,
    fontStyle: 'italic',
  },
});

export default TaskListModal;
