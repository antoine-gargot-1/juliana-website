import {
  CALCOM_MAX_DELIVERY_AGE_MS,
  checkDeliveryFreshness,
  modeFromEventTypeId,
  parseWebhook,
  verifyCalcomSignature,
} from '@/lib/calcom';
import { getStripe } from '@/lib/stripe';
import { markAssessmentConfirmed, toStudent } from '@/lib/students';
import { operatorAlertEmail, send } from '@/lib/email';
import { modeLabel } from '@/lib/pricing';

/**
 * Cal.com webhooks — the durable record of which slot was taken.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS WHEN THE HOLD PAGE ALREADY READS THE BOOKING
 * ---------------------------------------------------------------------------
 * /coach/book/hold fetches the booking from the Cal.com REST API the moment the
 * student is redirected, because a webhook cannot be waited on at that step (see
 * the header of lib/calcom.ts). So this endpoint is not on the critical path.
 *
 * It is still the authoritative record, and it catches the case the redirect
 * cannot: a student who books a slot and then abandons Stripe Checkout. Cal.com
 * has given away the slot; Stripe has no card and no customer. Nothing else in
 * the system would ever notice. That is precisely the no-show this mechanic
 * exists to prevent, so it is worth an email to the teacher.
 *
 * ---------------------------------------------------------------------------
 * WHY NO CUSTOMER IS CREATED HERE
 * ---------------------------------------------------------------------------
 * Tempting, since the webhook may arrive before the hold page finishes — but a
 * Customer created from this payload would be missing the two things that make
 * the record useful: the GA4 client id and the latched UTMs, neither of which
 * Cal.com has ever seen. And `mode` can only be inferred here, from an event type
 * id mapping, whereas our own form has it stated explicitly.
 *
 * So this handler patches an EXISTING student and otherwise only reports. The
 * hold page owns creation, with the full context. Whichever arrives second
 * completes the record.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Make a value safe to interpolate into a log line (CWE-117).
 *
 * A newline inside a logged value lets its author forge whole log entries in
 * Vercel's stream — fabricating a plausible-looking record, or pushing a real one
 * out of view during an incident review. Values reaching this handler are inside a
 * signature-verified body, so forging one needs CALCOM_WEBHOOK_SECRET, but the
 * cost of being right about that is one function call and the cost of being wrong
 * is an audit trail nobody can trust.
 *
 * Truncated as well as escaped: a booking uid is ~20 characters, so anything
 * longer is either a Cal.com change or an attempt to flood the log.
 */
const logSafe = (value: string | null | undefined): string =>
  value === null || value === undefined
    ? 'unknown'
    : JSON.stringify(value.slice(0, 120).replace(/[\x00-\x1f\x7f]/g, ' '));

export async function POST(request: Request): Promise<Response> {
  // THE RAW BODY, read before anything parses it. A JSON round-trip reorders
  // keys and breaks the HMAC — see verifyCalcomSignature.
  const rawBody = await request.text();

  const verified = verifyCalcomSignature(rawBody, request.headers);
  if (!verified.ok) {
    if (verified.reason === 'no_secret') {
      // 500 so Cal.com retries: the events are not lost, they arrive once the
      // secret is configured. Fails closed either way — nothing is processed.
      console.error(
        '[calcom-webhook] CALCOM_WEBHOOK_SECRET is not set, so this webhook cannot be verified and ' +
          'was rejected. The secret is shown when the webhook subscription is created in Cal.com → ' +
          'Settings → Developer → Webhooks. Put it in .env.local and in Vercel encrypted env. ' +
          'NEVER in .env — that file is committed.',
      );
      return new Response('webhook secret not configured', { status: 500 });
    }
    console.warn(`[calcom-webhook] rejected: ${verified.reason}`);
    return new Response(`signature ${verified.reason}`, { status: 401 });
  }

  const event = parseWebhook(rawBody);
  if (!event) return new Response('unparseable body', { status: 400 });

  /*
   * REPLAY WINDOW. The signature has no timestamp in it — see
   * checkDeliveryFreshness in lib/calcom.ts for what this does and does not
   * achieve, including what stays unprotected without a nonce store.
   *
   * 200 rather than 401 on a refusal, for the same reason the Stripe handler
   * acknowledges a mode mismatch: a stale delivery is stale on every retry, so a
   * non-2xx would burn Cal.com's retry budget and eventually get this endpoint
   * disabled — losing every future booking record to defend against a replay of
   * an idempotent metadata patch.
   */
  const fresh = checkDeliveryFreshness(event.createdAt);
  if (!fresh.ok) {
    console.warn(
      `[calcom-webhook] REFUSED ${logSafe(event.triggerEvent)} for booking ${logSafe(event.booking.uid)}: ` +
        `payload createdAt is ${Math.round(fresh.ageMs / 1000)}s old (limit ` +
        `${CALCOM_MAX_DELIVERY_AGE_MS / 1000}s, reason ${fresh.reason}). Either a captured delivery is ` +
        'being replayed, or this server and Cal.com disagree about the time.',
    );
    return Response.json({ received: true, handled: false, reason: `delivery_${fresh.reason}` });
  }
  if (fresh.unverifiable) {
    console.warn(
      '[calcom-webhook] this delivery carried no usable createdAt, so its age could not be checked ' +
        'and replay protection did not apply to it. Accepted deliberately — see ' +
        'checkDeliveryFreshness in lib/calcom.ts.',
    );
  }

  // Acknowledged rather than refused. Cal.com subscriptions are per-trigger but
  // an operator can add triggers in the dashboard at any time, and returning
  // non-2xx for those would show as failed deliveries.
  if (event.triggerEvent !== 'BOOKING_CREATED') {
    return Response.json({ received: true, handled: false, trigger: event.triggerEvent });
  }

  const { booking } = event;

  try {
    await onBookingCreated(booking);
  } catch (error) {
    // Same reasoning as the Stripe handler: acknowledge, log loudly. A retry
    // would only repeat whatever already succeeded.
    console.error(`[calcom-webhook] BOOKING_CREATED ${logSafe(booking.uid)} handling failed:`, error);
  }

  return Response.json({ received: true, handled: true, uid: booking.uid });
}

