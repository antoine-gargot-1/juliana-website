import type Stripe from 'stripe';
import { customerId, getStripe, subscriptionIdFromInvoice } from '@/lib/stripe';
import type { LessonMode } from '@/lib/pricing';

/**
 * The student record — every read and write, in one file.
 *
 * ---------------------------------------------------------------------------
 * THERE IS NO DATABASE. STRIPE IS THE STORE.
 * ---------------------------------------------------------------------------
 * One teacher, a few dozen students, and every fact worth storing is already a
 * fact Stripe holds authoritatively:
 *
 *   who they are            → Customer name / email
 *   which funnel they came  → Customer metadata (mode, goals, ga_client_id, utm_*)
 *   what they bought        → Subscriptions and Invoices
 *   how long they stayed    → count of paid subscription invoices
 *   what they were worth    → sum of paid invoice amounts
 *
 * Provisioning Postgres to duplicate that would add a migration story, a
 * connection pool, a backup policy and a second source of truth that can
 * disagree with Stripe about whether someone is a paying student. The billing
 * system's answer to "is this person paying" is the one that matters, because
 * it is the one attached to the money.
 *
 * ---------------------------------------------------------------------------
 * WHY EVERY ACCESS GOES THROUGH THIS FILE ANYWAY
 * ---------------------------------------------------------------------------
 * The tradeoff is real: Stripe metadata is a flat string map with no schema, no
 * joins and no aggregate queries, and `customers.search` is eventually
 * consistent. When reporting outgrows that — cohort retention curves, say — the
 * fix is to add a real database. That swap should touch THIS FILE AND NOTHING
 * ELSE, which is only true if no other module ever reaches for
 * `customer.metadata` directly. So:
 *
 *   - Route handlers and scripts call the functions below. They never read or
 *     write `metadata` themselves.
 *   - The metadata key strings live in META and are not repeated anywhere else;
 *     a typo'd key is otherwise invisible, because Stripe accepts any key and
 *     reading a missing one just yields undefined.
 *
 * Deliberately NOT here: `invoice_settings.default_payment_method` and anything
 * else that configures billing. That is Stripe's own configuration, not student
 * data — it would not move to a database — so it lives in lib/booking.ts.
 */

/* ------------------------------------------------------------------ */
/* Metadata schema                                                     */
/* ------------------------------------------------------------------ */

/**
 * Stripe metadata limits, which this file has to respect rather than discover:
 * 50 keys per object, keys up to 40 characters, values up to 500 characters.
 * Free-text answers from the booking form are the only realistic way to blow
 * the value limit, so they are truncated on write (see meta()).
 */
const MAX_VALUE_LENGTH = 500;

const META = {
  mode: 'mode',
  goals: 'goals',
  experience: 'experience',
  availability: 'availability',
  guardianName: 'guardian_name',
  guardianEmail: 'guardian_email',
  /** GA4 client id. See gaClientId's doc comment — this one is load-bearing. */
  gaClientId: 'ga_client_id',
  /** Google Ads click id, for Offline Conversion Import. See GCLID note below. */
  gclid: 'gclid',
  /**
   * The privacy-era alternatives to gclid.
   *
   * Google issues `gbraid` on iOS app-to-web campaigns and `wbraid` on
   * web-to-app, where App Tracking Transparency prevents a gclid being set.
   * Google Ads accepts either as an Offline Conversion Import key, in their own
   * columns rather than the Google Click ID column.
   *
   * Stored for the same reason gclid is: a click id cannot be recovered after
   * the fact, and not storing these would silently make every iOS ad click
   * permanently unattributable — which on a mobile-heavy local service business
   * is a large share of exactly the traffic the budget buys.
   */
  gbraid: 'gbraid',
  wbraid: 'wbraid',
  bookingUid: 'booking_uid',
  assessmentAt: 'assessment_at',
  stage: 'funnel_stage',
  planLookupKey: 'plan_lookup_key',
  planStartedAt: 'plan_started_at',
  subscriptionId: 'subscription_id',
  firstPaidAt: 'first_paid_at',
  lastPaidAt: 'last_paid_at',
  churnedAt: 'churned_at',
  monthsRetained: 'months_retained',
  reviewRequestedAt: 'review_requested_at',
  /**
   * Prefix for "we already reported this conversion". See claimConversion().
   * A prefix rather than a fixed key so each one-shot conversion gets its own
   * timestamp, which is also useful when reconciling GA4 against Stripe by hand.
   */
  conversionPrefix: 'conv_',
} as const;

