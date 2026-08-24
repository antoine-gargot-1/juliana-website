import type { Metadata } from 'next';
import Link from 'next/link';

import { JsonLd } from '@/components/JsonLd';
import { Reveal } from '@/components/Reveal';
import { FaqAccordion } from '@/components/coach/FaqAccordion';
import { ASSESSMENT_CARD_COPY } from '@/components/coach/PriceGrid';
import { FAQS } from '@/lib/content';
import { ASSESSMENT, LESSONS_PER_MONTH } from '@/lib/pricing';
import { faqPageSchema } from '@/lib/schema';
import { breadcrumbList, pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta({
  title: 'Music Lesson FAQ — Ages, Levels, Billing & Booking',
  description:
    'What people ask before booking: the free 30-minute assessment and the card that holds the slot, monthly billing, cancelling and pausing, and students under 18.',
  path: '/coach/faq',
});

export default function FaqPage() {
  return (
    <div className="page-fade">
      <Reveal />
      <div className="wrap">
        <section className="svc-page-hero">
          <div className="eyebrow">Common Questions</div>
          <h1>
            Asked &amp; <span className="it">answered.</span>
          </h1>
          {/* PLAIN LEDE. The five answers people open this accordion to find,
              in the sans face, above the accordion rather than inside it. Two of
              them — the delayed first bill and the free pause — are the strongest
              things the studio has to say and were previously three clicks deep. */}
          <p className="lede-plain">
            The short version, if you&apos;re in a hurry: the first{' '}
            {ASSESSMENT.durationMinutes} minutes are free. {ASSESSMENT_CARD_COPY} A plan is{' '}
            {LESSONS_PER_MONTH} lessons a month, your first bill lands a week after that free
            session, and you can cancel any time.
          </p>
        </section>

        <section className="block" style={{ paddingTop: 20 }}>
          <div style={{ maxWidth: 880 }}>
            {/* The accordion's questions are h3 now (see FaqAccordion), which
                needs an h2 above them or the outline jumps h1 → h3. There is no
                visible label here and there should not be — the h1 is "Asked &
                answered." and the accordion starts two lines below it, so a
                visible section label would be a change to what ships. .sr-only
                puts the text in the HTML and the accessibility tree without
                moving a pixel. On /coach the same accordion sits under the
                visible h2 "What people ask before they book.", so that route
                needs nothing. */}
            <h2 className="sr-only">Frequently asked questions</h2>
            <FaqAccordion faqs={FAQS} />
          </div>
        </section>

        <section className="cta">
          <h2>
            Something <span className="it">not answered?</span>
          </h2>
          <p>
            Send me a note. I&apos;d rather answer an awkward question now than have you book
            wondering about it.
          </p>
          <div className="hero-ctas" style={{ justifyContent: 'center' }}>
            <Link className="btn btn--solid" href="/coach/contact">
              Get in touch <span className="arrow">&rarr;</span>
            </Link>
            <Link className="btn btn--ghost" href="/coach/book">
              Book a free assessment
            </Link>
          </div>
          {/* The card promise travels with every place the free assessment is
              offered. No paid button on this page, so it cannot be misread as
              applying to a purchase. */}
          <p className="lede-plain" style={{ margin: '22px auto 0' }}>
            {ASSESSMENT_CARD_COPY}
          </p>
        </section>
      </div>

      <JsonLd
        data={[
          faqPageSchema(),
          breadcrumbList([
            { name: 'Home', path: '/' },
            { name: 'Coaching', path: '/coach' },
            { name: 'FAQ', path: '/coach/faq' },
          ]),
        ]}
      />
    </div>
  );
}
