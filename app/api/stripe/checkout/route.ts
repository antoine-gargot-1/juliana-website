import { createCheckoutSession } from '@/lib/booking';
import { PRICES, lookup } from '@/lib/pricing';
import { stripeConfigured } from '@/lib/stripe';
import type { ClickIds, UtmKey } from '@/lib/students';

/**
 * Direct package purchase — the entry point for "buy now" on /coach/pricing.
 *
 * ===========================================================================
 * THE ONE RULE THIS ROUTE EXISTS TO ENFORCE: THE CLIENT NAMES A PRICE, NEVER
 * SETS ONE.
 * ===========================================================================
 * The body carries a `lookupKey` and nothing else that touches money. There is
 * no `amount`, no `currency`, no `priceId`, and no code path that could accept
 * one — the key is checked against content/pricing.json and rejected if it is not
 * there, then lib/booking.ts resolves the real Stripe Price by `lookup_key`.
 *
 * This is not defensive paranoia, it is the difference between a shop and an
 * open till. A route that accepted `amountCents` from a browser would let anyone
 * buy a $900 ten-lesson pack for $1 by editing one number in devtools, and the
 * resulting Checkout Session would be perfectly valid — Stripe has no idea what
 * the price was supposed to be. Nothing would look wrong until the teacher
 * reconciled the month.
 *
 * The allow-list is derived from the rate card rather than written out, so a
 * price added to content/pricing.json is purchasable and a price removed from it
 * stops being purchasable, with no second list to forget to update.
 *
 * ===========================================================================
 * WHY POST, AND WHY NO GET EXISTS
 * ===========================================================================
 * Creating a Checkout Session is a write: it makes an object in Stripe and it is
 * the first half of taking money. A GET would let a link prefetcher, an email
 * scanner or a crawler create sessions by following a URL, and Stripe's own
 * dashboard would fill with abandoned sessions that no human ever opened —
 * destroying the checkout conversion rate this route's `integration_identifier`
 * exists to measure.
 *
 * ===========================================================================
 * RUNTIME
 * ===========================================================================
 * Node, never Edge: the Stripe SDK is on this path.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Longest value accepted for any attribution field. Matches lib/analytics.ts. */
const MAX_FIELD = 200;

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;
const CLICK_ID_KEYS = ['gclid', 'gbraid', 'wbraid'] as const;

/**
 * Accepts both JSON and a form POST.
 *
 * The form path is not legacy tolerance — it is the no-JavaScript fallback. This
 * is the route that takes money, so it must not be the one thing on the site that
 * needs a working fetch(): a plain `<form method="POST">` posting
 * application/x-www-form-urlencoded still reaches Stripe, and the response below
 * redirects rather than returning JSON when the request did not come from script.
 */
async function readBody(request: Request): Promise<Record<string, string>> {
  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === 'string') out[key] = value;
    }
    return out;
  }

  const form = await request.formData();
  const out: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value === 'string') out[key] = value;
  }
  return out;
}

const clean = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed.slice(0, MAX_FIELD) : undefined;
};

/**
 * Make an attacker-supplied value safe to put in a log line (CWE-117).
 *
 * ---------------------------------------------------------------------------
 * WHY THE REJECTED lookupKey NEEDED THIS
 * ---------------------------------------------------------------------------
 * Everything in this body is unauthenticated and arrives from any origin. `clean()`
 * above trims and truncates but does not touch control characters, so a
 * `lookupKey` containing `\n` used to be logged verbatim — letting the caller
 * append entire fabricated lines to Vercel's log stream. Two concrete uses for
 * that: burying the evidence of a burst of rejected requests under plausible
 * noise, and planting entries that mislead whoever reads the log afterwards. The
 * log is this project's only audit trail for this route (there is no database and
 * no request id), so its integrity is the whole of the forensic story.
 *
 * JSON.stringify does the escaping — `\n` becomes a literal backslash-n and the
 * value is visibly quoted, so an injected line cannot masquerade as a real one —
 * and the C0 strip covers the characters JSON.stringify passes through as-is.
 */
const logSafe = (value: string): string =>
  JSON.stringify(value.slice(0, MAX_FIELD).replace(/[\x00-\x1f\x7f]/g, ' '));

