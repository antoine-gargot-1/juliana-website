import Link from 'next/link';
import { EMAIL, SOCIAL } from '@/lib/site';

export function ArtistFooter() {
  return (
    <footer className="artist-footer">
      <div className="foot">
        <div>
          <div className="brand-big">
            Juliana<span className="dot">.</span>
          </div>
          <p style={{ fontFamily: 'var(--serif)', fontSize: 16, lineHeight: 1.6, maxWidth: 360 }}>
            Latin pop &middot; Indie pop &middot; Singer-songwriter. Available for live shows,
            festivals &amp; collaborations.
          </p>
        </div>
        <div>
          <h4>Navigate</h4>
          <ul>
            <li>
              <Link href="/artist">Home</Link>
            </li>
            <li>
              <Link href="/artist/music">Music</Link>
            </li>
            <li>
              <Link href="/artist/live">Live</Link>
            </li>
            <li>
              <Link href="/artist/press">Press Kit</Link>
            </li>
            <li>
              <Link href="/live-music-for-events-los-angeles">Live Music for Events</Link>
            </li>
          </ul>
        </div>
        <div>
          <h4>Booking</h4>
          <ul>
            <li>
              <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
            </li>
            <li>
              <Link href="/artist/booking">Booking Inquiry</Link>
            </li>
            <li>
              <span>Los Angeles, CA</span>
            </li>
          </ul>
        </div>
        <div>
          <h4>Listen &amp; follow</h4>
          <ul>
            <li>
              <a href={SOCIAL.spotify} target="_blank" rel="noopener noreferrer">
                Spotify
              </a>
            </li>
            <li>
              <a href={SOCIAL.youtube} target="_blank" rel="noopener noreferrer">
                YouTube
              </a>
            </li>
            <li>
              <a href={SOCIAL.instagram} target="_blank" rel="noopener noreferrer">
                Instagram
              </a>
            </li>
            <li>
              <a href={SOCIAL.appleMusic} target="_blank" rel="noopener noreferrer">
                Apple Music
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="foot-base">
        <div>&copy; {new Date().getFullYear()} Juliana Beltran Music</div>
        <div>Los Angeles</div>
      </div>
    </footer>
  );
}
