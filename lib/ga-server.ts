import { createHash } from 'node:crypto';
import { GA_ENABLED, GA_MEASUREMENT_ID, type ConversionEvent, type EventParams } from '@/lib/analytics';
import type { UtmKey } from '@/lib/students';

/**
 * Server-side conversions, via the GA4 Measurement Protocol.
 *
 * ---------------------------------------------------------------------------
 * WHY THE SERVER FIRE IS THE AUTHORITATIVE ONE
 * ---------------------------------------------------------------------------
 * lib/analytics.ts `track()` fires from the browser and will keep doing so —
 * it is instant and it carries the full session context. But it is also the
 * copy that goes missing: ad blockers drop gtag outright, Safari ITP caps the
 * cookie, and a student who closes the tab on Stripe's redirect never runs the
 * mirror at all. Industry loss on browser-only conversion tracking is 20–30%.
 *
 * Under-reporting by a quarter is not a cosmetic problem here. Smart Bidding
 * learns from the conversions it is given, so a systematically missing quarter
 * teaches it that the traffic which happens to block trackers does not convert,
 * and it bids away from it. The webhook fire cannot be blocked: it is a Stripe
 * datacentre calling a Vercel function, with no browser in the path.
 *
 * So the split is: server = the number of record, client = a fast mirror for
 * DebugView and realtime. Both use the same event names, and GA4 deduplicates
 * nothing — see the double-count note on sendServerConversion.
 *
 * ---------------------------------------------------------------------------
 * FAIL-CLOSED, LIKE GA_ENABLED
 * ---------------------------------------------------------------------------
 * Missing config disables the send and logs once; it never throws. A webhook
 * that 500s because analytics was not configured would make Stripe retry the
 * delivery for hours and re-run the billing side effects around it. Losing a
 * conversion is bad; losing an idempotent webhook is worse.
 */

const MP_ENDPOINT = 'https://www.google-analytics.com/mp/collect';

/**
 * The validation endpoint. Same payload, but it returns a
 * `validationMessages` array instead of silently accepting anything.
 *
 * This exists because the real endpoint answers 204 to absolutely everything,
 * including a payload with a misspelled parameter or a `value` with no
 * `currency` — the event simply never appears in a report and there is no
 * signal anywhere that it was rejected. Set GA_DEBUG_ENDPOINT=1 while wiring
 * this up and read the messages.
 */
const MP_DEBUG_ENDPOINT = 'https://www.google-analytics.com/debug/mp/collect';

const GA_API_SECRET = process.env.GA_API_SECRET ?? '';

/**
 * Puts server-side conversions into GA4 DebugView. OFF unless explicitly set.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS: DebugView COULD NOT SEE THESE EVENTS AT ALL.
 * ---------------------------------------------------------------------------
 * DebugView only shows hits flagged as debug traffic. For the browser that flag
 * comes from the Google Analytics Debugger extension or a `debug_mode` config
 * param; for the Measurement Protocol nothing sets it implicitly, so every
 * webhook conversion this file has ever sent was invisible there. Anyone told to
 * "verify the pipeline in DebugView" was therefore verifying the browser mirror
 * and concluding something about the server fire — or watching an empty report
 * and concluding the pipeline was broken.
 *
 * GA_DEBUG_ENDPOINT is a different tool and does not substitute: it swaps in the
 * validation endpoint, which checks the payload's schema and DOES NOT RECORD the
 * event. Schema check versus delivery check.
 *
 * ---------------------------------------------------------------------------
 * SET IT, VERIFY, UNSET IT. DO NOT LEAVE IT ON IN PRODUCTION.
 * ---------------------------------------------------------------------------
 * Two reasons, one certain and one unverified:
 *
 *   Certain: DebugView is a rolling near-real-time view, so this is only useful
 *   while somebody is watching it.
 *   UNVERIFIED HAZARD: GA4 is documented to treat debug traffic differently from
 *   ordinary traffic, and this session could not confirm against Google's current
 *   docs whether `debug_mode` hits are excluded from standard reports. If they
 *   are, leaving this on would silently drop every money conversion out of
 *   reporting — the worst possible failure for this file. So it is opt-in, it
 *   defaults off, and docs/measurement-spec.md carries the same warning.
 *
 * The value is sent as `debug_mode: true` inside the event params, which is where
 * the Measurement Protocol reads it from.
 */
