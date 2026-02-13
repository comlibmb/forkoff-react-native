import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TaskToolBlock } from '@/components/claude/tools/TaskToolBlock';

describe('TaskToolBlock', () => {
  const mockToggle = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('TaskCreate renders subject from toolInput', () => {
    const { getByText } = render(
      <TaskToolBlock
        toolName="TaskCreate"
        toolInput={{ subject: 'Fix login bug', description: 'The login form fails on iOS' }}
        isExpanded={false}
        onToggleExpand={mockToggle}
      />
    );
    expect(getByText('Creating task')).toBeTruthy();
    expect(getByText('Fix login bug')).toBeTruthy();
  });

  it('TaskCreate shows description when expanded', () => {
    const { getByText } = render(
      <TaskToolBlock
        toolName="TaskCreate"
        toolInput={{ subject: 'Fix login bug', description: 'The login form fails on iOS' }}
        isExpanded={true}
        onToggleExpand={mockToggle}
      />
    );
    expect(getByText('The login form fails on iOS')).toBeTruthy();
  });

  it('TaskUpdate renders status change info', () => {
    const { getByText } = render(
      <TaskToolBlock
        toolName="TaskUpdate"
        toolInput={{ taskId: '3', status: 'completed' }}
        isExpanded={false}
        onToggleExpand={mockToggle}
      />
    );
    expect(getByText('Updating task')).toBeTruthy();
    expect(getByText('#3')).toBeTruthy();
  });

  it('TaskList renders header', () => {
    const { getByText } = render(
      <TaskToolBlock
        toolName="TaskList"
        toolInput={{}}
        isExpanded={false}
        onToggleExpand={mockToggle}
      />
    );
    expect(getByText('Listing tasks')).toBeTruthy();
  });

  it('handles missing toolInput', () => {
    const { getByTestId } = render(
      <TaskToolBlock
        toolName="TaskCreate"
        toolInput={null}
        isExpanded={false}
        onToggleExpand={mockToggle}
      />
    );
    expect(getByTestId('task-tool-block')).toBeTruthy();
  });

  it('calls onToggleExpand when pressed', () => {
    const { getByText } = render(
      <TaskToolBlock
        toolName="TaskCreate"
        toolInput={{ subject: 'Test' }}
        isExpanded={false}
        onToggleExpand={mockToggle}
      />
    );
    fireEvent.press(getByText('Creating task'));
    expect(mockToggle).toHaveBeenCalledTimes(1);
  });
});
