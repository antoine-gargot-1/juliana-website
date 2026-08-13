import type { Metadata } from 'next';
import Link from 'next/link';

import { JsonLd } from '@/components/JsonLd';
import { Reveal } from '@/components/Reveal';
import { SERVICES } from '@/lib/content';
import { ASSESSMENT } from '@/lib/pricing';
import { assessmentOfferSchema, coachingServiceSchema } from '@/lib/schema';
import { breadcrumbList, pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta({
  title: 'Lessons & Coaching — Voice, Guitar, Piano, Songwriting',
  description:
    'Six ways to work together: voice, guitar, piano, songwriting, artist development and small group classes. Every session personalised, online or in person in Los Angeles.',
  path: '/coach/services',
});

export default function ServicesPage() {
  return (
    <div className="page-fade">
      <Reveal />
      <div className="wrap">
        <section className="svc-page-hero">
          <div className="eyebrow">A studio menu</div>
          <h1>
            Lessons &amp; <span className="it">coaching.</span>
          </h1>
          <p
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 20,
              lineHeight: 1.55,
              color: 'var(--ink-soft)',
              maxWidth: 640,
              marginTop: 24,
              fontWeight: 300,
            }}
          >
            Every session is personalized. Mix and match disciplines, or focus on one craft deeply —
            the structure shifts with your goals. Prices cover the lesson, not the subject: a
            60-minute lesson costs the same whether we spend it on voice, guitar, piano or
            songwriting.{' '}
            {/* Global `a` resets colour and underline, so an inline link in body
                copy has to say it is a link. */}
            <Link href="/coach/pricing" style={{ textDecoration: 'underline' }}>
              See the prices
            </Link>
            .
          </p>
        </section>

        {SERVICES.map((s, i) => (
          <section key={s.n} className={`svc-detail${i % 2 === 1 ? ' alt' : ''}`}>
            <div>
              <div className="n">No. {s.n}</div>
            </div>
            <div>
              <h2>{s.name}</h2>
              <p className="lead">{s.lead}</p>
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom: 16 }}>
                Lessons may include
              </div>
              <ul>
                {s.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          </section>
        ))}

        <section className="cta" style={{ paddingTop: 100 }}>
          <h2>
            Not sure where to <span className="it">start?</span>
          </h2>
          <p>
            Book a free {ASSESSMENT.durationMinutes}-minute assessment. I&apos;ll listen, we&apos;ll
            talk through your goals, and I&apos;ll shape a path that fits. A card holds the slot;
            nothing is charged.
          </p>
          <Link className="btn btn--solid" href="/coach/book">
            Free {ASSESSMENT.durationMinutes}-minute assessment <span className="arrow">&rarr;</span>
          </Link>
        </section>
      </div>

      <JsonLd
        data={[
          coachingServiceSchema(),
          assessmentOfferSchema(),
          breadcrumbList([
            { name: 'Home', path: '/' },
            { name: 'Coaching', path: '/coach' },
            { name: 'Services', path: '/coach/services' },
          ]),
        ]}
      />
    </div>
  );
}
