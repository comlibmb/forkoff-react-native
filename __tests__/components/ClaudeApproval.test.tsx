/**
 * Tests for ClaudeApproval component
 *
 * Tests the ClaudeApproval component that displays approval options
 * (yes/no/plan) for Claude requests.
 *
 * The component uses formatApprovalRequest() to parse prompts into
 * structured tool-specific displays. For unrecognized prompts, it
 * shows "Tool Request" as the title with the prompt as description.
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

      // Generic prompt → title is "Tool Request"
      expect(getByText('Tool Request')).toBeTruthy();
    });

    it('should display the prompt text as description for generic requests', () => {
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

    it('should show tool-specific title for Write tool', () => {
      const request = createMockRequest({
        promptText: 'Claude wants to use: Write',
        context: ['File: /src/index.ts'],
      });

      const { getByText } = render(
        <ClaudeApproval
          visible={true}
          request={request}
          onRespond={mockOnRespond}
          onDismiss={mockOnDismiss}
        />
      );

      expect(getByText('Create File')).toBeTruthy();
    });

    it('should show tool-specific title for Bash tool', () => {
      const request = createMockRequest({
        promptText: 'Claude wants to use: Bash',
        context: ['Command: npm test'],
      });

      const { getByText } = render(
        <ClaudeApproval
          visible={true}
          request={request}
          onRespond={mockOnRespond}
          onDismiss={mockOnDismiss}
        />
      );

      expect(getByText('Run Command')).toBeTruthy();
    });

    it('should not render context section (context is parsed, not displayed)', () => {
      const request = createMockRequest({
        context: ['Line 1 of context', 'Line 2 of context'],
      });

      const { queryByText } = render(
        <ClaudeApproval
          visible={true}
          request={request}
          onRespond={mockOnRespond}
          onDismiss={mockOnDismiss}
        />
      );

      // Context is used for parsing, not displayed as "Recent Output"
      expect(queryByText('Recent Output')).toBeNull();
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
    it('should render all options as buttons with labels', () => {
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

    it('should render option labels (keys are not shown in parentheses)', () => {
      const request = createMockRequest({
        options: ['y:yes', 'n:no'],
      });

      const { getByText, queryByText } = render(
        <ClaudeApproval
          visible={true}
          request={request}
          onRespond={mockOnRespond}
          onDismiss={mockOnDismiss}
        />
      );

      // Only labels are rendered, not keys in parentheses
      expect(getByText('yes')).toBeTruthy();
      expect(getByText('no')).toBeTruthy();
      expect(queryByText('(y)')).toBeNull();
      expect(queryByText('(n)')).toBeNull();
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

    it('should render two option buttons', () => {
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

      expect(getByText('yes')).toBeTruthy();
      expect(getByText('no')).toBeTruthy();
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

      fireEvent.press(getByText('Tap outside to dismiss'));

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
    it('should display header text and title bar', () => {
      const request = createMockRequest();

      const { getByText } = render(
        <ClaudeApproval
          visible={true}
          request={request}
          onRespond={mockOnRespond}
          onDismiss={mockOnDismiss}
        />
      );

      // macOS-style title bar shows "claude-approval"
      expect(getByText('claude-approval')).toBeTruthy();
      // Generic prompt shows "Tool Request" as title
      expect(getByText('Tool Request')).toBeTruthy();
    });

    it('should display prompt text as description', () => {
      const request = createMockRequest();

      const { getByText } = render(
        <ClaudeApproval
          visible={true}
          request={request}
          onRespond={mockOnRespond}
          onDismiss={mockOnDismiss}
        />
      );

      expect(getByText('Do you want to proceed with the changes?')).toBeTruthy();
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

      // Empty prompt → default case: title is "Tool Request"
      expect(getByText('Tool Request')).toBeTruthy();
    });

    it('should show tool name when parsed from prompt', () => {
      const request = createMockRequest({
        promptText: 'Claude wants to use: Edit',
        context: ['File: /src/app.tsx'],
      });

      const { getByText } = render(
        <ClaudeApproval
          visible={true}
          request={request}
          onRespond={mockOnRespond}
          onDismiss={mockOnDismiss}
        />
      );

      expect(getByText('Edit File')).toBeTruthy();
      expect(getByText('Tool: Edit')).toBeTruthy();
    });
  });
});
