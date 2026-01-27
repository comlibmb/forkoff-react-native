import { useEffect, useCallback } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '@/stores/auth.store';
import { useApprovalStore } from '@/stores/approval.store';
import { wsService } from '@/services/websocket.service';
import { notificationService } from '@/services/notification.service';
import { ClaudeApproval } from '@/components/claude/PermissionRequest';
import '../global.css';

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
  const { initialize, isInitialized, isAuthenticated } = useAuthStore();
  const {
    currentApproval,
    hideApproval,
    respondToApproval,
    subscribeToApprovals,
  } = useApprovalStore();

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
      } catch (error) {
        console.error('Failed to initialize app:', error);
      } finally {
        // Hide splash screen
        await SplashScreen.hideAsync();
      }
    }

    initializeApp();
  }, [initialize]);

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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#0f172a' },
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
        </Stack>

        {/* Global Claude Approval Modal */}
        <ClaudeApproval
          visible={!!currentApproval}
          request={currentApproval}
          onRespond={handleApprovalRespond}
          onDismiss={hideApproval}
        />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