const GA_DEBUG_MODE = process.env.GA_DEBUG_MODE === '1';

/** True when a server-side conversion can actually be sent. */
export const GA_SERVER_ENABLED = GA_ENABLED && GA_API_SECRET.length > 0;

/**
 * Fallback client id used when the booking form failed to capture one.
 *
 * GA4 rejects a payload with no client_id, so the alternative to a placeholder
 * is dropping the conversion entirely. A synthetic id keeps the count and the
 * value correct while making the attribution loss visible: these land as
 * "Direct / (not set)" and, because the id is stable, they collapse into one
 * fake user rather than inflating the user count. If this bucket grows, the
 * booking form has stopped reading the _ga cookie — that is the bug to chase,
 * not this constant.
 */
const UNATTRIBUTED_CLIENT_ID = '0.0';

type ServerConversion = {
  event: ConversionEvent;
  /** GA4 client id stashed on the Stripe Customer at booking time. */
  clientId: string | null;
  /** Monetary worth of the conversion in whole USD. Omit for valueless events. */
  valueUsd?: number;
  /** Plain email; hashed here, never sent raw. See userData(). */
  email?: string | null;
  utm?: Partial<Record<UtmKey, string>>;
  params?: EventParams;
  /** When the conversion happened, if not now. Backdating limit is 72 hours. */
  occurredAt?: Date;
  /**
   * Whether the student is a minor, emitted as the `is_minor` parameter.
   *
   * ---------------------------------------------------------------------------
   * ONE OF THE THREE DIMENSIONS THAT DECIDE THE ECONOMICS, AND THE ONLY ONE THE
   * SERVER-SIDE MONEY EVENTS DO NOT CURRENTLY SEND.
   * ---------------------------------------------------------------------------
   * `mode` and `lookup_key` already ride along in `params` from every webhook
   * call site. `is_minor` does not, so today it is impossible to ask whether a
   * booking made by a parent converts to a plan at a different rate from one made
   * by an adult student — and it plainly does, because the person being sold to
   * is not the person taking the lesson, which changes the ad copy, the objection
   * and the decision time.
   *
   * This is a typed seam, deliberately: it is declared here so the fix is a
   * one-line diff in a file this change did not own. Every call site in
   * app/api/stripe/webhook/route.ts already has the Student in hand, and the
   * record carries `guardianEmail` (lib/students.ts), so the missing line is
   * literally `minor: Boolean(student?.guardianEmail),` beside the existing
   * `email:` on each sendServerConversion call. docs/measurement-spec.md names
   * all four.
   *
   * Until then it is undefined and the parameter is simply absent rather than
   * being sent as a misleading `false` — an absent parameter reports as
   * "(not set)" in GA4, which is the truth here: not known, rather than known to
   * be an adult.
   */
  minor?: boolean | null;
};

/**
 * SHA-256 of an email, normalised the way Google requires: trimmed, lowercased.
 *
 * Skipping the normalisation is the classic silent failure — " Foo@Bar.com "
 * and "foo@bar.com" hash to different values, Google's side finds no match, and
 * Enhanced Conversions reports 0% match rate with no error anywhere. Gmail dots
 * and +tags are deliberately NOT stripped: Google's own documented
 * normalisation for the email field is trim + lowercase only, and inventing
 * extra steps would produce a hash their side cannot match either.
 */
export function hashEmail(email: string): string {
  return createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
}

