import { Link } from 'react-router-dom';
import { useReveal } from '../hooks/useReveal';
import { PLAYLISTS, DISCOGRAPHY } from './constants';

export function Music() {
  useReveal();

  return (
    <div className="page-fade artist-theme">
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
              <div className="eyebrow reveal" style={{ marginBottom: 24 }}>Featured in playlists</div>
              {PLAYLISTS.map((p) => (
                <div key={p.name} className="reveal" style={{ marginBottom: 20 }}>
                  <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 300 }}>
                    {p.name} &nearr;
                  </a>
                  <div className="spotify-wrap" style={{ marginTop: 12, borderRadius: 8 }}>
                    <iframe
                      title={p.name}
                      src={`https://open.spotify.com/embed/playlist/${p.embedId}?utm_source=generator&theme=0`}
                      width="100%"
                      height="152"
                      frameBorder="0"
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      loading="lazy"
                    />
                  </div>
                </div>
              ))}

              <div className="eyebrow reveal" style={{ marginBottom: 16, marginTop: 40 }}>Releases</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, borderTop: '1px solid var(--rule)' }}>
                {DISCOGRAPHY.map((d, i) => (
                  <li key={i} className="reveal" style={{ '--rd': `${i * 80}ms`, padding: '18px 0', borderBottom: '1px solid var(--rule)', fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 300, display: 'flex', justifyContent: 'space-between' }}>
                    <span>{d.title} <em style={{ color: 'var(--muted)', fontSize: 14, marginLeft: 8 }}>&middot; {d.type}</em></span>
                    <span className="eyebrow">{d.status}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="cta">
          <h2>Want to <span className="it">collaborate?</span></h2>
          <p>Open to features, co-writes, and creative partnerships.</p>
          <Link className="btn btn--solid" to="/artist/booking">
            Get in touch <span className="arrow">&rarr;</span>
          </Link>
        </section>
      </div>
    </div>
  );
}