/**
 * UTM keys mirror lib/analytics.ts exactly, so the join across the two works.
 *
 * Deliberately just the five utm_* params, NOT the click ids that
 * lib/analytics.ts latches alongside them. Two different jobs: these five are
 * forwarded to GA4 as event parameters (see lib/ga-server.ts, which types its
 * `utm` argument against this list), while gclid/gbraid/wbraid are stored for
 * Google Ads Offline Conversion Import and are never sent to GA4 as parameters.
 * Merging them would put a raw click id into GA4 event params for no benefit.
 */
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;
export type UtmKey = (typeof UTM_KEYS)[number];

/**
 * The ad-click identifiers, stored but never forwarded to GA4.
 *
 * One list so that adding a future click id is a single edit here rather than
 * five scattered ones — the encode, the decode, the type and both writers.
 */
const CLICK_ID_KEYS = ['gclid', 'gbraid', 'wbraid'] as const;
export type ClickIdKey = (typeof CLICK_ID_KEYS)[number];

/** What the booking form and the direct-purchase form hand over, as one bag. */
export type ClickIds = Partial<Record<ClickIdKey, string>>;

/**
 * Where a student sits in the funnel.
 *
 * `booked` covers "assessment on the calendar, card on file, not paying yet" —
 * the majority state, and the one the plan-conversion email targets.
 */
export type FunnelStage = 'booked' | 'active' | 'churned';

export type Student = {
  id: string;
  email: string | null;
  name: string | null;
  mode: LessonMode | null;
  stage: FunnelStage;
  goals: string | null;
  experience: string | null;
  availability: string | null;
  guardianName: string | null;
  guardianEmail: string | null;
  /** GA4 client id captured on the booking form. Null means unattributable. */
  gaClientId: string | null;
  /** Google Ads click id, when the visitor arrived from a paid click. */
  gclid: string | null;
  /** iOS/app-campaign alternatives to gclid. Usually all null; see META.gbraid. */
  gbraid: string | null;
  wbraid: string | null;
  utm: Partial<Record<UtmKey, string>>;
  bookingUid: string | null;
  assessmentAt: Date | null;
  planLookupKey: string | null;
  planStartedAt: Date | null;
  subscriptionId: string | null;
  firstPaidAt: Date | null;
  lastPaidAt: Date | null;
  churnedAt: Date | null;
  reviewRequestedAt: Date | null;
};

/* ------------------------------------------------------------------ */
/* Encoding                                                            */
/* ------------------------------------------------------------------ */

/**
 * Build a metadata patch, dropping keys with nothing to say and truncating the
 * rest to Stripe's 500-character ceiling.
 *
 * Dropping rather than sending '' is deliberate: Stripe treats an empty string
 * as "delete this key", so a patch built from a partially-filled form would
 * erase fields it was never meant to touch. Every write in this file is a patch
 * over existing metadata, never a replacement of it.
 */
function meta(entries: Record<string, string | number | null | undefined>): Stripe.MetadataParam {
  const out: Stripe.MetadataParam = {};
  for (const [key, value] of Object.entries(entries)) {
    if (value === null || value === undefined || value === '') continue;
    out[key] = String(value).slice(0, MAX_VALUE_LENGTH);
  }
  return out;
}

const str = (m: Stripe.Metadata, key: string): string | null => {
  const v = m[key];
  return v && v.length > 0 ? v : null;
};

