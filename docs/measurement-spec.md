# Measurement spec — the coaching funnel

What is measured, what is not, and what a human has to do in GA4 and Google Ads
before a campaign is built on any of it.

Scope: the coaching side (`/coach/**`). The artist-side events (`video_play`,
`video_milestone`, `video_finish`, `epk_view`, `booking_submit`,
`spotify_click`) are outreach instrumentation and are out of scope here except
where they explain a naming rule.

Property: GA4 `G-96QK8PY0XH`. Server-side conversions go through the Measurement
Protocol with `GA_API_SECRET`.

---

## 0. Prerequisites — environment

Verified in this repo's `.env` / `.env.local` at the time of writing. A missing
value here fails **closed and silently**, which is the right posture and also the
reason each one needs checking by hand rather than assumed.

| Variable | State | What is dead without it |
|---|---|---|
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | set (`G-96QK8PY0XH`) | Everything. `GA_ENABLED` fails closed on a malformed value, so a typo disables analytics site-wide with no error |
| `GA_API_SECRET` | set | **All four server-side money conversions.** The client mirror still fires, so the funnel looks alive while the authoritative number is absent |
| `RESEND_API_KEY` | **present but EMPTY** | Every transactional email: assessment confirmations, dunning notices, operator alerts, review requests |
| `GOOGLE_REVIEW_URL` | **absent** | The review-request cron has *two independent reasons* to send nothing. Fixing only the API key will not fix it — check both |
| `NEXT_PUBLIC_CAL_LINK` | check in Vercel | The booking form falls back to an email hand-off, and `slot_reserved` / `booking_step_view` step 3 never fire because there is no scheduler to complete |
| `GA_DEBUG_ENDPOINT` | unset (correct) | Set to `1` only while wiring: swaps to the MP validation endpoint, which returns schema errors and **does not record the event** |
| `GA_DEBUG_MODE` | unset (correct) | Set to `1` only while verifying: puts server-side conversions into DebugView. See the hazard warning in §4.5 |

---

## 1. The funnel, mapped honestly

The funnel this business runs on:

> ad impression → click → `/coach/book` → step 1 submitted → slot booked on
> Cal.com → card held → assessment delivered → plan started → retained past
> month 3

"Before" is the state this pass audited. "Now" is the state after it.

| # | Funnel step | Event | Side | Before | Now |
|---|---|---|---|---|---|
| 0 | Ad impression | — | — | **Invisible to the site, permanently.** | Unchanged. Impressions exist only inside Google Ads; no site event can see one. |
| 1 | Click → landing page | `page_view` + attribution latch (`gclid`/`gbraid`/`wbraid`, UTMs → sessionStorage) | client | Measured | Measured |
| 2 | Arrival on `/coach/book` | `page_view`, plus **`booking_step_view` (step 1)** | client | `page_view` only — which counts bots, prefetches and instant bounces, so it was not a usable denominator | A real "saw the form" denominator |
| 3 | Step 1 submitted (details validated, calendar shown) | **`booking_step_view` (step 2)** | client | **INVISIBLE** | Measured |
| 3b | Step 1 rejected by validation | **`booking_step_blocked`** | client | **INVISIBLE** | Measured, with the offending field key |
| 4 | Slot booked on Cal.com | **`slot_reserved`**, plus **`booking_step_view` (step 3)** | client | **INVISIBLE.** The Cal.com webhook (`app/api/calcom/webhook/route.ts`) sends email and fires no conversion — verified, it contains no `sendServerConversion` call | Measured client-side only |
| 5 | Card held ($0 SetupIntent succeeded) | `assessment_booked` — **the Primary conversion**, $1,150 online / $1,450 in-person | **server** (Stripe webhook), plus a browser mirror on `/coach/book/confirmed` now firing as `assessment_booked_client` | Measured, but **double-counted** — see §2.1 | Measured once |
| 6 | Assessment **delivered** (she actually taught it) | — | — | **UNMEASURABLE.** Nothing in the system knows whether the lesson happened. | **Still unmeasurable.** See §5.1 |
| 7 | Plan started | `plan_started`, valued at the first month | **server** (`customer.subscription.created`), plus a browser mirror on `/coach/purchase/confirmed` now firing as `plan_started_client` | Measured, but **double-counted** — see §2.1 | Measured once |
| 8 | Retained past month 3 | `retained_student`, fired on every `invoice.paid` with `months_retained` | **server** | Measured, but Smart Bidding cannot act on a signal arriving 30–270 days after the click | Unchanged |
| — | Left the flow without advancing | **`booking_abandoned`** | client | **INVISIBLE** | Measured, with step, furthest step reached and seconds on step |

### The direct-purchase side funnel

`/coach/pricing` → `BuyButton` → Stripe Checkout → `/coach/purchase/confirmed`.

