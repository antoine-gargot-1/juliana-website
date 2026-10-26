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
   * Outbound click on a show's ticket link (any `a[data-ticket]`). Tickets sell
   * off-site (DICE for the Nov 2026 release show), so this click is the last step
   * the site can measure; the ticketing dashboard is the ground truth. Mirrored
   * to Meta as InitiateCheckout for ad optimisation and retargeting exclusions.
   */
  | 'ticket_click'
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
  | 'retained_student'
  /* =================================================================== */
  /* BROWSER MIRRORS OF THE THREE MONEY EVENTS                            */
  /* =================================================================== */
  /**
   * ---------------------------------------------------------------------------
   * WHY THE MIRROR HAS ITS OWN NAMES. THIS FIXED A LIVE DOUBLE-COUNT.
   * ---------------------------------------------------------------------------
   * `assessment_booked`, `pack_purchased` and `plan_started` each fire twice by
   * design: once authoritatively from the Stripe webhook via the Measurement
   * Protocol, and once from the browser as a mirror for DebugView and for the
   * case where webhook delivery is delayed. Both hits carried the SAME event name
   * and the same `transaction_id`, and the mirror was believed safe because
   * "Google Ads deduplicates imported conversions that share a transaction_id".
   *
   * THAT PREMISE WAS WRONG, and it was wrong in the expensive direction:
   *
   *   - GA4 performs transaction_id deduplication for the ECOMMERCE `purchase`
   *     event specifically. These are custom event names — deliberately so, see
   *     the naming note on `pack_purchased` — and GA4 deduplicates custom events
   *     not at all. Two hits are two key events.
   *   - Google Ads imports a GA4 key event as a COUNT that GA4 has already
   *     computed. So the doubling happens upstream of anything Google Ads could
   *     deduplicate, and the order-id dedupe that does exist applies to Google
   *     Ads' own conversion tag and to Offline Conversion Import, not to a
   *     GA4-imported key event.
   *   - `claimConversion()` in the webhook is server-side idempotency. It cannot
   *     see a browser hit.
   *
   * The result was Smart Bidding bidding on roughly double the true conversion
   * volume at double the value — which is worse than under-reporting, because it
   * looks like the campaign working. It also meant the account would appear to
   * clear the ~15–30 conversions/30-days threshold that bidding strategies need
   * while actually being at half that.
   *
   * So the mirror now fires under its own name. The ad account imports only the
   * server-side names and can no longer be inflated by a browser hit.
   *
   * ---------------------------------------------------------------------------
   * WHAT THE PAIR IS FOR NOW, AND IT IS GENUINELY USEFUL
   * ---------------------------------------------------------------------------
   * Same `transaction_id` on both sides, so the two are joinable. Server count
   * minus client count MEASURES THIS SITE'S OWN BROWSER-SIDE LOSS — the real
   * figure for this traffic, rather than the industry 20–30% estimate that every
   * comment in this codebase currently has to assume. That number is what tells
   * you how far to trust the client-only funnel-step events below.
   *
   * IMPORT NONE OF THESE THREE INTO GOOGLE ADS. Ever. They are a measurement of
   * measurement. See docs/measurement-spec.md §4.4.
   */
  | 'assessment_booked_client'
  | 'pack_purchased_client'
  | 'plan_started_client'
  /* =================================================================== */
  /* FUNNEL-STEP EVENTS — the middle of the funnel                        */
  /* =================================================================== */
  /**
   * ---------------------------------------------------------------------------
   * WHY THESE SIX EXIST: THE ENDS WERE MEASURED AND THE MIDDLE WAS NOT.
   * ---------------------------------------------------------------------------
   * Before these, the coaching funnel reported a `page_view` on /coach/book and
   * then, two to three minutes and three steps later, an `assessment_booked`
   * from a Stripe webhook. Nothing in between existed. So when CPA came in high
   * the only available answer was "people are not booking", with no way to tell
   * a visitor who never typed a name from one who picked a slot and then balked
   * at the card — two problems with opposite fixes (the ad promise versus the
   * card copy), and no data to choose between them.
   *
   * The booking form's three steps all live on ONE URL (/coach/book): the status
   * machine in components/coach/BookingForm.tsx swaps the rendered step without
   * a navigation. That is deliberate and good for the visitor, and it means a
   * GA4 funnel exploration built on `page_path` is structurally incapable of
   * seeing steps 2 and 3. There is no configuration in GA4 that recovers this;
   * only an event can.
   *
   * ---------------------------------------------------------------------------
   * NAMING: THE SAME TRAP AS `video_start`, AND TWO MORE OF THEM.
   * ---------------------------------------------------------------------------
   * Read the NOTE ON NAMING on `video_play` above first — this is the same
   * failure re-encountered. GA4 will merge an event of ours into an
   * automatically-collected event of the same name, keep its own parameter
   * schema, and drop ours; the breakdown then reads "(not set)" and looks like a
   * tracking bug rather than a name collision.
   *
   * Three names were specifically avoided here:
   *
   *   form_start / form_submit  Enhanced Measurement's "Form interactions"
   *                             collects BOTH automatically for any real <form>
   *                             element — which BookingForm is. So GA4 is
   *                             already firing `form_start` and `form_submit` on
   *                             this form today, with `form_id`/`form_name` and
   *                             nothing else: no step, no mode, no minor flag,
   *                             and one `form_submit` for a form that has three
   *                             steps. Useless for this funnel, and fatal to
   *                             collide with.
   *   begin_checkout            a GA4 RECOMMENDED ecommerce event with an
   *                             expected `items[]` / `value` / `currency`
   *                             schema. Same reasoning as `pack_purchased` not
   *                             being `purchase`: match Google's names only when
   *                             matching their schema, or the Monetisation
   *                             reports render half-populated and look broken.
   *
   * None of the six uses a reserved prefix either (`_`, `firebase_`, `ga_`,
   * `google_`, `gtag.`), which GA4 rejects outright.
   */
  /**
   * A booking step became visible. `step` is 1 | 2 | 3, `step_name` is the
   * matching BOOKING_STEPS value.
   *
   * THIS ONE EVENT CARRIES THE WHOLE PROGRESSION, because a step is only
   * reachable by completing the one before it:
   *
   *   step_view(1)        arrived on the form
   *   step_view(2)        step 1 completed — details validated, calendar shown
   *   step_view(3)        step 2 completed — Cal.com has the slot
   *   assessment_booked   step 3 completed — the $0 card hold succeeded
   *
   * So there is deliberately NO `booking_step_complete`: it would be the same
   * numbers under a second name, and a duplicate event that can drift out of
   * agreement with the first is worse than no event.
   *
   * CLIENT-SIDE ONLY, therefore systematically short by the usual 20–30% (ad
   * blockers, Safari ITP). Use it for RATIOS between steps, never as an absolute
   * count next to the server-side `assessment_booked` — the step-3-to-booked
   * ratio will read above 100% for that reason alone.
   */
  | 'booking_step_view'
  /**
   * Step 1 was submitted and validation refused it.
   *
   * The point of this event is `first_field` and `fields`: it turns "people drop
   * off on step 1" into "people drop off on the guardian email field". Those two
   * findings have completely different fixes and the first one is unactionable.
   *
   * Carries FIELD KEYS ONLY — `name`, `email`, `guardianEmail`, `mode`, `age`.
   * Never the values in them. See the PII note on getFunnelParams below.
   */
  | 'booking_step_blocked'
  /**
   * The visitor left the booking flow without reaching the next step.
   *
   * Redundant with the step_view ratios for counting, and not redundant at all
   * for reading: it puts the step, the time spent on it and whether validation
   * had already refused them once into a single row, which is what makes a
   * drop-off attributable to a step rather than merely visible as a gap between
   * two numbers.
   */
  | 'booking_abandoned'
  /**
   * Cal.com confirmed the slot. Fires alongside `booking_step_view` step 3.
   *
   * WHY IT NEEDS ITS OWN NAME RATHER THAN BEING A step_view PARAMETER. GA4's
   * "mark as key event" and Google Ads' conversion import are both scoped to the
   * event NAME, not to a name plus a parameter filter. Marking
   * `booking_step_view` as a key event would count arrivals on step 1 as
   * conversions. So the one intermediate milestone worth importing gets its own
   * name.
   *
   * WHY IT IS WORTH IMPORTING: it is the only mid-funnel signal that arrives
   * within a minute of the click AND represents a real commitment (half an hour
   * on a real calendar). `assessment_booked` needs the card step too, and in a
   * low-volume account Smart Bidding starves on it. See docs/measurement-spec.md
   * for when to promote this to Primary.
   *
   * Carries `transaction_id` = the Cal.com booking uid, the SAME value
   * `assessment_booked` uses. That is not for deduplication — the two are
   * different conversion actions and Google Ads only dedupes within one — it is
   * so a GA4 exploration can join a reserved slot to the booking it became, or
   * fail to become, and get card-hold abandonment as a number.
   */
  | 'slot_reserved'
  /**
   * A Stripe Checkout Session was created and the browser is being sent to it.
   *
   * Fires from components/coach/Purchase.tsx AFTER /api/stripe/checkout has
   * answered with a session, so it means "a real payable session exists", not
   * "a button was clicked". Carries `transaction_id` = the Checkout Session id,
   * which is the same identifier `pack_purchased` uses, so completed-versus-
   * started is a join rather than a guess. A `checkout.session.completed` with
   * no matching `checkout_started` used to be indistinguishable from a
   * `checkout_started` that never completed — both were simply invisible.
   *
   * ---------------------------------------------------------------------------
   * DO NOT IMPORT THIS INTO GOOGLE ADS AS A CONVERSION ACTION.
   * ---------------------------------------------------------------------------
   * It carries `value` (the amount the session is for) so that abandoned
   * checkout can be measured in dollars. Importing it alongside
   * `pack_purchased` would count that money twice — once when the session opens
   * and again when it is paid — and Smart Bidding would bid against revenue that
   * was never collected. It is a diagnostic, not a conversion.
   */
  | 'checkout_started'
  /**
   * A purchase attempt stopped before a Checkout Session existed. `reason` says
   * why: `renewal_consent`, `guardian_email`, `not_configured`, `unreachable`,
   * `no_url`, `network`.
   *
   * `not_configured` is the one to watch. It is the visitor-facing "Purchasing
   * is not switched on yet" branch — a 503 from /api/stripe/checkout — which on
   * a live deployment means Stripe credentials are missing and every purchase is
   * failing. Today that state is completely silent: the buyer sees a sentence
   * offering them an email address and nobody else ever finds out.
   */
  | 'checkout_blocked';

