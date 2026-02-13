import React from 'react';
import { render } from '@testing-library/react-native';
import { ToolUseBlock } from '@/components/claude/tools/ToolUseBlock';
import { TranscriptEntry } from '@/services/websocket.service';

function makeEntry(toolName: string, toolInput: any = {}, text?: string): TranscriptEntry {
  return {
    id: `test-${toolName}`,
    type: 'tool_use',
    timestamp: Date.now(),
    content: { toolName, toolInput, text },
  } as TranscriptEntry;
}

describe('ToolUseBlock', () => {
  const mockToggle = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('routes EnterPlanMode to PlanModeBlock', () => {
    const { getByTestId } = render(
      <ToolUseBlock entry={makeEntry('EnterPlanMode')} isExpanded={false} onToggleExpand={mockToggle} />
    );
    expect(getByTestId('plan-mode-block')).toBeTruthy();
  });

  it('routes ExitPlanMode to PlanModeBlock', () => {
    const { getByText } = render(
      <ToolUseBlock entry={makeEntry('ExitPlanMode')} isExpanded={false} onToggleExpand={mockToggle} />
    );
    expect(getByText('Plan Complete')).toBeTruthy();
  });

  it('routes Bash to BashToolBlock', () => {
    const { getByTestId } = render(
      <ToolUseBlock entry={makeEntry('Bash', { command: 'npm test' })} isExpanded={false} onToggleExpand={mockToggle} />
    );
    expect(getByTestId('bash-tool-block')).toBeTruthy();
  });

  it('routes Edit to EditToolBlock', () => {
    const { getByTestId } = render(
      <ToolUseBlock entry={makeEntry('Edit', { file_path: '/test.ts', old_string: 'a', new_string: 'b' })} isExpanded={false} onToggleExpand={mockToggle} />
    );
    expect(getByTestId('edit-tool-block')).toBeTruthy();
  });

  it('routes Read to ReadToolBlock', () => {
    const { getByTestId } = render(
      <ToolUseBlock entry={makeEntry('Read', { file_path: '/test.ts' })} isExpanded={false} onToggleExpand={mockToggle} />
    );
    expect(getByTestId('read-tool-block')).toBeTruthy();
  });

  it('routes Grep to SearchToolBlock', () => {
    const { getByTestId } = render(
      <ToolUseBlock entry={makeEntry('Grep', { pattern: 'TODO' })} isExpanded={false} onToggleExpand={mockToggle} />
    );
    expect(getByTestId('search-tool-block')).toBeTruthy();
  });

  it('routes Glob to SearchToolBlock', () => {
    const { getByTestId } = render(
      <ToolUseBlock entry={makeEntry('Glob', { pattern: '**/*.ts' })} isExpanded={false} onToggleExpand={mockToggle} />
    );
    expect(getByTestId('search-tool-block')).toBeTruthy();
  });

  it('routes Write to WriteToolBlock', () => {
    const { getByTestId } = render(
      <ToolUseBlock entry={makeEntry('Write', { file_path: '/test.ts', content: 'hello' })} isExpanded={false} onToggleExpand={mockToggle} />
    );
    expect(getByTestId('write-tool-block')).toBeTruthy();
  });

  it('routes TaskCreate to TaskToolBlock', () => {
    const { getByTestId } = render(
      <ToolUseBlock entry={makeEntry('TaskCreate', { subject: 'Test' })} isExpanded={false} onToggleExpand={mockToggle} />
    );
    expect(getByTestId('task-tool-block')).toBeTruthy();
  });

  it('routes TaskUpdate to TaskToolBlock', () => {
    const { getByTestId } = render(
      <ToolUseBlock entry={makeEntry('TaskUpdate', { taskId: '1', status: 'completed' })} isExpanded={false} onToggleExpand={mockToggle} />
    );
    expect(getByTestId('task-tool-block')).toBeTruthy();
  });

  it('routes TaskList to TaskToolBlock', () => {
    const { getByTestId } = render(
      <ToolUseBlock entry={makeEntry('TaskList')} isExpanded={false} onToggleExpand={mockToggle} />
    );
    expect(getByTestId('task-tool-block')).toBeTruthy();
  });

  it('falls back to GenericToolBlock for unknown tools', () => {
    const { getByTestId } = render(
      <ToolUseBlock entry={makeEntry('WebFetch', {})} isExpanded={false} onToggleExpand={mockToggle} />
    );
    expect(getByTestId('generic-tool-block')).toBeTruthy();
  });

  it('handles missing toolName', () => {
    const entry = {
      id: 'test-empty',
      type: 'tool_use',
      timestamp: Date.now(),
      content: {},
    } as TranscriptEntry;
    const { getByTestId } = render(
      <ToolUseBlock entry={entry} isExpanded={false} onToggleExpand={mockToggle} />
    );
    expect(getByTestId('generic-tool-block')).toBeTruthy();
  });
});
