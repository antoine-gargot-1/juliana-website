import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Reveal } from '@/components/Reveal';
import { ASSESSMENT_CARD_COPY } from '@/components/coach/PriceGrid';
import { createAssessmentHold } from '@/lib/booking';
import {
  bookingValue,
  calcomConfigured,
  getBooking,
  modeFromEventTypeId,
  type CalBooking,
} from '@/lib/calcom';
import { ASSESSMENT, type LessonMode } from '@/lib/pricing';
import { stripeConfigured } from '@/lib/stripe';
import { EMAIL } from '@/lib/site';
import { pageMeta } from '@/lib/seo';

/**
 * noindex: a transient step in a booking flow that only means anything with a
 * Cal.com booking reference attached. An indexed copy would rank for nothing and
 * would attract crawlers into a route that opens Stripe Checkout sessions.
 */
export const metadata: Metadata = pageMeta({
  title: 'Holding your slot',
  description: 'Reserving your free vocal assessment.',
  path: '/coach/book/hold',
  noindex: true,
});

/**
 * ===========================================================================
 * WHY THIS ROUTE EXISTS AT ALL
 * ===========================================================================
 * Cal.com redirects here the instant a slot is chosen, and it separately sends a
 * BOOKING_CREATED webhook. The redirect regularly wins that race. If card
 * capture waited on the webhook, the student would sit watching a spinner for
 * however long delivery took — and on a retry, indefinitely.
 *
 * So this route waits for nothing. It takes the booking reference out of the
 * redirect URL, reads the booking from the Cal.com API itself, creates the
 * Stripe Customer (stamped with mode, goals, the GA4 client_id and the UTMs that
 * BookingForm pushed through Cal.com), opens a mode:'setup' Checkout Session for
 * the $0 hold, and sends the browser straight there. The webhook stays the
 * authoritative record of the slot; it is simply off the critical path of the
 * thing a human is waiting on.
 *
 * Everything here is idempotent on the Cal.com booking uid (see
 * createAssessmentHold), so a double-tap, a back-then-forward, or Cal.com
 * replaying its redirect cannot produce two customers or two card holds for one
 * slot. That is what makes it safe for this page to act on a GET.
 *
 * FAILURE POSTURE. Every branch that cannot reach Stripe still tells the student
 * the truth: their slot is booked. A booking that got this far is a real entry on
 * a real calendar, and the one thing this page must never do is imply otherwise
 * because a billing integration was mid-deployment.
 */

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const first = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value) ?? '';

/**
 * One value, from whichever channel carried it.
 *
 * ORDER: Cal.com booking metadata → a booking-form answer → the forwarded query
 * param on this page's own URL. bookingValue() in lib/calcom.ts owns the first
 * two, and metadata leads because it is the only one of the three that needs NO
 * configuration on the Cal.com event type — a dashboard edit to booking questions
 * cannot empty it, and it does not depend on "forward parameters" being ticked on
 * the redirect (a Teams-plan feature that is not yet active on this account).
 *
 * All three are still read, because the value that matters most here is the GA4
 * client_id: losing it makes every server-side conversion for this student land
 * as "(not set)", which is indistinguishable from not tracking at all.
 */
