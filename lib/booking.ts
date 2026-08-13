import Stripe from 'stripe';
import { getStripe, toUnix } from '@/lib/stripe';
import { findOrCreateStudent, type ClickIds, type Student, type UtmKey } from '@/lib/students';
import { formatUsd, lookup, modeLabel, type LessonMode, type Price } from '@/lib/pricing';
import { SITE_URL } from '@/lib/site';

/**
 * The three money moments: the $0 card hold, the direct purchase, and the
 * conversion from a free assessment to a paying plan.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS SEPARATE FROM lib/stripe.ts AND lib/students.ts
 * ---------------------------------------------------------------------------
 * lib/stripe.ts is the client and nothing else. lib/students.ts owns the student
 * record, so that a future database swap touches one file. This file owns the
 * two Stripe *flows* — Checkout Sessions and Subscriptions — which would not
 * move to a database under any circumstances, because they are Stripe's job.
 *
 * Both functions here are called from route handlers owned by other parts of the
 * app (/coach/book/hold and /coach/book/plan). They return plain data and never
 * touch `Response`, `redirect()` or `cookies()`, so they can also be driven from
 * scripts/start-plan.ts and from a test without a request.
 *
 * ---------------------------------------------------------------------------
 * PAYMENT METHODS ARE NOT LISTED IN CODE. THIS IS DELIBERATE.
 * ---------------------------------------------------------------------------
 * No call in this file passes `payment_method_types`. Stripe's current guidance
 * is to omit it everywhere except Terminal, and let dynamic payment methods
 * decide: Stripe then picks and ranks eligible methods per customer from the
 * Dashboard's payment-method settings, taking into account currency, amount and
 * the customer's location.
 *
 * The practical consequence for this business is the one that matters. ACH direct
 * debit costs 0.8% capped at $5 against a card's 2.9% + 30¢ — about $4.20 versus
 * $10.08 on a $280 plan, roughly $70 per student per year. Hardcoding
 * `['card']` would lock that saving out in code, so that enabling ACH later would
 * need a deploy. Omitting the parameter means it appears the moment the operator
 * enables ACH Direct Debit under Dashboard → Settings → Payment methods, and the
 * preference ORDER is set there too. Zero code change.
 *
 * The one sanctioned exception is `excluded_payment_method_types`, used exactly
 * once below and for a stated product reason. `payment_method_types` is never
 * used at all.
 */

/** Where Stripe sends the student back to. Overridable for local testing. */
const origin = () => process.env.NEXT_PUBLIC_SITE_URL ?? SITE_URL;

/**
 * Days between the assessment and the first charge.
 *
 * Seven, so the first invoice lands AFTER the first paid lesson has actually
 * happened. A student who has had one real lesson before any money moves has
 * already had the value demonstrated; charging before it inverts the order and
 * makes the plan feel like a purchase on faith.
 */
export const FIRST_CHARGE_OFFSET_DAYS = 7;

/**
 * Checkout `integration_identifier` labels — one stable string per flow.
 *
 * These tag every session so the Dashboard can compare conversion between flows,
 * which is the only way to tell "the assessment hold converts at 70%, the pack
 * purchase at 20%" without instrumenting it ourselves. The random suffix is
 * Stripe's convention for keeping labels globally distinguishable; it is a
 * CONSTANT, not generated per call — a fresh suffix on every session would split
 * one flow into thousands of one-session groups and the comparison would be
 * worthless.
 */
const INTEGRATION_ASSESSMENT_HOLD = 'assessment_hold_qwkvmtzr';
const INTEGRATION_PLAN_START = 'plan_start_hdwynfpc';
/**
 * The direct-purchase funnel: someone who chose a package on /coach/pricing and
 * paid without going through the free assessment first.
 *
 * Its own label, distinct from the two above, because the whole reason the
 * operator wanted both paths is that nobody knows yet which converts better for
 * which traffic. A shared label would merge them in the Dashboard and make that
 * question unanswerable.
 */
const INTEGRATION_DIRECT_PURCHASE = 'direct_purchase_jmzqbvtx';

/* ------------------------------------------------------------------ */
/* Phase 2 — the $0 card hold                                          */
/* ------------------------------------------------------------------ */

