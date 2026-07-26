import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { JsonLd } from '@/components/JsonLd';
import { ParallaxHero } from '@/components/ParallaxHero';
import { Reveal } from '@/components/Reveal';
import { ShowRow } from '@/components/artist/ShowRow';
import { PLAYLISTS, PRESS_QUOTES, STATS, partitionShows } from '@/lib/content';
import { eventListSchema, musicGroupSchema } from '@/lib/schema';
import { breadcrumbList, pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta({
  title: 'Juliana Beltran — Latin Pop & Indie Pop Artist, Los Angeles',
  description:
    'Colombian singer-songwriter in Los Angeles. Latin pop, indie pop and singer-songwriter sets for venues, festivals and private events. Live dates, music, press kit and booking.',
  path: '/artist',
  type: 'profile',
});

export default function ArtistHomePage() {
  const { upcoming, past } = partitionShows();
  const nextShows = upcoming.length > 0 ? upcoming.slice(0, 3) : past.slice(0, 3);
  const showingUpcoming = upcoming.length > 0;

  return (
    <div className="page-fade artist-theme">
      <Reveal />

      <ParallaxHero
        bg={
          <Image
            src="/img/juliana-goldenhour.png"
            alt="Juliana Beltran performing"
            width={1990}
            height={3355}
            priority
            fetchPriority="high"
            sizes="100vw"
          />
        }
      >
        <div className="hero-text">
          <div className="hero-eyebrow reveal">
            <span className="line" />
            <span className="eyebrow">Latin pop &middot; Indie pop &middot; Singer-songwriter</span>
          </div>
          <h1>
            <span className="reveal-up">
              <span style={{ '--rd': '50ms' }}>Juliana</span>
            </span>
            <br />
            <span className="reveal-up">
              <span className="it" style={{ '--rd': '180ms' }}>
                Beltran
              </span>
            </span>
          </h1>
          <p className="hero-sub reveal" style={{ '--rd': '420ms' }}>
            Live shows, festivals &amp; collaborations. Los Angeles.
          </p>
          <div className="hero-ctas reveal" style={{ '--rd': '580ms' }}>
            <Link className="btn btn--solid" href="/artist/booking">
              Book now <span className="arrow">&rarr;</span>
            </Link>
            <Link className="btn btn--ghost" href="/artist/press">
              Press kit
            </Link>
          </div>
        </div>
      </ParallaxHero>

      {/* Stats */}
      <section className="artist-stats">
        <div className="wrap">
          <div className="stats-grid reveal">
            {STATS.map((s) => (
              <div key={s.label} className="stat-cell">
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Music preview */}
      <section className="block" style={{ paddingTop: 100, paddingBottom: 60 }}>
        <div className="wrap">
          <div className="eyebrow reveal" style={{ marginBottom: 24 }}>
            &mdash; Listen
          </div>
          <h2
            className="reveal"
            style={{
              fontFamily: 'var(--display)',
              fontSize: 'clamp(48px, 6vw, 96px)',
              lineHeight: 0.95,
              margin: '0 0 50px',
              fontWeight: 400,
            }}
          >
            Featured <span className="it">music.</span>
          </h2>
          <div className="artist-music-grid reveal" style={{ '--rd': '200ms' }}>
            <div className="spotify-wrap">
              <iframe
                title="Juliana Beltran on Spotify"
                src="https://open.spotify.com/embed/artist/5NfNMKwOPzCw9S1s3OMS6z?utm_source=generator&theme=0"
                width="100%"
                height="352"
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
              />
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom: 20 }}>
                Featured in playlists
              </div>
              <ul className="playlist-list">
                {PLAYLISTS.map((p) => (
                  <li key={p.name}>
                    <a href={p.url} target="_blank" rel="noopener noreferrer">
                      <span className="playlist-name">{p.name}</span>
                      <span className="playlist-arrow">↗</span>
                    </a>
                  </li>
                ))}
              </ul>
              <Link className="btn" href="/artist/music" style={{ marginTop: 30 }}>
                All music <span className="arrow">&rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Upcoming shows */}
      <section className="block" style={{ paddingTop: 60, paddingBottom: 60 }}>
        <div className="wrap">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              flexWrap: 'wrap',
              gap: 20,
              marginBottom: 40,
            }}
          >
            <div>
              <div className="eyebrow reveal">&mdash; Live</div>
              <h2
                className="reveal"
                style={{
                  '--rd': '80ms',
                  fontFamily: 'var(--display)',
                  fontSize: 'clamp(38px, 5vw, 68px)',
                  lineHeight: 1,
                  margin: '12px 0 0',
                  fontWeight: 400,
                }}
              >
                {showingUpcoming ? (
                  <>
                    Upcoming <span className="it">shows.</span>
                  </>
                ) : (
                  <>
                    Recent <span className="it">shows.</span>
                  </>
                )}
              </h2>
            </div>
            <Link className="btn reveal" href="/artist/live" style={{ '--rd': '160ms' }}>
              All dates <span className="arrow">&rarr;</span>
            </Link>
          </div>
          <div className="shows-list">
            {nextShows.map((show, i) => (
              <ShowRow key={show.slug} show={show} index={i} past={!showingUpcoming} />
            ))}
          </div>
        </div>
      </section>

      {/* Press quotes */}
      <section
        className="block"
        style={{ paddingTop: 60, paddingBottom: 80, background: 'var(--bg-deep)' }}
      >
        <div className="wrap">
          <div className="eyebrow reveal" style={{ textAlign: 'center', marginBottom: 50 }}>
            &mdash; Press
          </div>
          <div className="press-quotes-grid">
            {PRESS_QUOTES.map((pq, i) => (
              <div key={i} className="press-quote-card reveal" style={{ '--rd': `${i * 100}ms` }}>
                <blockquote
                  style={{
                    fontFamily: 'var(--display)',
                    fontSize: 'clamp(22px, 2.5vw, 32px)',
                    lineHeight: 1.2,
                    margin: 0,
                    fontWeight: 400,
                  }}
                >
                  &ldquo;{pq.quote}&rdquo;
                </blockquote>
                <div className="eyebrow" style={{ marginTop: 20 }}>
                  {pq.source}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <div className="eyebrow reveal" style={{ marginBottom: 30 }}>
          &mdash; Booking
        </div>
        <h2 className="reveal" style={{ '--rd': '120ms' }}>
          Let&apos;s <span className="it">play.</span>
        </h2>
        <p className="reveal" style={{ '--rd': '240ms' }}>
          Bars, venues, festivals, private events. Get in touch.
        </p>
        <Link className="btn btn--solid reveal" style={{ '--rd': '320ms' }} href="/artist/booking">
          Book Juliana <span className="arrow">&rarr;</span>
        </Link>
      </section>

      <JsonLd
        data={[
          musicGroupSchema(),
          eventListSchema(upcoming.length > 0 ? upcoming : past.slice(0, 3)),
          breadcrumbList([
            { name: 'Home', path: '/' },
            { name: 'Artist', path: '/artist' },
          ]),
        ]}
      />
    </div>
  );
}
