import { Link } from 'react-router-dom';
import { useReveal } from '../hooks/useReveal';
import { ARTIST_BIO, STATS, PRESS_QUOTES, PRESS_ARTICLES, NOTABLE_VENUES } from './constants';

export function Press() {
  useReveal();

  return (
    <div className="page-fade artist-theme">
      <div className="wrap">
        <section className="svc-page-hero">
          <div className="eyebrow">Electronic press kit</div>
          <h1>Press.</h1>
        </section>

        <section className="block" style={{ paddingTop: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80 }} className="about-cols">
            <div>
              <div className="eyebrow reveal" style={{ marginBottom: 24 }}>Bio</div>
              {ARTIST_BIO.split('\n\n').map((p, i) => (
                <p key={i} className="reveal" style={{ '--rd': `${i * 100}ms`, fontFamily: 'var(--serif)', fontSize: 19, lineHeight: 1.65, color: 'var(--ink-soft)', fontWeight: 300, margin: '0 0 22px' }}>
                  {p}
                </p>
              ))}
            </div>
            <div>
              <div className="eyebrow reveal" style={{ marginBottom: 24 }}>Press photos</div>
              <div style={{ display: 'grid', gap: 16 }}>
                <div className="ken reveal">
                  <img src="/img/juliana-portrait.jpg" alt="Juliana Beltran press photo" style={{ width: '100%', aspectRatio: '4/5', objectFit: 'cover' }} />
                </div>
                <div className="ken reveal" style={{ '--rd': '120ms' }}>
                  <img src="/img/juliana-goldenhour.png" alt="Juliana Beltran golden hour" style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', objectPosition: '50% 52%' }} />
                </div>
              </div>
              <p className="reveal" style={{ '--rd': '200ms', fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--muted)', fontStyle: 'italic', marginTop: 12 }}>
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
            <div className="eyebrow reveal" style={{ marginBottom: 30 }}>Press mentions</div>
            <div className="press-quotes-grid">
              {PRESS_QUOTES.map((pq, i) => (
                <div key={i} className="press-quote-card reveal" style={{ '--rd': `${i * 100}ms` }}>
                  <blockquote style={{ fontFamily: 'var(--display)', fontSize: 'clamp(20px, 2vw, 28px)', lineHeight: 1.2, margin: 0, fontWeight: 400 }}>
                    &ldquo;{pq.quote}&rdquo;
                  </blockquote>
                  <div className="eyebrow" style={{ marginTop: 16 }}>{pq.source}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* In the press */}
        <section className="block" style={{ paddingTop: 20, paddingBottom: 60 }}>
          <div className="wrap">
            <div className="eyebrow reveal" style={{ marginBottom: 30 }}>In the press</div>
            <div className="articles-list">
              {PRESS_ARTICLES.map((a, i) => (
                <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className="article-row reveal" style={{ '--rd': `${i * 80}ms` }}>
                  <div className="article-source">
                    <span className="eyebrow">{a.source}</span>
                    <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--muted)', fontSize: 13 }}>{a.date}</span>
                  </div>
                  <div className="article-body">
                    <div style={{ fontFamily: 'var(--display)', fontSize: 'clamp(20px, 2.2vw, 28px)', fontWeight: 400, lineHeight: 1.1, marginBottom: 8 }}>{a.title}</div>
                    <p style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--ink-soft)', fontWeight: 300, margin: 0, lineHeight: 1.5 }}>{a.excerpt}</p>
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
            <div className="eyebrow reveal" style={{ marginBottom: 30 }}>Notable</div>
            <div className="press-strip reveal">
              {NOTABLE_VENUES.map((v) => (
                <span key={v}>{v}</span>
              ))}
            </div>
          </div>
        </section>

        {/* Technical */}
        <section className="block" style={{ paddingTop: 20, paddingBottom: 40, borderTop: '1px solid var(--rule)' }}>
          <div className="wrap">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60 }} className="about-cols">
              <div>
                <div className="eyebrow reveal" style={{ marginBottom: 16 }}>Technical rider</div>
                <p className="reveal" style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--ink-soft)', fontWeight: 300 }}>
                  Available on request. Please include event details in your booking inquiry.
                </p>
              </div>
              <div>
                <div className="eyebrow reveal" style={{ marginBottom: 16 }}>Stage plot</div>
                <p className="reveal" style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--ink-soft)', fontWeight: 300 }}>
                  Available on request. Configurations for solo, duo, and full band.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="cta">
          <h2>Ready to <span className="it">book?</span></h2>
          <p>Get in touch with details about your event.</p>
          <Link className="btn btn--solid" to="/artist/booking">
            Booking inquiry <span className="arrow">&rarr;</span>
          </Link>
        </section>
      </div>
    </div>
  );
}
