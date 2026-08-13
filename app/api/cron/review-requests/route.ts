import { timingSafeEqual } from 'node:crypto';
import {
  firstPaidInvoice,
  markReviewRequested,
  studentsAwaitingReviewRequest,
  type Student,
} from '@/lib/students';
import { operatorAlertEmail, reviewRequestEmail, send } from '@/lib/email';
import { stripeConfigured } from '@/lib/stripe';

/**
 * Daily cron: ask month-old students for a Google review.
 *
 * ---------------------------------------------------------------------------
 * WHY A CRON JOB EXISTS FOR THIS AT ALL
 * ---------------------------------------------------------------------------
 * Review count and recency are the dominant ranking factors for a local service
 * business — ahead of anything on the website. A voice teacher with 25 reviews
 * outranks one with 3 for "voice lessons near me" almost regardless of what
 * either site says, which makes this the highest-leverage SEO work in the whole
 * project and it is not a page, a tag or a schema block.
 *
 * It has to be automatic because it is exactly the task a busy teacher never
 * does. Asking by hand means asking the students you happen to remember, which
 * in practice means asking almost none.
 *
 * ---------------------------------------------------------------------------
 * THE SCHEDULE, WHICH vercel.json CANNOT EXPLAIN (JSON HAS NO COMMENTS)
 * ---------------------------------------------------------------------------
 * `0 17 * * *` — daily at 17:00 UTC, which is 09:00 PT in winter and 10:00 PT in
 * summer. Vercel schedules in UTC and does not shift for daylight saving, so that
 * one-hour seasonal drift is accepted rather than worked around; what matters is
 * that it lands mid-morning rather than at 3am.
 *
 * Daily rather than weekly because this route decides for itself who is due and
 * stamps each student so nobody is asked twice. A weekly schedule would only add
 * up to six days of delay to every ask.
 *
 * Do not add a `_comment` key to the cron entry in vercel.json to say any of
 * this: Vercel validates that file strictly and rejects unknown properties, so it
 * would fail the deploy.
 *
 * ---------------------------------------------------------------------------
 * WHY THREE WEEKS AFTER THE FIRST PAID MONTH
 * ---------------------------------------------------------------------------
 * Early enough that the initial enthusiasm is intact; late enough that there is
 * real progress to describe, which is what makes a review specific instead of
 * "she's great". It is also after the second invoice has cleared, so nobody is
 * asked to vouch for a service they have already quietly decided to leave.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Ask no earlier than this many days after the first paid invoice. */
const MIN_DAYS = 21;

/**
 * And no later than this.
 *
 * An upper bound exists so that turning this cron on for the first time, or
 * fixing it after an outage, does not email every student who ever paid — a
 * sudden burst of review requests to long-standing students reads as a mailing
 * list, and a burst of reviews arriving on the same day looks bought to Google.
 * Anyone outside the window is marked as requested and skipped silently.
 */
const MAX_DAYS = 60;

const DAY_MS = 86_400_000;

export async function GET(request: Request): Promise<Response> {
  const authorised = authorise(request);
  if (!authorised.ok) {
    // 401 with no detail. This endpoint sends email on behalf of the business, so
    // an unauthenticated caller learns nothing about why it was refused.
    console.warn(`[cron:review-requests] refused: ${authorised.reason}`);
    return new Response('unauthorized', { status: 401 });
  }

  if (!stripeConfigured()) {
    console.warn('[cron:review-requests] STRIPE_SECRET_KEY not set; nothing to query.');
    return Response.json({ ok: true, skipped: 'stripe not configured' });
  }

  const reviewUrl = process.env.GOOGLE_REVIEW_URL;
  if (!reviewUrl) {
    // A no-op rather than a failure. The link is the entire content of the email,
    // and sending one without it would burn the single best moment to ask.
    console.warn(
      '[cron:review-requests] GOOGLE_REVIEW_URL is not set, so no requests were sent. Get the ' +
        'short link from Google Business Profile → Ask for reviews, and set it in Vercel env. ' +
        'Until then this cron does nothing every day.',
    );
    return Response.json({ ok: true, skipped: 'GOOGLE_REVIEW_URL not set' });
  }

  const candidates = await studentsAwaitingReviewRequest();
  const result = { considered: candidates.length, sent: 0, tooEarly: 0, tooLate: 0, noPayment: 0 };

  for (const student of candidates) {
    try {
      await consider(student, reviewUrl, result);
    } catch (error) {
      console.error(`[cron:review-requests] ${student.id} failed:`, error);
    }
  }

  console.log(
    `[cron:review-requests] considered ${result.considered}, sent ${result.sent}, ` +
      `too early ${result.tooEarly}, outside window ${result.tooLate}, no paid invoice ${result.noPayment}`,
  );

  if (result.sent > 0) {
    await send(
      operatorAlertEmail({
        subject: `${result.sent} review request(s) sent`,
        lines: [
          `${result.sent} student(s) were asked for a Google review today.`,
          '',
          'Reviews are the strongest local ranking signal there is, so this is worth watching:',
          'if requests go out and reviews do not arrive, the ask is landing at the wrong moment or ',
          'the Google link is broken. Reply to a student personally rather than sending twice.',
        ],
      }),
      { idempotencyKey: `review-batch:${new Date().toISOString().slice(0, 10)}` },
    );
  }

  return Response.json({ ok: true, ...result });
}

