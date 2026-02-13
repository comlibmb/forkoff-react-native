import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ReadToolBlock } from '@/components/claude/tools/ReadToolBlock';

describe('ReadToolBlock', () => {
  const mockToggle = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders Read tool name', () => {
    const { getByText } = render(
      <ReadToolBlock filePath="/src/app.tsx" isExpanded={false} onToggleExpand={mockToggle} />
    );
    expect(getByText('Read')).toBeTruthy();
  });

  it('shows file name', () => {
    const { getByText } = render(
      <ReadToolBlock filePath="/src/components/Button.tsx" isExpanded={false} onToggleExpand={mockToggle} />
    );
    expect(getByText('Button.tsx')).toBeTruthy();
  });

  it('shows full path when expanded', () => {
    const { getByText } = render(
      <ReadToolBlock filePath="/src/components/Button.tsx" isExpanded={true} onToggleExpand={mockToggle} />
    );
    expect(getByText('/src/components/Button.tsx')).toBeTruthy();
  });

  it('shows line range info when offset and limit provided', () => {
    const { getByText } = render(
      <ReadToolBlock filePath="/src/app.tsx" offset={100} limit={100} isExpanded={true} onToggleExpand={mockToggle} />
    );
    expect(getByText('Lines 100-200')).toBeTruthy();
  });

  it('shows first N lines when only limit provided', () => {
    const { getByText } = render(
      <ReadToolBlock filePath="/src/app.tsx" limit={50} isExpanded={true} onToggleExpand={mockToggle} />
    );
    expect(getByText('First 50 lines')).toBeTruthy();
  });

  it('calls onToggleExpand when pressed', () => {
    const { getByText } = render(
      <ReadToolBlock filePath="/src/app.tsx" isExpanded={false} onToggleExpand={mockToggle} />
    );
    fireEvent.press(getByText('Read'));
    expect(mockToggle).toHaveBeenCalledTimes(1);
  });

  it('handles missing file path', () => {
    const { getByTestId } = render(
      <ReadToolBlock isExpanded={false} onToggleExpand={mockToggle} />
    );
    expect(getByTestId('read-tool-block')).toBeTruthy();
  });
});
