import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { JsonLd } from '@/components/JsonLd';
import { Reveal } from '@/components/Reveal';
import { TESTIMONIALS } from '@/lib/content';
import { voiceLessonsServiceSchema } from '@/lib/schema';
import { breadcrumbList, pageMeta } from '@/lib/seo';

const FOCUS = [
  'Breath support and healthy vocal technique',
  'Range extension without strain',
  'Pitch accuracy and ear training',
  'Tone, resonance and finding your own sound',
  'Harmony and singing in parts',
  'Singing and playing an instrument at the same time',
  'Stage presence and performance nerves',
  'Audition and showcase preparation',
];

const NEIGHBOURHOODS = [
  'Mid-City',
  'Koreatown',
  'Silver Lake',
  'Echo Park',
  'Hollywood',
  'West LA',
  'Culver City',
  'Pasadena',
];

export const metadata: Metadata = pageMeta({
  title: 'Voice Lessons in Los Angeles — Online & In Person',
  description:
    'One-to-one voice lessons in Los Angeles and online with Colombian singer-songwriter and vocal coach Juliana Beltran. Healthy technique, range, tone and stage confidence, in English or Spanish. Beginners welcome.',
  path: '/coach/voice-lessons-los-angeles',
});

export default function VoiceLessonsLosAngelesPage() {
  return (
    <div className="page-fade">
      <Reveal />
      <div className="wrap">
        <section className="svc-page-hero">
          <div className="eyebrow">Voice lessons &middot; Los Angeles &amp; online</div>
          <h1>
            Voice lessons in <span className="it">Los Angeles.</span>
          </h1>
          <p
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 20,
              lineHeight: 1.55,
              color: 'var(--ink-soft)',
              maxWidth: 700,
              marginTop: 24,
              fontWeight: 300,
            }}
          >
            One-to-one singing lessons with a working recording artist. In person in Los Angeles or
            online anywhere, in English or Spanish, for total beginners through performing artists.
          </p>
          <div style={{ marginTop: 32 }}>
            <Link className="btn btn--solid" href="/coach/contact">
              Book a free consultation <span className="arrow">&rarr;</span>
            </Link>
          </div>
        </section>

        <section className="block" style={{ paddingTop: 40, paddingBottom: 40 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80 }} className="about-cols">
            <div>
              <div className="eyebrow reveal" style={{ marginBottom: 24 }}>
                How the lessons work
              </div>
              <p
                className="reveal"
                style={{
                  fontFamily: 'var(--serif)',
                  fontSize: 19,
                  lineHeight: 1.65,
                  color: 'var(--ink-soft)',
                  fontWeight: 300,
                  margin: '0 0 22px',
                }}
              >
                Every lesson starts with your voice as it is today, not a syllabus. We warm up,
                work on the specific thing that is holding the sound back — usually breath, usually
                tension — and then apply it immediately to a song you actually want to sing. You
                leave with two or three exercises and a short note on what to practise, so the week
                between lessons does real work.
              </p>
              <p
                className="reveal"
                style={{
                  '--rd': '120ms',
                  fontFamily: 'var(--serif)',
                  fontSize: 19,
                  lineHeight: 1.65,
                  color: 'var(--ink-soft)',
                  fontWeight: 300,
                  margin: '0 0 22px',
                }}
              >
                I teach healthy technique first. Range and volume are the result of support and
                release, not force, and singers who are pushed hard tend to arrive with habits that
                take longer to undo than to learn properly. That approach works for a nervous
                beginner and for a gigging artist who needs a voice that survives four nights in a
                row.
              </p>
              <p
                className="reveal"
                style={{
                  '--rd': '200ms',
                  fontFamily: 'var(--serif)',
                  fontSize: 19,
                  lineHeight: 1.65,
                  color: 'var(--ink-soft)',
                  fontWeight: 300,
                  margin: 0,
                }}
              >
                I am a Colombian singer-songwriter, a touring vocalist for Amanda Miguel, and I
                release my own music — so the coaching comes from someone still doing the thing.
                Students have ranged from age five to seventy-plus, and lessons run in English or
                Spanish, whichever you think in.
              </p>
            </div>
            <div className="ken reveal" style={{ '--rd': '160ms' }}>
              <Image
                src="/img/juliana-couch-casual.jpg"
                alt="Juliana Beltran teaching a voice lesson in Los Angeles"
                width={2160}
                height={2880}
                sizes="(max-width: 920px) 100vw, 45vw"
                style={{ width: '100%', aspectRatio: '4/5', objectFit: 'cover', height: 'auto' }}
              />
            </div>
          </div>
        </section>

        <section className="block" style={{ paddingTop: 20, paddingBottom: 40 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80 }} className="about-cols">
            <div>
              <div className="eyebrow reveal" style={{ marginBottom: 24 }}>
                What we work on
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, borderTop: '1px solid var(--rule)' }}>
                {FOCUS.map((f, i) => (
                  <li
                    key={f}
                    className="reveal"
                    style={{
                      '--rd': `${i * 60}ms`,
                      padding: '16px 0',
                      borderBottom: '1px solid var(--rule)',
                      fontFamily: 'var(--serif)',
                      fontSize: 18,
                      fontWeight: 300,
                      display: 'flex',
                      gap: 18,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--serif)',
                        fontStyle: 'italic',
                        color: 'var(--accent)',
                        fontSize: 14,
                        minWidth: 30,
                      }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="eyebrow reveal" style={{ marginBottom: 24 }}>
                In person or online
              </div>
              <p
                className="reveal"
                style={{
                  fontFamily: 'var(--serif)',
                  fontSize: 19,
                  lineHeight: 1.65,
                  color: 'var(--ink-soft)',
                  fontWeight: 300,
                  margin: '0 0 22px',
                }}
              >
                In-person lessons run from the Mid-City studio, an easy drive from most of central
                Los Angeles. Online lessons use a calibrated audio setup rather than default video
                call compression, so breath, tone and pitch all come through clearly enough to
                coach properly — several of my longest-running students have never been in the room.
              </p>
              <p
                className="reveal"
                style={{
                  '--rd': '100ms',
                  fontFamily: 'var(--serif)',
                  fontSize: 19,
                  lineHeight: 1.65,
                  color: 'var(--ink-soft)',
                  fontWeight: 300,
                  margin: '0 0 26px',
                }}
              >
                Weekly lessons give the most consistent growth; bi-weekly works during busier
                seasons. Group classes are available for friends, siblings or a band that wants to
                work on harmony together.
              </p>
              <div className="eyebrow reveal" style={{ marginBottom: 16 }}>
                Students travel from
              </div>
              <div className="press-strip reveal">
                {NEIGHBOURHOODS.map((n) => (
                  <span key={n}>{n}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="block" style={{ paddingTop: 20, paddingBottom: 40 }}>
          <div className="eyebrow reveal" style={{ marginBottom: 30 }}>
            What students say
          </div>
          <div className="press-quotes-grid">
            {TESTIMONIALS.slice(0, 3).map((t, i) => (
              <div key={t.name} className="press-quote-card reveal" style={{ '--rd': `${i * 100}ms` }}>
                <blockquote
                  style={{
                    fontFamily: 'var(--display)',
                    fontSize: 'clamp(20px, 2vw, 28px)',
                    lineHeight: 1.2,
                    margin: 0,
                    fontWeight: 400,
                  }}
                >
                  {t.quote}
                </blockquote>
                <div className="eyebrow" style={{ marginTop: 16 }}>
                  {t.name}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="block" style={{ paddingTop: 20, paddingBottom: 40 }}>
          <div className="eyebrow reveal" style={{ marginBottom: 24 }}>
            Starting out
          </div>
          <p
            className="reveal"
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 19,
              lineHeight: 1.65,
              color: 'var(--ink-soft)',
              fontWeight: 300,
              maxWidth: 760,
              margin: '0 0 26px',
            }}
          >
            The first step is a free fifteen-minute consultation — a short call about what you want
            to sing, what has felt difficult, and how often you can realistically practise. No
            audition, no experience required. Plenty of people arrive having only ever sung in the
            car. If you also write, or want to, songwriting and artist development sessions can run
            alongside the voice work.
          </p>
          <Link className="btn btn--solid reveal" style={{ '--rd': '120ms' }} href="/coach/services">
            See all lessons <span className="arrow">&rarr;</span>
          </Link>
        </section>

        <section className="cta">
          <div className="eyebrow reveal" style={{ marginBottom: 30 }}>
            &mdash; Whenever you&apos;re ready
          </div>
          <h2 className="reveal" style={{ '--rd': '120ms' }}>
            Come <span className="it">sing.</span>
          </h2>
          <p className="reveal" style={{ '--rd': '240ms' }}>
            Free consultation first. We&apos;ll talk through your goals — no pressure, no script.
          </p>
          <Link className="btn btn--solid reveal" style={{ '--rd': '320ms' }} href="/coach/contact">
            Book a lesson <span className="arrow">&rarr;</span>
          </Link>
        </section>
      </div>

      <JsonLd
        data={[
          voiceLessonsServiceSchema(),
          breadcrumbList([
            { name: 'Home', path: '/' },
            { name: 'Coaching', path: '/coach' },
            { name: 'Voice Lessons in Los Angeles', path: '/coach/voice-lessons-los-angeles' },
          ]),
        ]}
      />
    </div>
  );
}
