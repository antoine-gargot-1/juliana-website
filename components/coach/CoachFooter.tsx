import Link from 'next/link';
import { EMAIL, SOCIAL } from '@/lib/site';
import {
  ASSESSMENT,
  LESSONS_PER_MONTH,
  formatUsd,
  monthlyPlans,
  perLessonCents,
} from '@/lib/pricing';

/**
 * The price floor, computed — never typed. Same figure and same derivation as
 * the /coach hero: the per-lesson rate of the cheapest full-hour commitment.
 * A footer sits on every coach page, so a hardcoded number here would be the
 * most-repeated stale price on the site the day a rate changes.
 */
const plan = monthlyPlans('online')[0];
const FROM_PER_LESSON = plan ? formatUsd(perLessonCents(plan)) : null;

export function CoachFooter() {
  return (
    <footer>
      <div className="foot">
        <div>
          <div className="brand-big">
            Juliana<span className="dot">.</span>
          </div>
          <p style={{ fontFamily: 'var(--serif)', fontSize: 16, lineHeight: 1.6, maxWidth: 360 }}>
            Voice, guitar, piano, songwriting &amp; artist development. Online worldwide &middot; in
            person in Los Angeles.{' '}
            {FROM_PER_LESSON
              ? `${LESSONS_PER_MONTH} lessons a month from ${FROM_PER_LESSON} a lesson. `
              : ''}
            Every new student starts with a free {ASSESSMENT.durationMinutes}-minute assessment.
          </p>
        </div>
        {/* "Studio" here means her teaching practice, which is standard
            music-pedagogy usage and claims no premises. It is not a place: see
            the note in lib/schema.ts on why no address, geo or opening hours is
            published anywhere. */}
        {/* Order is by how much of the buying decision a page can settle, not
            alphabetically and not by site depth: the two pages that carry proof,
            mechanics, rates and a buy button come first, then the price page,
            then FAQ and About. Capped at five: the discipline pages (services,
            songwriting, voice in LA) are reached from the nav and the lesson
            pages, and settle nothing a reader is still deciding here. */}
        <div>
          <h2>Studio</h2>
          <ul>
            <li>
              <Link href="/coach/lessons/online">Online Lessons</Link>
            </li>
            <li>
              <Link href="/coach/lessons/in-person">In-Person Lessons &middot; LA</Link>
            </li>
            <li>
              <Link href="/coach/pricing">Pricing</Link>
            </li>
            <li>
              <Link href="/coach/faq">FAQ</Link>
            </li>
            <li>
              <Link href="/coach/about">About</Link>
            </li>
          </ul>
        </div>
        <div>
          <h2>Contact</h2>
          <ul>
            <li>
              <Link href="/coach/book">Book a free assessment</Link>
            </li>
            <li>
              <Link href="/coach/contact">Studio inquiry</Link>
            </li>
            <li>
              <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
            </li>
          </ul>
        </div>
        <div>
          {/* h2, not h4 — see the note on .foot h4/.foot h2 in app/styles.css.
              These three columns sat at h4 directly under the page's last h2,
              which is a skipped level on every coach route. The rule styles both
              elements identically, so nothing moves. */}
          <h2>Listen &amp; watch</h2>
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
        {/* Year is baked in at build time; suppress the hydration diff on
            the one day of the year a stale static page could disagree. */}
        <div suppressHydrationWarning>&copy; {new Date().getFullYear()} Juliana Beltran Music</div>
        {/* Legal, in the base row rather than as a fifth column in .foot above.
            Two reasons. It is where every reader already looks for it, and
            CalOPPA (Bus. & Prof. Code §22575) requires the privacy policy to be
            "conspicuously posted" — which the statute's own safe harbour reads as
            a link on the homepage or on the first significant page after entry,
            and this footer is on every page of the coaching side, including both
            of those. A fifth column would also collapse the .foot grid to
            1.4fr+1fr+1fr+1fr+1fr on a laptop and squeeze the four columns that
            actually sell lessons. */}
        <div className="foot-legal">
          <Link href="/coach/privacy">Privacy</Link>
          <Link href="/coach/terms">Terms</Link>
        </div>
        <div>Made with care in Los Angeles</div>
      </div>
    </footer>
  );
}
