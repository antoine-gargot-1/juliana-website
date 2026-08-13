import type { Metadata } from 'next';
import Link from 'next/link';

import { Reveal } from '@/components/Reveal';
import { CalEmbed } from '@/components/coach/CalEmbed';
import { ConversionMirror } from '@/components/coach/ConversionMirror';
import { IN_PERSON_DAYS, LESSONS_PER_MONTH, type Price, lookup, modeLabel } from '@/lib/pricing';
import { pageMeta } from '@/lib/seo';
import { EMAIL } from '@/lib/site';
import { getStripe, stripeConfigured } from '@/lib/stripe';

/**
 * Where a paid package lands: thank you, then pick the times.
 *
 * ===========================================================================
 * WHY THE ORDER IS PAY → SCHEDULE AND NOT SCHEDULE → PAY
 * ===========================================================================
 * The free assessment goes the other way round (choose a slot, then a $0 card
 * hold) because there is no money to lose and a held card is what stops a
 * no-show. A paid package has the opposite risk profile: scheduling first hands
 * out calendar time to people who then abandon a $700 checkout, and that time is
 * the only inventory this business has. So the money settles, and this page is
 * the reward for finishing.
 *
 * ===========================================================================
 * noindex, AND IT MUST STAY THAT WAY
 * ===========================================================================
 * A confirmation page in the index ranks for brand queries, invites strangers to
 * arrive at a confirmation they never earned, and destroys any
 * conversions-per-session figure. It also has nothing worth ranking.
 *
 * NOTE FOR WHOEVER OWNS app/sitemap.ts: this route needs to be EXCLUDED there,
 * the same way /coach/book/confirmed and /coach/account are. The noindex below is
 * this file's half of that job; the sitemap is not mine to edit.
 *
 * ===========================================================================
 * NO PREMISES
 * ===========================================================================
 * In-person lessons happen in a private residence. This page may say that the
 * address arrives privately once a lesson is confirmed, and nothing more: no
 * street, no neighbourhood, no travel time, no "our studio".
 */
export const metadata: Metadata = pageMeta({
  title: 'Your lessons are paid for — now pick your times',
  description: 'Choose the times for the lessons you have just bought.',
  path: '/coach/purchase/confirmed',
  noindex: true,
});

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const first = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value) ?? '';

/** The scheduler account. Absent until the operator's Cal.com link is in env. */
const CAL_LINK = process.env.NEXT_PUBLIC_CAL_LINK ?? '';

/**
 * The lesson event slugs created by scripts/calcom-bootstrap.ts, derived rather
 * than listed: mode and duration are both already known from the price, so a
 * lookup table here would be a second place to forget to update.
 */
const lessonSlug = (price: Price) =>
  `lesson-${price.mode === 'online' ? 'online' : 'in-person'}-${price.duration}`;

/**
 * What was bought, read back from Stripe rather than trusted from the URL.
 *
 * The only parameter Stripe gives us is the session id, and that is deliberate:
 * a page that took `?lookupKey=inperson_pack_10` from the query string would
 * happily show a $900 confirmation to anyone who typed one, and would offer them
 * the in-person calendar. Retrieving the session is what makes the page's claims
 * true.
 *
 * Returns null for every failure — no session id, Stripe not configured on this
 * deployment, an id that does not resolve, a session that is not paid — and the
 * page falls back to a state that thanks the buyer and hands them a human. It
 * never throws: this is the page somebody sees immediately after paying, and an
 * error screen there reads as "the money went nowhere".
 */
