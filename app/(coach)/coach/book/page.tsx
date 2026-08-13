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

export const metadata: Metadata = pageMeta({
  title: 'Book a Free 30-Minute Vocal Assessment — Online or in Los Angeles',
  description:
    'Book a free 30-minute vocal assessment with Juliana Beltran, online or in person in Los Angeles. No charge and no audition. We take a card to hold your slot and you won’t be charged for the assessment.',
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
          {/* WHAT THIS SENTENCE IS FOR, AND WHY IT COUNTS THE FIELDS.
              It read "Two questions and a calendar" against a form that asks
              eight — plus two more for a guardian, plus a card at the end. An
              expectation violation at the moment of highest anxiety is the most
              expensive kind, so the count here is the real count: online or in
              person, name, email, age, focus, experience, goals, availability.
              If BookingForm gains or loses a field, this number moves with it. */}
          <p className="lede-plain" style={{ maxWidth: '54ch' }}>
            Eight short questions, then a calendar. Under 18 adds two more, for a parent or
            guardian. The last step takes a card to hold the slot, and it isn&apos;t charged.
          </p>
          <p className="prose" style={{ fontSize: 20, marginTop: 18, maxWidth: 640 }}>
            Then you sing for half an hour, I tell you honestly what&apos;s in the way and what a
            few months would change, and you decide afterwards whether to carry on.
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
                <dt>How long</dt>
                <dd>{ASSESSMENT.durationMinutes} minutes</dd>
                <dt>Online</dt>
                <dd>Most days, early and late. Times shown in your own timezone.</dd>
                <dt>In person in LA</dt>
                <dd>{IN_PERSON_DAYS.join('s and ')}s</dd>
                <dt>Languages</dt>
                <dd>English or Spanish</dd>
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
