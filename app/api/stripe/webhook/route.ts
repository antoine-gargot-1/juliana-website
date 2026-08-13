import type Stripe from 'stripe';
import { customerId, getStripe, stripeKeyLiveMode, subscriptionIdFromInvoice } from '@/lib/stripe';
import { SETUP_KIND_ASSESSMENT, attachDefaultPaymentMethod } from '@/lib/booking';
import {
  claimConversion,
  getStudentFrom,
  markAssessmentConfirmed,
  markChurned,
  markPlanActive,
  recordPaidMonth,
  type Student,
} from '@/lib/students';
import { sendServerConversion } from '@/lib/ga-server';
import {
  assessmentConfirmedEmail,
  operatorAlertEmail,
  paymentFailedEmail,
  send,
} from '@/lib/email';
import { ASSESSMENT_VALUE_USD, formatUsd, modeLabel, type LessonMode } from '@/lib/pricing';

/**
 * Stripe webhooks — where billing facts become conversions.
 *
 * ---------------------------------------------------------------------------
 * THIS ROUTE IS THE ONE THAT DECIDES WHETHER THE AD SPEND WORKS
 * ---------------------------------------------------------------------------
 * Every conversion the ad account bids against originates here, not in the
 * browser. See lib/ga-server.ts for why (20–30% of client-side fires are lost to
 * ad blockers and Safari ITP, and the loss is not random). Nothing in Phase 6
 * launches until each of the six events below has been observed landing in GA4
 * DebugView with the right value and a real client_id.
 *
 * ---------------------------------------------------------------------------
 * THE THREE RULES THIS HANDLER FOLLOWS
 * ---------------------------------------------------------------------------
 * 1. VERIFY AGAINST THE RAW BODY. `await request.text()`, never
 *    `JSON.stringify(await request.json())`. A parse/stringify round-trip
 *    reorders keys and normalises whitespace, so the signature can never match.
 *    An unverified webhook endpoint is an unauthenticated POST that lets anyone
 *    on the internet assert that a student paid.
 *
 * 2. RETURN 200 EVEN WHEN OUR OWN SIDE EFFECTS FAIL. Stripe retries non-2xx
 *    responses for up to three days, re-running every step that already
 *    succeeded before the failure. If an email provider is down, retrying the
 *    whole handler would re-fire the conversion; the conversion is worth more
 *    than the email. So each side effect is individually try/caught, failures are
 *    logged loudly, and the response is still 200. A 4xx/5xx is reserved for
 *    "we could not verify this request", which is the only case where a retry
 *    genuinely helps.
 *
 * 3. IDEMPOTENCY ON EVERY WRITE. Stripe delivers at least once, and the operator
 *    can replay any event by hand. Stripe writes carry idempotency keys (see
 *    lib/students.ts), emails carry Resend idempotency keys, and the two one-shot
 *    conversions are gated by claimConversion() because GA4 cannot deduplicate.
 *
 * ---------------------------------------------------------------------------
 * RUNTIME
 * ---------------------------------------------------------------------------
 * Node, never Edge. The Stripe SDK and `node:crypto` are both used on this path,
 * and Fluid Compute makes Node the right default anyway.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Events this handler acts on. Anything else is acknowledged and ignored. */
