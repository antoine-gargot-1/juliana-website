import type { Metadata } from 'next';
import Link from 'next/link';

import { Reveal } from '@/components/Reveal';
import { EMAIL } from '@/lib/site';
import { pageMeta } from '@/lib/seo';
import { portalErrorMessage } from '@/lib/portal';

/**
 * noindex, and excluded from the sitemap: this is a redirector to somebody's
 * billing account. There is nothing here to rank and every reason not to invite
 * strangers to try the door.
 */
export const metadata: Metadata = pageMeta({
  title: 'Manage your billing',
  description: 'Manage your lesson plan, payment method, pause or cancellation.',
  path: '/coach/account',
  noindex: true,
});

/**
 * ===========================================================================
 * WHY THERE IS NO LOGIN
 * ===========================================================================
 * A single-teacher practice does not need an auth system, a session store, a
 * password-reset flow and the breach surface that comes with them. Stripe's
 * Customer Portal already does everything a student needs — change card, see
 * invoices, pause, cancel — behind Stripe's own security, so this route's whole
 * job is to hand the right person a portal session and get out of the way.
 *
 * Access is by signed expiring link (`BOOKING_LINK_SECRET`), emailed with the
 * receipt: `/coach/account?t=<hmac>`. The token names the Stripe Customer and
 * expires, so a forwarded or leaked URL stops working. That is a deliberate
 * trade — link-based access is weaker than a password but strictly stronger than
 * the password nobody would set, and portal sessions are short-lived anyway.
 *
 * ---------------------------------------------------------------------------
 * THIS PAGE DOES NOT VERIFY THE TOKEN, AND MUST NOT START TO.
 * ---------------------------------------------------------------------------
 * It renders a form. The token is verified — and the portal session created — by
 * app/api/stripe/portal/route.ts when the form is POSTed.
 *
 * Doing it here on GET instead would look tidier and would break the flow: mail
 * scanners, link unfurlers and corporate security gateways all fetch URLs out of
 * email, and a portal session is single-use. The session would be created and
 * spent by a robot before the student ever clicked, and their own click would
 * land on an expired session. Rendering a form and letting a POST do the work is
 * the entire defence, because scanners do not submit forms.
 *
 * ---------------------------------------------------------------------------
 * PORTAL CAPABILITIES: WHAT THIS PAGE MAY HONESTLY PROMISE
 * ---------------------------------------------------------------------------
 * Set by scripts/stripe-bootstrap.ts, not here — cancel at period end, payment
 * method update, invoice history, name/email edits. Plan SWITCHING is off
 * deliberately (a 60→30 minute change resizes a recurring calendar slot and needs
 * a human).
 *
 * PAUSE IS NOT SELF-SERVE and cannot be made so: Stripe removed
 * `features.subscription_pause` from the Portal Configuration API. The "one free
 * month a year" promise is real but is honoured by the teacher running
 * `pauseSubscriptionOneMonth()` (lib/portal.ts). Item 02 below is therefore
 * worded as a policy the student can ask for, NOT as a button on the portal
 * page — because there is no such button, and sending someone looking for one is
 * how a kept promise reads as a broken product.
 */

const STRIPE_READY = Boolean(process.env.STRIPE_SECRET_KEY);

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const first = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value) ?? '';

export default async function AccountPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const token = first(params.t);
  // Set by /api/stripe/portal when it bounces someone back. A short code, never
  // prose, so nothing user-controlled is reflected into the page.
  const error = first(params.error);

  return (
    <div className="page-fade">
      <Reveal />
      <div className="wrap">
        <section className="svc-page-hero" style={{ paddingBottom: 20 }}>
          <div className="eyebrow">Billing</div>
          <h1>
            Your <span className="it">plan.</span>
          </h1>
          <p className="prose" style={{ fontSize: 20, marginTop: 24, maxWidth: 620 }}>
            Change your card, download invoices, pause for a month or cancel — all of it from
            Stripe&rsquo;s own billing page, in your own hands, with nobody to ask.
          </p>
        </section>

        <section className="block" style={{ paddingTop: 10, paddingBottom: 80 }}>
          <div style={{ maxWidth: 620 }}>
            {/* Shown above the button, not instead of it: a student whose link
                was refused for a recoverable reason should still be able to
                retry, and one whose link is dead needs to know why before they
                conclude the site is broken. */}
            {error && (
              <div className="bform-summary" role="alert" style={{ marginBottom: 24 }}>
                {portalErrorMessage(error)}
              </div>
            )}

            {STRIPE_READY && token ? (
              /* A POST, not a link: opening a billing session is an action, and
                 a GET would let a link prefetcher or an email scanner burn the
                 token before the student clicks it. See the route's header. */
              <form method="POST" action="/api/stripe/portal">
                <input type="hidden" name="t" value={token} readOnly />
                <button type="submit" className="btn btn--solid">
                  Open my billing page <span className="arrow">&rarr;</span>
                </button>
              </form>
            ) : (
              <div className="cal-fallback">
                <p style={{ margin: '0 0 14px' }}>
                  {token
                    ? 'Self-serve billing is being switched on. In the meantime, email me and I will make any change the same day.'
                    : 'This page needs the personal link from your receipt email — it is the one that starts with /coach/account?t=. Links expire, so if yours has, ask me for a new one.'}
                </p>
                <p style={{ margin: 0 }}>
                  <a
                    href={`mailto:${EMAIL}?subject=${encodeURIComponent('Billing — my lesson plan')}`}
                    style={{ color: 'var(--accent)', textDecoration: 'underline' }}
                  >
                    {EMAIL}
                  </a>
                </p>
              </div>
            )}

            <div className="eyebrow" style={{ margin: '44px 0 16px' }}>
              What you can do there
            </div>
            <ul className="numbered">
              <li>
                <span className="n">01</span>
                <span>
                  <span className="t">Cancel</span>
                  Any time, immediately, no notice period and no conversation required. Lessons
                  already paid for in the current month stay yours.
                </span>
              </li>
              <li>
                <span className="n">02</span>
                <span>
                  <span className="t">Pause</span>
                  One free month a year — tours, exams, surgery, moving country. Your slot is held.
                  {/* Worded as "reply and I will" rather than "pause it there",
                      because Stripe removed pause from the Customer Portal API
                      and there is no button for it. See the page header. */}{' '}
                  Reply to any of my emails and I will set it up; nothing is billed for that month.
                </span>
              </li>
              <li>
                <span className="n">03</span>
                <span>
                  <span className="t">Change payment method</span>
                  Card or bank debit. Bank debit costs less to process, so it is the better default
                  on a monthly plan.
                </span>
              </li>
              <li>
                <span className="n">04</span>
                <span>
                  <span className="t">Invoices</span>
                  Every receipt, downloadable, for anyone who needs to expense lessons.
                </span>
              </li>
            </ul>

            <p className="prose" style={{ marginTop: 34, fontSize: 16 }}>
              Not a student yet?{' '}
              <Link href="/coach/book" style={{ color: 'var(--accent)' }}>
                Start with the free assessment
              </Link>
              .
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