/* ------------------------------------------------------------------ */
/* Funnel vocabulary                                                   */
/* ------------------------------------------------------------------ */

/**
 * The three booking steps, numbered and named in ONE place.
 *
 * components/coach/BookingForm.tsx renders these, this file reports them, and
 * docs/measurement-spec.md tells a human which GA4 custom dimension to build a
 * funnel on. If the numbers and the names live in three files they will
 * eventually disagree, and the symptom is a GA4 funnel step that silently
 * matches nothing — which reads as "nobody reaches step 2".
 *
 * The names deliberately match BookingForm's own `Status` union values, except
 * that `handoff` is reported as `hold`: what the visitor is doing at step 3 is
 * holding the slot with a card, and the rail, the step label and the report
 * should all call it the same thing.
 */
export const BOOKING_STEPS = {
  1: 'details',
  2: 'schedule',
  3: 'hold',
} as const;

export type BookingStep = keyof typeof BOOKING_STEPS;

/**
 * The three dimensions every conversion in this funnel must be sliceable by,
 * assembled in one place so no call site can forget one.
 *
 * WHY THESE THREE AND NOT OTHERS. They are the ones that change the economics,
 * so a blended average across them is not a summary, it is a wrong number:
 *
 *   mode        online LTV is $2,520, in-person $3,240, and the assessment is
 *               valued at $1,150 versus $1,450 (lib/pricing.ts). A CPA that is
 *               profitable for one can be a loss on the other.
 *   lookup_key  the tier. Per-lesson economics differ across single / monthly /
 *               pack, and "which tier does paid traffic actually buy" cannot be
 *               answered without it.
 *   is_minor    a guardian pays, which changes who has to be convinced, which
 *               ad copy speaks to them, and how long the decision takes.
 *
 * ---------------------------------------------------------------------------
 * NO PII. THIS IS A HARD LINE, NOT A PREFERENCE.
 * ---------------------------------------------------------------------------
 * `is_minor` is a BOOLEAN, never the age, never the guardian's name or email.
 * Nothing in this funnel may send an email address, a name, a guardian detail
 * or the free-text goals field to GA4. Google's terms prohibit sending data
 * that could identify an individual to Analytics, and the enforcement is
 * property deletion rather than a warning; the goals textarea in particular is
 * a place where a visitor may volunteer a medical or a family detail.
 *
 * The one sanctioned exception is the SHA-256 email hash in `user_data` for
 * Enhanced Conversions, which happens server-side only and never through
 * track() — see hashEmail/userData in lib/ga-server.ts. Everything on this path
 * is a dimension, not an identity.
 */
