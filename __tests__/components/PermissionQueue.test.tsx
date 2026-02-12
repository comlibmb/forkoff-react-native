/**
 * Tests for PermissionQueue component
 *
 * Tests the queue-based permission approval UI that replaces
 * the single-permission modal when multiple prompts are pending.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PermissionQueue } from '@/components/claude/PermissionQueue';
import { PermissionRequestData } from '@/components/claude/PermissionRequest';

const createMockRequest = (
  overrides?: Partial<PermissionRequestData>
): PermissionRequestData => ({
  requestId: 'prompt-1',
  type: 'tool_use',
  toolName: 'Bash',
  description: 'Run: npm test',
  details: { command: 'npm test' },
  ...overrides,
});

describe('PermissionQueue', () => {
  const mockOnApprove = jest.fn();
  const mockOnDeny = jest.fn();
  const mockOnApproveAll = jest.fn();
  const mockOnDenyAll = jest.fn();
  const mockOnDismiss = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when queue is empty', () => {
    const { toJSON } = render(
      <PermissionQueue
        visible={true}
        queue={[]}
        onApprove={mockOnApprove}
        onDeny={mockOnDeny}
        onApproveAll={mockOnApproveAll}
        onDenyAll={mockOnDenyAll}
        onDismiss={mockOnDismiss}
      />
    );

    expect(toJSON()).toBeNull();
  });

  it('renders single permission view for 1 item', () => {
    const request = createMockRequest({ toolName: 'Bash', description: 'Run: npm test' });

    const { getByText, queryByText } = render(
      <PermissionQueue
        visible={true}
        queue={[request]}
        onApprove={mockOnApprove}
        onDeny={mockOnDeny}
        onApproveAll={mockOnApproveAll}
        onDenyAll={mockOnDenyAll}
        onDismiss={mockOnDismiss}
      />
    );

    // Should show Permission Required title
    expect(getByText('Permission Required')).toBeTruthy();
    // Should show tool name
    expect(getByText('Bash')).toBeTruthy();
    // Should NOT show Approve All / Deny All for single item
    expect(queryByText('Approve All')).toBeNull();
    expect(queryByText('Deny All')).toBeNull();
  });

  it('renders list view with count for multiple items', () => {
    const requests = [
      createMockRequest({ requestId: 'p1', toolName: 'Bash', description: 'Run: npm test' }),
      createMockRequest({ requestId: 'p2', toolName: 'Edit', description: 'Edit file: /a.ts', type: 'file_write' }),
      createMockRequest({ requestId: 'p3', toolName: 'Write', description: 'Create file: /b.ts', type: 'file_write' }),
    ];

    const { getByText } = render(
      <PermissionQueue
        visible={true}
        queue={requests}
        onApprove={mockOnApprove}
        onDeny={mockOnDeny}
        onApproveAll={mockOnApproveAll}
        onDenyAll={mockOnDenyAll}
        onDismiss={mockOnDismiss}
      />
    );

    // Should show count header
    expect(getByText('3 permissions pending')).toBeTruthy();
    // Should show Approve All / Deny All
    expect(getByText('Approve All')).toBeTruthy();
    expect(getByText('Deny All')).toBeTruthy();
  });

  it('calls onApprove with correct promptId', () => {
    const request = createMockRequest({ requestId: 'prompt-abc' });

    const { getByText } = render(
      <PermissionQueue
        visible={true}
        queue={[request]}
        onApprove={mockOnApprove}
        onDeny={mockOnDeny}
        onApproveAll={mockOnApproveAll}
        onDenyAll={mockOnDenyAll}
        onDismiss={mockOnDismiss}
      />
    );

    fireEvent.press(getByText('Allow'));

    expect(mockOnApprove).toHaveBeenCalledWith('prompt-abc');
  });

  it('calls onDeny with correct promptId', () => {
    const request = createMockRequest({ requestId: 'prompt-def' });

    const { getByText } = render(
      <PermissionQueue
        visible={true}
        queue={[request]}
        onApprove={mockOnApprove}
        onDeny={mockOnDeny}
        onApproveAll={mockOnApproveAll}
        onDenyAll={mockOnDenyAll}
        onDismiss={mockOnDismiss}
      />
    );

    fireEvent.press(getByText('Deny'));

    expect(mockOnDeny).toHaveBeenCalledWith('prompt-def');
  });

  it('calls onApproveAll when Approve All tapped', () => {
    const requests = [
      createMockRequest({ requestId: 'p1' }),
      createMockRequest({ requestId: 'p2' }),
    ];

    const { getByText } = render(
      <PermissionQueue
        visible={true}
        queue={requests}
        onApprove={mockOnApprove}
        onDeny={mockOnDeny}
        onApproveAll={mockOnApproveAll}
        onDenyAll={mockOnDenyAll}
        onDismiss={mockOnDismiss}
      />
    );

    fireEvent.press(getByText('Approve All'));

    expect(mockOnApproveAll).toHaveBeenCalled();
  });

  it('calls onDenyAll when Deny All tapped', () => {
    const requests = [
      createMockRequest({ requestId: 'p1' }),
      createMockRequest({ requestId: 'p2' }),
    ];

    const { getByText } = render(
      <PermissionQueue
        visible={true}
        queue={requests}
        onApprove={mockOnApprove}
        onDeny={mockOnDeny}
        onApproveAll={mockOnApproveAll}
        onDenyAll={mockOnDenyAll}
        onDismiss={mockOnDismiss}
      />
    );

    fireEvent.press(getByText('Deny All'));

    expect(mockOnDenyAll).toHaveBeenCalled();
  });
});
