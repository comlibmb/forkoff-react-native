import { useEffect, useRef } from 'react';
import { usePathname } from 'expo-router';
import { analyticsService } from '@/services/analytics.service';
import { sentryService } from '@/services/sentry.service';

interface ScreenTrackerProps {
  children: React.ReactNode;
}

export function ScreenTracker({ children }: ScreenTrackerProps) {
  const pathname = usePathname();
  const previousPathname = useRef<string | null>(null);

  useEffect(() => {
    if (pathname && pathname !== previousPathname.current) {
      // Track screen view in PostHog
      analyticsService.screen(pathname, {
        previous_screen: previousPathname.current,
      });

      // Add navigation breadcrumb in Sentry
      sentryService.addBreadcrumb(
        `Navigated to ${pathname}`,
        'navigation',
        {
          from: previousPathname.current,
          to: pathname,
        }
      );

      previousPathname.current = pathname;
    }
  }, [pathname]);

  return <>{children}</>;
}

export default ScreenTracker;