export function funnelParams(input: {
  mode?: 'online' | 'inperson' | null;
  lookupKey?: string | null;
  isMinor?: boolean;
}): EventParams {
  return {
    // 'none' rather than omitted: an absent parameter reports as "(not set)" in
    // GA4, which is indistinguishable from a tracking failure. A visitor who has
    // not chosen a mode yet is a real and interesting state on step 1.
    mode: input.mode ?? 'none',
    lookup_key: input.lookupKey ?? '',
    is_minor: input.isMinor ?? false,
  };
}

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
    /** Meta Pixel. Artist pages only — see components/artist/MetaPixel.tsx. */
    fbq?: (...args: unknown[]) => void;
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
    /*
     * Which side fired this hit, defaulted here rather than at each call site.
     *
     * lib/ga-server.ts stamps `delivery: 'server'` on every Measurement Protocol
     * hit, and ConversionMirror stamped 'client' on its two events, but plain
     * track() calls sent nothing — so a GA4 report comparing the authoritative
     * server fire against the browser mirror had one populated value and one
     * "(not set)", and "(not set)" is also what a broken parameter looks like.
     * With both sides labelled, "how much of my conversion volume is the browser
     * losing" is a two-row report instead of an inference.
     *
     * Spread first so an explicit params.delivery still wins.
     */
    delivery: 'client',
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
