/**
 * Tests for PermissionRulesStore
 *
 * Tests the Zustand store that manages user-configurable permission rules
 * for tool approval (which tools auto-approve vs require manual approval).
 */

import { usePermissionRulesStore, DEFAULT_RULES, PermissionRule } from '@/stores/permission-rules.store';

describe('PermissionRulesStore', () => {
  beforeEach(() => {
    // Reset to defaults before each test
    usePermissionRulesStore.getState().resetToDefaults();
  });

  describe('default rules', () => {
    it('has default rules matching SAFE_TOOLS', () => {
      const { rules } = usePermissionRulesStore.getState();
      expect(rules).toEqual(DEFAULT_RULES);
    });

    it('Read, Glob, Grep are auto-approved by default', () => {
      const { rules } = usePermissionRulesStore.getState();
      expect(rules.find((r) => r.tool === 'Read')?.action).toBe('allow');
      expect(rules.find((r) => r.tool === 'Glob')?.action).toBe('allow');
      expect(rules.find((r) => r.tool === 'Grep')?.action).toBe('allow');
    });

    it('Bash, Write, Edit require approval by default', () => {
      const { rules } = usePermissionRulesStore.getState();
      expect(rules.find((r) => r.tool === 'Bash')?.action).toBe('ask');
      expect(rules.find((r) => r.tool === 'Write')?.action).toBe('ask');
      expect(rules.find((r) => r.tool === 'Edit')?.action).toBe('ask');
    });

    it('Bash has empty patterns by default', () => {
      const { rules } = usePermissionRulesStore.getState();
      const bash = rules.find((r) => r.tool === 'Bash');
      expect(bash?.patterns).toEqual([]);
    });

    it('NotebookEdit requires approval by default', () => {
      const { rules } = usePermissionRulesStore.getState();
      expect(rules.find((r) => r.tool === 'NotebookEdit')?.action).toBe('ask');
    });
  });

  describe('updateRule', () => {
    it('changes a tool action from ask to allow', () => {
      usePermissionRulesStore.getState().updateRule('Write', 'allow');
      const { rules } = usePermissionRulesStore.getState();
      expect(rules.find((r) => r.tool === 'Write')?.action).toBe('allow');
    });

    it('changes a tool action from allow to ask', () => {
      usePermissionRulesStore.getState().updateRule('Read', 'ask');
      const { rules } = usePermissionRulesStore.getState();
      expect(rules.find((r) => r.tool === 'Read')?.action).toBe('ask');
    });

    it('updates Bash patterns', () => {
      usePermissionRulesStore.getState().updateRule('Bash', 'allow', ['npm *', 'git status']);
      const { rules } = usePermissionRulesStore.getState();
      const bash = rules.find((r) => r.tool === 'Bash');
      expect(bash?.action).toBe('allow');
      expect(bash?.patterns).toEqual(['npm *', 'git status']);
    });

    it('does not affect other rules', () => {
      const before = usePermissionRulesStore.getState().rules.find((r) => r.tool === 'Read');
      usePermissionRulesStore.getState().updateRule('Write', 'allow');
      const after = usePermissionRulesStore.getState().rules.find((r) => r.tool === 'Read');
      expect(after).toEqual(before);
    });
  });

  describe('setRules', () => {
    it('replaces all rules', () => {
      const newRules: PermissionRule[] = [
        { tool: 'Read', action: 'ask' },
        { tool: 'Bash', action: 'allow', patterns: ['ls *'] },
      ];
      usePermissionRulesStore.getState().setRules(newRules);
      const { rules } = usePermissionRulesStore.getState();
      expect(rules).toEqual(newRules);
    });
  });

  describe('resetToDefaults', () => {
    it('restores default rules after modifications', () => {
      // Modify rules
      usePermissionRulesStore.getState().updateRule('Write', 'allow');
      usePermissionRulesStore.getState().updateRule('Bash', 'allow', ['npm *']);

      // Verify they changed
      expect(usePermissionRulesStore.getState().rules.find((r) => r.tool === 'Write')?.action).toBe('allow');

      // Reset
      usePermissionRulesStore.getState().resetToDefaults();
      const { rules } = usePermissionRulesStore.getState();
      expect(rules).toEqual(DEFAULT_RULES);
      expect(rules.find((r) => r.tool === 'Write')?.action).toBe('ask');
      expect(rules.find((r) => r.tool === 'Bash')?.patterns).toEqual([]);
    });
  });
});
