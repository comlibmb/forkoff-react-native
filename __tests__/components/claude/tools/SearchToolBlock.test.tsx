import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SearchToolBlock } from '@/components/claude/tools/SearchToolBlock';

describe('SearchToolBlock', () => {
  const mockToggle = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders Grep tool name', () => {
    const { getByText } = render(
      <SearchToolBlock toolName="Grep" pattern="TODO" isExpanded={false} onToggleExpand={mockToggle} />
    );
    expect(getByText('Grep')).toBeTruthy();
  });

  it('renders Glob tool name', () => {
    const { getByText } = render(
      <SearchToolBlock toolName="Glob" pattern="**/*.tsx" isExpanded={false} onToggleExpand={mockToggle} />
    );
    expect(getByText('Glob')).toBeTruthy();
  });

  it('shows pattern in header (always visible)', () => {
    const { getByText } = render(
      <SearchToolBlock toolName="Grep" pattern={'function\\s+\\w+'} isExpanded={false} onToggleExpand={mockToggle} />
    );
    expect(getByText('function\\s+\\w+')).toBeTruthy();
  });

  it('shows path when expanded', () => {
    const { getByText } = render(
      <SearchToolBlock toolName="Grep" pattern="TODO" path="/src" isExpanded={true} onToggleExpand={mockToggle} />
    );
    expect(getByText('Path: /src')).toBeTruthy();
  });

  it('shows glob filter when expanded', () => {
    const { getByText } = render(
      <SearchToolBlock toolName="Grep" pattern="TODO" glob="*.ts" isExpanded={true} onToggleExpand={mockToggle} />
    );
    expect(getByText('Filter: *.ts')).toBeTruthy();
  });

  it('calls onToggleExpand when pressed', () => {
    const { getByText } = render(
      <SearchToolBlock toolName="Grep" pattern="TODO" isExpanded={false} onToggleExpand={mockToggle} />
    );
    fireEvent.press(getByText('Grep'));
    expect(mockToggle).toHaveBeenCalledTimes(1);
  });

  it('handles missing pattern', () => {
    const { getByTestId } = render(
      <SearchToolBlock toolName="Glob" isExpanded={false} onToggleExpand={mockToggle} />
    );
    expect(getByTestId('search-tool-block')).toBeTruthy();
  });
});