| # | Step | Event | Side | Before | Now |
|---|---|---|---|---|---|
| P1 | Rate card viewed | `page_view` | client | Measured | Measured |
| P2 | Checkout Session created, browser being sent to Stripe | **`checkout_started`** | client | **INVISIBLE.** A `checkout.session.completed` with no matching initiation was indistinguishable from nobody clicking | Measured, with `transaction_id` = the Session id |
| P3 | Attempt stopped before a session existed | **`checkout_blocked`** | client | **INVISIBLE**, including the 503 "Purchasing is not switched on yet" branch — i.e. total payment outage was silent | Measured, with `reason` |
| P4 | Checkout completed | `pack_purchased` (one-off) / `plan_started` (plan) | **server**, plus a browser mirror as `pack_purchased_client` / `plan_started_client` | Measured, but **double-counted** — see §2.1 | Measured once |

### The blunt version

Before this pass the instrumentation measured **an arrival and a payment, and it
measured the payment twice** (§2.1). Every step between them was absent, and four
specific consequences followed:

0. Google Ads was importing roughly **double the true conversion volume at double
   the value**, which is worse than under-reporting because it looks like the
   campaign working.

1. A high CPA had exactly one possible diagnosis — "people are not booking" —
   which names no fix. The two candidate causes (the ad promise does not survive
   contact with the form, versus the card step scares people off at the end) have
   opposite remedies.
2. The most likely drop-off point, between arriving on `/coach/book` and finishing
   three steps, was the least observable part of the entire system. All three
   steps live on **one URL** — `BookingForm`'s status machine swaps the rendered
   step without navigating — so a GA4 funnel exploration built on `page_path` is
   structurally incapable of seeing steps 2 and 3. No GA4 configuration recovers
   that; only an event does.
3. A total payment outage (missing Stripe env vars → 503 on every buy click)
   produced no signal anywhere except a sentence shown to the buyer.

---

## 2. The events added

All nine are typed members of the `ConversionEvent` union in `lib/analytics.ts`.
`track()` accepts nothing else, so none of them can be fired as a bare string.

| Event | Fires at | Side |
|---|---|---|
| `booking_step_view` | `components/coach/BookingForm.tsx:357` | client |
| `booking_abandoned` | `components/coach/BookingForm.tsx:373` | client |
| `booking_step_blocked` | `components/coach/BookingForm.tsx:498` | client |
| `slot_reserved` | `components/coach/BookingForm.tsx:773` | client |
| `checkout_started` | `components/coach/Purchase.tsx:509` | client |
| `checkout_blocked` | `components/coach/Purchase.tsx:369, 377, 449, 476, 525` | client |
| `assessment_booked_client` | `components/coach/ConversionMirror.tsx:201` (name resolved by `MIRROR_EVENT`, line 141) | client |
| `pack_purchased_client` | same | client |
| `plan_started_client` | same | client |

### 2.1 The double-count that was live, and the rename that fixes it

**The bug.** `assessment_booked`, `pack_purchased` and `plan_started` each fired
twice — once authoritatively from the Stripe webhook via the Measurement Protocol,
once from the browser mirror on the confirmation page — under the **same event
name**. The mirror was believed safe because both hits carried the same
`transaction_id`, which the code described as the dedupe mechanism.

**The premise was false**, in the expensive direction:

- GA4 deduplicates on `transaction_id` for the **ecommerce `purchase` event**
  specifically. These are custom event names — deliberately so; `pack_purchased`
  is not `purchase` precisely to avoid Google's ecommerce schema — and GA4 does
  not deduplicate custom events at all. Two hits are two key events.
- Google Ads imports a GA4 key event as a **count GA4 has already computed**. The
  doubling therefore happens upstream of anything Ads could collapse. The order-id
  deduplication that genuinely exists belongs to Google Ads' own conversion tag
  and to Offline Conversion Import, not to a GA4-imported key event.
- `claimConversion()` in the webhook is server-side idempotency. It cannot see a
  browser hit.

**What it cost.** Smart Bidding bidding on roughly 2× the true conversion volume
at 2× the value; every GA4 conversion count ~2× reality unless the reader
remembered to count distinct `transaction_id`; and the account appearing to clear
the ~15–30 conversions/30-days bidding threshold (§4.4) while sitting at half of
it.

**The fix.** The mirror fires under its own name, `<event>_client`, mapped in
`MIRROR_EVENT` (`components/coach/ConversionMirror.tsx:141`). The server-side
names, values and `transaction_id` scheme are **untouched** — renaming a live
conversion resets its history in Google Ads. The two confirmation pages were not
edited: they still pass the canonical event they are confirming, and the mapping
to the mirror name lives in one place so a call site cannot accidentally fire a
real conversion from a browser. `ConversionMirror`'s `event` prop is typed to
`MirroredEvent`, and the mirror name to
``Extract<ConversionEvent, `${MirroredEvent}_client`>``, so removing or renaming
either half breaks the build rather than widening silently.

**What the pair is now good for, and it is better than what was lost.** Both sides
keep the same `transaction_id`, so they are joinable, and each mirror also carries
`mirror_of` naming its server-side counterpart. **Server count minus client count
measures this site's own browser-side loss** — ad blockers, Safari ITP, tabs closed
on Stripe's redirect — instead of assuming the industry 20–30% that every comment
in this codebase currently has to guess at. That figure is what says how far to
trust the client-only funnel-step events (§4.7).

> **`*_client` events must never be marked as key events or imported into Google
> Ads.** They are a measurement *of the measurement*. Importing them recreates the
> exact double-count this section exists to describe. Repeated in §4.3 and §4.4
> because it is the instruction most likely to be skipped.

