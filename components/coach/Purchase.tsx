'use client';

import { createContext, useContext, useEffect, useId, useRef, useState } from 'react';

import { GA_ENABLED, GA_MEASUREMENT_ID, funnelParams, getAttribution, track } from '@/lib/analytics';
import { EMAIL } from '@/lib/site';

/**
 * Direct purchase: the buy control that turns a rate-card row into a sale.
 *
 * ===========================================================================
 * WHY THIS EXISTS ALONGSIDE THE FREE ASSESSMENT RATHER THAN INSTEAD OF IT
 * ===========================================================================
 * Every path used to funnel through the form → scheduler → $0 card hold. That
 * is the right first step for a stranger who just searched "vocal coach los
 * angeles" and has no reason yet to hand over $360. It is the wrong step for
 * someone who arrived on /coach/pricing already knowing what they want: making
 * that person sit through a free assessment before they are allowed to pay is
 * friction dressed up as generosity, and it delays revenue by a week.
 *
 * So both paths ship, and each page nominates exactly one of them as primary.
 * The rule is in the page files; this component is only the purchase half.
 *
 * ===========================================================================
 * THE BUTTON SENDS A LOOKUP KEY AND NEVER AN AMOUNT
 * ===========================================================================
 * The POST body carries `lookupKey` — the stable handle from
 * content/pricing.json — and the server resolves the price against the rate
 * card itself. A client that could name its own price is a client that can pay
 * $1 for a $700 pack by editing one line in devtools. There is deliberately no
 * `amount`, `price` or `total` prop anywhere in this file, and adding one would
 * be a security bug rather than a convenience.
 *
 * ===========================================================================
 * ORDER OF OPERATIONS: PAY, THEN SCHEDULE
 * ===========================================================================
 * Checkout completes → /coach/purchase/confirmed → Cal.com. Collecting the
 * money first means the slot that gets held is a paid slot; the reverse order
 * produces held calendar time for people who never complete the payment.
 *
 * ===========================================================================
 * WHAT THIS FILE MEASURES, AND WHAT WAS INVISIBLE BEFORE IT DID
 * ===========================================================================
 * The purchase path reported exactly one thing: `pack_purchased` /
 * `plan_started`, fired from the Stripe webhook once the money settled. Nothing
 * recorded that a checkout had been OPENED, which made two very different
 * situations produce identical data — nobody clicking the buy button, and
 * everybody clicking it and abandoning Stripe's page. It also made the entire
 * failure surface below silent: a 503 from /api/stripe/checkout means Stripe
 * credentials are missing and every purchase on the site is failing, and the
 * only person who ever found out was the buyer reading "Purchasing is not
 * switched on yet".
 *
 * So two events fire from here:
 *
 *   checkout_started  a payable Checkout Session now exists. `transaction_id` is
 *                     the Session id — the SAME identifier `pack_purchased`
 *                     carries from the webhook — so started-versus-completed is
 *                     a join rather than an inference.
 *   checkout_blocked  the attempt stopped before a session existed, with the
 *                     reason. Consent not ticked, guardian email missing, or one
 *                     of the three server failures.
 *
 * Neither can double-count against a server-side conversion: both describe a
 * moment BEFORE any money moves, and neither shares an event name with anything
 * the webhook sends. See the warning on checkout_started in lib/analytics.ts
 * about why it must not be imported into Google Ads.
 */

const CHECKOUT_ENDPOINT = '/api/stripe/checkout';

/**
 * The delivery mode, read off the lookup key's own prefix.
 *
 * `mode` is one of the three dimensions every conversion here has to be
 * sliceable by (online LTV is $2,520 against in-person's $3,240, so a blended
 * CPA is a wrong number rather than a summary), and this component cannot get it
 * the honest way: lib/pricing.ts is deliberately not imported into this client
 * bundle, and adding a `mode` prop would mean editing PriceGrid and every page
 * that renders it.
 *
 * The keys in content/pricing.json are `{mode}_{type}_{duration}` —
 * `online_pack_10`, `inperson_monthly_60` — and lib/pricing.ts's build-time
 * invariants keep that shape honest. Returns null rather than guessing if the
 * shape ever changes, which reports as `mode: 'none'`: a visibly wrong value in
 * a report beats a confidently wrong one, and `lookup_key` is still sent in full
 * so the slice is recoverable either way.
 */
function modeFromLookupKey(lookupKey: string): 'online' | 'inperson' | null {
  if (lookupKey.startsWith('inperson')) return 'inperson';
  if (lookupKey.startsWith('online')) return 'online';
  return null;
}