const date = (m: Stripe.Metadata, key: string): Date | null => {
  const v = str(m, key);
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Decode a Stripe Customer into a Student. The only place metadata is read. */
export function toStudent(customer: Stripe.Customer): Student {
  const m = customer.metadata ?? {};
  const rawMode = str(m, META.mode);
  const rawStage = str(m, META.stage);

  const utm: Partial<Record<UtmKey, string>> = {};
  for (const key of UTM_KEYS) {
    const v = str(m, key);
    if (v) utm[key] = v;
  }

  return {
    id: customer.id,
    email: customer.email ?? null,
    name: customer.name ?? null,
    // Unknown values decode to null rather than being coerced: a stray mode
    // string must not silently become "online" and get billed at online rates.
    mode: rawMode === 'online' || rawMode === 'inperson' ? rawMode : null,
    stage:
      rawStage === 'active' || rawStage === 'churned' || rawStage === 'booked'
        ? rawStage
        : 'booked',
    goals: str(m, META.goals),
    experience: str(m, META.experience),
    availability: str(m, META.availability),
    guardianName: str(m, META.guardianName),
    guardianEmail: str(m, META.guardianEmail),
    gaClientId: str(m, META.gaClientId),
    gclid: str(m, META.gclid),
    gbraid: str(m, META.gbraid),
    wbraid: str(m, META.wbraid),
    utm,
    bookingUid: str(m, META.bookingUid),
    assessmentAt: date(m, META.assessmentAt),
    planLookupKey: str(m, META.planLookupKey),
    planStartedAt: date(m, META.planStartedAt),
    subscriptionId: str(m, META.subscriptionId),
    firstPaidAt: date(m, META.firstPaidAt),
    lastPaidAt: date(m, META.lastPaidAt),
    churnedAt: date(m, META.churnedAt),
    reviewRequestedAt: date(m, META.reviewRequestedAt),
  };
}

/* ------------------------------------------------------------------ */
/* Reads                                                               */
/* ------------------------------------------------------------------ */

/** Fetch one student. Throws if the customer was deleted in the dashboard. */
export async function getStudent(id: string): Promise<Student> {
  const customer = await getStripe().customers.retrieve(id);
  if (customer.deleted) {
    throw new Error(`Stripe customer ${id} is deleted; there is no student record to read.`);
  }
  return toStudent(customer);
}

/** Fetch a student from any object holding an expandable customer reference. */
export async function getStudentFrom(
  ref: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined,
): Promise<Student | null> {
  const id = customerId(ref);
  if (!id) return null;
  try {
    return await getStudent(id);
  } catch {
    return null;
  }
}

/**
 * Every paid subscription invoice for a student, oldest first.
 *
 * Filtered to subscription invoices with money on them, which is what makes
 * this a retention measure rather than a transaction count:
 *   - a 10-lesson pack is revenue but not a retained month;
 *   - a $0 invoice (fully discounted, or a proration that netted to nothing)
 *     is a billing artefact, not a month of lessons delivered.
 */
async function paidSubscriptionInvoices(id: string): Promise<Stripe.Invoice[]> {
  const invoices: Stripe.Invoice[] = [];
  for await (const invoice of getStripe().invoices.list({ customer: id, status: 'paid', limit: 100 })) {
    if (invoice.amount_paid > 0 && subscriptionIdFromInvoice(invoice)) invoices.push(invoice);
  }
  return invoices.sort((a, b) => a.created - b.created);
}

/**
 * How many months a student has actually paid for — derived, never stored.
 *
 * Derived is the point. A stored counter drifts the moment an invoice is
 * refunded, voided or paid late, and nothing would ever reconcile it. Counting
 * paid invoices at read time cannot drift, because it is the same source the
 * bank statement came from. The `months_retained` metadata written on churn is
 * a snapshot for reporting convenience, not the authority.
 */
export async function retentionMonths(id: string): Promise<number> {
  return (await paidSubscriptionInvoices(id)).length;
}

/**
 * True lifetime value in cents: every paid invoice, subscription or one-off.
 *
 * This is the number Offline Conversion Import eventually sends back to Google
 * Ads (scripts/offline-conversions.ts). Unlike retentionMonths it deliberately
 * includes packs and single lessons — for LTV, cash is cash.
 */
export async function lifetimeValueCents(id: string): Promise<number> {
  let total = 0;
  for await (const invoice of getStripe().invoices.list({ customer: id, status: 'paid', limit: 100 })) {
    total += invoice.amount_paid;
  }
  return total;
}

/** The first paid subscription invoice, or null if they have never paid. */
export async function firstPaidInvoice(id: string): Promise<Stripe.Invoice | null> {
  const invoices = await paidSubscriptionInvoices(id);
  return invoices[0] ?? null;
}

/* ------------------------------------------------------------------ */
/* Writes                                                              */
/* ------------------------------------------------------------------ */

export type StudentIntake = {
  mode: LessonMode;
  name: string;
  email: string;
  goals?: string;
  experience?: string;
  availability?: string;
  guardianName?: string;
  guardianEmail?: string;
  /**
   * GA4 client id, read from the `_ga` cookie on the booking form.
   *
   * ---------------------------------------------------------------------------
   * THIS FIELD IS WHY SERVER-SIDE CONVERSION TRACKING WORKS AT ALL.
   * ---------------------------------------------------------------------------
   * The conversion is fired from a Stripe webhook — a Google datacentre talking
   * to a Vercel function, with no browser, no cookie and no session anywhere in
   * the request. GA4's Measurement Protocol needs a `client_id` to know which
   * session the event belongs to; without it the event still lands, but with no
   * source, no medium and no campaign, so every acquisition report shows
   * `(not set)` and the ad account has nothing to bid on.
   *
   * The only moment the browser's client id and the Stripe customer exist in
   * the same request is the booking form POST. Capturing it here and stashing
   * it on the Customer is the join. Lose this field and Phase 3 becomes
   * decorative.
   */
  gaClientId?: string;
  /**
   * Google Ads click id (`?gclid=`), when present on the landing URL.
   *
   * Separate from the UTMs on purpose: UTMs are for GA4 attribution, gclid is
   * the key Google Ads Offline Conversion Import matches on. Without a stored
   * gclid, scripts/offline-conversions.ts has nothing to upload no matter how
   * many students exist — the CSV is keyed on the click, not on the person.
   *
   * Latched into sessionStorage by lib/analytics.ts, so it survives a visitor
   * who lands on an ad page and navigates to the booking form before converting
   * — which is the normal path, and was the case that used to lose it.
   */
  gclid?: string;
  /** iOS app-campaign alternatives to gclid. See META.gbraid. */
  gbraid?: string;
  wbraid?: string;
  utm?: Partial<Record<UtmKey, string>> & ClickIds;
  bookingUid?: string;
  assessmentAt?: Date;
};

/**
 * Find the Customer for an email, or create one, and merge the intake context
 * onto it.
 *
 * Matched by `customers.list({ email })` rather than `customers.search`: list is
 * an exact-match index read and is strongly consistent, while search lags by up
 * to a minute. A student who books, abandons Stripe Checkout and comes back two
 * seconds later must land on the same Customer, and with search they would get
 * a duplicate — which then splits their invoice history and breaks retention
 * counting.
 *
 * `idempotencyKey` should be derived from the Cal.com booking uid. It covers the
 * remaining race: two in-flight creates for a brand-new email, which the list
 * lookup cannot see because neither has committed yet.
 */
export async function findOrCreateStudent(
  intake: StudentIntake,
  opts: { idempotencyKey?: string } = {},
): Promise<Student> {
  const stripe = getStripe();
  const email = intake.email.trim().toLowerCase();

  const patch = meta({
    [META.mode]: intake.mode,
    [META.goals]: intake.goals,
    [META.experience]: intake.experience,
    [META.availability]: intake.availability,
    [META.guardianName]: intake.guardianName,
    [META.guardianEmail]: intake.guardianEmail,
    [META.gaClientId]: intake.gaClientId,
    [META.bookingUid]: intake.bookingUid,
    [META.assessmentAt]: intake.assessmentAt?.toISOString(),
    ...Object.fromEntries(UTM_KEYS.map((k) => [k, intake.utm?.[k]])),
    /*
     * Click ids accepted BOTH as top-level fields and inside `utm`, because the
     * two call sites differ: /coach/book/hold reads them out of Cal.com booking
     * metadata as discrete values, while the direct-purchase route receives the
     * whole latched attribution bag from lib/analytics.ts in one object. Reading
     * both means neither caller can quietly drop a click id by putting it in the
     * other place — and a dropped click id is unrecoverable.
     *
     * Written LAST so that the loop above cannot overwrite them: `utm` is typed
     * to allow click ids, and UTM_KEYS deliberately does not include them.
     */
    ...Object.fromEntries(
      CLICK_ID_KEYS.map((k) => [META[k], intake[k] ?? intake.utm?.[k]]),
    ),
  });

  const existing = await stripe.customers.list({ email, limit: 1 });
  const found = existing.data[0];

  if (found) {
    // Patch, don't replace. A returning student keeps the attribution from the
    // visit that first converted them, unless this visit supplied a new value.
    // Stage is untouched here: an active student re-booking an assessment must
    // not be demoted to `booked`.
    const updated = await stripe.customers.update(found.id, {
      name: intake.name,
      metadata: patch,
    });
    return toStudent(updated);
  }

  const created = await stripe.customers.create(
    {
      email,
      name: intake.name,
      metadata: { ...patch, [META.stage]: 'booked' satisfies FunnelStage },
    },
    opts.idempotencyKey ? { idempotencyKey: `customer:${opts.idempotencyKey}` } : undefined,
  );
  return toStudent(created);
}

/** Patch metadata on an existing student. Internal to this module's writers. */
async function patchStudent(
  id: string,
  entries: Record<string, string | number | null | undefined>,
  idempotencyKey?: string,
): Promise<Student> {
  const updated = await getStripe().customers.update(
    id,
    { metadata: meta(entries) },
    idempotencyKey ? { idempotencyKey } : undefined,
  );
  return toStudent(updated);
}

/** The assessment slot is confirmed (card captured). Records the slot time. */
export async function markAssessmentConfirmed(
  id: string,
  args: { bookingUid?: string; assessmentAt?: Date },
): Promise<Student> {
  return patchStudent(id, {
    [META.stage]: 'booked' satisfies FunnelStage,
    [META.bookingUid]: args.bookingUid,
    [META.assessmentAt]: args.assessmentAt?.toISOString(),
  });
}

/** A subscription now exists. Called from `customer.subscription.created`. */
export async function markPlanActive(
  id: string,
  args: { subscriptionId: string; lookupKey?: string | null; startedAt: Date },
): Promise<Student> {
  return patchStudent(
    id,
    {
      [META.stage]: 'active' satisfies FunnelStage,
      [META.subscriptionId]: args.subscriptionId,
      [META.planLookupKey]: args.lookupKey,
      [META.planStartedAt]: args.startedAt.toISOString(),
    },
    // Keyed on the subscription so a redelivered webhook is a no-op rather than
    // a second write that moves plan_started_at forward.
    `plan-active:${args.subscriptionId}`,
  );
}

/**
 * A subscription ended. Snapshots the month count at the moment of churn.
 *
 * The snapshot exists because retentionMonths() will keep returning the same
 * number afterwards, but a churn report wants "how long did this cohort last"
 * without N extra invoice-list calls. It is a cache of a derived value, and
 * retentionMonths() stays the authority if they ever disagree.
 */
export async function markChurned(
  id: string,
  args: { subscriptionId: string; endedAt: Date },
): Promise<{ student: Student; monthsRetained: number }> {
  const monthsRetained = await retentionMonths(id);
  const student = await patchStudent(
    id,
    {
      [META.stage]: 'churned' satisfies FunnelStage,
      [META.churnedAt]: args.endedAt.toISOString(),
      [META.monthsRetained]: monthsRetained,
    },
    `churn:${args.subscriptionId}`,
  );
  return { student, monthsRetained };
}

/**
 * Record a paid month and return how many they have now paid for.
 *
 * `first_paid_at` is written once and never overwritten: the review-request cron
 * counts three weeks from it, and letting a later invoice move it would keep
 * pushing the request out and it would never send.
 */
export async function recordPaidMonth(
  id: string,
  invoice: Stripe.Invoice,
): Promise<{ student: Student; monthsRetained: number }> {
  const paidAt = invoice.status_transitions?.paid_at ?? invoice.created;
  const paidIso = new Date(paidAt * 1000).toISOString();
  const before = await getStudent(id);

  const student = await patchStudent(
    id,
    {
      [META.lastPaidAt]: paidIso,
      ...(before.firstPaidAt ? {} : { [META.firstPaidAt]: paidIso }),
      // An invoice paid after a failed one means the student is back. Dunning
      // recovery is the common case here and it must not leave them marked
      // churned, or the review-request cron will skip them forever.
      ...(before.stage === 'churned' ? {} : { [META.stage]: 'active' satisfies FunnelStage }),
    },
    `paid:${invoice.id}`,
  );

  return { student, monthsRetained: await retentionMonths(id) };
}

/**
 * The one-shot conversions that must never be reported twice.
 *
 * Only the once-per-student-lifecycle events are listed. `pack_purchased` and
 * `retained_student` legitimately recur, and giving each occurrence its own
 * metadata key would march a long-standing student toward Stripe's 50-key limit.
 */
export type OneShotConversion = 'assessment_booked' | 'plan_started';

/**
 * Claim the right to report a conversion. Returns false if already reported.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS: GA4 CANNOT DEDUPLICATE
 * ---------------------------------------------------------------------------
 * The Measurement Protocol has no event id and no deduplication — send the same
 * conversion twice and GA4 records two, at double the value. Stripe delivers
 * webhooks at least once and the operator can replay any event from the
 * dashboard, so "twice" is not an edge case, it is Tuesday.
 *
 * Double-counting `assessment_booked` is specifically expensive: it is the
 * Primary conversion valued at ~$1,150, so a handful of replays inflates the
 * apparent return on the campaign and Smart Bidding raises bids against revenue
 * that never existed.
 *
 * The claim is stored on the Customer because that is where everything else
 * lives (see the header). It is read-then-write rather than atomic, which is
 * acceptable here: webhook redeliveries are minutes to hours apart, far outside
 * any plausible race window, and the failure mode of losing the race is one
 * duplicate — the same thing we would have had with no check at all.
 */
export async function claimConversion(
  id: string,
  event: OneShotConversion,
): Promise<boolean> {
  const key = `${META.conversionPrefix}${event}`;
  const customer = await getStripe().customers.retrieve(id);
  if (customer.deleted) return false;
  if (str(customer.metadata ?? {}, key)) return false;

  await getStripe().customers.update(
    id,
    { metadata: meta({ [key]: new Date().toISOString() }) },
    { idempotencyKey: `conv:${event}:${id}` },
  );
  return true;
}

/** Stamped by the cron so a student is never asked for a review twice. */
export async function markReviewRequested(id: string, at: Date = new Date()): Promise<Student> {
  return patchStudent(id, { [META.reviewRequestedAt]: at.toISOString() });
}

/* ------------------------------------------------------------------ */
/* Queries for the cron and the reporting scripts                      */
/* ------------------------------------------------------------------ */

/**
 * Active students who have not yet been asked for a Google review.
 *
 * Uses `customers.search`, the one Stripe read that can filter on metadata.
 * Its up-to-a-minute index lag is irrelevant here — this backs a once-a-day
 * cron, and a student who shows up in tomorrow's run instead of today's still
 * gets asked. It would NOT be acceptable in findOrCreateStudent, which is why
 * that one uses list.
 *
 * The `review_requested_at:null` clause is what makes the cron idempotent: once
 * markReviewRequested has run, the student drops out of this result set, so a
 * double-triggered cron cannot send twice.
 */
export async function studentsAwaitingReviewRequest(limit = 100): Promise<Student[]> {
  const query = `metadata["${META.stage}"]:"active" AND -metadata["${META.reviewRequestedAt}"]:null`;
  const result = await getStripe().customers.search({ query, limit: Math.min(limit, 100) });
  return result.data.map(toStudent);
}

/** Every student who ever reached a paying plan — the LTV reporting population. */
export async function payingStudents(limit = 100): Promise<Student[]> {
  const query = `metadata["${META.stage}"]:"active" OR metadata["${META.stage}"]:"churned"`;
  const result = await getStripe().customers.search({ query, limit: Math.min(limit, 100) });
  return result.data.map(toStudent);
}
