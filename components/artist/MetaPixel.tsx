'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Meta Pixel, for measuring and retargeting Facebook/Instagram show ads.
 *
 * Rendered from app/(artist)/layout.tsx only, so it never loads on the coaching
 * pages — the privacy policy says exactly that, keep the two in step.
 *
 * Fails closed like GA_MEASUREMENT_ID: the ID is format-checked before it is
 * used, and a missing or malformed value disables the pixel rather than
 * shipping a broken tag. Disabled on noindexed preview deploys.
 *
 * Events: PageView on every route change, ViewContent on show pages.
 * InitiateCheckout on ticket clicks fires from the delegated click listener in
 * components/SiteAnalytics.tsx, alongside GA4's `ticket_click`.
 */
const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? '';
const ENABLED = /^\d{10,20}$/.test(PIXEL_ID);

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[];
  push: Fbq;
  loaded: boolean;
  version: string;
};

export function MetaPixel({ disabled = false }: { disabled?: boolean }) {
  const pathname = usePathname();

  useEffect(() => {
    if (!ENABLED || disabled) return;
    // ponytail: browser time zone stands in for GA4's EEA/UK/CH region list.
    // If EU traffic ever matters, replace with a consent banner.
    if (Intl.DateTimeFormat().resolvedOptions().timeZone.startsWith('Europe/')) return;

    if (!window.fbq) {
      // Meta's base snippet, unminified: queue calls until fbevents.js loads.
      const fbq = function (...args: unknown[]) {
        if (fbq.callMethod) fbq.callMethod(...args);
        else fbq.queue.push(args);
      } as Fbq;
      fbq.push = fbq;
      fbq.loaded = true;
      fbq.version = '2.0';
      fbq.queue = [];
      window.fbq = fbq;
      (window as unknown as { _fbq: Fbq })._fbq = fbq;

      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://connect.facebook.net/en_US/fbevents.js';
      document.head.appendChild(script);

      fbq('init', PIXEL_ID);
    }

    window.fbq('track', 'PageView');
    if (pathname.startsWith('/artist/live/')) {
      window.fbq('track', 'ViewContent', { content_type: 'event' });
    }
  }, [pathname, disabled]);

  return null;
}