const HANDLED = [
  'setup_intent.succeeded',
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.deleted',
  'invoice.payment_failed',
  'invoice.paid',
] as const;

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    // 500, not 200: this is a configuration fault on our side, and Stripe's
    // retry is genuinely useful here — the events will be redelivered once the
    // secret is set, so nothing is lost.
    console.error(
      '[stripe-webhook] STRIPE_WEBHOOK_SECRET is not set, so no webhook can be verified. ' +
        'Local: `stripe listen --forward-to localhost:3000/api/stripe/webhook` prints a whsec_… ' +
        'to put in .env.local. Deployed: Stripe Dashboard → Developers → Webhooks → your endpoint → ' +
        'Signing secret, added to Vercel encrypted env. NEVER to .env — that file is committed.',
    );
    return new Response('webhook secret not configured', { status: 500 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) return new Response('missing stripe-signature header', { status: 400 });

  // THE RAW BODY. Read once, as text, before anything parses it.
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = await getStripe().webhooks.constructEventAsync(rawBody, signature, secret);
  } catch (error) {
    // 400 and no retry: a bad signature will still be bad on redelivery. The
    // overwhelming cause in practice is a whsec_ from a different endpoint than
    // the one sending, so the message says so.
    console.error(
      '[stripe-webhook] signature verification FAILED. The secret must belong to the same endpoint ' +
        'that sent this event — `stripe listen` and the Dashboard endpoint have different secrets.',
      error,
    );
    return new Response('signature verification failed', { status: 400 });
  }

  /*
   * ===========================================================================
   * MODE AGREEMENT: A TEST EVENT MUST NOT BE PROCESSED BY A LIVE DEPLOYMENT.
   * ===========================================================================
   * A verified signature proves the sender holds the endpoint's signing secret.
   * It does NOT prove the event describes real money. Anyone holding the secret —
   * including this repo's own scripts/stripe-e2e.ts, which signs synthetic events
   * with the real STRIPE_WEBHOOK_SECRET — can deliver `livemode: false` events
   * that this handler would previously have treated as fact.
   *
   * The consequence is not a compromise, it is corruption of the one thing the ad
   * budget is steered by. A synthetic `setup_intent.succeeded` fires
   * `assessment_booked` at ~$1,150 into the real GA4 property, Smart Bidding
   * trains on it, and the campaign bids up against a booking that never happened.
   * It also sends real email through Resend to whatever address the payload names.
   *
   * The comparison is against the mode implied by the KEY this deployment is
   * configured with, not against VERCEL_ENV: a preview deployment holding live
   * Stripe credentials is a live-write surface regardless of what Vercel calls it,
   * and the key is the thing that decides which account is actually touched.
   *
   * Returns 200, not 4xx. A mode mismatch will mismatch identically on every
   * redelivery, so a non-2xx would only make Stripe retry for three days and then
   * disable the endpoint — taking the live funnel with it. `handled: false` and a
   * loud log are the honest answer.
   *
   * stripeKeyLiveMode() returns null on a key prefix it does not recognise, and
   * that case is deliberately NOT rejected: refusing to process live events over
   * an unrecognised prefix would be this check causing the outage it exists to
   * prevent. Unknown mode means "make no decision here".
   */
  const expectLive = stripeKeyLiveMode();
  if (expectLive !== null && event.livemode !== expectLive) {
    console.error(
      `[stripe-webhook] REFUSED ${event.type} (${event.id}): event.livemode=${event.livemode} but this ` +
        `deployment's STRIPE_SECRET_KEY is a ${expectLive ? 'live' : 'test'}-mode key. Either a test ` +
        'event reached the live endpoint (check scripts/stripe-e2e.ts and any locally forwarded ' +
        '`stripe listen`), or the Dashboard webhook endpoint and the key belong to different modes. ' +
        'Nothing was processed, so no conversion was reported and no email was sent.',
    );
    return Response.json({ received: true, handled: false, reason: 'livemode_mismatch' });
  }

  if (!(HANDLED as readonly string[]).includes(event.type)) {
    // Acknowledged, not an error. Stripe endpoints often subscribe to more than
    // they act on, and returning non-2xx for the rest would fill the dashboard
    // with failed deliveries and eventually get the endpoint disabled.
    return Response.json({ received: true, handled: false, type: event.type });
  }

  try {
    await handle(event);
  } catch (error) {
    // See rule 2. Logged for the operator, acknowledged to Stripe.
    console.error(`[stripe-webhook] handler for ${event.type} (${event.id}) threw:`, error);
  }

  return Response.json({ received: true, handled: true, type: event.type });
}

async function handle(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'setup_intent.succeeded':
      return onSetupIntentSucceeded(event.data.object);
    case 'checkout.session.completed':
      return onCheckoutCompleted(event.data.object);
    case 'customer.subscription.created':
      return onSubscriptionCreated(event.data.object);
    case 'customer.subscription.deleted':
      return onSubscriptionDeleted(event.data.object);
    case 'invoice.payment_failed':
      return onInvoicePaymentFailed(event.data.object);
    case 'invoice.paid':
      return onInvoicePaid(event.data.object);
    default:
      return;
  }
}

