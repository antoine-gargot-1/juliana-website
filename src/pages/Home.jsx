import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useReveal } from '../hooks/useReveal';
import { useParallax } from '../hooks/useParallax';
import { Marquee } from '../components/Marquee';
import { SERVICES, TESTIMONIALS, CREDITS } from '../data/constants';

export function Home() {
  const [ti, setTi] = useState(0);
  const heroBgRef = useRef(null);
  const heroContentRef = useRef(null);

  useReveal();
  useParallax(heroBgRef, heroContentRef);

  useEffect(() => {
    const id = setInterval(() => setTi((v) => (v + 1) % TESTIMONIALS.length), 7000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="page-fade">
      {/* Hero */}
      <section className="hero">
        <div className="hero-bg" ref={heroBgRef}>
          <img
            src="/img/juliana-goldenhour.png"
            alt="Juliana Beltran with guitar at golden hour"
          />
        </div>
        <div className="hero-corner">
          <div className="mark">musica</div>
          <span>Los Angeles &middot; Online &amp; In-Person</span>
        </div>
        <div className="hero-content" ref={heroContentRef}>
          <div className="hero-text">
            <div className="hero-eyebrow reveal">
              <span className="line" />
              <span className="eyebrow">Hola — soy Juliana</span>
            </div>
            <h1>
              <span className="reveal-up">
                <span style={{ '--rd': '50ms' }}>Find your</span>
              </span>{' '}
              <span className="reveal-up">
                <span className="it" style={{ '--rd': '180ms' }}>voice.</span>
              </span>
            </h1>
            <p className="hero-sub reveal" style={{ '--rd': '420ms' }}>
              Voice, guitar, piano &amp; songwriting lessons in Los Angeles — for anyone learning to sing their own song.
            </p>
            <div className="hero-ctas reveal" style={{ '--rd': '580ms' }}>
              <Link className="btn btn--solid" to="/contact">
                Book a lesson <span className="arrow">&rarr;</span>
              </Link>
              <Link className="btn btn--ghost" to="/contact">
                Say hi
              </Link>
            </div>
          </div>
        </div>
        <div className="hero-scroll">
          <span>Scroll</span>
          <span className="bar" />
        </div>
      </section>

      {/* Marquee */}
      <Marquee />

      {/* Intro */}
      <section className="block" style={{ paddingTop: 130 }}>
        <div className="wrap">
          <div className="intro">
            <div className="intro-image ken">
              <img src="/img/juliana-aytu.jpg" alt="Juliana Beltran portrait" />
            </div>
            <div className="intro-text">
              <p className="lead reveal">
                I'm a Colombian singer-songwriter who teaches because I love it. My lessons are warm, personal, and built around <span className="it">you</span> — your voice, your taste, your songs.
              </p>
              <p className="reveal" style={{ '--rd': '120ms' }}>
                Whether it's your first chord or your first show, we'll find your sound together.
              </p>
              <div className="signature reveal" style={{ '--rd': '300ms' }}>— Juliana</div>
            </div>
          </div>
        </div>
      </section>

      {/* What I teach */}
      <section className="block" style={{ paddingTop: 80, position: 'relative' }}>
        <div className="wrap">
          <div className="teach-grid">
            <div className="teach-label">
              <div className="big-num reveal">05<span className="sm">disciplines</span></div>
              <div className="eyebrow reveal" style={{ '--rd': '200ms', marginTop: 16 }}>What I teach</div>
            </div>
            <ul className="teach-list">
              {SERVICES.slice(0, 5).map((s, i) => (
                <li key={s.n} className="reveal" style={{ '--rd': `${i * 80}ms` }}>
                  <Link to="/services" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <span className="teach-name">{s.name}</span>
                    <span className="teach-arrow">&rarr;</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Listen — Spotify */}
      <section className="listen">
        <div className="float-script">canciones</div>
        <div className="wrap">
          <div className="listen-grid">
            <div>
              <div className="eyebrow reveal">— Listen</div>
              <h2 className="reveal" style={{ '--rd': '120ms' }}>
                Songs in <span className="it">the world.</span>
              </h2>
              <p className="reveal" style={{ '--rd': '240ms' }}>
                I write, record, and release original music — Latin pop, indie pop, singer-songwriter. Press play, then let's talk about <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>your</em> song.
              </p>
              <ul className="release-list reveal" style={{ '--rd': '320ms' }}>
                <li>
                  <span className="yr">2025</span>
                  <span className="ttl">New single <em>&middot; in progress</em></span>
                  <span className="tag">Coming soon</span>
                </li>
                <li>
                  <span className="yr">2024</span>
                  <span className="ttl">Touring vocals <em>&middot; Amanda Miguel</em></span>
                  <span className="tag">Live</span>
                </li>
                <li>
                  <span className="yr">Always</span>
                  <span className="ttl">Originals &amp; collaborations</span>
                  <span className="tag">Streaming</span>
                </li>
              </ul>
              <a
                className="btn btn--solid"
                href="https://open.spotify.com/artist/5NfNMKwOPzCw9S1s3OMS6z"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open in Spotify <span className="arrow">&nearr;</span>
              </a>
            </div>
            <div className="spotify-wrap reveal" style={{ '--rd': '180ms' }}>
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
        </div>
      </section>

      {/* Why work with me */}
      <section className="block" style={{ paddingTop: 130, paddingBottom: 60 }}>
        <div className="wrap">
          <div className="why">
            <div className="why-image ken">
              <img src="/img/juliana-guitar-couch.jpg" alt="Juliana Beltran with guitar" />
            </div>
            <div className="why-text" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div className="eyebrow reveal" style={{ marginBottom: 24 }}>— Why work with me</div>
              <p
                className="reveal"
                style={{
                  fontFamily: 'var(--display)',
                  fontSize: 'clamp(30px, 3.6vw, 52px)',
                  lineHeight: 1.12,
                  margin: 0,
                  fontWeight: 400,
                  letterSpacing: '-0.005em',
                  '--rd': '120ms',
                }}
              >
                I still <span className="it">perform,</span> still{' '}
                <span className="it">write,</span> still{' '}
                <span className="it">tour.</span> Lessons feel honest because I'm doing the work too.
              </p>
              <ul className="credits reveal" style={{ marginTop: 36, '--rd': '280ms' }}>
                {CREDITS.slice(0, 4).map((c, i) => (
                  <li key={i}>
                    <span className="yr">{c.yr}</span>
                    <span className="what">
                      {c.what}
                      <em>{c.em}</em>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Press strip */}
      <section className="block" style={{ paddingTop: 80, paddingBottom: 60 }}>
        <div className="wrap">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 20, marginBottom: 10 }}>
            <span className="eyebrow reveal">— Selected work &middot; 2024 — 2026</span>
          </div>
          <div className="press-strip reveal">
            <span>Amanda Miguel <em style={{ fontStyle: 'normal', color: 'var(--muted)', fontSize: 13, marginLeft: 8 }}>&middot; touring vocalist</em></span>
            <span>Latin GRAMMY Sessions</span>
            <span>Hotel Cafe &middot; LA</span>
            <span>Spotify Editorial</span>
            <span>NPR Tiny Sessions</span>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="testi">
        <div className="testi-wrap">
          <div className="eyebrow reveal" style={{ color: 'var(--accent)', marginBottom: 40 }}>— What students say</div>
          <p className="testi-quote serif reveal">{TESTIMONIALS[ti].quote}</p>
          <div className="testi-name reveal" style={{ '--rd': '120ms' }}>— {TESTIMONIALS[ti].name}</div>
          <div className="testi-nav">
            {TESTIMONIALS.map((_, i) => (
              <div
                key={i}
                className={`testi-dot ${ti === i ? 'active' : ''}`}
                onClick={() => setTi(i)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <div className="eyebrow reveal" style={{ marginBottom: 30 }}>— Cuando quieras</div>
        <h2 className="reveal" style={{ '--rd': '120ms' }}>
          Come <span className="it">sing.</span>
        </h2>
        <p className="reveal" style={{ '--rd': '240ms' }}>
          First step is a free consult. We'll talk through your goals — no pressure, no script.
        </p>
        <Link className="btn btn--solid reveal" style={{ '--rd': '320ms' }} to="/contact">
          Book a lesson <span className="arrow">&rarr;</span>
        </Link>
      </section>
    </div>
  );
}
