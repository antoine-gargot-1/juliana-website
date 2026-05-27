import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const links = [
  ['/artist', 'Home'],
  ['/artist/music', 'Music'],
  ['/artist/live', 'Live'],
  ['/artist/press', 'Press'],
  ['/artist/booking', 'Booking'],
];

export function ArtistNav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/artist';

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

  const switchToCoach = () => {
    localStorage.setItem('juliana-mode', 'coach');
    navigate('/coach');
  };

  return (
    <>
      <nav className={`nav artist-nav ${isScrolled ? 'is-scrolled' : ''}`}>
        <div className="nav-inner">
          <Link className="brand" to="/artist">
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
            <button className="nav-link" onClick={switchToCoach} style={{ opacity: 0.5 }}>
              Lessons &rarr;
            </button>
          </div>
          <Link className="nav-cta" to="/artist/booking">
            Book Now
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
        <button onClick={switchToCoach} style={{ fontFamily: 'var(--display)', fontSize: 36, color: 'var(--gold)' }}>
          Lessons &rarr;
        </button>
      </div>
    </>
  );
}
