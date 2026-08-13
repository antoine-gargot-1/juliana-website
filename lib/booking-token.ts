import { createHmac, timingSafeEqual } from 'node:crypto';
import type { LessonMode } from '@/lib/pricing';

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

/** URL path the token is consumed at, owned by the booking-page route. */
export const PLAN_LINK_PATH = '/coach/book/plan';

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
  | { ok: false; reason: 'no_secret' | 'malformed' | 'bad_signature' | 'expired' | 'wrong_purpose' };

export type VerifyResult = { ok: true; payload: PlanTokenPayload } | VerifyFailure;
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
  input: { customerId: string; mode: LessonMode; assessmentAt: Date | string },
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): string {
  return encode({
    purpose: 'plan',
    customerId: input.customerId,
    mode: input.mode,
    assessmentAt:
      typeof input.assessmentAt === 'string' ? input.assessmentAt : input.assessmentAt.toISOString(),
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
    typeof payload.assessmentAt !== 'string'
  ) {
    return { ok: false, reason: 'malformed' };
  }

  return { ok: true, payload };
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

/** The absolute URL to email a student. */
export function planLinkUrl(
  siteUrl: string,
  input: { customerId: string; mode: LessonMode; assessmentAt: Date | string },
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
};

export const verifyFailureMessage = (reason: VerifyFailure['reason']): string =>
  FAILURE_MESSAGES[reason];
