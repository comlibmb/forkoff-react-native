import { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Terminal,
  Edit3,
  FileText,
  Search,
  Globe,
  Plus,
  X,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ListTodo,
  MessageSquare,
  Zap,
  ClipboardList,
  Eye,
} from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { usePermissionRulesStore, PermissionRule } from '@/stores/permission-rules.store';
import { alert } from '@/components/ui/AlertModal';

// --------------------------------------------------------------------------
// Tool metadata — friendly names, descriptions, icons, categories
// --------------------------------------------------------------------------

interface ToolMeta {
  label: string;
  description: string;
  icon: any;
  category: 'file' | 'terminal' | 'search' | 'task' | 'other';
}

const TOOL_META: Record<string, ToolMeta> = {
  Bash:            { label: 'Terminal',      description: 'Run shell commands',                icon: Terminal,      category: 'terminal' },
  Write:           { label: 'Write File',    description: 'Create new files',                  icon: Edit3,         category: 'file' },
  Edit:            { label: 'Edit File',     description: 'Modify existing files',             icon: Edit3,         category: 'file' },
  NotebookEdit:    { label: 'Notebook Edit', description: 'Edit Jupyter notebooks',            icon: Edit3,         category: 'file' },
  Read:            { label: 'Read File',     description: 'View file contents',                icon: FileText,      category: 'file' },
  Glob:            { label: 'Find Files',    description: 'Search files by pattern',           icon: Search,        category: 'search' },
  Grep:            { label: 'Search Code',   description: 'Search inside files',               icon: Search,        category: 'search' },
  WebSearch:       { label: 'Web Search',    description: 'Search the internet',               icon: Globe,         category: 'search' },
  WebFetch:        { label: 'Fetch URL',     description: 'Read web pages',                    icon: Globe,         category: 'search' },
  TaskCreate:      { label: 'Create Task',   description: 'Add to task list',                  icon: ListTodo,      category: 'task' },
  TaskUpdate:      { label: 'Update Task',   description: 'Change task status',                icon: ListTodo,      category: 'task' },
  TaskGet:         { label: 'Get Task',      description: 'Read task details',                 icon: ClipboardList, category: 'task' },
  TaskList:        { label: 'List Tasks',    description: 'View all tasks',                    icon: ClipboardList, category: 'task' },
  TaskOutput:      { label: 'Task Output',   description: 'Read task results',                 icon: ClipboardList, category: 'task' },
  TaskStop:        { label: 'Stop Task',     description: 'Cancel a running task',             icon: ListTodo,      category: 'task' },
  AskUserQuestion: { label: 'Ask Question',  description: 'Prompt you for input',              icon: MessageSquare, category: 'other' },
  Skill:           { label: 'Skill',         description: 'Run a skill command',               icon: Zap,           category: 'other' },
  EnterPlanMode:   { label: 'Plan Mode',     description: 'Enter planning mode',               icon: ClipboardList, category: 'other' },
  ExitPlanMode:    { label: 'Exit Plan',     description: 'Submit plan for approval',          icon: ClipboardList, category: 'other' },
  'mcp__ide__getDiagnostics': { label: 'IDE Diagnostics', description: 'Check for errors',    icon: Eye,           category: 'other' },
  'mcp__ide__executeCode':    { label: 'IDE Execute',     description: 'Run code in IDE',     icon: Zap,           category: 'other' },
};

function getMeta(tool: string): ToolMeta {
  return TOOL_META[tool] || { label: tool, description: '', icon: Shield, category: 'other' as const };
}

function isToolDangerous(tool: string): boolean {
  return ['Bash', 'Write', 'Edit', 'NotebookEdit'].includes(tool);
}

// --------------------------------------------------------------------------
// Component
// --------------------------------------------------------------------------

