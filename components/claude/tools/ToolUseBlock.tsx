import React from 'react';
import { TranscriptEntry } from '@/services/websocket.service';
import { GenericToolBlock } from './GenericToolBlock';
import { BashToolBlock } from './BashToolBlock';
import { EditToolBlock } from './EditToolBlock';
import { ReadToolBlock } from './ReadToolBlock';
import { SearchToolBlock } from './SearchToolBlock';
import { PlanModeBlock } from './PlanModeBlock';
import { TaskToolBlock } from './TaskToolBlock';
import { WriteToolBlock } from './WriteToolBlock';

interface ToolUseBlockProps {
  entry: TranscriptEntry;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export function ToolUseBlock({ entry, isExpanded, onToggleExpand }: ToolUseBlockProps) {
  const toolName = entry.content?.toolName || '';
  const toolInput = entry.content?.toolInput || {};
  const text = entry.content?.text || '';

  // Parse toolInput from string if needed
  let parsedInput = toolInput;
  if (typeof toolInput === 'string') {
    try { parsedInput = JSON.parse(toolInput); } catch { parsedInput = {}; }
  }

  // Plan mode transitions — not collapsible
  if (toolName === 'EnterPlanMode') {
    return <PlanModeBlock mode="enter" />;
  }
  if (toolName === 'ExitPlanMode') {
    return <PlanModeBlock mode="exit" />;
  }

  // Bash tool
  if (toolName === 'Bash') {
    return (
      <BashToolBlock
        command={parsedInput?.command || ''}
        description={parsedInput?.description}
        isExpanded={isExpanded}
        onToggleExpand={onToggleExpand}
      />
    );
  }

  // Edit tool
  if (toolName === 'Edit') {
    return (
      <EditToolBlock
        filePath={parsedInput?.file_path}
        oldString={parsedInput?.old_string}
        newString={parsedInput?.new_string}
        isExpanded={isExpanded}
        onToggleExpand={onToggleExpand}
      />
    );
  }

  // Read tool
  if (toolName === 'Read') {
    return (
      <ReadToolBlock
        filePath={parsedInput?.file_path}
        limit={parsedInput?.limit}
        offset={parsedInput?.offset}
        isExpanded={isExpanded}
        onToggleExpand={onToggleExpand}
      />
    );
  }

  // Search tools
  if (toolName === 'Grep' || toolName === 'Glob') {
    return (
      <SearchToolBlock
        toolName={toolName as 'Grep' | 'Glob'}
        pattern={parsedInput?.pattern}
        path={parsedInput?.path}
        glob={parsedInput?.glob}
        isExpanded={isExpanded}
        onToggleExpand={onToggleExpand}
      />
    );
  }

  // Write tool
  if (toolName === 'Write') {
    return (
      <WriteToolBlock
        toolInput={toolInput}
        isExpanded={isExpanded}
        onToggleExpand={onToggleExpand}
      />
    );
  }

  // Task tools
  if (toolName === 'TaskCreate' || toolName === 'TaskUpdate' || toolName === 'TaskList' || toolName === 'TaskGet' || toolName === 'TaskStop') {
    return (
      <TaskToolBlock
        toolName={toolName}
        toolInput={parsedInput}
        isExpanded={isExpanded}
        onToggleExpand={onToggleExpand}
      />
    );
  }

  // Fallback: Generic tool block
  const filePath = parsedInput?.file_path;
  const fileName = filePath?.split(/[/\\]/).pop();

  return (
    <GenericToolBlock
      toolName={toolName || 'tool'}
      fileName={fileName}
      content={text || (typeof toolInput === 'string' ? toolInput : undefined)}
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
    />
  );
}
