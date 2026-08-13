import { NextResponse, type NextRequest } from 'next/server';

/**
 * Rate limiting for the three paths that turn an anonymous HTTP request into a
 * live write in somebody else's system of record.
 *
 * ===========================================================================
 * BE CLEAR ABOUT WHAT THIS DOES AND DOES NOT ACHIEVE
 * ===========================================================================
 * The counters below live in a module-level Map, which means they live in ONE
 * serverless instance's memory. Vercel runs as many instances as it likes, it
 * recycles them freely, and it routes a request to whichever one is warm. So:
 *
 *   STOPS      a single source hammering one endpoint — the `curl` loop, the
 *              runaway script, the crawler that found a uid-bearing URL, the
 *              impatient double-click. In practice a burst from one IP lands on
 *              one warm instance, so one bucket sees it and refuses it.
 *   DOES NOT   stop a distributed flood. A thousand IPs, or one IP whose
 *      STOP    requests fan out across cold starts, each get their own fresh
 *              counter. There is no coordination and there cannot be without a
 *              shared datastore.
 *
 * THE DURABLE FIX IS AT THE EDGE, NOT HERE. A Vercel Firewall rule (or a
 * Cloudflare rate-limiting rule — Cloudflare is already in front of this site)
 * counts every request for a path in one place, before it reaches a function, so
 * it is both correct under concurrency and free of compute cost. That is where
 * the real limit belongs:
 *
 *   /api/stripe/*      5 requests / 60s / IP
 *   /coach/book/hold   10 requests / 60s / IP
 *
 * This file is defence in depth UNDERNEATH that rule, and it is deliberately not
 * a substitute for it. It exists because (a) the edge rule lives in a dashboard
 * and can be deleted or misconfigured by someone who never reads this repo, and
 * (b) a request that reaches Vercel directly — a preview deployment URL, or
 * anything that bypasses Cloudflare — never passes through the Cloudflare rule at
 * all. A per-instance window is a poor limiter and a decent circuit breaker.
 *
 * NO REDIS, NO KV, AND THAT IS A DELIBERATE OMISSION. A correct distributed
 * limiter needs a shared counter, which means provisioning and paying for
 * infrastructure. That is an operator's decision, not something a security fix
 * should quietly commit the project to, and the edge rule above solves the same
 * problem without any new service.
 *
 * ===========================================================================
 * WHY THE STRIPE WEBHOOK IS EXEMPT
 * ===========================================================================
 * Stripe treats any non-2xx as a failed delivery and retries it, backing off for
 * up to three days, and disables an endpoint that keeps failing. A 429 to Stripe
 * is therefore not "slow down", it is "lose this event and come back later" — and
 * every conversion the ad account bids on originates from that endpoint
 * (app/api/stripe/webhook/route.ts). Throttling it would manufacture exactly the
 * outage the limiter exists to prevent: a redelivery storm after an incident,
 * which is precisely when several hundred legitimate events arrive at once, is
 * indistinguishable from an attack to a naive counter.
 *
 * It does not need a limit either. It is authenticated by an HMAC signature over
 * the raw body, checked before any Stripe or Resend call, so an unsigned flood
 * costs one hash and nothing else. The same reasoning covers the Cal.com webhook.
 *
 * ===========================================================================
 * RUNTIME
 * ===========================================================================
 * Edge, the middleware default. Nothing here touches `node:crypto`, the Stripe
 * SDK, or the filesystem, which is what keeps this cheap enough to sit in front
 * of the funnel.
 */

/** How a matched path is limited. `null` means deliberately exempt. */
type Rule = {
  /** Bucket name. Separate buckets so a checkout burst cannot spend the hold budget. */
  bucket: string;
  /** Requests allowed per window, per client, per instance. */
  limit: number;
  windowMs: number;
} | null;

const WINDOW_MS = 60_000;

/**
 * Which rule applies, longest-prefix first.
 *
 * The numbers are chosen against real funnel behaviour rather than round: a
 * genuine buyer presses the buy button once and, if it fails, maybe twice more.
 * A genuine student loads /coach/book/hold once per booking. The allowances are
 * several times those figures because the client key is an IP, and a household,
 * a school computer lab or any CGNAT'd mobile network shares one — refusing a
 * paying customer to slow an attacker down is the wrong trade at these volumes.
 */
