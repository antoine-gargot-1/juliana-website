import { createHmac, timingSafeEqual } from 'node:crypto';
import type { LessonMode } from '@/lib/pricing';

/**
 * Cal.com — the scheduler of record for assessment slots.
 *
 * ---------------------------------------------------------------------------
 * WHY THERE IS AN API CLIENT AT ALL, AND NOT JUST A WEBHOOK
 * ---------------------------------------------------------------------------
 * Cal.com redirects the student to /coach/book/hold immediately after they pick
 * a slot, and it sends a BOOKING_CREATED webhook separately. Those two race,
 * and the redirect usually wins — a browser redirect is one hop, a webhook goes
 * through a queue.
 *
 * If the hold page waited for the webhook it would have to poll or stall on the
 * single step in the funnel that must be instant, so instead it reads the
 * booking straight from the API by uid. The webhook then arrives whenever it
 * arrives and serves as the durable, signed record of the slot. Two paths to the
 * same fact, neither blocking the other.
 *
 * ---------------------------------------------------------------------------
 * VERSIONS AND HEADERS ARE NOT GUESSABLE — CHECK THEM
 * ---------------------------------------------------------------------------
 * Cal.com's v2 API version-pins per endpoint through a `cal-api-version` header,
 * and the bookings endpoints have gone through several dated versions. The
 * constants below are what the docs specify at time of writing, but they have
 * NOT been exercised against a live Cal.com account — no CALCOM_API_KEY existed
 * when this was written. Before launch, confirm both against the account:
 *
 *   1. the `cal-api-version` value the bookings endpoint expects, and
 *   2. the exact signature header name in Settings → Developer → Webhooks.
 *
 * getBooking() surfaces the raw error body on a non-2xx precisely so a version
 * mismatch reads as "Cal.com said X" instead of an unexplained null.
 */

const API_BASE = 'https://api.cal.com/v2';

/**
 * Version pins, per endpoint group.
 *
 * v2 versions each endpoint group independently through the `cal-api-version`
 * header, so there is no single "the API version" to set — bookings, schedules
 * and event types are all on different dates and a wrong pin returns a shape
 * mismatch rather than a clear error. Every value below was confirmed with a live
 * request against the account (HTTP 200, expected payload shape); do not change
 * one without re-confirming it the same way.
 *
 * API v1 is DECOMMISSIONED and returns
 * `{"message":"API v1 has been decommissioned. Please migrate to API v2"}`.
 * Any v1 URL written from memory will fail.
 */
const API_VERSIONS = {
  bookings: '2024-08-13',
  eventTypes: '2024-06-14',
  schedules: '2024-06-11',
  webhooks: '2024-06-14',
} as const;

export type CalEndpointGroup = keyof typeof API_VERSIONS;

/**
 * One request to Cal.com v2. Throws with the response body on any non-2xx.
 *
 * Surfacing Cal.com's own message matters more here than usual: a wrong
 * `cal-api-version` produces a perfectly valid-looking 400 whose only clue is in
 * the body, and swallowing it turns a two-second fix into an afternoon.
 */
export async function calRequest<T>(
  path: string,
  opts: { group: CalEndpointGroup; method?: string; body?: unknown } ,
): Promise<T> {
  const apiKey = process.env.CALCOM_API_KEY;
  if (!apiKey) {
    throw new Error(
      'CALCOM_API_KEY is not set.\n' +
        '  Cal.com → Settings → Developer → API keys. Webhooks plus redirect-after-booking need the\n' +
        '  Teams plan, and those two features are what keep booking and card capture one click apart.\n' +
        '  Put it in .env.local and in Vercel encrypted env. NEVER in .env — that file is committed.',
    );
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method: opts.method ?? 'GET',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'cal-api-version': API_VERSIONS[opts.group],
      ...(opts.body ? { 'content-type': 'application/json' } : {}),
    },
    ...(opts.body ? { body: JSON.stringify(opts.body) } : {}),
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      `Cal.com ${opts.method ?? 'GET'} ${path} failed with HTTP ${response.status}: ${text}\n` +
        `  cal-api-version sent: ${API_VERSIONS[opts.group]} (group "${opts.group}", lib/calcom.ts).\n` +
        '  If the message mentions a version, that pin is what needs updating.',
    );
  }

  return JSON.parse(text) as T;
}

/**
 * Cal.com signs the raw request body with HMAC-SHA256 and sends the hex digest
 * in this header. Both spellings are accepted on read because header casing is
 * not something to be strict about, and older Cal.com versions differ.
 */
const SIGNATURE_HEADERS = ['x-cal-signature-256', 'x-cal-signature'] as const;

