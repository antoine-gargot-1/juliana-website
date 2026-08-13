# Stripe / booking runbook

Everything needed to audit the Stripe account, bootstrap the catalogue, test the
funnel end to end, and go live. Written to be followed literally.

Two things are **blocked on someone other than a developer**, and both are named
in [Blockers](#blockers) rather than buried: ACH is not yet switched on in the
Stripe Dashboard, and Cal.com's redirect-after-booking is refused by Cal.com's
own plan gate. Neither is a code problem and neither can be coded around.

---

## 1. Prerequisites

### Stripe CLI

```bash
npm i -g @stripe/cli          # NOT `brew install stripe` — that tap is a different tool
stripe --version              # stripe version 1.45.2 at time of writing
```

Check authentication with the key you already have, rather than logging in
interactively:

```bash
stripe whoami --api-key "$STRIPE_SECRET_KEY" --format json
```

That prints `authenticated`, which account, and which of test/live keys are
available. **It is `stripe whoami`, not `stripe config --list`** — the latter
reports what is written in `~/.config/stripe/config.toml`, which on a machine
that has never run `stripe login` is empty even though every command works fine
via `--api-key`. Confirmed output on this account:

```json
{ "authenticated": true, "test_mode_key": { "available": true },
  "live_mode_key": { "available": false }, "api_version": "2026-07-29.dahlia" }
```

`api_version` there should match `STRIPE_API_VERSION` in `lib/stripe.ts`
(`2026-07-29.dahlia`). If it does not, read the pinning note in that file before
changing anything.

### Environment variables

Secrets go in **`.env.local`** (gitignored via the `*.local` rule — verify with
`git check-ignore -v .env.local`) and in Vercel's encrypted store. **Never in
`.env`**: that file is committed on purpose and holds only the public GA4
measurement ID.

| Variable | Where it comes from | Needed for |
|---|---|---|
| `STRIPE_SECRET_KEY` | Dashboard → Developers → API keys | everything Stripe |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | same page | client-side Stripe (not used yet) |
| `STRIPE_WEBHOOK_SECRET` | see [§4](#4-webhook-secret-the-two-secrets-are-not-interchangeable) | every conversion |
| `CALCOM_API_KEY` | Cal.com → Settings → Developer → API keys | booking |
| `CALCOM_WEBHOOK_SECRET` | you generate it, then pass it when creating the webhook | booking |
| `CALCOM_EVENT_TYPE_ID_ONLINE` / `_INPERSON` | printed by `npm run calcom:bootstrap` | mode resolution |
| `GA_API_SECRET` | GA4 Admin → Data Streams → *stream* → Measurement Protocol API secrets | server-side conversions |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | already in the committed `.env` | all conversions |
| `BOOKING_LINK_SECRET` | `openssl rand -base64 32` | plan links, `/coach/account` links |
| `CRON_SECRET` | `openssl rand -base64 32` | `/api/cron/review-requests` |
| `RESEND_API_KEY` | Resend → API keys | every transactional email |
| `EMAIL_FROM` | an address on a domain verified in Resend | deliverability |
| `OPERATOR_EMAIL` | the teacher's inbox | operator alerts |
| `GOOGLE_REVIEW_URL` | GBP → Ask for reviews | review-request cron |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` locally; the deployed origin on Vercel | Stripe return URLs |
| `GA_DEBUG_ENDPOINT` | set to `1` while wiring tracking; never in production | payload validation |
| `NEXT_PUBLIC_VERCEL_CUSTOM_EVENTS` | `1` only on a paid Vercel plan | Vercel custom events |

Two traps worth knowing before you hit them:

- **Set `NEXT_PUBLIC_SITE_URL=http://localhost:3000` for local testing.** Without
  it, `lib/booking.ts` and `lib/portal.ts` fall back to `SITE_URL`, so Stripe's
  `success_url`, `cancel_url` and the portal `return_url` all point at the
  production domain. Checkout still works; you simply get bounced to the live
  site instead of back to your dev server, which reads as a broken redirect.
- **The `npm run` scripts load only `.env.local`, not `.env`.** So
  `NEXT_PUBLIC_GA_MEASUREMENT_ID` (which lives in the committed `.env`) is
  invisible to them, and anything in `scripts/` that calls
  `sendServerConversion()` will log "server-side conversions are OFF". Next.js
  itself loads both, so this affects scripts only. Pass it inline when you need
  it:
  `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-… npm run <script>`.

### Production keys: use a restricted key

For the deployed environment, create a **restricted key (`rk_live_…`)** under
Dashboard → Developers → API keys → *Create restricted key* rather than putting a
full `sk_live_` in Vercel. A leaked full secret key can read every customer,
issue refunds and rotate other keys; a restricted key can only do what you ticked.

Write permission is needed on: Products, Prices, Customers, Checkout Sessions,
SetupIntents, Subscriptions, Billing Portal Sessions, Webhook Endpoints. Read on:
Invoices, PaymentIntents, Charges, Account.

`scripts/stripe-bootstrap.ts` needs Products/Prices/Portal write, so either run
the bootstrap with the full key from a machine and deploy with the restricted
one, or add those scopes.

---

## 2. Audit before you create anything

Read-only. Run it against test **and** live before every bootstrap.

```bash
npm run stripe:audit
```

It prints the account and its capabilities, every Product and Price (including
archived ones and whether each carries a `lookup_key`), the webhook endpoints,
the portal configurations, and a reconciliation of `content/pricing.json` against
what is actually in the account.

The line to read first is `8 of 8 lookup_keys already correct · 0 missing · 0
needing a new Price`. Anything else means the catalogue and the site disagree
about prices.

---

## 3. Bootstrap the catalogue

Idempotent, and **always dry-run first**:

```bash
npm run stripe:bootstrap -- --dry-run
npm run stripe:bootstrap
npm run stripe:bootstrap -- --dry-run   # must now say "No changes needed"
```

`--skip-portal` does the catalogue only.

Things about this script that are deliberate and should not be "simplified":

- **Prices are immutable in Stripe.** A price *change* cannot be an update, so
  the script creates a new Price and moves the `lookup_key` across with
  `transfer_lookup_key`, archiving the old one. Existing subscriptions keep the
  old price — migrate them deliberately if that is what you want. This path was
  exercised for real when `inperson_pack_10` went $880 → $900.
- **`archiveOrphanedPrices()` must stay.** It archives active Prices on managed
  Products that carry no rate-card `lookup_key`. That is not hypothetical
  tidiness: a killed run once created a replacement Price without archiving the
  original, leaving two active $110 Prices on one Product with only one keyed.
  `resolvePrice()` picks by `lookup_key` so nothing broke — which is exactly why
  it would have gone unnoticed.
- **A second run printing "No changes needed" is a feature.** If the script ever
  reports an action on an unchanged account, that is a bug worth fixing before it
  touches live, because once one line always appears nobody reads the list.

### Portal policy

The script creates a portal configuration tagged `managed_by=juliana-website`:

| Feature | Setting | Why |
|---|---|---|
| Cancel | enabled, `at_period_end`, `proration_behavior: none` | "Cancel anytime" is promised on the pricing page. At period end because the month's lessons are already paid for. |
| Payment method update | enabled | the self-service fix for a declined card; no teacher involvement |
| Invoice history | enabled | receipts for anyone expensing lessons |
| Customer update | name + email only | no premises, nothing shipped — an address would be data with no purpose |
| Plan switching | **disabled** | 60 → 30 min resizes a recurring calendar slot; a dropdown cannot rearrange the teacher's week |

`lib/portal.ts` passes that configuration id **explicitly** to
`billingPortal.sessions.create`. Do not "simplify" that away: without it Stripe
uses whichever configuration is marked default, and a Dashboard click can change
which one that is — silently swapping cancel-at-period-end for
cancel-immediately-with-proration, which refunds lessons already delivered.

### Pause is not self-serve, and cannot be

The agreed policy is *cancel anytime; one free 1-month pause per year*. Cancel is
self-serve. **Pause is not, and there is no configuration that would make it so:**
Stripe removed `features.subscription_pause` from the Portal Configuration API and
it is absent from the SDK types this repo builds against (verified: no match for
`subscription_pause` anywhere in `node_modules/stripe`). The promise is kept
operator-side:

```bash
stripe subscriptions update sub_xxx \
  --pause-collection[behavior]=void \
  --pause-collection[resumes-at]=<unix-timestamp> \
  --api-key "$STRIPE_SECRET_KEY"
```

or `pauseSubscriptionOneMonth()` in `lib/portal.ts`.

**`behavior=void`, never `keep_as_draft`.** `void` means the paused month is never
invoiced. `keep_as_draft` accumulates a draft invoice that is finalised and
**charged** when the pause ends — turning a free month into a deferred double
charge, which is the exact opposite of the promise.

`/coach/account` is therefore worded "reply and I will set it up" for pause, not
"pause it here". Do not reword it to promise a button that does not exist.

---

## 4. Webhook secret: the two secrets are not interchangeable

This is the single most common cause of a funnel that looks healthy and records
nothing. There are **two different `whsec_` values** and they are not related:

**Local (Stripe CLI).** No interactive login needed:

```bash
stripe listen --api-key "$STRIPE_SECRET_KEY" \
  --forward-to localhost:3000/api/stripe/webhook --print-secret
# -> whsec_…
```

This is the CLI's own account-level listener secret. It is stable across
`stripe listen` sessions on the same machine.

**Deployed (Dashboard endpoint).** Dashboard → Developers → Webhooks → *Add
endpoint* → `https://<host>/api/stripe/webhook`, subscribed to exactly:

```
setup_intent.succeeded
checkout.session.completed
customer.subscription.created
customer.subscription.deleted
invoice.payment_failed
invoice.paid
```

then copy that endpoint's **Signing secret** into Vercel encrypted env. One
endpoint, and therefore one secret, **per environment**.

### Do not invent this value

`STRIPE_WEBHOOK_SECRET` is issued by Stripe. It is not like `BOOKING_LINK_SECRET`
or `CRON_SECRET`, which are ours and are generated with `openssl rand`. A
plausible-looking but wrong `whsec_` fails in the most expensive way available:

- every delivery returns **HTTP 400**;
- the route logs `signature verification FAILED`;
- **no conversion is ever recorded**;
- Stripe, the site and the build all look completely healthy.

This actually happened during development: `.env.local` was found holding a
`whsec_` that matched no endpoint on the account, and `npm run stripe:audit`
reported zero webhook endpoints, so it could verify nothing. Every `stripe
trigger` delivery returned 400 while the synthetic-signature test suite passed —
because that suite signed with the same wrong value the server was checking
against. Before debugging anything else:

```bash
stripe listen --api-key "$STRIPE_SECRET_KEY" --print-secret
# compare byte for byte with STRIPE_WEBHOOK_SECRET in .env.local
```

---

## 5. End-to-end test, test mode

Three terminals.

```bash
# 1
npm run dev

# 2
stripe listen --api-key "$STRIPE_SECRET_KEY" --forward-to localhost:3000/api/stripe/webhook

# 3
npm run stripe:e2e
```

`scripts/stripe-e2e.ts` uses **Stripe test clocks**, so it does not wait a week to
find out whether billing is anchored correctly. It runs the whole funnel twice
and asserts each step. Verified output on this account:

```
1) SetupIntent (the $0 card hold)          status=succeeded            PASS
   default_payment_method set                                          PASS
   conv_assessment_booked stamped                                      PASS
   replay the SAME event (GA4 must NOT double-count)                   200
2) startPlan — anchor = assessment + 7d, proration_behavior none
   anchor is +7d                                                       PASS
   *** NO DAY-ZERO CHARGE ***                                          PASS
3) advance clock past the anchor
   first charge amount is $280                                         PASS
   subscriptionIdFromInvoice resolves                                  PASS
   retentionMonths=1 · stage=active · firstPaidAt set                  PASS
```

Then the dunning scenario, then the auth checks:

```
CRON AUTH            no header 401 · wrong secret 401 · correct 200    PASS
CALCOM WEBHOOK AUTH  unsigned 401 · signed 200 · tampered body 401     PASS
BAD STRIPE SIGNATURE                                              400  PASS
```

### The one assertion that matters most

`*** NO DAY-ZERO CHARGE ***`. `startPlan()` sets `billing_cycle_anchor` to
assessment + 7 days, which splits the first period, and Stripe's **default**
response to that split is `create_prorations` — it immediately issues a prorated
invoice and charges the card. `proration_behavior: 'none'` is what prevents it.

The failure is silent: no error, no warning, money simply moves on the wrong day,
a week before the student was told it would. Re-run this test every time
`lib/booking.ts` changes.

### Test cards

| Card / detail | Behaviour | What it proves |
|---|---|---|
| `4242 4242 4242 4242` | succeeds | happy path |
| `4000 0000 0000 0341` | **attaches to the customer, then fails on the first real charge** | dunning: `invoice.payment_failed` fires, the operator is alerted, the student gets a recovery email, and the student is **not** marked churned |
| ACH routing `110000000`, account `000123456789` | succeeds | bank debit (once ACH is enabled — see [Blockers](#blockers)) |

In `scripts/stripe-e2e.ts` these are the PaymentMethod fixtures `pm_card_visa`
and `pm_card_chargeCustomerFail`; for hand-testing through Stripe's hosted
Checkout page, type the numbers above with any future expiry and any CVC.

The `…0341` case is the one people skip and it is the important one: a card that
fails at *attach* time proves nothing, because the funnel would simply stop. A
card that attaches cleanly and fails at *charge* time is the real-world scenario —
an expired card three months in — and it is the only way to see the dunning path
actually run.

### Replay and trigger

```bash
stripe trigger setup_intent.succeeded        --api-key "$STRIPE_SECRET_KEY"
stripe trigger checkout.session.completed    --api-key "$STRIPE_SECRET_KEY"
stripe trigger customer.subscription.created --api-key "$STRIPE_SECRET_KEY"
stripe trigger customer.subscription.deleted --api-key "$STRIPE_SECRET_KEY"
stripe trigger invoice.payment_failed        --api-key "$STRIPE_SECRET_KEY"
stripe trigger invoice.paid                  --api-key "$STRIPE_SECRET_KEY"
```

Verified result: all six delivered **200**, plus 18 other event types Stripe emits
as a side effect of the fixtures, also 200 — those are *acknowledged and ignored*
by design. Returning non-2xx for unsubscribed events would fill the dashboard
with failed deliveries and eventually get the endpoint disabled. **Zero 400s** is
the pass condition; a single 400 means the secret is wrong (see §4).

### Direct purchase

```bash
# valid — returns a Checkout URL
curl -s -X POST localhost:3000/api/stripe/checkout \
  -H 'content-type: application/json' \
  -d '{"lookupKey":"inperson_pack_10","email":"buyer@example.com"}'

# unknown key — 400 "That package is not for sale."
curl -s -X POST localhost:3000/api/stripe/checkout \
  -H 'content-type: application/json' -d '{"lookupKey":"free_lessons_forever"}'

# amount injection — ignored; the response reports the real 90000
curl -s -X POST localhost:3000/api/stripe/checkout \
  -H 'content-type: application/json' \
  -d '{"lookupKey":"inperson_pack_10","amountCents":100}'

# GET — 405, there is no GET handler
curl -s -o /dev/null -w '%{http_code}\n' localhost:3000/api/stripe/checkout
```

The route accepts a `lookupKey` and **never** an amount. It is validated against
`content/pricing.json` before any Stripe call, so a client cannot buy a $900 pack
for $1 by editing devtools.

### Customer Portal

```bash
# mint a link (BOOKING_LINK_SECRET must be set)
#   accountLinkUrl(SITE_URL, { customerId }) in lib/booking-token.ts
curl -s -o /dev/null -w '%{http_code}\n' -X POST localhost:3000/api/stripe/portal \
  -d "t=<account token>"        # 303 -> https://billing.stripe.com/p/session/…
curl -s -o /dev/null -w '%{http_code}\n' localhost:3000/api/stripe/portal   # 405
```

Verified: a valid account token 303s to a real `billing.stripe.com` session; a
**plan** token is refused with `?error=wrong_purpose`; GET is 405.

Plan links and account links are both HMACs over `BOOKING_LINK_SECRET` but carry
a signed `purpose`, and each verifier refuses the other. Without that separation
the one-click "start my plan" link emailed to every student would also open a
page that can cancel their subscription.

---

## 6. Conversion tracking

`GA_DEBUG_ENDPOINT=1` sends payloads to GA4's validation endpoint, which returns
a `validationMessages` array instead of accepting anything silently:

```bash
GA_DEBUG_ENDPOINT=1 NEXT_PUBLIC_GA_MEASUREMENT_ID=G-… npm run stripe:e2e
```

Verified: `assessment_booked`, `pack_purchased`, `plan_started` and
`retained_student` all return `{"validationMessages": []}`.

> **An empty `validationMessages` does NOT mean `GA_API_SECRET` is correct.** GA4
> answers HTTP 204 with no messages even for a *wrong* api_secret. The only proof
> is seeing the events land in **GA4 Admin → DebugView**. Do not record the secret
> as verified on the strength of an HTTP response.

### transaction_id — the deduplication contract

Each conversion is fired twice: authoritatively from the Stripe webhook, and as a
browser mirror (`components/coach/ConversionMirror.tsx`). GA4 deduplicates
nothing, so both sides **must** send the same `transaction_id`:

| Event | `transaction_id` | Server | Client mirror |
|---|---|---|---|
| `assessment_booked` | Cal.com booking uid | `setup_intent.succeeded`, from SetupIntent metadata | `/coach/book/confirmed?booking=` |
| `pack_purchased` | Stripe Checkout Session id | `checkout.session.completed` | `/coach/purchase/confirmed?session_id=` |
| `plan_started` | Stripe Subscription id | `customer.subscription.created` | — |

Google Ads collapses imported conversions sharing a `transaction_id`, so the pair
counts once. Change either side and every booking counts twice at $1,150 — the
Primary conversion the whole campaign bids against.

The identifier namespaces are deliberately disjoint (`cal-uid…` vs `cs_…` vs
`sub_…`) so the assessment and direct-purchase funnels can never collide.

### Google Ads

Import from GA4. `assessment_booked` = **Primary**, everything else Secondary.
The value comes from `ASSESSMENT_VALUE_USD` in `lib/pricing.ts` — read that
constant's comment before touching it; it is neither $0 nor the first month's fee,
and both of those mistakes are expensive in different directions.

`npm run conversions:export` produces the Offline Conversion Import CSV for
`retained_student` at true LTV. **Do not upload it until it emits 30+ rows** — the
script says so itself and refuses to pretend otherwise. It is keyed on `gclid`;
`gbraid`/`wbraid` are stored and counted but need a separate upload with a
different column header.

---

## 7. Booking hand-off (Cal.com)

### Webhook

Not created by `npm run calcom:bootstrap`, on purpose: it needs a public https URL
and creating it is the only way to obtain `CALCOM_WEBHOOK_SECRET`. After the first
deploy, generate the secret, put it in the environment, then call
`createBookingWebhook()` from `lib/calcom.ts` with:

```
subscriberUrl  https://<host>/api/calcom/webhook
secret         openssl rand -base64 32
triggers       BOOKING_CREATED, BOOKING_CANCELLED, BOOKING_RESCHEDULED
```

Verification **fails closed** — with no secret configured the endpoint rejects
everything, because an unverified webhook is an unauthenticated POST that would
let anyone assert a lesson was booked.

### Event types

```bash
npm run calcom:bootstrap -- --dry-run
npm run calcom:bootstrap
```

Prints `CALCOM_EVENT_TYPE_ID_ONLINE` and `_INPERSON` to copy into the
environment. Mode is mapped by **id**, never by title: a title is copy, copy gets
edited, and renaming an event type must not start billing in-person students at
online rates.

Three stock Cal.com event types (`/15min`, `/30min`, `/secret`) are left alone
because the script only touches what it created — but each is publicly bookable at
`cal.com/juliana-beltran` with no price, no card hold and no tracking behind it.
Hide or delete them in the dashboard.

---

## Blockers

Neither of these is a code defect. Both need someone with account access.

### A. ACH is not enabled, so bank debit does not appear

Account capabilities are now **active** (`card_payments`,
`us_bank_account_ach_payments`, `link_payments` — confirmed by
`npm run stripe:audit`), but ACH is still not offered at checkout. Measured on
live test-mode Checkout Sessions:

| Flow | Methods offered |
|---|---|
| $900 pack (`mode: payment`) | card, klarna, link, affirm, cashapp, amazon_pay |
| $280/mo plan (`mode: subscription`) | card, klarna, link, cashapp, amazon_pay |
| $0 assessment hold (`mode: setup`) | card, klarna, link, cashapp, amazon_pay |

No `us_bank_account` anywhere. **Fix: Dashboard → Settings → Payment methods →
enable ACH Direct Debit, and rank it above card.**

This needs **no code change**, and that is the whole point of the design: nothing
in this repo passes `payment_method_types`, so dynamic payment methods decide what
appears from Dashboard settings alone. ACH will show up on the pack and plan
flows the moment it is enabled.

Worth ~$70 per student per year: ACH is 0.8% capped at $5 (≈$4.20 on a $280 plan)
against 2.9% + 30¢ (≈$10.08).

The `$0` assessment hold will stay card-only regardless, via
`excluded_payment_method_types: ['us_bank_account']` in `lib/booking.ts` — a bank
mandate needs a bank login or micro-deposits, which is minutes of friction at the
one step that must be frictionless. **That exclusion is currently untestable**,
because ACH is not offered anywhere yet; re-check it once ACH is on.

### B. Live mode

`live_mode_key.available: false`. Test mode is fully working. Before live: create
the Dashboard webhook endpoint for the production host (§4), add a restricted key
(§1), and re-run `npm run stripe:audit` **against live** before
`npm run stripe:bootstrap` — Products and Prices cannot be deleted afterwards,
only archived.

### C. Cal.com redirect-after-booking is refused

`successRedirectUrl` returns **403 "Redirect on booking is a feature for team plan
users"**, even though a team exists (id `387082`, owner seat accepted, a live
`subscriptionId` in its metadata). Tried and refused three ways: on two personal
event types, and on a brand-new **team-owned** event type created under
`/v2/teams/387082/event-types`. So this is not an ownership or scope problem, and
switching the bootstrap script to team scope will not help.

`npm run calcom:bootstrap` handles this deliberately: it catches that specific
403, creates or patches the event type **without** the redirect so everything else
completes, prints an actionable BLOCKER section, and exits non-zero. Confirmed
working against the live account — do not "fix" it into a hard failure, and do not
retry it in a loop.

**What to check, in order:** Cal.com → Settings → Teams → Billing, is the
subscription `active` rather than incomplete/trialing/past_due (a completed
checkout is not always an active subscription); then any pending team invitations,
since a seat with `accepted: false` can leave the team short of paid seats; then
simply wait and re-run, in case of propagation delay.

#### Why this matters, and the two fallbacks

The redirect is what carries a student from Cal.com to `/coach/book/hold`, where
the Stripe Customer is created and the $0 card is captured. Without it a student
who books sees Cal.com's own confirmation page and stops: **no Stripe customer, no
card on file, no `assessment_booked` conversion, and a scarce slot given away to
someone with no commitment** — the exact no-show the card hold exists to prevent.

*Do not start ad spend on the assessment funnel in this state.*

1. **The real fix, once the team plan is genuinely active.** Set
   `successRedirectUrl` = `https://<host>/coach/book/hold` and
   `forwardParamsSuccessRedirect: true` on event types **6654042**
   (`vocal-assessment-online`) and **6654043** (`vocal-assessment-in-person`).
   That is the whole change; `npm run calcom:bootstrap` does it idempotently via
   PATCH without recreating anything. The `forwardParams` flag is not optional —
   without it the booking uid never reaches `/coach/book/hold` and the redirect is
   useless.
2. **Until then: the webhook + an emailed card-capture link.** `BOOKING_CREATED`
   arrives at `/api/calcom/webhook` and is the authoritative record of the slot,
   so the booking is never lost. Email the student a link to complete the card
   hold. Cal.com's official embed exposes a `bookingSuccessful` callback that
   would also work — **but the current booking UI uses a raw `<iframe>`, which
   cannot receive it**, so as things stand the webhook-plus-email path is the only
   working fallback.

**The direct-purchase funnel is unaffected by all of this.** Stripe Checkout has
its own `success_url`, needs no Cal.com redirect, and works end to end today.
Slot selection happens after payment on `/coach/purchase/confirmed`.

---

## Quick reference

| Command | What it does |
|---|---|
| `npm run stripe:audit` | read-only inventory + catalogue reconciliation |
| `npm run stripe:bootstrap -- --dry-run` | what bootstrap would change |
| `npm run stripe:bootstrap` | create/patch Products, Prices, portal config |
| `npm run stripe:e2e` | full funnel test with test clocks (needs `npm run dev`) |
| `npm run calcom:bootstrap -- --dry-run` | what the Cal.com bootstrap would change |
| `npm run calcom:bootstrap` | create/patch schedules + event types |
| `npm run plan:start -- --dry-run …` | convert a student to a paying plan |
| `npm run conversions:export` | Offline Conversion Import CSV |
| `npm run typecheck` / `npm run build` | must both be clean before deploying |