### Why no `booking_step_complete`

Because it would be the same numbers under a second name. A step is only
reachable by finishing the one before it, so `booking_step_view` alone carries
the whole progression:

```
booking_step_view step=1   arrived on the form
booking_step_view step=2   step 1 completed   (details validated)
booking_step_view step=3   step 2 completed   (Cal.com has the slot)
assessment_booked          step 3 completed   (the $0 card hold succeeded)
```

A duplicate event that can drift out of agreement with the first is worse than no
event.

### Why `slot_reserved` exists anyway

GA4's "mark as key event" and Google Ads' conversion import are both scoped to
the event **name**, not to a name plus a parameter filter. Marking
`booking_step_view` as a key event would count arrivals on step 1 as conversions.
So the one intermediate milestone worth importing gets its own name.

### Parameters

Every funnel event carries the three dimensions that decide the economics, from
`funnelParams()` in `lib/analytics.ts:352`:

| Param | Values | Why it is load-bearing |
|---|---|---|
| `mode` | `online` \| `inperson` \| `none` | Online LTV $2,520, in-person $3,240; the assessment is valued at $1,150 vs $1,450. A blended CPA is a wrong number, not a summary. `none` = not chosen yet, a real state on step 1. |
| `lookup_key` | e.g. `online_monthly_60` | The tier. "Which tier does paid traffic actually buy" is unanswerable without it. Empty string on booking events, where no tier has been chosen. |
| `is_minor` | boolean | A guardian pays. Different person to convince, different copy, different decision time. |

Plus, per event:

| Event | Additional params |
|---|---|
| `booking_step_view` | `step` (1–3), `step_name` (`details`/`schedule`/`hold`), `optional_open` |
| `booking_step_blocked` | `step` (always 1), `error_count`, `first_field`, `fields` (comma-joined **keys**), `optional_open` |
| `booking_abandoned` | `step`, `step_name`, `furthest_step`, `seconds_on_step`, `blocked_once`, `optional_open` |
| `slot_reserved` | `booking_uid`, `transaction_id` (= the Cal.com booking uid), `step`=2 |
| `checkout_started` | `purchase_kind` (`plan`/`one_off`), `transaction_id` + `session_id` (= the Checkout Session id), `value`, `currency` |
| `checkout_blocked` | `purchase_kind`, `reason`, `http_status` (server failures only) |

`reason` values: `renewal_consent`, `guardian_email`, `not_configured` (503 —
**Stripe is not configured and every purchase on the site is failing**),
`unknown_tier` (400), `unreachable` (502), `no_url`, `network`.

Also new: `track()` now stamps `delivery: 'client'` by default
(`lib/analytics.ts:570`). `lib/ga-server.ts` already stamped `delivery: 'server'`,
so previously one side of that comparison was populated and the other reported
"(not set)" — which is also what a broken parameter looks like.

### No PII, and the one exception

Nothing on this path sends an email, a name, guardian details, an exact age or
the free-text goals field. `is_minor` is a boolean, never the age.
`booking_step_blocked` sends field **keys** (`guardianEmail`) and never the value
typed into them, and deliberately not the validation message either — that is
copy somebody will one day interpolate a value into.

The single sanctioned exception is the SHA-256 email hash in `user_data` for
Enhanced Conversions, which happens server-side only, in
`hashEmail`/`userData` (`lib/ga-server.ts`), and never through `track()`.

### Double-firing: why none of these can

- `slot_reserved` has no server-side twin — the Cal.com webhook fires no
  conversion. It shares the Cal.com booking uid with `assessment_booked` as
  `transaction_id`, but that is a **join key for explorations and nothing more**.
  It is not a dedupe key, because nothing here deduplicates on it: see §2.1 and the
  invariant in §7. Two separate event names are two separate conversion actions
  regardless.
- `checkout_started` shares the Checkout Session id with `pack_purchased` for the
  same reason.
- `plan_started` still fires from the webhook only, and the browser copy on
  `/coach/purchase/confirmed` now fires as `plan_started_client` (§2.1). No second
  mirror was added.
- To make the shared-identifier trap unrepeatable, `ConversionMirror`'s `event`
  prop is now narrowed to `MirroredEvent`
  (`components/coach/ConversionMirror.tsx:92`) — only `assessment_booked`,
  `pack_purchased` and `plan_started` can be mirrored. Passing
  `event="slot_reserved"` is now a compile error rather than a silent
  step-ratio-above-100% bug.

### Other fixes to existing behaviour

1. **The double-count.** See §2.1 — the largest of these by a wide margin.
2. **Empty `transaction_id` is now stripped rather than sent**
   (`lib/ga-server.ts`, in `sendServerConversion`). The assessment branch sends
   `transaction_id: bookingUid ?? ''`. Being precise about why, since imprecision
   about exactly this is what caused §2.1: `''` is **not** collapsing conversions
   in Google Ads today, because a GA4-imported key event is not deduplicated on
   `transaction_id`. It is stripped because (a) Google Ads' own conversion tag and
   **Offline Conversion Import do** dedupe on order id, and that is where this
   funnel is heading once ~30 students exist, at which point every conversion
   carrying `''` collapses into one; (b) it breaks the
   `slot_reserved`→`assessment_booked` and `checkout_started`→`pack_purchased`
   joins, since rows keyed on `''` match each other; and (c) an absent parameter
   reads as "identity not established", which is the truth. The scheme, the names
   and the values are untouched.
