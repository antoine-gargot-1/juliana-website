'use client';

import { useEffect } from 'react';

import { getAttribution, track } from '@/lib/analytics';

/**
 * Fires `epk_view` when the press kit opens.
 *
 * /artist/press is the page outreach emails point at, so this is the top of the
 * conversion funnel we actually care about: epk_view -> video_play ->
 * booking_submit, all three stamped with the same utm_content venue slug. GA4's
 * built-in page_view would tell us the page was seen but would not let us slice
 * "EPK views that came from the Hotel Cafe email", which is the entire question.
 *
 * Renders nothing.
 */
export function EpkViewTracker() {
  useEffect(() => {
    const attribution = getAttribution();
    track('epk_view', {
      referrer: document.referrer || 'none',
      // Redundant with the merged attribution, but makes the GA4 event list
      // readable at a glance without opening the parameter drill-down.
      source: attribution.utm_source ?? 'direct',
    });
  }, []);

  return null;
}
