import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronRight, ChevronDown, Circle, CheckCircle2, ListTodo } from 'lucide-react-native';
import { colors } from '@/theme/colors';

interface TaskToolBlockProps {
  toolName: string;
  toolInput: any;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

function getTaskLabel(toolName: string): string {
  switch (toolName) {
    case 'TaskCreate': return 'Creating task';
    case 'TaskUpdate': return 'Updating task';
    case 'TaskList': return 'Listing tasks';
    case 'TaskGet': return 'Getting task';
    case 'TaskStop': return 'Stopping task';
    default: return toolName;
  }
}

function getStatusIcon(status?: string) {
  if (status === 'completed') return <CheckCircle2 size={12} color={colors.success[300]} />;
  if (status === 'in_progress') return <Circle size={12} color={colors.warning[300]} />;
  return <Circle size={12} color={colors.dark[400]} />;
}

export function TaskToolBlock({ toolName, toolInput, isExpanded, onToggleExpand }: TaskToolBlockProps) {
  const label = getTaskLabel(toolName);
  const subject = toolInput?.subject;
  const description = toolInput?.description;
  const status = toolInput?.status;
  const taskId = toolInput?.taskId;

  return (
    <View testID="task-tool-block" style={{ marginBottom: 6, backgroundColor: colors.dark[800], borderRadius: 8, overflow: 'hidden' }}>
      <TouchableOpacity
        onPress={onToggleExpand}
        style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10 }}
      >
        {isExpanded ? (
          <ChevronDown size={14} color={colors.primary[400]} />
        ) : (
          <ChevronRight size={14} color={colors.primary[400]} />
        )}
        <ListTodo size={14} color={colors.primary[400]} style={{ marginLeft: 6 }} />
        <Text style={{ fontFamily: 'monospace', fontSize: 12, marginLeft: 6, color: colors.primary[400], fontWeight: '500' }}>
          {label}
        </Text>
        {subject && (
          <Text style={{ color: colors.dark[200], fontFamily: 'monospace', fontSize: 12, marginLeft: 8, flex: 1 }} numberOfLines={1}>
            {subject}
          </Text>
        )}
        {status && (
          <View style={{ marginLeft: 6 }}>
            {getStatusIcon(status)}
          </View>
        )}
        {taskId && !subject && (
          <Text style={{ color: colors.dark[400], fontFamily: 'monospace', fontSize: 11, marginLeft: 8 }}>
            #{taskId}
          </Text>
        )}
      </TouchableOpacity>
      {isExpanded && description && (
        <View style={{ marginLeft: 16, paddingLeft: 10, paddingBottom: 8, paddingRight: 10, borderLeftWidth: 1, borderLeftColor: colors.dark[600] }}>
          <Text style={{ fontFamily: 'monospace', fontSize: 11, color: colors.dark[300] }} numberOfLines={5}>
            {description}
          </Text>
        </View>
      )}
    </View>
  );
}
