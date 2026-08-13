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
    // GA4 discards `value` unless `currency` accompanies it, silently. The two
    // are set together here so no call site can send a half-pair.
    ...(conversion.valueUsd === undefined
      ? {}
      : { value: conversion.valueUsd, currency: 'USD' }),
    // Without this, GA4 treats the hit as non-engaged and it is absent from
    // realtime and from most standard reports even though it was accepted.
    engagement_time_msec: 1,
    // Lets a report separate the authoritative fire from the browser mirror.
    delivery: 'server',
  };

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
