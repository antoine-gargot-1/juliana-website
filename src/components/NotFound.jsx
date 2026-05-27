import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="page-fade" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '80px 40px' }}>
      <div style={{ fontFamily: 'var(--display)', fontSize: 'clamp(120px, 20vw, 240px)', lineHeight: 0.85, color: 'var(--accent)', opacity: 0.9, letterSpacing: '-0.02em' }}>
        404
      </div>
      <h2 style={{ fontFamily: 'var(--display)', fontWeight: 400, fontSize: 'clamp(28px, 4vw, 48px)', margin: '20px 0 16px', letterSpacing: '-0.01em' }}>
        Page not <span className="it">found.</span>
      </h2>
      <p style={{ fontFamily: 'var(--serif)', fontSize: 19, color: 'var(--ink-soft)', maxWidth: 440, fontWeight: 300, lineHeight: 1.5 }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div style={{ display: 'flex', gap: 16, marginTop: 40, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link className="btn btn--solid" to="/coach">
          Lessons <span className="arrow">&rarr;</span>
        </Link>
        <Link className="btn" to="/artist">
          Artist <span className="arrow">&rarr;</span>
        </Link>
      </div>
    </div>
  );
}