export const calcomConfigured = () => Boolean(process.env.CALCOM_API_KEY);

/* ------------------------------------------------------------------ */
/* Signature verification                                              */
/* ------------------------------------------------------------------ */

export type SignatureResult =
  | { ok: true }
  | { ok: false; reason: 'no_secret' | 'no_signature' | 'mismatch' };

/**
 * Verify a Cal.com webhook against the RAW request body.
 *
 * `rawBody` must be the exact bytes Cal.com sent — the string from
 * `await request.text()`, never `JSON.stringify(await request.json())`. A
 * round-trip through parse/stringify reorders keys and drops whitespace, which
 * changes the digest and fails every signature. This is the single most common
 * way webhook verification "mysteriously" never works.
 *
 * Fails closed on a missing secret. An unverified webhook is an unauthenticated
 * POST that would let anyone on the internet assert that a lesson was booked, so
 * "no secret configured" has to mean "reject", not "skip the check".
 */
export function verifyCalcomSignature(rawBody: string, headers: Headers): SignatureResult {
  const secret = process.env.CALCOM_WEBHOOK_SECRET;
  if (!secret) return { ok: false, reason: 'no_secret' };

  let provided: string | null = null;
  for (const name of SIGNATURE_HEADERS) {
    const value = headers.get(name);
    if (value) {
      provided = value.trim();
      break;
    }
  }
  if (!provided) return { ok: false, reason: 'no_signature' };

  const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');

  // Constant-time, length-checked first: timingSafeEqual throws rather than
  // returning false when lengths differ. Compared case-insensitively because hex
  // casing is not part of the signature.
  const a = Buffer.from(provided.toLowerCase());
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, reason: 'mismatch' };

  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Replay defence                                                      */
/* ------------------------------------------------------------------ */

/**
 * How old a Cal.com delivery may be before it is refused.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS AN HOUR AND NOT STRIPE'S FIVE MINUTES
 * ---------------------------------------------------------------------------
 * Stripe signs `t=<unix>` INTO the signature, so its SDK can enforce a 300-second
 * tolerance cryptographically. Cal.com signs the body and nothing else: there is
 * no signed timestamp, so the only clock available is `createdAt` inside the
 * payload — which is covered by the HMAC (tampering with it invalidates the
 * signature) but is the sender's own claim about when it composed the message,
 * not about when it sent this particular attempt.
 *
 * That distinction sets the window. Cal.com retries a failed delivery with
 * backoff, and a retry carries the ORIGINAL `createdAt`, so a tolerance of five
 * minutes would reject exactly the legitimate redeliveries this endpoint exists to
 * absorb — and Cal.com disables an endpoint that keeps failing. An hour is long
 * enough for every retry schedule Cal.com uses and short enough that a delivery
 * captured today is useless tomorrow.
 */
export const CALCOM_MAX_DELIVERY_AGE_MS = 60 * 60 * 1000;

/**
 * Tolerance for a timestamp in the future — server clock skew, nothing more.
 * Without it, a Cal.com host running a few seconds ahead of ours would have every
 * delivery refused.
 */
const CALCOM_MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

export type FreshnessResult =
  | { ok: true; unverifiable: boolean }
  | { ok: false; reason: 'stale' | 'future'; ageMs: number };

/**
 * Is this delivery recent enough to act on?
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS STOPS, AND WHAT REMAINS UNPROTECTED. BE HONEST ABOUT BOTH.
 * ---------------------------------------------------------------------------
 * STOPS: indefinite replay. Before this, a `(rawBody, x-cal-signature-256)` pair
 * captured once — from a proxy log, a misconfigured intermediary, a copied curl
 * command — verified forever, because an HMAC over a body has no expiry. Anyone
 * holding one pair could re-assert that booking at any point in the future.
 *
 * DOES NOT STOP: replay INSIDE the window. Detecting that needs a record of which
 * `booking.uid`s have already been processed, and a record means a datastore this
 * project does not have (Stripe is the store — see lib/students.ts — and it is not
 * a nonce table). So a captured delivery can still be resubmitted any number of
 * times within the hour.
 *
 * That residual is acceptable HERE and would not be everywhere. The Cal.com
 * handler only patches metadata through markAssessmentConfirmed — an idempotent
 * write of a booking uid and a slot time it already holds — and its single email
 * is Resend-idempotency-keyed on the uid. Replaying it N times produces the same
 * record and one email. If this handler ever gains a side effect that is not
 * idempotent, this comment stops being sufficient and the nonce store becomes
 * necessary.
 *
 * A MISSING OR UNPARSEABLE TIMESTAMP FAILS OPEN, and that is reasoned rather than
 * lazy. `createdAt` is inside the signed body, so an attacker replaying a captured
 * delivery cannot strip it — doing so breaks the signature. A delivery that
 * genuinely arrived without one is therefore Cal.com's own doing (a payload shape
 * change, a trigger that omits it), and refusing those would break real bookings
 * to defend against nothing. The `unverifiable` flag is returned so the caller can
 * say so in the log rather than silently accepting.
 */