export default function PermissionsScreen() {
  const { theme } = useTheme();
  const { rules, updateRule, resetToDefaults } = usePermissionRulesStore();
  const [newPattern, setNewPattern] = useState('');
  const [showSafeTools, setShowSafeTools] = useState(false);
  const styles = useMemo(() => createStyles(theme), [theme]);

  const reviewTools = rules.filter((r) => isToolDangerous(r.tool));
  const safeTools = rules.filter((r) => !isToolDangerous(r.tool));

  const bashRule = rules.find((r) => r.tool === 'Bash');

  const handleToggle = (tool: string, currentAction: 'allow' | 'ask') => {
    const newAction = currentAction === 'allow' ? 'ask' : 'allow';
    updateRule(tool, newAction);
  };

  const handleAddPattern = () => {
    const pattern = newPattern.trim();
    if (!pattern || !bashRule) return;
    const existing = bashRule.patterns || [];
    if (existing.includes(pattern)) return;
    updateRule('Bash', bashRule.action, [...existing, pattern]);
    setNewPattern('');
  };

  const handleRemovePattern = (pattern: string) => {
    if (!bashRule) return;
    const existing = bashRule.patterns || [];
    updateRule('Bash', bashRule.action, existing.filter((p) => p !== pattern));
  };

  const handleReset = async () => {
    const confirmed = await new Promise<boolean>((resolve) => {
      alert.show(
        'Reset Permission Rules',
        'This will restore all rules to their default settings. Your custom patterns will be removed.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Reset', style: 'destructive', onPress: () => resolve(true) },
        ]
      );
    });
    if (confirmed) resetToDefaults();
  };

  // Summary counts
  const askCount = rules.filter(r => r.action === 'ask').length;
  const allowCount = rules.filter(r => r.action === 'allow').length;

  // Render a single tool row with tap-to-toggle
  const renderToolRow = (rule: PermissionRule, showDivider: boolean) => {
    const meta = getMeta(rule.tool);
    const Icon = meta.icon;
    const isAllowed = rule.action === 'allow';
    const isDangerous = isToolDangerous(rule.tool);

    return (
      <View key={rule.tool}>
        {showDivider && <View style={styles.divider} />}
        <TouchableOpacity
          style={styles.toolRow}
          onPress={() => handleToggle(rule.tool, rule.action)}
          activeOpacity={0.6}
        >
          <View style={[styles.toolIcon, {
            backgroundColor: isDangerous
              ? (isAllowed ? theme.success + '15' : theme.warning + '15')
              : theme.primary + '12',
          }]}>
            <Icon
              size={18}
              color={isDangerous ? (isAllowed ? theme.success : theme.warning) : theme.primary}
            />
          </View>

          <View style={styles.toolInfo}>
            <Text style={styles.toolName}>{meta.label}</Text>
            {meta.description ? (
              <Text style={styles.toolDesc}>{meta.description}</Text>
            ) : null}
          </View>

          {/* Status badge */}
          <View style={[styles.badge, isAllowed ? styles.badgeAllow : styles.badgeAsk]}>
            {isAllowed ? (
              <CheckCircle2 size={12} color={theme.success} />
            ) : (
              <AlertCircle size={12} color={theme.warning} />
            )}
            <Text style={[styles.badgeText, isAllowed ? styles.badgeTextAllow : styles.badgeTextAsk]}>
              {isAllowed ? 'Auto' : 'Ask'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tool Permissions</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>

        {/* Summary banner */}
        <View style={styles.summaryBanner}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <ShieldAlert size={16} color={theme.warning} />
              <Text style={styles.summaryCount}>{askCount}</Text>
              <Text style={styles.summaryLabel}>need approval</Text>
            </View>
            <View style={styles.summaryDot} />
            <View style={styles.summaryItem}>
              <ShieldCheck size={16} color={theme.success} />
              <Text style={styles.summaryCount}>{allowCount}</Text>
              <Text style={styles.summaryLabel}>auto-run</Text>
            </View>
          </View>
          <Text style={styles.summaryHint}>
            Tap a tool to toggle between asking you first or running automatically
          </Text>
        </View>

        {/* Sensitive tools — these are the ones users care about */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sensitive Tools</Text>
          <Text style={styles.sectionSubtitle}>
            These tools can modify your project
          </Text>
          <View style={styles.card}>
            {reviewTools.map((rule, i) => renderToolRow(rule, i > 0))}
          </View>
        </View>

        {/* Bash Auto-Approve Patterns */}
        {bashRule?.action === 'ask' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Trusted Commands</Text>
            <Text style={styles.sectionSubtitle}>
              These terminal commands skip approval. Use * as wildcard.
            </Text>
            <View style={styles.card}>
              {(bashRule.patterns || []).length === 0 && (
                <View style={styles.emptyPatterns}>
                  <Terminal size={20} color={theme.textTertiary} />
                  <Text style={styles.emptyText}>
                    No trusted commands yet
                  </Text>
                  <Text style={styles.emptyHint}>
                    Add patterns like "npm *" or "git status" to auto-approve matching commands
                  </Text>
                </View>
              )}
              {(bashRule.patterns || []).map((pattern, i) => (
                <View key={pattern}>
                  {i > 0 && <View style={styles.divider} />}
                  <View style={styles.patternRow}>
                    <Text style={styles.patternPrefix}>$</Text>
                    <Text style={styles.patternText}>{pattern}</Text>
                    <TouchableOpacity
                      onPress={() => handleRemovePattern(pattern)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={styles.patternRemove}
                    >
                      <X size={14} color={theme.textTertiary} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              <View style={styles.addPatternRow}>
                <TextInput
                  value={newPattern}
                  onChangeText={setNewPattern}
                  placeholder="e.g. npm test, git *"
                  placeholderTextColor={theme.textTertiary}
                  style={styles.patternInput}
                  onSubmitEditing={handleAddPattern}
                  returnKeyType="done"
                />
                <TouchableOpacity
                  onPress={handleAddPattern}
                  disabled={!newPattern.trim()}
                  style={[styles.addButton, !newPattern.trim() && styles.addButtonDisabled]}
                >
                  <Plus size={16} color={newPattern.trim() ? '#fff' : theme.textTertiary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Safe tools — collapsed by default */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.collapsibleHeader}
            onPress={() => setShowSafeTools(!showSafeTools)}
            activeOpacity={0.6}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Read-Only & Safe Tools</Text>
              <Text style={styles.sectionSubtitle}>
                {safeTools.length} tools that don't modify your project
              </Text>
            </View>
            {showSafeTools ? (
              <ChevronUp size={20} color={theme.textTertiary} />
            ) : (
              <ChevronDown size={20} color={theme.textTertiary} />
            )}
          </TouchableOpacity>
          {showSafeTools && (
            <View style={styles.card}>
              {safeTools.map((rule, i) => renderToolRow(rule, i > 0))}
            </View>
          )}
        </View>

        {/* Reset */}
        <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
          <RotateCcw size={14} color={theme.error} />
          <Text style={styles.resetText}>Reset to Defaults</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// --------------------------------------------------------------------------
// Styles
// --------------------------------------------------------------------------

function createStyles(theme: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    backButton: {
      padding: 4,
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: theme.text,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingBottom: 40,
    },

    // Summary banner
    summaryBanner: {
      backgroundColor: theme.backgroundSecondary,
      borderRadius: 12,
      padding: 16,
      marginTop: 16,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: theme.border,
    },
    summaryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginBottom: 8,
    },
    summaryItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    summaryCount: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
    },
    summaryLabel: {
      fontSize: 13,
      color: theme.textSecondary,
    },
    summaryDot: {
      width: 3,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: theme.textTertiary,
      marginHorizontal: 6,
    },
    summaryHint: {
      fontSize: 12,
      color: theme.textTertiary,
      textAlign: 'center',
      lineHeight: 16,
    },

    // Sections
    section: {
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 2,
    },
    sectionSubtitle: {
      fontSize: 12,
      color: theme.textTertiary,
      marginBottom: 10,
    },
    card: {
      backgroundColor: theme.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden',
    },

    // Tool rows
    toolRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 11,
      paddingHorizontal: 14,
    },
    toolIcon: {
      width: 34,
      height: 34,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    toolInfo: {
      flex: 1,
    },
    toolName: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
    },
    toolDesc: {
      fontSize: 11,
      color: theme.textTertiary,
      marginTop: 1,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.border,
      marginLeft: 58,
    },

    // Badge
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      gap: 4,
    },
    badgeAllow: {
      backgroundColor: theme.success + '15',
    },
    badgeAsk: {
      backgroundColor: theme.warning + '15',
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '600',
    },
    badgeTextAllow: {
      color: theme.success,
    },
    badgeTextAsk: {
      color: theme.warning,
    },

    // Bash patterns
    emptyPatterns: {
      alignItems: 'center',
      paddingVertical: 20,
      paddingHorizontal: 24,
      gap: 4,
    },
    emptyText: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.textSecondary,
      marginTop: 4,
    },
    emptyHint: {
      fontSize: 11,
      color: theme.textTertiary,
      textAlign: 'center',
      lineHeight: 16,
    },
    patternRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 10,
      gap: 6,
    },
    patternPrefix: {
      fontSize: 14,
      fontFamily: 'monospace',
      color: theme.success,
      fontWeight: '700',
      width: 16,
    },
    patternText: {
      flex: 1,
      fontFamily: 'monospace',
      fontSize: 13,
      color: theme.text,
    },
    patternRemove: {
      padding: 4,
      borderRadius: 4,
    },
    addPatternRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 10,
      gap: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.border,
    },
    patternInput: {
      flex: 1,
      backgroundColor: theme.background,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontFamily: 'monospace',
      fontSize: 13,
      color: theme.text,
      borderWidth: 1,
      borderColor: theme.border,
    },
    addButton: {
      width: 34,
      height: 34,
      borderRadius: 8,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addButtonDisabled: {
      backgroundColor: theme.backgroundSecondary,
    },

    // Collapsible
    collapsibleHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingBottom: 10,
    },

    // Reset
    resetButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 14,
      marginTop: 4,
      marginBottom: 32,
    },
    resetText: {
      fontSize: 14,
      color: theme.error,
      fontWeight: '500',
    },
  });
}