const value = (
  booking: CalBooking,
  params: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined => bookingValue(booking, key) ?? (first(params[key]) || undefined);

type Failure = 'no-uid' | 'not-configured' | 'not-found' | 'unknown-mode' | 'error';

export default async function HoldPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;

  // Cal.com names the booking reference differently depending on how the
  // event type's redirect is configured; all three are read so a settings
  // change cannot silently break the hand-off.
  const bookingUid = first(params.uid) || first(params.bookingUid) || first(params.bookingId);

  let failure: Failure | null = null;
  // Held until after the try/catch. next/navigation's redirect() signals by
  // throwing, so calling it inside the catch's reach would let this page's own
  // error handling swallow a redirect that should have happened.
  let holdUrl: string | null = null;

  if (!bookingUid) {
    failure = 'no-uid';
  } else if (!stripeConfigured() || !calcomConfigured()) {
    // Pre-credentials, and on any preview deployment without the secrets.
    failure = 'not-configured';
  } else {
    try {
      const booking = await getBooking(bookingUid);

      if (!booking) {
        // Cal.com's own write can lag its redirect by a moment. Rather than
        // retry-looping in a page render, the student is shown the panel and the
        // webhook completes the booking regardless.
        failure = 'not-found';
      } else {
        /**
         * Mode resolution, in order of trustworthiness. It is not allowed to
         * fall back to a guess: mode decides the price, the Cal.com event type
         * and the ASSESSMENT_VALUE the ad account bids against ($1,150 online
         * vs $1,450 in person), so a wrong guess corrupts both the customer
         * record and the bidding signal.
         */
        const at = (key: string) => value(booking, params, key);

        const mode: LessonMode | null =
          modeFromEventTypeId(booking.eventTypeId) ?? asMode(at('mode'));

        if (!mode) {
          failure = 'unknown-mode';
        } else {
          const hold = await createAssessmentHold({
            bookingUid,
            mode,
            // Cal.com's attendee record wins over our form's copy of the same
            // fields: it is what the calendar invite was actually issued to.
            name: booking.attendeeName ?? at('name') ?? '',
            email: booking.attendeeEmail ?? at('email') ?? '',
            goals: at('goals') ?? at('notes'),
            experience: at('experience'),
            availability: at('availability'),
            guardianName: at('guardian_name'),
            guardianEmail: at('guardian_email'),
            // THE JOIN. Without this on the Stripe Customer, the server-side
            // assessment_booked conversion has no GA4 session to attach to and
            // reports as (not set) — no source, no campaign, nothing for Smart
            // Bidding to learn from.
            gaClientId: at('ga_client_id'),
            /*
             * Ad-click ids. Latched by lib/analytics.ts and carried through
             * Cal.com the same way, and these are the ones with no second chance:
             * a GA4 client_id can be re-derived from a later session, but a gclid
             * that is not captured at the booking is permanently unattributable
             * and scripts/offline-conversions.ts will never be able to upload
             * that student's true LTV to Google Ads.
             */
            clickIds: {
              gclid: at('gclid'),
              gbraid: at('gbraid'),
              wbraid: at('wbraid'),
            },
            utm: {
              utm_source: at('utm_source'),
              utm_medium: at('utm_medium'),
              utm_campaign: at('utm_campaign'),
              utm_content: at('utm_content'),
              utm_term: at('utm_term'),
            },
            assessmentAt: booking.start ?? undefined,
          });

          holdUrl = hold.url;
        }
      }
    } catch (error) {
      // Never surface a Stripe or Cal.com error message to a student. It is
      // logged for us and they get a sentence they can act on.
      console.error('[book/hold] could not create the card hold', error);
      failure = 'error';
    }
  }

  // Stripe-hosted, $0. The last thing this page does, and deliberately outside
  // every catch above it.
  if (holdUrl) redirect(holdUrl);

  return (
    <div className="page-fade">
      <Reveal />
      <div className="wrap">
        <section className="svc-page-hero" style={{ paddingBottom: 20 }}>
          <div className="eyebrow">Almost done</div>
          <h1>
            Your slot is <span className="it">held.</span>
          </h1>
          <p className="prose" style={{ fontSize: 20, marginTop: 24, maxWidth: 640 }}>
            {failure === 'no-uid'
              ? 'This page needs a booking reference from the scheduler, which usually means it was opened directly.'
              : 'The time is on my calendar.'}
          </p>
        </section>

        <section className="block" style={{ paddingTop: 10, paddingBottom: 80 }}>
          <div style={{ maxWidth: 640 }}>
            <strong className="assess-card-note" style={{ marginTop: 0, fontSize: 19 }}>
              {ASSESSMENT_CARD_COPY}
            </strong>

            <p className="prose" style={{ marginTop: 26 }}>
              Cards are entered on Stripe&rsquo;s own secure page — this website never sees them. The
              amount is <strong>$0</strong>: an authorisation rather than a payment, and it exists for
              one reason, which is that a held card means a kept slot. If you decide not to carry on
              after the {ASSESSMENT.durationMinutes} minutes, nothing is ever charged.
            </p>

            <div className="cal-fallback" style={{ marginTop: 34 }}>
              <p style={{ margin: '0 0 14px' }}>{failureCopy(failure)}</p>
              <p style={{ margin: 0 }}>
                Email{' '}
                <a
                  href={`mailto:${EMAIL}?subject=${encodeURIComponent(
                    `Assessment booking${bookingUid ? ` (${bookingUid})` : ''}`,
                  )}`}
                  style={{ color: 'var(--accent)', textDecoration: 'underline' }}
                >
                  {EMAIL}
                </a>{' '}
                and I will confirm it by hand — usually within a few hours.
              </p>
            </div>

            <p className="prose" style={{ marginTop: 40, fontSize: 16 }}>
              Want to start over?{' '}
              <Link href="/coach/book" style={{ color: 'var(--accent)' }}>
                Book a different time
              </Link>
              .
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

const asMode = (value: string | undefined): LessonMode | null =>
  value === 'online' || value === 'inperson' ? value : null;

/**
 * One honest sentence per failure. None of them tells the student to do the
 * booking again — a duplicate booking is worse than a delayed confirmation,
 * because it takes a second slot out of the week.
 */
function failureCopy(failure: Failure | null): string {
  switch (failure) {
    case 'no-uid':
      return 'If you have just booked a time, your slot is safe and you will get a confirmation email — there is nothing more to do here.';
    case 'not-configured':
      return 'Card holds are being switched on, so there is nothing more for you to do right now: your time is booked and the confirmation is on its way.';
    case 'not-found':
      return 'Your booking is still being written on the calendar, which takes a moment. It is safe — the confirmation email will arrive shortly.';
    case 'unknown-mode':
      return 'Your slot is booked, but I could not tell automatically whether it is online or in person, so I will confirm the details with you directly.';
    case 'error':
      return 'Your slot is booked. The card step could not load just now, which changes nothing about your booking — I will send confirmation by hand.';
    default:
      return 'Your slot is booked and the confirmation is on its way.';
  }
}