async function consider(
  student: Student,
  reviewUrl: string,
  result: { sent: number; tooEarly: number; tooLate: number; noPayment: number },
): Promise<void> {
  const invoice = await firstPaidInvoice(student.id);
  if (!invoice) {
    // Marked `active` but has never actually paid — normally a plan whose first
    // invoice has not come due yet, which is the common state for the whole first
    // week of every student.
    result.noPayment += 1;
    return;
  }

  const paidAt = (invoice.status_transitions?.paid_at ?? invoice.created) * 1000;
  const days = Math.floor((Date.now() - paidAt) / DAY_MS);

  if (days < MIN_DAYS) {
    result.tooEarly += 1;
    return;
  }

  if (days > MAX_DAYS) {
    // Stamped so they leave the candidate set permanently. Without this, every
    // long-standing student would be re-examined on every run forever.
    result.tooLate += 1;
    await markReviewRequested(student.id);
    return;
  }

  if (!student.email) return;

  const sent = await send(
    reviewRequestEmail({ to: student.email, name: student.name, reviewUrl }),
    { idempotencyKey: `review-request:${student.id}` },
  );

  /*
   * Only stamp on a confirmed send. Stamping first would be safer against
   * duplicates but would silently drop the request whenever the mail provider had
   * a bad minute, and the student would never be asked again. Duplicates are also
   * already guarded twice over: the Resend idempotency key above, and this
   * student dropping out of studentsAwaitingReviewRequest() once stamped.
   */
  if (sent.sent) {
    await markReviewRequested(student.id);
    result.sent += 1;
  }
}

/* ------------------------------------------------------------------ */
/* Authorisation                                                       */
/* ------------------------------------------------------------------ */

/**
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET` when CRON_SECRET is set
 * on the project. That is the entire authentication story for this endpoint, and
 * it needs to hold up: the URL is guessable, and an unauthenticated caller could
 * otherwise trigger review-request emails to students at will.
 *
 * FAILS CLOSED. With no CRON_SECRET set the endpoint refuses everything,
 * including Vercel's own scheduler. The alternative — running unauthenticated
 * when unconfigured — would mean a forgotten env var silently leaves an
 * email-sending endpoint open on the public internet.
 */
function authorise(request: Request): { ok: true } | { ok: false; reason: string } {
  const secret = process.env.CRON_SECRET ?? '';
  if (secret.length === 0) {
    return {
      ok: false,
      reason:
        'CRON_SECRET is not set. Generate one with `openssl rand -base64 32`, add it to Vercel ' +
        'encrypted env, and redeploy — Vercel Cron reads it at invocation time and sends it as a ' +
        'bearer token. NEVER put it in .env, which is committed.',
    };
  }

  const header = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${secret}`;

  // Constant-time, length-checked first: timingSafeEqual throws on a length
  // mismatch rather than returning false, and `===` would leak how much of a
  // guess was correct through timing.
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: 'bad or missing authorization header' };
  }
  return { ok: true };
}
