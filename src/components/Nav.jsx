import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

const links = [
  ['/', 'Home'],
  ['/about', 'About'],
  ['/services', 'Services'],
  ['/faq', 'FAQ'],
  ['/contact', 'Contact'],
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === '/';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  const isScrolled = !isHome || scrolled;

  return (
    <>
      <nav className={`nav ${isScrolled ? 'is-scrolled' : ''}`}>
        <div className="nav-inner">
          <Link className="brand" to="/">
            Juliana <span className="dot">&middot;</span> Beltran
          </Link>
          <div className="nav-links">
            {links.map(([path, label]) => (
              <Link
                key={path}
                className={`nav-link ${location.pathname === path ? 'active' : ''}`}
                to={path}
              >
                {label}
              </Link>
            ))}
          </div>
          <Link className="nav-cta" to="/contact">
            Book a Lesson
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
        {links.map(([path, label]) => (
          <Link
            key={path}
            className={location.pathname === path ? 'active' : ''}
            to={path}
            onClick={() => setMenuOpen(false)}
          >
            {label}
          </Link>
        ))}
      </div>
    </>
  );
}
