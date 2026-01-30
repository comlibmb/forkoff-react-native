import { useEffect } from 'react';
import { usePostHog } from 'posthog-react-native';
import { analyticsService } from '@/services/analytics.service';

/**
 * Bridge component that connects the PostHogProvider context to the analyticsService.
 * This allows the analytics service to be used in non-React contexts (stores, services).
 */
export function PostHogBridge({ children }: { children: React.ReactNode }) {
  const posthog = usePostHog();

  useEffect(() => {
    analyticsService.setClient(posthog);
  }, [posthog]);

  return <>{children}</>;
}

export default PostHogBridge;
