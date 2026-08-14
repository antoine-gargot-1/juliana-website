import type { Metadata } from 'next';
import Link from 'next/link';

import { JsonLd } from '@/components/JsonLd';
import { Reveal } from '@/components/Reveal';
import { ASSESSMENT_CARD_COPY } from '@/components/coach/PriceGrid';
import { TestimonialCarousel } from '@/components/coach/TestimonialCarousel';
import { SERVICES, TESTIMONIALS } from '@/lib/content';
import { ASSESSMENT } from '@/lib/pricing';
import { assessmentOfferSchema, coachingServiceSchema } from '@/lib/schema';
import { breadcrumbList, pageMeta } from '@/lib/seo';

/**
 * "What I Teach", not "Lessons & Coaching".
 *
 * This page is the disciplines menu — it is what the footer already calls "What
 * I teach" — and the generic phrase "Lessons & Coaching" put it in a title fight
 * with /coach ("Music Lessons in Los Angeles & Online") and with
 * /coach/lessons/online ("Online Music Lessons — Voice, Guitar, Piano &
 * Songwriting") for no term it can win. Naming its actual job is both truer and
 * the only one of the three that reads like a menu.
 */
export const metadata: Metadata = pageMeta({
  title: 'What I Teach — Voice, Guitar, Piano & Songwriting',
  description:
    'Six things Juliana teaches: voice, guitar, piano, songwriting, artist development and group classes. One price for the lesson whichever we work on.',
  path: '/coach/services',
});

/**
 * The two disciplines that have a page of their own, mapped by SERVICES name.
 *
 * WHY THIS EXISTS: /coach/services was a menu with no exits. Every internal link
 * in its body pointed at /coach/pricing or /coach/book — both already in the nav
 * and the footer on this page — so it added no route to anything, while
 * /coach/songwriting and /coach/voice-lessons-los-angeles were reachable only
 * from the footer list. A menu that names six things and links to none of them
 * is a dead end for a reader and a dead end for PageRank.
 *
 * Keyed by name rather than by `n` because the numbering is presentational and
 * renumbering the list must not silently move a link onto the wrong discipline.
 * An unmapped discipline renders nothing — Guitar, Piano, Artist Development and
 * Group Classes have no page yet, and a link to a section anchor would be a link
 * to this same page.
 */
const DISCIPLINE_PAGES: Record<string, { href: string; label: string }> = {
  Voice: { href: '/coach/voice-lessons-los-angeles', label: 'More on voice lessons' },
  Songwriting: { href: '/coach/songwriting', label: 'More on songwriting lessons' },
};

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
          {/* PLAIN LEDE first: six things, most people pick two. The pricing
              fact that follows is the one people are really scanning for. */}
          <p className="lede-plain">
            Six things I teach. Most students end up mixing two of them.
          </p>
          <p
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 20,
              lineHeight: 1.55,
              color: 'var(--ink-soft)',
              maxWidth: 640,
              marginTop: 18,
              fontWeight: 400,
            }}
          >
            Prices cover the lesson rather than the subject, so a 60-minute lesson costs the same
            whether we spend it on voice, guitar, piano or songwriting. Change your mind halfway
            through a month and nothing about the bill changes.{' '}
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
              {DISCIPLINE_PAGES[s.name] && (
                <p style={{ marginTop: 18, fontFamily: 'var(--serif)', fontSize: 17 }}>
                  <Link
                    href={DISCIPLINE_PAGES[s.name].href}
                    style={{ color: 'var(--accent)', textDecoration: 'underline' }}
                  >
                    {DISCIPLINE_PAGES[s.name].label} <span className="arrow">&rarr;</span>
                  </Link>
                </p>
              )}
            </div>
          </section>
        ))}

        {/* PROOF, AND WHY IT HAS TO BE HERE.
            Two reasons, and they point the same way. (1) This page's JSON-LD
            asserts an aggregateRating and five Review bodies; marking up reviews
            a reader cannot see is a structured-data violation, and the honest fix
            is to show them rather than to delete the markup. (2) The nav item
            labelled "Lessons" points at this page, which until now carried no
            price, no video and no review — the highest-intent dead end on the
            site. All five reviews render here, with names, dates and stars, so
            the markup and the page say the same thing. */}
        <section className="block" style={{ paddingTop: 60, paddingBottom: 20 }}>
          <div className="eyebrow" style={{ marginBottom: 30 }}>
            What students say
          </div>
          <TestimonialCarousel testimonials={TESTIMONIALS} />
        </section>

        <section className="cta" style={{ paddingTop: 100 }}>
          <h2>
            Not sure where to <span className="it">start?</span>
          </h2>
          <p>
            Book a free {ASSESSMENT.durationMinutes}-minute assessment. You sing, I tell you what
            I&apos;m hearing, and you decide afterwards. {ASSESSMENT_CARD_COPY}
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
