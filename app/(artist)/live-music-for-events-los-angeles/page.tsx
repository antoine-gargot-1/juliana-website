import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { JsonLd } from '@/components/JsonLd';
import { Reveal } from '@/components/Reveal';
import { EVENT_PACKAGES, EVENT_SERVICE_AREAS, liveMusicServiceSchema } from '@/lib/schema';
import { EMAIL } from '@/lib/site';
import { breadcrumbList, pageMeta } from '@/lib/seo';

const REPERTOIRE = [
  { name: 'Cumbia', note: 'Colombian roots, dancefloor-ready' },
  { name: 'Vallenato', note: 'Accordion-led classics on request' },
  { name: 'Salsa', note: 'Clásicos and modern crossovers' },
  { name: 'Bachata', note: 'Romantic, close-hold sets' },
  { name: 'Boleros', note: 'For the abuelos and the first dance' },
  { name: 'English pop', note: 'Contemporary and throwback covers' },
];

const OCCASIONS = [
  'Weddings — ceremony, cocktail hour and reception',
  'Quinceañeras — vals, surprise dance and party sets',
  'Corporate events, holiday parties and product launches',
  'Private birthdays, anniversaries and backyard parties',
  'Galas, fundraisers and cultural celebrations',
  'Restaurant, hotel and winery residencies',
];

export const metadata: Metadata = pageMeta({
  title: 'Live Music for Events in Los Angeles — Bilingual Latin & Pop Vocalist',
  description:
    'Hire a bilingual Colombian vocalist for weddings, quinceañeras, corporate and private events across Los Angeles, Orange County, San Diego, Palm Springs and Santa Barbara. Cumbia, vallenato, salsa, bachata, boleros and English pop.',
  path: '/live-music-for-events-los-angeles',
});