/** Best-effort side effect. Logs and continues — see rule 2 in the header. */
async function attempt(label: string, fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn();
  } catch (error) {
    console.error(`[stripe-webhook] ${label} failed:`, error);
  }
}

const modeOf = (raw: string | undefined, student: Student | null): LessonMode =>
  raw === 'inperson' || raw === 'online'
    ? raw
    : // Falls back to the student record, then to online. Online is the safer
      // default for the CONVERSION VALUE specifically: $1,150 rather than
      // $1,450, so a missing mode under-reports rather than teaching Smart
      // Bidding to overpay.
      (student?.mode ?? 'online');

/* ------------------------------------------------------------------ */
/* setup_intent.succeeded — the card is saved, the slot is real        */
/* ------------------------------------------------------------------ */

/**
 * The primary conversion.
 *
 * Fires `assessment_booked` at ASSESSMENT_VALUE_USD[mode] — read that constant's
 * comment in lib/pricing.ts before changing anything about the value. It is
 * neither $0 nor the first month's fee, and both of those mistakes cost real
 * money in different directions.
 *
 * Why here and not on `checkout.session.completed`: this event is what actually
 * proves a usable payment method exists. A completed setup-mode session whose
 * SetupIntent later failed would be a booking with no card behind it, which is
 * the no-show problem this mechanic exists to solve.
 */
async function onSetupIntentSucceeded(setupIntent: Stripe.SetupIntent): Promise<void> {
  const id = customerId(setupIntent.customer);
  const paymentMethod =
    typeof setupIntent.payment_method === 'string'
      ? setupIntent.payment_method
      : (setupIntent.payment_method?.id ?? null);

  if (!id) {
    console.warn(
      `[stripe-webhook] setup_intent ${setupIntent.id} has no customer; nothing to attach it to. ` +
        'Every SetupIntent this app creates is customer-scoped, so this came from elsewhere.',
    );
    return;
  }

  // Runs for every successful SetupIntent, assessment or not: a student adding a
  // bank account in the Customer Portal should have it become the default too.
  if (paymentMethod) {
    await attempt('attachDefaultPaymentMethod', () => attachDefaultPaymentMethod(id, paymentMethod));
  }

  /*
   * Everything below is assessment-specific and MUST stay gated on `kind`.
   *
   * Without this gate, a student updating their card in the Customer Portal a
   * year from now would fire a second $1,150 assessment_booked conversion. That
   * would not look like a bug — it would look like the campaign converting — and
   * the ad account would bid up against it.
   */
  if (setupIntent.metadata?.kind !== SETUP_KIND_ASSESSMENT) return;

  const student = await getStudentFrom(id);
  const mode = modeOf(setupIntent.metadata?.mode, student);
  const bookingUid = setupIntent.metadata?.booking_uid ?? undefined;
  const rawAssessmentAt = setupIntent.metadata?.assessment_at;
  const assessmentAt = rawAssessmentAt ? new Date(rawAssessmentAt) : (student?.assessmentAt ?? null);

  await attempt('markAssessmentConfirmed', () =>
    markAssessmentConfirmed(id, {
      bookingUid,
      assessmentAt: assessmentAt ?? undefined,
    }),
  );

  const email = student?.email ?? null;
  if (email) {
    await attempt('assessmentConfirmedEmail', () =>
      send(
        assessmentConfirmedEmail({ to: email, name: student?.name ?? null, mode, assessmentAt }),
        // Keyed on the SetupIntent so a redelivery does not send a second copy.
        { idempotencyKey: `assessment-confirmed:${setupIntent.id}` },
      ),
    );
  }

  if (await claimConversion(id, 'assessment_booked')) {
    await sendServerConversion({
      event: 'assessment_booked',
      clientId: student?.gaClientId ?? null,
      valueUsd: ASSESSMENT_VALUE_USD[mode],
      email,
      utm: student?.utm,
      params: {
        mode,
        mode_label: modeLabel(mode),
        booking_uid: bookingUid ?? '',
        /*
         * THE DEDUPLICATION KEY. MUST MATCH THE CLIENT MIRROR EXACTLY.
         *
         * app/(coach)/coach/book/confirmed/page.tsx reads `?booking=` off the
         * Stripe success_url and passes the same value as transaction_id. GA4
         * itself deduplicates nothing, but Google Ads collapses imported
         * conversions that share a transaction_id — so these two hits count as
         * one booking. Change the value on either side and every assessment
         * counts twice at $1,150 each, which is the Primary conversion the whole
         * campaign bids against.
         *
         * The Cal.com booking uid is the right identifier because it is the one
         * thing that exists in both the browser and the webhook, and there is
         * exactly one per slot. Deliberately NOT the SetupIntent id (the browser
         * never sees it) and NOT the customer id (a returning student would
         * collide with their own earlier booking and the second one would be
         * silently discarded).
         */
        transaction_id: bookingUid ?? '',
        // Included so a GA4 exploration can segment paid clicks even before
        // Offline Conversion Import exists.
        has_gclid: Boolean(student?.gclid),
      },
    });
  } else {
    console.log(
      `[stripe-webhook] assessment_booked was already reported for ${id}; skipping the GA4 send. ` +
        'This is the expected path for a redelivered or replayed event.',
    );
  }
}