export type AssessmentHoldInput = {
  /** Cal.com booking uid. Also the idempotency key for this whole flow. */
  bookingUid: string;
  mode: LessonMode;
  name: string;
  email: string;
  goals?: string;
  experience?: string;
  availability?: string;
  guardianName?: string;
  guardianEmail?: string;
  /** GA4 client id from the `_ga` cookie. See the note below — this is critical. */
  gaClientId?: string;
  /**
   * Ad-click identifiers, latched by lib/analytics.ts. gclid for a normal Google
   * Ads click; gbraid/wbraid for iOS app campaigns where ATT prevents a gclid.
   * These are the only keys Google Ads Offline Conversion Import matches on, and
   * none of them can be recovered after the fact.
   */
  clickIds?: ClickIds;
  /**
   * Convenience alias for `clickIds.gclid`, for the common case.
   *
   * A plain Google Ads click has only a gclid, and both the booking form and the
   * hold page read it as a single scalar from a query param or a Cal.com booking
   * answer. Forcing every one of those call sites to wrap it in an object just to
   * satisfy the richer type would be noise, and — worse — a call site that
   * forgets to wrap it fails silently rather than loudly, because an unknown
   * extra property on an object literal is the only thing TypeScript catches
   * here. Merged into `clickIds` below, which stays the canonical shape for
   * gbraid/wbraid.
   */
  gclid?: string;
  utm?: Partial<Record<UtmKey, string>> & ClickIds;
  /** Slot start, when the hold page already read it from the Cal.com API. */
  assessmentAt?: Date;
};

export type AssessmentHold = {
  /** Stripe-hosted Checkout URL. Redirect the student here. */
  url: string;
  sessionId: string;
  customerId: string;
  student: Student;
};

/** Marks which flow a SetupIntent came from. Read by the webhook — see below. */
export const SETUP_KIND_ASSESSMENT = 'assessment_hold';

/**
 * Create the $0 card hold for a booked assessment.
 *
 * ---------------------------------------------------------------------------
 * WHY mode: 'setup' AND NOT mode: 'payment' WITH A $0 AMOUNT
 * ---------------------------------------------------------------------------
 * The goal is a saved, reusable payment method — not a transaction. `setup` runs
 * a SetupIntent: the card is validated and authorised for future off-session
 * charges (which is what makes the later one-click plan start work under SCA),
 * and no charge object is ever created. A $0 `payment` session is a different
 * thing entirely: Stripe refuses most zero-amount charges, and where it did not,
 * the resulting payment method is not authorised for future use, so the plan
 * conversion would need a fresh checkout — destroying the one-click path that is
 * the entire point of taking a card at booking.
 *
 * SetupIntent via Checkout is also the only current way to do this. Sources,
 * Tokens, Charges and the legacy Card Element are all deprecated for saving
 * cards and must not be reintroduced here.
 */