3. **`is_minor` seam on server conversions** (`lib/ga-server.ts`, on
   `ServerConversion`). Now accepts `minor?: boolean | null` and emits `is_minor`
   when given. Nothing populates it yet — see §6.
4. **`GA_DEBUG_MODE` opt-in** (`lib/ga-server.ts`). Server-side conversions could
   not appear in DebugView at all before this. See §4.5 — including the hazard
   warning about leaving it on.

---

## 3. Naming: how collisions were checked

`lib/analytics.ts` already records a real incident: `video_start`,
`video_progress` and `video_complete` had to be renamed because GA4's Enhanced
Measurement collects those names automatically for YouTube iframes with
`enablejsapi=1`. When names collide, GA4 merges our event into its own, keeps its
own parameter schema, drops ours, and the breakdown reads "(not set)" — which
looks like a tracking bug rather than a name collision.

The nine new names — the six funnel events plus the three `*_client` mirrors —
were checked against four lists, from knowledge of the GA4 schema rather than from
a live fetch (this session had no web-search budget):

1. **Reserved event names** — GA4 rejects these outright: `ad_activeview`,
   `ad_click`, `ad_exposure`, `ad_impression`, `ad_query`, `ad_reward`,
   `adunit_exposure`, `app_clear_data`, `app_exception`, `app_install`,
   `app_remove`, `app_store_refund`, `app_store_subscription_*`, `app_upgrade`,
   `dynamic_link_*`, `error`, `firebase_campaign`, `first_open`, `first_visit`,
   `in_app_purchase`, `notification_*`, `os_update`, `screen_view`,
   `session_start`, `user_engagement`. **No match.**
2. **Automatically collected / Enhanced Measurement names** — `page_view`,
   `scroll`, `click`, `view_search_results`, `file_download`, `video_start`,
   `video_progress`, `video_complete`, **`form_start`**, **`form_submit`**.
   **No match — and the last two were the live hazard.** Enhanced Measurement's
   "Form interactions" collects `form_start` and `form_submit` automatically for
   any real `<form>`, which `BookingForm` is. GA4 is already firing both on this
   form today with `form_id`/`form_name` and nothing else: no step, no mode, no
   minor flag, and one `form_submit` for a form with three steps. Useless here,
   and fatal to collide with. That is why the events are `booking_step_*`.
3. **Recommended events with an expected schema** — `purchase`,
   `begin_checkout`, `add_to_cart`, `view_item`, `select_item`,
   `generate_lead`, `add_payment_info`. **No match, deliberately.**
   `checkout_started` is not `begin_checkout` for exactly the reason
   `pack_purchased` is not `purchase`: match Google's names only when matching
   their `items[]`/`value`/`currency` schema, or the Monetisation reports render
   half-populated and look broken.
4. **Reserved prefixes** — `_`, `firebase_`, `ga_`, `google_`, `gtag.`. None of
   the nine uses one.

The `*_client` mirrors are additionally safe by construction: each is an existing
custom name that was already collision-checked plus a `_client` suffix, and GA4
reserves no name ending in `_client`. There is also no GA4 event-name length
problem — the limit is 40 characters and the longest of the nine,
`assessment_booked_client`, is 24.

> **Verify before launch.** Google adds automatically-collected events over time
> — `form_start`/`form_submit` themselves were added in 2023 — so re-check the
> nine names against the current "Reserved and automatically collected event
> names" pages in Google's docs. This could not be verified against the live docs
> in this session. The check takes two minutes and the failure mode is silent.

---

## 4. What a human must do in GA4 and Google Ads

None of this can be done from code. Until it is done, GA4 will accept every
parameter below and refuse to report on any of them.

> **Naming caveat, flag for verification:** GA4 renamed "Conversions" to
> **"Key events"** in 2024, while Google Ads still calls them **"conversion
> actions"** with **"Primary"/"Secondary"** goals. Menu labels drift; the
> instructions below describe the destination, and the exact wording should be
> confirmed against the live UI.

### 4.1 LAUNCH BLOCKER — exclude the payment referrals

`Admin → Data Streams → the web stream → Configure tag settings → List unwanted
referrals`, and add:

```
checkout.stripe.com
billing.stripe.com
cal.com
app.cal.com
```

**Why this is first.** The funnel leaves this origin twice and comes back:
`/coach/book` → cal.com iframe → `/coach/book/hold` → `checkout.stripe.com` →
`/coach/book/confirmed`. On return the referrer is `checkout.stripe.com`, GA4
treats a mid-visit source change as a **new session**, and the confirmation page
plus its conversion mirror are attributed to "checkout.stripe.com / referral"
instead of to the ad click that paid for the visit. The paid campaign then shows
the click and none of the conversion.

