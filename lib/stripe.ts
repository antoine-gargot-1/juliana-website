import Stripe from 'stripe';

/**
 * The Stripe client.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS LAZY AND NOT A MODULE-LEVEL `new Stripe(...)`
 * ---------------------------------------------------------------------------
 * Every route handler and script that talks to Stripe imports this file, and
 * `next build` imports route handlers to collect their exported config. A
 * module-level constructor that threw on a missing key would therefore turn
 * "no credentials yet" into "the site does not build" — and this repo is
 * deliberately buildable and deployable before Stripe exists, so that the
 * marketing pages can ship while the operator is still provisioning the
 * account.
 *
 * So: constructing is deferred to first use. A page renders fine without a
 * key; only an actual API call fails, and it fails with a sentence that says
 * what to do about it. This is the same fail-closed posture as `GA_ENABLED` in
 * lib/analytics.ts — absent configuration degrades to "feature off", never to
 * "crash at import".
 *
 * ---------------------------------------------------------------------------
 * WHY THE API VERSION IS PINNED
 * ---------------------------------------------------------------------------
 * Unpinned, the account's dashboard default applies, which means a Stripe
 * upgrade the operator clicks through in the dashboard silently changes the
 * shape of the objects this code reads. Pinning moves that break to a
 * deliberate edit here, where the type errors point at every call site that
 * needs attention.
 *
 * This pin matters more than usual right now: on this version `Invoice` no
 * longer carries a top-level `subscription` field — it moved to
 * `invoice.parent.subscription_details.subscription`. Code copied from an older
 * Stripe tutorial will read `undefined` and silently do nothing. See
 * subscriptionIdFromInvoice() below.
 */

/**
 * Pinned to the version the installed `stripe` package's types describe. Keep
 * these two in lockstep: bumping the package without bumping this string means
 * the types promise one shape and the API returns another.
 */
export const STRIPE_API_VERSION = '2026-07-29.dahlia' as const;

/** Sent as the integration name on every request; shows up in Stripe's logs. */
const APP_INFO = {
  name: 'juliana-beltran.com',
  url: 'https://www.juliana-beltran.com',
} as const;

let client: Stripe | null = null;

/**
 * True when a secret key is present. Call this before offering any
 * Stripe-backed action so the UI can degrade instead of throwing — e.g. a
 * booking page can show "booking opens shortly" rather than a 500.
 */
export const stripeConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY);

/**
 * The shared Stripe client. Throws — with instructions — only when actually
 * called without a key.
 */
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      'STRIPE_SECRET_KEY is not set, so this Stripe call cannot be made.\n' +
        '  Local:  add it to .env.local (gitignored via the "*.local" rule). NEVER to .env — ' +
        'that file is committed and holds only the public GA4 ID.\n' +
        '  Vercel: add it as an encrypted Environment Variable for Production and Preview.\n' +
        '  Test keys start sk_test_, live keys sk_live_. Run `npm run stripe:audit` to confirm ' +
        'which account a key points at before creating anything.',
    );
  }

  // Cached across invocations. On Fluid Compute one container serves many
  // requests, so rebuilding the client per request would throw away Stripe's
  // keep-alive connection pool for no reason.
  if (!client) {
    client = new Stripe(key, {
      apiVersion: STRIPE_API_VERSION,
      appInfo: APP_INFO,
      // Stripe's default is 1 retry on network errors and 0 on 5xx. Webhook
      // handlers must be as close to idempotent-and-complete as possible in one
      // delivery, because Stripe's own retry schedule is measured in hours.
      maxNetworkRetries: 2,
      timeout: 20_000,
    });
  }
  return client;
}

/**
 * Which Stripe mode the configured key belongs to: `true` live, `false` test,
 * `null` when the key's prefix is not one Stripe currently issues.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS RETURNS THREE VALUES AND WHY `rk_` IS IN THE LIST
 * ---------------------------------------------------------------------------
 * `rk_live_` is a RESTRICTED live key — a scoped credential that writes to the
 * live account exactly like `sk_live_` does, and moving to one is a recommended
 * hardening step for this app. This check used to test `sk_live_` alone, which
 * means every live-mode guard built on it would have quietly evaluated to "test
 * mode" the moment the operator did the right thing and scoped the key down. A
 * guard that fails open the instant you improve your key hygiene is worse than no
 * guard, because it reads as protection.
 *
 * The third value exists so callers can distinguish "test" from "no idea". A
 * webhook handler that rejects on a mode mismatch must NOT reject when it cannot
 * determine its own mode — that would take the live funnel down over an
 * unrecognised prefix — so `null` means "do not make a decision on this".
 */
export function stripeKeyLiveMode(): boolean | null {
  const key = process.env.STRIPE_SECRET_KEY ?? '';
  if (key.startsWith('sk_live_') || key.startsWith('rk_live_')) return true;
  if (key.startsWith('sk_test_') || key.startsWith('rk_test_')) return false;
  return null;
}

/**
 * True when the configured key is a live-mode key. Guards destructive scripts.
 *
 * Unknown prefixes answer `false`, which is the wrong way round for a guard, so
 * scripts that gate a destructive action MUST also handle the `null` case from
 * stripeKeyLiveMode() rather than trusting this boolean alone. See
 * scripts/stripe-bootstrap.ts for the pattern: it refuses to proceed on an
 * unrecognised key rather than assuming test mode.
 */
export const isLiveMode = () => stripeKeyLiveMode() === true;

/* ------------------------------------------------------------------ */
/* Shape helpers for fields that moved between API versions            */
/* ------------------------------------------------------------------ */

/**
 * The subscription an invoice belongs to, or null for a one-off invoice.
 *
 * READ THIS BEFORE "SIMPLIFYING" IT TO `invoice.subscription`. That field was
 * removed from the Invoice object; on API version 2026-07-29 the subscription
 * lives at `parent.subscription_details.subscription` and `parent.type` says
 * which kind of parent produced the invoice. Every retention and dunning
 * decision in lib/students.ts hangs off this value, so reading the old field
 * would not error — it would just quietly stop counting retention months.
 */
export function subscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const details = invoice.parent?.subscription_details;
  if (!details) return null;
  const sub = details.subscription;
  return typeof sub === 'string' ? sub : (sub?.id ?? null);
}

/** Customer id off any object that carries an expandable customer reference. */
export function customerId(
  ref: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined,
): string | null {
  if (!ref) return null;
  return typeof ref === 'string' ? ref : ref.id;
}

/**
 * Unix seconds. Stripe timestamps are seconds, JS `Date` is milliseconds, and
 * mixing them silently produces dates in 1970 or in the year 56000 — which for
 * `billing_cycle_anchor` means an invoice at the wrong time rather than an
 * error. Converting in exactly one place removes the chance of getting it
 * wrong in a new call site.
 */
export const toUnix = (date: Date): number => Math.floor(date.getTime() / 1000);
export const fromUnix = (seconds: number): Date => new Date(seconds * 1000);