/**
 * Ad-click ids, read straight off the current URL and merged over the latched
 * set from lib/analytics.ts.
 *
 * The latch is the path that matters — it is what carries a click id from a
 * landing page through to wherever the purchase happens. This direct read covers
 * the one case the latch cannot: sessionStorage unavailable (private-mode Safari,
 * cookie-blocked contexts), where the write silently fails.
 *
 * Worth the redundancy because the loss is permanent. Google Ads Offline
 * Conversion Import is keyed SOLELY on the click id, with no email fallback, and
 * a gclid cannot be reconstructed after the fact — so a pack sale that arrives
 * without one can never have its true value attributed to the click that paid
 * for it.
 */
const CLICK_ID_KEYS = ['gclid', 'gbraid', 'wbraid'] as const;

function clickIdsFromUrl(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  const found: Record<string, string> = {};
  for (const key of CLICK_ID_KEYS) {
    const value = params.get(key);
    if (value) found[key] = value.slice(0, 200);
  }
  return found;
}

/**
 * The purchase copy that must NOT be confused with the assessment's card copy.
 *
 * ASSESSMENT_CARD_COPY ("you won't be charged") is true beside the free
 * assessment and FALSE beside a buy button, where the card is charged in full
 * and immediately. So the two notes are separate constants in separate files,
 * and this is the one that belongs next to a price.
 */
export const PURCHASE_NOTE = 'Paid in full now. You choose your lesson times on the next page.';

/* ------------------------------------------------------------------ */
/* Scope — the guardian question, asked once per rate card             */
/* ------------------------------------------------------------------ */

type PurchaseContext = {
  guardianEmail: string;
  isMinor: boolean;
  guardianFieldId: string;
  focusGuardian: () => void;
  /** GA4 client_id, so a purchase conversion has a session to attach to. */
  gaClientId: string;
};

const PurchaseCtx = createContext<PurchaseContext | null>(null);

/**
 * Wraps a set of rate-card rows and owns the under-18 question for all of them.
 *
 * WHY THE QUESTION IS HERE AND NOT ON EACH BUTTON: students are 5 to 70+, so a
 * meaningful share of these purchases are made by a parent. A minor cannot enter
 * a payment agreement, which makes the guardian the actual counterparty, and the
 * guardian's email is what receipts, cancellation notices and the address for an
 * in-person lesson have to reach. Asking once above four buy buttons is one
 * question; asking inside each button is four, and three of them are wasted.
 *
 * It is a disclosure rather than a required field because the common case is an
 * adult buying for themselves, and a mandatory "are you a child?" gate in front
 * of every purchase would cost more sales than it protects.
 */
export function PurchaseScope({ children }: { children: React.ReactNode }) {
  const [isMinor, setIsMinor] = useState(false);
  const [guardianEmail, setGuardianEmail] = useState('');
  const [gaClientId, setGaClientId] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const base = useId();
  const guardianFieldId = `${base}-guardian`;

  /**
   * THE JOIN, for the purchase path.
   *
   * Asked for once per rate card rather than once per button. The GA4 client_id
   * is only obtainable by asking gtag, and only after the loader has run; it goes
   * onto the Stripe Customer at checkout so the `pack_purchased` /
   * `plan_started` conversion fired later from the webhook has a session to
   * attach to. Without it that conversion lands in GA4 as "(not set)" — no
   * source, no campaign, nothing for Smart Bidding to learn from.
   *
   * If GA is disabled or blocked the callback never fires and this stays empty.
   * The purchase still completes; only the attribution is lost, which is the
   * right way round to degrade.
   */
  useEffect(() => {
    if (!GA_ENABLED) return;
    window.gtag?.('get', GA_MEASUREMENT_ID, 'client_id', (id: unknown) => {
      if (typeof id === 'string' && id) setGaClientId(id);
    });
  }, []);

  return (
    <PurchaseCtx.Provider
      value={{
        guardianEmail: guardianEmail.trim(),
        isMinor,
        guardianFieldId,
        focusGuardian: () => inputRef.current?.focus(),
        gaClientId,
      }}
    >
      {children}

      <div className="buy-guardian">
        <label className="buy-guardian-check" htmlFor={`${base}-minor`}>
          <input
            id={`${base}-minor`}
            type="checkbox"
            checked={isMinor}
            onChange={(e) => setIsMinor(e.target.checked)}
          />
          <span>The student is under 18</span>
        </label>
        {/* One checkbox, one field, no explanation. The reasoning used to be
            printed here in two sentences; it belongs in this comment, not on a
            payment page. A minor cannot enter a payment agreement, so the
            guardian is the actual counterparty and their email is what receipts,
            cancellation notices and the in-person address have to reach. */}
        {isMinor && (
          <div className="buy-guardian-field">
            <label htmlFor={guardianFieldId}>Parent or guardian email</label>
            <input
              ref={inputRef}
              id={guardianFieldId}
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={guardianEmail}
              onChange={(e) => setGuardianEmail(e.target.value)}
              placeholder="guardian@example.com"
            />
          </div>
        )}
      </div>
    </PurchaseCtx.Provider>
  );
}