Nothing in the codebase detects this. The symptom is a healthy conversion count
sitting under the wrong source, which reads as "organic is doing well" rather
than as a bug. Recorded in the header of `components/SiteAnalytics.tsx` too,
because that is the file somebody opens when attribution looks wrong.

### 4.2 Register the custom dimensions

`Admin → Custom definitions → Custom dimensions → Create custom dimension`. All
are **event-scoped**; the "Event parameter" must match the name exactly.
Standard properties allow 50 event-scoped dimensions and 50 custom metrics, so
this list fits with room to spare.

**Required — the funnel cannot be read without these:**

| Dimension name | Event parameter | Answers |
|---|---|---|
| Lesson mode | `mode` | Online vs in-person CPA, the $1,150/$1,450 split |
| Tier | `lookup_key` | Which tier paid traffic buys |
| Is minor | `is_minor` | Guardian-paid vs adult-paid economics |
| Booking step | `step` | Funnel exploration steps |
| Booking step name | `step_name` | Readable version of the above |
| Blocking field | `first_field` | *The* field that costs money |
| Block reason | `reason` | Why checkout stopped, incl. total outage |
| Purchase kind | `purchase_kind` | Plan vs one-off |
| Delivery | `delivery` | Server fire vs browser mirror |
| Mirror of | `mirror_of` | Pairs a `*_client` hit to its server-side conversion without hardcoding the naming convention |
| Transaction ID | `transaction_id` | Joining `slot_reserved`→`assessment_booked`, `checkout_started`→`pack_purchased`, and each `*_client` mirror to its server twin |

**Worth having:**

| Dimension name | Event parameter |
|---|---|
| Furthest step | `furthest_step` |
| Blocked once | `blocked_once` |
| Optional group opened | `optional_open` |
| Fields blocked | `fields` |
| Has gclid | `has_gclid` |
| Past breakeven | `past_breakeven` |
| Venue | `venue` |

**Custom metrics** (`Custom definitions → Custom metrics`, unit "Standard"):

| Metric name | Event parameter | Why a metric |
|---|---|---|
| Seconds on step | `seconds_on_step` | An average is meaningful |
| Validation errors | `error_count` | Sum/average is meaningful |
| Months retained | `months_retained` | Already sent by `retained_student` |

Two warnings:

- **`campaign`.** Both `track()` and `sendServerConversion` send a *parameter*
  called `campaign`, which is conceptually adjacent to GA4's own built-in
  "Session campaign" dimension and is not the same thing. If you register it,
  name the dimension something unmistakable ("Latched campaign") so nobody reads
  one for the other.
- Registration is **not retroactive**. GA4 reports on a custom dimension only
  from the moment it is created. Register everything before the campaign starts,
  not after the first confusing report.

### 4.3 Mark key events in GA4

`Admin → Events → Key events` (or the "Mark as key event" toggle on the event
row).

| Event | Key event? | Why |
|---|---|---|
| `assessment_booked` | **Yes** | The Primary conversion |
| `pack_purchased` | **Yes** | Revenue |
| `plan_started` | **Yes** | Revenue |
| `retained_student` | **Yes** | The metric the business is actually judged on |
| `slot_reserved` | **Yes** | The one importable mid-funnel milestone |
| `booking_step_view` | No | Name-scoped marking would count step-1 arrivals as conversions |
| `booking_step_blocked` | No | A failure |
| `booking_abandoned` | No | A failure |
| `checkout_started` | **No — see the warning below** | Diagnostic |
| `checkout_blocked` | No | A failure |
| `assessment_booked_client` | **NO** | Browser mirror — see the box below |
| `pack_purchased_client` | **NO** | Browser mirror |
| `plan_started_client` | **NO** | Browser mirror |

> ## ⚠ The three `*_client` events are not conversions.
>
> `assessment_booked_client`, `pack_purchased_client` and `plan_started_client` are
> **browser mirrors of conversions that have already been counted server-side**.
> Every one of them describes the same booking or sale as its server-side twin,
> with the same `transaction_id`.
>
> **Do not mark them as key events. Do not import them into Google Ads.** Doing
> either recreates the live double-count described in §2.1: Google Ads would bid on
> roughly twice the true conversion volume at twice the value, and it would look
> like the campaign succeeding.
>
> They exist for one purpose: **server count minus client count is this site's own
> browser-side conversion loss.** Read them in a GA4 exploration, never in a bidding
> strategy.
>
> Only these four names may ever be marked as key events and imported:
> `assessment_booked`, `pack_purchased`, `plan_started`, `retained_student` — plus
> `slot_reserved` as a Secondary. Nothing ending in `_client`.

### 4.4 Import into Google Ads

`Google Ads → Goals → Conversions → Summary → New conversion action → Import →
Google Analytics 4 properties → Web`.

| Event | Import? | Goal |
|---|---|---|
| `assessment_booked` | **Yes** | **PRIMARY.** The only one Smart Bidding optimises toward. Value $1,150 online / $1,450 in-person, derived as LTV × 45% (`lib/pricing.ts`) |
| `slot_reserved` | **Yes** | **Secondary** (observation only) |
| `pack_purchased` | Yes | Secondary |
| `plan_started` | Yes | Secondary |
| `retained_student` | Yes | Secondary — bidding cannot act on a signal arriving 30–270 days after the click |
| `checkout_started` | **NO** | See below |
| `assessment_booked_client` | **NO** | See below |
| `pack_purchased_client` | **NO** | See below |
| `plan_started_client` | **NO** | See below |
| everything else | No | — |

