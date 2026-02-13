import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { GenericToolBlock } from '@/components/claude/tools/GenericToolBlock';

describe('GenericToolBlock', () => {
  const mockToggle = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders tool name in collapsed state', () => {
    const { getByText } = render(
      <GenericToolBlock toolName="WebFetch" isExpanded={false} onToggleExpand={mockToggle} />
    );
    expect(getByText('WebFetch')).toBeTruthy();
  });

  it('shows file name when provided', () => {
    const { getByText } = render(
      <GenericToolBlock toolName="SomeTool" fileName="config.json" isExpanded={false} onToggleExpand={mockToggle} />
    );
    expect(getByText('config.json')).toBeTruthy();
  });

  it('calls onToggleExpand when pressed', () => {
    const { getByText } = render(
      <GenericToolBlock toolName="SomeTool" isExpanded={false} onToggleExpand={mockToggle} />
    );
    fireEvent.press(getByText('SomeTool'));
    expect(mockToggle).toHaveBeenCalledTimes(1);
  });

  it('shows truncated content when expanded', () => {
    const longContent = 'x'.repeat(600);
    const { getByText } = render(
      <GenericToolBlock toolName="SomeTool" content={longContent} isExpanded={true} onToggleExpand={mockToggle} />
    );
    // Should show 500 chars + "..."
    expect(getByText('x'.repeat(500) + '...')).toBeTruthy();
  });

  it('shows full content when under 500 chars', () => {
    const { getByText } = render(
      <GenericToolBlock toolName="SomeTool" content="short content" isExpanded={true} onToggleExpand={mockToggle} />
    );
    expect(getByText('short content')).toBeTruthy();
  });

  it('handles missing content gracefully when expanded', () => {
    const { getByTestId } = render(
      <GenericToolBlock toolName="SomeTool" isExpanded={true} onToggleExpand={mockToggle} />
    );
    expect(getByTestId('generic-tool-block')).toBeTruthy();
  });

  it('does not show content when collapsed', () => {
    const { queryByText } = render(
      <GenericToolBlock toolName="SomeTool" content="hidden content" isExpanded={false} onToggleExpand={mockToggle} />
    );
    expect(queryByText('hidden content')).toBeNull();
  });
});
