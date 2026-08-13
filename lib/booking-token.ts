import { createHmac, timingSafeEqual } from 'node:crypto';
import { PRICES, monthlyPlans, type LessonMode, type Price } from '@/lib/pricing';

/**
 * Signed, expiring links — the whole of "authentication" for this site.
 *
 * ---------------------------------------------------------------------------
 * WHY A SIGNED LINK AND NOT AN ACCOUNT SYSTEM
 * ---------------------------------------------------------------------------
 * After the assessment the student gets an email with a one-click "start my
 * plan" link. That click starts a subscription against a card already on file,
 * which is exactly the kind of action that normally demands a login.
 *
 * Building login for it would mean a user table, password reset, session
 * cookies, an account UI and a support burden — for a single teacher with a few
 * dozen students, where the entire authenticated surface is one button that each
 * student presses once. And it would cost conversions: the self-serve link is
 * the higher-converting path precisely because it is one click, and putting a
 * signup wall in front of it would undo the reason it exists.
 *
 * A signed link is the correct primitive instead. It carries its own
 * authorisation, needs no server-side session store, and cannot be forged
 * without the secret. Capability, not identity.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS IS AND IS NOT SAFE FOR
 * ---------------------------------------------------------------------------
 * The token is a bearer capability. Anyone holding the URL can act on it, so it
 * is only acceptable because of what the capability actually permits: starting
 * the plan the student already agreed to, on their own card, at the published
 * price. There is nothing to steal — an attacker's best move is to buy the
 * student singing lessons.
 *
 * It expires, so a forwarded email does not stay live forever, and the payload
 * is signed rather than encrypted: it is base64 and readable, so nothing private
 * goes in it. Customer id and mode are not secrets. Never add anything to the
 * payload you would mind a student reading in their address bar.
 *
 * Do NOT reuse this for anything that reads or writes other people's data. The
 * moment a link could expose another student's information, this becomes an
 * authorisation system and needs to be replaced by a real one.
 */

/**
 * URL path the token is consumed at: app/(coach)/coach/book/plan/page.tsx.
 *
 * That page VERIFIES the token on GET and renders the offer; it does not start
 * anything. The subscription is created by a POST to /api/stripe/plan, for the
 * same reason /coach/account POSTs to /api/stripe/portal — see that route's
 * header. A GET that bills a saved card is a link-scanner away from a real
 * charge nobody clicked.
 */
export const PLAN_LINK_PATH = '/coach/book/plan';

/** Where the plan page POSTs to actually start the subscription. */
export const PLAN_START_ENDPOINT = '/api/stripe/plan';

/** Where a billing-portal token is consumed. POSTs to /api/stripe/portal. */
export const ACCOUNT_LINK_PATH = '/coach/account';

/** 21 days. Long enough to survive a holiday, short enough to expire. */
export const DEFAULT_TTL_SECONDS = 21 * 24 * 60 * 60;

/**
 * 7 days for a billing-portal link.
 *
 * Deliberately shorter than a plan link, because the capability is larger: the
 * Stripe Customer Portal can cancel the subscription and displays the full
 * invoice history. A plan link, by contrast, can only buy singing lessons at the
 * published price on the student's own card, which is why it can afford three
 * weeks. This one is also trivially re-issuable — it goes out with every receipt
 * — so a short life costs nobody anything.
 */
export const ACCOUNT_TTL_SECONDS = 7 * 24 * 60 * 60;

/**
 * A short secret is the one way to make HMAC weak enough to brute force, and it
 * fails silently — everything works, it is just forgeable. 32 characters of
 * `openssl rand -base64 32` is the documented minimum in .env.example.
 */
const MIN_SECRET_LENGTH = 32;

/**
 * What a token is allowed to do. THIS FIELD IS THE SECURITY BOUNDARY BETWEEN THE
 * TWO KINDS OF LINK, AND IT IS WHY IT IS NOT OPTIONAL.
 *
 * Both links are HMACs over the same BOOKING_LINK_SECRET, so without a purpose
 * baked into the signed payload they would be interchangeable — a "start my plan"
 * link emailed to a student would also open Stripe's billing portal, where the
 * holder can cancel the subscription and read every past invoice. The capability
 * a link grants would then be decided by which URL it happened to be pasted
 * into, which is not a decision a URL should be making.
 *
 * The alternative (two secrets) would double the rotation burden and the number
 * of env vars that can be forgotten. One secret plus explicit domain separation
 * in the signed payload achieves the same isolation, and the verifier for each
 * kind refuses the other outright rather than defaulting.
 */
