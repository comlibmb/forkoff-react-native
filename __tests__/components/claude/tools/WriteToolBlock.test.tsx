import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { WriteToolBlock } from '@/components/claude/tools/WriteToolBlock';

describe('WriteToolBlock', () => {
  const mockToggle = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders Write tool name', () => {
    const { getByText } = render(
      <WriteToolBlock
        toolInput={{ file_path: '/src/test.ts', content: 'hello' }}
        isExpanded={false}
        onToggleExpand={mockToggle}
      />
    );
    expect(getByText('Write')).toBeTruthy();
  });

  it('shows file name', () => {
    const { getByText } = render(
      <WriteToolBlock
        toolInput={{ file_path: '/src/test.ts', content: 'hello' }}
        isExpanded={false}
        onToggleExpand={mockToggle}
      />
    );
    expect(getByText('test.ts')).toBeTruthy();
  });

  it('shows green addition lines when expanded', () => {
    const { getByText } = render(
      <WriteToolBlock
        toolInput={{ file_path: '/src/test.ts', content: 'const x = 1;\nconst y = 2;' }}
        isExpanded={true}
        onToggleExpand={mockToggle}
      />
    );
    expect(getByText('+const x = 1;')).toBeTruthy();
    expect(getByText('+const y = 2;')).toBeTruthy();
  });

  it('shows new file header with line count when expanded', () => {
    const { getByText } = render(
      <WriteToolBlock
        toolInput={{ file_path: '/src/test.ts', content: 'line1\nline2\nline3' }}
        isExpanded={true}
        onToggleExpand={mockToggle}
      />
    );
    expect(getByText('+++ test.ts (new file, 3 lines)')).toBeTruthy();
  });

  it('handles JSON string input', () => {
    const jsonInput = JSON.stringify({ file_path: '/src/app.ts', content: 'hello world' });
    const { getByText } = render(
      <WriteToolBlock
        toolInput={jsonInput}
        isExpanded={true}
        onToggleExpand={mockToggle}
      />
    );
    expect(getByText('+hello world')).toBeTruthy();
  });

  it('calls onToggleExpand when pressed', () => {
    const { getByText } = render(
      <WriteToolBlock
        toolInput={{ file_path: '/src/test.ts', content: 'hello' }}
        isExpanded={false}
        onToggleExpand={mockToggle}
      />
    );
    fireEvent.press(getByText('Write'));
    expect(mockToggle).toHaveBeenCalledTimes(1);
  });

  it('handles null toolInput gracefully', () => {
    const { getByTestId } = render(
      <WriteToolBlock
        toolInput={null}
        isExpanded={false}
        onToggleExpand={mockToggle}
      />
    );
    expect(getByTestId('write-tool-block')).toBeTruthy();
  });
});
