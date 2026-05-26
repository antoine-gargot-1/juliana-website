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
            <li><Link to="/">Home</Link></li>
            <li><Link to="/about">About</Link></li>
            <li><Link to="/services">Services</Link></li>
            <li><Link to="/faq">FAQ</Link></li>
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
            <li><span>Apple Music</span></li>
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
