import type { Metadata } from 'next';
import type Stripe from 'stripe';
import Link from 'next/link';

import type { PlanErrorCode } from '@/app/api/stripe/plan/route';
import { Reveal } from '@/components/Reveal';
import { FIRST_CHARGE_OFFSET_DAYS } from '@/lib/booking';
import {
  PLAN_LINK_PATH,
  PLAN_START_ENDPOINT,
  verifyBookingToken,
  verifyFailureMessage,
} from '@/lib/booking-token';
import { formatUsd, modeLabel, type Price } from '@/lib/pricing';
import { pageMeta } from '@/lib/seo';
import { EMAIL } from '@/lib/site';
import { getStripe, stripeConfigured } from '@/lib/stripe';
import { toStudent } from '@/lib/students';

/**
 * noindex, and absent from app/sitemap.ts — which is an explicit allow-list of
 * marketing pages, so this route is excluded by construction rather than by
 * remembering to exclude it.
 *
 * There is nothing here to rank: without a signed token the page renders a short
 * "you need the link from your email" panel, and with one it is a single person's
 * payment page. Inviting crawlers to a route that starts subscriptions is the
 * opposite of what indexing is for.
 */
export const metadata: Metadata = pageMeta({
  title: 'Start your lesson plan',
  description: 'Start your monthly lesson plan on the card you already have on file.',
  path: PLAN_LINK_PATH,
  noindex: true,
});

/**
 * Rendered per request, never cached and never prerendered.
 *
 * This is not a performance knob. The page is keyed on a token in the query
 * string and shows one student's plan and billing state; a cached copy served to
 * the next visitor would be a data leak, and a prerendered one would be a page
 * about nobody.
 */
export const dynamic = 'force-dynamic';

/**
 * ===========================================================================
 * THE CONVERSION MOMENT. THIS PAGE'S BUTTON STARTS A REAL RECURRING CHARGE.
 * ===========================================================================
 * A student finishes the free assessment, gets an email, and clicks one link.
 * That link carries an HMAC-signed expiring token (lib/booking-token.ts) naming
 * their Stripe customer, their mode, their assessment date and their plan. This
 * page verifies it server-side, shows them exactly what they are about to buy,
 * takes an explicit tick, and starts the subscription against the card Stripe
 * already holds — no second checkout, because that card is already the customer's
 * `invoice_settings.default_payment_method`.
 *
 * ---------------------------------------------------------------------------
 * THIS PAGE VERIFIES BUT NEVER CHARGES. THE POST DOES.
 * ---------------------------------------------------------------------------
 * Rendering happens on GET; the subscription is created by a POST to
 * /api/stripe/plan. Every layer between an inbox and a click follows GET links —
 * mail prefetchers, corporate scanning gateways, antivirus proxies, chat
 * unfurlers — so a GET that billed a saved card would subscribe people who never
 * clicked anything. A form is the entire defence, because scanners do not submit
 * forms. Same contract /coach/account has with /api/stripe/portal, and worth more
 * here: a burnt portal session is an annoyance, an unwanted subscription is money.
 *
 * If you are tempted to "simplify" this by starting the plan in the page: read
 * the header of app/api/stripe/plan/route.ts first.
 *
 * ---------------------------------------------------------------------------
 * THE PRICE COMES FROM THE TOKEN AND THE RATE CARD. NOWHERE ELSE.
 * ---------------------------------------------------------------------------
 * No amount, no Stripe price id and no lookup key is ever read from the query
 * string. verifyBookingToken() resolves the plan out of the signed payload and
 * validates it against content/pricing.json, and hands back the Price. Every
 * figure on this page is arithmetic on that Price — there is not one typed number
 * in this file, because a page that states a price the card will not be charged is
 * worse than a page with no price on it.
 *
 * ---------------------------------------------------------------------------
 * NO CONVERSION FIRES FROM HERE
 * ---------------------------------------------------------------------------
 * `plan_started` is fired once, server-side, from the
 * `customer.subscription.created` webhook, with the Subscription id as
 * `transaction_id`. That is the only path common to both ways a plan can begin
 * (this link and scripts/start-plan.ts). A client-side conversion on the success
 * state below would double-count every plan in GA4 and inflate the value Smart
 * Bidding optimises against — so this file loads no analytics and is not a client
 * component.
 *
 * ---------------------------------------------------------------------------
 * WHAT MUST NEVER APPEAR HERE
 * ---------------------------------------------------------------------------
 * ASSESSMENT_CARD_COPY — "your card will not be charged" — is true beside the free
 * assessment and false on this page, which is the page that charges. It is
 * deliberately not imported. And no address or neighbourhood: in-person lessons
 * happen in a private residence and the location is shared privately after
 * booking, so the mode is only ever `modeLabel()`.
 */