export type TokenPurpose = 'plan' | 'account';

type BaseTokenPayload = {
  /** Stripe customer id. Everything the token authorises acts on this customer. */
  customerId: string;
  /** Expiry, Unix seconds. Written by the signers, enforced by the verifiers. */
  exp: number;
};

export type PlanTokenPayload = BaseTokenPayload & {
  purpose: 'plan';
  /** Which rate card the plan prices come from. */
  mode: LessonMode;
  /** Assessment datetime — billing anchors 7 days after it. ISO 8601. */
  assessmentAt: string;
  /**
   * WHICH PLAN THE LINK BUYS. `lookup_key` from content/pricing.json.
   *
   * ---------------------------------------------------------------------------
   * THIS IS IN THE SIGNED PAYLOAD BECAUSE THE PRICE IS THE ONE THING A HOLDER
   * OF THE LINK MUST NOT GET TO CHOOSE.
   * ---------------------------------------------------------------------------
   * /coach/book/plan reads the plan from here and from nowhere else — not from a
   * query parameter, not from a form field, not from a hidden input. An amount, a
   * Stripe price id or even a lookup key accepted from the URL would let whoever
   * holds the link decide what the card on file gets billed each month, and the
   * resulting Subscription would look perfectly legitimate in Stripe.
   *
   * OPTIONAL, AND THAT IS A COMPATIBILITY DECISION, NOT AN INVITATION. Tokens
   * were originally signed with `mode` alone, and scripts/start-plan.ts still
   * signs them that way, so a link already sitting in somebody's inbox has no
   * lookup key in it. Those resolve to the mode's ANCHOR plan — the longest
   * monthly lesson, which is the plan the whole funnel is built around and the one
   * LTV_USD and ASSESSMENT_VALUE_USD are derived from. See planFor() for the full
   * argument and for why that default is safe rather than merely convenient.
   *
   * Pass it explicitly whenever you can. A link that names its plan cannot be
   * misread by a future edit to the rate card.
   */
  lookupKey?: string;
};

export type AccountTokenPayload = BaseTokenPayload & {
  purpose: 'account';
};

/**
 * Retained name for the plan-link payload, which is what every existing caller
 * means by "the booking token".
 */
export type BookingTokenPayload = PlanTokenPayload;

export type VerifyFailure =
  // A reason string, never a payload, because a failed verification means the
  // payload is untrusted input and must not reach a caller who might use it.
  //
  // `wrong_purpose` is reported separately from `bad_signature` on purpose: the
  // signature was VALID, so this is not an attack, it is a correctly-signed link
  // being presented at the wrong door — almost always a bug in whichever code
  // built the URL, and one that would take a long time to find if it read as
  // "invalid link".
  //
  // `unknown_plan` is the same class of thing one level further in: signature
  // valid, purpose right, but the plan named in the payload is not a sellable
  // monthly plan in content/pricing.json. That is a rate-card edit or a bad
  // signer, never a student's doing, and it must not be reported as "your link
  // expired" — the operator would go looking in the wrong place entirely.
  | {
      ok: false;
      reason:
        | 'no_secret'
        | 'malformed'
        | 'bad_signature'
        | 'expired'
        | 'wrong_purpose'
        | 'unknown_plan';
    };

/**
 * A verified plan token, WITH the price it authorises already resolved.
 *
 * The plan is handed back by the verifier rather than looked up by the caller,
 * because "is this token valid?" and "does it name a real, sellable monthly
 * plan?" are the same question when the answer decides what a card gets charged.
 * Two callers (the page that renders the offer and the route that starts the
 * subscription) must agree on the price to the cent; the only way to guarantee
 * they do is to give them no separate opportunity to work it out.
 */
export type VerifyResult =
  | { ok: true; payload: PlanTokenPayload; plan: Price }
  | VerifyFailure;
export type AccountVerifyResult = { ok: true; payload: AccountTokenPayload } | VerifyFailure;

