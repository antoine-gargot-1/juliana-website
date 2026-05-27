import { Link } from 'react-router-dom';
import { useReveal } from '../hooks/useReveal';

const BACKGROUND = [
  'Vocal coaching for students ages 5 to 70+',
  'Artist coaching & songwriting mentorship',
  'Live performance in multiple countries',
  'Studio recording experience',
  'Professional performance work in LA',
  'Vocalist for international artist Amanda Miguel',
];

const STYLES = ['Pop', 'Latin Pop', 'Indie Pop', 'Singer-Songwriter', 'Acoustic', 'Alternative'];

export function About() {
  useReveal();

  return (
    <div className="page-fade">
      <div className="wrap">
        <section className="about-hero">
          <div>
            <div className="eyebrow reveal" style={{ marginBottom: 24 }}>Chapter One &middot; Meet Juliana</div>
            <h1 className="reveal" style={{ '--rd': '80ms' }}>Meet <span className="it">Juliana.</span></h1>
            <p className="reveal" style={{ '--rd': '160ms', fontFamily: 'var(--serif)', fontSize: 22, lineHeight: 1.55, color: 'var(--ink-soft)', maxWidth: 520, fontWeight: 300, margin: 0 }}>
              Colombian singer-songwriter, performer, and music coach based in Los Angeles. Technical training meets creativity, artistry, and emotional expression.
            </p>
          </div>
          <div className="img reveal-clip" style={{ '--rd': '200ms' }}>
            <img src="/img/juliana-portrait.jpg" alt="Juliana portrait" />
          </div>
        </section>

        <section className="block" style={{ paddingTop: 40 }}>
          <div className="about-bio" style={{ maxWidth: 760, margin: '0 auto' }}>
            <p className="reveal">
              With years of experience teaching singers and musicians of all ages, Juliana combines technical training with creativity, artistry, and emotional expression. Her approach focuses on helping students feel <em style={{ fontFamily: 'var(--serif)', fontStyle: 'italic' }}>confident, connected, and inspired</em> while building real musical skills.
            </p>
            <p className="reveal" style={{ '--rd': '120ms' }}>
              As an active recording artist and performer, Juliana understands the realities of pursuing music professionally — and brings that experience directly into her teaching.
            </p>
          </div>
        </section>

        <div className="pull reveal">
          <blockquote>
            Music should feel <span className="it">expressive, joyful, and personal.</span> My goal is not only to help students improve technically — but to help them discover their voice.
          </blockquote>
          <div className="eyebrow" style={{ marginTop: 30 }}>Teaching Philosophy</div>
        </div>

        <section className="block" style={{ paddingTop: 40 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80 }} className="about-cols">
            <div>
              <div className="eyebrow reveal" style={{ marginBottom: 24 }}>Background</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, borderTop: '1px solid var(--rule)' }}>
                {BACKGROUND.map((it, i) => (
                  <li key={i} className="reveal" style={{ '--rd': `${i * 80}ms`, padding: '18px 0', borderBottom: '1px solid var(--rule)', fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 300, display: 'flex', gap: 18 }}>
                    <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--accent)', fontSize: 14, minWidth: 30 }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="eyebrow reveal" style={{ marginBottom: 24 }}>Styles I Specialize In</div>
              <div className="styles-grid">
                {STYLES.map((s, i) => (
                  <div className="style-card reveal" style={{ '--rd': `${i * 60}ms` }} key={s}>
                    <div className="n">No. {String(i + 1).padStart(2, '0')}</div>
                    <div className="name">{s}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="cta">
          <h2 className="reveal">Let's <span className="it">make</span> something.</h2>
          <p className="reveal" style={{ '--rd': '120ms' }}>Lessons are personalized — built around your goals, your interests, and where you are right now.</p>
          <Link className="btn btn--solid reveal" style={{ '--rd': '240ms' }} to="/coach/contact">
            Start the conversation <span className="arrow">&rarr;</span>
          </Link>
        </section>
      </div>
    </div>
  );
}