/**
 * Enhanced Conversions payload.
 *
 * Sending the hash rather than the address is the whole point: Google can match
 * a hashed identifier against a signed-in Google account, which recovers
 * conversions that cookie-based attribution lost, and no readable personal data
 * leaves this server. Hashing happens here, at the boundary, so no caller can
 * accidentally pass a raw address through.
 *
 * ---------------------------------------------------------------------------
 * THIS DEPENDS ON `ad_user_data` BEING GRANTED. DO NOT RE-DENY IT.
 * ---------------------------------------------------------------------------
 * Enhanced Conversions is a matching process on Google's side, and Google will
 * not perform the match for a user whose Consent Mode `ad_user_data` signal is
 * denied. The site's Consent Mode defaults (components/SiteAnalytics.tsx) grant
 * it outside the EEA/UK/CH for exactly this reason.
 *
 * The failure mode if someone tightens that back to a blanket deny is the worst
 * kind: this function keeps running, the endpoint keeps returning 204, no error
 * appears anywhere, and the match rate in Google Ads quietly goes to zero. If
 * Enhanced Conversions ever reports 0% matched, check the consent defaults
 * before suspecting the hashing here.
 */
function userData(email: string | null | undefined) {
  if (!email) return undefined;
  return { sha256_email_address: [hashEmail(email)] };
}

let warned = false;
function warnOnce(reason: string) {
  if (warned) return;
  warned = true;
  console.warn(
    `[ga-server] server-side conversions are OFF: ${reason}. ` +
      'Billing still works and the client-side mirror in lib/analytics.ts still fires, but the ' +
      'authoritative conversion is not being recorded, so Google Ads is bidding on partial data. ' +
      'Set GA_API_SECRET (GA4 Admin → Data Streams → your stream → Measurement Protocol API secrets) ' +
      'in .env.local and in Vercel.',
  );
}

/**
 * Send one conversion to GA4. Resolves to whether it was sent.
 *
 * NOT idempotent, and cannot be: the Measurement Protocol has no event id and
 * no deduplication, so calling this twice records two conversions and doubles
 * the value the ad account bids against. Idempotency has to be enforced by the
 * caller — every call site in app/api/stripe/webhook/route.ts sits behind an
 * event-type check whose Stripe event fires once per object lifecycle.
 */
