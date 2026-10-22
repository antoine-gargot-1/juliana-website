import type { Metadata } from 'next';
import Link from 'next/link';

import { JsonLd } from '@/components/JsonLd';
import { Reveal } from '@/components/Reveal';
import { BookingForm } from '@/components/coach/BookingForm';
import { ASSESSMENT_CARD_COPY } from '@/components/coach/PriceGrid';
import { TESTIMONIALS } from '@/lib/content';
import { ASSESSMENT, IN_PERSON_DAYS } from '@/lib/pricing';
import { assessmentOfferSchema } from '@/lib/schema';
import { breadcrumbList, pageMeta } from '@/lib/seo';

/**
 * The duration is read off ASSESSMENT rather than typed into the string, for the
 * same reason the prices are: a title and a description are the two places a
 * stale number gets served to somebody who has not reached the page yet.
 *
 * The "— Online or in Los Angeles" tail is gone from the title. At 83 characters
 * it was past what Google renders, so it was invisible, and the description
 * carries the same fact in the part that is visible.
 */
export const metadata: Metadata = pageMeta({
  title: `Book a Free ${ASSESSMENT.durationMinutes}-Minute Vocal Assessment`,
  description:
    `Book a free ${ASSESSMENT.durationMinutes}-minute vocal assessment with Juliana Beltran, online or in person in ` +
    `Los Angeles. No charge, no audition. A card holds your slot.`,
  path: '/coach/book',
});

export default function BookPage() {
  return (
    <div className="page-fade">
      <Reveal />
      <div className="wrap">
        <section className="svc-page-hero" style={{ paddingBottom: 30 }}>
          <div className="eyebrow">
            Free &middot; {ASSESSMENT.durationMinutes} minutes &middot; online or in person in LA
          </div>
          <h1>
            Let&apos;s hear your <span className="it">voice.</span>
          </h1>
          {/* WHAT THIS SENTENCE IS FOR, AND WHY IT COUNTS THINGS.
              It once read "Two questions and a calendar" against a form that
              asked eight, and then said "eight short questions" against a form
              that also ended at a payment page it did not mention. An expectation
              violation at the moment of highest anxiety is the most expensive
              kind, so this counts what is actually there: THREE required answers
              plus a tick box (online or in person, name, email, under 18?), then
              the calendar, then the $0 card hold. Under 18 adds a guardian's name
              and email, because a minor cannot contract. Everything else on the
              form is optional and says so.
              If BookingForm's REQUIRED set changes, this sentence moves with it. */}
          <p className="lede-plain" style={{ maxWidth: '54ch' }}>
            Three steps and about two minutes: your name, your email and whether you&apos;re online
            or in LA &mdash; then the calendar &mdash; then a card to hold the slot, which
            isn&apos;t charged. Under 18 books with a parent or guardian.
          </p>
        </section>

        <section className="block" style={{ paddingTop: 10, paddingBottom: 60 }}>
          <div className="contact">
            {/* Reassurance column. On mobile this stacks under the form, which is
                the right order: someone who tapped a CTA wants the fields, not
                another sales paragraph. */}
            <div className="contact-info">
              <p>
                No audition, no experience required, and no sales call disguised as a lesson. Plenty
                of people arrive having only ever sung in the car.
              </p>
              <dl>
                <dt>What it costs</dt>
                <dd>Nothing.</dd>
                <dt>About the card</dt>
                <dd
                  style={{
                    fontFamily: 'var(--serif)',
                    fontSize: 17,
                    lineHeight: 1.5,
                    fontWeight: 400,
                  }}
                >
                  {ASSESSMENT_CARD_COPY}
                </dd>
                <dt>Online</dt>
                <dd>Most days, early and late. Times shown in your own timezone.</dd>
                <dt>In person in LA</dt>
                <dd>{IN_PERSON_DAYS.join('s and ')}s</dd>
                <dt>Ages</dt>
                <dd>5 to 70+ &middot; under 18 books with a parent or guardian</dd>
              </dl>

              <blockquote
                style={{
                  fontFamily: 'var(--serif)',
                  fontSize: 'clamp(20px, 2.2vw, 26px)',
                  lineHeight: 1.2,
                  margin: '40px 0 0',
                  fontWeight: 600,
                  borderTop: '1px solid var(--rule)',
                  paddingTop: 30,
                }}
              >
                {TESTIMONIALS[1].quote}
              </blockquote>
              <div className="eyebrow" style={{ marginTop: 14 }}>
                {TESTIMONIALS[1].name}
              </div>

              <p style={{ marginTop: 40 }}>
                Rather ask me something first?{' '}
                <Link href="/coach/contact" style={{ color: 'var(--accent-text)' }}>
                  Send a note instead
                </Link>
                .
              </p>
            </div>

            <BookingForm />
          </div>
        </section>
      </div>

      {/* No StickyCta here: the page IS the call to action, and a fixed bar
          would cover the submit button on a short viewport. StickyCta hides
          itself on this path for the same reason. */}

      <JsonLd
        data={[
          assessmentOfferSchema(),
          breadcrumbList([
            { name: 'Home', path: '/' },
            { name: 'Coaching', path: '/coach' },
            { name: 'Book a Free Assessment', path: '/coach/book' },
          ]),
        ]}
      />
    </div>
  );
}
