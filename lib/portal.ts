import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { SITE_URL } from '@/lib/site';
import { verifyFailureMessage, type VerifyFailure } from '@/lib/booking-token';

/**
 * The Stripe Customer Portal — the whole of the student's self-service surface.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS FILE EXISTS SEPARATELY FROM lib/booking.ts AND lib/stripe.ts
 * ---------------------------------------------------------------------------
 * lib/stripe.ts is the client and nothing else. lib/booking.ts owns the money
 * moments — the flows that TAKE money. This owns the one flow that gives it back
 * or stops it: cancel, pause, change card, read invoices. Different lifecycle,
 * different failure consequences, and it is the only Stripe surface a student
 * reaches without us rendering anything, so it is worth its own file.
 *
 * ---------------------------------------------------------------------------
 * WHY THERE IS NO LOGIN, AND WHY THAT IS DEFENSIBLE HERE
 * ---------------------------------------------------------------------------
 * A single-teacher practice does not need a user table, a password-reset flow and
 * the breach surface that comes with them for a page each student opens perhaps
 * twice. Access is a signed expiring link (lib/booking-token.ts), emailed with
 * the receipt: /coach/account?t=<hmac>.
 *
 * The honest bound on that trade: the token is a BEARER CAPABILITY. Whoever holds
 * the URL can cancel the subscription and read the invoice history — which is
 * more than a plan link grants, and is exactly why account tokens carry
 * `purpose: 'account'` and a shorter TTL. It does not expose anyone ELSE's data,
 * which is the line that would turn this into a real authorisation problem.
 */

/**
 * Must match MANAGED_BY in scripts/stripe-bootstrap.ts.
 *
 * Duplicated rather than imported because a `scripts/` module has no business
 * being pulled into the Next.js server bundle — the script imports `node:fs` and
 * reads process.argv at module scope. The cost of the duplication is one string;
 * the cost of the import would be a script's side effects running inside a route
 * handler.
 */
const MANAGED_BY = 'juliana-website';

/**
 * Cached configuration id. Resolved once per container, not per request.
 *
 * Safe to cache because the configuration is created by the bootstrap script and
 * changes roughly never; if the operator does change it, the next cold start
 * picks it up. Worth caching because opening the portal already costs one Stripe
 * round trip and this would otherwise make it two, on a click a student makes
 * while looking at a spinner.
 */
let cachedConfigurationId: string | null = null;

/**
 * Find the portal configuration this repo manages.
 *
 * ---------------------------------------------------------------------------
 * WHY THE CONFIGURATION IS PASSED EXPLICITLY RATHER THAN LEFT TO THE DEFAULT
 * ---------------------------------------------------------------------------
 * `billingPortal.sessions.create` without a `configuration` uses whichever
 * configuration is marked default on the account. Ours currently IS the default —
 * but that is an accident of it being the only one, not a guarantee. The moment
 * anyone clicks around in the Dashboard's portal settings, Stripe can create
 * another configuration and make it default, and every setting the operator
 * agreed to would silently change: cancellation might become
 * cancel-immediately-with-proration (refunding lessons already delivered), or
 * plan switching might become self-serve (letting a student change a 60-minute
 * slot to 30 minutes with no way for the teacher to rearrange the week).
 *
 * None of that would raise an error. Naming the configuration explicitly is what
 * makes the policy in scripts/stripe-bootstrap.ts actually binding.
 *
 * Returns null when no managed configuration exists, and the caller falls back to
 * Stripe's default rather than failing — a student who needs to cancel must
 * always be able to, even if the bootstrap script has never been run against this
 * account.
 */
async function managedConfigurationId(stripe: Stripe): Promise<string | null> {
  if (cachedConfigurationId) return cachedConfigurationId;

  const configurations = await stripe.billingPortal.configurations.list({ limit: 100 });
  const managed = configurations.data.find(
    (config) => config.active && config.metadata?.managed_by === MANAGED_BY,
  );

  if (!managed) {
    console.warn(
      '[portal] no active Customer Portal configuration tagged managed_by=' +
        `${MANAGED_BY} exists on this account, so Stripe's DEFAULT configuration will be used. ` +
        'That default is whatever the Dashboard says, which may not match the agreed policy ' +
        '(cancel at period end, no self-serve plan switching, payment-method updates on). ' +
        'Run `npm run stripe:bootstrap` to create it.',
    );
    return null;
  }

  cachedConfigurationId = managed.id;
  return managed.id;
}

export type PortalSession = {
  /** Stripe-hosted portal URL. Short-lived; redirect immediately, never store. */
  url: string;
  /** Which configuration governed it — null means Stripe's account default. */
  configurationId: string | null;
};