export async function sendServerConversion(conversion: ServerConversion): Promise<boolean> {
  if (!GA_SERVER_ENABLED) {
    warnOnce(GA_ENABLED ? 'GA_API_SECRET is not set' : 'NEXT_PUBLIC_GA_MEASUREMENT_ID is missing or malformed');
    return false;
  }

  const params: EventParams = {
    ...conversion.utm,
    // Denormalised the same way lib/analytics.ts does it, so a GA4 report can
    // group client and server copies of an event by the same dimension.
    campaign: conversion.utm?.utm_campaign ?? 'none',
    ...conversion.params,
    ...(conversion.minor === undefined || conversion.minor === null
      ? {}
      : { is_minor: conversion.minor }),
    // GA4 discards `value` unless `currency` accompanies it, silently. The two
    // are set together here so no call site can send a half-pair.
    ...(conversion.valueUsd === undefined
      ? {}
      : { value: conversion.valueUsd, currency: 'USD' }),
    // Without this, GA4 treats the hit as non-engaged and it is absent from
    // realtime and from most standard reports even though it was accepted.
    engagement_time_msec: 1,
    // Lets a report separate the authoritative fire from the browser mirror.
    // The mirror fires under a different event NAME too (`<event>_client`, see
    // components/coach/ConversionMirror.tsx); this stays because it is the
    // dimension a single report can group both sides by.
    delivery: 'server',
    // Opt-in only. See the warning on GA_DEBUG_MODE above before setting it.
    ...(GA_DEBUG_MODE ? { debug_mode: true } : {}),
  };

  /*
   * ===========================================================================
   * AN EMPTY transaction_id IS WORSE THAN NO transaction_id. STRIPPED HERE.
   * ===========================================================================
   * Two call sites send `transaction_id: bookingUid ?? ''` — the assessment
   * branch in app/api/stripe/webhook/route.ts, and any future one that follows
   * the same shape. The `?? ''` is there because a SetupIntent could arrive
   * without booking metadata, which is rare but real.
   *
   * BE PRECISE ABOUT THE RISK, because an earlier version of this comment was
   * not and the imprecision was itself the bug elsewhere in this codebase (see
   * the header of components/coach/ConversionMirror.tsx): a GA4-imported key
   * event is NOT deduplicated by Google Ads on transaction_id. GA4 hands Ads a
   * count it has already computed, and GA4 deduplicates on transaction_id only
   * for the ecommerce `purchase` event, which these deliberately are not. So an
   * empty transaction_id is not collapsing conversions in the ad account today.
   *
   * It is stripped anyway, for three reasons that do hold:
   *
   *   1. '' is a shared identifier waiting for a mechanism that DOES dedupe on
   *      it. Google Ads' own conversion tag and Offline Conversion Import both
   *      do — and Offline Conversion Import is exactly where this funnel is
   *      heading once ~30 students exist (scripts/offline-conversions.ts). At
   *      that point every conversion carrying '' collapses into one and the rest
   *      are discarded, silently.
   *   2. It breaks the join this identifier exists for. `slot_reserved` →
   *      `assessment_booked` and `checkout_started` → `pack_purchased` are
   *      matched on transaction_id; rows keyed on '' match each other, so
   *      card-hold and checkout abandonment come out wrong.
   *   3. Omitting it is simply the truth. An absent parameter reports as
   *      "(not set)" — identity not established — rather than as an identity
   *      that several unrelated conversions appear to share.
   *
   * Dropping it cannot open a double-count: the browser mirror fires under a
   * different event name entirely now, and refuses to fire at all without a
   * transaction_id.
   *
   * The warning is loud because a rising count here means booking metadata is
   * going missing upstream, and that is the bug worth chasing rather than this
   * line.
   */
  if (params.transaction_id === '') {
    delete params.transaction_id;
    console.warn(
      `[ga-server] ${conversion.event} arrived with an EMPTY transaction_id, so the parameter was ` +
        'omitted rather than sent. "" is an identity several unrelated conversions would appear to ' +
        'share, which breaks the slot_reserved/checkout_started joins now and will collapse rows in ' +
        'Offline Conversion Import later. The upstream cause is missing booking/session metadata on ' +
        'the Stripe object — chase that, not this line.',
    );
  }

  const body: Record<string, unknown> = {
    client_id: conversion.clientId ?? UNATTRIBUTED_CLIENT_ID,
    events: [{ name: conversion.event, params }],
    ...(userData(conversion.email) ? { user_data: userData(conversion.email) } : {}),
    ...(conversion.occurredAt
      ? { timestamp_micros: conversion.occurredAt.getTime() * 1000 }
      : {}),
  };

  const debug = process.env.GA_DEBUG_ENDPOINT === '1';
  const url = `${debug ? MP_DEBUG_ENDPOINT : MP_ENDPOINT}?measurement_id=${encodeURIComponent(
    GA_MEASUREMENT_ID,
  )}&api_secret=${encodeURIComponent(GA_API_SECRET)}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      // Google's endpoint is fast or broken; a webhook must not sit on it.
      signal: AbortSignal.timeout(5000),
    });

    if (debug) {
      const text = await response.text();
      console.log(`[ga-server] debug validation for ${conversion.event}: ${text}`);
    }

    if (!response.ok) {
      console.error(
        `[ga-server] ${conversion.event} rejected with HTTP ${response.status}. ` +
          'The live endpoint answers 204 to almost anything, so a non-2xx here usually means a bad ' +
          'measurement_id or api_secret rather than a bad payload.',
      );
      return false;
    }
    return true;
  } catch (error) {
    // Swallowed on purpose. See the fail-closed note in the file header: a
    // throw here would fail the webhook and make Stripe replay it.
    console.error(`[ga-server] ${conversion.event} failed to send:`, error);
    return false;
  }
}
