'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

/**
 * Desktop nav. Six items is the ceiling before this row starts wrapping into the
 * brand on a laptop, so every slot has to be earned.
 *
 * ---------------------------------------------------------------------------
 * WHY "LESSONS" IS NOW TWO ITEMS, AND WHY IT NO LONGER POINTS AT /coach/services
 * ---------------------------------------------------------------------------
 * The single "Lessons" item used to point at /coach/services — a menu of six
 * disciplines with no price, no proof, no testimonial and no video on it. That
 * made the highest-intent link in the nav its biggest dead end, while the two
 * pages that actually combine proof → mechanics → rates → buy
 * (/coach/lessons/online and /coach/lessons/in-person) appeared nowhere in the
 * nav at all — footer only. So the two selling pages take the slot, split by the
 * only distinction a visitor cares about before reading anything: can I do this
 * from my house, or do I have to be in Los Angeles.
 *
 * `Home` paid for one of those slots. The `.brand` to the left of this row is
 * already a link to /coach on every page, which is where a reader looks for it
 * anyway, and it sits at z-index 30 — above the mobile sheet at 29 — so it stays
 * tappable even with the menu open. A second Home link cost a slot and bought
 * nothing.
 *
 * /coach/services keeps its URL (it is indexed) and stays reachable from the
 * footer and from the disciplines line on /coach.
 *
 * `Book` is deliberately NOT here — it is the `nav-cta` below, which is the one
 * element on the page styled to be clicked.
 */
const links: [string, string][] = [
  ['/coach/about', 'About'],
  ['/coach/lessons/online', 'Online'],
  // "In Person" rather than "In-Person · LA": the row is 11.5px at 0.22em
  // tracking, so a label with punctuation in it is the one that wraps first.
  ['/coach/lessons/in-person', 'In Person'],
  ['/coach/pricing', 'Pricing'],
  ['/coach/faq', 'FAQ'],
  ['/coach/contact', 'Contact'],
];

/**
 * The mobile sheet gets the booking link appended, because `.nav-cta` is
 * `display: none` under 860px (app/styles.css). Without this row the primary
 * call to action would be unreachable on the majority of the paid-search
 * traffic, which is mobile.
 *
 * Deliberately the same seven rows plus the mode switch as before, and no more:
 * the sheet is a centred flex column at 36px with no scroll, so a ninth row
 * starts pushing the mode switch off a short phone.
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
