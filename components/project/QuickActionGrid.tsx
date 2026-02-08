import { memo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Play, BarChart3, Lightbulb, CheckSquare, Zap } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { colors } from '@/theme/colors';

export interface QuickAction {
  id: 'continue' | 'status_check' | 'brainstorm' | 'view_todos';
  label: string;
  icon: typeof Play;
  accentColor: string;
  usesTokens: boolean;
  disabled?: boolean;
  disabledReason?: string;
}

const DEFAULT_ACTIONS: QuickAction[] = [
  {
    id: 'continue',
    label: 'Continue',
    icon: Play,
    accentColor: colors.success[300],
    usesTokens: false,
  },
  {
    id: 'status_check',
    label: 'Status Check',
    icon: BarChart3,
    accentColor: colors.primary[400],
    usesTokens: true,
  },
  {
    id: 'brainstorm',
    label: 'Brainstorm',
    icon: Lightbulb,
    accentColor: colors.warning[300],
    usesTokens: true,
  },
  {
    id: 'view_todos',
    label: 'View Todos',
    icon: CheckSquare,
    accentColor: '#58a6ff',
    usesTokens: false,
  },
];

interface QuickActionGridProps {
  onAction: (actionId: QuickAction['id']) => void;
  disabled?: boolean;
  disabledReason?: string;
  hasMostRecentSession?: boolean;
  hasTasks?: boolean;
}

const ActionCard = memo(({
  action,
  onPress,
  globalDisabled,
  globalDisabledReason,
}: {
  action: QuickAction;
  onPress: (id: QuickAction['id']) => void;
  globalDisabled?: boolean;
  globalDisabledReason?: string;
}) => {
  const { theme } = useTheme();
  const isDisabled = globalDisabled || action.disabled;
  const Icon = action.icon;

  const handlePress = useCallback(() => {
    if (isDisabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(action.id);
  }, [action.id, onPress, isDisabled]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={isDisabled}
      style={[
        styles.actionCard,
        {
          backgroundColor: theme.backgroundSecondary,
          borderColor: isDisabled ? theme.backgroundTertiary : action.accentColor + '30',
          opacity: isDisabled ? 0.5 : 1,
        },
      ]}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: action.accentColor + '18' }]}>
        <Icon size={20} color={isDisabled ? theme.textTertiary : action.accentColor} />
      </View>
      <Text
        style={[styles.actionLabel, { color: isDisabled ? theme.textTertiary : theme.text }]}
        numberOfLines={1}
      >
        {action.label}
      </Text>
      {action.usesTokens && (
        <View style={styles.tokenIndicator}>
          <Zap size={10} color={theme.textTertiary} />
        </View>
      )}
    </TouchableOpacity>
  );
});

export const QuickActionGrid = memo(({
  onAction,
  disabled,
  disabledReason,
  hasMostRecentSession = true,
  hasTasks = false,
}: QuickActionGridProps) => {
  const actions = DEFAULT_ACTIONS.map((action) => {
    if (action.id === 'continue' && !hasMostRecentSession) {
      return { ...action, disabled: true, disabledReason: 'No recent session' };
    }
    return action;
  });

  return (
    <View style={styles.grid}>
      <View style={styles.row}>
        {actions.slice(0, 2).map((action) => (
          <ActionCard
            key={action.id}
            action={action}
            onPress={onAction}
            globalDisabled={disabled}
            globalDisabledReason={disabledReason}
          />
        ))}
      </View>
      <View style={styles.row}>
        {actions.slice(2, 4).map((action) => (
          <ActionCard
            key={action.id}
            action={action}
            onPress={onAction}
            globalDisabled={disabled}
            globalDisabledReason={disabledReason}
          />
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  grid: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  actionCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
    gap: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  tokenIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
});

export default QuickActionGrid;
