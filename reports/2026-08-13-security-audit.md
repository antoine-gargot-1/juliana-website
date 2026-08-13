# Security Audit — 2026-08-13

**Scope:** `juliana-website` @ `main` / `6091cb0` (working tree clean). Next.js 16.2.12 App Router on Vercel behind Cloudflare, live at `https://www.juliana-beltran.com`.
**Mode:** static — code reading, SAST, dependency and secret scanning, full git-history secret scan, client-bundle inspection, plus read-only `HEAD` requests for response-header inspection.
**Authorized targets:** none for active testing. Phase 8 dynamic probes were **not run** — the target takes live card payments and dynamic authorization was explicitly withheld. No `sqlmap`, `nikto`, `nmap`, `ffuf`, no POST to any endpoint, no write to Stripe or Cal.com.
**Datastore:** Stripe. There is no database and no user account system.

---

## Executive Summary

- **Critical: 0 | High: 1 | Medium: 6 | Low: 6 | Info: 3**

**Top 3 risks**

1. **`POST /api/stripe/checkout` is an unauthenticated, unthrottled write into the system of record.** The price allow-list holds perfectly — no amount or price ID can be injected — but `email`, `guardianEmail`, `name`, `gaClientId` and the click IDs are attacker-controlled and are written to a *real live Stripe Customer created before any payment*. There is no rate limiting anywhere in the project.
2. **`/coach/book/hold` accepts query-string overrides for fields the Cal.com booking did not supply**, so anyone holding a leaked Cal.com booking uid can write attacker-chosen `guardian_email`, `goals`, `gclid` and `ga_client_id` onto that student's Stripe Customer, and can attach their own card as that customer's default payment method.
3. **No CSP, no `X-Content-Type-Options`, no `Referrer-Policy`, no `Permissions-Policy`, no frame-ancestors control** on a site that has two `dangerouslySetInnerHTML` sinks, an embedded third-party iframe, and bearer capability tokens travelling in URLs.

**What is genuinely well built:** webhook verification, HMAC token design, constant-time comparison discipline, fail-closed posture on every missing secret, secret hygiene in git, and the server/client boundary. Details in *Positive Observations*.

---

## Findings

### [HIGH] Unauthenticated `POST /api/stripe/checkout` creates live Stripe Customers with attacker-controlled metadata, with no rate limit (CWE-770, CWE-799 / OWASP A04)

**Location:** `app/api/stripe/checkout/route.ts:88-204` → `lib/booking.ts:469-480` → `lib/students.ts:391-449`

**Description:**
The route's stated security boundary — the client names a price and never sets one — is implemented correctly and defended twice (`app/api/stripe/checkout/route.ts:121` against `PRICES`, then again in `lib/booking.ts:454` via `lookup()`). There is no `amount`, `currency` or `priceId` path, and `catalogPrice.amountCents <= 0` is rejected separately. **That part of the threat model is sound: an amount cannot be injected.**

The unguarded part is everything else the body carries. `clean()` (`:83-86`) only trims and truncates to 200 characters — it validates nothing. Those values flow to `findOrCreateStudent`, which **creates a real live Stripe Customer before any money moves** (`lib/booking.ts:470-480`), stamping `guardian_email`, `ga_client_id`, `gclid`, `gbraid`, `wbraid` and all five `utm_*` keys into its metadata.

There is no rate limiting on this route or anywhere else in the project. Verified absent: no `middleware.ts`, no `has`/firewall rules in `vercel.json`, no `@upstash/ratelimit`, no `arcjet`, no in-process throttle. `package.json` has 6 production dependencies and none of them is a limiter.

**Impact:**

- **(a) Unbounded live-Customer creation.** One `curl` loop mints unlimited Stripe Customers against arbitrary or harvested email addresses. Stripe *is* the database here (`lib/students.ts:9-24`), so this pollutes the system of record directly, and it degrades every reporting function that reads it — `payingStudents()`, `studentsAwaitingReviewRequest()`, `lifetimeValueCents()`.
- **(b) Attribution poisoning — the sharpest consequence.** `findOrCreateStudent` deliberately *patches* rather than replaces (`lib/students.ts:428-438`), and `meta()` drops empty values so a key not supplied on a later visit survives (`:180-187`). An attacker who pre-creates a Customer for a prospect's email with a chosen `ga_client_id` and `gclid` keeps those values when the real student books. The Primary conversion the entire ad budget bids against (`assessment_booked`, ~$1,150) is then attributed to an attacker-chosen GA4 session, and `scripts/offline-conversions.ts` will upload that student's true LTV against an attacker-chosen click ID.
- **(c) Payer redirection.** `guardianEmail` wins over `email` when selecting the payer (`lib/booking.ts:469`), and a poisoned `guardian_email` on an existing record is what operator alerts and manual follow-up will read.
- **(d) Cost and reputational DoS.** Every request is one or more live Stripe API writes. Sustained abuse consumes the account's write rate limit (shared with the webhook handler and the checkout path real buyers depend on), and floods the Dashboard with abandoned sessions — destroying the per-flow conversion rate the `integration_identifier` constants (`lib/booking.ts:70-81`) exist to measure.

**Not** in scope of this finding: no money moves, no other person's data is read out, and Stripe sends no email at session creation, so this is not an email-bombing vector.

**Proof of concept (not executed against production):**
```
POST /api/stripe/checkout           # any origin, no credentials
Content-Type: application/json
{"lookupKey":"<any key from content/pricing.json>",
 "email":"victim@example.com",
 "guardianEmail":"attacker@evil.example",
 "gaClientId":"1.1.9999999999.9999999999",
 "gclid":"ATTACKER_CHOSEN_CLICK_ID"}
```
Repeat with distinct emails; each call creates a live `cus_…`. Repeat against a known prospect's email to pre-poison their record.

**Remediation:**

1. **Rate limit, at the edge.** A Vercel Firewall rule on `/api/stripe/*` (e.g. 5 requests / 60s / IP) needs no code and no dependency. Cloudflare is already in front and can do the same.
2. **Add a bot check to the pricing form.** Cloudflare Turnstile verified server-side before the Stripe call is the proportionate control for a public buy button.
3. **Make attribution metadata write-once.** In `findOrCreateStudent`, do not overwrite an existing `ga_client_id` / `gclid` / `gbraid` / `wbraid` / `utm_*` on a found Customer:
   ```ts
   const existingMeta = found.metadata ?? {};
   const safePatch = Object.fromEntries(
     Object.entries(patch).filter(([k]) => !WRITE_ONCE_KEYS.has(k) || !existingMeta[k]),
   );
   ```
   This also fixes the same weakness on the `/coach/book/hold` path below.
