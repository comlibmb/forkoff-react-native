/**
 * Tests for ClaudeApproval component
 *
 * Tests the ClaudeApproval component that displays approval options
 * (yes/no/plan) for Claude requests.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ClaudeApproval, ClaudeApprovalRequestData } from '@/components/claude/PermissionRequest';

describe('ClaudeApproval Component', () => {
  const mockOnRespond = jest.fn();
  const mockOnDismiss = jest.fn();

  const createMockRequest = (
    overrides?: Partial<ClaudeApprovalRequestData>
  ): ClaudeApprovalRequestData => ({
    approvalId: 'approval-123',
    terminalSessionId: 'terminal-abc',
    sessionKey: 'session-xyz',
    deviceId: 'device-456',
    context: ['Previous output line 1', 'Previous output line 2'],
    options: ['y:yes', 'n:no', 'p:plan'],
    promptText: 'Do you want to proceed with the changes?',
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should return null when request is null', () => {
      const { toJSON } = render(
        <ClaudeApproval
          visible={true}
          request={null}
          onRespond={mockOnRespond}
          onDismiss={mockOnDismiss}
        />
      );

      expect(toJSON()).toBeNull();
    });

    it('should render when visible is true and request is provided', () => {
      const request = createMockRequest();

      const { getByText } = render(
        <ClaudeApproval
          visible={true}
          request={request}
          onRespond={mockOnRespond}
          onDismiss={mockOnDismiss}
        />
      );

      expect(getByText('Claude Needs Input')).toBeTruthy();
    });

    it('should display the prompt text', () => {
      const request = createMockRequest({
        promptText: 'Custom prompt message here',
      });

      const { getByText } = render(
        <ClaudeApproval
          visible={true}
          request={request}
          onRespond={mockOnRespond}
          onDismiss={mockOnDismiss}
        />
      );

      expect(getByText('Custom prompt message here')).toBeTruthy();
    });

    it('should display the context/recent output when provided', () => {
      const request = createMockRequest({
        context: ['Line 1 of context', 'Line 2 of context'],
      });

      const { getByText } = render(
        <ClaudeApproval
          visible={true}
          request={request}
          onRespond={mockOnRespond}
          onDismiss={mockOnDismiss}
        />
      );

      expect(getByText('Recent Output')).toBeTruthy();
      // Context is joined with newlines
      expect(getByText('Line 1 of context\nLine 2 of context')).toBeTruthy();
    });

    it('should not render context section when context is empty', () => {
      const request = createMockRequest({
        context: [],
      });

      const { queryByText } = render(
        <ClaudeApproval
          visible={true}
          request={request}
          onRespond={mockOnRespond}
          onDismiss={mockOnDismiss}
        />
      );

      expect(queryByText('Recent Output')).toBeNull();
    });
  });

  describe('option rendering', () => {
    it('should render all options as buttons', () => {
      const request = createMockRequest({
        options: ['y:yes', 'n:no', 'p:plan'],
      });

      const { getByText } = render(
        <ClaudeApproval
          visible={true}
          request={request}
          onRespond={mockOnRespond}
          onDismiss={mockOnDismiss}
        />
      );

      expect(getByText('yes')).toBeTruthy();
      expect(getByText('no')).toBeTruthy();
      expect(getByText('plan')).toBeTruthy();
    });

    it('should render option keys in parentheses', () => {
      const request = createMockRequest({
        options: ['y:yes', 'n:no'],
      });

      const { getByText } = render(
        <ClaudeApproval
          visible={true}
          request={request}
          onRespond={mockOnRespond}
          onDismiss={mockOnDismiss}
        />
      );

      expect(getByText('(y)')).toBeTruthy();
      expect(getByText('(n)')).toBeTruthy();
    });

    it('should handle options without labels', () => {
      const request = createMockRequest({
        options: ['x', 'z'],
      });

      const { getByText } = render(
        <ClaudeApproval
          visible={true}
          request={request}
          onRespond={mockOnRespond}
          onDismiss={mockOnDismiss}
        />
      );

      // When no label, key is used as label
      expect(getByText('x')).toBeTruthy();
      expect(getByText('z')).toBeTruthy();
    });

    it('should render two options correctly', () => {
      const request = createMockRequest({
        options: ['y:yes', 'n:no'],
      });

      const { getAllByText } = render(
        <ClaudeApproval
          visible={true}
          request={request}
          onRespond={mockOnRespond}
          onDismiss={mockOnDismiss}
        />
      );

      // Check that we have exactly 2 option keys rendered
      const yKeys = getAllByText('(y)');
      const nKeys = getAllByText('(n)');
      expect(yKeys).toHaveLength(1);
      expect(nKeys).toHaveLength(1);
    });
  });

  describe('user interactions', () => {
    it('should call onRespond with correct approvalId and "y" when yes is pressed', () => {
      const request = createMockRequest({
        approvalId: 'test-approval-id',
        options: ['y:yes', 'n:no'],
      });

      const { getByText } = render(
        <ClaudeApproval
          visible={true}
          request={request}
          onRespond={mockOnRespond}
          onDismiss={mockOnDismiss}
        />
      );

      fireEvent.press(getByText('yes'));

      expect(mockOnRespond).toHaveBeenCalledWith('test-approval-id', 'y');
    });

    it('should call onRespond with correct approvalId and "n" when no is pressed', () => {
      const request = createMockRequest({
        approvalId: 'test-approval-id',
        options: ['y:yes', 'n:no'],
      });

      const { getByText } = render(
        <ClaudeApproval
          visible={true}
          request={request}
          onRespond={mockOnRespond}
          onDismiss={mockOnDismiss}
        />
      );

      fireEvent.press(getByText('no'));

      expect(mockOnRespond).toHaveBeenCalledWith('test-approval-id', 'n');
    });

    it('should call onRespond with "p" when plan is pressed', () => {
      const request = createMockRequest({
        approvalId: 'plan-test',
        options: ['y:yes', 'n:no', 'p:plan'],
      });

      const { getByText } = render(
        <ClaudeApproval
          visible={true}
          request={request}
          onRespond={mockOnRespond}
          onDismiss={mockOnDismiss}
        />
      );

      fireEvent.press(getByText('plan'));

      expect(mockOnRespond).toHaveBeenCalledWith('plan-test', 'p');
    });

    it('should call onDismiss when dismiss button is pressed', () => {
      const request = createMockRequest();

      const { getByText } = render(
        <ClaudeApproval
          visible={true}
          request={request}
          onRespond={mockOnRespond}
          onDismiss={mockOnDismiss}
        />
      );

      fireEvent.press(getByText('Dismiss (will timeout)'));

      expect(mockOnDismiss).toHaveBeenCalled();
      expect(mockOnRespond).not.toHaveBeenCalled();
    });

    it('should handle custom option keys', () => {
      const request = createMockRequest({
        approvalId: 'custom-approval',
        options: ['a:accept', 'r:reject', 's:skip'],
      });

      const { getByText } = render(
        <ClaudeApproval
          visible={true}
          request={request}
          onRespond={mockOnRespond}
          onDismiss={mockOnDismiss}
        />
      );

      fireEvent.press(getByText('skip'));

      expect(mockOnRespond).toHaveBeenCalledWith('custom-approval', 's');
    });
  });

  describe('Modal behavior', () => {
    it('should display header text', () => {
      const request = createMockRequest();

      const { getByText } = render(
        <ClaudeApproval
          visible={true}
          request={request}
          onRespond={mockOnRespond}
          onDismiss={mockOnDismiss}
        />
      );

      expect(getByText('Claude Needs Input')).toBeTruthy();
      expect(getByText('Choose an action to continue')).toBeTruthy();
    });

    it('should display Prompt section', () => {
      const request = createMockRequest();

      const { getByText } = render(
        <ClaudeApproval
          visible={true}
          request={request}
          onRespond={mockOnRespond}
          onDismiss={mockOnDismiss}
        />
      );

      expect(getByText('Prompt')).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('should handle single option', () => {
      const request = createMockRequest({
        options: ['c:continue'],
      });

      const { getByText } = render(
        <ClaudeApproval
          visible={true}
          request={request}
          onRespond={mockOnRespond}
          onDismiss={mockOnDismiss}
        />
      );

      expect(getByText('continue')).toBeTruthy();

      fireEvent.press(getByText('continue'));
      expect(mockOnRespond).toHaveBeenCalledWith('approval-123', 'c');
    });

    it('should handle many options', () => {
      const request = createMockRequest({
        options: ['1:one', '2:two', '3:three', '4:four', '5:five'],
      });

      const { getByText } = render(
        <ClaudeApproval
          visible={true}
          request={request}
          onRespond={mockOnRespond}
          onDismiss={mockOnDismiss}
        />
      );

      expect(getByText('one')).toBeTruthy();
      expect(getByText('five')).toBeTruthy();
    });

    it('should handle empty prompt text', () => {
      const request = createMockRequest({
        promptText: '',
      });

      const { getByText } = render(
        <ClaudeApproval
          visible={true}
          request={request}
          onRespond={mockOnRespond}
          onDismiss={mockOnDismiss}
        />
      );

      // Should still render the component
      expect(getByText('Claude Needs Input')).toBeTruthy();
    });

    it('should truncate long context to last 10 lines', () => {
      // The component uses slice(-10) for context
      const longContext = Array.from({ length: 15 }, (_, i) => `Line ${i + 1}`);
      const request = createMockRequest({
        context: longContext,
      });

      const { getByText } = render(
        <ClaudeApproval
          visible={true}
          request={request}
          onRespond={mockOnRespond}
          onDismiss={mockOnDismiss}
        />
      );

      // Should show last 10 lines (6-15)
      const expectedContext = longContext.slice(-10).join('\n');
      expect(getByText(expectedContext)).toBeTruthy();
    });
  });
});