/**
 * Open a billing portal session for a customer.
 *
 * The returned URL is single-use and expires quickly on Stripe's side, which is
 * what makes it safe to hand a browser via a redirect. Do NOT email one, log one,
 * or put one in a page's HTML: email a signed /coach/account link instead and let
 * this run at click time.
 *
 * Throws if the customer does not exist or was deleted. The caller must catch —
 * see app/api/stripe/portal/route.ts, which turns any failure into a page the
 * student can act on rather than a stack trace.
 */
export async function createPortalSession(
  customerId: string,
  returnUrl: string = new URL('/coach/account', process.env.NEXT_PUBLIC_SITE_URL ?? SITE_URL).toString(),
): Promise<PortalSession> {
  const stripe = getStripe();

  /*
   * Checked before creating the session so a deleted or non-existent customer
   * produces our sentence rather than Stripe's. This costs one extra call on a
   * rare action, and it buys the difference between "that link belongs to an
   * account that no longer exists" and an unexplained 500.
   */
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) {
    throw new Error(
      `Stripe customer ${customerId} is deleted, so no billing portal can be opened for them.`,
    );
  }

  const configuration = await managedConfigurationId(stripe);

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
    ...(configuration ? { configuration } : {}),
  });

  return { url: session.url, configurationId: configuration };
}

/* ------------------------------------------------------------------ */
/* Error copy                                                          */
/* ------------------------------------------------------------------ */

/**
 * The extra failures /api/stripe/portal can report that a token cannot.
 *
 * Separate from VerifyFailure['reason'] because these are OUR faults, not the
 * student's link: Stripe unreachable, or the secret key absent on this
 * deployment. The copy has to differ accordingly — telling someone their link
 * expired when in fact our key is missing sends them hunting for an email that
 * would not have helped.
 */
export type PortalErrorReason = VerifyFailure['reason'] | 'not_configured' | 'stripe_error';

/**
 * One sentence per failure, for /coach/account to render.
 *
 * Every branch ends in something the student can DO. None of them says "an error
 * occurred": this is a billing page, so the person reading it may be trying to
 * cancel, and a dead end here turns a cancellation into a chargeback.
 */
export function portalErrorMessage(reason: string): string {
  switch (reason) {
    case 'not_configured':
    case 'stripe_error':
      return 'Self-serve billing could not be opened just now — that is on my side, not yours. Email me and I will make any change the same day.';
    case 'no_secret':
    case 'malformed':
    case 'bad_signature':
    case 'expired':
    case 'wrong_purpose':
      return verifyFailureMessage(reason);
    default:
      // An unrecognised code can only come from a hand-edited URL. Answered with
      // the generic copy rather than an error, because there is no fault to
      // report and no point telling someone their guess was wrong.
      return 'That link is not valid. Please use the most recent email you received.';
  }
}

/**
 * Pause a subscription for one month — the operator-side half of the policy.
 *
 * ---------------------------------------------------------------------------
 * WHY PAUSING IS NOT SELF-SERVE, THOUGH THE POLICY SAYS IT SHOULD BE
 * ---------------------------------------------------------------------------
 * The agreed policy is "cancel anytime; one free 1-month pause per year", and
 * cancel IS self-serve in the Portal. Pause cannot be: Stripe removed
 * `features.subscription_pause` from the Portal Configuration API and it is
 * absent from the SDK types this repo builds against, so there is no
 * configuration that would put a pause button on that page. Claiming otherwise in
 * the /coach/account copy would be advertising a control that does not exist.
 *
 * So the promise is kept by a human running this, or the equivalent Stripe CLI
 * command in docs/stripe-runbook.md. `behavior: 'void'` rather than
 * 'keep_as_draft' is the load-bearing choice: void means the paused month is
 * never invoiced at all, while keep_as_draft accumulates a draft invoice that
 * gets finalised and CHARGED when the pause ends — turning a free month into a
 * deferred double charge, which is the exact opposite of the promise.
 *
 * The "once per year" limit is a judgement call, not enforced here. Enforcing it
 * would need a pause history, and Stripe metadata is a poor place for a log; the
 * teacher granting a second pause to a student going through something is the
 * right outcome anyway.
 */
export async function pauseSubscriptionOneMonth(
  subscriptionId: string,
  resumesAt: Date = new Date(Date.now() + 30 * 86_400_000),
): Promise<Stripe.Subscription> {
  return getStripe().subscriptions.update(
    subscriptionId,
    {
      pause_collection: {
        // READ THE HEADER COMMENT BEFORE CHANGING THIS TO 'keep_as_draft'.
        behavior: 'void',
        resumes_at: Math.floor(resumesAt.getTime() / 1000),
      },
    },
    // Keyed on the subscription and the resume date, so a double-run is a no-op
    // rather than a second pause that pushes the resume date another month out.
    { idempotencyKey: `pause:${subscriptionId}:${resumesAt.toISOString().slice(0, 10)}` },
  );
}