4. **Validate `email` / `guardianEmail` server-side** with the same shape check the client already applies (`components/coach/BookingForm.tsx:202`), and reject rather than forwarding 200 characters of arbitrary text to Stripe.
5. Consider deferring Customer creation on the *direct-purchase* path to `checkout.session.completed`, carrying attribution on session metadata in the meantime — `lib/booking.ts:489-498` already does exactly this for the no-email case, so the machinery exists.

**References:** CWE-770 (Allocation of Resources Without Limits), CWE-799 (Improper Control of Interaction Frequency), OWASP A04:2021.

---

### [MEDIUM] `/coach/book/hold` lets a leaked Cal.com booking uid write attacker-chosen fields onto another student's Stripe Customer (CWE-639 / OWASP A01)

**Location:** `app/(coach)/coach/book/hold/page.tsx:79-83`, `:123-169`; `lib/calcom.ts:294-305`; `lib/booking.ts:361-370`

**Description:**
The threat you asked about — forging or brute-forcing a uid to create unlimited Customers — **is mitigated**. The booking is verified server-side against the Cal.com REST API with our own API key (`getBooking()`, `lib/calcom.ts:336-353`) before anything is created, an unknown uid returns 404 → `failure = 'not-found'`, and `mode` cannot be attacker-supplied because `modeFromEventTypeId(booking.eventTypeId)` takes precedence (`hold/page.tsx:126`). The idempotency key is derived from the uid and so *is* attacker-influenced, but only within the set of real bookings in our own Cal.com account, which bounds it to no effect.

The residual issue is the resolution order in the `value()` helper:

```ts
const value = (booking, params, key) =>
  bookingValue(booking, key) ?? (first(params[key]) || undefined);
```

Cal.com booking data wins, **but the page's own query string is the fallback**. For any field the real booking did not carry, the attacker supplies it. For an adult student (no `guardian_*` in booking metadata) that includes `guardian_email` and `guardian_name`; it also includes `goals`, `experience`, `availability`, `gclid`, `gbraid`, `wbraid`, `ga_client_id` and all five `utm_*`. All are written straight onto that student's live Stripe Customer.

The booking uid is treated here as an authorization token, but it is not secret. It appears in the `/coach/book/hold` URL bar, in that page's own `mailto:` subject (`hold/page.tsx:220-222`), in the Stripe `success_url` as `?booking=<uid>` (`lib/booking.ts:194`), and in Cal.com's confirmation email — and with no `Referrer-Policy` set (see below) it is reachable by third-party subresources on those pages.

Secondly, `attachDefaultPaymentMethod` runs for **every** successful SetupIntent, not only assessment holds (`app/api/stripe/webhook/route.ts:200-202`; documented as intentional at `lib/booking.ts:358-360`). An attacker with a valid uid gets a Stripe Checkout setup URL bound to the victim's Customer (prefilled with the victim's email — a minor info leak in itself) and can complete it with their own card, which then becomes that customer's `invoice_settings.default_payment_method` and is charged for the victim's monthly plan. The direction is odd (the attacker pays) but it enables griefing and chargeback abuse against the operator's Stripe account.

**Impact:** write-only corruption of another person's record in the system of record; conversion attribution poisoning identical to the HIGH above; redirection of guardian correspondence; default-payment-method substitution. No read of another person's data, and no money is taken from a victim — which is why this is MEDIUM and not HIGH.

**Proof of concept (not executed):**
```
GET /coach/book/hold?uid=<a real Cal.com booking uid>
  &guardian_email=attacker@evil.example
  &gclid=ATTACKER_CHOSEN_CLICK_ID
  &ga_client_id=1.1.9999999999.9999999999
```
The page creates/patches the Customer for that booking's attendee with those values and 303s to a live Stripe setup Checkout.

**Remediation:**

1. Restrict the query-string fallback to attribution-only keys that cannot identify or bill anybody. `ga_client_id` and the click IDs are the values the comment at `:76-78` says the fallback exists for; `guardian_email`, `guardian_name`, `goals`, `experience` and `availability` have no business arriving that way and should come from the verified booking only:
   ```ts
   const QUERY_FALLBACK_ALLOWED = new Set([
     'ga_client_id','gclid','gbraid','wbraid',
     'utm_source','utm_medium','utm_campaign','utm_content','utm_term',
   ]);
   const value = (booking, params, key) =>
     bookingValue(booking, key) ??
     (QUERY_FALLBACK_ALLOWED.has(key) ? first(params[key]) || undefined : undefined);
   ```
2. Apply the write-once rule from the HIGH finding, so a second visit cannot overwrite fields already on the record.
3. Refuse to act on a booking that already has a completed hold: check `student.bookingUid === bookingUid && student.stage !== 'booked'`, or check the booking's `status` from Cal.com, before creating a second setup session.
4. Gate `attachDefaultPaymentMethod` on `setupIntent.metadata.kind` plus an existing subscription, or verify the SetupIntent's Checkout Session was the one we created for that booking.

**References:** CWE-639 (Authorization Bypass Through User-Controlled Key), CWE-472 (External Control of Assumed-Immutable Web Parameter), OWASP A01:2021.

---

### [MEDIUM] Security headers absent: no CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` or frame-ancestors control (CWE-693 / OWASP A05)

**Location:** `vercel.json:11-17` (only a preview-host `X-Robots-Tag` is set); no `middleware.ts`; `next.config.ts` sets no `headers()`.

**Evidence** — observed on production (`curl -sSI`, read-only):
```
GET https://www.juliana-beltran.com/
  strict-transport-security: max-age=63072000     # present, from Cloudflare
  access-control-allow-origin: *
  server: cloudflare
  # absent: content-security-policy, x-content-type-options,
  #         referrer-policy, permissions-policy, x-frame-options

GET https://www.juliana-beltran.com/coach/account
  strict-transport-security: max-age=63072000
  x-powered-by: Next.js
  cache-control: private, no-cache, no-store, max-age=0, must-revalidate   # correct
  # same four headers absent
```

**Description and impact, ranked by what actually matters here:**

