import type Stripe from 'stripe';

import { planSummary, startPlan } from '@/lib/booking';
import { PLAN_LINK_PATH, verifyBookingToken, type VerifyFailure } from '@/lib/booking-token';
import { getStripe, stripeConfigured } from '@/lib/stripe';

/**
 * Start a monthly plan from a signed plan link. The conversion moment.
 *
 * ===========================================================================
 * POST ONLY. THIS IS THE WHOLE REASON THE PAGE AND THE ACTION ARE SEPARATE.
 * ===========================================================================
 * This endpoint creates a Stripe Subscription against a card that is already on
 * file, which means it starts a real recurring charge with no further human step.
 * There is deliberately NO GET handler — not even one that redirects.
 *
 * Everything between an inbox and a click follows GET links: Gmail and Outlook
 * prefetch them, corporate mail gateways fetch them to scan for malware,
 * antivirus proxies fetch them again, Slack and iMessage unfurl them for a
 * preview, and Safari prefetches whatever it thinks you are about to open. If a
 * GET here could bill someone, then merely DELIVERING the plan email would
 * subscribe them — server-side, invisibly, days before they decided. The first
 * anyone would know is the invoice, and that is a chargeback and a lost student
 * rather than a bug report.
 *
 * So /coach/book/plan renders a form and this handler answers the submit.
 * Scanners do not submit forms. It is the same contract /coach/account has with
 * /api/stripe/portal, for the same reason, and it is worth more here: a burnt
 * portal session is an annoyance, an unwanted subscription is money.
 *
 * ===========================================================================
 * WHAT IS TRUSTED FROM THE REQUEST, AND WHAT IS NOT
 * ===========================================================================
 * Trusted: the HMAC-signed token, and nothing else. The customer, the mode, the
 * assessment date and THE PLAN all come out of the signed payload.
 *
 * Not trusted, and not read at any price: an amount, a currency, a Stripe price
 * id, or a lookup key from the query string or the form body. A route that
 * accepted any of those would let whoever holds the link decide what the saved
 * card is billed every month, and the resulting Subscription would look
 * completely ordinary in the dashboard. Search this file: there is no `amount`,
 * no `priceId` and no `lookupKey` read from the body.
 *
 * The one field the form does carry is the ARL consent tick, and it can only ever
 * make this handler refuse — never proceed on different terms.
 *
 * ===========================================================================
 * NO CONVERSION IS FIRED HERE
 * ===========================================================================
 * `plan_started` is fired exactly once, from the `customer.subscription.created`
 * webhook (app/api/stripe/webhook/route.ts), with `transaction_id` set to the
 * Subscription id. That path covers BOTH ways a plan begins — this route and
 * scripts/start-plan.ts — so it is the only honest place for it. Adding a
 * client-side conversion to the success page would double-count every plan in
 * GA4 and inflate the value Smart Bidding is optimising against.
 *
 * ===========================================================================
 * RUNTIME
 * ===========================================================================
 * Node, never Edge: `node:crypto` (the token HMAC) and the Stripe SDK are both on
 * this path.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Every way this can end other than a started plan.
 *
 * Exported as a TYPE so /coach/book/plan can key its copy off it as a total
 * Record — a code added here without a sentence to go with it is then a compile
 * error rather than an `undefined` rendered at somebody's payment moment. The
 * page imports it with `import type`, so nothing from this module is bundled into
 * the page; the handler stays here.
 */
export type PlanErrorCode =
  | VerifyFailure['reason']
  | 'not_configured'
  | 'no_consent'
  | 'already_active'
  | 'no_card'
  | 'stripe_error';

/**
 * Subscription statuses that do NOT count as being on a plan.
 *
 * Everything else does, including `past_due`, `unpaid` and `paused` — a student
 * whose card is failing is still a student on a plan, and starting them a second
 * one would bill them twice a month while the first one dunned. `incomplete` is
 * treated as live too: with a future billing anchor there is no first payment to
 * fail, so an incomplete subscription here means something went wrong that a
 * second subscription would not fix.
 */
const DEAD_STATUSES: ReadonlySet<Stripe.Subscription.Status> = new Set([
  'canceled',
  'incomplete_expired',
]);

/**
 * Send the student back to the plan page, carrying their token so the page can
 * verify it again and re-render the offer.
 *
 * RELATIVE Location, deliberately. An absolute URL would have to come from either
 * NEXT_PUBLIC_SITE_URL — which bounces a preview deployment's student onto
 * production mid-flow — or from the request's own Host header, which is an
 * attacker-controlled string and the beginning of an open redirect. A relative
 * reference is valid in Location (RFC 7231 §7.1.2), keeps the browser on
 * whichever host served the form, and trusts nothing.
 *
 * 303 so the browser follows with GET and cannot replay the POST — a replayed
 * POST here is an attempt to start a second subscription.
 *
 * The reason travels as a short code, never as prose, so the page owns the
 * wording and nothing user-controlled is reflected back into the HTML.
 */
