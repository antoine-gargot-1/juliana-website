import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';

import { ChooserSide } from '@/components/ChooserSide';
import { JsonLd } from '@/components/JsonLd';
import { ModeRedirect } from '@/components/ModeRedirect';
import { Reveal } from '@/components/Reveal';
import { breadcrumbList, pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta({
  title: 'Juliana Beltran — Colombian Singer-Songwriter & Music Coach in Los Angeles',
  description:
    'Colombian singer-songwriter based in Los Angeles. Book Juliana for live shows, festivals and private events, or study voice, guitar, piano and songwriting with her online or in person.',
  path: '/',
});

/*
 * Every route here is linked on purpose: the root-level keyword landing pages
 * (/vocal-coach-los-angeles, /online-*, /live-music-for-events-los-angeles) only
 * exist in the sitemap otherwise, and a page with no internal links pointing at
 * it is a page search engines discount. /coach/book is deliberately NOT here:
 * every link that offers the free assessment has to carry ASSESSMENT_CARD_COPY
 * beside it, and this list is not the place for that sentence.
 */
const LINK_COLUMNS: [string, [string, string][]][] = [
  [
    'The artist',
    [
      ['/artist', 'Artist home'],
      ['/artist/music', 'Music & playlists'],
      ['/artist/live', 'Live dates'],
      ['/artist/press', 'Press kit'],
      ['/artist/booking', 'Booking inquiry'],
      ['/live-music-for-events-los-angeles', 'Live music for events in Los Angeles'],
    ],
  ],
  [
    'The studio',
    [
      ['/coach', 'Coaching home'],
      ['/coach/about', 'About Juliana'],
      ['/coach/services', 'Lessons & coaching'],
      ['/coach/pricing', 'Lesson prices'],
      ['/coach/voice-lessons-los-angeles', 'Voice lessons in Los Angeles'],
      ['/coach/songwriting', 'Songwriting lessons'],
      ['/vocal-coach-los-angeles', 'Vocal coach in Los Angeles'],
      ['/online-singing-lessons', 'Online singing lessons'],
      ['/online-songwriting-lessons', 'Online songwriting lessons'],
    ],
  ],
];

export default function HomePage() {
  return (
    <>
      <ModeRedirect />
      <Reveal />

      <div className="chooser">
        <ChooserSide mode="coach" className="chooser-side chooser-coach">
          <div className="chooser-bg">
            <Image
              src="/img/juliana-couch-casual.jpg"
              alt="Juliana Beltran coaching a student"
              width={2160}
              height={2880}
              sizes="50vw"
            />
          </div>
          <div className="chooser-content">
            <div className="eyebrow">Looking for</div>
            <h2>Lessons</h2>
            <p className="serif">
              Voice, guitar, piano &amp; songwriting coaching in Los Angeles.
            </p>
            <span className="btn">
              Enter Studio <span className="arrow">&rarr;</span>
            </span>
          </div>
        </ChooserSide>

        <ChooserSide mode="artist" className="chooser-side chooser-artist">
          <div className="chooser-bg">
            <Image
              src="/img/juliana-goldenhour.png"
              alt="Juliana Beltran performing at golden hour"
              width={1990}
              height={3355}
              priority
              sizes="50vw"
            />
          </div>
          <div className="chooser-content">
            <div className="eyebrow">Booking an</div>
            <h2>Artist</h2>
            <p className="serif">Live shows, events &amp; collaborations. Press kit &amp; booking.</p>
            <span className="btn">
              View Press Kit <span className="arrow">&rarr;</span>
            </span>
          </div>
        </ChooserSide>

        <div className="chooser-brand">
          <span className="brand">
            Juliana <span className="dot">&middot;</span> Beltran
          </span>
        </div>
      </div>

      {/* Real, crawlable landing content below the chooser. The old SPA served
          an empty div here and redirected on the client. One short paragraph and
          the internal links; the pages they point at do the explaining. */}
      <section className="block" style={{ paddingTop: 100, paddingBottom: 100 }}>
        <div className="wrap">
          <h1
            className="reveal"
            style={{
              fontFamily: 'var(--display)',
              fontWeight: 400,
              fontSize: 'clamp(40px, 6vw, 88px)',
              lineHeight: 0.98,
              letterSpacing: '-0.015em',
              margin: '0 0 28px',
              maxWidth: 900,
            }}
          >
            Juliana <span className="it">Beltran.</span>
          </h1>
          <p
            className="reveal"
            style={{
              '--rd': '120ms',
              fontFamily: 'var(--serif)',
              fontSize: 22,
              lineHeight: 1.55,
              color: 'var(--ink-soft)',
              fontWeight: 400,
              maxWidth: 720,
              margin: '0 0 56px',
            }}
          >
            Colombian singer-songwriter, touring vocalist and music coach in Los Angeles, in English
            and Spanish. Book live music on the artist side; learn voice, guitar, piano or
            songwriting in the studio.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80 }} className="about-cols">
            {LINK_COLUMNS.map(([title, links]) => (
              <div key={title}>
                <div className="eyebrow" style={{ marginBottom: 16 }}>
                  {title}
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {links.map(([href, label]) => (
                    <li
                      key={href}
                      style={{
                        padding: '8px 0',
                        fontFamily: 'var(--serif)',
                        fontSize: 19,
                        fontWeight: 400,
                      }}
                    >
                      <Link href={href}>{label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <JsonLd data={breadcrumbList([{ name: 'Home', path: '/' }])} />
    </>
  );
}