/* ------------------------------------------------------------------ */
/* The buy button                                                      */
/* ------------------------------------------------------------------ */

type BuyButtonProps = {
  /** Stable handle from content/pricing.json. NEVER an amount. */
  lookupKey: string;
  /** The verb — "Choose". Passed in so this file never imports lib/pricing. */
  label: string;
  /**
   * The same verb plus the tier name, e.g. "Choose Monthly — 4 lessons".
   *
   * Every card's visible label is the same word on purpose, which is right for
   * someone scanning the page and wrong for someone hearing the buttons read out
   * one after another. This is what a screen reader announces instead.
   */
  ariaLabel?: string;
  /**
   * `solid` for the recommended tier, `outline` for the rest. Both are real
   * buttons at the same size — the weighting is emphasis, not availability, and
   * the recommendation is carried by the text label on the card, never by the
   * button styling alone.
   */
  variant?: 'solid' | 'outline';
  /**
   * Present ONLY for recurring plans, absent for one-time purchases.
   *
   * California's Automatic Renewal Law (Bus. & Prof. Code §§17600–17606, as
   * amended by AB 2863 for contracts entered into on or after 1 July 2025)
   * requires that the renewal terms sit "in visual proximity to the request for
   * consent" and that the business obtain "the consumer's affirmative consent to
   * the agreement containing the automatic renewal offer terms". §17602(a)(1)
   * spells out what the terms must say: that it renews until cancelled, the
   * length and terms of the renewal period, and the amount and frequency of the
   * charges. There is no small-business exemption, and §17600's stated intent
   * covers "ongoing deliveries of service".
   *
   * A bare "Choose" click with the terms elsewhere on the page — which is what
   * this component did before — is the textbook failure case. So is a
   * pre-ticked box: consent has to be affirmative, which means the visitor
   * ticks it.
   *
   * `disclosure` is composed on the server from content/pricing.json, because
   * this is a client component and importing lib/pricing here would ship the
   * whole catalogue to the browser. It must never be typed by hand — a
   * disclosure stating a price the rate card does not charge is worse than none.
   */
  recurring?: { disclosure: string };
};

/**
 * One row's purchase control.
 *
 * lib/pricing.ts is deliberately not imported here: this is a client component,
 * and importing the rate card would ship the whole catalogue plus its build-time
 * invariant block into the browser bundle. The label and the lookup key are
 * computed on the server and handed down as strings.
 */