- **`Referrer-Policy` missing** is the one with a concrete asset behind it. Three capability-bearing or identifying values travel in URLs on this site: `/coach/account?t=<hmac>` (a token that can cancel a subscription and read every invoice), `/coach/book/hold?uid=<booking uid>` (the pseudo-authorization token in the finding above), and `?session_id=cs_…`. Those pages load `googletagmanager.com`, the Cal.com embed, and Spotify/YouTube. Modern Chrome/Firefox default to `strict-origin-when-cross-origin`, which strips the path — so this is defence-in-depth today rather than a live leak — but it is one browser default away from being a token leak to Google, and it should be stated explicitly.
- **No CSP** on a site with two `dangerouslySetInnerHTML` sinks (`components/SiteAnalytics.tsx:96`, `components/JsonLd.tsx:15`) and a third-party iframe. Both sinks are individually safe (see *Positive Observations*), so there is no XSS today; a CSP is what keeps that true after the next edit, and it is also the control that would contain an injected script from reaching `google-analytics.com` or an attacker endpoint.
- **No `X-Content-Type-Options: nosniff`** — MIME sniffing on user-influenced responses. Low exploitability here (no upload surface), trivial to fix.
- **No frame-ancestors / `X-Frame-Options`** — `/coach/account` renders a single-button form that POSTs a bearer token. Clickjacking requires the attacker to already know the token to construct the framed URL, which caps the impact, but there is no reason for this page to be frameable.
- **`access-control-allow-origin: *` on HTML documents.** Benign as configured — the app sets no cookies and has no session, so there are no credentials for a cross-origin read to steal, and `*` cannot be combined with credentials. Worth correcting anyway so it never gets inherited by a future authenticated route.
- **HSTS lacks `includeSubDomains` and `preload`**, so a subdomain remains downgradeable.
- **`x-powered-by: Next.js`** plus `x-matched-path`, `x-nextjs-prerender`, `x-vercel-cache`, `x-vercel-id` — framework and routing disclosure (see INFO below).

**Remediation:** add a `headers()` block in `next.config.ts` (preferred over `vercel.json` so the CSP can be composed in code):
```ts
async headers() {
  return [{
    source: '/:path*',
    headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      { key: 'Content-Security-Policy', value: [
          "default-src 'self'",
          // GA4 loader + the ga4-init inline block. Prefer a nonce over
          // 'unsafe-inline' — SiteAnalytics is a client component and can
          // read a nonce from headers().
          "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
          "connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com",
          "img-src 'self' data: https://www.google-analytics.com https://www.googletagmanager.com",
          "style-src 'self' 'unsafe-inline'",
          "font-src 'self'",
          "frame-src https://cal.com https://app.cal.com https://open.spotify.com https://www.youtube-nocookie.com",
          "frame-ancestors 'none'",
          "form-action 'self' https://checkout.stripe.com https://billing.stripe.com",
          "base-uri 'none'",
          "object-src 'none'",
        ].join('; ') },
    ],
  }];
}
```
Deploy the CSP in `Content-Security-Policy-Report-Only` first — the Cal.com embed and the Spotify/YouTube facades will need the `frame-src` list confirmed against reality.

**References:** CWE-693, CWE-1021, OWASP A05:2021.

---

### [MEDIUM] Minors' personal data travels in URLs and lands in Stripe Customer metadata unintentionally (OWASP A02 / privacy)

**Location:** `components/coach/BookingForm.tsx:251-267`, `:290-334`, `:340`; `app/(coach)/coach/book/hold/page.tsx:138`; `lib/calcom.ts:294-305`; `lib/students.ts:398-423`

**Description:**
When the student is a minor (`age < 18`), the booking form collects the child's age, the guardian's name and the guardian's email, then transmits all of it **through query strings**:

- Every metadata key is duplicated as a bare query parameter (`BookingForm.tsx:326-328`), and the comment at `:317-322` records that Cal.com **forwards unrecognised query params onto the success-redirect URL**. So `age`, `guardian_name` and `guardian_email` land in `/coach/book/hold`'s own URL — the browser address bar, browser history, Vercel access logs, and the `Referer` sent to every third-party subresource on that page (no `Referrer-Policy` is set — see above).
- The new-tab fallback builds `https://cal.com/<link>?<all of it>` directly (`:340`).

Separately, the free-text `notes` blob includes `Student is ${form.age}; guardian ${form.guardianName}` (`:298`). The hold page reads `at('goals') ?? at('notes')` (`hold/page.tsx:138`), and because no `goals` key exists in either the Cal.com metadata or the responses bag, **the `notes` blob is what gets written into the Stripe Customer's `goals` metadata field** — carrying a child's age and their guardian's name into Stripe under a field name that does not describe it.

Stripe Customer metadata is a plain key/value store returned by every API read, visible to anyone with Dashboard access, and included in exports. It carries none of the protections that apply to card data. `age` is not read by any consumer in the codebase.

**Impact:** children's personal data in URLs, browser history, third-party logs (Cal.com) and first-party access logs; guardian identity persisted in a mislabeled Stripe field; unnecessary breadth of retained data on minors under CCPA/CPRA and — for the site's non-trivial organic EU reach that `lib/analytics.ts:36-77` itself acknowledges — GDPR Art. 5(1)(c) data minimisation.

**Remediation:**