async function purchased(sessionId: string) {
  if (!sessionId || !stripeConfigured()) return null;

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    const lookupKey = session.metadata?.lookup_key;
    if (!lookupKey) return null;

    // 'no_payment_required' covers a 100%-off coupon; 'unpaid' means a delayed
    // method (bank debit) is still clearing, which is a real state and worth
    // saying out loud rather than pretending the lessons are ready.
    const settled =
      session.payment_status === 'paid' || session.payment_status === 'no_payment_required';

    /*
     * The conversion identity, resolved HERE rather than on the client, because
     * only the server can see it.
     *
     * The client mirror has to send the SAME transaction_id as the webhook or the
     * conversion double-counts (GA4 deduplicates nothing; Google Ads collapses on
     * transaction_id). The webhook uses a different identifier per event, and only
     * one of the two is available from the URL:
     *
     *   one-off pack/single  checkout.session.completed -> session.id, which IS
     *                        the ?session_id= on this page's URL.
     *   monthly plan         customer.subscription.created -> subscription.id,
     *                        which the browser never sees. Stripe cannot template
     *                        it into success_url, so it is read off the retrieved
     *                        session here.
     *
     * Getting this wrong on the subscription branch would be invisible: two
     * plan_started conversions, both looking legitimate.
     */
    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : (session.subscription?.id ?? '');

    const conversion =
      session.mode === 'subscription'
        ? { event: 'plan_started' as const, transactionId: subscriptionId }
        : { event: 'pack_purchased' as const, transactionId: session.id };

    return {
      price: lookup(lookupKey),
      settled,
      email: session.customer_details?.email ?? '',
      conversion,
    };
  } catch {
    /*
     * Swallowed on purpose. An unknown or malformed session id is the ordinary
     * consequence of someone reloading this URL days later or typing it, and the
     * fallback below is a better answer than a 500.
     */
    return null;
  }
}

