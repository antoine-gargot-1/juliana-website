/**
 * Convert a student from a free assessment onto a paying monthly plan.
 *
 * ---------------------------------------------------------------------------
 * THE TEACHER-DRIVEN HALF OF THE CONVERSION. THE OTHER HALF IS A LINK.
 * ---------------------------------------------------------------------------
 * There are exactly two ways a plan starts, and neither needs an admin UI or a
 * login — which is the reason this project has no auth system at all:
 *
 *   Student self-serve   a signed expiring link emailed after the assessment
 *                        (lib/booking-token.ts), clicked once. The
 *                        higher-converting path, because it is one click at the
 *                        moment the student has just decided.
 *   Teacher              this script, run locally against the live key, for the
 *                        student who says yes on the call and would rather not
 *                        deal with an email.
 *
 * Both end up in startPlan() in lib/booking.ts, so the billing behaviour —
 * including the mandatory `proration_behavior: 'none'` — cannot diverge between
 * them.
 *
 * Usage:
 *   npm run plan:start -- --email student@example.com --plan online_monthly_60
 *   npm run plan:start -- --customer cus_123 --plan inperson_monthly_30
 *   npm run plan:start -- --email … --plan … --assessment 2026-08-20T18:00:00Z
 *   npm run plan:start -- --email … --plan … --link      # email the link instead
 *   npm run plan:start -- --email … --plan … --dry-run
 *
 * `--assessment` defaults to the assessment date stored on the customer at
 * booking time, which is almost always what you want — billing anchors 7 days
 * after it.
 */

import { formatUsd, lookup, modeLabel, type LessonMode } from '@/lib/pricing';
import { getStripe, isLiveMode } from '@/lib/stripe';
import { FIRST_CHARGE_OFFSET_DAYS, planSummary, startPlan } from '@/lib/booking';
import { getStudent, toStudent, type Student } from '@/lib/students';
import { planLinkUrl } from '@/lib/booking-token';
import { planLinkEmail, send } from '@/lib/email';
import { SITE_URL } from '@/lib/site';

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}
const flag = (name: string) => process.argv.includes(`--${name}`);

const DRY_RUN = flag('dry-run');
const EMAIL_LINK = flag('link');

function usage(message: string): never {
  console.error(`${message}\n`);
  console.error('Usage:');
  console.error('  npm run plan:start -- --email <address> --plan <lookup_key> [options]');
  console.error('  npm run plan:start -- --customer <cus_id> --plan <lookup_key> [options]');
  console.error('');
  console.error('Options:');
  console.error('  --assessment <ISO>  Override the stored assessment datetime.');
  console.error('  --link              Email a signed one-click link instead of starting the plan.');
  console.error('  --dry-run           Print what would happen. No Stripe writes, no email.');
  console.error('');
  console.error('Monthly plans available:');
  for (const key of ['online_monthly_60', 'online_monthly_30', 'inperson_monthly_60', 'inperson_monthly_30']) {
    const price = lookup(key);
    console.error(`  ${key.padEnd(22)} ${formatUsd(price.amountCents)}/mo  ${modeLabel(price.mode)}`);
  }
  process.exit(1);
}

/** Exact-match lookup, not search: search lags and this is interactive. */
async function findStudent(): Promise<Student> {
  const customerId = arg('customer');
  if (customerId) return getStudent(customerId);

  const email = arg('email');
  if (!email) usage('Need either --email or --customer.');

  const found = await getStripe().customers.list({ email: email.trim().toLowerCase(), limit: 2 });
  if (found.data.length === 0) {
    usage(
      `No Stripe customer with email "${email}".\n` +
        '  A customer is created when the booking form posts, so this means they never reached the\n' +
        '  card-hold step — or you are pointed at the wrong account (test vs live).',
    );
  }
  if (found.data.length > 1) {
    // Reported rather than guessed. Picking one at random risks starting a plan
    // against a customer with no payment method while the other has the card.
    console.error(`More than one customer has email "${email}":`);
    for (const customer of found.data) console.error(`  ${customer.id}  created ${new Date(customer.created * 1000).toISOString()}`);
    usage('Re-run with --customer <cus_id> to say which.');
  }
  return toStudent(found.data[0]!);
}

