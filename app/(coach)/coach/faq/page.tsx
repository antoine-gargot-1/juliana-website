import type { Metadata } from 'next';
import Link from 'next/link';

import { JsonLd } from '@/components/JsonLd';
import { Reveal } from '@/components/Reveal';
import { FaqAccordion } from '@/components/coach/FaqAccordion';
import { FAQS } from '@/lib/content';
import { faqPageSchema } from '@/lib/schema';
import { breadcrumbList, pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta({
  title: 'Music Lesson FAQ — Ages, Levels, Online Lessons & Styles',
  description:
    'Answers to the eight questions people ask before booking: do you need experience, what ages are taught, are online lessons available, which styles, how often to take lessons.',
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
          <Link className="btn btn--solid" href="/coach/contact">
            Get in touch <span className="arrow">&rarr;</span>
          </Link>
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