export default function LiveMusicForEventsPage() {
  return (
    <div className="page-fade artist-theme">
      <Reveal />
      <div className="wrap">
        <section className="svc-page-hero">
          <div className="eyebrow">Private &amp; corporate booking &middot; Southern California</div>
          <h1>
            Live music for <span className="it">events.</span>
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
            I am Juliana Beltran, a Colombian singer-songwriter based in Los Angeles. I sing in
            Spanish and English, and I play private and corporate events across Southern California
            — from a solo voice-and-guitar ceremony set to a full band that keeps a reception on its
            feet until the lights come up.
          </p>
          <div style={{ marginTop: 32 }}>
            <Link className="btn btn--solid" href="/artist/booking">
              Check your date <span className="arrow">&rarr;</span>
            </Link>
          </div>
        </section>

        <section className="block" style={{ paddingTop: 40, paddingBottom: 40 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80 }} className="about-cols">
            <div>
              <div className="eyebrow reveal" style={{ marginBottom: 24 }}>
                Bilingual, by default
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
                Most events in Los Angeles have two rooms inside them: the family that grew up on
                vallenato and boleros, and the friends who want the songs they know from the radio.
                A bilingual singer solves that without a hard cut between sets. I move between
                Spanish and English inside the same hour, read the floor, and adjust as the night
                changes.
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
                I have toured internationally as a vocalist for Amanda Miguel, played rooms like
                Hotel Cafe and Harvard and Stone in Los Angeles, and released original music that
                sits on Spotify editorial playlists. That means a professional stage presence, a
                reliable soundcheck, and someone who has handled a room that has gone quiet before.
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
                MC duties, bilingual announcements, a specific first-dance arrangement, a
                surprise-dance rehearsal for a quinceañera — all of it can be built into the
                booking. Tell me what the moment needs and I will arrange it.
              </p>
            </div>
            <div className="ken reveal" style={{ '--rd': '160ms' }}>
              <Image
                src="/img/juliana-goldenhour.png"
                alt="Juliana Beltran performing live at an event in Los Angeles"
                width={1990}
                height={3355}
                sizes="(max-width: 920px) 100vw, 45vw"
                style={{ width: '100%', aspectRatio: '4/5', objectFit: 'cover', height: 'auto' }}
              />
            </div>
          </div>
        </section>

        <section className="block" style={{ paddingTop: 20, paddingBottom: 40 }}>
          <div className="eyebrow reveal" style={{ marginBottom: 30 }}>
            Repertoire
          </div>
          <div className="styles-grid">
            {REPERTOIRE.map((r, i) => (
              <div className="style-card reveal" style={{ '--rd': `${i * 60}ms` }} key={r.name}>
                <div className="n">No. {String(i + 1).padStart(2, '0')}</div>
                <div className="name">{r.name}</div>
                <div
                  style={{
                    fontFamily: 'var(--serif)',
                    fontSize: 14,
                    color: 'var(--muted)',
                    fontStyle: 'italic',
                    marginTop: 8,
                  }}
                >
                  {r.note}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="block" style={{ paddingTop: 40, paddingBottom: 40 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80 }} className="about-cols">
            <div>
              <div className="eyebrow reveal" style={{ marginBottom: 24 }}>
                Formats
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, borderTop: '1px solid var(--rule)' }}>
                {EVENT_PACKAGES.map((p, i) => (
                  <li
                    key={p.name}
                    className="reveal"
                    style={{
                      '--rd': `${i * 80}ms`,
                      padding: '20px 0',
                      borderBottom: '1px solid var(--rule)',
                    }}
                  >
                    <div
                      style={{
                        fontFamily: 'var(--display)',
                        fontSize: 'clamp(20px, 2.2vw, 26px)',
                        fontWeight: 400,
                        marginBottom: 6,
                      }}
                    >
                      {p.name}
                    </div>
                    <p
                      style={{
                        fontFamily: 'var(--serif)',
                        fontSize: 16,
                        color: 'var(--ink-soft)',
                        fontWeight: 300,
                        margin: 0,
                        lineHeight: 1.55,
                      }}
                    >
                      {p.description}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="eyebrow reveal" style={{ marginBottom: 24 }}>
                Occasions
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, borderTop: '1px solid var(--rule)' }}>
                {OCCASIONS.map((o, i) => (
                  <li
                    key={o}
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
                    <span>{o}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="block" style={{ paddingTop: 20, paddingBottom: 40 }}>
          <div className="eyebrow reveal" style={{ marginBottom: 24 }}>
            Where I play
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
            Based in Los Angeles and regularly travelling for events across Southern California.
            Travel beyond these areas — and nationally or internationally — is quoted on request.
          </p>
          <div className="press-strip reveal">
            {EVENT_SERVICE_AREAS.map((area) => (
              <span key={area}>{area}</span>
            ))}
          </div>
        </section>

        <section className="block" style={{ paddingTop: 20, paddingBottom: 40 }}>
          <div className="eyebrow reveal" style={{ marginBottom: 24 }}>
            How booking works
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
              margin: '0 0 18px',
            }}
          >
            Send the date, the venue or city, the rough guest count and the format you have in mind.
            I reply within 48 hours with availability and a quote. Pricing depends on the format,
            the set length and travel, so every quote is written for the specific event rather than
            pulled off a price list.
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
              maxWidth: 760,
              margin: 0,
            }}
          >
            Once the date is held, we agree the song list, any special arrangements and the timing
            of each set with your planner or coordinator. A technical rider and stage plot are
            available for venues that need them. If you would rather write directly,{' '}
            <a href={`mailto:${EMAIL}`} style={{ color: 'var(--accent)' }}>
              {EMAIL}
            </a>{' '}
            reaches me too.
          </p>
        </section>

        <section className="cta">
          <div className="eyebrow reveal" style={{ marginBottom: 30 }}>
            &mdash; Booking
          </div>
          <h2 className="reveal" style={{ '--rd': '120ms' }}>
            Tell me about your <span className="it">event.</span>
          </h2>
          <p className="reveal" style={{ '--rd': '240ms' }}>
            Date, place, guest count — that is enough to start. Reply within 48 hours.
          </p>
          <Link className="btn btn--solid reveal" style={{ '--rd': '320ms' }} href="/artist/booking">
            Booking inquiry <span className="arrow">&rarr;</span>
          </Link>
        </section>
      </div>

      <JsonLd
        data={[
          liveMusicServiceSchema(),
          breadcrumbList([
            { name: 'Home', path: '/' },
            { name: 'Artist', path: '/artist' },
            {
              name: 'Live Music for Events in Los Angeles',
              path: '/live-music-for-events-los-angeles',
            },
          ]),
        ]}
      />
    </div>
  );
}
