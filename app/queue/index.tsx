import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
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
import { useTheme } from '@/theme/ThemeProvider';
import { useQueueStore } from '@/stores/queue.store';
import { QueueItemCard } from '@/components/queue/QueueItemCard';
import { QueueScheduleConfig } from '@/components/queue/QueueScheduleConfig';
import { alert } from '@/components/ui/AlertModal';

export default function QueueScreen() {
  const { theme } = useTheme();
  const {
    queueItems,
    schedule,
    pendingCount,
    isLoading,
    error,
    fetchQueue,
    fetchSchedule,
    updateSchedule,
    cancelItem,
    executeItem,
    executeNext,
    clearError,
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
      await executeItem(itemId);
    }
  };

  // Show error alert when error occurs
  useEffect(() => {
    if (error) {
      alert.error('Execution Failed', error);
      clearError();
    }
  }, [error, clearError]);

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
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
          headerTitle: 'Prompt Queue',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 8 }}>
              <ChevronLeft size={24} color={theme.text} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={() => setShowScheduleConfig(!showScheduleConfig)}
              style={{ marginRight: 8, padding: 4 }}
            >
              <Settings size={20} color={theme.textTertiary} />
            </TouchableOpacity>
          ),
        }}
      />
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['bottom']}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
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
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: theme.card,
              padding: 16,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.backgroundTertiary,
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                backgroundColor: theme.primary + '20',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}
            >
              <ListOrdered size={24} color={theme.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: '600',
                  color: theme.text,
                  marginBottom: 2,
                }}
              >
                {pendingCount} Pending {pendingCount === 1 ? 'Prompt' : 'Prompts'}
              </Text>
              <Text style={{ fontSize: 13, color: theme.textSecondary }}>
                {schedule?.enabled
                  ? `Scheduled for ${schedule.scheduledTime}`
                  : 'No schedule set'}
              </Text>
            </View>
            {pendingCount > 0 && (
              <TouchableOpacity
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: theme.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onPress={handleExecuteNext}
              >
                <Play size={16} color="#fff" />
              </TouchableOpacity>
            )}
          </View>

          {/* Schedule config (collapsible) */}
          {showScheduleConfig && (
            <View style={{ marginTop: 24 }}>
              <QueueScheduleConfig schedule={schedule} onUpdate={updateSchedule} />
            </View>
          )}

          {/* Pending items */}
          {pendingItems.length > 0 && (
            <View style={{ marginTop: 24 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: theme.textTertiary,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  marginBottom: 12,
                }}
              >
                Pending
              </Text>
              <View style={{ gap: 12 }}>
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
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 24,
              paddingHorizontal: 4,
            }}
          >
            <Text style={{ fontSize: 15, color: theme.textTertiary }}>Show completed</Text>
            <Switch
              value={showCompleted}
              onValueChange={setShowCompleted}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor={showCompleted ? '#fff' : theme.textSecondary}
            />
          </View>

          {/* Completed items */}
          {showCompleted && completedItems.length > 0 && (
            <View style={{ marginTop: 24 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: theme.textTertiary,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  marginBottom: 12,
                }}
              >
                History
              </Text>
              <View style={{ gap: 12 }}>
                {completedItems.map((item) => (
                  <QueueItemCard key={item.id} item={item} />
                ))}
              </View>
            </View>
          )}

          {/* Empty state */}
          {queueItems.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 64 }}>
              <Clock size={48} color={theme.border} />
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: '600',
                  color: theme.textTertiary,
                  marginTop: 16,
                }}
              >
                No queued prompts
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: theme.textSecondary,
                  marginTop: 4,
                  textAlign: 'center',
                }}
              >
                Prompts will appear here when you hit a rate limit
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