export async function createAssessmentHold(input: AssessmentHoldInput): Promise<AssessmentHold> {
  if (!input.bookingUid) {
    throw new Error(
      'createAssessmentHold needs a Cal.com bookingUid: it is the idempotency key for the whole ' +
        'flow, and without it a double-click creates two customers and two card holds.',
    );
  }

  const stripe = getStripe();

  const student = await findOrCreateStudent(
    {
      mode: input.mode,
      name: input.name,
      email: input.email,
      goals: input.goals,
      experience: input.experience,
      availability: input.availability,
      guardianName: input.guardianName,
      guardianEmail: input.guardianEmail,
      // THE LOAD-BEARING FIELD. Without ga_client_id on the Customer, the
      // server-side assessment_booked fired from the Stripe webhook has no GA4
      // session to attach to and lands under "(not set)" with no source, medium
      // or campaign — which means the ad account cannot tell which keyword
      // produced the booking, and Smart Bidding has nothing to learn from. See
      // StudentIntake.gaClientId in lib/students.ts for the full explanation.
      gaClientId: input.gaClientId,
      // `gclid` last, so the scalar alias wins over an empty clickIds.gclid
      // rather than being silently dropped by the spread.
      ...input.clickIds,
      ...(input.gclid ? { gclid: input.gclid } : {}),
      utm: input.utm,
      bookingUid: input.bookingUid,
      assessmentAt: input.assessmentAt,
    },
    { idempotencyKey: input.bookingUid },
  );

  const successUrl = new URL('/coach/book/confirmed', origin());
  successUrl.searchParams.set('booking', input.bookingUid);
  /*
   * `mode` rides on the success URL purely so the confirmation page's
   * client-side conversion mirror can label the event. The AUTHORITATIVE fire is
   * server-side from setup_intent.succeeded, which reads mode off the SetupIntent
   * metadata, so a student who strips this param loses nothing that matters.
   */
  successUrl.searchParams.set('mode', input.mode);
  const cancelUrl = new URL('/coach/book', origin());
  cancelUrl.searchParams.set('booking', input.bookingUid);

  const params: Stripe.Checkout.SessionCreateParams = {
    mode: 'setup',
    customer: student.id,
    // Setup mode has no amount, so Stripe needs the currency told to it in order
    // to decide which payment methods are eligible.
    currency: 'usd',
    /*
     * The ONE payment-method restriction in this codebase, and the reason is a
     * product decision rather than a technical one.
     *
     * Bank debit needs a mandate the student authorises through a bank login or
     * micro-deposits — minutes of work and a real drop-off — and this is the
     * single step in the funnel that has to be frictionless. Card entry is
     * instant and universal. ACH is genuinely wanted for the recurring plan,
     * where the fee saving is ~$70/student/year and the student already has a
     * reason to bother; it is not wanted at the free-assessment door.
     *
     * Expressed as an exclusion, not as `payment_method_types: ['card']`, because
     * an exclusion keeps dynamic payment methods working: wallets, Link and
     * anything else the operator enables in the Dashboard still show up and still
     * convert. A hardcoded allow-list would silently freeze this step to cards
     * forever, and would need a deploy to undo.
     */
    excluded_payment_method_types: ['us_bank_account'],
    client_reference_id: input.bookingUid,
    success_url: successUrl.toString(),
    cancel_url: cancelUrl.toString(),
    // Tags this flow for Dashboard-side conversion comparison. See the
    // INTEGRATION_* constants above for why the suffix is fixed.
    integration_identifier: INTEGRATION_ASSESSMENT_HOLD,
    // Copied onto the SetupIntent, so the setup_intent.succeeded webhook can
    // confirm the booking without a second API call to fetch this session.
    // `kind` is what lets that webhook distinguish an assessment hold from any
    // other future SetupIntent — without it, a student updating their card in the
    // Customer Portal would fire a second assessment_booked conversion and
    // corrupt the primary metric the ad account bids on.
    setup_intent_data: {
      metadata: {
        kind: SETUP_KIND_ASSESSMENT,
        booking_uid: input.bookingUid,
        mode: input.mode,
        ...(input.assessmentAt ? { assessment_at: input.assessmentAt.toISOString() } : {}),
      },
      description: `Card on file to hold a free vocal assessment (${modeLabel(input.mode)})`,
    },
    metadata: { booking_uid: input.bookingUid, mode: input.mode, kind: SETUP_KIND_ASSESSMENT },
    custom_text: {
      // The plain-words promise, repeated on Stripe's own page. Setup mode shows
      // no amount at all, which reads as ambiguous rather than reassuring, so the
      // "you won't be charged" sentence has to be restated here — being coy about
      // the card converts worse, not better.
      submit: {
        message: 'Your card holds your slot. You will not be charged for the assessment.',
      },
    },
  };

  const session = await createHoldSession(stripe, student.id, input.bookingUid, params);

  if (!session.url) {
    throw new Error(
      `Stripe returned Checkout Session ${session.id} with no url; cannot redirect the student. ` +
        'This normally means the session was created in a non-redirect ui_mode.',
    );
  }

  return { url: session.url, sessionId: session.id, customerId: student.id, student };
}