export default async function PurchaseConfirmedPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const order = await purchased(first(params.session_id));

  const price = order?.price;
  const calLink = CAL_LINK && price ? `${CAL_LINK}/${lessonSlug(price)}` : '';
  const calFields: Record<string, string> = {
    layout: 'month_view',
    ...(order?.email ? { email: order.email } : {}),
    // Timezone is not forced: an online student in another timezone should see
    // their own clock, not Pacific.
  };
  const calUrl = calLink ? `https://cal.com/${calLink}?${new URLSearchParams(calFields)}` : '';

  return (
    <div className="page-fade">
      <Reveal />

      {/*
        The client-side conversion mirror.

        The authoritative `pack_purchased` / `plan_started` conversions are fired
        SERVER-SIDE from the Stripe webhook, using the ga_client_id that
        components/coach/Purchase.tsx put on the Checkout Session. That is
        deliberate: a browser-only fire loses 20–30% to ad blockers and Safari
        ITP, and those losses correlate with the audiences that cost most to
        reach, so the bidding data would be skewed as well as short.

        This copy exists for GA4 DebugView and for delayed webhook delivery. It
        carries the same transaction_id the webhook sends — the Checkout Session id
        for a one-off pack, the Subscription id for a monthly plan — so Google Ads
        counts one conversion rather than two. See purchased() above for why the
        subscription branch cannot use the session id, and the header of
        components/coach/ConversionMirror.tsx for what the dedupe does and does not
        guarantee.

        Rendered only when the payment actually settled: mirroring a conversion
        for a bank debit that is still clearing would report revenue that may yet
        fail.
      */}
      {order?.settled && order.conversion.transactionId && (
        <ConversionMirror
          event={order.conversion.event}
          transactionId={order.conversion.transactionId}
          params={{
            mode: order.price.mode,
            mode_label: modeLabel(order.price.mode),
            lookup_key: order.price.lookupKey,
          }}
        />
      )}

      <div className="wrap">
        <section style={{ padding: '140px 0 40px', maxWidth: 760 }}>
          <div
            className="script"
            style={{ fontSize: 84, color: 'var(--accent)', lineHeight: 1, marginBottom: 24 }}
          >
            Thank you&hellip;
          </div>
          <h1
            style={{
              fontFamily: 'var(--display)',
              fontWeight: 400,
              fontSize: 'clamp(38px, 7vw, 68px)',
              lineHeight: 1,
              letterSpacing: '-0.015em',
              margin: '0 0 24px',
            }}
          >
            {order?.settled === false ? (
              <>
                Your payment is <span className="it">clearing.</span>
              </>
            ) : (
              <>
                Now pick your <span className="it">times.</span>
              </>
            )}
          </h1>

          {price ? (
            <p className="prose" style={{ fontSize: 19 }}>
              You have bought <strong>{price.name}</strong> — {modeLabel(price.mode)}.{' '}
              {price.type === 'monthly'
                ? `That is ${LESSONS_PER_MONTH} lessons a month at a weekly cadence, renewing monthly until you cancel.`
                : price.lessons > 1
                  ? `That is ${price.lessons} lessons to use at your own pace, with nothing recurring.`
                  : 'One lesson, with nothing recurring.'}{' '}
              The receipt is on its way to your inbox.
            </p>
          ) : (
            <p className="prose" style={{ fontSize: 19 }}>
              Your payment went through and the receipt is on its way to your inbox. Pick your first
              lesson time below.
            </p>
          )}

          {order?.settled === false && (
            <p className="prose">
              You paid by a method that takes a day or two to clear — bank debit usually. Nothing
              more is needed from you; choose your times below and I will confirm them once the
              payment settles.
            </p>
          )}

          {price?.mode === 'inperson' && (
            <p className="prose">
              In-person lessons run on <strong>{IN_PERSON_DAYS.join('s and ')}s</strong>. I send you
              the exact address privately once your first lesson is confirmed — it is a private
              space, not a walk-in one.
            </p>
          )}
        </section>

        <section className="block" style={{ paddingTop: 0, paddingBottom: 30 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>
            {price?.type === 'monthly'
              ? 'Choose your weekly slot'
              : 'Choose your first lesson time'}
          </div>
          <p className="prose">
            {price?.type === 'monthly'
              ? `Pick the time you want each week and it becomes yours — I hold it rather than rebooking it every week. Times are shown in your own timezone.`
              : `Book the first one now and the rest whenever suits; times are shown in your own timezone.`}
          </p>

          <div style={{ marginTop: 24 }}>
            {calLink ? (
              /* The official Cal.com embed, lazily: this page is behind a
                 completed checkout, so embed.js is never fetched by anyone
                 browsing the site. No booking-success callback is wired here —
                 unlike the assessment flow, the money has already settled and
                 Cal.com's own confirmation screen is the end of the journey. */
              <CalEmbed
                calLink={calLink}
                config={calFields}
                fallbackUrl={calUrl}
                title="Choose your lesson times"
              />
            ) : (
              /* TODO(integration): NEXT_PUBLIC_CAL_LINK is not set on this
                 deployment, or the session could not be resolved, so there is no
                 calendar to embed. An empty box after a payment reads as a failed
                 payment, so the email path is offered instead — and it is a real
                 path, not a placeholder. */
              <div className="cal-fallback">
                <p style={{ margin: '0 0 14px' }}>
                  Send me a line with two or three times that suit you and I will confirm your slot
                  today. Your payment is already recorded, so there is nothing else to pay.
                </p>
                <a
                  className="btn btn--solid"
                  href={`mailto:${EMAIL}?subject=${encodeURIComponent(
                    `Booking my lesson times${price ? ` — ${price.name}` : ''}`,
                  )}`}
                >
                  Email me your times <span className="arrow">&rarr;</span>
                </a>
              </div>
            )}
          </div>
        </section>

        <section className="block" style={{ paddingTop: 10, paddingBottom: 80 }}>
          <div className="eyebrow" style={{ marginBottom: 16 }}>
            Before your first lesson
          </div>
          <ul className="numbered">
            <li>
              <span className="n">01</span>
              <span>
                <span className="t">Pick one song</span>
                Something you actually want to sing, even if you cannot get through it yet.
                Especially if you cannot get through it yet.
              </span>
            </li>
            <li>
              <span className="n">02</span>
              <span>
                <span className="t">Wired headphones</span>
                For an online lesson this matters more than any other piece of equipment.
              </span>
            </li>
            <li>
              <span className="n">03</span>
              <span>
                <span className="t">Water, and a quiet half hour</span>
                Somewhere you are not worried about being heard.
              </span>
            </li>
          </ul>

          <p className="prose" style={{ marginTop: 34 }}>
            Need to change something, or move a lesson? Use the link in the calendar invite, or email{' '}
            <a href={`mailto:${EMAIL}`} style={{ color: 'var(--accent)' }}>
              {EMAIL}
            </a>
            . {price?.type === 'monthly' ? 'You can pause or cancel any time from ' : 'Receipts and card details live on '}
            <Link href="/coach/account" style={{ color: 'var(--accent)' }}>
              your billing page
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
