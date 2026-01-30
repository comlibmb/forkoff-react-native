import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

class SentryService {
  private initialized = false;

  init(): void {
    if (this.initialized || !SENTRY_DSN) {
      if (!SENTRY_DSN) {
        console.log('[Sentry] DSN not configured, skipping initialization');
      }
      return;
    }

    const isDev = __DEV__;

    Sentry.init({
      dsn: SENTRY_DSN,
      environment: isDev ? 'development' : 'production',
      release: Constants.expoConfig?.version || '1.0.0',
      dist: Constants.expoConfig?.extra?.eas?.buildNumber || '1',
      debug: isDev,
      tracesSampleRate: isDev ? 1.0 : 0.2,
      attachStacktrace: true,
      enableAutoSessionTracking: true,
      sessionTrackingIntervalMillis: 30000,
      enableNativeCrashHandling: true,
      beforeSend(event) {
        // Filter out development noise if needed
        if (isDev && event.exception?.values?.[0]?.type === 'NetworkError') {
          return null;
        }
        return event;
      },
    });

    this.initialized = true;
    console.log('[Sentry] Initialized successfully');
  }

  captureException(error: Error | unknown, context?: Record<string, unknown>): void {
    if (!this.initialized) return;

    if (context) {
      Sentry.withScope((scope) => {
        Object.entries(context).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });
        Sentry.captureException(error);
      });
    } else {
      Sentry.captureException(error);
    }
  }

  captureMessage(
    message: string,
    level: Sentry.SeverityLevel = 'info',
    context?: Record<string, unknown>
  ): void {
    if (!this.initialized) return;

    if (context) {
      Sentry.withScope((scope) => {
        Object.entries(context).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });
        Sentry.captureMessage(message, level);
      });
    } else {
      Sentry.captureMessage(message, level);
    }
  }

  setUser(user: { id: string; email?: string; name?: string } | null): void {
    if (!this.initialized) return;

    if (user) {
      Sentry.setUser({
        id: user.id,
        email: user.email,
        username: user.name,
      });
    } else {
      Sentry.setUser(null);
    }
  }

  addBreadcrumb(
    message: string,
    category: string,
    data?: Record<string, unknown>,
    level: Sentry.SeverityLevel = 'info'
  ): void {
    if (!this.initialized) return;

    Sentry.addBreadcrumb({
      message,
      category,
      data,
      level,
    });
  }

  setTag(key: string, value: string): void {
    if (!this.initialized) return;
    Sentry.setTag(key, value);
  }

  setExtra(key: string, value: unknown): void {
    if (!this.initialized) return;
    Sentry.setExtra(key, value);
  }

  startTransaction(name: string, op: string): Sentry.Span | undefined {
    if (!this.initialized) return undefined;
    return Sentry.startInactiveSpan({ name, op });
  }
}

export const sentryService = new SentryService();
export default sentryService;