/* ------------------------------------------------------------------ */
/* checkout.session.completed — a pack was bought                     */
/* ------------------------------------------------------------------ */

/**
 * Fires `pack_purchased` with the real amount collected.
 *
 * GATED ON `mode === 'payment'`, and that gate is not optional: setup-mode
 * sessions emit this same event. Without the check, every free assessment would
 * also report a $0 pack purchase, and a conversion action whose values are mostly
 * zero teaches Smart Bidding that the conversion is worthless.
 *
 * Uses `amount_total`, not the catalog price. If a coupon, a currency conversion
 * or a manual adjustment changed what the student actually paid, the ad account
 * should learn the real number.
 */
async function onCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  if (session.mode !== 'payment') return;
  if (session.payment_status === 'unpaid') return;

  const id = customerId(session.customer);
  const student = id ? await getStudentFrom(id) : null;
  const mode = modeOf(session.metadata?.mode, student);
  const valueUsd = (session.amount_total ?? 0) / 100;

  await sendServerConversion({
    event: 'pack_purchased',
    clientId: student?.gaClientId ?? null,
    valueUsd,
    email: student?.email ?? session.customer_details?.email ?? null,
    utm: student?.utm,
    params: {
      mode,
      mode_label: modeLabel(mode),
      lookup_key: session.metadata?.lookup_key ?? '',
      session_id: session.id,
      /*
       * THE DEDUPLICATION KEY FOR THE DIRECT-PURCHASE FUNNEL.
       *
       * The Checkout Session id, NOT the Cal.com booking uid — a direct purchase
       * has no Cal.com booking at the time it is paid for (the slot is chosen
       * afterwards, on /coach/purchase/confirmed). Using a session id here and a
       * booking uid on the assessment path also guarantees the two funnels can
       * never collide in Google Ads dedupe, because the identifier namespaces are
       * disjoint: `cs_…` versus a Cal.com uid.
       *
       * The UI's /coach/purchase/confirmed page receives the same id as
       * `?session_id=` from Stripe's success_url, so its client-side mirror can
       * pass this exact value to ConversionMirror.
       */
      transaction_id: session.id,
    },
  });

  await attempt('operator pack alert', () =>
    send(
      operatorAlertEmail({
        subject: `Pack purchased — ${formatUsd(session.amount_total ?? 0)}`,
        lines: [
          `${student?.name ?? session.customer_details?.name ?? 'A student'} bought a lesson pack.`,
          `Amount: ${formatUsd(session.amount_total ?? 0)}`,
          `Mode: ${modeLabel(mode)}`,
          `Email: ${student?.email ?? session.customer_details?.email ?? 'unknown'}`,
          '',
          'Lessons are not scheduled automatically — reach out to book them in.',
        ],
      }),
      { idempotencyKey: `pack:${session.id}` },
    ),
  );
}

/* ------------------------------------------------------------------ */
/* customer.subscription.created — a plan started                     */
/* ------------------------------------------------------------------ */

/**
 * Fires `plan_started` at the first month's amount, and marks the student active.
 *
 * Valued at the actual monthly amount rather than at LTV, deliberately: this is
 * a Secondary conversion whose job is to report cash collected. LTV-weighted
 * bidding is driven by `assessment_booked`, which is Primary. Two conversion
 * actions with two different value bases, each honest about what it measures.
 */
