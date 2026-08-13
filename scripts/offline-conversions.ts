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
 *   npm run conversions:export -- --out ltv.csv # writes exports/ltv.csv, mode 0600
 *   npm run conversions:export -- --min-months 3
 *
 * ---------------------------------------------------------------------------
 * THE OUTPUT OF THIS SCRIPT IS PERSONAL DATA. TREAT IT LIKE IT.
 * ---------------------------------------------------------------------------
 * Every row pairs a Google click id — an advertising identifier tied to one
 * person, and personal data under GDPR and CCPA — with that person's true
 * lifetime value and the date they first paid. The file is not anonymous
 * aggregate reporting; it is a small, high-value list of identified customers.
 *
 * Three consequences are enforced below rather than left to the operator:
 *
 *   - `--out` writes ONLY inside EXPORT_DIR, which is gitignored. It used to take
 *     any path, so `--out .env` or `--out ../../something` silently clobbered.
 *   - the file is created with mode 0600 and `flag: 'wx'`, so it is not
 *     world-readable and an existing export is never silently overwritten.
 *   - the progress log names customer ids, never email addresses. Redirecting
 *     stderr to a file, or running this in CI, used to put real student emails
 *     and their LTV into a log.
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

import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, resolve, sep } from 'node:path';
import { isLiveMode } from '@/lib/stripe';
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

/**
 * The one directory this script may write to.
 *
 * Resolved from the process cwd, which for `npm run` is always the repo root.
 * `.gitignore` has an `exports/` rule, so an export cannot be picked up by a
 * careless `git add .` — which is the accident this constant exists to prevent,
 * because the file contains click ids and lifetime values for named customers.
 */
const EXPORT_DIR = resolve(process.cwd(), 'exports');

/**
 * Where `--out` is allowed to land.
 *
 * `writeFileSync(arg('out'), …)` used to take the value verbatim: `--out .env`
 * overwrote the committed env file, `--out ../../x` escaped the repo, and neither
 * produced a warning. So the argument is reduced to its BASENAME and re-rooted
 * inside EXPORT_DIR — `../../../etc/passwd` becomes `exports/passwd`, and there is
 * no string a caller can pass that resolves anywhere else. The containment check
 * after the join is belt-and-braces against a basename() edge case on a platform
 * this has not been run on.
 */
function resolveOutPath(raw: string): string {
  const name = basename(raw.trim());
  if (!name || name === '.' || name === '..') {
    throw new Error(`--out "${raw}" has no usable filename.`);
  }
  if (!name.toLowerCase().endsWith('.csv')) {
    throw new Error(`--out "${raw}" must name a .csv file (Google Ads rejects anything else).`);
  }

  const full = resolve(EXPORT_DIR, name);
  if (full !== EXPORT_DIR && !full.startsWith(EXPORT_DIR + sep)) {
    throw new Error(`--out "${raw}" resolves outside ${EXPORT_DIR}, which is not allowed.`);
  }
  return full;
}

/*
 * Resolved AT LOAD, before a single Stripe call. A bad --out must cost nothing:
 * this script reads every paying student's invoice history, which is minutes of
 * API calls, and discovering the output path was rejected at the end of that is
 * both slow and the kind of annoyance that gets a validation removed.
 */
const OUT_PATH = (() => {
  const raw = arg('out');
  if (!raw) return undefined;
  try {
    return resolveOutPath(raw);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error(`Exports are written inside ${EXPORT_DIR} and nowhere else — the file contains`);
    console.error('click ids and lifetime values for named customers, and that directory is gitignored.');
    process.exit(1);
  }
})();

/*
 * `Number(undefined)` is NaN, and so is `Number(arg('min-months'))` whenever the
 * flag is passed last or non-numerically — `--min-months` with nothing after it,
 * or `--min-months three`. Every comparison against NaN is false, so the
 * `months < MIN_MONTHS` retention gate below silently stopped filtering and
 * EVERY paying student was exported: over-disclosure, and a file that feeds Google
 * Ads exactly the one-month cohort this script's header argues against. Validated
 * rather than defaulted, because a typo'd flag must not look like it worked.
 */