export async function POST(request: Request): Promise<Response> {
  if (!stripeConfigured()) {
    // 503 rather than 500: this is "not yet switched on", which is a real and
    // expected state on any preview deployment without the secrets, and the UI
    // should be able to tell the difference from a genuine fault.
    console.warn('[checkout] STRIPE_SECRET_KEY is not set, so no Checkout Session can be created.');
    return Response.json(
      { error: 'Purchasing is not switched on yet.' },
      { status: 503 },
    );
  }

  let body: Record<string, string>;
  try {
    body = await readBody(request);
  } catch {
    return Response.json({ error: 'Could not read the request body.' }, { status: 400 });
  }

  const lookupKey = clean(body.lookupKey);
  if (!lookupKey) {
    return Response.json({ error: 'lookupKey is required.' }, { status: 400 });
  }

  /*
   * THE ALLOW-LIST CHECK. Everything above is plumbing; this is the security
   * boundary.
   *
   * Checked against the rate card BEFORE any Stripe call, so a bad key costs a
   * string comparison rather than a network round trip, and the 400 says which
   * keys are valid — this endpoint is called by our own UI, so an unhelpful error
   * here just means a slower bug hunt, not a leak.
   */
  if (!PRICES.some((price) => price.lookupKey === lookupKey)) {
    console.warn(
      `[checkout] rejected unknown lookupKey ${logSafe(lookupKey)}. Valid keys come from ` +
        'content/pricing.json and nowhere else — no amount is ever accepted from a client.',
    );
    return Response.json({ error: 'That package is not for sale.' }, { status: 400 });
  }

  const catalogPrice = lookup(lookupKey);

  /*
   * The free assessment is not purchasable and must never reach Checkout: it is a
   * $0 SetupIntent, and the only correct way in is /coach/book. It has no Price
   * in content/pricing.json so the allow-list above already refuses it — this is
   * a second, explicit guard because the failure mode if the rate card ever gains
   * a $0 assessment Price is a Stripe error at the checkout button rather than
   * anything legible.
   */
  if (catalogPrice.amountCents <= 0) {
    return Response.json({ error: 'That package is not for sale.' }, { status: 400 });
  }

  const utm: Partial<Record<UtmKey, string>> = {};
  for (const key of UTM_KEYS) {
    const value = clean(body[key]);
    if (value) utm[key] = value;
  }

  const clickIds: ClickIds = {};
  for (const key of CLICK_ID_KEYS) {
    const value = clean(body[key]);
    if (value) clickIds[key] = value;
  }

  try {
    const session = await createCheckoutSession({
      lookupKey,
      email: clean(body.email),
      name: clean(body.name),
      guardianEmail: clean(body.guardianEmail),
      // THE JOIN. Without ga_client_id on the Customer, the pack_purchased /
      // plan_started conversion fired from the Stripe webhook has no GA4 session
      // to attach to and lands as "(not set)" — no source, no campaign, nothing
      // for Smart Bidding to learn from. See lib/students.ts StudentIntake.
      gaClientId: clean(body.gaClientId) ?? clean(body.ga_client_id),
      clickIds,
      utm,
    });

    /*
     * A plain form POST gets a 303 straight to Stripe, so the no-JavaScript path
     * works end to end; a fetch() gets JSON so the caller can show its own error
     * state instead of a hard navigation.
     *
     * The CONTENT type is what distinguishes them, not just the Accept header.
     * fetch() does not send `Accept: application/json` unless it is set by hand,
     * and the client that calls this (components/coach/Purchase.tsx) does not set
     * it — so keying only on Accept would send a 303 to a fetch, which follows
     * redirects transparently and would then try to JSON.parse Stripe's checkout
     * HTML. The failure would surface as an unexplained parse error at the buy
     * button, which is the last place worth debugging under load.
     */
    const accept = request.headers.get('accept') ?? '';
    const contentType = request.headers.get('content-type') ?? '';
    const wantsJson =
      accept.includes('application/json') || contentType.includes('application/json');
    if (!wantsJson) return Response.redirect(session.url, 303);

    return Response.json({
      url: session.url,
      sessionId: session.sessionId,
      lookupKey: session.price.lookupKey,
      amountCents: session.price.amountCents,
    });
  } catch (error) {
    // Never surface a Stripe message to a buyer: it can name internal ids and
    // account state. Logged in full for us, one actionable sentence for them.
    // `lookupKey` is known-good by this point (it passed the allow-list above), but
    // it is still escaped: the allow-list could gain a key with odd characters, and
    // a log-sanitising rule that only applies on the failure path is one refactor
    // away from not applying at all.
    console.error(`[checkout] could not create a Checkout Session for ${logSafe(lookupKey)}`, error);
    return Response.json(
      { error: 'Checkout could not be opened just now. Please try again in a moment.' },
      { status: 502 },
    );
  }
}
