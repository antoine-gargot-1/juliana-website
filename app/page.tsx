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
          an empty div here and redirected on the client. */}
      <section className="block" style={{ paddingTop: 100, paddingBottom: 40 }}>
        <div className="wrap">
          <div className="eyebrow reveal" style={{ marginBottom: 20 }}>
            Los Angeles &middot; Bilingual &middot; English &amp; Espa&ntilde;ol
          </div>
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
              margin: '0 0 22px',
            }}
          >
            Colombian singer-songwriter, touring vocalist and music coach based in Los Angeles.
            There are two halves to this site. One is the artist: live shows, releases, press and
            event booking. The other is the studio, where I teach voice, guitar, piano, songwriting
            and artist development.
          </p>
          <p
            className="reveal"
            style={{
              '--rd': '200ms',
              fontFamily: 'var(--serif)',
              fontSize: 19,
              lineHeight: 1.65,
              color: 'var(--ink-soft)',
              fontWeight: 400,
              maxWidth: 720,
              margin: '0 0 40px',
            }}
          >
            I sing in English and Spanish, I&apos;ve toured internationally as a vocalist for Amanda
            Miguel, and my songs sit on Spotify editorial playlists. Booking live music for a
            wedding, quincea&ntilde;era, corporate event or venue night in Southern California? Start
            on the artist side. Want to sing better or finish your own songs? Start in the studio.
            Every lesson price is published there, and the first step is a free 30-minute assessment
            where you sing and I tell you what I&apos;m hearing.
          </p>
        </div>
      </section>

      <section className="block" style={{ paddingTop: 0, paddingBottom: 100 }}>
        <div className="wrap">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80 }} className="about-cols">
            <div>
              <div className="eyebrow reveal" style={{ marginBottom: 20 }}>
                The artist
              </div>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  borderTop: '1px solid var(--rule)',
                }}
              >
                {[
                  ['/artist', 'Artist home'],
                  ['/artist/music', 'Music & playlists'],
                  ['/artist/live', 'Live dates'],
                  ['/artist/press', 'Press kit'],
                  ['/artist/booking', 'Booking inquiry'],
                  ['/live-music-for-events-los-angeles', 'Live music for events in Los Angeles'],
                ].map(([href, label], i) => (
                  <li
                    key={href}
                    className="reveal"
                    style={{
                      '--rd': `${i * 60}ms`,
                      padding: '16px 0',
                      borderBottom: '1px solid var(--rule)',
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
            <div>
              <div className="eyebrow reveal" style={{ marginBottom: 20 }}>
                The studio
              </div>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  borderTop: '1px solid var(--rule)',
                }}
              >
                {[
                  ['/coach', 'Coaching home'],
                  ['/coach/about', 'About Juliana'],
                  ['/coach/services', 'Lessons & coaching'],
                  ['/coach/pricing', 'Lesson prices'],
                  ['/coach/voice-lessons-los-angeles', 'Voice lessons in Los Angeles'],
                  ['/coach/songwriting', 'Songwriting lessons'],
                  // Root-level keyword landing pages, linked from here for the
                  // same reason /live-music-for-events-los-angeles is linked from
                  // the artist column: a page that only exists in the sitemap is
                  // a page with no internal links pointing at it.
                  ['/vocal-coach-los-angeles', 'Vocal coach in Los Angeles'],
                  ['/online-singing-lessons', 'Online singing lessons'],
                  ['/online-songwriting-lessons', 'Online songwriting lessons'],
                  ['/coach/book', 'Book a free 30-minute assessment'],
                ].map(([href, label], i) => (
                  <li
                    key={href}
                    className="reveal"
                    style={{
                      '--rd': `${i * 60}ms`,
                      padding: '16px 0',
                      borderBottom: '1px solid var(--rule)',
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
          </div>
        </div>
      </section>

      <JsonLd data={breadcrumbList([{ name: 'Home', path: '/' }])} />
    </>
  );
}
