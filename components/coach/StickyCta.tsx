'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { PURCHASE_NOTE } from '@/components/coach/Purchase';

/**
 * The persistent mobile call to action.
 *
 * ---------------------------------------------------------------------------
 * IT SHOWS THE PAGE'S PRIMARY ACTION, NOT ONE FIXED ACTION
 * ---------------------------------------------------------------------------
 * There are two conversion paths now — buy a package, or book the free
 * assessment — and each page nominates exactly one as primary. A sticky bar that
 * always offered the assessment would therefore contradict the page it is glued
 * to on /coach/pricing, where the page's whole argument is "pick one and pay".
 * Two competing CTAs on one screen is worse than one, so the bar reads the
 * pathname and mirrors whatever that page made primary.
 *
 * That routing table lives here rather than as a prop because this component is
 * mounted once, in a layout, for every page in the group. A prop would have to be
 * threaded through a server layout that does not know the route, and a page added
 * later could forget it and silently get the wrong CTA.
 *
 * ---------------------------------------------------------------------------
 * THE TWO NOTES ARE NOT INTERCHANGEABLE
 * ---------------------------------------------------------------------------
 * The assessment variant carries "we take a card… you won't be charged". The
 * purchase variant carries PURCHASE_NOTE, because on a purchase the card IS
 * charged and repeating the assessment's promise there would be a false
 * statement on top of a button that takes $700. Whichever variant is showing,
 * the note that ships with it is the true one.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS A CLIENT COMPONENT
 * ---------------------------------------------------------------------------
 * Four browser-only facts decide what the bar shows and whether it is on screen:
 *
 *   1. WHICH PAGE — both for the primary action above, and because the bar must
 *      not appear on the booking or purchase flows themselves; a fixed bar
 *      offering the thing you are already doing steals a tap and covers the
 *      form's submit button on a short viewport.
 *   2. SCROLL POSITION — it stays out of the way for the first screen, so the
 *      hero and its own in-page CTA are never covered on arrival.
 *   3. WHERE THE FOOTER IS — it hides once the footer is on screen, so the end
 *      of the page is never obscured. This is why there is no layout spacer:
 *      the bar retreats before the content runs out instead of pushing it.
 *
 * COLLISIONS. z-index is 28 in app/styles.css: below the fixed `.nav` (30) and
 * below the full-screen mobile menu (29), so it can never sit on top of either.
 * The bar is bottom-anchored and the nav is top-anchored, so they never meet.
 * Bottom padding includes `env(safe-area-inset-bottom)` for the iOS home bar.
 */

/**
 * Routes whose primary action is buying a package. Prefix-matched, so
 * /coach/lessons/online and /coach/lessons/in-person are both covered by one
 * entry and a third lessons page would inherit the right CTA for free.
 *
 * Everything else — the coach home, services, about, faq, contact, the
 * voice-lessons page and all three paid-search landing pages — keeps the free
 * assessment as primary. That default is deliberate and is the one to leave
 * alone: a stranger who just searched "vocal coach los angeles" converts far
 * better on a free session than on $360, and those pages are what the ad budget
 * pays for.
 */
const PURCHASE_FIRST = ['/coach/pricing', '/coach/lessons', '/coach/songwriting'];

/**
 * Routes where the bar suppresses itself entirely.
 *
 *   /coach/book*      the booking flow. A "book now" bar over the booking form
 *                     is noise, and on a short viewport it covers the submit.
 *   /coach/purchase*  the post-checkout scheduling page. Someone who has just
 *                     paid is being asked to choose lesson times; a bar inviting
 *                     them to choose a package again is at best confusing and at
 *                     worst a second charge.
 */
const SUPPRESS_ON = ['/coach/book', '/coach/purchase'];

export function StickyCta({
  /**
   * The card-capture sentence, for the assessment variant. Required, and passed
   * in rather than imported, for two reasons: a layout physically cannot mount
   * this bar without stating the card policy, and keeping it a prop means the
   * pricing module never gets pulled into the client bundle. Pass
   * ASSESSMENT_CARD_COPY from PriceGrid.
   */
  note,
  href = '/coach/book',
  /**
   * The assessment CTA's wording. Passed in from the layout rather than written
   * here, so the bar cannot drift from the button it duplicates. Pass
   * ASSESSMENT_CTA_LABEL.
   */
  label,
  /** The purchase CTA's wording. Pass PURCHASE_CTA_LABEL. */
  purchaseLabel,
  /** Extra prefixes to suppress on, on top of SUPPRESS_ON. */
  hideOnPathPrefix,
}: {
  note: string;
  href?: string;
  label: string;
  purchaseLabel: string;
  hideOnPathPrefix?: string | string[];
}) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [footerInView, setFooterInView] = useState(false);

  // Reveal after the first screen. Reads scrollY once on mount too, so a
  // restored scroll position (back button) does not start with the bar hidden.
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 260);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Retreat while any page footer is on screen. Queried rather than passed a
  // ref because the footer is rendered by a layout this component never sees:
  // `footer` on the coach pages, `.lp-footer` on the landing pages.
  useEffect(() => {
    const footer = document.querySelector('footer, .lp-footer');
    if (!footer) return;

    const observer = new IntersectionObserver(
      ([entry]) => setFooterInView(entry.isIntersecting),
      // A small negative bottom margin means "actually scrolled into view",
      // not "one pixel of it is technically intersecting".
      { rootMargin: '0px 0px -40px 0px' },
    );
    observer.observe(footer);
    return () => observer.disconnect();
  }, [pathname]);

  const extraSuppress =
    typeof hideOnPathPrefix === 'string'
      ? [hideOnPathPrefix]
      : Array.isArray(hideOnPathPrefix)
        ? hideOnPathPrefix
        : [];

  if ([...SUPPRESS_ON, ...extraSuppress].some((prefix) => pathname?.startsWith(prefix))) {
    return null;
  }

  const purchaseFirst = PURCHASE_FIRST.some((prefix) => pathname?.startsWith(prefix));

  // The purchase variant points at the tier cards on the current page — the same
  // label and the same destination as that page's other purchase CTAs, so the
  // bar is a repeat rather than a third different offer.
  const cta = purchaseFirst
    ? { href: '#rates', label: purchaseLabel, note: PURCHASE_NOTE }
    : { href, label, note };

  const hidden = !visible || footerInView;

  return (
    // The whole bar leaves the accessibility tree and the tab order while it is
    // off-screen. Announcing a duplicate CTA that nobody can see, or letting a
    // keyboard user land on an invisible control, are both worse than the bar
    // simply not existing until it is on screen.
    <div className={`sticky-cta${hidden ? ' is-hidden' : ''}`} aria-hidden={hidden}>
      <div className="sticky-cta-inner">
        {/* The note, and then the CTA in full on the button. There used to be a
            third line — a short headline above the note, with a one-word verb on
            the button — which meant the same action was worded twice in 40mm of
            screen. The button now carries the same words as that page's other
            CTA to the same destination, and nothing is said twice. */}
        <span className="sticky-cta-note">{cta.note}</span>
        <Link className="btn btn--solid" href={cta.href} tabIndex={hidden ? -1 : 0}>
          {cta.label}{' '}
          <span className="arrow" aria-hidden="true">
            {purchaseFirst ? '↓' : '→'}
          </span>
        </Link>
      </div>
    </div>
  );
}