async function onSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
  const id = customerId(subscription.customer);
  if (!id) return;

  const item = subscription.items.data[0];
  const amountCents = item?.price?.unit_amount ?? 0;
  const lookupKey = subscription.metadata?.lookup_key ?? item?.price?.lookup_key ?? null;

  const student = await getStudentFrom(id);
  const mode = modeOf(subscription.metadata?.mode, student);

  await attempt('markPlanActive', () =>
    markPlanActive(id, {
      subscriptionId: subscription.id,
      lookupKey,
      startedAt: new Date(subscription.created * 1000),
    }),
  );

  if (await claimConversion(id, 'plan_started')) {
    await sendServerConversion({
      event: 'plan_started',
      clientId: student?.gaClientId ?? null,
      valueUsd: amountCents / 100,
      email: student?.email ?? null,
      utm: student?.utm,
      params: {
        mode,
        mode_label: modeLabel(mode),
        lookup_key: lookupKey ?? '',
        subscription_id: subscription.id,
        /*
         * The Subscription id, and it has to be the subscription rather than the
         * Checkout Session, because this event fires on BOTH paths to a plan:
         * a direct subscription purchase through Checkout, and startPlan() called
         * from a plan link or scripts/start-plan.ts — which has no Checkout
         * Session at all. One identifier that exists in every case, exactly once.
         */
        transaction_id: subscription.id,
      },
    });
  }

  await attempt('operator plan alert', () =>
    send(
      operatorAlertEmail({
        subject: `Plan started — ${student?.name ?? id}`,
        lines: [
          `${student?.name ?? 'A student'} started a plan.`,
          `Plan: ${lookupKey ?? 'unknown'} · ${formatUsd(amountCents)}/mo · ${modeLabel(mode)}`,
          `Email: ${student?.email ?? 'unknown'}`,
          // Surfaced because it is the one number worth eyeballing on every new
          // plan: if it reads as today rather than a week out, proration_behavior
          // has regressed. See the warning on startPlan().
          `First charge: ${new Date(
            (subscription.billing_cycle_anchor ?? subscription.created) * 1000,
          ).toDateString()}`,
        ],
      }),
      { idempotencyKey: `plan-started:${subscription.id}` },
    ),
  );
}

/* ------------------------------------------------------------------ */
/* customer.subscription.deleted — churn                              */
/* ------------------------------------------------------------------ */

/**
 * Marks the student churned and logs how many months they paid for.
 *
 * The month count is the number that matters: breakeven is ~2 months, so churn
 * at month 1 is a loss on that acquisition regardless of what the CPA looked
 * like. No GA4 conversion is fired — a cancellation is not a conversion, and
 * sending it as one would corrupt the conversion counts.
 */
async function onSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const id = customerId(subscription.customer);
  if (!id) return;

  const endedAt = new Date((subscription.ended_at ?? subscription.canceled_at ?? Date.now() / 1000) * 1000);
  const student = await getStudentFrom(id);

  let monthsRetained = 0;
  await attempt('markChurned', async () => {
    ({ monthsRetained } = await markChurned(id, { subscriptionId: subscription.id, endedAt }));
  });

  console.log(
    `[stripe-webhook] churn: customer ${id} cancelled after ${monthsRetained} paid month(s). ` +
      `Breakeven is ~2 months.`,
  );

  await attempt('operator churn alert', () =>
    send(
      operatorAlertEmail({
        subject: `Student cancelled after ${monthsRetained} month(s) — ${student?.name ?? id}`,
        lines: [
          `${student?.name ?? 'A student'} cancelled.`,
          `Paid months: ${monthsRetained}`,
          `Email: ${student?.email ?? 'unknown'}`,
          `Plan: ${student?.planLookupKey ?? 'unknown'}`,
          '',
          monthsRetained < 2
            ? 'Under two months — this acquisition did not clear breakeven. Worth asking why.'
            : 'Past breakeven. A short note asking what changed is usually worth sending.',
        ],
      }),
      { idempotencyKey: `churn:${subscription.id}` },
    ),
  );
}

