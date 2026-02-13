import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { EditToolBlock } from '@/components/claude/tools/EditToolBlock';

describe('EditToolBlock', () => {
  const mockToggle = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders Edit tool name and file name', () => {
    const { getByText } = render(
      <EditToolBlock filePath="/src/app.tsx" isExpanded={false} onToggleExpand={mockToggle} />
    );
    expect(getByText('Edit')).toBeTruthy();
    expect(getByText('app.tsx')).toBeTruthy();
  });

  it('shows old_string with deletion styling when expanded', () => {
    const { getByText } = render(
      <EditToolBlock oldString="const x = 1;" newString="const x = 2;" isExpanded={true} onToggleExpand={mockToggle} />
    );
    expect(getByText('-const x = 1;')).toBeTruthy();
  });

  it('shows new_string with addition styling when expanded', () => {
    const { getByText } = render(
      <EditToolBlock oldString="const x = 1;" newString="const x = 2;" isExpanded={true} onToggleExpand={mockToggle} />
    );
    expect(getByText('+const x = 2;')).toBeTruthy();
  });

  it('handles insert-only (no old_string)', () => {
    const { getByText, queryByText } = render(
      <EditToolBlock newString="new line" isExpanded={true} onToggleExpand={mockToggle} />
    );
    expect(getByText('+new line')).toBeTruthy();
    // Should not have any deletion lines
    expect(queryByText(/-/)).toBeNull();
  });

  it('handles delete-only (no new_string)', () => {
    const { getByText, queryByText } = render(
      <EditToolBlock oldString="old line" isExpanded={true} onToggleExpand={mockToggle} />
    );
    expect(getByText('-old line')).toBeTruthy();
  });

  it('shows change summary when collapsed', () => {
    const { getByText } = render(
      <EditToolBlock oldString={'line1\nline2'} newString="line3" isExpanded={false} onToggleExpand={mockToggle} />
    );
    expect(getByText('(2 removed, 1 added)')).toBeTruthy();
  });

  it('calls onToggleExpand when pressed', () => {
    const { getByText } = render(
      <EditToolBlock filePath="/src/app.tsx" isExpanded={false} onToggleExpand={mockToggle} />
    );
    fireEvent.press(getByText('Edit'));
    expect(mockToggle).toHaveBeenCalledTimes(1);
  });
});