function ruleFor(pathname: string): Rule {
  // EXEMPT — see the header. Signature-verified, and retried on any non-2xx.
  if (pathname === '/api/stripe/webhook') return null;
  if (pathname === '/api/calcom/webhook') return null;

  /*
   * The unauthenticated POST that creates a live Stripe Customer and a Checkout
   * Session. Tightest limit in the file, because every request here is at least
   * one live write into the system of record and `maxNetworkRetries: 2` in
   * lib/stripe.ts can amplify each one up to threefold.
   */
  if (pathname === '/api/stripe/checkout') {
    return { bucket: 'stripe-checkout', limit: 8, windowMs: WINDOW_MS };
  }

  /*
   * The plan-start POST. Creates a real Subscription against a card already on
   * file, so it is the most consequential write in the app — but it is gated by a
   * signed token and is idempotent per (customer, plan), and a student who
   * double-submits the form must not be told their plan failed. Named explicitly
   * rather than left to the default below, because a route this consequential
   * should be visible in the limiter's own file.
   */
  if (pathname === '/api/stripe/plan') {
    return { bucket: 'stripe-plan', limit: 10, windowMs: WINDOW_MS };
  }

  /*
   * The billing portal. Already gated by a signed HMAC token, so this is only
   * about the cost of brute-forcing that token — which is infeasible anyway, but
   * a limit turns "infeasible" into "also loud and cheap to absorb".
   */
  if (pathname === '/api/stripe/portal') {
    return { bucket: 'stripe-portal', limit: 12, windowMs: WINDOW_MS };
  }

  /*
   * A GET server component that performs live Stripe writes. Needs more headroom
   * than checkout: Next.js <Link> prefetch, a back-then-forward, and Cal.com
   * replaying its redirect all hit it legitimately, and the flow is idempotent on
   * the booking uid so those repeats are harmless. The limit is here for the
   * crawler that acquires a uid-bearing URL, not for the student.
   */
  if (pathname === '/coach/book/hold') {
    return { bucket: 'book-hold', limit: 15, windowMs: WINDOW_MS };
  }

  // Anything else the matcher caught — a future /api/stripe/* or /api/calcom/*
  // route — gets a conservative default rather than nothing. A new route that
  // performs writes must not be unthrottled just because nobody updated this file.
  if (pathname.startsWith('/api/stripe/') || pathname.startsWith('/api/calcom/')) {
    return { bucket: `other:${pathname}`, limit: 20, windowMs: WINDOW_MS };
  }

  return null;
}

/**
 * The client identity, best effort.
 *
 * The FIRST entry of `x-forwarded-for` is the closest thing to a real client IP
 * available here: Cloudflare sets it to the connecting client and Vercel appends
 * to it, so entry zero is Cloudflare's view of who called. It is spoofable by
 * anyone talking to the Vercel origin directly, which is one more reason the
 * authoritative limit belongs at the edge where the peer address is not a header.
 *
 * Requests with no forwarded-for at all share the `unknown` bucket. That is the
 * safe direction to fail: they are counted together rather than not counted.
 */
function clientKey(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

type Counter = { count: number; resetAt: number };

const counters = new Map<string, Counter>();

/**
 * Ceiling on distinct keys held in one instance.
 *
 * Without it, a flood of spoofed `x-forwarded-for` values is a memory leak
 * dressed as a rate limiter — the limiter becomes the denial of service. On
 * overflow every expired entry is dropped, and if that is not enough the whole
 * map is cleared: losing counters fails OPEN for one window, which is the correct
 * trade against exhausting the function's memory and taking the funnel down.
 */
const MAX_KEYS = 20_000;

function hit(key: string, limit: number, windowMs: number): { allowed: boolean; retryAfter: number } {
  const now = Date.now();

  if (counters.size > MAX_KEYS) {
    for (const [k, v] of counters) if (v.resetAt <= now) counters.delete(k);
    if (counters.size > MAX_KEYS) counters.clear();
  }

  const existing = counters.get(key);
  if (!existing || existing.resetAt <= now) {
    counters.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }

  existing.count += 1;
  if (existing.count > limit) {
    // Seconds, rounded up and never zero: `Retry-After: 0` reads as "retry now"
    // to some clients, which turns a limit into a tight retry loop.
    return { allowed: false, retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)) };
  }
  return { allowed: true, retryAfter: 0 };
}

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const rule = ruleFor(pathname);
  if (!rule) return NextResponse.next();

  const { allowed, retryAfter } = hit(`${rule.bucket}:${clientKey(request)}`, rule.limit, rule.windowMs);
  if (allowed) return NextResponse.next();

  /*
   * Logged with the bucket and NOT the IP or any request body. The point of the
   * log line is "this bucket is being hammered", which the bucket name answers;
   * an IP in a Vercel log is personal data under GDPR with no debugging value
   * that the Cloudflare dashboard does not already give in a better form.
   */
  console.warn(
    `[middleware] rate limited ${rule.bucket} (>${rule.limit} req/${rule.windowMs / 1000}s from one ` +
      'client on one instance). This is a per-instance window — if this is a real attack, add a ' +
      'Vercel Firewall or Cloudflare rate-limit rule, which is the control that actually holds.',
  );

  const headers = {
    'retry-after': String(retryAfter),
    // No caching of a 429, ever: a CDN that cached one would lock out a whole
    // region long after the window expired.
    'cache-control': 'no-store',
  };

  /*
   * /coach/book/hold is a page, not an API. A student who somehow trips this must
   * not be shown JSON, and above all must not be told their booking failed —
   * their slot IS booked, the card hold is the only thing deferred. Same posture
   * as the page's own failure copy.
   */
  if (pathname === '/coach/book/hold') {
    return new NextResponse(
      'Your slot is booked. This page was opened too many times in quick succession, so the card ' +
        'step is paused for a moment — wait a minute and reload, or reply to your confirmation ' +
        'email and it will be sorted by hand. Nothing about your booking has changed.',
      { status: 429, headers: { ...headers, 'content-type': 'text/plain; charset=utf-8' } },
    );
  }

  return NextResponse.json({ error: 'Too many requests. Please try again in a moment.' }, {
    status: 429,
    headers,
  });
}

export const config = {
  /*
   * Only the write paths. Deliberately NOT a site-wide matcher: middleware runs
   * on every matched request, and putting it in front of the marketing pages
   * would add latency and an extra failure mode to routes that write nothing.
   *
   * /api/cron/review-requests is absent on purpose — it is bearer-authenticated
   * with CRON_SECRET and called by Vercel Cron, and a 429 there would silently
   * skip a day of review requests.
   */
  matcher: ['/api/stripe/:path*', '/api/calcom/:path*', '/coach/book/hold'],
};