/* ------------------------------------------------------------------ */
/* invoice.payment_failed — dunning                                   */
/* ------------------------------------------------------------------ */

/**
 * Alerts the operator and emails the student.
 *
 * No retry logic here on purpose. Stripe Smart Retries already retries on a
 * schedule tuned on Stripe's own data about when cards succeed, and hand-rolled
 * retries on top of it would double-charge or trip fraud rules. This handler's
 * job is only to tell the two humans involved.
 *
 * Nothing is cancelled and no lesson is withheld. A declined card is usually an
 * expiry date, and pulling a student's lessons over one failed $280 invoice risks
 * the ~$2,520 of LTV still ahead of them.
 */
async function onInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const id = customerId(invoice.customer);
  const student = id ? await getStudentFrom(id) : null;
  const amountDue = formatUsd(invoice.amount_due);

  await attempt('operator dunning alert', () =>
    send(
      operatorAlertEmail({
        subject: `Payment FAILED — ${student?.name ?? id ?? 'unknown student'} (${amountDue})`,
        lines: [
          `A payment failed for ${student?.name ?? 'a student'}.`,
          `Amount: ${amountDue}`,
          `Email: ${student?.email ?? invoice.customer_email ?? 'unknown'}`,
          `Invoice: ${invoice.hosted_invoice_url ?? invoice.id ?? 'unknown'}`,
          '',
          'Stripe Smart Retries will keep trying for about two weeks. The student has been emailed a ' +
            'link to update their card. No action needed unless it fails again.',
        ],
      }),
      { idempotencyKey: `dunning-op:${invoice.id}:${invoice.attempt_count}` },
    ),
  );

  const email = student?.email ?? invoice.customer_email ?? null;
  if (email) {
    await attempt('dunning email', () =>
      send(
        paymentFailedEmail({
          to: email,
          name: student?.name ?? invoice.customer_name ?? null,
          amountDue,
          invoiceUrl: invoice.hosted_invoice_url ?? null,
        }),
        // Keyed on the attempt, so each Smart Retry failure sends at most one
        // notice and a redelivery of the same attempt sends none.
        { idempotencyKey: `dunning:${invoice.id}:${invoice.attempt_count}` },
      ),
    );
  }
}

/* ------------------------------------------------------------------ */
/* invoice.paid — a retained month                                    */
/* ------------------------------------------------------------------ */

/**
 * Records a paid month and fires `retained_student`.
 *
 * Gated to subscription invoices: a pack purchase also produces a paid invoice,
 * and counting it as a retained month would inflate the one metric the business
 * is actually judged on. `subscriptionIdFromInvoice` exists because that field
 * moved in this API version — read its comment in lib/stripe.ts.
 *
 * This event is deliberately NOT deduplicated through claimConversion: it
 * legitimately repeats every month, and one key per invoice would eventually hit
 * Stripe's 50-key metadata limit. A replayed invoice.paid therefore double-counts
 * one retention event, which is acceptable — it is a Secondary conversion that
 * bidding does not act on.
 */
async function onInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const subscriptionId = subscriptionIdFromInvoice(invoice);
  if (!subscriptionId) return;
  if (invoice.amount_paid <= 0) return;

  const id = customerId(invoice.customer);
  if (!id) return;

  let monthsRetained = 0;
  let student: Student | null = null;
  await attempt('recordPaidMonth', async () => {
    ({ student, monthsRetained } = await recordPaidMonth(id, invoice));
  });
  student ??= await getStudentFrom(id);

  const mode = modeOf(student?.mode ?? undefined, student);

  console.log(
    `[stripe-webhook] retention: customer ${id} has now paid for ${monthsRetained} month(s) ` +
      `(${formatUsd(invoice.amount_paid)} this month).`,
  );

  await sendServerConversion({
    event: 'retained_student',
    clientId: student?.gaClientId ?? null,
    valueUsd: invoice.amount_paid / 100,
    email: student?.email ?? invoice.customer_email ?? null,
    utm: student?.utm,
    params: {
      mode,
      mode_label: modeLabel(mode),
      months_retained: monthsRetained,
      subscription_id: subscriptionId,
      // Whether this cohort member has cleared the ~2-month breakeven yet.
      past_breakeven: monthsRetained >= 2,
    },
  });
}