function secret(): string {
  const value = process.env.BOOKING_LINK_SECRET ?? '';
  if (value.length < MIN_SECRET_LENGTH) {
    throw new Error(
      value.length === 0
        ? 'BOOKING_LINK_SECRET is not set, so plan links cannot be signed.\n' +
            '  Generate one with: openssl rand -base64 32\n' +
            '  Put it in .env.local and in Vercel encrypted env. NEVER in .env — that file is committed.'
        : `BOOKING_LINK_SECRET is only ${value.length} characters; at least ${MIN_SECRET_LENGTH} are required. ` +
            'A short HMAC key does not error, it just becomes forgeable, so this is checked rather than trusted.',
    );
  }
  return value;
}

/** base64url, because these tokens travel in a query string. */
const b64url = (input: Buffer | string): string =>
  Buffer.from(input).toString('base64url');

function signature(encodedPayload: string): string {
  return createHmac('sha256', secret()).update(encodedPayload).digest('base64url');
}

/**
 * Sign a plan link token.
 *
 * Throws when the secret is missing or too short. This one throws rather than
 * degrading, unlike the analytics helpers: the caller is about to email a
 * student a link, and an unsigned or unverifiable link is worse than no email.
 */
export function signBookingToken(
  input: {
    customerId: string;
    mode: LessonMode;
    assessmentAt: Date | string;
    /** Optional; omitted means "the mode's anchor plan". See PlanTokenPayload. */
    lookupKey?: string;
  },
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): string {
  /*
   * Validated HERE, at signing time, and not only at redemption.
   *
   * The verifier refuses a bad plan too, but by then the link is in an inbox and
   * the failure is the student's problem. A key that is not a sellable monthly
   * plan for this mode is a mistake by whoever is issuing the link, so it belongs
   * to them, now, as a thrown error with the valid keys listed — the same posture
   * as a missing secret.
   */
  if (input.lookupKey !== undefined) {
    const price = catalogPlan(input.lookupKey);
    if (!price) {
      throw new Error(
        `signBookingToken: "${input.lookupKey}" is not a monthly plan in content/pricing.json. ` +
          `A plan link can only start a recurring plan; single lessons and packs go through ` +
          `Checkout. Monthly plans: ${PRICES.filter((p) => p.type === 'monthly')
            .map((p) => p.lookupKey)
            .join(', ')}`,
      );
    }
    if (price.mode !== input.mode) {
      // Signing this would email an online student a link that starts in-person
      // billing at the in-person rate, which is ~29% higher. Refused rather than
      // silently preferring one of the two.
      throw new Error(
        `signBookingToken: plan "${input.lookupKey}" is ${price.mode} but the token says ` +
          `mode "${input.mode}". One of the two is wrong; a link must not disagree with itself ` +
          'about which rate card it bills from.',
      );
    }
  }

  return encode({
    purpose: 'plan',
    customerId: input.customerId,
    mode: input.mode,
    assessmentAt:
      typeof input.assessmentAt === 'string' ? input.assessmentAt : input.assessmentAt.toISOString(),
    ...(input.lookupKey ? { lookupKey: input.lookupKey } : {}),
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  });
}

/**
 * Sign a billing-portal token for /coach/account.
 *
 * Shorter-lived than a plan link by default (see ACCOUNT_TTL_SECONDS): a plan
 * link has to survive someone's holiday, whereas this one is re-issuable on
 * demand and grants strictly more — the portal can cancel a subscription and
 * shows every past invoice. There is no reason for that capability to sit in an
 * inbox for three weeks.
 */
export function signAccountToken(
  input: { customerId: string },
  ttlSeconds: number = ACCOUNT_TTL_SECONDS,
): string {
  return encode({
    purpose: 'account',
    customerId: input.customerId,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  });
}

function encode(payload: PlanTokenPayload | AccountTokenPayload): string {
  const encoded = b64url(JSON.stringify(payload));
  return `${encoded}.${signature(encoded)}`;
}

/**
 * Verify and decode a token.
 *
 * ORDER MATTERS: the signature is checked before the payload is parsed for
 * anything meaningful, and expiry is checked only after the signature passes.
 * Reading `exp` from an unverified payload would let anyone set their own
 * expiry, which is the same as having none.
 */