export function checkDeliveryFreshness(
  createdAt: string | null,
  now: number = Date.now(),
): FreshnessResult {
  if (!createdAt) return { ok: true, unverifiable: true };

  const sentAt = new Date(createdAt).getTime();
  if (Number.isNaN(sentAt)) return { ok: true, unverifiable: true };

  const ageMs = now - sentAt;
  if (ageMs > CALCOM_MAX_DELIVERY_AGE_MS) return { ok: false, reason: 'stale', ageMs };
  if (ageMs < -CALCOM_MAX_CLOCK_SKEW_MS) return { ok: false, reason: 'future', ageMs };
  return { ok: true, unverifiable: false };
}

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

/**
 * The subset of a Cal.com booking this funnel needs, normalised.
 *
 * Deliberately narrow. Cal.com's booking payload is large and its shape differs
 * between the webhook and the REST response (`startTime` vs `start`, nested
 * `payload` vs top-level). Normalising once here means the route handlers and the
 * hold page work against one stable type, and a Cal.com schema change is a fix in
 * this file rather than in every consumer.
 */
export type CalBooking = {
  uid: string;
  title: string | null;
  start: Date | null;
  end: Date | null;
  attendeeName: string | null;
  attendeeEmail: string | null;
  /** The attendee's own timezone. Never assume Pacific — most students are not. */
  attendeeTimeZone: string | null;
  eventTypeId: number | null;
  /** Free-form answers from the Cal.com booking form, if any were configured. */
  responses: Record<string, unknown>;
  /**
   * Cal.com booking metadata — the PRIMARY attribution channel.
   *
   * ---------------------------------------------------------------------------
   * WHY THIS IS BETTER THAN `responses` AND WHY IT WAS THE MISSING PIECE
   * ---------------------------------------------------------------------------
   * `responses` only contains a value if a booking QUESTION with that exact
   * identifier has been configured on the event type. Nothing in this repo can
   * guarantee that: the questions live in Cal.com's dashboard, and an operator
   * renaming or removing one silently empties the field. Metadata needs no
   * configuration at all — anything passed as `metadata[key]=value` on the
   * booking URL is stored on the booking and returned verbatim by the REST API
   * and by the webhook.
   *
   * That distinction matters because of WHAT travels this way: the GA4
   * `client_id` and the ad click ids. Lose them and every server-side conversion
   * for that student lands in GA4 as `(not set)` and the click that paid for it
   * can never be credited — which is indistinguishable from not tracking at all,
   * except that it costs money.
   *
   * Before this field existed, `responses` was the only normalised channel, so
   * BookingForm had to send every value THREE ways (metadata, a prefilled
   * question, and a forwarded query param) hoping one survived. Surfacing
   * metadata is the clean fix: /coach/book/hold now reads metadata first and
   * treats the other two as fallbacks.
   */
  metadata: Record<string, unknown>;
  status: string | null;
};

export type CalWebhookEvent = {
  triggerEvent: string;
  createdAt: string | null;
  booking: CalBooking;
};

/* ------------------------------------------------------------------ */
/* Parsing                                                            */
/* ------------------------------------------------------------------ */

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const asString = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null;

const asDate = (value: unknown): Date | null => {
  const s = asString(value);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
};

/**
 * Normalise either payload shape into a CalBooking.
 *
 * Accepts both `startTime`/`endTime` (webhook) and `start`/`end` (REST v2),
 * because Cal.com genuinely uses different names in the two places and the
 * alternative is two near-identical parsers that drift apart.
 */
