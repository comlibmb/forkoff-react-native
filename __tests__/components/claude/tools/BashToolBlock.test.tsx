import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { BashToolBlock } from '@/components/claude/tools/BashToolBlock';

describe('BashToolBlock', () => {
  const mockToggle = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders $ prompt symbol', () => {
    const { getByText } = render(
      <BashToolBlock command="npm test" isExpanded={false} onToggleExpand={mockToggle} />
    );
    expect(getByText('$')).toBeTruthy();
  });

  it('shows command text', () => {
    const { getByText } = render(
      <BashToolBlock command="npm test" isExpanded={false} onToggleExpand={mockToggle} />
    );
    expect(getByText('npm test')).toBeTruthy();
  });

  it('shows full command when expanded', () => {
    const longCommand = 'git log --oneline --graph --all --decorate --color';
    const { getByText } = render(
      <BashToolBlock command={longCommand} isExpanded={true} onToggleExpand={mockToggle} />
    );
    expect(getByText(longCommand)).toBeTruthy();
  });

  it('shows description when provided and expanded', () => {
    const { getByText } = render(
      <BashToolBlock command="npm test" description="Run all unit tests" isExpanded={true} onToggleExpand={mockToggle} />
    );
    expect(getByText('Run all unit tests')).toBeTruthy();
  });

  it('does not show description when collapsed', () => {
    const { queryByText } = render(
      <BashToolBlock command="npm test" description="Run all unit tests" isExpanded={false} onToggleExpand={mockToggle} />
    );
    expect(queryByText('Run all unit tests')).toBeNull();
  });

  it('calls onToggleExpand when pressed', () => {
    const { getByText } = render(
      <BashToolBlock command="npm test" isExpanded={false} onToggleExpand={mockToggle} />
    );
    fireEvent.press(getByText('$'));
    expect(mockToggle).toHaveBeenCalledTimes(1);
  });

  it('handles empty command', () => {
    const { getByTestId } = render(
      <BashToolBlock command="" isExpanded={false} onToggleExpand={mockToggle} />
    );
    expect(getByTestId('bash-tool-block')).toBeTruthy();
  });
});
