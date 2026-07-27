'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Returning-visitor convenience only. The landing page underneath renders real,
 * crawlable content — crawlers have no localStorage, so they never see this
 * fire and always index the page body.
 */
export function ModeRedirect() {
  const router = useRouter();

  useEffect(() => {
    let cached: string | null = null;
    try {
      cached = localStorage.getItem('juliana-mode');
    } catch {
      /* storage blocked — just show the landing page */
    }
    if (cached === 'coach') router.replace('/coach');
    else if (cached === 'artist') router.replace('/artist');
  }, [router]);

  return null;
}