export function verifyBookingToken(token: string): VerifyResult {
  const decoded = decode(token, 'plan');
  if (!decoded.ok) return decoded;

  const payload = decoded.payload as PlanTokenPayload;
  if (
    (payload.mode !== 'online' && payload.mode !== 'inperson') ||
    typeof payload.assessmentAt !== 'string' ||
    // Parsed here rather than at the call site. The assessment date is what the
    // billing anchor is computed from, so an unparseable one would surface as an
    // "Invalid Date" in the first-charge sentence on the page — or, worse, as a
    // NaN anchor sent to Stripe.
    Number.isNaN(new Date(payload.assessmentAt).getTime())
  ) {
    return { ok: false, reason: 'malformed' };
  }

  if (payload.lookupKey !== undefined && typeof payload.lookupKey !== 'string') {
    return { ok: false, reason: 'malformed' };
  }

  /*
   * THE RATE-CARD CHECK, INSIDE VERIFICATION.
   *
   * A signature only proves the payload came from us; it says nothing about
   * whether the plan it names still exists. Prices get renamed and retired, and a
   * 21-day-old link can outlive its own plan. Resolving the price here means no
   * caller can be handed a "valid" plan token that does not correspond to a real,
   * sellable, monthly price — and no caller has to remember to check.
   */
  const plan = planFor(payload);
  if (!plan) return { ok: false, reason: 'unknown_plan' };

  return { ok: true, payload, plan };
}

/** A monthly, sellable plan by lookup key, or null. Never a pack or a single. */
function catalogPlan(lookupKey: string): Price | null {
  const price = PRICES.find((p) => p.lookupKey === lookupKey);
  if (!price) return null;
  // `type` and `interval` are checked together because content/pricing.json's
  // build-time invariants keep them in step, and startPlan() refuses anything
  // that is not a Subscription price. Belt and braces on the money path.
  if (price.type !== 'monthly' || price.interval !== 'month') return null;
  if (price.amountCents <= 0) return null;
  return price;
}

/**
 * The single plan a verified payload authorises.
 *
 * ---------------------------------------------------------------------------
 * WHY A MODE-ONLY TOKEN RESOLVES TO THE ANCHOR PLAN RATHER THAN BEING REFUSED
 * ---------------------------------------------------------------------------
 * Every monthly plan for a mode is a legitimate thing to sell, so a token that
 * names only `mode` is ambiguous — there are two per mode (60 and 30 minutes).
 * Three options existed and only one of them is defensible:
 *
 *   Refuse it            correct-looking, and it breaks every link already in an
 *                        inbox plus `npm run plan:start -- --link` as it stands
 *                        today. A dead link at the conversion moment is the exact
 *                        failure this route was built to end.
 *   Let the page ask     the student picks, which means the PRICE comes from the
 *                        browser. That is the one thing this whole file exists to
 *                        prevent.
 *   Resolve the anchor   the longest monthly lesson for the mode.
 *
 * The anchor is not an arbitrary pick. monthlyPlans() returns longest-first
 * precisely because that plan is the offer the business is built on: LTV_USD and
 * ASSESSMENT_VALUE_USD in lib/pricing.ts are computed from it, so it is also the
 * plan the ad account is bidding to acquire. And the residual risk is bounded by
 * the page, not by this function: /coach/book/plan shows the resolved plan, its
 * price and its lesson length, and takes an explicit tick before charging
 * anything. A student who was verbally offered the 30-minute plan sees a
 * 60-minute plan at a higher price and stops, which costs a conversion — never a
 * surprise charge.
 *
 * The way to make that impossible is to sign the lookup key. Callers should.
 */
function planFor(payload: PlanTokenPayload): Price | null {
  if (payload.lookupKey !== undefined) {
    const named = catalogPlan(payload.lookupKey);
    // A key that names another mode's plan is refused rather than honoured: the
    // two rate cards differ by ~29%, and a token disagreeing with itself about
    // which one applies is not a token to bill from.
    return named && named.mode === payload.mode ? named : null;
  }
  return monthlyPlans(payload.mode)[0] ?? null;
}

/**
 * Verify a billing-portal token from /coach/account?t=…
 *
 * Refuses a plan token outright rather than falling back to treating it as an
 * account token — see TokenPurpose for why that separation is load-bearing.
 */
export function verifyAccountToken(token: string): AccountVerifyResult {
  const decoded = decode(token, 'account');
  if (!decoded.ok) return decoded;
  return { ok: true, payload: decoded.payload as AccountTokenPayload };
}

/**
 * The shared half: signature, then shape, then purpose, then expiry.
 *
 * ORDER MATTERS AND IS NOT A STYLE CHOICE. The signature is verified before the
 * payload is read for anything, and expiry and purpose are only checked after it
 * passes. Reading `exp` from an unverified payload would let anyone set their own
 * expiry, which is the same as having none; reading `purpose` from one would let
 * anyone promote a plan link into a portal link.
 */