/* ------------------------------------------------------------------ */
/* Copy                                                                */
/* ------------------------------------------------------------------ */

/**
 * One sentence per way this can fail, keyed as a TOTAL Record over the codes
 * /api/stripe/plan can return.
 *
 * Total on purpose: a new failure code added to that route without a sentence
 * here is a compile error, rather than `undefined` rendered into the page at
 * somebody's payment moment. The same trick, for the same reason, as
 * FAILURE_MESSAGES in lib/booking-token.ts — which earned it by being missed once.
 *
 * The token-verification reasons defer to verifyFailureMessage() rather than
 * being reworded here. That copy is deliberately built so a forged token and a
 * correctly-signed token presented at the wrong door read identically, and
 * rewriting it locally is how that property gets lost.
 */
const ERROR_COPY: Record<PlanErrorCode, string> = {
  no_secret: verifyFailureMessage('no_secret'),
  malformed: verifyFailureMessage('malformed'),
  bad_signature: verifyFailureMessage('bad_signature'),
  expired: verifyFailureMessage('expired'),
  wrong_purpose: verifyFailureMessage('wrong_purpose'),
  unknown_plan: verifyFailureMessage('unknown_plan'),
  not_configured:
    'Starting a plan online is being switched on. Email me and I will set yours up by hand the same day — nothing is lost.',
  no_consent:
    'Tick the box to confirm you understand the plan renews each month until you cancel, then press the button again.',
  already_active: 'You are already on a plan, so nothing has been started twice.',
  no_card:
    'I do not have a card on file for you yet, so there is nothing to start the plan against. Email me and I will send you a secure link to add one.',
  stripe_error:
    'That did not go through just now, and nothing has been charged. Try once more in a moment, or email me and I will start it by hand.',
};

/**
 * Unrecognised codes get the generic sentence rather than an error.
 *
 * A code this page does not know can only come from a hand-edited URL, so there
 * is no fault to report — and no point telling somebody their guess was wrong.
 */
const errorCopy = (code: string): string =>
  code in ERROR_COPY ? ERROR_COPY[code as PlanErrorCode] : ERROR_COPY.malformed;

/**
 * The automatic-renewal disclosure, composed from the rate card.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS COMPOSED HERE RATHER THAN IMPORTED
 * ---------------------------------------------------------------------------
 * PriceGrid.tsx has a `renewalDisclosure()` that says the same thing, but it is a
 * module-private function inside a client component; importing it would mean
 * exporting it from a file this change does not own, and pulling a client module
 * into a server page. So the ELEMENTS are recomposed from lib/pricing.ts, which is
 * the part that actually matters: both are arithmetic on the same Price, so
 * neither can drift from what Stripe charges.
 *
 * ---------------------------------------------------------------------------
 * WHAT THE LAW ASKS FOR, AND WHERE EACH PIECE IS
 * ---------------------------------------------------------------------------
 * California's Automatic Renewal Law (Bus. & Prof. Code §§17600–17606) applies
 * here exactly as it does at checkout — arguably more, because the card is
 * already on file and the student never sees a payment form. §17602(a)(1) requires
 * the automatic-renewal offer terms "in visual proximity to the request for
 * consent", clearly and conspicuously:
 *
 *   (A) that the subscription continues until the consumer cancels
 *         → "charged every month until you cancel"
 *   (B) the length and terms of the renewal period
 *         → "a month", plus what a month buys: `price.lessons` lessons of
 *           `price.duration` minutes
 *   (C) the amount that will be charged and the frequency
 *         → formatUsd(price.amountCents) + "a month"
 *
 * plus §17602(d)'s requirement that cancellation be available online, at will and
 * without further steps → "cancel any time from your billing page — no email and
 * no phone call", which is true: it is Stripe's Customer Portal, reached from
 * /coach/account, and the portal configuration in scripts/stripe-bootstrap.ts has
 * cancellation switched on.
 *
 * NEVER TYPE A PRICE INTO THIS FUNCTION. A disclosure is a promise about what a
 * card will be charged, and prose that disagrees with the rate card is not a
 * weaker disclosure, it is an inaccurate statement made to obtain payment.
 *
 * Plain words on purpose: "clear and conspicuous" is a comprehension standard,
 * and the people reading this are parents and adults, not lawyers.
 */
