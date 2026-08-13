import Link from 'next/link';

import {
  ASSESSMENT_CARD_COPY,
  ASSESSMENT_CTA_LABEL,
  PURCHASE_CTA_LABEL,
} from '@/components/coach/PriceGrid';
import { StickyCta } from '@/components/coach/StickyCta';
import { EMAIL } from '@/lib/site';

/**
 * Chrome for the paid-search landing pages.
 *
 * ---------------------------------------------------------------------------
 * WHY THESE PAGES HAVE THEIR OWN LAYOUT INSTEAD OF LIVING IN (coach)
 * ---------------------------------------------------------------------------
 * A page reached by a paid click has exactly one job. Site navigation is a row
 * of exits from that job: on a phone, the coach nav's hamburger, five links and
 * a competing "Book a Lesson" button all sit above the headline, and every one
 * of them is a way to leave without booking. So these three pages get a wordmark
 * and nothing else clickable at the top.
 *
 * What is deliberately kept, because stripping it would cost more than it saves:
 *
 *   THE WORDMARK — an unbranded page with one button reads like a scraper. It
 *   links to the coaching home page: someone who wants to check she is real
 *   should be able to, and that check is part of converting, not a leak.
 *
 *   A REAL FOOTER — an email address, a link to the full site and the pages a
 *   person is entitled to find. Ad review, and human trust, both expect it.
 *
 *   THE STICKY CTA — mounted here so all three pages get it and none can be
 *   built without it. It hides itself once this footer is on screen, which is
 *   why the footer carries the `.lp-footer` class the observer looks for.
 */
export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="lp-header">
        <Link className="brand" href="/coach">
          Juliana <span className="dot">&middot;</span> Beltran
        </Link>
        <span className="lp-header-note">
          Voice &middot; Songwriting
          <br />
          Los Angeles &amp; Online
        </span>
      </header>

      {children}

      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div>
            Juliana Beltran &mdash; Colombian singer-songwriter and music coach, Los Angeles.
            Lessons online worldwide and in person in Los Angeles, in English or Spanish.
          </div>
          <div>
            <a href={`mailto:${EMAIL}`}>{EMAIL}</a> &nbsp;&middot;&nbsp;{' '}
            <Link href="/coach">Full site</Link> &nbsp;&middot;&nbsp;{' '}
            <Link href="/coach/pricing">Prices</Link> &nbsp;&middot;&nbsp;{' '}
            <Link href="/coach/faq">FAQ</Link> &nbsp;&middot;&nbsp;{' '}
            <Link href="/coach/contact">Contact</Link>
          </div>
          <div suppressHydrationWarning>
            &copy; {new Date().getFullYear()} Juliana Beltran Music
          </div>
        </div>
      </footer>

      <StickyCta
        note={ASSESSMENT_CARD_COPY}
        label={ASSESSMENT_CTA_LABEL}
        purchaseLabel={PURCHASE_CTA_LABEL}
      />
    </>
  );
}
