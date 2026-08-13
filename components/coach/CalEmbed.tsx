'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Cal.com's official inline embed, and the booking-success callback the funnel
 * depends on.
 *
 * ===========================================================================
 * WHY THIS REPLACED A PLAIN <iframe src="https://cal.com/…">
 * ===========================================================================
 * A raw iframe renders the scheduler perfectly well and then goes silent. It
 * cannot tell the page that a booking happened, because the only channel for
 * that is the postMessage stream Cal.com's own embed script listens to. The
 * booking hand-off therefore had exactly one mechanism — the event type's
 * `successRedirectUrl`, which sends the student on to /coach/book/hold where the
 * $0 card hold is created.
 *
 * `successRedirectUrl` is refused by Cal.com's API with a 403 ("a feature for
 * team plan users") on this account, including on team-owned event types, and it
 * appears to be gated on an ACTIVE PAID subscription rather than on the 30-day
 * trial the operator is currently inside. So the single mechanism for the
 * highest-value step in the funnel was blocked on a billing state nobody here
 * controls: the student picked a slot and never reached the card hold.
 *
 * The embed's `bookingSuccessful` event has no such gate. It works on every
 * plan, so it becomes the PRIMARY hand-off and the redirect becomes a bonus.
 *
 * ===========================================================================
 * THE FALLBACK CHAIN, IN ORDER. ALL THREE END IN THE SAME PLACE.
 * ===========================================================================
 *   1. THIS CALLBACK — fires in the browser the moment the booking is created,
 *      and navigates to /coach/book/hold?uid=… Works on any Cal.com plan.
 *   2. successRedirectUrl — the same destination, whenever the operator's plan
 *      activates and Cal.com stops refusing to set it. /coach/book/hold is
 *      idempotent on the booking uid, so if both fire the second is a no-op.
 *      Neither path needs to know whether the other ran.
 *   3. THE CAL.COM WEBHOOK — server-side, and the only one that survives
 *      JavaScript being blocked or the tab being closed mid-flow. It emails the
 *      student a card-capture link, so a booking is never stranded even when
 *      nothing in this file executes.
 *
 * ===========================================================================
 * LCP
 * ===========================================================================
 * embed.js is third-party JavaScript and is loaded lazily by construction: this
 * component is only mounted at step 2 of the booking form, which is reachable
 * only by submitting step 1. Nothing is fetched on first paint, on any page,
 * which is the same discipline VideoFacade applies to the YouTube player. There
 * is deliberately no eager preconnect or preload — a visitor who never reaches
 * the scheduler never pays for it.
 */

/** Cal.com's loader endpoint. The stub below queues calls until it arrives. */
const EMBED_JS = 'https://app.cal.com/embed/embed.js';

type CalFn = ((...args: unknown[]) => void) & {
  q?: unknown[][];
  ns?: Record<string, unknown>;
  loaded?: boolean;
};

type CalWindow = Window & { Cal?: CalFn };

/**
 * Cal.com's embed snippet, rewritten as typed code instead of pasted minified
 * IIFE.
 *
 * It cannot be skipped by simply appending the script and waiting for `onload`:
 * embed.js reads `window.Cal.q` on arrival and throws "Cal is not defined" when
 * the stub is missing. The stub's whole job is to buffer calls made before the
 * script lands, which on a slow connection is all of them.
 *
 * Namespaces are not used — there is one scheduler on one page — so every call
 * goes onto the single queue, which is what the original snippet does for the
 * non-namespaced case too.
 */
function ensureCal(): CalFn {
  const w = window as CalWindow;
  if (w.Cal) return w.Cal;

  const cal = ((...args: unknown[]) => {
    if (!cal.loaded) {
      cal.ns = {};
      cal.q = cal.q ?? [];
      const script = document.createElement('script');
      script.src = EMBED_JS;
      script.async = true;
      document.head.appendChild(script);
      cal.loaded = true;
    }
    (cal.q ??= []).push(args);
  }) as CalFn;

  cal.q = [];
  w.Cal = cal;
  return cal;
}

/** Read the booking uid out of the event, whatever shape Cal.com sends. */
function bookingUidFrom(event: unknown): string {
  const data = (event as { detail?: { data?: Record<string, unknown> } })?.detail?.data;
  if (!data) return '';

  const booking = data.booking as Record<string, unknown> | undefined;
  /*
   * Three shapes, all read on purpose. Cal.com has moved the uid between
   * `data.booking.uid` and a flat `data.uid` across embed versions, and this
   * value is the one thing the hold route cannot work without — it is how the
   * booking is resolved and how the card hold stays idempotent. A silent shape
   * change here would break the funnel with no error in any log.
   */
  const uid = booking?.uid ?? data.uid ?? data.bookingUid;
  return typeof uid === 'string' ? uid : '';
}

export function CalEmbed({
  /** e.g. "juliana-beltran/vocal-assessment-online". */
  calLink,
  /** Prefill and metadata, as embed config entries. */
  config,
  /** The scheduler URL, for the open-in-a-new-tab escape hatch. */
  fallbackUrl,
  title,
  /**
   * Called with the booking uid the instant Cal.com reports a booking.
   *
   * Optional because not every embed needs to act on it: the assessment flow must
   * (it is how the $0 card hold is reached), while the post-purchase scheduler
   * has already taken the money and only needs Cal.com's own confirmation screen.
   */
  onBooked,
}: {
  calLink: string;
  config: Record<string, string>;
  fallbackUrl: string;
  title: string;
  onBooked?: (uid: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [stalled, setStalled] = useState(false);

  // The callback is held in a ref so re-renders (a keystroke in the form behind
  // this step, a resize) cannot cause the listener to be registered twice and
  // navigate twice on one booking.
  const booked = useRef(onBooked);
  booked.current = onBooked;
  const wantsCallback = Boolean(onBooked);

  useEffect(() => {
    if (!calLink) return;

    const Cal = ensureCal();
    const callback = (event: unknown) => {
      const uid = bookingUidFrom(event);
      // No uid means the hold route has nothing to resolve, so the webhook path
      // (fallback 3) is left to finish the job rather than sending the student to
      // a page that can only show an error.
      if (uid) booked.current?.(uid);
    };

    Cal('init', { origin: 'https://cal.com' });
    Cal('inline', {
      elementOrSelector: container.current,
      calLink,
      config,
    });
    if (wantsCallback) Cal('on', { action: 'bookingSuccessful', callback });

    /*
     * If embed.js is blocked — a content blocker, a corporate proxy, an offline
     * moment — nothing ever appears inside the container. Rather than leave a
     * silent empty box, the escape hatch below is promoted after a few seconds.
     */
    const timer = window.setTimeout(() => {
      if (!container.current?.querySelector('iframe')) setStalled(true);
    }, 7000);

    return () => {
      window.clearTimeout(timer);
      if (wantsCallback) Cal('off', { action: 'bookingSuccessful', callback });
    };
    // config is a fresh object each render; the values inside it are settled by
    // the time this step is reached, so the embed is initialised once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calLink, wantsCallback]);

  return (
    <>
      <div className="cal-embed" ref={container} title={title} />

      {stalled && (
        <div className="cal-fallback" role="status" style={{ marginTop: 16 }}>
          The calendar has not loaded — usually a content blocker. Open it in a new tab and your
          answers travel with it.
        </div>
      )}

      <p className="cal-note">
        Calendar not loading?{' '}
        <a
          href={fallbackUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--accent)', textDecoration: 'underline' }}
        >
          Open the scheduler in a new tab
        </a>{' '}
        — your answers are already attached to it.
      </p>
    </>
  );
}
