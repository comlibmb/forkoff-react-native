/**
 * TaskProgress - Collapsible task list with progress tracking
 *
 * Shows Claude's tasks with checkbox-style indicators:
 * - Empty circle: pending
 * - Spinner: in_progress
 * - Checkmark: completed
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { ListTodo, ChevronDown, ChevronRight, Circle, CheckCircle2 } from 'lucide-react-native';
import { colors } from '@/theme/colors';
import { TaskInfo } from '@/services/websocket.service';

interface TaskProgressProps {
  tasks: TaskInfo[];
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function TaskProgress({ tasks, isCollapsed = true, onToggleCollapse }: TaskProgressProps) {
  const [collapsed, setCollapsed] = useState(isCollapsed);

  if (!tasks || tasks.length === 0) {
    return null;
  }

  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const inProgressTask = tasks.find(t => t.status === 'in_progress');

  const handleToggle = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setCollapsed(!collapsed);
    }
  };

  const isExpanded = !collapsed;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={handleToggle}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <ListTodo size={16} color={colors.dark[200]} />
          <Text style={styles.headerText}>
            Tasks ({completedCount}/{tasks.length})
          </Text>
          {inProgressTask && (
            <View style={styles.activeIndicator}>
              <ActivityIndicator size="small" color={colors.primary[500]} />
              <Text style={styles.activeText} numberOfLines={1}>
                {inProgressTask.activeForm || inProgressTask.subject}
              </Text>
            </View>
          )}
        </View>
        {isExpanded ? (
          <ChevronDown size={16} color={colors.dark[200]} />
        ) : (
          <ChevronRight size={16} color={colors.dark[200]} />
        )}
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.taskList}>
          {tasks.map((task) => (
            <View key={task.id} style={styles.taskItem}>
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
        </View>
      )}
    </View>
  );
}

export function TaskStatusIcon({ status }: { status: TaskInfo['status'] }) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 size={18} color={colors.success[400]} />;
    case 'in_progress':
      return (
        <View style={styles.spinnerContainer}>
          <ActivityIndicator size="small" color={colors.primary[500]} />
        </View>
      );
    case 'pending':
    default:
      return <Circle size={18} color={colors.dark[400]} />;
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.dark[700],
    borderRadius: 8,
    marginVertical: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.dark[500],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: colors.dark[600],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  headerText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.dark[50],
  },
  activeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginLeft: 8,
  },
  activeText: {
    fontSize: 12,
    color: colors.primary[400],
    flex: 1,
  },
  taskList: {
    padding: 8,
    gap: 6,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 4,
  },
  spinnerContainer: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskContent: {
    flex: 1,
  },
  taskSubject: {
    fontSize: 13,
    color: colors.dark[50],
    lineHeight: 18,
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
    fontSize: 11,
    color: colors.dark[300],
    marginTop: 2,
    fontStyle: 'italic',
  },
});

export default TaskProgress;