/**
 * Create the hold session, recovering from an idempotency-key conflict.
 *
 * ---------------------------------------------------------------------------
 * WHY THE RECOVERY PATH EXISTS (IT WAS A REAL 400, NOT A HYPOTHETICAL)
 * ---------------------------------------------------------------------------
 * Stripe's idempotency contract is stricter than "same key, same result": a key
 * may only be reused with the SAME REQUEST BODY. Reuse it with a different body
 * and Stripe answers 400 `idempotency_error` rather than returning the original
 * object.
 *
 * That bites here for a reason specific to this flow. `assessmentAt` reaches this
 * function from a live Cal.com API read, and Cal.com's write can lag its own
 * redirect. So the first attempt may carry `assessment_at` in the SetupIntent
 * metadata and a retry seconds later may not — same booking, same student, same
 * intent, different body. Without this recovery the student would hit a hard
 * error at the single highest-intent moment in the funnel, having already picked
 * a slot.
 *
 * So a conflict is treated as what it actually means — "a session for this
 * booking already exists" — and that session is found and reused. Reuse is the
 * correct outcome anyway: the goal was never a second session, it was to avoid
 * one.
 */
async function createHoldSession(
  stripe: Stripe,
  customerId: string,
  bookingUid: string,
  params: Stripe.Checkout.SessionCreateParams,
): Promise<Stripe.Checkout.Session> {
  try {
    return await stripe.checkout.sessions.create(
      params,
      // Keyed on the booking uid. Two things race: an impatient double-click, and
      // the Cal.com redirect arriving alongside the webhook. Either would
      // otherwise create a second Checkout Session against the same slot.
      { idempotencyKey: `hold:${bookingUid}` },
    );
  } catch (error) {
    if (!(error instanceof Stripe.errors.StripeIdempotencyError)) throw error;

    // Sessions cannot be listed by client_reference_id, so scope by customer —
    // which is cheap, because a student has at most a handful — and match on the
    // booking uid.
    const sessions = await stripe.checkout.sessions.list({ customer: customerId, limit: 20 });
    const existing = sessions.data.find(
      (session) => session.client_reference_id === bookingUid && session.status === 'open',
    );

    if (existing) {
      console.warn(
        `[booking] reusing existing open Checkout Session ${existing.id} for booking ${bookingUid}: ` +
          'the idempotency key was already used with a different request body (most often a retry ' +
          'where the Cal.com slot time had not resolved on the first attempt).',
      );
      return existing;
    }

    /*
     * The key is spent and no open session survives it — the student let the
     * earlier one expire (Stripe sessions last 24 hours) or completed it and came
     * back. Either way a fresh session is the right answer, so the key is
     * date-suffixed. Idempotency keys expire after 24 hours on Stripe's side, so
     * a per-day suffix restores protection against same-day double-clicks while
     * still allowing a genuine second attempt tomorrow.
     */
    const day = new Date().toISOString().slice(0, 10);
    console.warn(
      `[booking] no open session survived idempotency key hold:${bookingUid}; creating a fresh one ` +
        `under hold:${bookingUid}:${day}.`,
    );
    return stripe.checkout.sessions.create(params, { idempotencyKey: `hold:${bookingUid}:${day}` });
  }
}

/**
 * Make a newly-saved payment method the customer's default for invoices.
 *
 * Called from `setup_intent.succeeded`. Without this the card is merely attached:
 * the Subscription created later would find no default payment method, produce
 * an invoice in `status: open` awaiting manual payment, and the "one click, card
 * already on file" promise would quietly become "check your email for an invoice".
 *
 * Runs for EVERY successful SetupIntent, not only assessment holds — a student
 * who adds a bank account through the Customer Portal should have every
 * subsequent month billed the cheap way without anyone touching anything.
 */
export async function attachDefaultPaymentMethod(
  customerId: string,
  paymentMethodId: string,
): Promise<void> {
  await getStripe().customers.update(
    customerId,
    { invoice_settings: { default_payment_method: paymentMethodId } },
    { idempotencyKey: `default-pm:${paymentMethodId}` },
  );
}

/* ------------------------------------------------------------------ */
/* Direct purchase — pay first, book the slot afterwards               */
/* ------------------------------------------------------------------ */

