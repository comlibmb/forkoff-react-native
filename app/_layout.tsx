import { useEffect, useCallback, useState, useRef } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PostHogProvider } from 'posthog-react-native';
import Constants from 'expo-constants';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/stores/auth.store';
import { useApprovalStore } from '@/stores/approval.store';
import { useConnectionStore } from '@/stores/connection.store';
import { useVersionStore } from '@/stores/version.store';
import { useAchievementsStore } from '@/stores/achievements.store';
import { useQueueStore } from '@/stores/queue.store';
import { useUsageStore } from '@/stores/usage.store';
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
import { LimitPaywallModal } from '@/components/subscription/LimitPaywallModal';
import { TutorialOverlay } from '@/components/tutorial/TutorialOverlay';
import { AnimatedSplash } from '@/components/splash/AnimatedSplash';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
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

function ThemedRoot({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.background }}>
      {children}
    </GestureHandlerRootView>
  );
}

// Separate component that uses theme context (must be inside ThemeProvider)
function ThemedApp({
  currentApproval,
  handleApprovalRespond,
  hideApproval,
  needsUpdate,
  recentUnlock,
  setRecentUnlock,
  showOnboardingPaywall,
  setShowOnboardingPaywall,
}: {
  currentApproval: any;
  handleApprovalRespond: (approvalId: string, response: string) => void;
  hideApproval: () => void;
  needsUpdate: boolean;
  recentUnlock: any;
  setRecentUnlock: (unlock: any) => void;
  showOnboardingPaywall: boolean;
  setShowOnboardingPaywall: (show: boolean) => void;
}) {
  const { isDark, theme } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.background },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
        <Stack.Screen name="(onboarding)" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen
          name="project-hub"
          options={{
            animation: 'slide_from_right',
            presentation: 'card',
          }}
        />
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

      {/* Onboarding paywall modal for new users */}
      <LimitPaywallModal
        visible={showOnboardingPaywall}
        onClose={() => setShowOnboardingPaywall(false)}
        limitType="onboarding"
      />

      {/* One-time guided tutorial overlay */}
      <TutorialOverlay />
    </>
  );
}

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
  const { fetchUsage } = useUsageStore();
  const [showOnboardingPaywall, setShowOnboardingPaywall] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

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
        // Native splash is now hidden by AnimatedSplash component
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
      analyticsService.setUserProperties({
        subscription_tier: user.subscription || 'free',
        app_version: Constants.expoConfig?.version,
        is_lifetime_pro: user.isLifetimePro || false,
      });

      // Fetch usage data
      fetchUsage();

      // Check if this is a new user who should see onboarding paywall
      const checkOnboardingPaywall = async () => {
        try {
          const paywallKey = `paywall_shown_${user.id}`;
          const hasSeenPaywall = await AsyncStorage.getItem(paywallKey);

          if (hasSeenPaywall) return;

          // Check if user was created within last 5 minutes
          const createdAt = new Date(user.createdAt).getTime();
          const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
          const isNewUser = createdAt > fiveMinutesAgo;

          if (isNewUser && user.subscription === 'free') {
            setShowOnboardingPaywall(true);
            await AsyncStorage.setItem(paywallKey, 'true');
            analyticsService.track('onboarding_paywall_shown');
          }
        } catch (error) {
          console.error('Failed to check onboarding paywall:', error);
        }
      };

      checkOnboardingPaywall();
    } else {
      sentryService.setUser(null);
      analyticsService.reset();
    }
  }, [user, fetchUsage]);

  // Connect/disconnect WebSocket based on auth state
  useEffect(() => {
    if (isInitialized) {
      if (isAuthenticated) {
        // Clear kicked flag on new login
        useConnectionStore.getState().setWasKicked(false);
        wsService.connect();

        // Register for push notifications when authenticated
        notificationService.registerForPushNotifications();
      } else {
        wsService.disconnect();
      }
    }
  }, [isAuthenticated, isInitialized]);

  // Handle session_claimed: another device logged in with this account
  const isHandlingKick = useRef(false);
  useEffect(() => {
    if (isAuthenticated && isInitialized) {
      const unsubscribe = wsService.on('session_claimed', async (data) => {
        if (isHandlingKick.current) return;
        isHandlingKick.current = true;

        // Mark as kicked to prevent auto-reconnect
        useConnectionStore.getState().setWasKicked(true);

        // Disconnect WebSocket immediately
        wsService.disconnect();

        // Alert the user
        const { alert } = await import('@/components/ui/AlertModal');
        alert.warning(
          'Session Ended',
          data.message || 'Your account was signed in on another device.',
        );

        // Sign out and navigate to login
        const { signOut } = useAuthStore.getState();
        await signOut();
        router.replace('/(auth)/login');
        isHandlingKick.current = false;
      });

      return () => unsubscribe();
    }
  }, [isAuthenticated, isInitialized, router]);

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
          apiKey={process.env.EXPO_PUBLIC_POSTHOG_API_KEY || ''}
          options={{
            host: 'https://us.i.posthog.com',
          }}
        >
          <PostHogBridge>
            <AlertProvider>
              <ThemedRoot>
                <QueryClientProvider client={queryClient}>
                  <ScreenTracker>
                  <ThemedApp
                    currentApproval={currentApproval}
                    handleApprovalRespond={handleApprovalRespond}
                    hideApproval={hideApproval}
                    needsUpdate={needsUpdate}
                    recentUnlock={recentUnlock}
                    setRecentUnlock={setRecentUnlock}
                    showOnboardingPaywall={showOnboardingPaywall}
                    setShowOnboardingPaywall={setShowOnboardingPaywall}
                  />
                </ScreenTracker>
                </QueryClientProvider>
                {showSplash && (
                  <AnimatedSplash onComplete={() => setShowSplash(false)} />
                )}
              </ThemedRoot>
            </AlertProvider>
          </PostHogBridge>
        </PostHogProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
