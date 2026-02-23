import { useEffect, useCallback, useState, useRef } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PostHogProvider } from 'posthog-react-native';
import Constants from 'expo-constants';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { useIdentityStore } from '@/stores/identity.store';
import { useClaudeStore } from '@/stores/claude.store';
import '@/stores/analytics.store'; // Import early so global WS listeners register before first sync
import { useApprovalStore } from '@/stores/approval.store';
import { useConnectionStore } from '@/stores/connection.store';
import { useVersionStore } from '@/stores/version.store';
import { useAchievementsStore } from '@/stores/achievements.store';
import { wsService } from '@/services/websocket.service';
import { notificationService } from '@/services/notification.service';
import { sentryService } from '@/services/sentry.service';
import { analyticsService } from '@/services/analytics.service';
import { appConfigService } from '@/services/appConfig.service';
import { ClaudeApproval } from '@/components/claude/PermissionRequest';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ScreenTracker } from '@/components/ScreenTracker';
import { PostHogBridge } from '@/components/PostHogBridge';
import { AlertProvider } from '@/components/ui/AlertModal';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { ConnectionToast } from '@/components/ui/ConnectionToast';
import { UpdateRequiredModal } from '@/components/ui/UpdateRequiredModal';
import { AchievementUnlockModal } from '@/components/achievements/AchievementUnlockModal';
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
}: {
  currentApproval: any;
  handleApprovalRespond: (approvalId: string, response: string) => void;
  hideApproval: () => void;
  needsUpdate: boolean;
  recentUnlock: any;
  setRecentUnlock: (unlock: any) => void;
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

      {/* One-time guided tutorial overlay */}
      <TutorialOverlay />
    </>
  );
}

export default function RootLayout() {
  const router = useRouter();
  const { initialize, isReady, isPaired, mobileDeviceId } = useIdentityStore();
  const {
    currentApproval,
    hideApproval,
    respondToApproval,
    subscribeToApprovals,
  } = useApprovalStore();
  const { initialize: initializeConnection } = useConnectionStore();
  const { needsUpdate } = useVersionStore();
  const { recentUnlock, setRecentUnlock } = useAchievementsStore();
  const [showSplash, setShowSplash] = useState(true);

  // Handle notification tap - navigate to approval or session
  const handleNotificationTap = useCallback((response: Notifications.NotificationResponse) => {
    const data = response.notification.request.content.data;

    if (data?.type === 'claude_approval' && data?.approvalId) {
      if (data.sessionKey) {
        let targetDeviceId = data.deviceId as string | undefined;
        if (!targetDeviceId) {
          const sessions = useClaudeStore.getState().sessions;
          for (const [devId, devSessions] of sessions) {
            if (devSessions.some(s => s.sessionKey === data.sessionKey)) {
              targetDeviceId = devId;
              break;
            }
          }
        }
        router.push({
          pathname: '/claude/session/[sessionKey]' as any,
          params: {
            sessionKey: data.sessionKey as string,
            ...(targetDeviceId ? { deviceId: targetDeviceId } : {}),
          },
        });
      }
    }
  }, [router]);

  useEffect(() => {
    async function initializeApp() {
      try {
        // Initialize identity (loads device ID + paired devices from secure storage)
        await initialize();

        // Initialize notifications
        await notificationService.initialize();

        // Track app opened
        analyticsService.track('app_opened');
      } catch (error) {
        console.error('Failed to initialize app:', (error as Error).message);
        sentryService.captureException(error, { context: 'app_initialization' });
      }
    }

    initializeApp();
  }, [initialize]);

  // Identify device in analytics/sentry when identity is ready
  useEffect(() => {
    if (mobileDeviceId) {
      sentryService.setUser({ id: mobileDeviceId });
      analyticsService.identify(mobileDeviceId, {
        app_version: Constants.expoConfig?.version,
      });
    }
  }, [mobileDeviceId]);

  // Connect/disconnect WebSocket based on pairing state
  useEffect(() => {
    if (isReady) {
      if (isPaired) {
        wsService.connect();

        // Register for push notifications when paired
        notificationService.registerForPushNotifications();
      } else {
        wsService.disconnect();
      }
    }
  }, [isPaired, isReady]);

  // Subscribe to approval events when WebSocket is connected
  useEffect(() => {
    if (isPaired && isReady) {
      const unsubscribe = subscribeToApprovals();
      return () => unsubscribe();
    }
  }, [isPaired, isReady, subscribeToApprovals]);

  // Subscribe to achievement events
  useEffect(() => {
    if (isPaired && isReady) {
      const unsubAchievement = wsService.on('achievement_unlocked', (data) => {
        setRecentUnlock(data.achievement as any);
      });

      return () => {
        unsubAchievement();
      };
    }
  }, [isPaired, isReady, setRecentUnlock]);

  // Initialize connection monitoring
  useEffect(() => {
    const cleanup = initializeConnection();
    return cleanup;
  }, [initializeConnection]);

  // Fetch app config from Supabase and check version on startup
  useEffect(() => {
    if (!isReady) return;

    async function fetchAppConfig() {
      try {
        const [versionConfig, cliVersionConfig] = await Promise.all([
          appConfigService.fetchVersionConfig(),
          appConfigService.fetchCliVersionConfig(),
        ]);

        const store = useVersionStore.getState();
        if (versionConfig) store.setVersionConfig(versionConfig);
        if (cliVersionConfig) store.setCliVersionConfig(cliVersionConfig);
      } catch (e) {
        console.warn('[Layout] Failed to fetch app config:', e);
      }
    }

    fetchAppConfig();
  }, [isReady]);

  // Handle notification responses (when user taps a notification)
  useEffect(() => {
    notificationService.getLastNotificationResponse().then((response) => {
      if (response) {
        handleNotificationTap(response);
      }
    });

    const subscription = notificationService.addNotificationResponseListener(handleNotificationTap);

    return () => subscription.remove();
  }, [handleNotificationTap]);

  // Handle approval response
  const handleApprovalRespond = useCallback((approvalId: string, response: string) => {
    respondToApproval(approvalId, response);
  }, [respondToApproval]);

  if (!isReady) {
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