async function onBookingCreated(booking: {
  uid: string;
  start: Date | null;
  attendeeEmail: string | null;
  attendeeName: string | null;
  attendeeTimeZone: string | null;
  eventTypeId: number | null;
}): Promise<void> {
  const inferredMode = modeFromEventTypeId(booking.eventTypeId);

  /*
   * NO EMAIL ADDRESS IN THIS LINE. It used to log `email=<attendee>` on every
   * single booking, which accumulated students' addresses in Vercel's log
   * retention — readable by anyone with project access, for no debugging benefit
   * the uid does not already provide. The uid resolves the whole booking in
   * Cal.com and the whole customer in Stripe (it is stored as `booking_uid`
   * metadata), so it is the strictly better identifier as well as the safer one.
   *
   * `hasEmail` is kept because "did this payload carry an attendee address at
   * all" is the one thing about the email that matters when a booking fails to
   * match a student, and it says nothing about who the student is.
   */
  console.log(
    `[calcom-webhook] BOOKING_CREATED uid=${logSafe(booking.uid)} ` +
      `start=${booking.start?.toISOString() ?? 'unknown'} ` +
      `hasEmail=${Boolean(booking.attendeeEmail)} ` +
      `eventType=${booking.eventTypeId ?? 'unknown'} ` +
      `mode=${inferredMode ?? 'unmapped'}`,
  );

  if (!booking.attendeeEmail) {
    console.warn(
      `[calcom-webhook] booking ${logSafe(booking.uid)} has no attendee email; cannot match a student.`,
    );
    return;
  }

  // Exact-match list, not search: search lags by up to a minute and this webhook
  // routinely arrives within seconds of the customer being created.
  const existing = await getStripe().customers.list({ email: booking.attendeeEmail, limit: 1 });
  const found = existing.data[0];

  if (!found) {
    /*
     * No Stripe customer for this email. Two possibilities, and they need
     * different responses from a human:
     *
     *   1. The webhook simply beat the hold page. Normal, self-resolving — the
     *      hold page creates the customer with the booking uid a moment later.
     *   2. The student booked and never completed the $0 card hold. The slot is
     *      gone and there is no card behind it.
     *
     * They are indistinguishable at this instant, so this logs rather than
     * alerting. The operator's actual signal for case 2 is the absence of a
     * confirmation email, and Cal.com's own calendar entry.
     */
    console.warn(
      `[calcom-webhook] no Stripe customer yet for booking ${logSafe(booking.uid)}. Either the webhook ` +
        'beat /coach/book/hold (normal, resolves itself) or the student abandoned the card hold — in ' +
        'which case the slot is reserved with no card behind it. Open that uid in Cal.com to see ' +
        'whose it is; the address is deliberately not logged. Check Cal.com against Stripe if no ' +
        'confirmation email went out.',
    );
    return;
  }

  const student = toStudent(found);

  await markAssessmentConfirmed(student.id, {
    bookingUid: booking.uid,
    assessmentAt: booking.start ?? undefined,
  });

  /*
   * Cross-check, not correction. Our own form asked the student which mode they
   * wanted and that answer is what they are priced against, so a mismatch is
   * never silently "fixed" here. It does mean the Cal.com event type mapping or
   * the form is wrong, which is worth a human looking — an in-person student on
   * an online event type would be scheduled on days the teacher is not set up
   * for in-person lessons.
   */
  if (inferredMode && student.mode && inferredMode !== student.mode) {
    await send(
      operatorAlertEmail({
        subject: `Booking mode mismatch — ${student.email ?? student.id}`,
        lines: [
          `Cal.com booking ${booking.uid} is on an event type mapped to ${modeLabel(inferredMode)},`,
          `but the student chose ${modeLabel(student.mode)} on the booking form.`,
          '',
          'Nothing was changed automatically — the form answer is what they are priced against.',
          'Check CALCOM_EVENT_TYPE_ID_ONLINE / _INPERSON, and confirm which the student meant.',
        ],
      }),
      { idempotencyKey: `mode-mismatch:${booking.uid}` },
    );
  }
}
