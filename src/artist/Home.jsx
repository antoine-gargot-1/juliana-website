import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useReveal } from '../hooks/useReveal';
import { useParallax } from '../hooks/useParallax';
import { STATS, PRESS_QUOTES, UPCOMING_SHOWS, PAST_SHOWS, PLAYLISTS } from './constants';

export function ArtistHome() {
  const heroBgRef = useRef(null);
  const heroContentRef = useRef(null);
  useReveal();
  useParallax(heroBgRef, heroContentRef);

  const nextShows = UPCOMING_SHOWS.length > 0 ? UPCOMING_SHOWS.slice(0, 3) : PAST_SHOWS.slice(0, 3);

  return (
    <div className="page-fade artist-theme">
      {/* Hero */}
      <section className="hero">
        <div className="hero-bg" ref={heroBgRef}>
          <img src="/img/juliana-goldenhour.png" alt="Juliana Beltran performing" />
        </div>
        <div className="hero-content" ref={heroContentRef}>
          <div className="hero-text">
            <div className="hero-eyebrow reveal">
              <span className="line" />
              <span className="eyebrow">Latin pop &middot; Indie pop &middot; Singer-songwriter</span>
            </div>
            <h1>
              <span className="reveal-up"><span style={{ '--rd': '50ms' }}>Juliana</span></span><br />
              <span className="reveal-up"><span className="it" style={{ '--rd': '180ms' }}>Beltran</span></span>
            </h1>
            <p className="hero-sub reveal" style={{ '--rd': '420ms' }}>
              Live shows, festivals &amp; collaborations. Los Angeles.
            </p>
            <div className="hero-ctas reveal" style={{ '--rd': '580ms' }}>
              <Link className="btn btn--solid" to="/artist/booking">
                Book now <span className="arrow">&rarr;</span>
              </Link>
              <Link className="btn btn--ghost" to="/artist/press">
                Press kit
              </Link>
            </div>
          </div>
        </div>
        <div className="hero-scroll">
          <span>Scroll</span>
          <span className="bar" />
        </div>
      </section>

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
          <div className="eyebrow reveal" style={{ marginBottom: 24 }}>— Listen</div>
          <h2 className="reveal" style={{ fontFamily: 'var(--display)', fontSize: 'clamp(48px, 6vw, 96px)', lineHeight: 0.95, margin: '0 0 50px', fontWeight: 400 }}>
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
              <div className="eyebrow" style={{ marginBottom: 20 }}>Featured in playlists</div>
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
              <Link className="btn" to="/artist/music" style={{ marginTop: 30 }}>
                All music <span className="arrow">&rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Upcoming shows */}
      <section className="block" style={{ paddingTop: 60, paddingBottom: 60 }}>
        <div className="wrap">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 20, marginBottom: 40 }}>
            <div>
              <div className="eyebrow reveal">— Live</div>
              <h2 className="reveal" style={{ '--rd': '80ms', fontFamily: 'var(--display)', fontSize: 'clamp(38px, 5vw, 68px)', lineHeight: 1, margin: '12px 0 0', fontWeight: 400 }}>
                {UPCOMING_SHOWS.length > 0 ? <>Upcoming <span className="it">shows.</span></> : <>Recent <span className="it">shows.</span></>}
              </h2>
            </div>
            <Link className="btn reveal" to="/artist/live" style={{ '--rd': '160ms' }}>
              All dates <span className="arrow">&rarr;</span>
            </Link>
          </div>
          <div className="shows-list">
            {nextShows.map((show, i) => {
              const d = new Date(show.date);
              return (
                <div key={i} className="show-row reveal" style={{ '--rd': `${i * 80}ms` }}>
                  <div className="show-date">
                    <span className="show-month">{d.toLocaleDateString('en-US', { month: 'short' })}</span>
                    <span className="show-day">{d.getDate()}</span>
                  </div>
                  <div className="show-info">
                    <div className="show-venue">{show.venue}</div>
                    <div className="show-city">{show.city}</div>
                  </div>
                  <div className="show-action">
                    {show.tickets ? (
                      <a href={show.tickets} target="_blank" rel="noopener noreferrer" className="btn">Tickets</a>
                    ) : (
                      <span className="eyebrow">Coming soon</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Press quotes */}
      <section className="block" style={{ paddingTop: 60, paddingBottom: 80, background: 'var(--bg-deep)' }}>
        <div className="wrap">
          <div className="eyebrow reveal" style={{ textAlign: 'center', marginBottom: 50 }}>— Press</div>
          <div className="press-quotes-grid">
            {PRESS_QUOTES.map((pq, i) => (
              <div key={i} className="press-quote-card reveal" style={{ '--rd': `${i * 100}ms` }}>
                <blockquote style={{ fontFamily: 'var(--display)', fontSize: 'clamp(22px, 2.5vw, 32px)', lineHeight: 1.2, margin: 0, fontWeight: 400 }}>
                  &ldquo;{pq.quote}&rdquo;
                </blockquote>
                <div className="eyebrow" style={{ marginTop: 20 }}>{pq.source}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <div className="eyebrow reveal" style={{ marginBottom: 30 }}>— Booking</div>
        <h2 className="reveal" style={{ '--rd': '120ms' }}>
          Let's <span className="it">play.</span>
        </h2>
        <p className="reveal" style={{ '--rd': '240ms' }}>
          Bars, venues, festivals, private events. Get in touch.
        </p>
        <Link className="btn btn--solid reveal" style={{ '--rd': '320ms' }} to="/artist/booking">
          Book Juliana <span className="arrow">&rarr;</span>
        </Link>
      </section>
    </div>
  );
}
