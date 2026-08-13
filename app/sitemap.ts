import type { MetadataRoute } from 'next';
import { ALL_SHOWS, isPast } from '@/lib/content';
import { abs } from '@/lib/site';

export const revalidate = 86400;

type Entry = MetadataRoute.Sitemap[number];

/**
 * Every indexable route.
 *
 * ---------------------------------------------------------------------------
 * DELIBERATELY ABSENT — DO NOT ADD
 * ---------------------------------------------------------------------------
 *   /coach/book/hold           transient step: creates the Stripe $0 card hold
 *   /coach/book/confirmed      the post-booking thank-you page
 *   /coach/purchase/confirmed  the post-payment page; also fires a conversion
 *                              mirror, so a crawler hitting it would report a
 *                              purchase that never happened
 *   /coach/account             redirects into the Stripe Customer Portal
 *
 * This list is an allow-list, so absence is the mechanism — a new route is
 * excluded until someone adds it below. All of the above are `noindex` (see
 * pageMeta's `noindex` flag). A URL that is both
 * submitted in a sitemap and marked noindex is a self-contradiction Search
 * Console reports as an error ("Submitted URL marked 'noindex'"), and the
 * confirmed page would otherwise start ranking for brand searches and hand
 * people a booking confirmation for a booking they never made.
 *
 * ---------------------------------------------------------------------------
 * NO PRE-EXISTING PATH CHANGES
 * ---------------------------------------------------------------------------
 * Every route that was already indexed is still listed at the same path:
 * /coach, /coach/about, /coach/services, /coach/voice-lessons-los-angeles,
 * /coach/faq, /coach/contact. New pages are additions, never replacements —
 * moving one of those would throw away its existing rankings.
 *
 * Priorities are relative, and only within this file: 0.9 is "a page paid
 * traffic or local search lands on", 0.8 "a page that converts", 0.7
 * "supporting".
 */
const STATIC_ROUTES: { path: string; priority: number; changeFrequency: Entry['changeFrequency'] }[] =
  [
    { path: '/', priority: 1.0, changeFrequency: 'monthly' },
    { path: '/artist', priority: 0.9, changeFrequency: 'weekly' },
    { path: '/artist/music', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/artist/live-video', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/artist/live', priority: 0.8, changeFrequency: 'weekly' },
    { path: '/artist/press', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/artist/booking', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/live-music-for-events-los-angeles', priority: 0.9, changeFrequency: 'monthly' },
    { path: '/coach', priority: 0.9, changeFrequency: 'monthly' },
    { path: '/coach/about', priority: 0.7, changeFrequency: 'yearly' },
    { path: '/coach/services', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/coach/voice-lessons-los-angeles', priority: 0.9, changeFrequency: 'monthly' },
    { path: '/coach/faq', priority: 0.7, changeFrequency: 'yearly' },
    { path: '/coach/contact', priority: 0.8, changeFrequency: 'yearly' },

    // The funnel. /coach/pricing and /coach/book are where the money is decided,
    // so they rank alongside the landing pages rather than below them.
    { path: '/coach/pricing', priority: 0.9, changeFrequency: 'monthly' },
    { path: '/coach/book', priority: 0.9, changeFrequency: 'monthly' },
    { path: '/coach/lessons/online', priority: 0.9, changeFrequency: 'monthly' },
    { path: '/coach/lessons/in-person', priority: 0.9, changeFrequency: 'monthly' },
    // Songwriting carries the same weight as the voice pages despite lower search
    // volume: "voice lessons" is a national bloodbath, songwriting is winnable,
    // and this is the page the depth content lives on.
    { path: '/coach/songwriting', priority: 0.9, changeFrequency: 'monthly' },

    // Root-level keyword landing pages, following the precedent set by
    // /live-music-for-events-los-angeles: paid-search destinations sit at the
    // root, not under /coach, because that is where the existing one sits and a
    // second convention would be one more thing to remember.
    { path: '/vocal-coach-los-angeles', priority: 0.9, changeFrequency: 'monthly' },
    { path: '/online-singing-lessons', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/online-songwriting-lessons', priority: 0.9, changeFrequency: 'monthly' },
  ];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: abs(r.path),
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  const showEntries: MetadataRoute.Sitemap = ALL_SHOWS.map((show) => ({
    url: abs(`/artist/live/${show.slug}`),
    lastModified: now,
    changeFrequency: 'weekly',
    // Past shows still deserve to be indexed, just below the live ones.
    priority: isPast(show, now) ? 0.4 : 0.8,
  }));

  return [...staticEntries, ...showEntries];
}