/**
 * Buy a package outright, without going through the free assessment.
 *
 * ---------------------------------------------------------------------------
 * WHY BOTH PATHS EXIST, AND WHY THIS ONE IS NOT THE PRIMARY CONVERSION
 * ---------------------------------------------------------------------------
 * The free assessment converts cold ad traffic, because a stranger will give up
 * 30 minutes long before they will give up $900. Direct purchase converts warm
 * traffic — a referral, a returning visitor, someone who already knows the
 * teacher — for whom a free-assessment gate is friction rather than reassurance.
 * So direct purchase is the primary call to action on /coach/pricing while the
 * assessment stays primary on the ad landing pages.
 *
 * `assessment_booked` REMAINS the Primary Google Ads conversion at
 * ASSESSMENT_VALUE_USD[mode]. That is not a hedge — it is because Smart Bidding
 * needs one target, and the assessment is the event that occurs early enough and
 * often enough to train on. The campaign CSVs in marketing/ and the tCPA targets
 * in marketing/launch-checklist.md are all set against it.
 *
 * ---------------------------------------------------------------------------
 * PAY FIRST, THEN BOOK. THE ORDER IS A BUSINESS CONSTRAINT.
 * ---------------------------------------------------------------------------
 * There are only two in-person days a week (IN_PERSON_DAYS), so a slot is a
 * genuinely scarce resource. Booking before paying would let unpaid holds sit on
 * that calendar and quietly destroy the week's capacity — the same no-show
 * problem the $0 card hold exists to solve on the assessment path, except here
 * there is a simpler answer available: take the money first. The UI's
 * /coach/purchase/confirmed page is where slot selection happens, after Stripe
 * redirects back.
 */
export type CheckoutInput = {
  /** lookup_key from content/pricing.json. NEVER a Stripe price ID. */
  lookupKey: string;
  /** Buyer's email, when known. Prefills Checkout and joins the Customer. */
  email?: string;
  name?: string;
  /**
   * The payer's email when the student is a minor.
   *
   * A person under 18 cannot enter a payment agreement, so the Stripe Customer —
   * the party being charged every month — has to be the guardian, not the
   * student. When this is supplied it WINS over `email`, and that precedence is
   * the whole point of the field.
   */
  guardianEmail?: string;
  /** GA4 client id. Same load-bearing role as on the assessment path. */
  gaClientId?: string;
  clickIds?: ClickIds;
  utm?: Partial<Record<UtmKey, string>> & ClickIds;
};

export type CheckoutSession = {
  /** Stripe-hosted Checkout URL. Redirect the buyer here. */
  url: string;
  sessionId: string;
  customerId: string | null;
  /** Resolved from the rate card, for the caller to log or display. */
  price: Price;
};

/** Marks a Checkout Session as belonging to the direct-purchase funnel. */
export const CHECKOUT_KIND_DIRECT = 'direct_purchase';

/**
 * Create a Checkout Session for a direct package purchase.
 *
 * `mode` is derived from the rate card rather than passed in: a price with
 * `interval === 'month'` must be a Subscription and a one-time price must be a
 * payment. Letting a caller choose would allow a monthly plan to be sold as a
 * single charge, which bills once and then silently never again — a bug that
 * looks like a successful sale for a month.
 */