async function main() {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('STRIPE_SECRET_KEY is not set. Put it in .env.local — NEVER in .env (committed).');
    process.exit(1);
  }

  const lookupKey = arg('plan');
  if (!lookupKey) usage('Need --plan <lookup_key>.');

  // Throws with the list of valid keys if this is a typo, before any network call.
  const catalogPrice = lookup(lookupKey);
  if (catalogPrice.type !== 'monthly') {
    usage(
      `"${lookupKey}" is a ${catalogPrice.type}, not a monthly plan. Packs and single lessons are ` +
        'one-off purchases and go through Checkout, not a Subscription.',
    );
  }

  const student = await findStudent();

  const assessmentOverride = arg('assessment');
  const assessmentAt = assessmentOverride ? new Date(assessmentOverride) : student.assessmentAt;
  if (!assessmentAt || Number.isNaN(assessmentAt.getTime())) {
    usage(
      'No assessment datetime available.\n' +
        `  Customer ${student.id} has no assessment_at stored, and --assessment was not given.\n` +
        '  Billing anchors 7 days after the assessment, so this cannot be guessed — pass\n' +
        '  --assessment 2026-08-20T18:00:00Z (ISO 8601).',
    );
  }

  const anchor = new Date(assessmentAt.getTime() + FIRST_CHARGE_OFFSET_DAYS * 86_400_000);

  console.log(`Mode          ${isLiveMode() ? '*** LIVE ***' : 'test'}${DRY_RUN ? ' — DRY RUN' : ''}`);
  console.log(`Student       ${student.name ?? '(no name)'} <${student.email ?? 'no email'}>`);
  console.log(`Customer      ${student.id}`);
  console.log(`Stage         ${student.stage}`);
  console.log(`Stored mode   ${student.mode ?? '(none)'}`);
  console.log(`Plan          ${planSummary(lookupKey)}`);
  console.log(`Assessment    ${assessmentAt.toISOString()}${assessmentOverride ? ' (from --assessment)' : ' (stored)'}`);
  console.log(`First charge  ${anchor.toISOString()}${anchor <= new Date() ? ' — IN THE PAST, billing will start immediately' : ''}`);
  console.log('');

  /*
   * A mode mismatch is a warning, not a block. The teacher may legitimately be
   * moving a student from online to in-person. But it is worth saying out loud,
   * because the two rate cards differ by ~29% and starting the wrong one is a
   * conversation with a paying customer, not a quiet data error.
   */
  if (student.mode && student.mode !== catalogPrice.mode) {
    console.log(
      `WARNING: this student booked as ${modeLabel(student.mode)} but you are starting a ` +
        `${modeLabel(catalogPrice.mode as LessonMode)} plan. Continuing — but confirm that is intended.`,
    );
    console.log('');
  }

  if (student.stage === 'active') {
    console.log(
      'WARNING: this student is already marked active' +
        (student.planLookupKey ? ` on "${student.planLookupKey}"` : '') +
        '. startPlan is idempotent per (customer, plan) so re-running the SAME plan is safe, but a ' +
        'DIFFERENT plan would create a second subscription and bill them twice a month.',
    );
    console.log('');
  }

  if (EMAIL_LINK) {
    if (!student.email) usage(`Customer ${student.id} has no email, so no link can be sent.`);

    const url = planLinkUrl(process.env.NEXT_PUBLIC_SITE_URL ?? SITE_URL, {
      customerId: student.id,
      mode: catalogPrice.mode,
      assessmentAt,
    });

    console.log('Signed plan link (expires in 21 days):');
    console.log(`  ${url}`);
    console.log('');

    if (DRY_RUN) {
      console.log('DRY RUN — no email sent.');
      return;
    }

    const result = await send(planLinkEmail({
      to: student.email,
      name: student.name,
      mode: catalogPrice.mode,
      planLinkUrl: url,
    }));
    console.log(result.sent ? `Emailed ${student.email} (id ${result.id})` : `NOT SENT: ${result.error}`);
    return;
  }

  if (DRY_RUN) {
    console.log('DRY RUN — no subscription created.');
    console.log('The real run creates it with proration_behavior:"none" so no prorated invoice is');
    console.log('issued on day zero. See the warning on startPlan() in lib/booking.ts.');
    return;
  }

  const started = await startPlan({ customerId: student.id, lookupKey, assessmentAt });

  console.log(`Subscription  ${started.subscription.id}  [${started.subscription.status}]`);
  console.log(`First charge  ${started.firstChargeAt.toISOString()}`);
  if (started.anchoredImmediately) {
    console.log(
      '              NOTE: the assessment + 7 days anchor was already in the past, so billing ' +
        'starts now. Stripe rejects a past anchor, and failing the conversion would have been worse.',
    );
  }

  /*
   * The check that matters. `proration_behavior: 'none'` is what stops Stripe
   * issuing an immediate prorated invoice for the now-to-anchor gap, and its
   * failure mode is silent — money simply moves on the wrong day. So the amount
   * is printed rather than assumed.
   */
  const invoice = started.subscription.latest_invoice;
  if (invoice && typeof invoice !== 'string') {
    const amount = invoice.amount_due;
    console.log(`Latest invoice ${invoice.id} amount_due=${formatUsd(amount)} status=${invoice.status}`);
    if (amount > 0 && !started.anchoredImmediately) {
      console.log('');
      console.log('*** SOMETHING IS WRONG ***');
      console.log('An invoice with a non-zero amount exists already, but the first charge is meant to');
      console.log('be in the future. That is exactly what proration_behavior:"none" is supposed to');
      console.log('prevent, so check that flag in lib/booking.ts before anyone else runs this.');
      process.exitCode = 1;
    } else {
      console.log('Confirmed: no charge today. The prorated first invoice was correctly suppressed.');
    }
  } else {
    console.log('No invoice on the subscription yet — expected when billing is anchored in the future.');
  }
}

main().catch((error) => {
  console.error('');
  console.error('START PLAN FAILED:', error instanceof Error ? error.message : error);
  process.exit(1);
});