function decode(
  token: string,
  expectedPurpose: TokenPurpose,
): { ok: true; payload: PlanTokenPayload | AccountTokenPayload } | VerifyFailure {
  let expected: string;
  const [encoded, provided] = token.split('.');
  if (!encoded || !provided) return { ok: false, reason: 'malformed' };

  try {
    expected = signature(encoded);
  } catch {
    // Missing/short secret. Reported as its own reason so an operator sees a
    // configuration problem instead of blaming the student's link.
    return { ok: false, reason: 'no_secret' };
  }

  // Constant-time, and length-checked first: timingSafeEqual throws on a length
  // mismatch rather than returning false, and a plain === would leak how many
  // leading bytes of a guess were right, which is enough to forge a token one
  // byte at a time.
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: 'bad_signature' };
  }

  let payload: PlanTokenPayload | AccountTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as
      | PlanTokenPayload
      | AccountTokenPayload;
  } catch {
    return { ok: false, reason: 'malformed' };
  }

  if (typeof payload?.customerId !== 'string' || typeof payload.exp !== 'number') {
    return { ok: false, reason: 'malformed' };
  }

  if (payload.purpose !== expectedPurpose) return { ok: false, reason: 'wrong_purpose' };

  if (payload.exp * 1000 < Date.now()) return { ok: false, reason: 'expired' };

  return { ok: true, payload };
}

/**
 * The absolute URL to email a student so they can reach their billing page.
 *
 * Emailed with every receipt. Note that this URL is NOT the portal — it is a page
 * with a form that POSTs to /api/stripe/portal. That indirection is what stops a
 * mail scanner or a link unfurler from burning the single-use portal session
 * before the student clicks; see the header of app/api/stripe/portal/route.ts.
 */
export function accountLinkUrl(
  siteUrl: string,
  input: { customerId: string },
  ttlSeconds?: number,
): string {
  const url = new URL(ACCOUNT_LINK_PATH, siteUrl);
  url.searchParams.set('t', signAccountToken(input, ttlSeconds));
  return url.toString();
}

/**
 * The absolute URL to email a student.
 *
 * Pass `lookupKey` and the link names the exact plan it starts. Omit it and the
 * mode's anchor plan applies — see PlanTokenPayload.lookupKey and planFor().
 */
export function planLinkUrl(
  siteUrl: string,
  input: {
    customerId: string;
    mode: LessonMode;
    assessmentAt: Date | string;
    lookupKey?: string;
  },
  ttlSeconds?: number,
): string {
  const url = new URL(PLAN_LINK_PATH, siteUrl);
  url.searchParams.set('t', signBookingToken(input, ttlSeconds));
  return url.toString();
}

/**
 * Human-readable reason, for a page that has to explain a dead link.
 *
 * Typed as a total Record over the reason union rather than an inline object, so
 * that adding a new failure reason is a COMPILE error here instead of a runtime
 * `undefined` rendered into the page. That is not hypothetical: `wrong_purpose`
 * was added to the union and this map was missed, and the only reason it surfaced
 * was the type checker.
 */
const FAILURE_MESSAGES: Record<VerifyFailure['reason'], string> = {
  no_secret: 'Plan links are not configured yet. Please reply to your assessment email.',
  malformed: 'That link looks incomplete — it may have been cut off by your email client.',
  bad_signature: 'That link is not valid. Please use the most recent email you received.',
  expired: 'That link has expired. Reply to your assessment email and a fresh one will be sent.',
  // Deliberately indistinguishable from bad_signature to the student: the
  // difference is a developer detail, and telling a student their link was "for
  // the wrong page" invites them to go looking for the right one. The precise
  // reason is still available to the caller for logging.
  wrong_purpose: 'That link is not valid. Please use the most recent email you received.',
  // Our fault, not theirs, and worded so: the signature was good. The plan the
  // link names is no longer in the rate card, which a student can do nothing
  // about, so this one goes straight to "email me".
  unknown_plan:
    'That link is for a lesson plan I no longer offer. Reply to your assessment email and I will send you the current one.',
};

export const verifyFailureMessage = (reason: VerifyFailure['reason']): string =>
  FAILURE_MESSAGES[reason];