export async function createCheckoutSession(input: CheckoutInput): Promise<CheckoutSession> {
  const stripe = getStripe();

  // Throws with the list of valid keys before any network call. This is also the
  // second line of defence behind the API route's own allow-list check: a price
  // is NEVER constructed from a client-supplied amount anywhere in this codebase.
  const catalogPrice = lookup(input.lookupKey);
  const price = await resolvePrice(input.lookupKey);
  const recurring = catalogPrice.interval === 'month';

  /*
   * The payer. Guardian first — see CheckoutInput.guardianEmail.
   *
   * A Customer is created up front (rather than letting Checkout create one)
   * ONLY when an email is known, because the attribution has to be stamped onto
   * it: the ga_client_id and the click ids are what let the webhook's conversion
   * attach to a real GA4 session and, later, to the click that paid for it.
   * With no email there is nothing to deduplicate a Customer on, so Checkout is
   * allowed to create one and the attribution rides on the session metadata
   * instead — degraded but not lost.
   */
  const payerEmail = input.guardianEmail ?? input.email;
  const student = payerEmail
    ? await findOrCreateStudent({
        mode: catalogPrice.mode,
        name: input.name ?? '',
        email: payerEmail,
        guardianEmail: input.guardianEmail,
        gaClientId: input.gaClientId,
        ...input.clickIds,
        utm: input.utm,
      })
    : null;

  const successUrl = new URL('/coach/purchase/confirmed', origin());
  // Stripe substitutes the real id into this literal placeholder. It must stay
  // unencoded, which is why it is appended as a raw string rather than through
  // searchParams.set() — URLSearchParams would percent-encode the braces and
  // Stripe would not recognise the template.
  const successUrlWithSession = `${successUrl.toString()}?session_id={CHECKOUT_SESSION_ID}`;

  const metadata: Stripe.MetadataParam = {
    kind: CHECKOUT_KIND_DIRECT,
    lookup_key: input.lookupKey,
    mode: catalogPrice.mode,
    type: catalogPrice.type,
    lessons: String(catalogPrice.lessons),
    // Carried on the session so that even the no-email path (no Customer to
    // stamp) still hands the webhook something to attribute with.
    ...(input.gaClientId ? { ga_client_id: input.gaClientId } : {}),
  };

  const params: Stripe.Checkout.SessionCreateParams = {
    mode: recurring ? 'subscription' : 'payment',
    line_items: [{ price: price.id, quantity: 1 }],
    ...(student ? { customer: student.id } : { customer_email: payerEmail }),
    // Always create a Customer even for a one-off pack: without one, a pack buyer
    // has no record for lifetimeValueCents() to sum and no metadata to hold the
    // attribution, so they would be invisible to every report in lib/students.ts.
    ...(student || recurring ? {} : { customer_creation: 'always' as const }),
    success_url: successUrlWithSession,
    cancel_url: new URL('/coach/pricing', origin()).toString(),
    integration_identifier: INTEGRATION_DIRECT_PURCHASE,
    metadata,
    ...(recurring
      ? {
          /*
           * NO `billing_cycle_anchor` AND NO `proration_behavior` HERE.
           *
           * The asymmetry with startPlan() is deliberate and will otherwise look
           * like a missing line. Those two parameters exist on that path for one
           * specific promise: "your first payment is a week after your free
           * assessment, not today". They push the first invoice past the first
           * paid lesson, and `proration_behavior: 'none'` is mandatory there to
           * stop Stripe billing a prorated amount on day zero anyway.
           *
           * A direct purchase makes no such promise. The buyer is on a checkout
           * page with a price on it and expects to be charged now; deferring
           * their first charge by a week would be a free month nobody asked for,
           * and it would put a lesson on the calendar before any money moved.
           * Charging immediately IS the correct behaviour here.
           */
          subscription_data: {
            metadata,
            // Shows on the invoice line, so a receipt reads "Monthly · 4 × 60 min
            // · Online" rather than just the product name.
            description: `${catalogPrice.name} · ${modeLabel(catalogPrice.mode)}`,
          },
          /*
           * Matches startPlan()'s payment_settings, and for the same reason: if
           * the student later pays an invoice with a bank account instead of the
           * card they checked out with, that becomes the new default and every
           * following month bills the cheap way with no action from anyone.
           *
           * Set on the Session rather than inside subscription_data because that
           * is where Checkout accepts it. Still no `payment_method_types` — which
           * methods are eligible, and in what order, is a Dashboard setting.
           */
          saved_payment_method_options: { payment_method_save: 'enabled' },
        }
      : {
          // Copied onto the PaymentIntent as well as the Session. The Session is
          // what checkout.session.completed carries, but a refund or a dispute is
          // investigated from the PaymentIntent, and having the lookup_key there
          // is the difference between "a $900 charge" and "an in-person 10-pack".
          payment_intent_data: { metadata },
        }),
    /*
     * NO `excluded_payment_method_types`, AND THAT IS THE DIFFERENCE FROM THE
     * ASSESSMENT HOLD.
     *
     * createAssessmentHold() excludes `us_bank_account` because a bank mandate
     * costs minutes of bank-login or micro-deposit friction, and it sits at the
     * single step in the funnel that must be frictionless — the free-assessment
     * door, where the student is giving up nothing and will simply leave.
     *
     * Here the calculus inverts completely. The amounts are $700–$900 for a pack
     * or $280–$360 a month recurring, where ACH at 0.8% capped at $5 against a
     * card's 2.9% + 30c is roughly $70 per student per year of pure margin. The
     * buyer has already decided to spend real money, so a minute of bank
     * verification is proportionate — and there is no slot being held hostage to
     * a no-show, because payment completes before anything is booked.
     *
     * As everywhere else in this file, `payment_method_types` is not passed at
     * all: which methods appear, and in what order, is a Dashboard setting.
     */
  };

  /*
   * NO IDEMPOTENCY KEY, unlike createAssessmentHold.
   *
   * There, the key is the Cal.com booking uid and it guards a real hazard: two
   * Customers and two card holds against ONE calendar slot. Here there is no
   * external object to key on and no hazard worth guarding — a Checkout Session
   * is not a charge, only a completed one is, and a buyer can complete exactly
   * one at a time. A stale key would be actively harmful instead: a buyer who
   * abandoned checkout and came back to buy a different package would be handed
   * the session for the OLD package.
   */
  const session = await stripe.checkout.sessions.create(params);

  if (!session.url) {
    throw new Error(
      `Stripe returned Checkout Session ${session.id} with no url; cannot redirect the buyer. ` +
        'This normally means the session was created in a non-redirect ui_mode.',
    );
  }

  return {
    url: session.url,
    sessionId: session.id,
    customerId: student?.id ?? null,
    price: catalogPrice,
  };
}

