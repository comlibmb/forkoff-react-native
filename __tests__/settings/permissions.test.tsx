/**
 * Tests for Permissions Settings Screen
 *
 * Tests the permission rules configuration UI where users can toggle
 * tool auto-approval and manage Bash command patterns.
 *
 * The component uses TOOL_META for friendly labels (e.g. Bash → "Terminal",
 * Write → "Write File") and has collapsible sections:
 * - "Sensitive Tools" (dangerous tools, always visible)
 * - "Trusted Commands" (Bash patterns, visible when Bash is set to 'ask')
 * - "Read-Only & Safe Tools" (collapsed by default)
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PermissionsScreen from '@/app/settings/permissions';
import { usePermissionRulesStore } from '@/stores/permission-rules.store';

// Mock expo-router
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
}));

// Mock SafeAreaView — must be a named function so react-native-css-interop
// can read displayName/name without crashing in maybeHijackSafeAreaProvider.
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});

// The permissions screen uses lucide icons not in the global mock (jest.setup.js).
// Add the missing ones here so JSX doesn't receive undefined components.
jest.mock('lucide-react-native', () => ({
  AlertTriangle: 'AlertTriangle',
  ArrowLeft: 'ArrowLeft',
  ArrowUp: 'ArrowUp',
  ArrowDown: 'ArrowDown',
  Brain: 'Brain',
  Check: 'Check',
  CheckCircle2: 'CheckCircle2',
  ChevronRight: 'ChevronRight',
  ChevronDown: 'ChevronDown',
  ChevronUp: 'ChevronUp',
  Circle: 'Circle',
  ClipboardList: 'ClipboardList',
  Code: 'Code',
  Edit3: 'Edit3',
  Eye: 'Eye',
  FileText: 'FileText',
  FilePlus: 'FilePlus',
  FolderSearch: 'FolderSearch',
  Globe: 'Globe',
  Hash: 'Hash',
  HelpCircle: 'HelpCircle',
  ListTodo: 'ListTodo',
  Loader: 'Loader',
  Map: 'Map',
  MessageSquare: 'MessageSquare',
  Pencil: 'Pencil',
  Plus: 'Plus',
  RotateCcw: 'RotateCcw',
  Search: 'Search',
  Shield: 'Shield',
  ShieldAlert: 'ShieldAlert',
  ShieldCheck: 'ShieldCheck',
  AlertCircle: 'AlertCircle',
  Terminal: 'Terminal',
  X: 'X',
  Zap: 'Zap',
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

  it('renders header and tool list with sensitive tools', () => {
    const { getByText } = render(<PermissionsScreen />);

    expect(getByText('Tool Permissions')).toBeTruthy();
    // Sensitive tools show their TOOL_META labels
    expect(getByText('Terminal')).toBeTruthy();     // Bash
    expect(getByText('Write File')).toBeTruthy();   // Write
    expect(getByText('Edit File')).toBeTruthy();    // Edit
  });

  it('shows section headers', () => {
    const { getByText } = render(<PermissionsScreen />);

    expect(getByText('Sensitive Tools')).toBeTruthy();
    expect(getByText('Read-Only & Safe Tools')).toBeTruthy();
    // "Trusted Commands" only visible when Bash action is 'ask' (default)
    expect(getByText('Trusted Commands')).toBeTruthy();
  });

  it('shows "Ask" badges for dangerous tools by default', () => {
    const { getAllByText } = render(<PermissionsScreen />);

    // Dangerous tools (Bash, Write, Edit, NotebookEdit) default to 'ask'
    const askBadges = getAllByText('Ask');
    expect(askBadges.length).toBeGreaterThanOrEqual(3);
  });

  it('shows safe tools section with "Auto" badges when expanded', () => {
    const { getByText, getAllByText } = render(<PermissionsScreen />);

    // Safe tools are collapsed by default — expand them
    fireEvent.press(getByText('Read-Only & Safe Tools'));

    const autoBadges = getAllByText('Auto');
    expect(autoBadges.length).toBeGreaterThan(5);
  });

  it('renders the reset to defaults button', () => {
    const { getByText } = render(<PermissionsScreen />);
    expect(getByText('Reset to Defaults')).toBeTruthy();
  });

  it('renders trusted commands hint text', () => {
    const { getByText } = render(<PermissionsScreen />);
    expect(getByText(/terminal commands skip approval/)).toBeTruthy();
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
