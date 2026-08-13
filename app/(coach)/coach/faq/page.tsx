import type { Metadata } from 'next';
import Link from 'next/link';

import { JsonLd } from '@/components/JsonLd';
import { Reveal } from '@/components/Reveal';
import { FaqAccordion } from '@/components/coach/FaqAccordion';
import { FAQS } from '@/lib/content';
import { faqPageSchema } from '@/lib/schema';
import { breadcrumbList, pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta({
  title: 'Music Lesson FAQ — Ages, Levels, Billing, Online Lessons & Styles',
  description:
    'Answers to what people ask before booking: the free 30-minute assessment and the card that holds the slot, how monthly billing works, cancelling and pausing, how in-person lessons in LA work, students under 18, ages, levels and styles.',
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
        </section>

        <section className="block" style={{ paddingTop: 20 }}>
          <div style={{ maxWidth: 880 }}>
            <FaqAccordion faqs={FAQS} />
          </div>
        </section>

        <section className="cta">
          <h2>
            Still <span className="it">curious?</span>
          </h2>
          <p>Send me a note — happy to answer anything before you book.</p>
          <div className="hero-ctas" style={{ justifyContent: 'center' }}>
            <Link className="btn btn--solid" href="/coach/contact">
              Get in touch <span className="arrow">&rarr;</span>
            </Link>
            <Link className="btn btn--ghost" href="/coach/book">
              Book a free assessment
            </Link>
          </div>
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