export function parseBooking(raw: unknown): CalBooking {
  const b = asRecord(raw);
  const attendees = Array.isArray(b.attendees) ? b.attendees.map(asRecord) : [];
  const attendee = attendees[0] ?? {};

  return {
    uid: asString(b.uid) ?? '',
    title: asString(b.title),
    start: asDate(b.startTime) ?? asDate(b.start),
    end: asDate(b.endTime) ?? asDate(b.end),
    attendeeName: asString(attendee.name),
    // Lowercased at the boundary. This email is the join key for the Stripe
    // Customer lookup and for the Enhanced Conversions hash, and both are
    // case-sensitive matches, so normalising once here prevents a duplicate
    // customer or a 0% match rate later.
    attendeeEmail: asString(attendee.email)?.toLowerCase() ?? null,
    attendeeTimeZone: asString(attendee.timeZone),
    eventTypeId: typeof b.eventTypeId === 'number' ? b.eventTypeId : null,
    // Both names for the same bag. The webhook payload calls it `responses`; the
    // v2 REST booking calls it `bookingFieldsResponses`. Merged here so one
    // parser serves both shapes rather than two that drift apart — which is the
    // same reason startTime/start are both accepted above.
    responses: { ...asRecord(b.bookingFieldsResponses), ...asRecord(b.responses) },
    metadata: asRecord(b.metadata),
    status: asString(b.status),
  };
}

/**
 * Booking fields that are composed free text and must never be read back out.
 *
 * ---------------------------------------------------------------------------
 * WHY A READ IS REFUSED RATHER THAN A WRITE BEING SANITISED
 * ---------------------------------------------------------------------------
 * components/coach/BookingForm.tsx builds Cal.com's `notes` field by joining
 * several answers into one blob, and for a student under 18 that blob contains
 * the line `Student is <age>; guardian <name>`. It is the right content for
 * Cal.com — the teacher reads it on the calendar entry, which is where a minor's
 * details belong, behind the scheduler's own access control.
 *
 * It is the wrong content for Stripe. `goals` is not among the keys BookingForm
 * puts in Cal.com booking metadata, so /coach/book/hold's
 * `at('goals') ?? at('notes')` fallback resolved to the blob EVERY time, and a
 * child's age plus their guardian's name were written onto a live Stripe Customer
 * under a field name that does not describe them — a flat key/value store
 * returned by every API read, visible to anyone with Dashboard access, included
 * in exports, and with no retention rule attached.
 *
 * So the blob stops here, at the one function every consumer reads bookings
 * through. This is data minimisation and not masking: the information is not
 * obscured, it simply is not copied into a second system that never needed it.
 * The consequence to accept is that `goals` on the Stripe Customer will be empty
 * unless a real `goals` booking question is configured on the Cal.com event type
 * (at which point `bookingValue(booking, 'goals')` returns that answer and
 * nothing here changes). Empty is correct: nothing in this codebase reads
 * `student.goals`, so the field was pure retention with no consumer.
 *
 * `additionalNotes` is Cal.com's own identifier for the same field on some
 * payload shapes, and `description` is the event description; both are listed so
 * a Cal.com payload rename cannot quietly reopen this.
 */
const COMPOSED_FREE_TEXT_KEYS = new Set(['notes', 'additionalNotes', 'description']);

/**
 * Read one value that could have arrived by any of the three routes, in order of
 * how much we can rely on it.
 *
 * ORDER IS THE POINT, so this is a named function rather than a chain of `??` at
 * each call site:
 *
 *   1. metadata   needs no event-type configuration, so it cannot be broken by
 *                 someone editing booking questions in the Cal.com dashboard.
 *   2. responses  only present when a booking question with this exact
 *                 identifier exists on the event type.
 *   3. (caller)   the forwarded query param on the redirect URL, which requires
 *                 "forward parameters" to be ticked on the redirect — a Teams
 *                 feature, and one that has not yet been exercised live.
 *
 * Returns undefined rather than '' so callers can use `??` without an empty
 * string masking a real value further down the chain.
 */
export function bookingValue(booking: CalBooking, key: string): string | undefined {
  // See COMPOSED_FREE_TEXT_KEYS. Returning undefined rather than throwing keeps
  // the caller's `?? ` chain working: a refused key behaves exactly like a key
  // the booking never carried, which is the truthful answer for this funnel.
  if (COMPOSED_FREE_TEXT_KEYS.has(key)) return undefined;

  for (const bag of [booking.metadata, booking.responses]) {
    const value = bag[key];
    if (typeof value === 'string' && value.length > 0) return value;
    // Cal.com wraps some booking-question answers as { value, label }.
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const inner = (value as Record<string, unknown>).value;
      if (typeof inner === 'string' && inner.length > 0) return inner;
    }
  }
  return undefined;
}

