import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function Chooser() {
  const navigate = useNavigate();

  useEffect(() => {
    const cached = localStorage.getItem('juliana-mode');
    if (cached === 'coach') { navigate('/coach', { replace: true }); return; }
    if (cached === 'artist') { navigate('/artist', { replace: true }); return; }
  }, [navigate]);

  const choose = (mode) => {
    localStorage.setItem('juliana-mode', mode);
    navigate(`/${mode}`, { replace: true });
  };

  return (
    <div className="chooser">
      <div className="chooser-side chooser-coach" onClick={() => choose('coach')}>
        <div className="chooser-bg">
          <img src="/img/juliana-couch-casual.jpg" alt="Juliana coaching" />
        </div>
        <div className="chooser-content">
          <div className="eyebrow">Looking for</div>
          <h2>Lessons</h2>
          <p className="serif">Voice, guitar, piano &amp; songwriting coaching in Los Angeles.</p>
          <span className="btn">Enter Studio <span className="arrow">&rarr;</span></span>
        </div>
      </div>
      <div className="chooser-side chooser-artist" onClick={() => choose('artist')}>
        <div className="chooser-bg">
          <img src="/img/juliana-goldenhour.png" alt="Juliana performing" />
        </div>
        <div className="chooser-content">
          <div className="eyebrow">Booking an</div>
          <h2>Artist</h2>
          <p className="serif">Live shows, events &amp; collaborations. Press kit &amp; booking.</p>
          <span className="btn">View Press Kit <span className="arrow">&rarr;</span></span>
        </div>
      </div>
      <div className="chooser-brand">
        <span className="brand">Juliana <span className="dot">&middot;</span> Beltran</span>
      </div>
    </div>
  );
}