/* ------------------------------------------------------------------ */
/* Phase 2 — conversion to a paying plan                               */
/* ------------------------------------------------------------------ */

/** Resolve a Stripe Price from a lookup key in content/pricing.json. */
export async function resolvePrice(lookupKey: string): Promise<Stripe.Price> {
  // Throws if the key is not in the rate card at all — a typo caught before a
  // network call, with the valid keys listed.
  lookup(lookupKey);

  const prices = await getStripe().prices.list({
    lookup_keys: [lookupKey],
    active: true,
    limit: 1,
  });
  const price = prices.data[0];
  if (!price) {
    throw new Error(
      `No active Stripe Price with lookup_key "${lookupKey}" exists in this account.\n` +
        '  Run `npm run stripe:bootstrap` to create the rate card from content/pricing.json, or ' +
        '`npm run stripe:audit` to see what is actually there.\n' +
        '  Check you are pointed at the account you think you are — test and live have separate catalogs.',
    );
  }
  return price;
}

export type StartPlanInput = {
  customerId: string;
  /** lookup_key from content/pricing.json, e.g. "online_monthly_60". */
  lookupKey: string;
  /** The assessment datetime. Billing anchors FIRST_CHARGE_OFFSET_DAYS after it. */
  assessmentAt: Date;
};

export type StartedPlan = {
  subscription: Stripe.Subscription;
  /** When the first invoice will actually be issued. */
  firstChargeAt: Date;
  /** True when the 7-day anchor was already in the past and had to be dropped. */
  anchoredImmediately: boolean;
};

/**
 * Start a monthly plan against the payment method already on file.
 *
 * ---------------------------------------------------------------------------
 * `proration_behavior: 'none'` IS MANDATORY. DO NOT REMOVE IT.
 * ---------------------------------------------------------------------------
 * Setting `billing_cycle_anchor` to a future date splits the subscription's
 * first period, and Stripe's DEFAULT response to that split is
 * `create_prorations` — it immediately issues a prorated invoice covering
 * now → anchor and charges the card on file straight away.
 *
 * That is the exact opposite of what this whole mechanic is for. The student was
 * told "your first payment is a week after your assessment"; the default
 * behaviour charges them within seconds of clicking, which is a chargeback, a
 * refund request and a lost student. With `'none'` the split period is simply
 * free and the first invoice is the full month issued at the anchor.
 *
 * The failure is silent — no error, no warning, just money moving on the wrong
 * day — so nothing catches it except knowing to look. Verify it every time this
 * function changes: start a plan in test mode and confirm the subscription has
 * NO non-zero invoice before the anchor date.
 */
