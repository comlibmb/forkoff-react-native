import { useEffect, useCallback } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PostHogProvider } from 'posthog-react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '@/stores/auth.store';
import { useApprovalStore } from '@/stores/approval.store';
import { useConnectionStore } from '@/stores/connection.store';
import { useVersionStore } from '@/stores/version.store';
import { useAchievementsStore } from '@/stores/achievements.store';
import { useQueueStore } from '@/stores/queue.store';
import { useThemeStore } from '@/stores/theme.store';
import { wsService } from '@/services/websocket.service';
import { notificationService } from '@/services/notification.service';
import { sentryService } from '@/services/sentry.service';
import { analyticsService } from '@/services/analytics.service';
import { ClaudeApproval } from '@/components/claude/PermissionRequest';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ScreenTracker } from '@/components/ScreenTracker';
import { PostHogBridge } from '@/components/PostHogBridge';
import { AlertProvider } from '@/components/ui/AlertModal';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { ConnectionToast } from '@/components/ui/ConnectionToast';
import { UpdateRequiredModal } from '@/components/ui/UpdateRequiredModal';
import { AchievementUnlockModal } from '@/components/achievements/AchievementUnlockModal';
import { ThemeProvider } from '@/theme/ThemeProvider';
import '../global.css';

// Initialize Sentry FIRST to catch all errors
sentryService.init();

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