function back(reason: PlanErrorCode, token: string): Response {
  const query = new URLSearchParams(token ? { t: token } : {});
  query.set('error', reason);
  return new Response(null, {
    status: 303,
    headers: { Location: `${PLAN_LINK_PATH}?${query.toString()}` },
  });
}

/**
 * Same-origin check, applied only when the browser tells us the origin.
 *
 * A cross-site POST cannot invent a token, so this is not the security boundary —
 * the signature is. It is here because a form on someone else's page, aimed at
 * this endpoint with a token they lifted from a forwarded email, is the one shape
 * of this attack that costs the attacker nothing. Absent header means allow: some
 * clients do not send `Origin` on same-origin form posts, and refusing them would
 * break the no-JavaScript path this whole flow depends on.
 */
function crossSite(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).host !== new URL(request.url).host;
  } catch {
    return true;
  }
}

/** Accepts a form post (the no-JavaScript path) or JSON. */
async function readBody(request: Request): Promise<Record<string, string>> {
  const contentType = request.headers.get('content-type') ?? '';
  const out: Record<string, string> = {};

  if (contentType.includes('application/json')) {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return out;
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === 'string') out[key] = value;
    }
    return out;
  }

  for (const [key, value] of (await request.formData()).entries()) {
    if (typeof value === 'string') out[key] = value;
  }
  return out;
}

