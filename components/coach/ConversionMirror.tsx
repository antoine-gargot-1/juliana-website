'use client';

import { useEffect, useRef } from 'react';

import { track, type ConversionEvent, type EventParams } from '@/lib/analytics';

/**
 * Client-side mirror of a conversion that was already fired server-side.
 *
 * ===========================================================================
 * THE SERVER FIRE IS THE NUMBER OF RECORD. THIS IS A MIRROR, NOT A SOURCE.
 * ===========================================================================
 * `assessment_booked` is fired authoritatively from the Stripe webhook on
 * `setup_intent.succeeded`, and `pack_purchased` / `plan_started` from
 * `checkout.session.completed` / `customer.subscription.created`
 * (app/api/stripe/webhook/route.ts). That is deliberate: a browser-only fire
 * loses 20–30% of conversions to ad blockers and Safari ITP, and the loss is not
 * random — it correlates with the audiences that cost the most to reach, so the
 * bidding data would be skewed as well as short. A student who closes the tab on
 * Stripe's redirect never runs this component at all, and the conversion still
 * lands.
 *
 * So why have it? Two reasons, both practical:
 *
 *   - GA4 DebugView and Realtime. A server-side Measurement Protocol hit is
 *     genuinely awkward to watch land; a browser hit shows up immediately, which
 *     is what makes QA of this funnel possible at all.
 *   - It covers webhook delay. Stripe delivery is usually sub-second but is not
 *     guaranteed, and during an incident this is the copy that exists.
 *
 * ===========================================================================
 * transaction_id IS THE WHOLE REASON THIS IS SAFE TO SHIP
 * ===========================================================================
 * GA4's Measurement Protocol has no event id and performs NO deduplication of its
 * own: two hits with the same name are two conversions at double the value. So
 * the mirror and the server fire MUST carry the same `transaction_id`, and they
 * do:
 *
 *   assessment_booked   transaction_id = the Cal.com booking uid
 *   pack_purchased      transaction_id = the Stripe Checkout Session id
 *   plan_started        transaction_id = the Stripe Subscription id
 *
 * Be precise about what that buys, because overstating it would be worse than
 * not having it: GA4 itself will still show two hits, and a GA4 report must count
 * DISTINCT transaction_id to be right. What it does fix is the number that
 * actually spends money — Google Ads deduplicates imported conversions that share
 * a transaction_id, so the ad account counts one booking and bids against one
 * booking's worth of value. Without it, every booking would count twice and Smart
 * Bidding would raise bids against revenue that never existed.
 *
 * Passing a `transactionId` is therefore REQUIRED by the type, not optional.
 * There is no correct way to render this component without one.
 *
 * ===========================================================================
 * WHY THE SESSIONSTORAGE GUARD
 * ===========================================================================
 * A confirmation page gets refreshed and re-shared. The ref alone only survives
 * one mount, and React Strict Mode deliberately double-mounts in development, so
 * without the storage key a refresh would fire a second mirror — which, having
 * the same transaction_id, is harmless in Google Ads but pollutes GA4's raw event
 * count and makes the DebugView reading this component exists for untrustworthy.
 */
export function ConversionMirror({
  event,
  transactionId,
  params,
}: {
  event: ConversionEvent;
  /** MUST match the server-side fire's transaction_id. See the header. */
  transactionId: string;
  params?: EventParams;
}) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    // Empty transaction id means the page was opened without the identifier on
    // the URL — usually someone navigating to the confirmation page directly.
    // Firing anyway would create an undeduplicatable conversion for a booking
    // that may not exist, so it is skipped and said out loud.
    if (!transactionId) {
      console.warn(
        `[conversion-mirror] not firing ${event}: no transaction_id on the URL, so this hit could ` +
          'not be deduplicated against the authoritative server-side fire and would double-count.',
      );
      return;
    }

    const storageKey = `jb:fired:${event}:${transactionId}`;
    try {
      if (window.sessionStorage.getItem(storageKey)) return;
      window.sessionStorage.setItem(storageKey, '1');
    } catch {
      /* Private-mode Safari throws on sessionStorage. The ref above still guards
         a single page view, which is the common case; a refresh in private mode
         re-fires, and Google Ads deduplicates it on transaction_id anyway. */
    }

    track(event, { ...params, transaction_id: transactionId, delivery: 'client' });
  }, [event, transactionId, params]);

  // Renders nothing. It exists to run one effect, and the surrounding page is a
  // server component that must stay one.
  return null;
}
