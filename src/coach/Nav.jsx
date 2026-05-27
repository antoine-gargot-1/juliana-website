import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const links = [
  ['/coach', 'Home'],
  ['/coach/about', 'About'],
  ['/coach/services', 'Services'],
  ['/coach/faq', 'FAQ'],
  ['/coach/contact', 'Contact'],
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/coach';

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

  const switchToArtist = () => {
    localStorage.setItem('juliana-mode', 'artist');
    navigate('/artist');
  };

  return (
    <>
      <nav className={`nav ${isScrolled ? 'is-scrolled' : ''}`}>
        <div className="nav-inner">
          <Link className="brand" to="/coach">
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
            <button className="nav-link" onClick={switchToArtist} style={{ opacity: 0.5 }}>
              Artist &rarr;
            </button>
          </div>
          <Link className="nav-cta" to="/coach/contact">
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
        <button onClick={switchToArtist} style={{ fontFamily: 'var(--display)', fontSize: 36, color: 'var(--accent)' }}>
          Artist &rarr;
        </button>
      </div>
    </>
  );
}