> ### ⚠ Three things must not be imported, and each would double-count money.
>
> **1. Nothing ending in `_client`.** These are browser mirrors of conversions
> already counted server-side — the same booking or sale, the same
> `transaction_id`. Importing them is exactly the live bug §2.1 removed: ~2× the
> conversion volume at ~2× the value, looking like success. They are a measurement
> of the measurement; keep them in explorations only.
>
> **2. `checkout_started`.** It carries `value` so abandoned checkout can be
> counted in dollars. Imported alongside `pack_purchased` it counts the same money
> twice — once when the session opens, again when it is paid — and Smart Bidding
> bids against revenue nobody collected.
>
> **3. `booking_step_view`.** No value, but importing it would make every form
> arrival a conversion.
>
> The complete import list is five names: `assessment_booked` (Primary),
> `slot_reserved`, `pack_purchased`, `plan_started`, `retained_student`. If a sixth
> conversion action appears in the account, something has gone wrong.

**When to promote `slot_reserved` to Primary.** Only if `assessment_booked`
volume stays too low for Smart Bidding to learn — Google's own guidance is
roughly 15–30 conversions per 30 days per campaign (confirm the current figure;
it moves). `slot_reserved` is strictly higher volume, arrives within a minute of
the click, and still represents a real commitment: half an hour on a real
calendar. It is a *proxy*, and the cost of using it is that card-step
abandonment stops being penalised by the bidder. Revert to `assessment_booked`
as Primary as soon as the volume supports it. Do not run both as Primary.

**Also confirm, in Google Ads:** auto-tagging is ON (`Settings → Account
settings → Auto-tagging`) and the Google Ads ↔ GA4 link exists
(`Admin → Product links → Google Ads links`). Without auto-tagging there is no
`gclid`, and without a `gclid` the entire latch chain in `lib/analytics.ts` and
`scripts/offline-conversions.ts` has nothing to carry.

### 4.5 Verify every event — DebugView for the browser, Realtime for the server

`Admin → DebugView`. DebugView only shows sessions in debug mode. Since the GA4
loader does not set `debug_mode` (and preview deployments suppress GA entirely
via `SITE_NOINDEX`), the route is the **Google Analytics Debugger** Chrome
extension on the live site, with the extension on.

| Event | How to make it fire | Pass criteria |
|---|---|---|
| `booking_step_view` step 1 | Load `/coach/book` | `step=1`, `step_name=details`, `mode=none`, `is_minor=false`, `delivery=client`, plus the latched UTMs |
| `booking_step_blocked` | Submit step 1 empty | `error_count=3`, `first_field=mode`, `fields=mode,name,email` |
| `booking_step_blocked` (minor path) | Tick "under 18", submit with name/email filled | `first_field=guardianName`, `is_minor=true` |
| `booking_step_view` step 2 | Fill name + email, pick a mode, submit | `step=2`, `step_name=schedule`, `mode=online`\|`inperson`. **One event, not two** — a second means the view guard broke |
| `booking_abandoned` | Reach step 2, then close the tab | `step=2`, `furthest_step=2`, `seconds_on_step` > 0, `blocked_once` reflecting whether validation refused you |
| `slot_reserved` | Pick a real slot in the Cal.com embed | `transaction_id` = the Cal.com uid and **identical** to the `booking_uid` on the `assessment_booked` that follows |
| `booking_step_view` step 3 | Same action | `step=3`, `step_name=hold`, immediately after `slot_reserved` |
| `assessment_booked_client` | Complete the $0 card hold | **One** hit, named `assessment_booked_client`, `delivery=client`, `mirror_of=assessment_booked`. If you see a hit named plain `assessment_booked` **from the browser**, the mirror rename has regressed and the ad account is double-counting again |
| `assessment_booked` | Same action | Fired from the webhook, so **not visible in DebugView by default** — see below. Value 1150 or 1450, `currency=USD`, `delivery=server`, `transaction_id` identical to the `_client` hit |
| `checkout_started` | Click a buy button on `/coach/pricing` | `transaction_id` starts `cs_`, `value` matches the tier, `lookup_key` and `purchase_kind` correct |
| `checkout_blocked` | Click a plan's buy button without ticking the renewal box | `reason=renewal_consent`, `purchase_kind=plan` |
| `pack_purchased` | Pay with a real card | `transaction_id` **identical** to the `checkout_started` before it |

#### Server-side events: DebugView is not the gate

**The four server-side money conversions do not appear in DebugView by default,
and never have.** DebugView only shows hits flagged as debug traffic; for the
browser that flag comes from the Debugger extension, and for the Measurement
Protocol nothing sets it implicitly. Anyone who "verified the pipeline in
DebugView" before this was verifying the browser mirror and inferring something
about the server fire — or watching an empty report and concluding the pipeline
was broken.

There are three distinct checks. Use the right one:

