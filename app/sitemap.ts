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
    // 0.9, not 0.8: this file's own rule is that 0.9 means "a page paid traffic
    // or local search lands on", and marketing/google-ads/keywords.csv points 11
    // keywords here. (Google ignores <priority> entirely; the value only has to
    // be honest against the scale documented above.)
    { path: '/online-singing-lessons', priority: 0.9, changeFrequency: 'monthly' },
    { path: '/online-songwriting-lessons', priority: 0.9, changeFrequency: 'monthly' },

    // Legal. INDEXED DELIBERATELY, which is not the default instinct for a legal
    // page. Two reasons. CalOPPA (Bus. & Prof. Code §22575) requires the privacy
    // policy to be "conspicuously posted", and a page excluded from the sitemap
    // and unreachable by search is a weaker version of posted than one that is
    // both. And these are pages people go looking for on purpose — "does she take
    // a card for the free lesson", "how do I cancel", "what do you keep about my
    // kid" — usually while deciding whether to hand over a card, which makes them
    // the least wasteful search results on the site.
    //
    // Priority 0.3, below a past show's 0.4: indexed, findable, and never
    // competing with a page that sells a lesson.
    { path: '/coach/privacy', priority: 0.3, changeFrequency: 'yearly' },
    { path: '/coach/terms', priority: 0.3, changeFrequency: 'yearly' },
  ];

/**
 * NO `lastModified`, AND THAT IS THE FIX RATHER THAN THE OMISSION.
 * ---------------------------------------------------------------------------
 * This file used to stamp `lastModified: new Date()` on all 30 URLs. With
 * `revalidate = 86400` above, that regenerated daily, so the sitemap asserted
 * every single page on the site had changed that morning — including a 2024 show
 * page and a privacy policy nobody had touched in months.
 *
 * That is worse than saying nothing. Google's documented behaviour is that it
 * uses `lastmod` only while the value looks trustworthy and ignores the signal
 * site-wide once it does not, so a blanket "everything changed today" spent the
 * credibility of the one field that could have told a crawler which page to
 * re-fetch first — and spent it on no information at all, since a date that is
 * identical across every URL cannot rank any URL above another.
 *
 * Omitting it is valid (`lastmod` is optional in the sitemap protocol) and
 * leaves Google to use its own change-detection, which is what it was already
 * doing in practice.
 *
 * IF SOMEONE WANTS A REAL `lastmod` LATER, it has to come from something that
 * actually tracks content: the git author date of the page file and of the
 * content/*.json it reads, or a per-route date committed alongside the copy.
 * Do not reintroduce `new Date()`, and do not reach for file mtimes — a CI
 * checkout gives every file the same timestamp, which is the same lie in a
 * different costume.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: abs(r.path),
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  const showEntries: MetadataRoute.Sitemap = ALL_SHOWS.map((show) => ({
    url: abs(`/artist/live/${show.slug}`),
    changeFrequency: 'weekly',
    // Past shows still deserve to be indexed, just below the live ones.
    priority: isPast(show, now) ? 0.4 : 0.8,
  }));

  return [...staticEntries, ...showEntries];
}