1. Stop putting identity fields in query strings. Send `guardian_name`, `guardian_email` and `age` to the server in a POST body (a small route handler that stores them keyed by booking uid, or via Cal.com's API rather than a URL), and keep only `ga_client_id` / `gclid` / `utm_*` on the URL — those are non-identifying and are the values the redundancy exists for.
2. Introduce an explicit `goals` metadata key from the form so `notes` is never the fallback, and truncate/strip the composed `notes` blob before it can reach Stripe.
3. Drop `age` entirely — nothing reads it. If the teacher needs it, `guardian_email` already signals "minor" and the exact age can live in the operator's own notes.
4. Add a retention rule: purge `guardian_*` and `goals` from a Customer's metadata once a plan ends (`customer.subscription.deleted` already has a handler to hang it off).

**References:** CWE-598 (Use of GET Request Method With Sensitive Query Strings), OWASP A02:2021.

---

### [MEDIUM] `scripts/offline-conversions.ts`: unvalidated output path, PII CSV not gitignored, and CSV formula injection from a visitor-controlled value (CWE-1236, CWE-73)

**Location:** `scripts/offline-conversions.ts:88`, `:105-106`, `:132`, `:142`, `:177-187`, `:203`; `.gitignore`

**Description:** three defects compound in one script.

1. **CSV formula injection, remotely seeded.** `csvCell` (`:105-106`) quotes only on `"`, `,` and `\n`. It does not neutralise a leading `=`, `+`, `-` or `@`, and does not handle `\r`. The first column is `gclid`, which is read off a visitor's landing URL, truncated to 200 characters with no charset validation (`lib/analytics.ts:272`), posted through `BookingForm`/`Purchase.tsx`, and persisted to Stripe metadata (`lib/students.ts:420-422`). A visitor arriving at `?gclid==HYPERLINK("http://evil.example","ok")` gets that string emitted raw into a file the operator opens in Excel or Sheets. A `\r` in the same value corrupts row framing on upload to Google Ads.
2. **Unvalidated write path.** `:203 writeFileSync(OUT, …)` with `OUT = arg('out')` (`:88`) — no normalisation, no traversal check, no exists guard. `--out .env` or `--out ../../x` silently clobbers.
3. **The PII output is not gitignored.** `.gitignore` has no `*.csv` rule. A `--out ltv.csv` at the repo root is fully trackable and will be caught by a careless `git add .`. The file contains `gclid` (an advertising identifier tied to an individual — personal data under GDPR/CCPA), first-payment timestamps and true lifetime value. Student emails additionally go to stderr at `:142`, so `2>logfile` or a CI capture puts real addresses and their LTV in a log.

Also: `:89 Number(arg('min-months') ?? DEFAULT)` yields `NaN` when the flag is passed last or non-numerically, making the `:132` retention gate always false — **every** paying student is exported, over-disclosing data and feeding Google Ads exactly the 1-month cohort the file header argues against.

**Remediation:** prefix any cell beginning `= + - @ \t \r` with a `'`; include `\r` in the quote trigger; resolve `OUT` and reject anything outside a dedicated `exports/` directory; add `exports/` and `*.csv` to `.gitignore`; write with `mode: 0o600` and `flag: 'wx'`; validate `MIN_MONTHS` with `Number.isFinite` and exit on `NaN`; log `student.id` rather than `student.email`.

**References:** CWE-1236 (Formula Injection), CWE-73 (External Control of File Name or Path), CWE-532.

---

### [MEDIUM] `scripts/stripe-bootstrap.ts` mutates the live Stripe account by default, guarded only by a printed warning (CWE-807)

**Location:** `scripts/stripe-bootstrap.ts:41`, `:543-549`, `:320`, `:258-262`

**Description:** `const DRY_RUN = process.argv.includes('--dry-run')` — **apply is the default, dry-run is opt-in.** With a live key, `npm run stripe:bootstrap` prints `WRITING TO THE LIVE ACCOUNT…` / `…stop now.` and then immediately proceeds. There is no prompt, no `--confirm`, no sleep, and no `isLiveMode() && !CONFIRM → exit`. `isLiveMode()` is used only to build a log string (`:539`, `:543`).

Reachable live mutations in that single unflagged command: `products.create`/`update`, `prices.create`/`update`, the immutable-field **replace** path (`:258-262` creates a new Price with `transfer_lookup_key: true` and archives the old one — re-pointing the live rate card), and `archiveOrphanedPrices` (`:320`), which deactivates *any* active Price on a managed Product absent from `content/pricing.json` — silently archiving a bespoke or legacy price agreed with a real student.

`scripts/calcom-bootstrap.ts:42` has the same opt-in-dry-run shape with a materially smaller blast radius (unmanaged event types are read-only), and additionally takes an **unvalidated `--base-url`** (`:44-49`) that is persisted as `successRedirectUrl` with `forwardParamsSuccessRedirect: true` (`:328-334`) onto both live assessment event types — a typo or hostile value persistently redirects every real booker off-site with their booking params forwarded. The `https://` check at `:431-435` warns but does not block and does not check the host.

**Remediation:** invert the default to dry-run, require `--apply`, and hard-gate live writes:
```ts
if (isLiveMode() && !process.argv.includes('--confirm')) {
  console.error('Live account. Re-run with --confirm.'); process.exit(1);
}
```
Make `archiveOrphanedPrices` require its own flag. Allowlist `--base-url` against the known production and preview hosts and exit on a mismatch.

**References:** CWE-807 (Reliance on Untrusted Inputs in a Security Decision), CWE-20.

---

### [MEDIUM] `scripts/start-plan.ts --dry-run` mints and prints a working plan-start capability token (CWE-532)

**Location:** `scripts/start-plan.ts:166`, `:172-177`, `:129-131`, `:90`

**Description:** the `console.log` of `planLinkUrl(...)` at `:172-174` sits **before** the `if (DRY_RUN)` check at `:176`. So `--link --dry-run` prints a fully valid, immediately usable 21-day HMAC-signed link that starts a paid subscription on the customer's saved card, while reporting `DRY RUN — no email sent.` A dry run must not produce a live credential. The token lands in terminal scrollback, shell history and any CI log. The same output prints the student's name, email and customer id (`:130-131`), and the duplicate-email branch prints every candidate `cus_…` (`:90`).

Also live-relevant: `--dry-run` is opt-in here too (`:48`), so the default with a live key is *apply* — `:198 await startPlan(...)` creates a real subscription. The `student.stage === 'active'` case only prints a warning (`:153-161`) that explicitly notes a different plan "would create a second subscription and bill them twice a month", and then continues.

**Mitigating fact:** the token is currently inert, because `/coach/book/plan` does not exist (see the LOW below). **Fixing that route without fixing this raises this finding's severity.**

**Remediation:** move the `DRY_RUN` early-return above the URL generation; never log the token (print only its expiry and the customer id); require `--confirm` when `isLiveMode()`; refuse to proceed when `stage === 'active'` unless `--force`.

**References:** CWE-532 (Insertion of Sensitive Information into Log File), CWE-522.

---

### [LOW] Four high-severity dependency advisories, none reachable from untrusted request input (OWASP A06)

**Location:** `package.json` (`next@^16.2.12`), `package-lock.json`

**Evidence** — `npm audit`: 4 high, 0 critical, 0 moderate, 0 low.

| Package | Advisory | Reachability here |
|---|---|---|
| `postcss` ≤8.5.22 (via `next`) | GHSA-6g55-p6wh-862q, GHSA-r28c-9q8g-f849, GHSA-fxqj-rqcc-2cmp, GHSA-qx2v-qp2m-jg93 — arbitrary `.map` read / path traversal via attacker-controlled `sourceMappingURL` | **Build-time only.** CSS is first-party (`app/styles.css`, `app/fonts.css`). No untrusted CSS is ever processed. |
| `sharp` <0.35.0 (via `next`) | GHSA-f88m-g3jw-g9cj — libvips CVE-2026-33327/33328/35590/35591 | **Not reachable.** `next.config.ts` declares no `images.remotePatterns`, so `/_next/image` will only optimise local, first-party assets. There is no upload surface anywhere in the app. |
| `nanoid` ≤3.3.17 | GHSA-28wg-ghj8-5hjv, GHSA-2v37-7h3g-55p8 — infinite loop on negative/zero size | **Not reachable.** No application code calls `nanoid`; size is never user-derived. |

Per the skill's triage rule (high + reachable = blocker; otherwise not), none of these is a blocker. Rated LOW rather than dismissed because the fix is one command and `next` should not sit on a range that `npm audit` flags.

**Remediation:** `npm audit fix`, then `npm run build && npm run typecheck` to confirm the `next` bump is clean. Wire `npm audit --audit-level=high` into CI so this does not drift.

---

### [LOW] PII in application logs (CWE-532 / OWASP A09)

**Location:** `lib/email.ts:84-89`, `:116`, `:123`; `app/api/calcom/webhook/route.ts:94-100`, `:126-131`; `app/api/stripe/webhook/route.ts:453-456`, `:570-573`; `app/api/stripe/portal/route.ts:104-107`; `scripts/offline-conversions.ts:142`

**Description:** student email addresses and Stripe customer ids are written to logs on several ordinary paths — the Cal.com webhook logs `email=${booking.attendeeEmail}` on every booking (`:97`), `send()` logs `message.to` on any provider failure (`email.ts:116`), and the churn/retention handlers log customer ids. With `RESEND_API_KEY` unset, `email.ts:84-89` logs the **entire message body** including the recipient; in production that key is set, so this path is a local-development concern rather than a deployed one.

The token discipline here is otherwise excellent and deliberate: `app/api/stripe/portal/route.ts:88-91` explicitly logs the *reason* and not the token, with a comment saying why. This finding is the residue around it, not a contradiction of it.

**Impact:** PII accumulation in Vercel's log retention, readable by anyone with project access. Not a breach; a data-minimisation and blast-radius issue.

**Remediation:** log `customerId` / `booking.uid` and never the email address; where an address is genuinely needed for triage, log a truncated SHA-256 (`hashEmail()` already exists in `lib/ga-server.ts:92`). Drop the body from the `RESEND_API_KEY`-unset warning, or gate it on `NODE_ENV !== 'production'`.

---

### [LOW] `/coach/book/plan` does not exist — plan tokens are unusable and `/coach/account` is unreachable

**Location:** `lib/booking-token.ts:45` (`PLAN_LINK_PATH = '/coach/book/plan'`), `:206` (`verifyBookingToken`), `:296` (`accountLinkUrl`); `app/(coach)/coach/book/` contains only `page.tsx`, `confirmed/`, `hold/`

**Description:** two dead capability paths, found while tracing token consumption:

- `PLAN_LINK_PATH` resolves to a route that does not exist. `scripts/start-plan.ts --link` emails students a **404**. `verifyBookingToken` has zero callers anywhere in `app/`, `lib/`, `components/` or `scripts/`.
- `accountLinkUrl` / `signAccountToken` are called from nowhere outside `booking-token.ts` itself. **No account token is ever issued**, so `/coach/account` can never be reached with a valid `?t=`, and the billing self-service page renders only its "you need the link from your receipt" fallback. No receipt email template includes the link.

**Security consequence:** *positive* in the immediate term — it is the reason threat #5 (IDOR on the portal) has no exposure at all today. It is filed as a finding because it is a trap: whoever wires these routes up will inherit the `--dry-run` token leak above, will need to re-verify expiry and purpose enforcement at the new consumption point, and should decide on single-use semantics then (see INFO below).

**Remediation:** either implement `/coach/book/plan` (verifying with `verifyBookingToken`, enforcing `purpose: 'plan'`, and calling `startPlan`) and add `accountLinkUrl()` to the receipt templates in `lib/email.ts` — or delete the unused signers and `PLAN_LINK_PATH` so the dead branch cannot be half-revived. Do not leave it as-is.

---

### [LOW] Log injection via unsanitised `lookupKey` (CWE-117)

**Location:** `app/api/stripe/checkout/route.ts:122-125`; `clean()` at `:83-86`

**Description:** a rejected `lookupKey` is logged verbatim. `clean()` trims and truncates to 200 characters but does not strip control characters, so an attacker can embed `\n` and forge whole log lines in Vercel's log stream — useful for hiding the abuse described in the HIGH finding, or for fabricating entries that mislead an incident review.

**Remediation:** `JSON.stringify(lookupKey)` in the log call, or strip `[\r\n\t]` in `clean()`.

---

### [LOW] Stripe webhook does not check `event.livemode`; Cal.com signature scheme has no timestamp (CWE-294 / OWASP A08)

**Location:** `app/api/stripe/webhook/route.ts:91-127`; `lib/calcom.ts:137-161`; `scripts/stripe-e2e.ts:48-59`, `:93-141`

**Description:** signature verification itself is correct on both handlers and is the strongest part of this codebase (see *Positive Observations*). Two narrower gaps:

- **`event.livemode` is never read.** `scripts/stripe-e2e.ts` signs synthetic events with the real `STRIPE_WEBHOOK_SECRET` and POSTs them (`:48-59`), setting `livemode: false` (`:53`) — which nothing checks. Since `.env.local` holds production credentials, a run against a deployed URL, or a test-mode endpoint added on the same Stripe account, injects fake `assessment_booked` (~$1,150) and `invoice.paid` conversions into the real GA4 property, poisoning Smart Bidding training data, and fires real Resend sends. Requires possession of a webhook secret, so this is a footgun rather than an external attack.
- **Cal.com's signature has no timestamp**, unlike Stripe's, so a captured `(rawBody, x-cal-signature-256)` pair replays indefinitely. Impact is near-nil because `onBookingCreated` only patches metadata (`markAssessmentConfirmed`) and its one email is idempotency-keyed (`:162`).
- **Stripe replay** is bounded by `constructEventAsync`'s default 300-second tolerance, and every write inside that window is idempotency-keyed or `claimConversion`-gated. The three deliberately-repeatable events (`pack_purchased`, `retained_student`, `invoice.paid`) are documented as acceptable at `:552-556`. No action needed.

**Remediation:** add `if (event.livemode !== (process.env.VERCEL_ENV === 'production')) return Response.json({ received: true, handled: false, reason: 'livemode mismatch' });` to the Stripe handler. Have `stripe-e2e.ts` refuse to run unless `GA_DEBUG_ENDPOINT=1` and `RESEND_API_KEY` is unset. For Cal.com, record processed `booking.uid`s or accept the residual — either is defensible.

---

### [LOW] No rate limiting on `/coach/book/hold`, a GET that performs live Stripe writes

**Location:** `app/(coach)/coach/book/hold/page.tsx:87-184`

**Description:** a GET-triggered server component that creates a Stripe Customer and a Checkout Session. The design reasoning (`:32-57`) is sound and the idempotency on the booking uid is real, so a double-tap or a replayed redirect is safe. But each request still costs a Cal.com API read plus at least one Stripe write, unthrottled, and Next.js `<Link>` prefetch or a crawler that acquires a uid-bearing URL will trigger it. `metadata.noindex` (`:25-30`) reduces but does not eliminate crawler reach.

**Remediation:** covered by the edge rate limit recommended in the HIGH finding — extend the rule to `/coach/book/hold`. Short-circuit before any Stripe call when the student already has a completed hold for that uid.

---

### [INFO] Framework and infrastructure disclosure in response headers

`x-powered-by: Next.js`, `x-matched-path`, `x-nextjs-prerender`, `x-nextjs-stale-time`, `x-vercel-cache`, `x-vercel-id` are all returned to clients. `x-matched-path` in particular discloses internal route resolution. Set `poweredByHeader: false` in `next.config.ts` and strip the rest at Cloudflare if you care; the practical benefit is small.

### [INFO] Capability tokens have no revocation and are not single-use

By design (`lib/booking-token.ts:26-41`), and the reasoning is sound for what a plan link permits. Two things to record for when `/coach/account` is actually wired up: an account token replays freely for its full 7 days if intercepted, and rotating `BOOKING_LINK_SECRET` is the only revocation mechanism (which invalidates every outstanding link at once). Given the portal can cancel a subscription and read the full invoice history, consider stamping a `token_issued_at` on the Customer and rejecting tokens older than that stamp, so re-issuing a link invalidates its predecessor.

### [INFO] `scripts/stripe-e2e.ts` leaves created Stripe objects behind

Test Clock (`:75`), Customer (`:78`), SetupIntent (`:87`) and Subscription (`:104`) are never deleted — no `try/finally`, no `testClocks.del`. Documented as intentional at `:30-33`. The live-key guard is implicit but real: `testClocks.create` (`:75`) runs before `customers.create` (`:78`), so a live key aborts before anything is created. That ordering is load-bearing and undocumented as such — add a comment, or an explicit `isLiveMode()` guard, so a future reorder does not create a live subscription on `pm_card_visa`.

---

## Positive Observations

These are not filler. Several are things this class of application usually gets wrong.

- **The price allow-list is airtight and defended twice.** `app/api/stripe/checkout/route.ts:121` checks against `PRICES`, then `lib/booking.ts:454` calls `lookup()` again before any network call. No `amount`, `currency` or `priceId` is accepted on any path, and `$0` is separately refused (`:139`). The allow-list is *derived* from `content/pricing.json` rather than duplicated, so there is no second list to forget. **Threat #1's headline concern — amount/price injection — is genuinely not present.**
- **Both webhooks verify against the raw body.** `await request.text()` before any parse, in both handlers (`stripe/webhook/route.ts:95`, `calcom/webhook/route.ts:42`), with the reasoning written down. Stripe uses `constructEventAsync` (the SDK's own timing-safe comparison with timestamp tolerance); Cal.com uses `createHmac` + explicit length check + `timingSafeEqual` (`lib/calcom.ts:151-158`).
- **Constant-time comparison, with the length pre-check, in all three places that need it** — `lib/booking-token.ts:262-266`, `lib/calcom.ts:156-158`, `app/api/cron/review-requests/route.ts:214-217` — each with a comment explaining that `timingSafeEqual` throws on a length mismatch. This is the single most commonly botched primitive in this kind of codebase.
- **Token verification order is correct and deliberate.** Signature first, then shape, then purpose, then expiry (`lib/booking-token.ts:242-286`). `exp` is read only from a payload whose HMAC already passed. The payload is authenticated, not merely appended — the HMAC covers the base64url payload, and `purpose` lives *inside* it, so domain separation between plan and account tokens is cryptographic rather than positional. **A plan token presented at the portal is refused with `wrong_purpose`** (`:281`, enforced at `app/api/stripe/portal/route.ts:86`). All of threat #3 checks out.
- **No IDOR is reachable.** `/api/stripe/portal` accepts *only* a signed token and never a raw customer id; the customer id is read from the verified payload (`:96`). Knowing or guessing `cus_…` gets an attacker nothing without `BOOKING_LINK_SECRET`. Threat #5 is clean.
- **Fail-closed on every missing secret**, uniformly: the cron endpoint refuses everything when `CRON_SECRET` is unset rather than running open (`cron/route.ts:196-206`), the Cal.com webhook rejects on `no_secret` (`calcom/webhook/route.ts:46-55`), the Stripe webhook 500s so events are redelivered rather than dropped (`:78-89`), and `BOOKING_LINK_SECRET` is length-checked at ≥32 chars with an explanation of why a short HMAC key fails silently (`booking-token.ts:129-142`).
- **Secret hygiene in git is verified clean.** All 35 commits across both branches (`main`, `next-migration`) scanned for `sk_live_`, `rk_live_`, `sk_test_`, `whsec_`, `cal_live_`, `re_`, `AKIA`, `gh[pousr]_` and generic `key/secret/password/token = "…"` assignments: **zero matches.** The committed `.env` contains four `NEXT_PUBLIC_*` values and nothing else, with a well-argued header explaining the rule. `.env.local` is confirmed ignored (`git check-ignore -v` → `.gitignore:13:*.local`) and confirmed untracked. `trivy fs --scanners secret` finds its two live keys *only* in the gitignored `.env.local`, exactly as designed. **Threat #6 passes.**
- **Server/client boundary holds.** `grep` over `.next/static/**` for `sk_live_`, `sk_test_`, `whsec_`, `cal_live_`, `BOOKING_LINK_SECRET`, `CALCOM_API_KEY`, `GA_API_SECRET` and `CRON_SECRET`: **zero matches.** `components/coach/Purchase.tsx` imports only `@/lib/analytics` and `@/lib/site` — **it does not import `lib/pricing`**, as required. (`lib/pricing` *is* in the client bundle via `ModeToggle` and `BookingForm`, which is correct — the rate card is published on the site — and `ASSESSMENT_VALUE_USD` does not appear client-side.) All 8 secret-bearing env vars are read only from server modules. **Threat #7 passes.**
- **The `dangerouslySetInnerHTML` in `SiteAnalytics.tsx` is safe, and the format check is the reason.** `GA_ID_PATTERN = /^G-[A-Z0-9]{4,24}$/i` (`lib/analytics.ts:318`) admits no quote, backslash, angle bracket, slash or semicolon, so nothing that passes it can escape the single-quoted JS string at `:155`. A malformed value sets `GA_ENABLED = false` and the component returns `null` before rendering anything. `components/JsonLd.tsx:16` independently replaces every left angle bracket in its `JSON.stringify` output with the equivalent JSON unicode escape — the one sequence that can break out of a script element. **Threat #10 confirmed sound** — though note this is the *only* thing standing between an env-var compromise and script injection, which is one more reason to add the CSP.
- **Cards never touch the origin.** Stripe-hosted Checkout only; no Elements, no card fields, no PAN in any code path. `mode: 'setup'` with a documented rejection of the `$0 payment` anti-pattern (`lib/booking.ts:139-153`). This keeps the site in PCI SAQ-A.
- **Emails are hashed before leaving for Google**, with Google's normalisation applied correctly and a comment explaining why extra steps would break matching (`lib/ga-server.ts:92-122`). Raw addresses never reach GA4.
- **Idempotency is pervasive and reasoned** — Stripe writes, Resend sends, and `claimConversion()` for the two one-shot conversions, with the read-then-write race explicitly acknowledged and bounded (`lib/students.ts:562-598`). The idempotency-conflict recovery path in `createHoldSession` (`lib/booking.ts:298-347`) is unusually thorough.
- **No injection sinks of the classic kinds.** No SQL (no database), no `eval`, no `new Function`, no `child_process`, no shell interpolation anywhere including `scripts/`, no deserialization of untrusted input, and no URL fetcher taking a user-supplied host (so no SSRF). `semgrep` (563 rules from `p/javascript`, `p/typescript`, `p/owasp-top-ten`) reports **0 findings across 117 files**. All redirects (`Response.redirect`) target either a Stripe-issued URL or a URL built from `NEXT_PUBLIC_SITE_URL` — **no open redirect**.
- **No cookies and no sessions**, so the entire session-fixation / CSRF-on-state / cookie-flags class of finding does not apply. `/coach/account` correctly sends `cache-control: private, no-cache, no-store`.
- **Error messages are disciplined.** Every Stripe error is logged in full server-side and reduced to one actionable sentence for the user, with a comment at each site explaining that Stripe messages name internal ids (`checkout/route.ts:195-203`, `portal/route.ts:100-108`, `hold/page.tsx:174-179`). The `/coach/account` error channel passes a short code through an allowlisted `switch` (`lib/portal.ts:173-190`) rather than reflecting prose — the comment at `portal/route.ts:43-49` states this was deliberate.
- **The portal is POST-only with a written rationale** about mail scanners burning single-use sessions (`portal/route.ts:6-23`). This is a real threat that most implementations miss.

---

## Phase Coverage

| Phase | Status | Notes |
|---|---|---|
| 1 — Recon & Inventory | ✓ | 121 tracked files, 117 TS/TSX. 5 API routes + 2 server components performing writes. Integrations: Stripe, Cal.com, Resend, GA4 Measurement Protocol, Formspree ×2. Auth mechanism: none — HMAC capability tokens + `CRON_SECRET` + 2 webhook signatures. |
| 2 — Secrets & Credentials | ✓ | Full history (35 commits, both branches) + working tree + `.next/static`. `trivy fs --scanners secret` clean on all tracked files. **`gitleaks` and `detect-secrets` are NOT installed** — coverage came from `trivy`, targeted pattern greps, and manual review of `.env` / `.env.example` / `.gitignore`. `trufflehog` also absent, so no live-key *validation* was attempted (correctly — that would be an active check). |
| 3 — Dependencies (SCA) | ✓ | `npm audit`: 4 high / 0 critical. Each triaged for reachability — see the LOW finding. |
| 4 — SAST | ✓ | `semgrep` 563 rules (`p/javascript`, `p/typescript`, `p/owasp-top-ten`), 117 files, 0 findings. `trivy fs --scanners misconfig` clean. Manual dangerous-sink grep for `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`, `child_process`: 2 hits, both reviewed and safe. **`eslint-plugin-security` not run** (no ESLint config in the repo). |
| 5 — OWASP Top 10 manual | ✓ | A01 ✗ (finding 2), A02 ✗ (finding 4), A03 ✓ clean, A04 ✗ (finding 1), A05 ✗ (finding 3), A06 → Phase 3, A07 n/a (no accounts) — token design reviewed instead, A08 ✗ (LOW: `livemode`, Cal.com replay), A09 ✗ (LOW: PII in logs), A10 ✓ clean (no user-controlled fetch target). |
| 6 — AuthN/AuthZ deep dive | ✓ | All 7 entry points traced end to end. Cross-tenant check performed statically: no route accepts a customer id or any other resource identifier directly — the portal reads it from a verified HMAC payload only. Booking uid is the one identifier used as a pseudo-credential; that is finding 2. |
| 7 — Infrastructure as Code | ✓ | `vercel.json` reviewed (redirects, headers, cron). No Dockerfile, no Terraform, **no `.github/workflows/`** — so no CI pipeline, no pinned-action review, and no automated dependency or secret gate exists. `hadolint`/`tfsec`/`checkov` not applicable. |
| 8 — Dynamic probes | **skipped — authorization withheld** | Live production site taking real card payments; dynamic authorization explicitly not granted. Only read-only `HEAD` requests were made, to `/`, `/coach/account`, `/robots.txt` and the 5 API paths, for header inspection. No POST, no auth-bypass loop, no IDOR increment, no CORS probe, no rate-limit burst, no scanner. All PoCs in this report are constructed from code reading and were **not executed**. |
| 9 — Threat Model (STRIDE) | ✓ | Below. |

**What could not be assessed statically (be aware of these gaps):**

- **Whether rate limiting exists at the edge.** Cloudflare and Vercel Firewall rules live in dashboards, not in this repo. The HIGH finding says there is none *in the codebase* — if a Cloudflare rate-limit rule already covers `/api/*`, its severity drops to MEDIUM. **Please check the Cloudflare and Vercel Firewall dashboards and tell me.**
- **Cal.com booking uid entropy.** Finding 2's exploitability depends on it. Brute force looks impractical, but uid *leakage* through URLs, emails and `Referer` is the real acquisition path, and that is a code fact I could confirm.
- **Which env vars are actually set in Vercel Production**, and whether Preview shares the live keys. `stripeConfigured()` degradations imply some may be unset. If Preview holds live Stripe credentials, every preview deployment is a second live-write surface with `X-Robots-Tag: noindex` as its only protection.
- **Stripe restricted-key posture.** Whether `STRIPE_SECRET_KEY` is a full `sk_live_` or a scoped `rk_live_` cannot be seen from here. A restricted key would meaningfully cap findings 1 and 2.
- **Whether the Cal.com API key is scoped**, and whether the Cal.com webhook subscription is still active.
- **Stripe Radar rules, Dashboard portal configuration drift, and Resend domain verification** — all dashboard state.
- **Formspree data handling.** `components/coach/ContactForm.tsx:8` and `components/artist/BookingForm.tsx:7` POST visitor-supplied name/email/message to `formspree.io` endpoints. The endpoint ids are public by design; where Formspree stores that data, and under what retention, is outside the code.

---

## Threat Model (STRIDE)

### Boundary 1 — Visitor → Next.js API (the only externally reachable write surface)

| | Assessment |
|---|---|
| **S** Spoofing | No identity exists to spoof for the checkout and hold paths — that is the design. The two identity-bearing surfaces are strong: HMAC-SHA256 capability tokens with purpose separation and constant-time verification, and `CRON_SECRET` as a timing-safe bearer. **The weak spoofable identifier is the Cal.com booking uid**, which `/coach/book/hold` treats as authorization but which leaks through URLs, emails and `Referer` (finding 2). |
| **T** Tampering | Price tampering: **blocked**, and blocked twice. Token tampering: **blocked** (signature verified before payload is read). **Metadata tampering: OPEN** — findings 1 and 2 both write attacker-chosen values into the Stripe Customer record, which is the system of record. Webhook body tampering: blocked on both handlers via raw-body signature verification. |
| **R** Repudiation | Stripe's own event log and Vercel's request logs are the audit trail, which is proportionate. Gap: nothing correlates a checkout request to an actor — no request id is logged with the `lookupKey` rejection, and the log-injection LOW means log entries themselves are forgeable. There is no way to reconstruct "who created these 400 Customers". |
| **I** Info disclosure | Error handling is genuinely careful — Stripe messages never reach a user, the account error channel is an allowlisted code, and tokens are excluded from logs by explicit decision. Leaks that remain: student emails and customer ids in logs (LOW); the victim's email prefilled on a Stripe Checkout page reachable with a booking uid (finding 2); minors' data in URLs and third-party logs (finding 4); `x-powered-by` / `x-matched-path` (INFO). |
| **D** Denial of service | **The largest unaddressed category.** No rate limiting anywhere: `/api/stripe/checkout` and `/coach/book/hold` are unauthenticated, unthrottled, and each request costs Stripe and Cal.com API quota. The realistic damage is not downtime but *cost and data pollution* — Stripe write-rate exhaustion contending with the webhook handler, a Dashboard unusable for conversion measurement, and a Customer list full of junk. No ReDoS surface (`GA_ID_PATTERN` and the email check are both linear); no bulk or pagination endpoint is exposed to visitors. |
| **E** Elevation of privilege | No roles, so no vertical escalation exists. Horizontal escalation is the risk, and the two paths are: forging a token (requires `BOOKING_LINK_SECRET` — not feasible; ≥32 chars enforced, HMAC-SHA256, constant-time compare), or acting on another student's record via a leaked booking uid (finding 2 — **feasible**). Purpose confusion between plan and account tokens is correctly prevented. |

### Boundary 2 — Next.js → Stripe (the "database" boundary)

| | Assessment |
|---|---|
| **S** | Server-to-server over TLS with `sk_live_`. Key is in Vercel encrypted env and confirmed absent from git and from the client bundle. Cannot determine whether it is a restricted key — a scoped `rk_live_` would cap findings 1 and 2. |
| **T** | Every write goes through `lib/students.ts` with `meta()` truncation and patch-not-replace semantics — good discipline. **The gap is that patch-not-replace makes attacker-written metadata *sticky*** (findings 1 and 2). Write-once semantics for attribution keys is the fix, and it fixes both findings at once. |
| **R** | Stripe's event log is authoritative and immutable, and `retentionMonths()` is derived from paid invoices rather than a stored counter (`lib/students.ts:289-300`) — a deliberately good choice that makes the retention figure non-repudiable. |
| **I** | Metadata is over-broad: guardian identity and, via the `notes` fallback, a minor's age land in a field named `goals` (finding 4). No card data, address or government id is stored — correct. |
| **D** | Stripe rate limits are shared between the abusable public routes and the webhook handler, so boundary-1 DoS propagates here. `maxNetworkRetries: 2` (`lib/stripe.ts:88`) amplifies each abusive request up to 3×. |
| **E** | No Stripe Connect, no multi-account, no impersonation. `attachDefaultPaymentMethod` running for *every* SetupIntent is the one over-broad capability (finding 2). |

### Boundary 3 — Next.js → third parties (Cal.com, Resend, GA4, Formspree)

| | Assessment |
|---|---|
| **S** | Inbound Cal.com is HMAC-verified with a ≥32-char secret enforced at subscription time (`lib/calcom.ts:390-396`). Outbound uses bearer keys over TLS. GA4 Measurement Protocol has no inbound direction. |
| **T** | Cal.com's signature carries **no timestamp**, so a captured request replays indefinitely (LOW) — impact bounded to idempotent metadata patches. `--base-url` in `calcom-bootstrap.ts` can persistently re-point the live booking redirect off-site (finding 6). |
| **R** | Resend `Idempotency-Key` on every send gives a deduplicated audit trail; Cal.com holds the authoritative booking record. Reasonable. |
| **I** | **Minors' age, guardian name and guardian email are transmitted to Cal.com in query strings** and forwarded onto our own redirect URL (finding 4). Visitor name/email/message go to Formspree under unknown retention. Emails are SHA-256 hashed before GA4 — correct. |
| **D** | Cal.com reads sit on the critical booking path with a 15s timeout (`lib/calcom.ts:92`); a Cal.com outage degrades `/coach/book/hold` to its "your slot is booked" panel rather than an error, which is the right failure posture. GA4 sends are 5s-timeout and swallowed so a webhook never fails on analytics (`lib/ga-server.ts:190`, `:207-212`) — correct priority ordering. |
| **E** | `CALCOM_API_KEY` scope is unknown; if it is account-wide, a compromise reaches every booking. `RESEND_API_KEY` scope likewise — a full-access key could send as the domain. Both are worth scoping down. |

---

## Recommendations (priority order)

1. **Rate limit `/api/stripe/*` and `/coach/book/hold` at the edge.** A Cloudflare or Vercel Firewall rule — no code, no dependency, deployable today. This is the single highest-value change in this report and it addresses the HIGH plus two LOWs. *(First confirm whether such a rule already exists; if it does, tell me and I will re-grade.)*
2. **Make attribution metadata write-once in `findOrCreateStudent`,** and restrict `/coach/book/hold`'s query-string fallback to non-identifying attribution keys only. These two edits close the tampering path in both the HIGH and finding 2, and they are small and local.
3. **Add the security headers,** CSP in report-only first. `next.config.ts` `headers()` block, ~20 lines, given in finding 3.
4. **Stop putting minors' data in URLs,** and add an explicit `goals` metadata key so a `notes` blob containing a child's age and guardian's name can never land in the Stripe `goals` field. Drop `age` from the pipeline — nothing reads it.
5. **Harden the operator scripts:** invert `--dry-run` to `--apply` in both bootstraps, hard-gate live writes behind `--confirm`, move the `DRY_RUN` return above the token `console.log` in `start-plan.ts`, and fix the three `offline-conversions.ts` defects (CSV cell escaping, `--out` path validation, `*.csv` in `.gitignore`).
6. **`npm audit fix`** and add `npm audit --audit-level=high` to CI. There is no `.github/workflows/` at all today — a minimal workflow running `typecheck`, `build`, `npm audit` and `semgrep` would catch most of this class of regression before it ships.
7. **Add `event.livemode` checking to the Stripe webhook,** and make `stripe-e2e.ts` refuse to run without `GA_DEBUG_ENDPOINT=1`.
8. **Resolve the dead token paths** — either implement `/coach/book/plan` and wire `accountLinkUrl()` into the receipt emails, or delete the unused signers. Do not leave them half-present. When implementing, revisit single-use and revocation for account tokens.
9. **Scope the API keys down:** a Stripe restricted key (`rk_live_`) with only the resources this app touches, and the narrowest Cal.com and Resend scopes available. Confirm Preview deployments do not hold live Stripe credentials.
10. **Reduce PII in logs** — customer ids and booking uids rather than email addresses, everywhere.

---

*Static analysis only. No code was modified. No dynamic probe, scanner, or write request was issued against production. All proof-of-concept requests in this report were derived from source and were not executed. One real customer id and all real email addresses have been redacted or omitted throughout.*