export async function startPlan(input: StartPlanInput): Promise<StartedPlan> {
  const stripe = getStripe();
  const catalogPrice = lookup(input.lookupKey);

  if (catalogPrice.type !== 'monthly') {
    throw new Error(
      `startPlan expects a monthly plan, but "${input.lookupKey}" is a ${catalogPrice.type}. ` +
        'Packs and single lessons are one-off purchases and go through Checkout, not a Subscription.',
    );
  }

  const price = await resolvePrice(input.lookupKey);

  const customer = await stripe.customers.retrieve(input.customerId);
  if (customer.deleted) {
    throw new Error(`Stripe customer ${input.customerId} is deleted; cannot start a plan.`);
  }
  const defaultPaymentMethod = customer.invoice_settings?.default_payment_method;
  if (!defaultPaymentMethod) {
    throw new Error(
      `Customer ${input.customerId} has no invoice_settings.default_payment_method, so there is ` +
        'nothing to charge. The card should have been set as default by the setup_intent.succeeded ' +
        'webhook — check that app/api/stripe/webhook/route.ts is receiving events and that ' +
        'STRIPE_WEBHOOK_SECRET matches the endpoint.',
    );
  }

  const anchorDate = new Date(input.assessmentAt.getTime() + FIRST_CHARGE_OFFSET_DAYS * 86_400_000);
  const now = new Date();

  /*
   * Stripe rejects a `billing_cycle_anchor` in the past. That is not hypo-
   * thetical: the teacher may run scripts/start-plan.ts weeks after the
   * assessment, or a student may click their emailed plan link late. Rather than
   * failing the conversion at the moment of highest intent, the anchor is
   * dropped and billing starts now — the correct trade, because the "first
   * charge after the first lesson" promise is already satisfied by then.
   */
  const anchoredImmediately = anchorDate <= now;

  const subscription = await stripe.subscriptions.create(
    {
      customer: input.customerId,
      items: [{ price: price.id }],
      default_payment_method:
        typeof defaultPaymentMethod === 'string' ? defaultPaymentMethod : defaultPaymentMethod.id,
      collection_method: 'charge_automatically',
      ...(anchoredImmediately ? {} : { billing_cycle_anchor: toUnix(anchorDate) }),
      // READ THE HEADER COMMENT BEFORE TOUCHING THIS LINE.
      proration_behavior: 'none',
      payment_settings: {
        // No `payment_method_types` here either — see the file header. Which
        // methods are eligible for a recurring charge, and in what order, is a
        // Dashboard setting.
        //
        // If the student later pays an invoice with a bank account instead of the
        // saved card, this makes that the new default, so every following month
        // bills the cheap way with no further action from anyone.
        save_default_payment_method: 'on_subscription',
      },
      /*
       * NO `automatic_tax`. Private music instruction is generally not taxable in
       * California, and that is the accountant's determination, not an assumption
       * for code to make either way.
       *
       * Worth knowing the trap in both directions: `automatic_tax: {enabled:true}`
       * without an active tax registration does not error — it silently computes
       * and collects nothing, so an operator who flipped it on believing they were
       * now compliant would have no signal that they were not. Leaving it off is
       * both the correct default here and the honest one.
       */
      metadata: {
        lookup_key: input.lookupKey,
        mode: catalogPrice.mode,
        lessons_per_month: String(catalogPrice.lessons),
        assessment_at: input.assessmentAt.toISOString(),
        integration: INTEGRATION_PLAN_START,
      },
      expand: ['latest_invoice'],
    },
    // Keyed on customer + plan so a double-clicked plan link, or a retried script
    // run, cannot produce two subscriptions billing the same student twice a month.
    { idempotencyKey: `plan:${input.customerId}:${input.lookupKey}` },
  );

  return {
    subscription,
    firstChargeAt: anchoredImmediately ? now : anchorDate,
    anchoredImmediately,
  };
}

/** "$280/mo · Monthly · 4 × 60 min · Online" — for emails and operator logs. */
export function planSummary(lookupKey: string): string {
  const price = lookup(lookupKey);
  return `${formatUsd(price.amountCents)}/mo · ${price.name} · ${modeLabel(price.mode)}`;
}
