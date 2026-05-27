import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer>
      <div className="foot">
        <div>
          <div className="brand-big">
            Juliana<span className="dot">.</span>
          </div>
          <p style={{ fontFamily: 'var(--serif)', fontSize: 16, lineHeight: 1.6, maxWidth: 360 }}>
            Voice, guitar, piano, songwriting &amp; artist development. Los Angeles &middot; online &amp; in-person.
          </p>
        </div>
        <div>
          <h4>Studio</h4>
          <ul>
            <li><Link to="/coach">Home</Link></li>
            <li><Link to="/coach/about">About</Link></li>
            <li><Link to="/coach/services">Services</Link></li>
            <li><Link to="/coach/faq">FAQ</Link></li>
          </ul>
        </div>
        <div>
          <h4>Contact</h4>
          <ul>
            <li><a href="mailto:julianabeltranmusic@gmail.com">julianabeltranmusic@gmail.com</a></li>
            <li><a href="https://www.instagram.com/juliana.beltran/" target="_blank" rel="noopener noreferrer">@juliana.beltran</a></li>
            <li><span>Los Angeles, CA</span></li>
          </ul>
        </div>
        <div>
          <h4>Listen &amp; watch</h4>
          <ul>
            <li><a href="https://open.spotify.com/artist/5NfNMKwOPzCw9S1s3OMS6z" target="_blank" rel="noopener noreferrer">Spotify</a></li>
            <li><a href="https://www.youtube.com/@juliana.beltran" target="_blank" rel="noopener noreferrer">YouTube</a></li>
            <li><a href="https://www.instagram.com/juliana.beltran/" target="_blank" rel="noopener noreferrer">Instagram</a></li>
            <li><a href="https://music.apple.com/uy/artist/juliana-beltr%C3%A1n/1212882399" target="_blank" rel="noopener noreferrer">Apple Music</a></li>
          </ul>
        </div>
      </div>
      <div className="foot-base">
        <div>&copy; {new Date().getFullYear()} Juliana Beltran Music</div>
        <div>Made with care in Los Angeles</div>
      </div>
    </footer>
  );
}
