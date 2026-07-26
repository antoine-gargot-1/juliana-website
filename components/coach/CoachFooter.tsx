import Link from 'next/link';
import { EMAIL, SOCIAL } from '@/lib/site';

export function CoachFooter() {
  return (
    <footer>
      <div className="foot">
        <div>
          <div className="brand-big">
            Juliana<span className="dot">.</span>
          </div>
          <p style={{ fontFamily: 'var(--serif)', fontSize: 16, lineHeight: 1.6, maxWidth: 360 }}>
            Voice, guitar, piano, songwriting &amp; artist development. Los Angeles &middot; online
            &amp; in-person.
          </p>
        </div>
        <div>
          <h4>Studio</h4>
          <ul>
            <li>
              <Link href="/coach">Home</Link>
            </li>
            <li>
              <Link href="/coach/about">About</Link>
            </li>
            <li>
              <Link href="/coach/services">Services</Link>
            </li>
            <li>
              <Link href="/coach/voice-lessons-los-angeles">Voice Lessons in LA</Link>
            </li>
            <li>
              <Link href="/coach/faq">FAQ</Link>
            </li>
          </ul>
        </div>
        <div>
          <h4>Contact</h4>
          <ul>
            <li>
              <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
            </li>
            <li>
              <a href={SOCIAL.instagram} target="_blank" rel="noopener noreferrer">
                @juliana.beltran
              </a>
            </li>
            <li>
              <span>Los Angeles, CA</span>
            </li>
          </ul>
        </div>
        <div>
          <h4>Listen &amp; watch</h4>
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
        <div>Made with care in Los Angeles</div>
      </div>
    </footer>
  );
}
