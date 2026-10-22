import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { JsonLd } from '@/components/JsonLd';
import { Reveal } from '@/components/Reveal';
import { ASSESSMENT_CARD_COPY } from '@/components/coach/PriceGrid';
import { ASSESSMENT } from '@/lib/pricing';
import { coachPersonSchema } from '@/lib/schema';
import { breadcrumbList, pageMeta } from '@/lib/seo';

/**
 * The visible credentials, and the source the Person JSON-LD is written against.
 *
 * ORDER AND CONTENT ARE BOTH LOAD-BEARING. The strongest claims here are the
 * touring work, the editorial placements and the 5-to-70+ teaching range — an
 * Associate of Arts is real and worth listing, but it is the weakest item on the
 * list and must never be allowed to replace the others as the headline
 * credential. `coachPersonSchema()` in lib/schema.ts mirrors this list, so a row
 * added here should be reflected there (and vice versa) rather than one of them
 * quietly becoming the fuller version.
 */
const BACKGROUND = [
  'Vocal coaching for students ages 5 to 70+',
  'Artist coaching & songwriting mentorship',
  'Live performance in multiple countries',
  'Studio recording experience',
  'Professional performance work in LA',
  'Vocalist for international artist Amanda Miguel',
  'Original songs on Spotify editorial playlists',
  'Associate of Arts — voice & songwriting',
];

const STYLES = ['Pop', 'Latin Pop', 'Indie Pop', 'Singer-Songwriter', 'Acoustic', 'Alternative'];

/**
 * "Vocal Coach in Los Angeles", not "Vocal Coach & Singer-Songwriter in LA".
 *
 * The singer-songwriter identity is what /artist and /artist/press are for, and
 * naming it here made this the third page competing on it. This is the coaching
 * side's about page: the credential a parent is checking is the coaching one.
 * "Los Angeles" spelled out rather than "LA" because that is how the query is
 * typed. Description cut from 266 characters to fit what Google actually renders.
 */
export const metadata: Metadata = pageMeta({
  title: 'About Juliana Beltran — Vocal Coach in Los Angeles',
  description:
    'Colombian singer-songwriter and vocal coach in Los Angeles. Toured with Amanda Miguel, songs on Spotify editorial playlists, teaches ages 5 to 70+.',
  path: '/coach/about',
  image: '/img/juliana-portrait.jpg',
  imageWidth: 3365,
  imageHeight: 4206,
  type: 'profile',
});