export function BuyButton({
  lookupKey,
  label,
  ariaLabel,
  variant = 'outline',
  recurring,
}: BuyButtonProps) {
  const scope = useContext(PurchaseCtx);
  if (!scope) {
    // A buy button outside a PurchaseScope has no way to collect a guardian
    // email, so a purchase for a minor would complete with the student as the
    // payer. Failing loudly beats shipping that quietly.
    throw new Error(
      'BuyButton must be rendered inside <PurchaseScope>: the under-18 guardian ' +
        'question lives on the scope, and a purchase for a minor cannot complete without it.',
    );
  }

  /*
   * Re-bound into a local so the async handler below can rely on it.
   *
   * `buy` is a hoisted function declaration, so TypeScript cannot prove the throw
   * above has already run by the time it is called and keeps `scope` as possibly
   * null inside it. Aliasing after the guard gives the closure a non-nullable
   * binding without a `!` assertion — which would silence the checker on exactly
   * the invariant this component throws to protect.
   */
  const ctx = scope;

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /*
   * Starts false, always. This is the ARL's "affirmative consent" — a pre-ticked
   * box is not consent, it is a default. Deliberately not persisted anywhere:
   * every purchase gets its own tick.
   */
  const [renewalConsent, setRenewalConsent] = useState(false);
  const consentId = `renew-consent-${lookupKey}`;
  const disclosureId = `renew-terms-${lookupKey}`;

  /**
   * The three slicing dimensions plus the one this path adds.
   *
   * `purchase_kind` comes from the presence of `recurring` rather than from
   * parsing the lookup key, because that prop is the authoritative answer to
   * "is this a subscription": it is what makes the ARL disclosure render, and a
   * plan without it would be a legal bug long before it was a reporting one.
   */
  const purchaseParams = {
    ...funnelParams({
      mode: modeFromLookupKey(lookupKey),
      lookupKey,
      isMinor: ctx.isMinor,
    }),
    purchase_kind: recurring ? 'plan' : 'one_off',
  };

  async function buy() {
    setError(null);

    // Recurring plans cannot proceed without the tick. Checked before the
    // guardian branch below only because it is the cheaper test; both must pass.
    if (recurring && !renewalConsent) {
      setError('Tick the box to confirm you understand the plan renews each month until you cancel.');
      document.getElementById(consentId)?.focus();
      /*
       * Worth measuring rather than assuming. The ARL tick is a legally required
       * piece of friction on the highest-value tier, and this is the only way to
       * know whether it is a formality people click through or a wall they stop
       * at. If this reason dominates checkout_blocked, the fix is the disclosure's
       * wording and placement — not the price.
       */
      track('checkout_blocked', { ...purchaseParams, reason: 'renewal_consent' });
      return;
    }

    if (ctx.isMinor && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(ctx.guardianEmail)) {
      setError('Add a parent or guardian email first — they are the ones who pay.');
      ctx.focusGuardian();
      // The reason only, never the address that failed the test.
      track('checkout_blocked', { ...purchaseParams, reason: 'guardian_email' });
      return;
    }

    setBusy(true);
    try {
      /**
       * POST /api/stripe/checkout. Landed; the contract it honours is:
       *
       *   request   { lookupKey, email?, name?, guardianEmail?, gaClientId?,
       *               utm_*, gclid, gbraid, wbraid }   — content-type JSON
       *   response  200 { url, sessionId, lookupKey, amountCents }
       *             400 unknown/unsellable lookupKey
       *             503 Stripe not configured on this deployment
       *             502 Stripe unreachable
       *
       * `lookupKey` is validated against content/pricing.json server-side and NO
       * amount is ever accepted from here — see that route's header. So sending a
       * key that is not in the rate card fails with a 400 rather than charging
       * something unexpected.
       *
       * The `content-type: application/json` below is load-bearing: the route
       * answers a form POST with a 303 to Stripe and a JSON POST with a JSON body,
       * and it decides which by that header. Drop it and this fetch would follow a
       * redirect and try to parse Stripe's HTML.
       */
      const res = await fetch(CHECKOUT_ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          lookupKey,
          ...(ctx.isMinor ? { guardianEmail: ctx.guardianEmail } : {}),
          // UTMs and the ad-click ids, so the sale can be attributed back to the
          // click that paid for it. See lib/analytics.ts.
          ...getAttribution(),
          // Read again straight off the URL, because a click id that is not
          // captured here is permanently unattributable. See clickIdsFromUrl.
          ...clickIdsFromUrl(),
          ...(ctx.gaClientId ? { gaClientId: ctx.gaClientId } : {}),
        }),
      });

      if (!res.ok) {
        /*
         * The three failures the route distinguishes, kept distinct here because
         * they need different actions from the buyer:
         *
         *   503  Stripe is not configured on this deployment. Nothing the visitor
         *        can do; offer the human path.
         *   400  the lookup key is not in the rate card — our bug, not theirs, and
         *        one the build guards in PriceGrid are meant to make impossible.
         *   502  Stripe was unreachable. Worth a retry.
         */
        setError(
          res.status === 502
            ? 'Checkout did not open just then. Try again in a moment, or email me.'
            : 'Purchasing is not switched on yet. Email me and I will send you a payment link the same day.',
        );
        /*
         * THE OUTAGE ALARM. Each of these three is a lost sale, and until now all
         * three were completely silent — the buyer read a sentence offering them an
         * email address and nobody else ever knew.
         *
         *   not_configured  a 503: Stripe is not configured on this deployment, so
         *                   EVERY purchase is failing right now. If this appears in
         *                   GA4 at all, stop reading reports and check the env vars.
         *   unknown_tier    a 400: the lookup key is not in the rate card. Our bug,
         *                   and one the PriceGrid build guards are meant to make
         *                   impossible, so it is worth knowing they did not.
         *   unreachable     a 502: Stripe was down or slow. Worth a retry, and the
         *                   volume tells you whether the retry copy is enough.
         */
        track('checkout_blocked', {
          ...purchaseParams,
          reason:
            res.status === 502
              ? 'unreachable'
              : res.status === 400
                ? 'unknown_tier'
                : 'not_configured',
          http_status: res.status,
        });
        setBusy(false);
        return;
      }

      /*
       * `sessionId` and `amountCents` are part of the route's documented response
       * (see the contract above) and are read here rather than ignored, because
       * they are what make this event answerable: the session id is the join key
       * to `pack_purchased`, and the amount is what "abandoned checkout" is worth
       * in dollars.
       */
      const data = (await res.json()) as { url?: string; sessionId?: string; amountCents?: number };
      if (!data.url) {
        setError('Checkout did not open. Email me and I will send you a payment link.');
        // A 200 with no `url` should be impossible; reported rather than assumed
        // away, because it would otherwise look identical to a buyer who simply
        // never clicked.
        track('checkout_blocked', { ...purchaseParams, reason: 'no_url' });
        setBusy(false);
        return;
      }

      /*
       * CHECKOUT INITIATED. Fired after the session exists and before the
       * navigation, so it means "a payable session was created", not "a button was
       * clicked" — the difference matters because a click that fails to produce a
       * session is already reported above as checkout_blocked.
       *
       * transaction_id is the Checkout Session id, which is EXACTLY the value
       * `pack_purchased` sends as its own transaction_id from the webhook
       * (app/api/stripe/webhook/route.ts, the onCheckoutCompleted branch). So a
       * started session and the sale it became are one join, and everything
       * without a match is an abandoned Stripe page.
       *
       * The plan path is only half-joinable and it is worth being honest about
       * that: `plan_started` uses the SUBSCRIPTION id as its transaction_id,
       * because it also fires for plans that never had a Checkout Session at all.
       * A per-session join for subscriptions needs `session_id` added to that
       * event's params in the webhook — see docs/measurement-spec.md, which names
       * the exact line. Until then, plan checkout abandonment is a cohort number
       * (checkout_started where purchase_kind='plan' versus plan_started) rather
       * than a per-buyer one.
       *
       * `value` is sent so abandoned checkout can be counted in dollars, and it is
       * the reason this event MUST NOT be imported into Google Ads: alongside
       * pack_purchased it would count the same money at session open and again at
       * payment, and Smart Bidding would bid against revenue nobody collected.
       * GA4 also drops `value` silently unless `currency` is beside it, so the two
       * are set together.
       */
      track('checkout_started', {
        ...purchaseParams,
        transaction_id: data.sessionId ?? '',
        session_id: data.sessionId ?? '',
        ...(typeof data.amountCents === 'number'
          ? { value: data.amountCents / 100, currency: 'USD' }
          : {}),
      });

      // Full navigation, not router.push: the destination is Stripe's own host.
      window.location.assign(data.url);
    } catch {
      setError('That did not go through. Check your connection, or email me and I will help.');
      // Distinct from `unreachable`: this is the fetch itself failing — the
      // visitor's connection, or a blocker sitting on our own endpoint — so no
      // HTTP status exists to report.
      track('checkout_blocked', { ...purchaseParams, reason: 'network' });
      setBusy(false);
    }
  }

  return (
    <span className="tier-buy">
      {/*
        ARL §17602(a)(1): the renewal terms and the tick sit immediately above the
        button — "in visual proximity to the request for consent" — not behind a
        link and not further down the page. Reading size, not fine print: the
        statute says clear and conspicuous, and small grey text next to a charge is
        the thing it exists to prohibit.
      */}
      {recurring && (
        <span className="renew-terms">
          <span id={disclosureId} className="renew-terms-text">
            {recurring.disclosure}
          </span>
          <label className="renew-consent" htmlFor={consentId}>
            <input
              id={consentId}
              type="checkbox"
              checked={renewalConsent}
              onChange={(e) => setRenewalConsent(e.target.checked)}
              aria-describedby={disclosureId}
            />
            <span>I understand this renews each month until I cancel.</span>
          </label>
        </span>
      )}

      <button
        type="button"
        className={`btn tier-btn${variant === 'solid' ? ' btn--solid' : ''}`}
        onClick={buy}
        disabled={busy}
        aria-busy={busy}
        aria-label={ariaLabel}
        aria-describedby={
          [
            recurring ? disclosureId : null,
            scope.isMinor ? scope.guardianFieldId : null,
          ]
            .filter(Boolean)
            .join(' ') || undefined
        }
      >
        {busy ? 'Opening checkout…' : label}
      </button>

      {/* role=alert so a failure is announced rather than silently appearing
          under a button the visitor has already looked away from. */}
      {error && (
        <span className="buy-error" role="alert">
          {error}{' '}
          <a href={`mailto:${EMAIL}?subject=${encodeURIComponent(`Paying for lessons — ${lookupKey}`)}`}>
            {EMAIL}
          </a>
        </span>
      )}
    </span>
  );
}
