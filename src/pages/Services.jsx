import { Link } from 'react-router-dom';
import { useReveal } from '../hooks/useReveal';
import { SERVICES } from '../data/constants';

export function Services() {
  useReveal();

  return (
    <div className="page-fade">
      <div className="wrap">
        <section className="svc-page-hero">
          <div className="eyebrow">A studio menu &middot; Updated 2026</div>
          <h1>Lessons &amp; <span className="it">coaching.</span></h1>
          <p style={{ fontFamily: 'var(--serif)', fontSize: 20, lineHeight: 1.55, color: 'var(--ink-soft)', maxWidth: 640, marginTop: 24, fontWeight: 300 }}>
            Every session is personalized. Mix and match disciplines, or focus on one craft deeply — the structure shifts with your goals.
          </p>
        </section>

        {SERVICES.map((s, i) => (
          <section key={s.n} className={`svc-detail${i % 2 === 1 ? ' alt' : ''}`}>
            <div>
              <div className="n">No. {s.n}</div>
            </div>
            <div>
              <h2>{s.name}</h2>
              <p className="lead">{s.lead}</p>
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom: 16 }}>Lessons may include</div>
              <ul>
                {s.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          </section>
        ))}

        <section className="cta" style={{ paddingTop: 100 }}>
          <h2>Not sure where to <span className="it">start?</span></h2>
          <p>Book a free 15-minute consultation. We'll talk through your goals and shape a path that fits.</p>
          <Link className="btn btn--solid" to="/contact">
            Free consultation <span className="arrow">&rarr;</span>
          </Link>
        </section>
      </div>
    </div>
  );
}
