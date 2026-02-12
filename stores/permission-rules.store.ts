import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PermissionRule {
  tool: string;
  action: 'allow' | 'ask';
  patterns?: string[]; // For Bash: command patterns that auto-approve (e.g. 'npm test', 'git *')
}

export const DEFAULT_RULES: PermissionRule[] = [
  // Auto-approved (safe, read-only tools)
  { tool: 'Read', action: 'allow' },
  { tool: 'Glob', action: 'allow' },
  { tool: 'Grep', action: 'allow' },
  { tool: 'WebSearch', action: 'allow' },
  { tool: 'WebFetch', action: 'allow' },
  { tool: 'TaskCreate', action: 'allow' },
  { tool: 'TaskUpdate', action: 'allow' },
  { tool: 'TaskGet', action: 'allow' },
  { tool: 'TaskList', action: 'allow' },
  { tool: 'TaskOutput', action: 'allow' },
  { tool: 'TaskStop', action: 'allow' },
  { tool: 'AskUserQuestion', action: 'allow' },
  { tool: 'Skill', action: 'allow' },
  { tool: 'EnterPlanMode', action: 'allow' },
  { tool: 'ExitPlanMode', action: 'allow' },
  { tool: 'mcp__ide__getDiagnostics', action: 'allow' },
  { tool: 'mcp__ide__executeCode', action: 'allow' },
  // Require approval (dangerous tools)
  { tool: 'Bash', action: 'ask', patterns: [] },
  { tool: 'Write', action: 'ask' },
  { tool: 'Edit', action: 'ask' },
  { tool: 'NotebookEdit', action: 'ask' },
];

interface PermissionRulesState {
  rules: PermissionRule[];
  setRules: (rules: PermissionRule[]) => void;
  updateRule: (tool: string, action: 'allow' | 'ask', patterns?: string[]) => void;
  resetToDefaults: () => void;
}

export const usePermissionRulesStore = create<PermissionRulesState>()(
  persist(
    (set, get) => ({
      rules: DEFAULT_RULES,

      setRules: (rules: PermissionRule[]) => {
        set({ rules });
      },

      updateRule: (tool: string, action: 'allow' | 'ask', patterns?: string[]) => {
        set({
          rules: get().rules.map((r) =>
            r.tool === tool
              ? { ...r, action, ...(patterns !== undefined ? { patterns } : {}) }
              : r
          ),
        });
      },

      resetToDefaults: () => {
        set({ rules: DEFAULT_RULES });
      },
    }),
    {
      name: 'permission-rules-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default usePermissionRulesStore;