function renewalTerms(plan: Price, firstCharge: string): string {
  return (
    `${formatUsd(plan.amountCents)} a month for ${plan.lessons} lessons of ` +
    `${plan.duration} minutes, charged every month until you cancel. ` +
    `Your first payment is ${firstCharge} — not today. ` +
    `Cancel any time from your billing page — no email and no phone call.`
  );
}

/* ------------------------------------------------------------------ */
/* Dates                                                              */
/* ------------------------------------------------------------------ */

/**
 * "Thursday 20 August" — written out, in Los Angeles time.
 *
 * The timezone is pinned rather than left to the server. Vercel runs in UTC, so
 * an anchor at 6pm Pacific would render as the NEXT day to a student sitting in
 * Los Angeles. Being a day wrong about when money leaves someone's account is the
 * kind of small error that produces a large email.
 */
const longDate = (date: Date): string =>
  date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Los_Angeles',
  });

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const first = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value) ?? '';

const mailto = (subject: string) =>
  `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}`;

/** Statuses that mean "not on a plan". Mirrors DEAD_STATUSES in the POST route. */
const DEAD_STATUSES: ReadonlySet<Stripe.Subscription.Status> = new Set([
  'canceled',
  'incomplete_expired',
]);

const customerIdOf = (ref: string | Stripe.Customer | Stripe.DeletedCustomer | null): string | null =>
  typeof ref === 'string' ? ref : (ref?.id ?? null);

/**
 * What the page is actually showing.
 *
 * `offer` is the only state with a button in it. Everything else is either a dead
 * end with a way out, or a confirmation.
 */
type State = 'offer' | 'started' | 'active' | 'no-card' | 'not-configured' | 'stripe-error';