| Check | How | What it proves |
|---|---|---|
| **Schema** | `GA_DEBUG_ENDPOINT=1` | Swaps to the MP validation endpoint, which returns a `validationMessages` array instead of a blanket `204`. **Validates without recording** — it catches a misspelled parameter or a `value` with no `currency`. Not a delivery check |
| **Delivery (the gate)** | **GA4 Realtime**, then the standard reports 24–48h later | That the event actually landed with its value and a real `client_id`. **This is the acceptance gate for server-side events**, not DebugView |
| **DebugView** | `GA_DEBUG_MODE=1`, temporarily | Puts server hits into DebugView so params can be inspected one by one |

> ### ⚠ `GA_DEBUG_MODE=1` — set it, verify, unset it.
>
> Two reasons. The certain one: DebugView is a rolling near-real-time view, useful
> only while somebody is watching it.
>
> The **unverified hazard**: GA4 treats debug traffic differently from ordinary
> traffic, and this session could not confirm against Google's current docs whether
> `debug_mode` hits are **excluded from standard reports**. If they are, leaving
> this set in production would silently drop every money conversion out of
> reporting — the worst available failure for this pipeline. Confirm that against
> Google's live documentation before using it on production, and never leave it set.

Also worth knowing: **preview deployments suppress GA4 entirely** via the
`SITE_NOINDEX` flag (`components/SiteAnalytics.tsx`), which is deliberate — a
preview serves a byte-for-byte copy of the site and would otherwise pollute the
real property. So client-side verification happens on production with the
extension, not on a preview.

### 4.6 Build the funnel exploration

`Explore → Funnel exploration`, open funnel, steps:

1. `booking_step_view` where `step` = 1
2. `booking_step_view` where `step` = 2
3. `slot_reserved`
4. `assessment_booked`
5. `plan_started`

Breakdown: `mode`. Then `is_minor`, then `first_field` on a separate
`booking_step_blocked`-only exploration.

Funnel explorations are **user-scoped**, which is what makes
`checkout_started` → `pack_purchased`/`plan_started` joinable at all for plans:
both events carry the same GA4 `client_id`, because the browser's `client_id` is
stashed on the Stripe Customer and read back by the webhook. For one-off packs
the `transaction_id` also gives an exact per-transaction join. For plans it does
not — `plan_started` uses the Subscription id, because it also fires for plans
created with no Checkout Session at all (`scripts/start-plan.ts`) — so per-buyer
plan-checkout abandonment is a user-scoped funnel figure, not a transaction join.

### 4.7 Measure the browser-side loss, then read the step ratios correctly

The six funnel events are client-side and have no server-side twin, because the
browser is the only thing that knows a step was viewed. So they are systematically
short of reality, and the loss is not random — it correlates with the audiences
that cost the most to reach, which means the bias runs in the direction that costs
money.

**First, measure the loss rather than assuming it.** Build a free-form
exploration:

- Rows: `Event name`, filtered to `assessment_booked` and
  `assessment_booked_client` (repeat for the pack and plan pairs).
- Metric: `Event count`, over a window long enough to contain a useful number of
  conversions.
- `1 − (client count ÷ server count)` **is this site's browser-side conversion
  loss.** Every "20–30%" in this codebase's comments is an industry estimate
  standing in for this number until it exists.

Cross-check it against `transaction_id`: a server hit with no matching `_client`
hit is a specific lost browser fire, and if a `_client` hit has no server twin the
webhook is the thing to investigate, not the browser.

**Then apply it.** Use the step events as **ratios between steps, never as
absolute counts beside `assessment_booked`.** The step-3-to-booked ratio will read
above 100% for this reason alone, and that is not a bug — it is the loss above,
showing up where you would expect it.

---

## 5. What still cannot be measured

### 5.1 Assessment delivered vs merely booked — i.e. show rate

**Nothing in the system knows whether Juliana actually taught the lesson.**
`assessment_booked` proves a slot exists and a card was held; it says nothing
about attendance. So:

- Show rate is **unmeasurable today**.
- The `ASSESSMENT_TO_PLAN_RATE = 0.45` that `ASSESSMENT_VALUE_USD` is derived
  from is an assumption about *delivered* assessments being applied to *booked*
  ones. If a fifth of bookings no-show, the Primary conversion is overvalued by
  roughly that fraction and Smart Bidding overpays accordingly. This is the most
  consequential unmeasured quantity in the account.

What it would take, in order:

1. **Operator discipline.** Cal.com supports marking an attendee as a no-show.
   Nobody can compute a show rate that nobody records. This is the hard part and
   it is not a technical problem.
2. **A webhook subscription** in `app/api/calcom/webhook/route.ts` for the
   booking-status events (no-show / cancelled / rescheduled), or a scheduled poll
   of bookings past their end time. That file currently sends email and fires no
   conversion at all.
3. **A new event**, `assessment_delivered`, added to the `ConversionEvent` union
   and fired server-side with `transaction_id` = the Cal.com booking uid so it
   joins to `assessment_booked`. Note the Measurement Protocol's **72-hour
   backdating limit**: a lesson marked up a week later cannot be sent as a
   timestamped GA4 event and has to go through Offline Conversion Import instead.
4. Then, and only then, `ASSESSMENT_VALUE_USD` can be re-derived from
   delivered-to-plan rather than booked-to-plan.