export async function POST(request: Request): Promise<Response> {
  if (crossSite(request)) {
    console.warn('[plan] refused a cross-site POST');
    return back('malformed', '');
  }

  let body: Record<string, string>;
  try {
    body = await readBody(request);
  } catch {
    return back('malformed', '');
  }

  const token = typeof body.t === 'string' ? body.t : '';
  if (!token) return back('malformed', '');

  /*
   * VERIFICATION FIRST, BEFORE THE CONSENT CHECK AND BEFORE ANY STRIPE CALL.
   *
   * `purpose: 'plan'` is enforced inside verifyBookingToken, so a correctly
   * signed ACCOUNT token presented here is refused with `wrong_purpose` rather
   * than being read as a plan token with missing fields. Without that separation
   * the billing-portal link emailed on every receipt would double as a link that
   * starts a subscription. The verifier also resolves the plan against
   * content/pricing.json, so `verified.plan` below is a real, sellable, monthly
   * price and this handler never gets to pick one.
   */
  const verified = verifyBookingToken(token);
  if (!verified.ok) {
    // Logged WITHOUT the token. It is a live credential until it expires, and a
    // log line is not a place to keep one.
    console.warn(`[plan] refused a plan token: ${verified.reason}`);
    return back(verified.reason, token);
  }

  const { customerId, assessmentAt } = verified.payload;
  const plan = verified.plan;

  /*
   * California ARL, §17602(a)(2): affirmative consent to the automatic-renewal
   * terms before the charge. The page renders the terms immediately above an
   * unticked box; this is the server half, because a `required` attribute is a
   * browser courtesy and not a control. No tick, no subscription.
   */
  if (body.consent !== 'yes') {
    console.warn(`[plan] refused: no renewal consent for ${customerId} on ${plan.lookupKey}`);
    return back('no_consent', token);
  }

  if (!stripeConfigured()) {
    console.warn('[plan] STRIPE_SECRET_KEY is not set, so no subscription can be created.');
    return back('not_configured', token);
  }

  const stripe = getStripe();

  try {
    /*
     * The card. Checked before anything else touches money so a student with no
     * payment method gets a sentence they can act on rather than startPlan()'s
     * (correct, but internal) error about invoice_settings.
     *
     * This is also the check that makes the whole mechanic honest: the promise on
     * the page is "the card you already gave me", so if there is no default
     * payment method the honest answer is not to open a second checkout, it is to
     * say so.
     */
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) {
      console.error(`[plan] customer ${customerId} is deleted; cannot start a plan.`);
      return back('stripe_error', token);
    }
    if (!customer.invoice_settings?.default_payment_method) {
      console.warn(`[plan] ${customerId} has no default payment method.`);
      return back('no_card', token);
    }

    /*
     * ALREADY ON A PLAN?
     *
     * startPlan() is idempotent per (customer, plan) — see its idempotency key —
     * so a double-clicked button or a second tab racing the first cannot produce
     * two subscriptions for the SAME plan. Two things that key does not cover, and
     * this list does:
     *
     *   A DIFFERENT plan. Two links, or a link clicked after the teacher started
     *   a plan by hand, would key differently and create a second subscription
     *   billing the same student twice a month.
     *
     *   The SAME plan a day later. Stripe retains an idempotency key for 24
     *   hours, after which the identical request is a new one. A student who
     *   clicks the same link next week is outside that window.
     *
     * Read live from Stripe rather than from the customer's `stage` metadata: the
     * metadata is written by the webhook and can lag by seconds, and this is the
     * check standing between a student and a duplicate charge.
     */
    const existing = await stripe.subscriptions.list({ customer: customerId, limit: 100 });
    const live = existing.data.find((s) => !DEAD_STATUSES.has(s.status));
    if (live) {
      console.log(`[plan] ${customerId} already has subscription ${live.id} (${live.status}).`);
      return back('already_active', token);
    }

    const started = await startPlan({
      customerId,
      // From the signed payload, via the rate card. Never from the request.
      lookupKey: plan.lookupKey,
      assessmentAt: new Date(assessmentAt),
    });

    /*
     * A DEAD SUBSCRIPTION COMING BACK OUT OF startPlan() IS AN IDEMPOTENCY REPLAY.
     *
     * The key is `plan:<customer>:<lookupKey>` and Stripe honours it for 24 hours,
     * so this exact sequence returns the OLD object rather than making a new one:
     * start a plan, cancel it the same day, click the link again. Nothing was
     * created, and pretending otherwise would send the student to a confirmation
     * that then fails its own check and drops them back on the offer — a loop with
     * no explanation in it.
     *
     * Said out loud instead. The window closes on its own within a day, and the
     * alternative fixes (a key with a timestamp in it, or no key at all) would
     * trade a rare same-day re-subscribe for the far worse failure this key exists
     * to prevent: a double-clicked button billing somebody twice a month.
     */
    if (DEAD_STATUSES.has(started.subscription.status)) {
      console.error(
        `[plan] startPlan returned ${started.subscription.id} in status ` +
          `"${started.subscription.status}" for ${customerId} — almost certainly a 24-hour ` +
          'idempotency replay of a subscription that has since been cancelled. Nothing was ' +
          'created. See the idempotency key on startPlan() in lib/booking.ts.',
      );
      return back('stripe_error', token);
    }

    /*
     * ARL evidence, recorded after the fact and best-effort.
     *
     * §17602 requires affirmative consent to the terms; a dispute six months from
     * now is answered by showing when it was given and what it said. Written onto
     * the Customer because that is what a human opens in the Stripe dashboard
     * when a chargeback arrives, and composed here from the rate card rather than
     * from anything the form posted — evidence supplied by the party disputing it
     * would be no evidence at all.
     *
     * Deliberately not in lib/students.ts' META registry: nothing reads these
     * programmatically, and inventing a Student field for them would imply
     * something does. Failure is logged and swallowed: the subscription exists and
     * the student has been charged nothing yet, so unwinding it over a metadata
     * write would be the worse outcome.
     */
    try {
      await stripe.customers.update(customerId, {
        metadata: {
          plan_consent_at: new Date().toISOString(),
          plan_consent_terms: `${planSummary(plan.lookupKey)} · renews monthly until cancelled · consented at ${PLAN_LINK_PATH}`,
        },
      });
    } catch (error) {
      console.error(`[plan] could not record renewal consent for ${customerId}`, error);
    }

    console.log(
      `[plan] started ${started.subscription.id} for ${customerId} on ${plan.lookupKey}; ` +
        `first charge ${started.firstChargeAt.toISOString()}` +
        (started.anchoredImmediately ? ' (anchor was in the past, billing starts now)' : ''),
    );

    /*
     * Back to the page with the Subscription id, which the page re-checks against
     * Stripe before it congratulates anybody — see its `started` handling. The id
     * is a hint to go and look, never the evidence itself, so a hand-edited one
     * cannot manufacture a confirmation.
     *
     * No GA4 conversion here and none on the page it lands on. The webhook owns
     * `plan_started`; see this file's header.
     */
    const query = new URLSearchParams({ t: token, started: started.subscription.id });
    return new Response(null, {
      status: 303,
      headers: { Location: `${PLAN_LINK_PATH}?${query.toString()}` },
    });
  } catch (error) {
    // Never surface a Stripe message to a student: they name customer ids,
    // payment-method state and account internals. Logged in full for us.
    console.error(`[plan] could not start ${plan.lookupKey} for ${customerId}`, error);
    return back('stripe_error', token);
  }
}
