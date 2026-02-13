import { getActivityFromTool, getActivityDetail } from '@/components/claude/StatusBar';

describe('StatusBar', () => {
  describe('getActivityFromTool', () => {
    it('returns planning for EnterPlanMode', () => {
      expect(getActivityFromTool('EnterPlanMode')).toBe('planning');
    });

    it('returns planning for ExitPlanMode', () => {
      expect(getActivityFromTool('ExitPlanMode')).toBe('planning');
    });

    it('returns reading for Read', () => {
      expect(getActivityFromTool('Read')).toBe('reading');
    });

    it('returns writing for Write', () => {
      expect(getActivityFromTool('Write')).toBe('writing');
    });

    it('returns editing for Edit', () => {
      expect(getActivityFromTool('Edit')).toBe('editing');
    });

    it('returns searching for Grep', () => {
      expect(getActivityFromTool('Grep')).toBe('searching');
    });

    it('returns searching for Glob', () => {
      expect(getActivityFromTool('Glob')).toBe('searching');
    });

    it('returns running for Bash', () => {
      expect(getActivityFromTool('Bash')).toBe('running');
    });

    it('returns formulating for TaskCreate', () => {
      expect(getActivityFromTool('TaskCreate')).toBe('formulating');
    });

    it('returns responding for unknown tools', () => {
      expect(getActivityFromTool('WebFetch')).toBe('responding');
    });
  });

  describe('getActivityDetail', () => {
    it('extracts file name for Read', () => {
      expect(getActivityDetail('Read', { file_path: '/src/app.tsx' })).toBe('app.tsx');
    });

    it('extracts pattern for Grep', () => {
      expect(getActivityDetail('Grep', { pattern: 'TODO' })).toBe('TODO');
    });

    it('extracts command for Bash', () => {
      expect(getActivityDetail('Bash', { command: 'npm test' })).toBe('npm test');
    });

    it('truncates long bash commands', () => {
      const longCmd = 'x'.repeat(50);
      const result = getActivityDetail('Bash', { command: longCmd });
      expect(result).toBe('x'.repeat(30) + '...');
    });
  });
});
