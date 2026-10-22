import type { Metadata } from 'next';
import Link from 'next/link';

import { JsonLd } from '@/components/JsonLd';
import { Reveal } from '@/components/Reveal';
import { DISCOGRAPHY, PLAYLISTS } from '@/lib/content';
import { musicGroupSchema } from '@/lib/schema';
import { breadcrumbList, pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta({
  title: 'Music — Discography, Singles & Spotify Playlists',
  description:
    'Listen to Juliana Beltran: original Latin pop and indie pop singles, collaborations, and the Spotify editorial playlists her music has been featured on.',
  path: '/artist/music',
});

export default function MusicPage() {
  return (
    <div className="page-fade artist-theme">
      <Reveal />
      <div className="wrap">
        <section className="svc-page-hero">
          <div className="eyebrow">Discography &amp; features</div>
          <h1>Music.</h1>
        </section>

        <section className="block" style={{ paddingTop: 40 }}>
          <div className="listen-grid" style={{ gap: 60 }}>
            <div>
              <div className="spotify-wrap reveal">
                <iframe
                  title="Juliana Beltran on Spotify"
                  src="https://open.spotify.com/embed/artist/5NfNMKwOPzCw9S1s3OMS6z?utm_source=generator&theme=0"
                  width="100%"
                  height="420"
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                />
              </div>
            </div>
            <div>
              <div className="eyebrow reveal" style={{ marginBottom: 16 }}>
                Releases
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, borderTop: '1px solid var(--rule)' }}>
                {DISCOGRAPHY.map((d, i) => (
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
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>
                      {d.title}{' '}
                      <em style={{ color: 'var(--muted)', fontSize: 14, marginLeft: 8 }}>
                        &middot; {d.type}
                      </em>
                    </span>
                    <span className="eyebrow">{d.status}</span>
                  </li>
                ))}
              </ul>
              <div className="eyebrow reveal" style={{ marginBottom: 20, marginTop: 50 }}>
                Featured in playlists
              </div>
              <ul className="playlist-list reveal">
                {PLAYLISTS.map((p) => (
                  <li key={p.name}>
                    <a href={p.url} target="_blank" rel="noopener noreferrer">
                      <span className="playlist-name">{p.name}</span>
                      <span className="playlist-arrow">↗</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="cta">
          <h2>
            Book <span className="it">Juliana.</span>
          </h2>
          <p>Bars, venues, festivals and private events.</p>
          <Link className="btn btn--solid" href="/artist/booking">
            Booking inquiry <span className="arrow">&rarr;</span>
          </Link>
        </section>
      </div>

      <JsonLd
        data={[
          musicGroupSchema(),
          breadcrumbList([
            { name: 'Home', path: '/' },
            { name: 'Artist', path: '/artist' },
            { name: 'Music', path: '/artist/music' },
          ]),
        ]}
      />
    </div>
  );
}
