import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { apiClient } from './api.client';
import { sentryService } from './sentry.service';

// Configure notification handling
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationSettings {
  pushEnabled: boolean;
  approvalRequests: boolean;
  deviceStatus: boolean;
  chatMessages: boolean;
  systemUpdates: boolean;
}

export interface ScheduledNotification {
  id: string;
  title: string;
  body: string;
  trigger: Date | number;
}

class NotificationService {
  private expoPushToken: string | null = null;

  async initialize(): Promise<void> {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6366f1',
      });

      await Notifications.setNotificationChannelAsync('approvals', {
        name: 'Approval Requests',
        importance: Notifications.AndroidImportance.HIGH,
        description: 'Notifications for approval requests from AI tools',
      });

      await Notifications.setNotificationChannelAsync('chat', {
        name: 'Chat Messages',
        importance: Notifications.AndroidImportance.DEFAULT,
        description: 'Notifications for new chat messages',
      });
    }
  }

  async registerForPushNotifications(): Promise<string | null> {
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permissions not granted');
      return null;
    }

    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
      });

      this.expoPushToken = tokenData.data;

      // Register token with backend
      await this.registerTokenWithBackend(this.expoPushToken);

      return this.expoPushToken;
    } catch (error) {
      // Expo Go doesn't support push tokens - silently fail
      console.log('[Notifications] Push token unavailable (expected in Expo Go)');
      sentryService.captureException(error as Error, { context: 'registerForPushNotifications' });
      return null;
    }
  }

  private async registerTokenWithBackend(token: string): Promise<void> {
    try {
      await apiClient.post('/notifications/register', {
        token,
        platform: Platform.OS,
        deviceId: Device.modelId,
      });
    } catch (error) {
      console.error('Failed to register push token:', error);
      sentryService.captureException(error as Error, { context: 'registerTokenWithBackend' });
    }
  }

  async getSettings(): Promise<NotificationSettings> {
    try {
      return await apiClient.get<NotificationSettings>('/notifications/settings');
    } catch (error) {
      sentryService.captureMessage('notification_settings_fetch_failed', 'warning', { error: String(error) });
      // Return default settings
      return {
        pushEnabled: true,
        approvalRequests: true,
        deviceStatus: true,
        chatMessages: true,
        systemUpdates: true,
      };
    }
  }

  async updateSettings(settings: Partial<NotificationSettings>): Promise<void> {
    await apiClient.patch('/notifications/settings', settings);
  }

  async scheduleNotification(
    notification: Omit<ScheduledNotification, 'id'>
  ): Promise<string> {
    const trigger: Notifications.NotificationTriggerInput =
      notification.trigger instanceof Date
        ? { type: Notifications.SchedulableTriggerInputTypes.DATE, date: notification.trigger }
        : { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: notification.trigger, repeats: false };

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: notification.title,
        body: notification.body,
        sound: true,
      },
      trigger,
    });

    return id;
  }

  async cancelScheduledNotification(id: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(id);
  }

  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  async getBadgeCount(): Promise<number> {
    return Notifications.getBadgeCountAsync();
  }

  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }

  async clearBadge(): Promise<void> {
    await Notifications.setBadgeCountAsync(0);
  }

  addNotificationReceivedListener(
    callback: (notification: Notifications.Notification) => void
  ) {
    return Notifications.addNotificationReceivedListener(callback);
  }

  addNotificationResponseListener(
    callback: (response: Notifications.NotificationResponse) => void
  ) {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  async getLastNotificationResponse() {
    return Notifications.getLastNotificationResponseAsync();
  }

  // Send a local notification (useful for testing)
  async sendLocalNotification(
    title: string,
    body: string,
    data?: Record<string, unknown>
  ): Promise<string> {
    return Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: null,
    });
  }
}

export const notificationService = new NotificationService();
