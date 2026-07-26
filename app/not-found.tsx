import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Page not found',
  description: 'The page you are looking for does not exist or has been moved.',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div
      className="page-fade"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        padding: '80px 40px',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--display)',
          fontSize: 'clamp(120px, 20vw, 240px)',
          lineHeight: 0.85,
          color: 'var(--accent)',
          opacity: 0.9,
          letterSpacing: '-0.02em',
        }}
      >
        404
      </div>
      <h2
        style={{
          fontFamily: 'var(--display)',
          fontWeight: 400,
          fontSize: 'clamp(28px, 4vw, 48px)',
          margin: '20px 0 16px',
          letterSpacing: '-0.01em',
        }}
      >
        Page not <span className="it">found.</span>
      </h2>
      <p
        style={{
          fontFamily: 'var(--serif)',
          fontSize: 19,
          color: 'var(--ink-soft)',
          maxWidth: 440,
          fontWeight: 300,
          lineHeight: 1.5,
        }}
      >
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div
        style={{
          display: 'flex',
          gap: 16,
          marginTop: 40,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        <Link className="btn btn--solid" href="/coach">
          Lessons <span className="arrow">&rarr;</span>
        </Link>
        <Link className="btn" href="/artist">
          Artist <span className="arrow">&rarr;</span>
        </Link>
      </div>
    </div>
  );
}
