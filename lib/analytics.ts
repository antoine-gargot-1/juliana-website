/**
 * Conversion tracking.
 *
 * ---------------------------------------------------------------------------
 * WHY GA4 RATHER THAN VERCEL WEB ANALYTICS ALONE
 * ---------------------------------------------------------------------------
 * @vercel/analytics and @vercel/speed-insights stay exactly as they were: they
 * give cookieless page-view counts and real Core Web Vitals, and they cost
 * nothing to keep.
 *
 * They cannot, however, answer the question this instrumentation exists for —
 * "did emailing Hotel Cafe produce an EPK view and a video play?". Vercel's own
 * pricing table (vercel.com/docs/analytics/limits-and-pricing, checked
 * 2026-07-26) lists for the Hobby plan:
 *
 *     Custom Events                -
 *     Properties on Custom Events  -
 *     UTM Parameters               -
 *
 * Custom events are Pro-only, the properties you would hang a venue slug off
 * are capped at 2 even there, and UTM breakdowns need the Web Analytics Plus
 * add-on on top of Pro. Every primitive conversion tracking is built from is
 * behind that paywall, so on Hobby a Vercel-only answer is not "worse", it is
 * "impossible". GA4 does named events with arbitrary parameters for free.
 *
 * So: GA4 carries the conversions, Vercel keeps doing page views. Vercel custom
 * events are dispatched too, but only when NEXT_PUBLIC_VERCEL_CUSTOM_EVENTS=1,
 * so that a Hobby project does not burn its 50k/month page-view allowance on
 * events the plan will reject anyway.
 *
 * ---------------------------------------------------------------------------
 * THE COST OF GA4: CONSENT
 * ---------------------------------------------------------------------------
 * GA4 sets a first-party _ga cookie, which in the EU/UK needs prior consent.
 * There is no cookie banner here. Instead the GA4 loader boots with Google
 * Consent Mode v2 defaults that deny every advertising signal and keep only
 * analytics storage (see components/SiteAnalytics.tsx). That is the correct
 * posture for a site doing analytics and no remarketing, and it is proportionate
 * for traffic that is overwhelmingly US venue bookers. It is NOT full GDPR
 * compliance: if this site ever markets into the EU, add a consent banner that
 * flips analytics_storage to 'denied' by default and calls gtag('consent',
 * 'update', ...) on accept. Nothing else in this file needs to change for that.
 */

export type ConversionEvent =
  /** User clicked the play facade on a video. */
  | 'video_play'
  /** 25 / 50 / 75% watch-through milestone. */
  | 'video_progress'
  /** Player reached the end. */
  | 'video_complete'
  /** The EPK (/artist/press) was opened — the page outreach emails link to. */
  | 'epk_view'
  /** Booking inquiry submitted successfully. */
  | 'booking_submit'
  /** Coaching / studio inquiry submitted successfully. */
  | 'contact_submit'
  /** Outbound click to open.spotify.com. */
  | 'spotify_click';

export type EventParams = Record<string, string | number | boolean | null>;

/* ------------------------------------------------------------------ */
/* UTM attribution                                                     */
/* ------------------------------------------------------------------ */

/**
 * Outreach emails land with
 *   ?utm_source=outreach&utm_medium=email&utm_campaign=<track>&utm_content=<venue-slug>
 * and the visitor then clicks through to other pages, dropping the query string.
 * GA4's own attribution would credit the session but will not stamp the venue
 * slug onto a later video_play, which is precisely the join we need.
 *
 * So the UTMs are latched into sessionStorage on first sight and merged into
 * every conversion for the rest of the visit. sessionStorage (not localStorage)
 * is deliberate: attribution should expire when the visit does, otherwise a
 * bookmark visit three weeks later still gets credited to the email.
 */
const ATTRIBUTION_KEY = 'jb:attribution';

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;

export type Attribution = Partial<Record<(typeof UTM_KEYS)[number], string>> & {
  landing_page?: string;
  landed_at?: string;
};