const MIN_MONTHS = Number(arg('min-months') ?? DEFAULT_MIN_MONTHS);
if (!Number.isFinite(MIN_MONTHS) || MIN_MONTHS < 0) {
  console.error(
    `--min-months must be a non-negative number, got "${arg('min-months')}". ` +
      'Without a valid value the retention filter silently passes every student.',
  );
  process.exit(1);
}

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

/**
 * One CSV cell: RFC 4180 quoting, plus formula-injection neutralisation.
 *
 * ---------------------------------------------------------------------------
 * WHY THE LEADING-CHARACTER GUARD IS NOT PARANOIA HERE
 * ---------------------------------------------------------------------------
 * The first column of every row is `gclid`, and a gclid is not an internal id —
 * it is read off a VISITOR'S LANDING URL (`?gclid=…`), truncated to 200
 * characters with no charset validation, posted through the booking form, and
 * persisted to Stripe metadata. It is attacker-controlled end to end.
 *
 * Excel, LibreOffice and Google Sheets all interpret a cell beginning `=`, `+`,
 * `-` or `@` as a formula, and quoting does not stop them — `"=HYPERLINK(...)"`
 * still evaluates once the quotes are consumed by the CSV parser. So a visitor
 * who arrives at `?gclid==HYPERLINK("http://evil.example","ok")` gets that string
 * executed in the operator's spreadsheet the moment they open the export. A
 * leading apostrophe is the standard neutraliser: the spreadsheet treats the cell
 * as text, and Google Ads' upload parser is not a spreadsheet and never evaluated
 * formulas in the first place.
 *
 * `\t` and `\r` are in the same guard for a different reason: a tab or a carriage
 * return inside a value corrupts row framing on upload, which Google Ads reports
 * as a generically useless parse error rather than as a bad row.
 */
const CSV_FORMULA_PREFIX = /^[=+\-@\t\r]/;

const csvCell = (value: string): string => {
  const guarded = CSV_FORMULA_PREFIX.test(value) ? `'${value}` : value;
  // `\r` is in the quote trigger as well as the prefix guard: it can appear
  // anywhere in the value, not only at the start.
  return /[",\r\n]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
};

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
        // The customer id, NEVER the email address. This line is on stderr so
        // `2>logfile` or a CI capture would otherwise persist a real student's
        // address next to their lifetime value. A `cus_…` is enough to look the
        // record up in the Dashboard, which is the only reason to print anything.
        `  no gclid: ${student.id} (${months} months, ` +
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

  if (OUT_PATH) {
    mkdirSync(EXPORT_DIR, { recursive: true, mode: 0o700 });
    try {
      /*
       * `wx` = create, fail if it exists. An export is a dated snapshot of who
       * paid what; silently overwriting one destroys the record of what was
       * actually uploaded to Google Ads, which is the only way to reconstruct a
       * double-upload later. 0600 because the alternative on a shared or synced
       * machine is a world-readable list of customers and their LTV.
       */
      writeFileSync(OUT_PATH, `${csv}\n`, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
    } catch (error) {
      if ((error as { code?: string }).code === 'EEXIST') {
        throw new Error(
          `${OUT_PATH} already exists and will not be overwritten. Delete it, or pass a different ` +
            '--out name. Exports are deliberately append-only-by-hand: each one is a record of ' +
            'what was uploaded to Google Ads.',
        );
      }
      throw error;
    }
    log(`Wrote ${rows.length} row(s) to ${OUT_PATH} (mode 0600)`);
    log('That file contains click ids and lifetime values for named customers. It is gitignored;');
    log('delete it once the upload is confirmed rather than leaving it on disk.');
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
