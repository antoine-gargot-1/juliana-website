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
 * A DISTINCT EVENT NAME IS WHAT MAKES THIS SAFE TO SHIP. transaction_id IS NOT.
 * ===========================================================================
 * THIS COMMENT USED TO SAY THE OPPOSITE AND IT COST REAL MONEY. The claim was
 * that the mirror could safely share the server fire's event name because
 * "Google Ads deduplicates imported conversions that share a transaction_id".
 * That premise is false in the expensive direction:
 *
 *   - GA4 deduplicates on `transaction_id` for the ECOMMERCE `purchase` event
 *     specifically. These are custom event names — deliberately, see the naming
 *     note on `pack_purchased` in lib/analytics.ts — and custom events are not
 *     deduplicated at all. Two hits are two key events.
 *   - Google Ads imports a GA4 key event as a count GA4 has ALREADY computed, so
 *     the doubling happens upstream of anything Ads could collapse. The order-id
 *     dedupe that genuinely exists belongs to Google Ads' own conversion tag and
 *     to Offline Conversion Import, not to a GA4-imported key event.
 *   - `claimConversion()` in the webhook is server-side idempotency. It cannot
 *     see a browser hit.
 *
 * So Smart Bidding was bidding on roughly double the true conversion volume at
 * double the value — which is worse than under-reporting, because it looks like
 * the campaign working.
 *
 * The fix: this component fires a SEPARATE event name, `<event>_client`, mapped
 * below. The ad account imports only the server-side names, so a browser hit can
 * no longer inflate the number that spends money. The server-side names, their
 * values and their transaction_id scheme are untouched — renaming a live
 * conversion resets its history in Google Ads.
 *
 * ===========================================================================
 * WHY transaction_id IS STILL REQUIRED
 * ===========================================================================
 * Not for deduplication — for JOINING. The pair carries the same identifier:
 *
 *   assessment_booked / assessment_booked_client   the Cal.com booking uid
 *   pack_purchased    / pack_purchased_client      the Stripe Checkout Session id
 *   plan_started      / plan_started_client        the Stripe Subscription id
 *
 * Server count minus client count MEASURES THIS SITE'S OWN BROWSER-SIDE LOSS
 * (ad blockers, Safari ITP, tabs closed on Stripe's redirect) instead of assuming
 * the industry 20–30%. That is the number which says how far to trust the
 * client-only funnel-step events in BookingForm and Purchase, and it is worth
 * more than the duplicate conversion ever was.
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

/**
 * The only three events that may be mirrored — the ones that genuinely fire twice
 * on purpose, from two processes, with one transaction_id holding them together.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS NARROWER THAN ConversionEvent NOW.
 * ---------------------------------------------------------------------------
 * The prop used to accept any ConversionEvent, which was harmless while every
 * event in the union either had a server-side twin or was a one-off browser
 * event. It stopped being harmless when the funnel-step events landed, because
 * two of them carry a transaction_id that looks exactly like a mirrorable one:
 *
 *   slot_reserved     transaction_id = the Cal.com booking uid, the same value
 *                     assessment_booked uses.
 *   checkout_started  transaction_id = the Checkout Session id, the same value
 *                     pack_purchased uses.
 *
 * Those shared identifiers exist so a GA4 exploration can JOIN a reserved slot
 * to the booking it became. They are not dedupe keys — the events have different
 * names, and Google Ads only dedupes within one conversion action. Rendering
 * <ConversionMirror event="slot_reserved" …> on a confirmation page would
 * therefore fire slot_reserved a second time with nothing to deduplicate it
 * against, and the step-2-to-step-3 ratio the whole funnel is read through would
 * silently exceed 100%.
 *
 * Extract<> rather than a hand-written union, so renaming an event in
 * lib/analytics.ts breaks this at compile time instead of quietly widening it.
 */
type MirroredEvent = Extract<
  ConversionEvent,
  'assessment_booked' | 'pack_purchased' | 'plan_started'
>;

/**
 * The name each mirror actually fires under.
 *
 * A template-literal Extract rather than a hand-written union, so this cannot
 * drift: if `assessment_booked_client` were ever removed from or renamed in the
 * ConversionEvent union, this type would stop matching and the map below would
 * fail to compile. A silently-widened mirror name is precisely the bug this
 * whole mechanism exists to prevent.
 */
type MirrorEvent = Extract<ConversionEvent, `${MirroredEvent}_client`>;

/**
 * Canonical conversion → the browser-only name it is mirrored under.
 *
 * The mapping lives HERE rather than at the call sites on purpose: the two
 * confirmation pages keep passing the canonical event they are confirming
 * (`assessment_booked`), which is what they mean and what is readable there, and
 * cannot accidentally start firing a real conversion from the browser. There is
 * exactly one place that decides what a mirror is called.
 */
const MIRROR_EVENT: Record<MirroredEvent, MirrorEvent> = {
  assessment_booked: 'assessment_booked_client',
  pack_purchased: 'pack_purchased_client',
  plan_started: 'plan_started_client',
};

export function ConversionMirror({
  event,
  transactionId,
  params,
}: {
  event: MirroredEvent;
  /** MUST match the server-side fire's transaction_id. See the header. */
  transactionId: string;
  params?: EventParams;
}) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    const mirrorEvent = MIRROR_EVENT[event];

    // Empty transaction id means the page was opened without the identifier on
    // the URL — usually someone navigating to the confirmation page directly.
    // Firing anyway would produce a mirror that cannot be joined to any
    // server-side fire, which makes the browser-loss measurement wrong in the
    // direction of overstating the loss. Skipped, and said out loud.
    if (!transactionId) {
      console.warn(
        `[conversion-mirror] not firing ${mirrorEvent}: no transaction_id on the URL, so this hit ` +
          'could not be joined to the authoritative server-side fire and would corrupt the ' +
          'server-minus-client browser-loss figure.',
      );
      return;
    }

    const storageKey = `jb:fired:${mirrorEvent}:${transactionId}`;
    try {
      if (window.sessionStorage.getItem(storageKey)) return;
      window.sessionStorage.setItem(storageKey, '1');
    } catch {
      /* Private-mode Safari throws on sessionStorage. The ref above still guards
         a single page view, which is the common case. A refresh in private mode
         re-fires — which no longer touches any conversion the ad account imports,
         because this is a `_client` event, but it does overstate the client count
         and therefore understate the measured browser loss. Worth knowing when
         reading that figure; not worth more code than this. */
    }

    /*
     * `mirrorEvent`, never `event`. Firing the canonical name here is the
     * double-count this component was rebuilt to remove: it would land in GA4 as
     * a second key event and Google Ads would import roughly twice the true
     * conversion volume at twice the value.
     *
     * `mirror_of` names the server-side event this hit belongs to, so a GA4
     * exploration can pair them without hardcoding the naming convention.
     */
    track(mirrorEvent, {
      ...params,
      transaction_id: transactionId,
      mirror_of: event,
      delivery: 'client',
    });
  }, [event, transactionId, params]);

  // Renders nothing. It exists to run one effect, and the surrounding page is a
  // server component that must stay one.
  return null;
}
