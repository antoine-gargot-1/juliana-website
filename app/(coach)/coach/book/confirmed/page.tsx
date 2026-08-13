import type { Metadata } from 'next';
import Link from 'next/link';

import { Reveal } from '@/components/Reveal';
import { ASSESSMENT_CARD_COPY } from '@/components/coach/PriceGrid';
import { ConversionMirror } from '@/components/coach/ConversionMirror';
import { ASSESSMENT, modeLabel, type LessonMode } from '@/lib/pricing';
import { EMAIL } from '@/lib/site';
import { pageMeta } from '@/lib/seo';

/**
 * noindex, and excluded from the sitemap.
 *
 * A thank-you page in the index is a small disaster: it ranks for brand queries,
 * it invites people to arrive at a confirmation they never earned, and it makes
 * any "conversions per session" figure meaningless. It also carries no content
 * worth ranking.
 */
export const metadata: Metadata = pageMeta({
  title: 'Your assessment is booked',
  description: 'Your free vocal assessment is confirmed.',
  path: '/coach/book/confirmed',
  noindex: true,
});

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const first = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value) ?? '';

const asMode = (value: string): LessonMode | null =>
  value === 'online' || value === 'inperson' ? value : null;

export default async function ConfirmedPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;

  /*
   * Both come off the Stripe success_url, which createAssessmentHold() builds as
   * /coach/book/confirmed?booking=<cal uid>&mode=<online|inperson>.
   *
   * `booking` is the Cal.com booking uid and it is the transaction_id. It MUST be
   * the same value the server-side fire sends — see the ConversionMirror header
   * and the assessment_booked branch in app/api/stripe/webhook/route.ts, which
   * sends `transaction_id: bookingUid` from the SetupIntent metadata. If these
   * two ever diverge, every booking counts twice in Google Ads and Smart Bidding
   * bids against double the real value.
   */
  const bookingUid = first(params.booking);
  const mode = asMode(first(params.mode));

  return (
    <div className="page-fade">
      <Reveal />

      {/*
        The client-side mirror. The AUTHORITATIVE assessment_booked is fired
        server-side from the Stripe webhook on setup_intent.succeeded, because a
        browser-only fire loses 20–30% of conversions to ad blockers and Safari
        ITP — and not at random, but weighted toward the audiences that cost the
        most to reach. This copy exists for GA4 DebugView and for the case where
        webhook delivery is delayed. Both carry the same transaction_id, so Google
        Ads counts one conversion.
      */}
      <ConversionMirror
        event="assessment_booked"
        transactionId={bookingUid}
        params={{
          ...(mode ? { mode, mode_label: modeLabel(mode) } : {}),
          booking_uid: bookingUid,
        }}
      />

      <div className="wrap">
        <section
          style={{
            minHeight: '70vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '140px 0 80px',
            maxWidth: 720,
          }}
        >
          <div
            className="script"
            style={{ fontSize: 84, color: 'var(--accent)', lineHeight: 1, marginBottom: 24 }}
          >
            See you soon&hellip;
          </div>
          <h1
            style={{
              fontFamily: 'var(--display)',
              fontWeight: 400,
              fontSize: 'clamp(38px, 7vw, 68px)',
              lineHeight: 1,
              letterSpacing: '-0.015em',
              margin: '0 0 24px',
            }}
          >
            Your assessment is <span className="it">booked.</span>
          </h1>

          <p className="prose" style={{ fontSize: 19 }}>
            The calendar invite is on its way to your inbox, with the joining details and a note of
            the time in your own timezone. Add it to your calendar now — that one action is the
            difference between a booking and a lesson.
          </p>

          <strong className="assess-card-note" style={{ fontSize: 18 }}>
            {ASSESSMENT_CARD_COPY}
          </strong>

          <div className="eyebrow" style={{ margin: '44px 0 16px' }}>
            Before we meet
          </div>
          <ul className="numbered">
            <li>
              <span className="n">01</span>
              <span>
                <span className="t">Pick one song</span>
                Something you actually want to sing, even if you cannot get through it yet. Especially
                if you cannot get through it yet.
              </span>
            </li>
            <li>
              <span className="n">02</span>
              <span>
                <span className="t">Find wired headphones</span>
                For an online session this matters more than any other piece of equipment.
              </span>
            </li>
            <li>
              <span className="n">03</span>
              <span>
                <span className="t">Bring water</span>
                And {ASSESSMENT.durationMinutes} minutes where nobody needs you.
              </span>
            </li>
          </ul>

          <p className="prose" style={{ marginTop: 34 }}>
            Need to move it? Use the link in the calendar invite, or email{' '}
            <a href={`mailto:${EMAIL}`} style={{ color: 'var(--accent)' }}>
              {EMAIL}
            </a>
            .
          </p>

          <div style={{ marginTop: 30, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <Link className="btn btn--solid" href="/coach/pricing">
              See what happens after <span className="arrow">&rarr;</span>
            </Link>
            <Link className="btn btn--ghost" href="/coach">
              Back to the lessons
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
