'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

/**
 * Desktop nav. Six items is the ceiling before this row starts wrapping into the
 * brand on a laptop, so Pricing had to earn its slot rather than be added to it:
 * a published price is the single biggest objection-remover on a coaching site,
 * and burying it costs more than any of these links.
 *
 * `Book` is deliberately NOT here — it is the `nav-cta` below, which is the one
 * element on the page styled to be clicked.
 */
const links: [string, string][] = [
  ['/coach', 'Home'],
  ['/coach/about', 'About'],
  // Path unchanged (it is indexed); the label is shorter than "Services" and
  // says what the page is.
  ['/coach/services', 'Lessons'],
  ['/coach/pricing', 'Pricing'],
  ['/coach/faq', 'FAQ'],
  ['/coach/contact', 'Contact'],
];

/**
 * The mobile sheet gets the booking link appended, because `.nav-cta` is
 * `display: none` under 860px (app/styles.css). Without this row the primary
 * call to action would be unreachable on the majority of the paid-search
 * traffic, which is mobile.
 */
const mobileLinks: [string, string][] = [...links, ['/coach/book', 'Free assessment']];

export function CoachNav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === '/coach';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const isScrolled = !isHome || scrolled;

  const switchToArtist = () => {
    localStorage.setItem('juliana-mode', 'artist');
    router.push('/artist');
  };

  return (
    <>
      <nav className={`nav ${isScrolled ? 'is-scrolled' : ''}`}>
        <div className="nav-inner">
          <Link className="brand" href="/coach">
            Juliana <span className="dot">&middot;</span> Beltran
          </Link>
          <div className="nav-links">
            {links.map(([path, label]) => (
              <Link
                key={path}
                className={`nav-link ${pathname === path ? 'active' : ''}`}
                href={path}
              >
                {label}
              </Link>
            ))}
            <button className="nav-link" onClick={switchToArtist} style={{ opacity: 0.5 }}>
              Artist &rarr;
            </button>
          </div>
          {/* The primary CTA is the free assessment, not a generic "book a
              lesson": the funnel's first step is the $0 assessment, and pointing
              the loudest element on the page at anything else costs conversions
              at the top of it. */}
          <Link className="nav-cta" href="/coach/book">
            Free Assessment
          </Link>
          <button
            className={`nav-hamburger ${menuOpen ? 'open' : ''}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </nav>
      <div className={`nav-mobile ${menuOpen ? 'open' : ''}`}>
        {mobileLinks.map(([path, label]) => (
          <Link
            key={path}
            className={pathname === path ? 'active' : ''}
            href={path}
            onClick={() => setMenuOpen(false)}
          >
            {label}
          </Link>
        ))}
        <button
          onClick={switchToArtist}
          style={{ fontFamily: 'var(--display)', fontSize: 36, color: 'var(--accent)' }}
        >
          Artist &rarr;
        </button>
      </div>
    </>
  );
}
