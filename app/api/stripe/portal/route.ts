import { createPortalSession } from '@/lib/portal';
import { stripeConfigured } from '@/lib/stripe';
import { ACCOUNT_LINK_PATH, verifyAccountToken } from '@/lib/booking-token';
import { SITE_URL } from '@/lib/site';

/**
 * Exchange a signed account link for a Stripe Customer Portal session.
 *
 * ===========================================================================
 * POST ONLY. THIS IS A CONTRACT WITH /coach/account, NOT A PREFERENCE.
 * ===========================================================================
 * The token in the student's email is a bearer capability that lets the holder
 * cancel a subscription and read every past invoice. If this were reachable by
 * GET, then merely DELIVERING the email could consume it: Gmail and Outlook
 * prefetch and scan links, corporate mail gateways follow them to check for
 * malware, and a Slack or iMessage paste unfurls them. Each of those would open a
 * live portal session — server-side, invisibly, before the student ever clicked —
 * and portal sessions are single-use, so the student's own click would then land
 * on an expired session and they would conclude billing was broken.
 *
 * So /coach/account renders a form that POSTs the token here. A scanner does not
 * submit forms. There is deliberately no GET handler at all rather than a GET
 * that redirects, because a redirecting GET is exactly what a scanner follows.
 *
 * ===========================================================================
 * WHY IT REDIRECTS RATHER THAN RETURNING JSON
 * ===========================================================================
 * The caller is a plain HTML form with no JavaScript behind it, so this endpoint
 * has to work with nothing but the browser. Every outcome is a 303 to somewhere a
 * human can read: Stripe on success, /coach/account with an error code otherwise.
 * 303 specifically, so the browser follows with GET and does not replay the POST.
 *
 * ===========================================================================
 * RUNTIME
 * ===========================================================================
 * Node, never Edge: `node:crypto` (token HMAC) and the Stripe SDK are both here.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const origin = () => process.env.NEXT_PUBLIC_SITE_URL ?? SITE_URL;

/**
 * Send the student back to /coach/account with a reason it can explain.
 *
 * The reason travels as a short code rather than as prose so the page owns the
 * wording (verifyFailureMessage in lib/booking-token.ts already has it) and so
 * nothing user-controlled is reflected into the page.
 */
function back(reason: string): Response {
  const url = new URL(ACCOUNT_LINK_PATH, origin());
  url.searchParams.set('error', reason);
  return Response.redirect(url.toString(), 303);
}

export async function POST(request: Request): Promise<Response> {
  if (!stripeConfigured()) {
    console.warn('[portal] STRIPE_SECRET_KEY is not set, so no portal session can be created.');
    return back('not_configured');
  }

  let token = '';
  try {
    const contentType = request.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const parsed = (await request.json()) as { t?: unknown };
      token = typeof parsed?.t === 'string' ? parsed.t : '';
    } else {
      const form = await request.formData();
      const value = form.get('t');
      token = typeof value === 'string' ? value : '';
    }
  } catch {
    return back('malformed');
  }

  if (!token) return back('malformed');

  /*
   * Verified with `purpose: 'account'` enforced. A correctly-signed PLAN link
   * presented here is refused with `wrong_purpose` rather than being accepted —
   * see TokenPurpose in lib/booking-token.ts. Without that separation, the
   * one-click "start my plan" link emailed to every student after their
   * assessment would double as a link that can cancel their subscription.
   */
  const verified = verifyAccountToken(token);
  if (!verified.ok) {
    // Logged without the token: it is a live credential until it expires, and
    // Vercel logs are not the place for one.
    console.warn(`[portal] refused an account token: ${verified.reason}`);
    return back(verified.reason);
  }

  try {
    const session = await createPortalSession(
      verified.payload.customerId,
      new URL(ACCOUNT_LINK_PATH, origin()).toString(),
    );
    return Response.redirect(session.url, 303);
  } catch (error) {
    // Never surface a Stripe error to a student — it names customer ids and
    // account state. The common real cause is a customer deleted in the
    // dashboard, which is a conversation with the teacher, not a retry.
    console.error(
      `[portal] could not open a portal session for ${verified.payload.customerId}`,
      error,
    );
    return back('stripe_error');
  }
}

/*
 * The reason codes above are rendered by /coach/account through
 * portalErrorMessage() in lib/portal.ts. It lives there, not here, because a
 * route module is not importable from a page without dragging the handler along
 * with it.
 */