Deliberately not built here: an event fired on a schedule guess ("the lesson time
has passed, so it happened") would be a fabricated conversion, and it would be
fabricated at $1,150.

### 5.2 True LTV fed back to the auction

`scripts/offline-conversions.ts` exists and works, and has nothing useful to
upload. Google Ads Offline Conversion Import needs enough volume for the uploaded
values to change bidding — practically **30+ students with 90+ days of history**.
Until then, `ASSESSMENT_VALUE_USD` remains a modelled estimate.

Also: import is keyed **solely on the click id**, with no email fallback, and a
`gclid` cannot be reconstructed after the fact. Every visitor whose `gclid` was
not latched is permanently excluded — which is why `lib/analytics.ts` latches
`gclid`/`gbraid`/`wbraid` alongside the UTMs and `BookingForm` re-reads them off
the URL as a belt-and-braces second path.

### 5.3 EEA / UK / Switzerland

Consent Mode v2 defaults deny everything in those regions and there is no cookie
banner. No `_ga` cookie, no `gclid` storage, no Enhanced Conversions matching.
Those conversions exist only as Google's behavioural modelling, and the
funnel-step events do not fire there at all. Structural, and the correct posture
for a business with no banner. Fixing it means a real consent banner calling
`gtag('consent','update',…)`; nothing in the code needs to change for that.

### 5.4 Cross-device

A parent who browses on a phone and pays on a laptop breaks the `client_id` join.
Enhanced Conversions' hashed email partly recovers this **inside Google Ads** and
never inside GA4. Fixing it in GA4 needs User-ID, which needs accounts and a
login — neither exists, and neither should be built for measurement's sake.

### 5.5 Inside the Cal.com iframe

Which slots were offered, which were looked at, whether the visitor scrolled to
next week, whether the timezone confused them. Cross-origin and unreachable from
our JavaScript. The measurable proxy is the gap between
`booking_step_view step=2` and `slot_reserved`, which tells you *how many* died
in the calendar without telling you why. Cal.com's own analytics is the only
route to the why.

### 5.6 Keyword-level attribution

GA4 will not report the search term that produced a booking. That lives in Google
Ads, joined by `gclid` and the account link (§4.4). Do not attempt to reproduce
it in GA4.

### 5.7 `is_minor` on the four money events

The seam exists (`lib/ga-server.ts:188`) and nothing fills it yet — see §6. Until
that line lands, "do guardian-paid bookings convert to plans at a different
rate?" is answerable for the funnel steps and not for the conversions.

---

## 6. Follow-ups in files this pass did not own

Both are small and both are in `app/api/**`, which was out of scope here.

**1. Populate `is_minor` on server-side conversions.** Every call site already
has the `Student` in hand, and the record carries `guardianEmail`
(`lib/students.ts:147`). Add one line beside the existing `email:` on each
`sendServerConversion` call in `app/api/stripe/webhook/route.ts`:

```ts
minor: Boolean(student?.guardianEmail),
```

Four call sites: `assessment_booked` (~line 282), `pack_purchased` (~349),
`plan_started` (~428), `retained_student` (~618). `lib/ga-server.ts` already
accepts the field and emits the parameter; registering the "Is minor" custom
dimension (§4.2) covers both sides at once.

**2. Watch the empty-`transaction_id` warning.** `lib/ga-server.ts` now logs
loudly when a conversion arrives with `transaction_id: ''`. A rising count means
booking or session metadata is going missing on the Stripe object upstream —
chase that, not the log line.

---

## 7. Invariants — do not break these

- **Never rename `assessment_booked`, `pack_purchased`, `plan_started` or
  `retained_student`.** Renaming a live conversion resets its history in Google
  Ads and Smart Bidding starts from zero.
- **Never mark or import anything ending in `_client`,** and never make the browser
  mirror fire a canonical conversion name again. That was a live double-count: ~2×
  volume at ~2× value, looking like success. §2.1.
- **Never assume `transaction_id` deduplicates a custom event.** It does not, in
  GA4 or in a GA4-imported Google Ads conversion action. It deduplicates the GA4
  ecommerce `purchase` event, Google Ads' own conversion tag, and Offline
  Conversion Import. Here it is a **join key**, and that is all.
- **Never change their `transaction_id` scheme.** Cal.com booking uid for
  `assessment_booked`, Checkout Session id for `pack_purchased`, Subscription id
  for `plan_started`. Diverge from the client mirror on either side and every
  conversion counts twice — at $1,150 each for the Primary one.
- **Never change `ASSESSMENT_VALUE_USD` without reading its comment** in
  `lib/pricing.ts`. Sending $0 or the first month's $280 are both expensive
  mistakes, in opposite directions.
- **Never re-deny `ad_user_data`.** Enhanced Conversions silently stops matching
  and the endpoint keeps answering 204. See `components/SiteAnalytics.tsx`.
- **Never fire a new event as a bare string.** Add it to the `ConversionEvent`
  union first; `track()` will not accept anything else.
- **Never send PII.** No email, name, guardian details, exact age or free-text
  goals. The hashed email in `user_data` is the one exception and it is
  server-side only.
