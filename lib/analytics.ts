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
 * GA4 sets a first-party _ga cookie, which in the EEA/UK needs prior consent,
 * and there is no cookie banner on this site. So the GA4 loader boots with
 * Google Consent Mode v2 defaults — see components/SiteAnalytics.tsx for the
 * actual dataLayer pushes. Those defaults are REGION-SCOPED, and the region
 * scoping is load-bearing in both directions:
 *
 *   EEA + UK + Switzerland   everything denied, including analytics_storage.
 *                            Granting advertising storage to a visitor there
 *                            without prior consent is precisely what ePrivacy
 *                            forbids, and Consent Mode's own behavioural
 *                            modelling covers the resulting measurement gap.
 *   Everywhere else          everything granted.
 *
 * This file used to say the loader "denies every advertising signal" outright,
 * and that it was the correct posture "for a site doing analytics and no
 * remarketing". That was true when the site was a brochure. It stopped being
 * true when the coaching studio started buying search traffic, and the old
 * posture is now a launch blocker rather than a cautious default:
 *
 *   ad_storage: 'denied'    the gclid from an ad click is never stored, so
 *                           Google Ads cannot attribute ANY conversion back to
 *                           the click that produced it. The entire budget
 *                           becomes unmeasurable — and Smart Bidding trained on
 *                           nothing bids on nothing.
 *   ad_user_data: 'denied'  Enhanced Conversions cannot send the hashed email,
 *                           so the recovery path for cookie-less attribution is
 *                           silently dead too. lib/ga-server.ts depends on this
 *                           being granted; re-deny it and server-side matching
 *                           stops working with no error anywhere.
 *
 * `ads_data_redaction` strips ad identifiers from whatever pings do leave a
 * denied region, and `url_passthrough` keeps the gclid moving through in-site
 * navigation when cookies are unavailable.
 *
 * This is still not full GDPR compliance — it is the proportionate posture for
 * a business whose paid traffic is LA-local and US-national while its organic
 * reach ("online singing lessons") is worldwide. If EU volume ever justifies
 * measuring there, add a banner that calls gtag('consent','update',...) on
 * accept. Nothing in this file needs to change for that.
 */

export type ConversionEvent =
  /**
   * User clicked the play facade on a video.
   *
   * NOTE ON NAMING: GA4's Enhanced Measurement automatically collects
   * `video_start`, `video_progress` and `video_complete` for embedded YouTube
   * players whose iframe has enablejsapi=1 — which ours does, because that is
   * how the watch-through milestones are read. So these three names are
   * deliberately avoided. If our events shared those names, GA4's auto-fired
   * copies would merge into the same event with a different parameter schema
   * and, crucially, no UTM attribution, filling any venue breakdown with
   * "(not set)". Ours stay distinct so a venue report is clean.
   */
  | 'video_play'
  /** 25 / 50 / 75% watch-through milestone. Not `video_progress` — see above. */
  | 'video_milestone'
  /** Player reached the end. Not `video_complete` — see above. */
  | 'video_finish'
  /** The EPK (/artist/press) was opened — the page outreach emails link to. */
  | 'epk_view'
  /** Booking inquiry submitted successfully. */
  | 'booking_submit'
  /** Coaching / studio inquiry submitted successfully. */
  | 'contact_submit'
  /** Outbound click to open.spotify.com. */
  | 'spotify_click'
  /**
   * A free vocal assessment was booked and the $0 card hold succeeded.
   *
   * THE PRIMARY CONVERSION. This is the one Google Ads bids on, valued at
   * ASSESSMENT_VALUE_USD[mode] from lib/pricing.ts — read that constant's
   * comment before touching the value, it explains why it is neither $0 nor the
   * first month's $280.
   *
   * Fired authoritatively from the Stripe webhook on `setup_intent.succeeded`
   * (lib/ga-server.ts), not from the confirmation page: the browser copy is a
   * mirror for DebugView and goes missing for 20–30% of visitors. Deliberately
   * not named `generate_lead` — that is a GA4 recommended event with its own
   * expected parameter schema, and a booked-and-carded assessment is a much
   * stronger signal than a lead form, so it deserves its own name and its own
   * value.
   */
  | 'assessment_booked'
  /** A monthly plan subscription started. Valued at the first month's amount. */
  | 'plan_started'
  /**
   * A 10-lesson pack was bought outright.
   *
   * NOTE ON NAMING: not `purchase`. `purchase` is a GA4 recommended ecommerce
   * event and arrives with an expected schema — `transaction_id`, `items[]`,
   * `value`, `currency` — which populates the Monetisation reports. Sending a
   * bare value under that name yields a half-populated ecommerce report that
   * looks broken rather than a clean custom event. Same reasoning as the
   * `video_*` renaming above: match GA4's names only when matching their schema.
   */
  | 'pack_purchased'
  /**
   * A student paid another month. Fired on every `invoice.paid`, so it repeats
   * per student — the count is retention months, not students.
   *
   * This is the event that eventually matters most and is the least useful
   * today. Breakeven is ~2 months of retention, so the business question is not
   * "who books" but "who stays", and only this event knows. It is Secondary in
   * Google Ads for now because Smart Bidding cannot act on a signal that
   * arrives 30–270 days after the click; scripts/offline-conversions.ts is what
   * eventually feeds true retained value back to the auction.
   */
  | 'retained_student';

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

