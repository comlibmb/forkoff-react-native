import PostHog from 'posthog-react-native';

class AnalyticsService {
  private client: PostHog | null = null;
  private userId: string | null = null;

  // Called from PostHogProvider to set the client reference
  setClient(client: PostHog | null): void {
    this.client = client;
    if (client) {
      console.log('[Analytics] PostHog client set');
    }
  }

  get isInitialized(): boolean {
    return this.client !== null;
  }

  identify(
    userId: string,
    properties?: Record<string, unknown>
  ): void {
    if (!this.client) return;

    this.userId = userId;
    this.client.identify(userId, properties);
    console.log('[Analytics] User identified:', userId);
  }

  track(
    event: string,
    properties?: Record<string, unknown>
  ): void {
    if (!this.client) return;

    this.client.capture(event, properties);
    console.log('[Analytics] Event tracked:', event, properties);
  }

  screen(
    screenName: string,
    properties?: Record<string, unknown>
  ): void {
    if (!this.client) return;

    this.client.screen(screenName, properties);
    console.log('[Analytics] Screen viewed:', screenName);
  }

  reset(): void {
    if (!this.client) return;

    this.userId = null;
    this.client.reset();
    console.log('[Analytics] User reset');
  }

  setUserProperties(properties: Record<string, unknown>): void {
    if (!this.client || !this.userId) return;

    this.client.identify(this.userId, properties);
  }

  isFeatureEnabled(flagKey: string): boolean {
    if (!this.client) return false;

    return this.client.isFeatureEnabled(flagKey) ?? false;
  }

  async getFeatureFlag(flagKey: string): Promise<boolean | string | undefined> {
    if (!this.client) return undefined;

    return this.client.getFeatureFlag(flagKey);
  }

  async flush(): Promise<void> {
    if (!this.client) return;

    await this.client.flush();
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;
