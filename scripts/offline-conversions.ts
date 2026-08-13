/**
 * Export retained students to Google Ads Offline Conversion Import.
 *
 * ---------------------------------------------------------------------------
 * WRITTEN NOW. NOT USED UNTIL ~30 STUDENTS HAVE PASSED MONTH 3.
 * ---------------------------------------------------------------------------
 * Do not run this at launch and do not wire it into a cron. Google Ads needs
 * roughly 30 conversions in a 30-day window before Smart Bidding can learn
 * anything from a conversion action, and feeding it a handful of retention events
 * before then makes bidding worse, not better: it optimises hard toward the
 * accidental characteristics of four or five people.
 *
 * It exists now because it is the eventual answer to the problem the whole
 * measurement setup works around. Today the ad account bids on
 * `assessment_booked` valued at an ESTIMATE — LTV × an assumed 45% assessment-to-
 * plan rate (see ASSESSMENT_VALUE_USD in lib/pricing.ts). That estimate is the
 * best available guess and it is still a guess. This script replaces the guess
 * with what actually happened: money genuinely collected, per click, months later.
 * That is what finally makes bidding optimise for retention rather than volume —
 * which matters because breakeven is ~2 months and a cohort of cheap one-off
 * buyers loses money at any CPA.
 *
 * Usage:
 *   npm run conversions:export                  # CSV to stdout
 *   npm run conversions:export -- --out ltv.csv
 *   npm run conversions:export -- --min-months 3
 *
 * Then: Google Ads → Goals → Conversions → Uploads → upload the CSV.
 * The conversion action must already exist as an IMPORTED action named exactly
 * CONVERSION_NAME below, or every row is rejected.
 *
 * ---------------------------------------------------------------------------
 * THE PREREQUISITE THAT IS NOT YET MET: gclid
 * ---------------------------------------------------------------------------
 * Offline Conversion Import is keyed on the GOOGLE CLICK ID, not on a person.
 * There is no email-based alternative for this API — an upload without a gclid
 * cannot be matched to a click and is rejected outright.
 *
 * That means the ONLY way this script will ever produce usable output is if
 * `?gclid=` was captured and stored on the Stripe Customer at the moment the
 * student converted. That chain is now complete end to end: lib/analytics.ts
 * LATCHES gclid/gbraid/wbraid into sessionStorage alongside the UTMs (it did not,
 * originally — see the CLICK_ID_KEYS comment there), BookingForm and
 * components/coach/Purchase.tsx post them, and lib/students.ts persists them onto
 * the Customer.
 *
 * A gclid cannot be recovered later. Every day the latch was broken is a day of
 * attribution that cannot be reconstructed, and this script would keep printing
 * zero rows no matter how many students existed. That is why the report below
 * counts and names the missing ones loudly rather than silently skipping.
 *
 * ---------------------------------------------------------------------------
 * gbraid / wbraid NEED A SEPARATE UPLOAD, AND ARE NOT IN THIS CSV
 * ---------------------------------------------------------------------------
 * Google issues `gbraid` on iOS app-to-web campaigns and `wbraid` on web-to-app,
 * where App Tracking Transparency prevents a gclid. Google Ads accepts them as
 * Offline Conversion Import keys, but in their OWN columns ("GBRAID" / "WBRAID"),
 * and a single upload file may only use one identifier column.
 *
 * So they are stored and COUNTED here but deliberately not emitted: silently
 * putting a gbraid in the "Google Click ID" column would produce a file that
 * uploads without complaint and matches nothing. The count below tells the
 * operator whether a second upload is worth building; on a campaign set that is
 * Search-only (see marketing/campaigns.csv) it should be zero, and if it is not,
 * that is itself worth knowing.
 */

import { writeFileSync } from 'node:fs';
import { getStripe, isLiveMode } from '@/lib/stripe';
import { lifetimeValueCents, payingStudents, retentionMonths, firstPaidInvoice } from '@/lib/students';
import { formatUsd } from '@/lib/pricing';

/**
 * Must match the Google Ads conversion action name EXACTLY, including case.
 * Google matches on the string; a mismatch rejects the whole upload with a
 * singularly unhelpful error.
 */
const CONVERSION_NAME = 'retained_student';

/** Rows below this many paid months are excluded. See --min-months. */
const DEFAULT_MIN_MONTHS = 3;

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

const OUT = arg('out');
const MIN_MONTHS = Number(arg('min-months') ?? DEFAULT_MIN_MONTHS);

/**
 * Google Ads wants "yyyy-MM-dd HH:mm:ss+|-HH:mm". Not ISO 8601 — an ISO string
 * with a `T` and a `Z` is rejected, which is a tedious thing to discover from
 * their error message.
 */
function googleAdsTimestamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ` +
    `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}+00:00`
  );
}

/** Minimal RFC 4180 quoting. Values here are ids and numbers, but never assume. */
const csvCell = (value: string): string =>
  /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

async function main() {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('STRIPE_SECRET_KEY is not set. Put it in .env.local — NEVER in .env (committed).');
    process.exit(1);
  }

  const log = (text: string) => console.error(text); // stderr, so stdout stays pure CSV

  log(`Offline conversion export — ${isLiveMode() ? 'LIVE' : 'test'} account`);
  log(`Including students with at least ${MIN_MONTHS} paid month(s).`);
  log('');

  const students = await payingStudents();

  const rows: string[] = [];
  let skippedNoGclid = 0;
  /** Of those, how many have a gbraid/wbraid instead — i.e. an iOS ad click. */
  let skippedBraidOnly = 0;
  let skippedTooEarly = 0;
  let skippedNoPayment = 0;
  let totalCents = 0;

  for (const student of students) {
    const months = await retentionMonths(student.id);
    if (months < MIN_MONTHS) {
      skippedTooEarly += 1;
      continue;
    }

    if (!student.gclid) {
      skippedNoGclid += 1;
      const braid = student.gbraid ?? student.wbraid;
      if (braid) skippedBraidOnly += 1;
      log(
        `  no gclid: ${student.email ?? student.id} (${months} months, ` +
          `${formatUsd(await lifetimeValueCents(student.id))}) — ` +
          (braid
            ? 'has a gbraid/wbraid, so this one IS attributable but needs the separate ' +
              'GBRAID/WBRAID upload (see the header)'
            : 'unattributable, permanently'),
      );
      continue;
    }

    const firstPaid = await firstPaidInvoice(student.id);
    if (!firstPaid) {
      skippedNoPayment += 1;
      continue;
    }

    /*
     * TRUE LTV: every dollar actually collected, packs and single lessons
     * included. Not the monthly rate, and not the modelled LTV estimate — the
     * entire point of this export is to replace estimates with what the bank saw.
     */
    const valueCents = await lifetimeValueCents(student.id);
    totalCents += valueCents;

    /*
     * Conversion time is the FIRST PAID INVOICE, not today.
     *
     * Google attributes an offline conversion to the click that preceded the
     * conversion time, so stamping "now" would attribute months of retention to
     * whatever click happened most recently — or to none, if the click is outside
     * the lookback window. The first payment is the moment the student became
     * worth something, so it is the honest timestamp.
     */
    const conversionTime = new Date((firstPaid.status_transitions?.paid_at ?? firstPaid.created) * 1000);

    rows.push(
      [
        student.gclid,
        CONVERSION_NAME,
        googleAdsTimestamp(conversionTime),
        (valueCents / 100).toFixed(2),
        'USD',
      ]
        .map(csvCell)
        .join(','),
    );
  }

  /*
   * The "Parameters:" preamble is required by Google Ads' upload parser and the
   * timezone declaration must agree with the offsets in the rows. Omit it and the
   * upload is rejected; get the timezone wrong and every conversion lands hours
   * off, silently reattributed.
   */
  const csv = [
    'Parameters:TimeZone=+0000',
    'Google Click ID,Conversion Name,Conversion Time,Conversion Value,Conversion Currency',
    ...rows,
  ].join('\n');

  if (OUT) {
    writeFileSync(OUT, `${csv}\n`, 'utf8');
    log(`Wrote ${rows.length} row(s) to ${OUT}`);
  } else {
    console.log(csv);
  }

  log('');
  log(`students considered   ${students.length}`);
  log(`rows exported         ${rows.length}`);
  log(`total value           ${formatUsd(totalCents)}`);
  log(`skipped, < ${MIN_MONTHS} months  ${skippedTooEarly}`);
  log(`skipped, never paid   ${skippedNoPayment}`);
  log(`skipped, NO GCLID     ${skippedNoGclid}`);
  log(`  of those, gbraid/wbraid only  ${skippedBraidOnly}  (needs a separate upload)`);

  if (rows.length < 30) {
    log('');
    log(`Only ${rows.length} row(s). DO NOT UPLOAD YET.`);
    log('Google Ads needs ~30 conversions in a 30-day window before Smart Bidding can learn from a');
    log('conversion action. Below that it over-fits to a handful of people and bids worse than the');
    log('current estimate-based setup does. Keep bidding on assessment_booked until this clears 30.');
  }

  if (skippedNoGclid > 0) {
    log('');
    log(`${skippedNoGclid} paying student(s) have NO STORED GCLID and can never be uploaded.`);
    log('Offline Conversion Import is keyed on the Google click id and there is no email-based');
    log('fallback, so these are permanently unattributable — a gclid cannot be recovered after the');
    log('fact. If this count is large, the booking form is not capturing ?gclid= and latching it the');
    log('way it latches UTMs. Fix that first; every day it is broken costs another day of');
    log('attribution that cannot be reconstructed.');
  }
}

main().catch((error) => {
  console.error('');
  console.error('EXPORT FAILED:', error instanceof Error ? error.message : error);
  process.exit(1);
});