export default function RootLayout() {
  const router = useRouter();
  const { initialize, isInitialized, isAuthenticated, user } = useAuthStore();
  const {
    currentApproval,
    hideApproval,
    respondToApproval,
    subscribeToApprovals,
  } = useApprovalStore();
  const { initialize: initializeConnection } = useConnectionStore();
  const { needsUpdate, checkVersion } = useVersionStore();
  const { recentUnlock, setRecentUnlock } = useAchievementsStore();
  const { addQueueItem, updateQueueItem, updatePendingCount } = useQueueStore();
  const { isDark } = useThemeStore();

  // Handle notification tap - navigate to approval or session
  const handleNotificationTap = useCallback((response: Notifications.NotificationResponse) => {
    const data = response.notification.request.content.data;

    if (data?.type === 'claude_approval' && data?.approvalId) {
      // For approval notifications, the modal will already be shown via WebSocket
      // Just navigate to the session if we have a sessionKey
      if (data.sessionKey) {
        router.push(`/claude/session/${data.sessionKey}`);
      }
    }
  }, [router]);

  useEffect(() => {
    async function initializeApp() {
      try {
        // Initialize auth
        await initialize();

        // Initialize notifications
        await notificationService.initialize();

        // Connect WebSocket if authenticated
        if (isAuthenticated) {
          await wsService.connect();

          // Register for push notifications
          await notificationService.registerForPushNotifications();
        }

        // Track app opened
        analyticsService.track('app_opened');
      } catch (error) {
        console.error('Failed to initialize app:', error);
        sentryService.captureException(error, { context: 'app_initialization' });
      } finally {
        // Hide splash screen
        await SplashScreen.hideAsync();
      }
    }

    initializeApp();
  }, [initialize]);

  // Identify user in analytics/sentry when auth state changes
  useEffect(() => {
    if (user) {
      sentryService.setUser({
        id: user.id,
        email: user.email,
        name: user.name,
      });
      analyticsService.identify(user.id, {
        email: user.email,
        name: user.name,
      });
    } else {
      sentryService.setUser(null);
      analyticsService.reset();
    }
  }, [user]);

  // Connect/disconnect WebSocket based on auth state
  useEffect(() => {
    if (isInitialized) {
      if (isAuthenticated) {
        wsService.connect();

        // Register for push notifications when authenticated
        notificationService.registerForPushNotifications();
      } else {
        wsService.disconnect();
      }
    }
  }, [isAuthenticated, isInitialized]);

  // Subscribe to approval events when WebSocket is connected
  useEffect(() => {
    if (isAuthenticated && isInitialized) {
      const unsubscribe = subscribeToApprovals();
      return () => unsubscribe();
    }
  }, [isAuthenticated, isInitialized, subscribeToApprovals]);

  // Subscribe to achievement and queue events
  useEffect(() => {
    if (isAuthenticated && isInitialized) {
      // Achievement unlocked
      const unsubAchievement = wsService.on('achievement_unlocked', (data) => {
        setRecentUnlock(data.achievement as any);
      });

      // Prompt queued
      const unsubQueued = wsService.on('prompt_queued', (data) => {
        addQueueItem({
          id: data.queueItemId,
          userId: user?.id || '',
          deviceId: data.deviceId,
          sessionKey: data.sessionKey || null,
          prompt: data.prompt,
          status: 'PENDING',
          priority: 0,
          rateLimitReason: data.rateLimitReason || null,
          retryAfter: data.retryAfter || null,
          scheduledFor: null,
          executedAt: null,
          errorMessage: null,
          createdAt: data.createdAt,
          updatedAt: data.createdAt,
        });
      });

      // Queue item executed
      const unsubExecuted = wsService.on('queue_item_executed', (data) => {
        updateQueueItem(data.queueItemId, {
          status: data.success ? 'COMPLETED' : 'FAILED',
          errorMessage: data.errorMessage || null,
          executedAt: data.executedAt,
        });
      });

      // Queue updated
      const unsubUpdated = wsService.on('queue_updated', (data) => {
        updatePendingCount(data.pendingCount);
      });

      return () => {
        unsubAchievement();
        unsubQueued();
        unsubExecuted();
        unsubUpdated();
      };
    }
  }, [isAuthenticated, isInitialized, user, setRecentUnlock, addQueueItem, updateQueueItem, updatePendingCount]);

  // Initialize connection monitoring
  useEffect(() => {
    const cleanup = initializeConnection();
    return cleanup;
  }, [initializeConnection]);

  // Check version when app starts and after auth
  useEffect(() => {
    if (isInitialized) {
      checkVersion();
    }
  }, [isInitialized, checkVersion]);

  // Handle notification responses (when user taps a notification)
  useEffect(() => {
    // Check if app was opened from a notification
    notificationService.getLastNotificationResponse().then((response) => {
      if (response) {
        handleNotificationTap(response);
      }
    });

    // Listen for notification taps while app is running
    const subscription = notificationService.addNotificationResponseListener(handleNotificationTap);

    return () => subscription.remove();
  }, [handleNotificationTap]);

  // Handle approval response
  const handleApprovalRespond = useCallback((approvalId: string, response: string) => {
    respondToApproval(approvalId, response);
  }, [respondToApproval]);

  if (!isInitialized) {
    return null;
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <PostHogProvider
          apiKey="phc_jZavcKj34gXjF0rNrSUbZYEvsTKOpPMiB2HNuBZ8YXm"
          options={{
            host: 'https://us.i.posthog.com',
          }}
        >
          <PostHogBridge>
            <AlertProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <QueryClientProvider client={queryClient}>
                  <ScreenTracker>
                  <StatusBar style={isDark ? 'light' : 'dark'} />
                  <Stack
                    screenOptions={{
                      headerShown: false,
                      contentStyle: { backgroundColor: isDark ? '#0d1117' : '#ffffff' },
                      animation: 'fade',
                    }}
                  >
                  <Stack.Screen name="index" />
                  <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
                  <Stack.Screen name="(onboarding)" options={{ animation: 'slide_from_right' }} />
                  <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
                  <Stack.Screen
                    name="device/[id]"
                    options={{
                      animation: 'slide_from_right',
                      presentation: 'card',
                    }}
                  />
                  <Stack.Screen
                    name="device/pair"
                    options={{
                      animation: 'slide_from_bottom',
                      presentation: 'modal',
                    }}
                  />
                  <Stack.Screen
                    name="chat/[sessionId]"
                    options={{
                      animation: 'slide_from_right',
                      presentation: 'card',
                    }}
                  />
                  <Stack.Screen
                    name="terminal/[sessionId]"
                    options={{
                      animation: 'slide_from_bottom',
                      presentation: 'modal',
                    }}
                  />
                  <Stack.Screen
                    name="achievements/index"
                    options={{
                      animation: 'slide_from_right',
                      presentation: 'card',
                    }}
                  />
                  <Stack.Screen
                    name="queue/index"
                    options={{
                      animation: 'slide_from_right',
                      presentation: 'card',
                    }}
                  />
                </Stack>

                {/* Global Claude Approval Modal */}
                <ClaudeApproval
                  visible={!!currentApproval}
                  request={currentApproval}
                  onRespond={handleApprovalRespond}
                  onDismiss={hideApproval}
                />

                {/* Connection status components */}
                <OfflineBanner />
                <ConnectionToast />

                {/* Version update modal */}
                <UpdateRequiredModal visible={needsUpdate} />

                {/* Achievement unlock modal */}
                <AchievementUnlockModal
                  visible={!!recentUnlock}
                  achievement={recentUnlock}
                  onClose={() => setRecentUnlock(null)}
                />
                </ScreenTracker>
                </QueryClientProvider>
              </GestureHandlerRootView>
            </AlertProvider>
          </PostHogBridge>
        </PostHogProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