export default async function PlanPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const token = first(params.t);
  // Short codes set by /api/stripe/plan when it bounces someone back. Never
  // prose: nothing user-controlled is reflected into this page.
  const error = first(params.error);
  const startedId = first(params.started);

  /* ---------------------------------------------------------------- */
  /* 1. No token, or a token that does not verify                     */
  /* ---------------------------------------------------------------- */

  if (!token) {
    return (
      <DeadEnd
        lead="This page opens from the personal link in your email."
        body="It is the one that starts with /coach/book/plan?t= — the link I send after your assessment. Links expire, so if yours has, just ask and I will send a fresh one."
        subject="My lesson plan link"
      />
    );
  }

  /*
   * VERIFIED BEFORE ANYTHING IS RENDERED, AND BEFORE STRIPE IS TOUCHED.
   *
   * The order inside verifyBookingToken() is the load-bearing part: shape, then
   * HMAC signature by constant-time compare, then payload parse, then purpose,
   * then expiry, then the plan against the rate card. Nothing is read out of the
   * payload for any decision until the signature has passed — reading `exp` from
   * an unverified payload would let the holder set their own expiry, and reading
   * `purpose` would let an account token be promoted into a plan token.
   *
   * On failure the page says nothing about which check failed beyond what the
   * shared copy says, and never echoes the token back into the HTML. The two
   * outcomes an attacker could learn something from — a forged signature and a
   * correctly-signed token for the other door — are worded identically by design.
   */
  const verified = verifyBookingToken(token);
  if (!verified.ok) {
    // Logged without the token: it is a live credential until it expires.
    console.warn(`[book/plan] refused a plan token: ${verified.reason}`);
    return (
      <DeadEnd
        lead="That link is not working."
        body={verifyFailureMessage(verified.reason)}
        subject="My lesson plan link"
      />
    );
  }

  const { customerId, assessmentAt } = verified.payload;
  // Resolved from the signed payload against content/pricing.json by the verifier.
  // Never from the URL. See this file's header.
  const plan = verified.plan;

  /* ---------------------------------------------------------------- */
  /* 2. When the first charge lands                                   */
  /* ---------------------------------------------------------------- */

  /*
   * startPlan() sets `billing_cycle_anchor` to the assessment plus
   * FIRST_CHARGE_OFFSET_DAYS with `proration_behavior: 'none'`, so the first
   * invoice is the full month issued at the anchor and there is no prorated charge
   * today. That is the single most reassuring true fact this page has, so it is
   * computed from the same constant rather than described in words.
   *
   * An anchor already in the past is dropped by startPlan() — Stripe rejects one —
   * and billing starts immediately. Saying "a week after your assessment" in that
   * case would be false, so the copy switches.
   */
  const anchor = new Date(new Date(assessmentAt).getTime() + FIRST_CHARGE_OFFSET_DAYS * 86_400_000);
  const billsImmediately = anchor <= new Date();
  const projectedFirstCharge = billsImmediately ? new Date() : anchor;

  /* ---------------------------------------------------------------- */
  /* 3. Where this student actually stands with Stripe                */
  /* ---------------------------------------------------------------- */

  let state: State = 'offer';
  // Set only in the `started` state, and read from the Subscription itself rather
  // than recomputed — once it exists, Stripe's anchor is the authority.
  let confirmedFirstCharge: Date | null = null;

  if (!stripeConfigured()) {
    state = 'not-configured';
  } else {
    try {
      const stripe = getStripe();

      /*
       * ONE call, because it answers two questions: does this student have a card
       * on file (invoice_settings.default_payment_method), and has the webhook
       * already marked them as paying (metadata, via toStudent).
       */
      const customer = await stripe.customers.retrieve(customerId);
      if (customer.deleted) {
        console.error(`[book/plan] customer ${customerId} is deleted.`);
        state = 'stripe-error';
      } else {
        const student = toStudent(customer);
        const hasCard = Boolean(customer.invoice_settings?.default_payment_method);

        /*
         * JUST STARTED? The POST redirects back here with the Subscription id.
         *
         * That id is treated as a HINT TO GO AND LOOK, never as evidence. It is
         * checked against Stripe and against this token's customer before anything
         * congratulates anybody, so `?started=sub_whatever` typed by hand cannot
         * manufacture a confirmation — and cannot read another customer's
         * subscription either, because a mismatch is discarded.
         *
         * Its own try/catch: an id that does not exist is a 404 from Stripe, and a
         * hand-edited query parameter must not take down the rest of the page.
         */
        if (startedId.startsWith('sub_')) {
          try {
            const subscription = await stripe.subscriptions.retrieve(startedId);
            if (
              customerIdOf(subscription.customer) === customerId &&
              !DEAD_STATUSES.has(subscription.status)
            ) {
              state = 'started';
              confirmedFirstCharge = new Date(
                (subscription.billing_cycle_anchor ?? subscription.created) * 1000,
              );
            }
          } catch {
            // Falls through to the checks below, which is the honest outcome:
            // we could not confirm it, so we do not claim it.
          }
        }

        if (state !== 'started') {
          /*
           * ALREADY ON A PLAN, from an earlier click or from the teacher starting
           * it by hand. Read from the customer's `stage` metadata (written by the
           * subscription webhook), which is a cheap read and accurate for the real
           * case: somebody re-opening a link days or weeks later.
           *
           * It can lag the webhook by seconds, so it is NOT the safeguard against
           * a double subscription. That lives in the POST route, which lists live
           * subscriptions from Stripe before creating anything — a page render
           * cannot be the thing standing between a student and a second charge.
           *
           * `churned` deliberately falls through to the offer: someone who
           * cancelled and came back is a win-back, not a duplicate.
           */
          if (error === 'already_active' || student.stage === 'active') state = 'active';
          else if (!hasCard) state = 'no-card';
        }
      }
    } catch (caught) {
      // Never surface a Stripe error to a student: they name customer ids and
      // account state. Logged for us, one actionable sentence for them.
      console.error(`[book/plan] could not read ${customerId} from Stripe`, caught);
      state = 'stripe-error';
    }
  }

  /* ---------------------------------------------------------------- */
  /* 4. Render                                                        */
  /* ---------------------------------------------------------------- */

  const firstChargeLabel = longDate(projectedFirstCharge);

  return (
    <div className="page-fade">
      <Reveal />
      <div className="wrap">
        <section className="svc-page-hero" style={{ paddingBottom: 20 }}>
          <div className="eyebrow">{state === 'started' ? 'You are in' : 'Your lesson plan'}</div>
          <h1>
            {state === 'started' ? (
              <>
                Your plan is <span className="it">on.</span>
              </>
            ) : state === 'active' ? (
              <>
                You are already <span className="it">on a plan.</span>
              </>
            ) : (
              <>
                Start your <span className="it">plan.</span>
              </>
            )}
          </h1>
          <p className="prose" style={{ fontSize: 20, marginTop: 24, maxWidth: 640 }}>
            {state === 'started'
              ? 'That is everything. Your lesson slot is yours, and your receipt is on its way by email.'
              : state === 'active'
                ? 'Nothing has been started twice, and you have not been charged twice.'
                : state === 'offer'
                  ? `${plan.lessons} lessons a month, on the card you have already given me. Nothing is charged today — your first payment is ${firstChargeLabel}.`
                  : // Deliberately no date and no price in the states where we could
                    // not read this student's details. Stating when a payment will
                    // land, in a panel that exists because something did not work,
                    // is a promise made on incomplete information.
                    'Nothing has been charged, and nothing has been started.'}
          </p>
        </section>

        <section className="block" style={{ paddingTop: 10, paddingBottom: 80 }}>
          <div style={{ maxWidth: 640 }}>
            {/*
              Above the button, never instead of it. A student refused for a
              recoverable reason — an unticked box, a wobble at Stripe — has to be
              able to try again without hunting for the link a second time.
              role="alert" so it is announced rather than appearing quietly under a
              button they have already looked away from.
            */}
            {/* Suppressed in the two states that already say it in full sentences
                of their own — a banner repeating the panel underneath it reads as
                two different systems talking. */}
            {error && state !== 'started' && state !== 'active' && (
              <div className="bform-summary" role="alert" style={{ marginBottom: 28, fontSize: 19 }}>
                {errorCopy(error)}
              </div>
            )}

            {/* What you are buying. Every figure is arithmetic on the rate card. */}
            {(state === 'offer' || state === 'started') && (
              <>
                <div className="tier-amount">{formatUsd(plan.amountCents)}</div>
                <div className="tier-per" style={{ marginTop: 8 }}>
                  per month · {plan.lessons} lessons a month · {plan.duration} minutes each ·{' '}
                  {modeLabel(plan.mode)}
                </div>

                <ul className="numbered" style={{ marginTop: 34 }}>
                  <li style={{ fontSize: 19 }}>
                    <span className="n">01</span>
                    <span>
                      <span className="t">
                        {plan.lessons} lessons a month, {plan.duration} minutes each
                      </span>
                      One to one, always with me. Your slot is held in the week — and a month with a
                      fifth of your weekday is still {plan.lessons} lessons, so nothing about the
                      count is ever a surprise.
                    </span>
                  </li>
                  <li style={{ fontSize: 19 }}>
                    <span className="n">02</span>
                    <span>
                      <span className="t">
                        First payment {confirmedFirstCharge ? longDate(confirmedFirstCharge) : firstChargeLabel}
                      </span>
                      {billsImmediately
                        ? 'Your assessment was more than a week ago, so billing starts now rather than being held back any further.'
                        : 'A week after your assessment, and after your first paid lesson — so you have had a real lesson on the plan before any money moves.'}
                    </span>
                  </li>
                  <li style={{ fontSize: 19 }}>
                    <span className="n">03</span>
                    <span>
                      <span className="t">Cancel or pause whenever you need</span>
                      Cancelling is a button on your own billing page — no email, no phone call, no
                      notice period. Lessons already paid for stay yours.
                    </span>
                  </li>
                </ul>
              </>
            )}

            {/* ---------------- The offer, and the only button ---------------- */}
            {state === 'offer' && (
              /*
               * A form POSTing to /api/stripe/plan, with no JavaScript anywhere
               * near it. Two reasons, and both are load-bearing:
               *
               *   A GET cannot start a subscription. Mail scanners, link
               *   unfurlers and antivirus proxies fetch URLs out of email; none of
               *   them submit forms. See the route's header.
               *
               *   It works with scripting off, on an old phone, through a corporate
               *   proxy that strips bundles. This is the page that takes the money,
               *   so it must not be the one that needs fetch() to work.
               */
              <form method="POST" action={PLAN_START_ENDPOINT} style={{ marginTop: 40 }}>
                <input type="hidden" name="t" value={token} readOnly />

                {/*
                  ARL §17602(a)(1): the renewal terms and the request for consent
                  sit together, immediately above the button — "in visual proximity",
                  not behind a link and not further down the page. At reading size,
                  because "clear and conspicuous" is about comprehension and small
                  grey type beside a recurring charge is the pattern the statute
                  exists to prohibit.
                */}
                <div className="renew-terms">
                  <span id="renew-terms-text" className="renew-terms-text" style={{ fontSize: 19 }}>
                    {renewalTerms(plan, firstChargeLabel)}
                  </span>
                  {/*
                    UNTICKED, always. This is the ARL's affirmative consent: a
                    pre-ticked box is a default, not agreement. `required` makes the
                    browser refuse the submit, and /api/stripe/plan checks the field
                    again server-side — the attribute is a courtesy, not a control.
                    The label wraps the input so the words are part of the hit area,
                    which matters because most of these clicks are on a phone.
                  */}
                  <label className="renew-consent" htmlFor="renew-consent" style={{ fontSize: 19 }}>
                    <input
                      id="renew-consent"
                      name="consent"
                      value="yes"
                      type="checkbox"
                      required
                      aria-describedby="renew-terms-text"
                    />
                    <span>I understand this renews each month until I cancel.</span>
                  </label>
                </div>

                <button type="submit" className="btn btn--solid" aria-describedby="renew-terms-text">
                  Start my plan <span className="arrow">&rarr;</span>
                </button>

                <p className="prose" style={{ marginTop: 22, fontSize: 17 }}>
                  This uses the card you already have on file — there is no form to fill in and
                  nothing to re-enter. Cards live at Stripe; this website never sees them.
                </p>
              </form>
            )}

            {/* ---------------- Everything that is not the offer ---------------- */}
            {state === 'started' && (
              <div className="cal-fallback" style={{ marginTop: 36, fontSize: 19 }}>
                <p style={{ margin: '0 0 14px' }}>
                  Your receipt and your billing link are on their way by email. Keep that email —
                  the billing link in it is how you change your card, download invoices or cancel,
                  all of it without asking me.
                </p>
                <p style={{ margin: 0 }}>
                  Anything at all, reply to it or write to{' '}
                  <a
                    href={mailto('My lesson plan')}
                    style={{ color: 'var(--accent)', textDecoration: 'underline' }}
                  >
                    {EMAIL}
                  </a>
                  .
                </p>
              </div>
            )}

            {state === 'active' && (
              /*
               * NO BILLING LINK IS MINTED HERE, AND THAT IS DELIBERATE.
               *
               * We could sign an account token and drop it into this page — the
               * customer id is right there. We do not, because a plan token and an
               * account token grant different things on purpose (see TokenPurpose
               * in lib/booking-token.ts): the account token can cancel the
               * subscription and read every past invoice. Handing one to whoever
               * holds a plan link would quietly collapse that separation and make
               * the plan link the more powerful of the two.
               *
               * So this points at the billing page and at the receipt email that
               * carries the real link, which costs a returning student one extra
               * step and costs a forwarded link nothing at all.
               */
              <div className="cal-fallback" style={{ marginTop: 36, fontSize: 19 }}>
                <p style={{ margin: '0 0 14px' }}>
                  Your plan is already running, so there is nothing to start. To change your card,
                  download an invoice, pause or cancel, use the billing link in any of your
                  receipts — it opens{' '}
                  <Link href="/coach/account" style={{ color: 'var(--accent)' }}>
                    your billing page
                  </Link>
                  . That link is personal to you, which is why it lives in your email and not on
                  this page.
                </p>
                <p style={{ margin: 0 }}>
                  Cannot find it? Write to{' '}
                  <a
                    href={mailto('Billing — my lesson plan')}
                    style={{ color: 'var(--accent)', textDecoration: 'underline' }}
                  >
                    {EMAIL}
                  </a>{' '}
                  and I will send a fresh one.
                </p>
              </div>
            )}

            {(state === 'no-card' || state === 'not-configured' || state === 'stripe-error') && (
              <div className="cal-fallback" style={{ marginTop: 36, fontSize: 19 }}>
                <p style={{ margin: '0 0 14px' }}>{errorCopy(stateCode(state))}</p>
                <p style={{ margin: 0 }}>
                  <a
                    href={mailto('Starting my lesson plan')}
                    style={{ color: 'var(--accent)', textDecoration: 'underline' }}
                  >
                    {EMAIL}
                  </a>
                </p>
              </div>
            )}

            <p className="prose" style={{ marginTop: 44, fontSize: 17 }}>
              Prices in US dollars. Questions before you start?{' '}
              <Link href="/coach/faq" style={{ color: 'var(--accent)' }}>
                Read the FAQ
              </Link>{' '}
              or just email me.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

/**
 * The three "we cannot offer you the button" states, mapped onto the copy the
 * POST route would have used for the same situation.
 *
 * One sentence per situation rather than two, so a student who arrives at it from
 * either direction — a failed POST or a page load that already knew — reads
 * exactly the same thing.
 */
function stateCode(state: 'no-card' | 'not-configured' | 'stripe-error'): PlanErrorCode {
  switch (state) {
    case 'no-card':
      return 'no_card';
    case 'not-configured':
      return 'not_configured';
    case 'stripe-error':
      return 'stripe_error';
  }
}

/**
 * A dead link, explained without leaking anything.
 *
 * No token is echoed, no verification detail is given beyond the shared copy, and
 * every branch ends in an email address — because the person reading it was, a
 * moment ago, trying to pay for singing lessons, and a dead end here is a lost
 * student rather than a bug report.
 */
function DeadEnd({
  lead,
  body,
  subject,
}: {
  lead: string;
  body: string;
  subject: string;
}) {
  return (
    <div className="page-fade">
      <Reveal />
      <div className="wrap">
        <section className="svc-page-hero" style={{ paddingBottom: 20 }}>
          <div className="eyebrow">Your lesson plan</div>
          <h1>
            Start your <span className="it">plan.</span>
          </h1>
          <p className="prose" style={{ fontSize: 20, marginTop: 24, maxWidth: 620 }}>
            {lead}
          </p>
        </section>

        <section className="block" style={{ paddingTop: 10, paddingBottom: 80 }}>
          <div style={{ maxWidth: 620 }}>
            <div className="cal-fallback" style={{ fontSize: 19 }}>
              <p style={{ margin: '0 0 14px' }}>{body}</p>
              <p style={{ margin: 0 }}>
                <a
                  href={mailto(subject)}
                  style={{ color: 'var(--accent)', textDecoration: 'underline' }}
                >
                  {EMAIL}
                </a>
              </p>
            </div>

            <p className="prose" style={{ marginTop: 40, fontSize: 17 }}>
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