/** Parse a verified webhook body. Signature must already have been checked. */
export function parseWebhook(rawBody: string): CalWebhookEvent | null {
  try {
    const parsed = asRecord(JSON.parse(rawBody));
    const trigger = asString(parsed.triggerEvent);
    if (!trigger) return null;
    return {
      triggerEvent: trigger,
      createdAt: asString(parsed.createdAt),
      booking: parseBooking(parsed.payload),
    };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* REST client                                                        */
/* ------------------------------------------------------------------ */

/**
 * Fetch a booking by uid.
 *
 * Returns null when the booking genuinely is not there yet — Cal.com's own write
 * can lag its redirect by a moment — and throws on anything else, because a 401
 * from a bad API key and a 404 from a too-fast redirect need completely
 * different responses from the caller. The hold page can retry a null; it cannot
 * retry its way out of a wrong key.
 */
export async function getBooking(uid: string): Promise<CalBooking | null> {
  let body: { data?: unknown };
  try {
    body = await calRequest<{ data?: unknown }>(`/bookings/${encodeURIComponent(uid)}`, {
      group: 'bookings',
    });
  } catch (error) {
    // A 404 is not a failure here — Cal.com's own write can lag its redirect, so
    // "not there yet" is an expected transient state the hold page can retry. Any
    // other status is a real fault (a 401 from a bad key cannot be retried out of)
    // and is re-thrown so the caller can tell the two apart.
    if (error instanceof Error && error.message.includes('HTTP 404')) return null;
    throw error;
  }

  const booking = parseBooking(body.data);
  return booking.uid ? booking : null;
}

/* ------------------------------------------------------------------ */
/* Webhook subscription                                               */
/* ------------------------------------------------------------------ */

/**
 * Subscribe Cal.com to BOOKING_CREATED at a deployed URL.
 *
 * ---------------------------------------------------------------------------
 * DELIBERATELY NOT CALLED BY THE BOOTSTRAP SCRIPT
 * ---------------------------------------------------------------------------
 * A webhook needs a publicly reachable URL, and at the time of writing there is
 * no deployment. Creating one pointed at a guessed host would produce a
 * subscription that silently fails every delivery, and Cal.com disables endpoints
 * that keep failing — so the account would end up in a broken state that looks
 * configured.
 *
 * It is also the ONLY way to obtain CALCOM_WEBHOOK_SECRET: the secret is set here
 * and then has to be copied into the environment. So this runs once, by hand,
 * after the first deploy. docs/stripe-runbook.md has the exact command.
 *
 * `secret` should be generated with `openssl rand -base64 32` and stored as
 * CALCOM_WEBHOOK_SECRET before this is called — verification fails closed, so a
 * subscription whose secret nobody wrote down delivers nothing usable.
 */
export async function createBookingWebhook(args: {
  subscriberUrl: string;
  secret: string;
  triggers?: string[];
}): Promise<{ id: string | number; subscriberUrl: string }> {
  if (!args.subscriberUrl.startsWith('https://')) {
    throw new Error(
      `Cal.com webhook subscriberUrl must be https, got "${args.subscriberUrl}". A localhost or ` +
        'http URL cannot receive deliveries; use a deployed URL, or an https tunnel for local testing.',
    );
  }
  if (args.secret.length < 32) {
    throw new Error(
      'Cal.com webhook secret must be at least 32 characters (openssl rand -base64 32). A short ' +
        'HMAC key does not error — it just becomes forgeable, and this endpoint is what tells the ' +
        'system a lesson was booked.',
    );
  }

  const body = await calRequest<{ data: { id: string | number; subscriberUrl: string } }>('/webhooks', {
    group: 'webhooks',
    method: 'POST',
    body: {
      subscriberUrl: args.subscriberUrl,
      triggers: args.triggers ?? ['BOOKING_CREATED', 'BOOKING_CANCELLED', 'BOOKING_RESCHEDULED'],
      active: true,
      payloadTemplate: null,
      secret: args.secret,
    },
  });

  return body.data;
}

/* ------------------------------------------------------------------ */
/* Mode resolution                                                    */
/* ------------------------------------------------------------------ */

/**
 * Which delivery mode a Cal.com event type corresponds to.
 *
 * Online and in-person are separate Cal.com event types so that availability can
 * differ — in-person is restricted to IN_PERSON_DAYS, online is not. Mapping is
 * by event type id via env vars rather than by matching the event title, because
 * a title is copy and copy gets edited; renaming an event type must not silently
 * start billing in-person students at online rates.
 *
 * Returns null when it cannot tell. Callers must treat that as "trust the mode
 * the student chose on our own form", which is the value we already have — Cal.com
 * is a cross-check here, not the source of truth for mode.
 */
export function modeFromEventTypeId(eventTypeId: number | null): LessonMode | null {
  if (eventTypeId === null) return null;
  const online = process.env.CALCOM_EVENT_TYPE_ID_ONLINE;
  const inperson = process.env.CALCOM_EVENT_TYPE_ID_INPERSON;
  if (online && String(eventTypeId) === online) return 'online';
  if (inperson && String(eventTypeId) === inperson) return 'inperson';
  return null;
}
