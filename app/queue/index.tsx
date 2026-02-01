import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import {
  ChevronLeft,
  ListOrdered,
  Clock,
  Play,
  Settings,
} from 'lucide-react-native';
import { colors } from '@/theme/colors';
import { useQueueStore } from '@/stores/queue.store';
import { QueueItemCard } from '@/components/queue/QueueItemCard';
import { QueueScheduleConfig } from '@/components/queue/QueueScheduleConfig';
import { alert } from '@/components/ui/AlertModal';

export default function QueueScreen() {
  const {
    queueItems,
    schedule,
    pendingCount,
    isLoading,
    fetchQueue,
    fetchSchedule,
    updateSchedule,
    cancelItem,
    executeItem,
    executeNext,
  } = useQueueStore();

  const [showCompleted, setShowCompleted] = useState(false);
  const [showScheduleConfig, setShowScheduleConfig] = useState(false);

  useEffect(() => {
    fetchQueue(showCompleted);
    fetchSchedule();
  }, [showCompleted]);

  const handleExecuteItem = async (itemId: string) => {
    const confirmed = await alert.confirm(
      'Execute Prompt',
      'Execute this queued prompt now?',
      { confirmText: 'Execute' },
    );
    if (confirmed) {
      executeItem(itemId);
    }
  };

  const handleCancelItem = async (itemId: string) => {
    const confirmed = await alert.confirm(
      'Cancel Prompt',
      'Are you sure you want to cancel this queued prompt?',
      { confirmText: 'Cancel', destructive: true },
    );
    if (confirmed) {
      cancelItem(itemId);
    }
  };

  const handleExecuteNext = async () => {
    if (pendingCount === 0) {
      alert.show('No Pending Items', 'There are no items in the queue to execute.');
      return;
    }
    executeNext();
  };

  const pendingItems = queueItems.filter((i) =>
    ['PENDING', 'SCHEDULED', 'EXECUTING'].includes(i.status),
  );
  const completedItems = queueItems.filter((i) =>
    ['COMPLETED', 'FAILED', 'CANCELLED'].includes(i.status),
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: colors.dark[800] },
          headerTintColor: colors.dark[50],
          headerTitle: 'Prompt Queue',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ChevronLeft size={24} color={colors.dark[50]} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={() => setShowScheduleConfig(!showScheduleConfig)}
              style={styles.settingsButton}
            >
              <Settings size={20} color={colors.dark[300]} />
            </TouchableOpacity>
          ),
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={() => {
                fetchQueue(showCompleted);
                fetchSchedule();
              }}
            />
          }
        >
          {/* Summary */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryIcon}>
              <ListOrdered size={24} color={colors.primary[400]} />
            </View>
            <View style={styles.summaryContent}>
              <Text style={styles.summaryTitle}>
                {pendingCount} Pending {pendingCount === 1 ? 'Prompt' : 'Prompts'}
              </Text>
              <Text style={styles.summarySubtitle}>
                {schedule?.enabled
                  ? `Scheduled for ${schedule.scheduledTime}`
                  : 'No schedule set'}
              </Text>
            </View>
            {pendingCount > 0 && (
              <TouchableOpacity style={styles.executeButton} onPress={handleExecuteNext}>
                <Play size={16} color="#fff" />
              </TouchableOpacity>
            )}
          </View>

          {/* Schedule config (collapsible) */}
          {showScheduleConfig && (
            <View style={styles.section}>
              <QueueScheduleConfig schedule={schedule} onUpdate={updateSchedule} />
            </View>
          )}

          {/* Pending items */}
          {pendingItems.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pending</Text>
              <View style={styles.itemsList}>
                {pendingItems.map((item) => (
                  <QueueItemCard
                    key={item.id}
                    item={item}
                    onExecute={() => handleExecuteItem(item.id)}
                    onCancel={() => handleCancelItem(item.id)}
                  />
                ))}
              </View>
            </View>
          )}

          {/* Show completed toggle */}
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Show completed</Text>
            <Switch
              value={showCompleted}
              onValueChange={setShowCompleted}
              trackColor={{ false: colors.dark[500], true: colors.primary[500] }}
              thumbColor={showCompleted ? '#fff' : colors.dark[200]}
            />
          </View>

          {/* Completed items */}
          {showCompleted && completedItems.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>History</Text>
              <View style={styles.itemsList}>
                {completedItems.map((item) => (
                  <QueueItemCard key={item.id} item={item} />
                ))}
              </View>
            </View>
          )}

          {/* Empty state */}
          {queueItems.length === 0 && (
            <View style={styles.emptyState}>
              <Clock size={48} color={colors.dark[500]} />
              <Text style={styles.emptyText}>No queued prompts</Text>
              <Text style={styles.emptySubtext}>
                Prompts will appear here when you hit a rate limit
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark[800],
  },
  backButton: {
    marginLeft: 8,
  },
  settingsButton: {
    marginRight: 8,
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark[700],
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.dark[600],
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary[500] + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  summaryContent: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.dark[50],
    marginBottom: 2,
  },
  summarySubtitle: {
    fontSize: 13,
    color: colors.dark[400],
  },
  executeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark[300],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  itemsList: {
    gap: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    paddingHorizontal: 4,
  },
  toggleLabel: {
    fontSize: 15,
    color: colors.dark[300],
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.dark[300],
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.dark[400],
    marginTop: 4,
    textAlign: 'center',
  },
});