function safeSession(): Storage | null {
  // Private-mode Safari and cookie-blocked contexts throw on access.
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function readStored(): Attribution {
  const store = safeSession();
  if (!store) return {};
  try {
    const raw = store.getItem(ATTRIBUTION_KEY);
    return raw ? (JSON.parse(raw) as Attribution) : {};
  } catch {
    return {};
  }
}

/**
 * Latch UTMs from the current URL, if any. A fresh set of UTMs always wins —
 * that is a new campaign click and should re-attribute the rest of the session.
 * Returns whatever attribution is now in force.
 *
 * Called from track() as well as on navigation, so a conversion can never fire
 * before attribution has been captured regardless of effect ordering.
 */
export function captureAttribution(): Attribution {
  if (typeof window === 'undefined') return {};

  const params = new URLSearchParams(window.location.search);
  const fresh: Attribution = {};
  for (const key of UTM_KEYS) {
    const value = params.get(key);
    if (value) fresh[key] = value.slice(0, 200);
  }

  if (Object.keys(fresh).length === 0) return readStored();

  fresh.landing_page = window.location.pathname;
  fresh.landed_at = new Date().toISOString();

  const store = safeSession();
  try {
    store?.setItem(ATTRIBUTION_KEY, JSON.stringify(fresh));
  } catch {
    /* storage full or blocked — attribution degrades to this pageview only */
  }
  return fresh;
}

export function getAttribution(): Attribution {
  if (typeof window === 'undefined') return {};
  return captureAttribution();
}

/** True when this visit began on an outreach email link. */
export function isFromOutreach(attribution: Attribution = getAttribution()) {
  return attribution.utm_source === 'outreach' || attribution.utm_medium === 'email';
}

/* ------------------------------------------------------------------ */
/* Dispatch                                                            */
/* ------------------------------------------------------------------ */

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? '';

/**
 * GA4 measurement IDs are "G-" followed by an alphanumeric token. The ID is
 * interpolated into an inline <script> in SiteAnalytics, so it is format-checked
 * rather than trusted: a typo'd or hostile env var can then only disable
 * analytics, never inject script. A malformed value fails closed.
 */
const GA_ID_PATTERN = /^G-[A-Z0-9]{4,24}$/i;

export const GA_ENABLED = GA_ID_PATTERN.test(GA_MEASUREMENT_ID);

const VERCEL_CUSTOM_EVENTS = process.env.NEXT_PUBLIC_VERCEL_CUSTOM_EVENTS === '1';

/**
 * Fire a conversion. Safe to call anywhere: server-side it is a no-op, and with
 * no NEXT_PUBLIC_GA_MEASUREMENT_ID set it degrades to nothing rather than
 * throwing, so the site behaves identically before a Measurement ID exists.
 */
export function track(event: ConversionEvent, params: EventParams = {}) {
  if (typeof window === 'undefined') return;

  const attribution = getAttribution();
  const payload: EventParams = {
    ...params,
    ...attribution,
    // Denormalised so a GA4 report can group by venue without a custom
    // dimension on utm_content.
    venue: attribution.utm_content ?? 'direct',
    campaign: attribution.utm_campaign ?? 'none',
    from_outreach: isFromOutreach(attribution),
  };

  window.gtag?.('event', event, payload);

  if (VERCEL_CUSTOM_EVENTS) {
    // Dynamic import so @vercel/analytics' track() never lands in the initial
    // bundle for a project that is not paying for custom events.
    void import('@vercel/analytics').then(({ track: vercelTrack }) => {
      vercelTrack(event, payload as Record<string, string | number | boolean | null>);
    });
  }
}

/** Manual GA4 page_view — the loader is configured with send_page_view:false. */
export function trackPageView(url: string, title?: string) {
  if (typeof window === 'undefined' || !GA_ENABLED) return;
  const attribution = captureAttribution();
  window.gtag?.('event', 'page_view', {
    page_location: url,
    page_path: window.location.pathname,
    ...(title ? { page_title: title } : {}),
    ...attribution,
    from_outreach: isFromOutreach(attribution),
  });
}
