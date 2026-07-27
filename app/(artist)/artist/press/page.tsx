import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { JsonLd } from '@/components/JsonLd';
import { Reveal } from '@/components/Reveal';
import { EpkViewTracker } from '@/components/artist/EpkViewTracker';
import { VideoFacade } from '@/components/artist/VideoFacade';
import {
  ARTIST_BIO,
  NOTABLE_VENUES,
  PRESS_ARTICLES,
  PRESS_QUOTES,
  PRIMARY_VIDEO,
  STATS,
  monthYear,
  videoLength,
} from '@/lib/content';
import { musicGroupSchema, videoObjectSchema } from '@/lib/schema';
import { breadcrumbList, pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta({
  title: 'Press Kit — Bio, Photos, Live Video & Coverage',
  description:
    'Electronic press kit for Juliana Beltran: live performance video, artist bio, high-resolution press photos, review quotes from FEMMUSIC, LOUD WOMEN and Jammerzine, technical rider and stage plot.',
  path: '/artist/press',
});

export default function PressPage() {
  return (
    <div className="page-fade artist-theme">
      <link rel="preconnect" href="https://i.ytimg.com" />
      <link rel="preconnect" href="https://www.youtube-nocookie.com" />

      <Reveal />
      <EpkViewTracker />
      <div className="wrap">
        <section className="svc-page-hero">
          <div className="eyebrow">Electronic press kit</div>
          <h1>Press.</h1>
        </section>

        {/* Live video, first thing on the page. This is the EPK a booking email
            links to, and a pitch without live footage gets ignored — so it goes
            above the bio, not below the press clippings. */}
        <section className="block" style={{ paddingTop: 20, paddingBottom: 60 }}>
          <div className="epk-video">
            <div className="reveal">
              <VideoFacade video={PRIMARY_VIDEO} placement="epk" primary posterPriority />
            </div>
            <div className="reveal" style={{ '--rd': '140ms' }}>
              <div className="video-primary-flag">
                <span className="line" />
                <span className="eyebrow">Watch this one</span>
              </div>
              <p
                style={{
                  fontFamily: 'var(--serif)',
                  fontSize: 19,
                  lineHeight: 1.6,
                  color: 'var(--ink-soft)',
                  fontWeight: 300,
                  margin: '0 0 22px',
                }}
              >
                {videoLength(PRIMARY_VIDEO)} of live performance &mdash; a complete song, one
                take, live vocal over a live four-piece band. No overdubs, no edit.
              </p>
              <Link className="btn btn--ghost" href="/artist/live-video">
                All live video <span className="arrow">&rarr;</span>
              </Link>
            </div>
          </div>
        </section>

        <section className="block" style={{ paddingTop: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80 }} className="about-cols">
            <div>
              <div className="eyebrow reveal" style={{ marginBottom: 24 }}>
                Bio
              </div>
              {ARTIST_BIO.split('\n\n').map((p, i) => (
                <p
                  key={i}
                  className="reveal"
                  style={{
                    '--rd': `${i * 100}ms`,
                    fontFamily: 'var(--serif)',
                    fontSize: 19,
                    lineHeight: 1.65,
                    color: 'var(--ink-soft)',
                    fontWeight: 300,
                    margin: '0 0 22px',
                  }}
                >
                  {p}
                </p>
              ))}
            </div>
            <div>
              <div className="eyebrow reveal" style={{ marginBottom: 24 }}>
                Press photos
              </div>
              <div style={{ display: 'grid', gap: 16 }}>
                <div className="ken reveal">
                  <Image
                    src="/img/juliana-portrait.jpg"
                    alt="Juliana Beltran press photo"
                    width={3365}
                    height={4206}
                    sizes="(max-width: 920px) 100vw, 45vw"
                    style={{ width: '100%', aspectRatio: '4/5', objectFit: 'cover', height: 'auto' }}
                  />
                </div>
                <div className="ken reveal" style={{ '--rd': '120ms' }}>
                  <Image
                    src="/img/juliana-goldenhour.png"
                    alt="Juliana Beltran golden hour"
                    width={1990}
                    height={3355}
                    sizes="(max-width: 920px) 100vw, 45vw"
                    style={{
                      width: '100%',
                      aspectRatio: '16/9',
                      objectFit: 'cover',
                      objectPosition: '50% 52%',
                      height: 'auto',
                    }}
                  />
                </div>
              </div>
              <p
                className="reveal"
                style={{
                  '--rd': '200ms',
                  fontFamily: 'var(--serif)',
                  fontSize: 14,
                  color: 'var(--muted)',
                  fontStyle: 'italic',
                  marginTop: 12,
                }}
              >
                High-resolution downloads available on request.
              </p>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="artist-stats" style={{ margin: '40px 0' }}>
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

        {/* Press quotes */}
        <section className="block" style={{ paddingTop: 40, paddingBottom: 40 }}>
          <div className="wrap">
            <div className="eyebrow reveal" style={{ marginBottom: 30 }}>
              Press mentions
            </div>
            <div className="press-quotes-grid">
              {PRESS_QUOTES.map((pq, i) => (
                <div key={i} className="press-quote-card reveal" style={{ '--rd': `${i * 100}ms` }}>
                  <blockquote
                    style={{
                      fontFamily: 'var(--display)',
                      fontSize: 'clamp(20px, 2vw, 28px)',
                      lineHeight: 1.2,
                      margin: 0,
                      fontWeight: 400,
                    }}
                  >
                    &ldquo;{pq.quote}&rdquo;
                  </blockquote>
                  <div className="eyebrow" style={{ marginTop: 16 }}>
                    {pq.source}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* In the press */}
        <section className="block" style={{ paddingTop: 20, paddingBottom: 60 }}>
          <div className="wrap">
            <div className="eyebrow reveal" style={{ marginBottom: 30 }}>
              In the press
            </div>
            <div className="articles-list">
              {PRESS_ARTICLES.map((a, i) => (
                <a
                  key={i}
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="article-row reveal"
                  style={{ '--rd': `${i * 80}ms` }}
                >
                  <div className="article-source">
                    <span className="eyebrow">{a.source}</span>
                    <time
                      dateTime={a.date}
                      style={{
                        fontFamily: 'var(--serif)',
                        fontStyle: 'italic',
                        color: 'var(--muted)',
                        fontSize: 13,
                      }}
                    >
                      {monthYear(a.date)}
                    </time>
                  </div>
                  <div className="article-body">
                    <div
                      style={{
                        fontFamily: 'var(--display)',
                        fontSize: 'clamp(20px, 2.2vw, 28px)',
                        fontWeight: 400,
                        lineHeight: 1.1,
                        marginBottom: 8,
                      }}
                    >
                      {a.title}
                    </div>
                    <p
                      style={{
                        fontFamily: 'var(--serif)',
                        fontSize: 15,
                        color: 'var(--ink-soft)',
                        fontWeight: 300,
                        margin: 0,
                        lineHeight: 1.5,
                      }}
                    >
                      {a.excerpt}
                    </p>
                  </div>
                  <div className="article-arrow">↗</div>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Notable */}
        <section className="block" style={{ paddingTop: 20, paddingBottom: 40 }}>
          <div className="wrap">
            <div className="eyebrow reveal" style={{ marginBottom: 30 }}>
              Notable
            </div>
            <div className="press-strip reveal">
              {NOTABLE_VENUES.map((v) => (
                <span key={v}>{v}</span>
              ))}
            </div>
          </div>
        </section>

        {/* Technical */}
        <section
          className="block"
          style={{ paddingTop: 20, paddingBottom: 40, borderTop: '1px solid var(--rule)' }}
        >
          <div className="wrap">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60 }} className="about-cols">
              <div>
                <div className="eyebrow reveal" style={{ marginBottom: 16 }}>
                  Technical rider
                </div>
                <p
                  className="reveal"
                  style={{
                    fontFamily: 'var(--serif)',
                    fontSize: 18,
                    color: 'var(--ink-soft)',
                    fontWeight: 300,
                  }}
                >
                  Available on request. Please include event details in your booking inquiry.
                </p>
              </div>
              <div>
                <div className="eyebrow reveal" style={{ marginBottom: 16 }}>
                  Stage plot
                </div>
                <p
                  className="reveal"
                  style={{
                    fontFamily: 'var(--serif)',
                    fontSize: 18,
                    color: 'var(--ink-soft)',
                    fontWeight: 300,
                  }}
                >
                  Available on request. Configurations for solo, duo, and full band.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="cta">
          <h2>
            Ready to <span className="it">book?</span>
          </h2>
          <p>Get in touch with details about your event.</p>
          <Link className="btn btn--solid" href="/artist/booking">
            Booking inquiry <span className="arrow">&rarr;</span>
          </Link>
        </section>
      </div>

      <JsonLd
        data={[
          musicGroupSchema(),
          videoObjectSchema(PRIMARY_VIDEO),
          breadcrumbList([
            { name: 'Home', path: '/' },
            { name: 'Artist', path: '/artist' },
            { name: 'Press', path: '/artist/press' },
          ]),
        ]}
      />
    </div>
  );
}
