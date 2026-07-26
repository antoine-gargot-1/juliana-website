'use client';

import { usePathname } from 'next/navigation';
import { useReveal } from '@/hooks/useReveal';

/**
 * Zero-markup client leaf. Server pages drop one of these in to get the same
 * scroll-reveal behaviour the SPA had, without becoming client components
 * themselves. Re-runs on navigation so freshly rendered nodes get observed.
 */
export function Reveal() {
  const pathname = usePathname();
  useReveal([pathname]);
  return null;
}
