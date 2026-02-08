import { memo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MessageSquare, Clock, ChevronRight } from 'lucide-react-native';
import { ClaudeSession } from '@/types';
import { useTheme } from '@/theme/ThemeProvider';

/** Returns a display name for a session, with fallback chain: name -> directory -> sessionKey */
export const getSessionDisplayName = (session: ClaudeSession): { label: string; isName: boolean } => {
  if (session.name && !/^\[request interrupted|^\[tool/i.test(session.name)) {
    return { label: session.name, isName: true };
  }
  const dirName = session.directory?.split(/[/\\]/).filter(Boolean).pop();
  if (dirName) {
    return { label: dirName, isName: false };
  }
  return { label: session.sessionKey, isName: false };
};

export const formatTimeAgo = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

export const SessionListItem = memo(({
  session,
  deviceId,
  isLast,
  onPress,
}: {
  session: ClaudeSession;
  deviceId: string;
  isLast: boolean;
  onPress: (deviceId: string, session: ClaudeSession) => void;
}) => {
  const { theme } = useTheme();
  const isActive = session.state?.toUpperCase() === 'ACTIVE';
  const display = getSessionDisplayName(session);

  const handlePress = useCallback(() => {
    onPress(deviceId, session);
  }, [deviceId, session, onPress]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[
        styles.sessionItem,
        !isLast && { borderBottomWidth: 1, borderBottomColor: theme.backgroundSecondary },
      ]}
    >
      <View style={styles.sessionContent}>
        <View
          style={[
            styles.sessionIcon,
            {
              backgroundColor: theme.backgroundSecondary,
              borderColor: theme.backgroundTertiary,
            },
          ]}
        >
          <MessageSquare
            size={14}
            color={isActive ? theme.primary : theme.textTertiary}
          />
        </View>
        <View style={styles.sessionInfo}>
          <View style={styles.sessionTitleRow}>
            {isActive && (
              <View style={[styles.activeDotSmall, { backgroundColor: theme.primary }]} />
            )}
            <Text
              style={[styles.sessionKey, { color: display.isName ? theme.text : theme.textSecondary }]}
              numberOfLines={1}
            >
              {display.label}
            </Text>
          </View>
          <View style={styles.sessionMeta}>
            <Clock size={10} color={theme.border} />
            <Text style={[styles.sessionTime, { color: theme.border }]}>
              {formatTimeAgo(session.lastUsedAt)}
            </Text>
            {isActive && (
              <>
                <Text style={[styles.metaDot, { color: theme.backgroundTertiary }]}>
                  {'\u2022'}
                </Text>
                <Text style={[styles.activeLabel, { color: theme.primary }]}>Active</Text>
              </>
            )}
          </View>
        </View>
      </View>
      <ChevronRight size={16} color={theme.border} />
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  sessionItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sessionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sessionIcon: {
    width: 32,
    height: 32,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  sessionKey: {
    fontSize: 14,
    fontFamily: 'monospace',
  },
  sessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  sessionTime: {
    fontSize: 12,
    marginLeft: 4,
  },
  metaDot: {
    marginHorizontal: 8,
  },
  activeLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default SessionListItem;