export default function AboutPage() {
  return (
    <div className="page-fade">
      <Reveal />
      <div className="wrap">
        <section className="about-hero">
          <div>
            <div className="eyebrow reveal" style={{ marginBottom: 24 }}>
              Chapter One &middot; Meet Juliana
            </div>
            <h1 className="reveal" style={{ '--rd': '80ms' }}>
              Meet <span className="it">Juliana.</span>
            </h1>
            <p
              className="reveal"
              style={{
                '--rd': '160ms',
                fontFamily: 'var(--serif)',
                fontSize: 22,
                lineHeight: 1.55,
                color: 'var(--ink-soft)',
                maxWidth: 520,
                fontWeight: 400,
                margin: 0,
              }}
            >
              Colombian singer-songwriter and music coach in Los Angeles. I teach voice, guitar,
              piano and songwriting, in English or Spanish, online or in person.
            </p>
          </div>
          <div className="img reveal-clip" style={{ '--rd': '200ms' }}>
            <Image
              src="/img/juliana-portrait.jpg"
              alt="Juliana portrait"
              width={3365}
              height={4206}
              sizes="(max-width: 920px) 100vw, 45vw"
            />
          </div>
        </section>

        <section className="block" style={{ paddingTop: 40 }}>
          <div className="about-bio" style={{ maxWidth: 760, margin: '0 auto' }}>
            {/* PLAIN LEDE, then the longer personal writing underneath.
                WCAG 3.1.5 is satisfied by a plain summary alongside harder
                prose, not by flattening the prose — so the short version comes
                first in the sans face and her own voice keeps the rest. */}
            <p className="lede-plain reveal" style={{ margin: '0 0 30px', maxWidth: '56ch' }}>
              The short version: I sing for a living and I teach. Students have been as young as
              five and as old as seventy-plus. Lessons run in English or Spanish.
            </p>
            <p className="reveal" style={{ '--rd': '80ms' }}>
              I toured as a vocalist for Amanda Miguel, my own songs sit on Spotify editorial
              playlists, and I still play rooms like Hotel Café — a full 47-minute headline set
              there, ten songs with a four-piece band, is on this site. That matters to your lesson
              for one reason: I&apos;m asking my own voice to do the things I ask yours to do, so I
              find out the same week when something I taught you doesn&apos;t hold up on a stage.
            </p>
            <p className="reveal" style={{ '--rd': '160ms' }}>
              What I teach first is the boring part. Breath, support, release. Range and volume come
              out of those rather than out of pushing, and a singer who&apos;s been pushed hard
              arrives with habits that take longer to undo than they&apos;d have taken to learn
              properly.
            </p>
            <p className="reveal" style={{ '--rd': '240ms' }}>
              One thing that has nothing to do with your lessons: I&apos;ve been releasing music for
              years, and &ldquo;Delusional&rdquo; in April 2026 was the first of my own records where
              I played the guitar on it, live, in the studio. So when a singer tells me they&apos;re
              nervous about the guitar part, I&apos;m not being kind about it. I know.
            </p>
          </div>
        </section>

        <div className="pull reveal">
          <blockquote>
            I&apos;d rather tell you the <span className="it">true thing</span> in the first ten
            minutes than the encouraging thing for six months.
          </blockquote>
          <div className="eyebrow" style={{ marginTop: 30 }}>
            Teaching Philosophy
          </div>
        </div>

        <section className="block" style={{ paddingTop: 40 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80 }} className="about-cols">
            <div>
              <div className="eyebrow reveal" style={{ marginBottom: 24 }}>
                Background
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, borderTop: '1px solid var(--rule)' }}>
                {BACKGROUND.map((it, i) => (
                  <li
                    key={i}
                    className="reveal"
                    style={{
                      '--rd': `${i * 80}ms`,
                      padding: '18px 0',
                      borderBottom: '1px solid var(--rule)',
                      fontFamily: 'var(--serif)',
                      fontSize: 18,
                      fontWeight: 400,
                      display: 'flex',
                      gap: 18,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--serif)',
                        fontStyle: 'italic',
                        // --accent is 1.82:1 and cannot carry text. --accent-text
                        // (6.67:1) is the token that can, and this is 14px.
                        color: 'var(--accent-text)',
                        fontSize: 14,
                        minWidth: 30,
                      }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="eyebrow reveal" style={{ marginBottom: 24 }}>
                Styles I Specialize In
              </div>
              <p className="prose reveal" style={{ margin: 0 }}>
                {STYLES.join(', ')}.
              </p>
            </div>
          </div>
        </section>

        <section className="cta">
          <h2 className="reveal">
            Let&apos;s <span className="it">make</span> something.
          </h2>
          <p className="reveal" style={{ '--rd': '120ms' }}>
            Lessons are built around what you actually want to sing or write. Start with a free{' '}
            {ASSESSMENT.durationMinutes}-minute assessment. {ASSESSMENT_CARD_COPY}
          </p>
          <Link className="btn btn--solid reveal" style={{ '--rd': '240ms' }} href="/coach/book">
            Book your free assessment <span className="arrow">&rarr;</span>
          </Link>
        </section>
      </div>

      <JsonLd
        data={[
          coachPersonSchema(),
          breadcrumbList([
            { name: 'Home', path: '/' },
            { name: 'Coaching', path: '/coach' },
            { name: 'About', path: '/coach/about' },
          ]),
        ]}
      />
    </div>
  );
}