/**
 * Ad-click identifiers. LATCHED ALONGSIDE THE UTMs, AND THEY MUST BE.
 *
 * ---------------------------------------------------------------------------
 * THIS IS WHAT LETS A CONVERSION FIRED FROM A STRIPE WEBHOOK TIE BACK TO THE
 * CLICK THAT PAID FOR IT.
 * ---------------------------------------------------------------------------
 * The chain is long and every link is in a different process:
 *
 *   ad click → landing page carries ?gclid=…  (THIS FILE latches it)
 *     → /coach/book reads the latch into hidden fields (BookingForm)
 *       → it rides through Cal.com as booking metadata
 *         → /coach/book/hold stamps it on the Stripe Customer (lib/students.ts)
 *           → months later scripts/offline-conversions.ts uploads
 *             (gclid, true LTV) to Google Ads Offline Conversion Import.
 *
 * Google Ads Offline Conversion Import is keyed on the CLICK, not on a person:
 * there is no email-based fallback, and a gclid cannot be recovered after the
 * fact. So a click id that is not latched here is permanently lost, and the
 * eventual retention-value feedback loop — the thing that finally makes Smart
 * Bidding optimise for students who STAY rather than students who merely book —
 * has nothing to upload no matter how many students exist.
 *
 * These were omitted from the latched set in the first version of this file, and
 * the failure was invisible: click ids survived only when the visitor landed
 * directly on /coach/book with the id still on the URL. Anyone who landed on
 * /vocal-coach-los-angeles and then navigated to the booking form — i.e. the
 * intended path of every campaign — arrived with nothing.
 *
 *   gclid   Google Ads autotagging, the normal case.
 *   gbraid  iOS app-to-web campaigns where ATT prevents a gclid.
 *   wbraid  web-to-app campaigns, same privacy reason.
 *
 * gbraid/wbraid are stored for the same reason: Google Ads accepts them as
 * alternative Offline Conversion Import keys, and dropping them would silently
 * exclude iOS traffic — which for a mobile-heavy local service business is a
 * large slice of exactly the audience the budget is aimed at.
 */
const CLICK_ID_KEYS = ['gclid', 'gbraid', 'wbraid'] as const;

/**
 * Everything latched into sessionStorage and merged into every later conversion.
 * Exported so BookingForm can iterate one list rather than restating the names —
 * a hidden field that is missing here is a field the funnel silently drops.
 */
export const ATTRIBUTION_KEYS = [...UTM_KEYS, ...CLICK_ID_KEYS] as const;

export type AttributionKey = (typeof ATTRIBUTION_KEYS)[number];

export type Attribution = Partial<Record<AttributionKey, string>> & {
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
 * Latch UTMs and ad-click ids from the current URL, if any. A fresh set always
 * wins — that is a new campaign click and should re-attribute the rest of the
 * session. Returns whatever attribution is now in force.
 *
 * Called from track() as well as on navigation, so a conversion can never fire
 * before attribution has been captured regardless of effect ordering.
 *
 * ---------------------------------------------------------------------------
 * "FRESH WINS WHOLESALE" IS DELIBERATE, INCLUDING FOR CLICK IDS.
 * ---------------------------------------------------------------------------
 * A fresh set REPLACES the stored one rather than merging into it, so arriving
 * on an outreach email link after an earlier ad click drops the gclid. That is
 * the correct behaviour, not a bug to fix: Google Ads attributes an offline
 * conversion to the last click inside the lookback window, so carrying a stale
 * gclid forward through a later non-paid entry would credit paid search for a
 * conversion the email produced, and the campaign would look more profitable
 * than it is. Over-crediting is worse than losing the id, because it is the
 * error Smart Bidding acts on.
 *
 * Note that Google autotagging adds `gclid` and NOTHING else — no utm_* at all.
 * So the fresh-set test has to consider click ids, or an autotagged ad click
 * would look like "no attribution present" and never latch. That is precisely
 * the bug this key list was extended to fix.
 */
export function captureAttribution(): Attribution {
  if (typeof window === 'undefined') return {};

  const params = new URLSearchParams(window.location.search);
  const fresh: Attribution = {};
  for (const key of ATTRIBUTION_KEYS) {
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
