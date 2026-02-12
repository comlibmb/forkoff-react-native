/**
 * Tests for Permissions Settings Screen
 *
 * Tests the permission rules configuration UI where users can toggle
 * tool auto-approval and manage Bash command patterns.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PermissionsScreen from '@/app/settings/permissions';
import { usePermissionRulesStore } from '@/stores/permission-rules.store';

// Mock expo-router
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
}));

// Mock SafeAreaView
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
}));

// Mock AlertModal
jest.mock('@/components/ui/AlertModal', () => ({
  alert: {
    show: jest.fn((_title: string, _message: string, buttons: any[]) => {
      // Auto-confirm by calling the last button (destructive action)
      const confirmBtn = buttons.find((b: any) => b.text === 'Reset');
      if (confirmBtn) confirmBtn.onPress();
    }),
  },
}));

describe('PermissionsScreen', () => {
  beforeEach(() => {
    usePermissionRulesStore.getState().resetToDefaults();
  });

  it('renders tool list with all default tools', () => {
    const { getByText } = render(<PermissionsScreen />);

    expect(getByText('Permission Rules')).toBeTruthy();
    expect(getByText('Bash')).toBeTruthy();
    expect(getByText('Write')).toBeTruthy();
    expect(getByText('Edit')).toBeTruthy();
    expect(getByText('Read')).toBeTruthy();
    expect(getByText('Glob')).toBeTruthy();
  });

  it('shows section headers', () => {
    const { getByText } = render(<PermissionsScreen />);

    expect(getByText('Requires Approval')).toBeTruthy();
    expect(getByText('Auto-Approved Tools')).toBeTruthy();
    expect(getByText('Bash Auto-Approve Patterns')).toBeTruthy();
  });

  it('shows "Requires approval" for dangerous tools by default', () => {
    const { getAllByText } = render(<PermissionsScreen />);

    // There should be multiple "Requires approval" texts (Bash, Write, Edit, NotebookEdit)
    const requiresApproval = getAllByText('Requires approval');
    expect(requiresApproval.length).toBeGreaterThanOrEqual(3);
  });

  it('shows "Auto-approved" for safe tools by default', () => {
    const { getAllByText } = render(<PermissionsScreen />);

    const autoApproved = getAllByText('Auto-approved');
    expect(autoApproved.length).toBeGreaterThan(5);
  });

  it('renders the reset to defaults button', () => {
    const { getByText } = render(<PermissionsScreen />);
    expect(getByText('Reset to Defaults')).toBeTruthy();
  });

  it('renders pattern hint text', () => {
    const { getByText } = render(<PermissionsScreen />);
    expect(getByText(/Commands matching these patterns/)).toBeTruthy();
  });

  it('resets to defaults when reset button is pressed', async () => {
    // First modify rules
    usePermissionRulesStore.getState().updateRule('Write', 'allow');

    const { getByText } = render(<PermissionsScreen />);

    fireEvent.press(getByText('Reset to Defaults'));

    // Wait for the async alert promise to resolve
    await new Promise((r) => setTimeout(r, 50));

    // Check that store was reset
    const { rules } = usePermissionRulesStore.getState();
    expect(rules.find((r) => r.tool === 'Write')?.action).toBe('ask');
  });
});
