# Marketing and SEO plan

**Status of the business as this is written:** live at `www.juliana-beltran.com`, 30 indexable
URLs, real Stripe payments working, one real booking completed end to end with a $0 card hold.
GA4 is installed (`G-96QK8PY0XH`) and `GA_API_SECRET` is set in Vercel. Google Ads does not
exist. Google Business Profile does not exist. **No GA4 event has ever been confirmed to arrive.**

This document does not restate what already exists. The import-ready campaign artifacts live in
`marketing/` and are referenced, not duplicated. `docs/seo-audit.md` (another agent) audits the
existing pages; this plan does not. Analytics instrumentation is owned by a third agent; where
this plan needs a code change it is filed as a **request** with an owner, not made here.

**The binding constraint is proof, not traffic.** Zero attributable student outcomes exist.
`content/coach.json` holds five genuine five-star reviews — Quortnee, Luis, Rajaat, Jessica,
Andrey — and every one of them describes warmth, patience and knowledge. Not one says what
changed for anyone. There is no student audio. That is the ceiling on every conversion rate
below, and no amount of budget moves it.

### Owner key

| Code | Who |
|---|---|
| **J** | Juliana — only she can do it (identity, consent, her voice, her billing details) |
| **O** | Operator — whoever runs the account and the repo |
| **A** | Analytics agent — owns `lib/analytics.ts`, `lib/ga-server.ts`, `components/**` |
| **S** | SEO agent — owns `docs/seo-audit.md` and page-level fixes |

### What in `marketing/` is now stale, and must not be trusted

Three statements in the existing artifacts were true when written and are not true now. Anyone
following those files literally will redo finished work or block on a cleared blocker.

| Where | Says | Reality |
|---|---|---|
| `launch-checklist.md` gate 0.9 | Consent Mode denies `ad_storage` / `ad_user_data`; launch blocker | **Fixed.** `components/SiteAnalytics.tsx` now denies only for EEA/UK/CH region-scoped and grants elsewhere, with `ads_data_redaction` and `url_passthrough` set. Gate 0.9 is closed. |
| `launch-checklist.md` gate 0.10 | Five landing pages "do not exist yet" | **All five exist** and are in `app/sitemap.ts`: `/vocal-coach-los-angeles`, `/online-singing-lessons`, `/online-songwriting-lessons`, `/coach/pricing`, `/coach/book`. Still verify each returns 200 on the `www` host. |
| `marketing/README.md` §6.7 | "There is no `app/api/` directory and `vercel.json` contains only redirects and headers" | **Stale.** `app/api/cron/review-requests/route.ts` exists and `vercel.json` has the `crons` entry at `0 17 * * *`. The cron runs daily. It just sends nothing — see Gate G. |

### One real defect found while grounding this plan

`marketing/gbp-setup.md` §6 lists **"Voice lesson, 60 min (in person) — $105"**. The rate card
says `inperson_single_60 = 11000` cents, i.e. **$110** (`content/pricing.json`). The GBP services
table also omits `inperson_monthly_30` ($210/mo) and `inperson_pack_10` ($900). Fix before the
profile is published — a price on GBP that disagrees with the pricing page is the cheapest
possible way to lose a booking. **Owner: O.** (I do not own `marketing/`, so this is flagged, not
fixed.)

---

## 1. The launch gate sequence

Ordered. Each gate lists what must be true, who does it, and what breaks if it is skipped.
**Gate A is the hard gate on all spend.** Gate G runs in parallel from day zero and costs nothing.

### Gate A — GA4 is proven to receive a conversion. Blocks every dollar.

The Measurement Protocol endpoint returns **204 for a wrong API secret, a misspelled parameter,
and a `value` with no `currency`** — `lib/ga-server.ts` documents this at line 40. Every failure
mode of this system is silent and returns success. So "the webhook ran and logged no error" is
not evidence of anything.

| # | Check | Owner | If skipped |
|---|---|---|---|
| A.1 | `npm run stripe:e2e` against test-mode Stripe with a **dev server running and `GA_API_SECRET` in `.env.local` pointing at the same GA4 property**. This walks a real Test Clock through SetupIntent → plan → invoice and posts real signed webhooks. It is strictly better evidence than `stripe trigger`, which creates synthetic objects with no customer and no metadata and will take early-return branches. | O | You verify a code path no student ever takes |
| A.2 | Set `GA_DEBUG_ENDPOINT=1` and read the `validationMessages` array printed by `lib/ga-server.ts:195`. This is the only mechanism that reports a malformed payload at all. | O | A misspelled param never appears in a report and nothing tells you |
| A.3 | Confirm the event in **GA4 Realtime** (30-minute window). `engagement_time_msec: 1` is already set, which is what makes a Measurement Protocol hit visible in Realtime rather than accepted-and-invisible. | O | See A.4 |
| A.4 | Then confirm in **standard reports after 24–48h**, per event: correct `value`, `currency: USD`, and a **real `client_id`**. `0.0` is `UNATTRIBUTED_CLIENT_ID` (`lib/ga-server.ts:66`) — if that bucket is non-empty, the booking form stopped reading the `_ga` cookie and Google Ads will never connect the conversion to a click. | O | You spend a month buying clicks the ad account cannot credit |
| A.5 | Confirm `utm_source` / `utm_medium` / `utm_campaign` and `gclid` ride through. The chain is long and every link is a different process: latch (`lib/analytics.ts`) → hidden field (`BookingForm`) → Cal.com metadata → Stripe Customer (`lib/students.ts`). Test it end to end with a `?gclid=test123` on a landing page, not on `/coach/book`. | O | Offline Conversion Import has nothing to upload, forever. A gclid cannot be recovered after the fact |

**⚠️ DebugView is probably unreachable for the server-side fire as coded — verify this.**
`launch-checklist.md` gate 0.1 asks for all four conversions confirmed in GA4 DebugView.
`lib/ga-server.ts` does **not** set a `debug_mode` parameter on the Measurement Protocol payload,
and my understanding is that DebugView only shows hits that carry `debug_mode`. If that is right,
gate 0.1 as written cannot pass no matter how correctly everything works, and someone will spend
a day concluding the pipeline is broken when it isn't. **NEEDS A LIVE CHECK** against current GA4
Measurement Protocol docs: whether `debug_mode` enables DebugView for MP hits, and whether it
belongs in the event `params` or at the payload top level. If it does: request to **A** to add it
behind the existing `GA_DEBUG_ENDPOINT` flag. Until then, **Realtime (A.3) is the gate, not
DebugView**. The *client* mirror (`components/coach/ConversionMirror.tsx`) fires through `gtag`
and will show in DebugView with the Chrome GA Debugger extension — do not mistake that for proof
the server fire works. They are separate pipelines and only the server one is authoritative.

**Why this gate is absolute.** Maximize Conversions with no conversion signal does not pause
itself. It degrades to buying whatever clicks are cheapest and spends the full daily budget doing
it. The month of data it accumulates is not a head start — it is noise the strategy then has to
unlearn, so skipping Gate A costs the first month's budget *twice*.

### Gate B — GA4 custom definitions registered. Do this before Gate A's data matters.

**GA4 will not show a custom event parameter in any report until it is registered as a custom
dimension, and registration is not retroactive.** Data collected before the dimension exists is
not backfilled. This is the single most commonly missed step in a GA4 setup and it is
unrecoverable — every day of spend before it is a day whose events cannot be broken down by mode,
campaign or venue.

Register in **Admin → Custom definitions → Create custom dimension**, all event-scoped:

| Parameter | Why it earns a slot |
|---|---|
| `mode` | `online` / `inperson`. The whole economics differ ($1,150 vs $1,450 value, $2,520 vs $3,240 LTV) |
| `delivery` | `server` / `client`. **The most useful diagnostic in the property** — see §4 |
| `transaction_id` | Required to count conversions correctly in GA4. See the double-count warning in §4 |
| `campaign` | Denormalised in both `track()` and `sendServerConversion` so client and server group identically |
| `venue` | `utm_content`, denormalised. Artist-side outreach attribution |
| `months_retained` | On `retained_student`. The only path to a month-3 retention number |
| `past_breakeven` | On `retained_student`. Boolean, `months_retained >= 2` |
| `lookup_key` | Which plan or pack. Distinguishes $170 from $360 |
| `from_outreach` | Separates email outreach from paid |
| `step`, `step_name` | On `booking_step_view`. Without these the three-step funnel is one undifferentiated event |
| `first_field`, `fields` | On `booking_step_blocked`. Turns "people drop off on step 1" into "people drop off on the guardian email field" — two findings with different fixes, and the first is unactionable |
| `reason` | On `checkout_blocked`. `not_configured` means Stripe credentials are missing on a live deployment and every purchase is silently failing |

**Owner: O.** *If skipped:* every report shows `(not set)` for the dimension you most need, and
the fix does not recover the history. GA4 caps event-scoped custom dimensions (50 on the standard
tier — **verify the current limit**), and the list above is comfortably inside it, but do not
register parameters not on it just because they exist.

The canonical parameter list will be `docs/measurement-spec.md`, owned by **A** and not yet
written at the time of this document. If it disagrees with the table above, it wins.

### Gate C — Google Ads account, conversion actions, values.

| # | Check | Owner |
|---|---|---|
| C.1 | Account created with **her** billing details. **J** must supply these; nobody else can. | J |
| C.2 | **Auto-tagging ON** (`Settings → Account settings → Auto-tagging`). Without `gclid` there is no click-to-conversion join at all, and `lib/analytics.ts:264` notes autotagging adds `gclid` and *nothing else* — no `utm_*` — which is exactly why `CLICK_ID_KEYS` is in the latched set. | O |
| C.3 | GA4 property linked to Google Ads. All four events marked as **key events** in GA4, then imported as conversion actions in Ads. | O |
| C.4 | `assessment_booked` → **Primary**. `plan_started`, `pack_purchased`, `retained_student`, `slot_reserved` → **Secondary**. | O |
| C.4b | **Do not import `checkout_started`.** It carries the session's dollar `value` so abandoned checkout can be measured in money; importing it alongside `pack_purchased` counts that money twice — once when the session opens, again when it is paid — and Smart Bidding bids against revenue never collected. Same for `booking_step_view`: GA4's key-event marking and the Ads import are scoped to the event **name**, not name-plus-parameter, so marking it would count step-1 arrivals as conversions. That is exactly why `slot_reserved` exists as its own name. | O |
| C.5 | `assessment_booked` value = **"Use the value from the event"**, never a fixed value. | O |
| C.6 | Count = **One**, not Every. | O |
| C.7 | Click-through conversion window set to the maximum available. Assessments get booked days after the click. **NEEDS A CHECK** — the maximum for an imported GA4 action, and whether it is settable per-action, changes with the UI. | O |
| C.8 | **Enhanced Conversions** enabled on `assessment_booked`. `lib/ga-server.ts:119` already sends `user_data.sha256_email_address`, trim+lowercase normalised, which is exactly what Google's documented normalisation requires. This depends on `ad_user_data` being granted, which it now is outside the EEA/UK/CH. If Ads ever reports a 0% match rate, check the consent defaults before suspecting the hashing. | O |

**Why `assessment_booked` is Primary and the others are not.** It is the only one of the four
that happens close enough to the click for Smart Bidding to act on. `plan_started` arrives ~1–2
weeks later (the first bill is deliberately a week after the assessment — `content/coach.json`
"When is my first payment taken?"). `retained_student` arrives 30–270 days later and fires on
*every* `invoice.paid`, so its count is retention-months, not students. Bidding on a signal that
arrives after the attribution window has closed teaches nothing.

**Why the value is $1,150 / $1,450 and never $280.** From `ASSESSMENT_VALUE_USD` in
`lib/pricing.ts`, derived as `LTV_USD × ASSESSMENT_TO_PLAN_RATE`:

```
online     $2,520 × 0.45 = $1,134  → $1,150
in-person  $3,240 × 0.45 = $1,458  → $1,450
```

$280 is the *tempting* wrong answer because it sounds conservative — it is the cash that actually
arrives. It is also the answer that loses money. Smart Bidding hunts for whoever converts most
cheaply *right now*, and the cheapest converter is the price-shopping one-off buyer who takes a
lesson and leaves. Breakeven is roughly two months of retention (§7), so a cohort of one-month
buyers is unprofitable at **any** CPA. Tell the algorithm $280 and it optimises the account into
losing money more efficiently. The opposite error, $0 or no value, means bidding cannot
distinguish a booked assessment from a bounce and reverts to buying clicks.

### Gate D — import, then verify in the UI what the CSV cannot be trusted for.

`marketing/README.md` §1 documents, honestly, that its CSV headers were **never verified against
a live Google Ads Editor**. Take that seriously: do the five-minute `Account → Export → Export
whole account (CSV)` trick in §1 to get the headers Editor actually accepts, then rename. Import
order and the columns to delete are in §2. Do not attempt to import `extensions.csv` — §3
explains why it is a specification, and 4 sitelinks + 6 callouts + 1 snippet set is ten minutes
of typing with zero import risk.

Three settings must be confirmed **visually in the web UI** regardless of what the CSV did:

| Setting | Why visual confirmation |
|---|---|
| **Search Partners OFF, Display expansion OFF** | The single most costly setting to get wrong. `Networks` semicolon syntax is one of the unverified headers |
| **Presence** targeting, not "presence or interest" | Header almost certainly wrong in the CSV. Interest-based targeting on a local campaign buys clicks from people in other states reading about LA |
| **15-mile radius** | Proximity is its own criterion type in Editor and may not be settable from a campaign row. Set it by hand |

Also: only `Search - LA Local` **Enabled**; the other three **Paused**. No Performance Max, ever,
at this budget — `README.md` §4 is right that PMax would spend the whole thing on cheap Display
and YouTube before it learned anything, so you would fund the education and never receive it.

**Do not add a location asset to this account, do not add affiliate locations, and do not link
the GBP to the ads account.** A location asset publishes an address, a map pin, or a
distance-to-you. Lessons happen in a private residence.

### Gate E — first spend. Campaign 1 only, $500/mo.

`Search - LA Local` at $16.44/day. Maximize Conversions, no target, weeks 1–4, untouched. Check
ad approvals within 24 hours — the headlines naming **Amanda Miguel** can trip the trademark
filter even though the credit is factual (`content/coach.json`); `Toured With a Latin Star` is
already in the rotation as the drop-in replacement.

Note the cash reality: for the first ~6 weeks the account spends **$500/mo, not $950**. The full
$950 only arrives once gate 5 of `launch-checklist.md` opens Campaigns 2–4.

### Gate F — Campaigns 2–4, one at a time, two weeks apart.

Gate 5 of `launch-checklist.md` sets the bar and it is the right bar: a real cost per booked
assessment under $250, over a minimum of four weeks **and** at least five booked assessments. One
cheap conversion in week 2 is not a workable CPA. Order: Brand ($50) → Songwriting ($250) →
Online Voice ($150). Brand first because it is the cheapest certain volume in the account and it
stops a competitor bidding on her name.

### Gate G — GBP and the review engine. Runs in parallel from day zero. No spend.

This gate has no dependency on Gates A–F and is the highest-return work in the document. It is
listed last only because it is not on the spend path.

| # | Check | Owner | If skipped |
|---|---|---|---|
| G.1 | Search `business.google.com` for an existing auto-generated listing. **Claim, never duplicate.** | J | Duplicates get merged or suspended |
| G.2 | Create as a **service-area business with the address hidden**. `marketing/gbp-setup.md` §1 is correct and load-bearing — see §3 of this plan | J | Listing a residence as a storefront is a suspension risk. A suspended profile ranks nowhere for weeks, which also removes the review asset |
| G.3 | Video verification. Have ID, a utility bill in her name, and the teaching setup ready. **Do not film the exterior, street sign or house number.** | J | Nothing else on this gate can start |
| G.4 | Fix the $105 → $110 error in `gbp-setup.md` §6 before publishing services | O | A GBP price that contradicts the pricing page |
| G.5 | `GOOGLE_REVIEW_URL` into Vercel env, from *Ask for reviews* | O | See G.7 |
| G.6 | `RESEND_API_KEY` set (currently **empty** in `.env.local`) and `EMAIL_FROM` on a **Resend-verified domain** | O/J | `onboarding@resend.dev` delivers only to the account owner — which looks like success while no student ever receives anything |
| G.7 | Confirm the cron actually sends. It runs daily at 17:00 UTC today and returns `{ok:true, skipped:...}` every single time | O | **The review engine is dead in two independent places right now.** Reviews are the dominant local ranking factor; this is the one asset that compounds while everything else stays static |

---

## 2. Google Ads: what remains

Everything in the table below is what is *not* in `marketing/`. The campaign structure, 62
keywords, 18 RSAs, extensions spec and negative list are done and should not be rebuilt.

| Item | Owner | Notes |
|---|---|---|
| Account creation + billing | J | Nothing else can start |
| Auto-tagging on | O | Gate C.2 |
| GA4 link + 4 conversion actions imported | O | Gate C.3 |
| Primary/Secondary assignment | O | Gate C.4 |
| Value from event, count One, max window | O | Gates C.5–C.7 |
| Enhanced Conversions | O | Gate C.8. Code side is already done |
| Header reconciliation against a live Editor export | O | `README.md` §1 — 14 specific columns flagged |
| `extensions.csv` typed by hand | O | `README.md` §3 |
| UI verification of Search Partners / Presence / radius | O | Gate D |
| **A Spanish landing page** | J (copy) + S (page) | See below |
| A phone number decision | J | Call asset deferred in `README.md` §3 — only with a number she will publish, never a personal mobile |

**The Spanish landing page is the highest-value unfinished ads work in the account.** The
`LA Clases de Canto ES` ad group runs nine Spanish keywords, three Spanish RSAs and a Spanish
callout — and points every one of them at an **English** page, `/vocal-coach-los-angeles`. That
hurts Quality Score and conversion rate simultaneously. She genuinely teaches in Spanish, and
almost no competing LA vocal coach advertises in it, which makes this the one place in the
account where she has an uncontested advantage and is currently wasting it. `/clases-de-canto-los-angeles`
is a page, not a project.

### Bidding

| When | Strategy | Rule |
|---|---|---|
| Weeks 1–4 | Maximize Conversions, no target | Do not touch it. It will spend the full daily budget; that is what it is for |
| Week 5+ | Target CPA **$230** | Cost per *booked assessment*, not per student. A **ceiling, not a goal**. $230 because CAC = CPA x 2.61 at the planned 85% show and 45% plan rates, so $600 CAC implies $230 CPA — the $250 this table carried would have produced $654 |
| Ongoing | Adjustments | **Never more than once per fortnight. Never by more than 20%.** $250 ± 20% is one move to $200 or $300, then two full weeks of silence |

The fortnight rule is mechanical, not stylistic: every change re-enters the learning period, and a
campaign producing a handful of conversions a month needs all fourteen days to say anything.
Adjusting weekly means the strategy is permanently learning and never optimising.

**Do not use Target ROAS.** It needs the same volume *plus* meaningful variance in conversion
value, and there are exactly two values here — $1,150 and $1,450.

### The volume problem, stated plainly

Google's guidance is roughly **30 conversions in 30 days** before Target CPA is reliable. This
campaign will produce **2–5 a month**. That is not a marginal shortfall; it is an order of
magnitude. Smart Bidding at five conversions a month is optimising toward the accidental
characteristics of five people.

What to actually do about it, in order of value:

1. **Stay on Maximize Conversions longer than four weeks.** The week-5 switch is a plan, not a
   promise. Switch when cumulative conversions reach ~15, not when the calendar says so. If
   impressions collapse after the switch, the target is below what the auction will bear: raise it
   once by 20%, wait a fortnight, and if it is still starving, **go back to Maximize Conversions
   and stay there.** Reverting is not a failure; forcing a target onto data that cannot support it
   is.
2. **Do not split anything.** One campaign, one ad group per intent phrasing, one conversion
   action. Every split divides an already-insufficient signal. This is why
   `Search - Songwriting US` has exactly one ad group.
3. **Use `slot_reserved` as the volume proxy — it now exists.** The analytics agent has landed
   `booking_step_view` (steps 1–3), `booking_step_blocked`, `booking_abandoned`, `slot_reserved`,
   `checkout_started` and `checkout_blocked` in `lib/analytics.ts`. `slot_reserved` is the one that
   matters here: it fires when Cal.com confirms the slot, i.e. before the card step, so it is
   strictly higher-volume than `assessment_booked` while still representing a real commitment —
   half an hour on a real calendar — and it arrives within a minute of the click.
   **Plan:** import it as **Secondary** at launch (Gate C.4) and watch the
   `slot_reserved → assessment_booked` ratio. If `assessment_booked` is still under ~10/month at
   week 8, promote `slot_reserved` to Primary and demote `assessment_booked` to Secondary, valued
   at `ASSESSMENT_VALUE_USD × the observed slot→card rate` — not at the full $1,150, which would
   over-value a slot that has not been carded. Keep `assessment_booked` as the check that the proxy
   has not decoupled: if `slot_reserved` volume rises while `assessment_booked` does not, the
   proxy has started buying people who reserve and never card, and bidding must go back.
   Note it carries `transaction_id` = the same Cal.com booking uid as `assessment_booked`, which
   makes card-hold abandonment a join rather than a guess. **They are separate conversion actions
   and Google Ads only deduplicates within one action**, so the shared id is for analysis, not
   dedupe — do not assume it protects you from double-counting across the two.
   One caveat that will otherwise cause a false alarm: the step events are **client-side only** and
   therefore systematically short by the usual 20–30%, so the step-3-to-`assessment_booked` ratio
   will read **above 100%** against the server-side count. Use them for ratios between steps, never
   as absolute counts beside a server-side number.
4. **Portfolio bid strategy across Campaigns 1–3 once all three run**, to pool the conversion
   signal into one learning set. **NEEDS A CHECK** — whether current Google Ads portfolio
   strategies genuinely pool learning across member campaigns, and whether pooling three campaigns
   with structurally different CPAs (LA local vs national songwriting) helps or just averages
   them into a target that fits neither.
5. **Accept a longer horizon.** At 2–5 conversions a month, four weeks of data is 8–20 events.
   Almost nothing you observe in a single week is signal. This is the honest reason the weekly
   ritual in §4 is mostly about *search terms and hygiene* rather than about performance: hygiene
   is observable weekly, performance is not.

**Enhanced CPC / manual CPC as a fallback: NEEDS A CHECK.** Enhanced CPC has been progressively
retired and I will not assert its current availability. If it still exists it is a defensible
alternative to a starved Target CPA; verify in the UI before planning around it.

### Blunt assessment

At $16/day on LA voice terms this campaign may simply not work, and the kill criteria in
`launch-checklist.md` are right to say so. LA has a deep bench of established vocal coaches and
"vocal coach near me" is a proximity query answered by the local pack — which an SAB with a
hidden address structurally under-serves. **The songwriting campaign is the one most likely to
produce a workable CPA**, and if Campaign 1 is above $400 per booked assessment at week 8 with
clean search terms, moving that money to Campaign 2 is the correct response, not raising the
budget to "give it a chance". Current CPCs for these terms are **unverified** — pull them from
Keyword Planner before setting expectations, and replace the placeholders in
`launch-checklist.md` gate 1 after week 2 with real numbers.

---

## 3. SEO roadmap, ordered by winnability

Winnability, not volume. The highest-volume term in this space is the one she is least likely
to rank for.

| Tier | Target | Winnability | Why |
|---|---|---|---|
| **1** | Her own name | Certain | She owns it. Brand campaign is defensive, not acquisitive |
| **1** | GBP + reviews | High, compounding | Reviews are the dominant local ranking factor and the strongest conversion asset on the page. Also the only lever that compounds |
| **2** | Songwriting terms | **Realistic** | Far less contested than voice. Almost nobody teaching songwriting is also a releasing artist with editorial placements |
| **2** | `clases de canto` / Spanish | **Realistic and uncontested** | She genuinely teaches in Spanish; almost no LA competitor advertises in it |
| **3** | Long-tail voice + qualifier | Possible | "singing lessons for adults beginners", "voice lessons while playing guitar" |
| **4** | LA voice head terms | Hard, structurally | Local pack, proximity-weighted, hidden address |
| **5** | "online singing lessons" national | **Effectively unwinnable at this size** | Contested by funded platforms with content teams. Fine as a paid destination; a bad content investment |

Search volumes and difficulty for every row above are **unverified** — no keyword tool was
available. Confirm in Keyword Planner and, once there is data, in Search Console's Performance
report, which is the only source that tells you what *this site* actually surfaces for.

### 3.1 GBP as a service-area business with the address hidden

`marketing/gbp-setup.md` is correct and complete; follow it. The parts that matter most:

- **SAB, address entered for verification only, "Show business address to customers" OFF.** Two
  reasons and the second is the expensive one: publishing the address publishes her home address
  permanently next to a map pin, and **listing a residence as a storefront is a suspension risk**
  — Google expects a storefront to be staffed during posted hours and signed for customers.
- **Name:** `Juliana Beltran Music` or plain `Juliana Beltran`. Never
  "Juliana Beltran Vocal Coach Los Angeles" — keyword-stuffed names are the most commonly
  enforced GBP name violation and the penalty is suspension.
- **Primary category:** the most specific singing-teacher option the picker offers, with
  `Music Instructor` second. Never `Music School` — it implies an institution and premises.
  Exact picklist strings **need checking in the picker**; they get renamed.
- **Accept the ranking cost and do not "fix" it later.** Hiding the address costs local-pack
  ranking for proximity queries. That is exactly what Campaign 1 is funded to cover. Revealing
  the address later is the failure mode the whole section exists to prevent.
- **Never on the profile:** any street address or cross-street, "our studio" / "visit the studio"
  in the *place* sense, opening hours framed as walk-in availability, exterior photographs.
  Strip EXIF before uploading photos — geotagging does nothing for ranking and can leak location.

### 3.2 The review engine

Today: one ask has never been sent. The cron exists, is scheduled, is `CRON_SECRET`-guarded, and
returns `skipped` every day because `GOOGLE_REVIEW_URL` is unset (and would fail anyway because
`RESEND_API_KEY` is empty). Gate G unblocks it. Until then the ask is manual on the same trigger.

The trigger is right and worth defending: **3 weeks after the first paid month**, bounded to a
60-day window. Four to eight lessons in, the student has something specific to say. Asking after
a free assessment produces "seems nice", which converts nobody. The 60-day upper bound exists so
that switching this on for the first time does not email every student who ever paid — a burst of
reviews arriving on one day looks bought.

Policy, non-negotiable: **never** offer anything in exchange for a review; ask everyone on the
trigger, not only the students you expect to like you; one ask, one reminder, stop. Reply to every
review inside 48 hours in the reviewer's language — responses are public and indexed and the next
prospect reads them more carefully than the review itself.

Target from `gbp-setup.md`: **+2 reviews/month at 4.8 or better.** At the plan's own conversion
math (§7) that is roughly one review per new student, which means the review engine's throughput
is capped by the acquisition engine. Worth knowing: this will be slow for the first two quarters
regardless of how well the cron works.

**Keep site testimonials and Google reviews separate.** `content/coach.json` backs the
`aggregateRating` in the JSON-LD; `aggregateRating` must describe the reviews actually displayed
on that page, and mismatched review markup is a manual-action category.

### 3.3 Content depth, in build order

Two pages already carry songwriting: `/coach/songwriting` (253 lines) and
`/online-songwriting-lessons` (239 lines). They are the base to build on, not to replace.

| # | What | Grounded in | Unblocks |
|---|---|---|---|
| 1 | `/clases-de-canto-los-angeles` | Her actual bilingual delivery | Both an SEO asset in an uncontested niche *and* the fix for the Spanish ad group's landing mismatch. Do this first — it is the only item that pays twice |
| 2 | Songwriting depth: object writing, finishing a song, structure, hooks | `content/coach.json` service 04 already lists all of it, including "object writing — ten minutes on one object, all five senses" | Long-tail songwriting queries; the differentiator no competitor has |
| 3 | Adult-returner page or section | `content/coach.json`: "for adults coming back to an instrument they left", ages 5–70+; `docs/rebrand-plan.md` identifies 40+ returners as a core buyer | The buyer the site currently addresses least |
| 4 | Parent/safeguarding page | Needs the safeguarding line from **J** | The parent buyer's blocking objection. `content/coach.json` `_pendingFromOperator` item 4 |
| 5 | Singing-while-playing | Services 01 and 02 both name it; genuinely distinctive | Low-competition long tail |
| 6 | Online-lesson audio setup | The FAQ answer about not leaving audio on default video-call settings is the most concretely credible paragraph on the site | Answers "does online actually work" with a mechanism instead of a reassurance |

Do **not** build more LA voice-term content expecting it to rank. That is tier 4 and paid search
is the right tool for it.

### 3.4 Internal linking

The measurable gap: `/online-songwriting-lessons` links to exactly **three** internal
destinations — `/coach/songwriting`, `/coach/services`, `/coach/book`. A paid-traffic landing page
with three internal links is a leaf, not a hub, and it passes almost nothing to the pages that
need it.

The structure to build (page-level implementation is **S**'s, not mine):

- **`/coach/songwriting` as the songwriting hub.** Every songwriting-adjacent page links up to it;
  it links down to each of them with descriptive anchor text.
- **Cross-link the artist side to the coach side deliberately.** `/artist/press`,
  `/artist/live/[slug]` and `/live-music-for-events-los-angeles` carry the credibility no
  competitor has — the Amanda Miguel tour, the Spotify editorial placements, the Hotel Café set.
  Today that credibility sits in a different route group from the pages that sell lessons.
- **Anchor text describes the destination**, not "click here" or "learn more".
- **Never rename an indexed path.** `app/sitemap.ts` documents this explicitly; every
  already-indexed route is at its original path and moving one throws away its rankings.

---

## 4. Measurement

### The funnel, with what measures each step

| # | Step | Realistic number | Measured by | Status |
|---|---|---|---|---|
| 1 | Impressions | — | Google Ads only | Not in GA4 |
| 2 | Clicks | ~100/mo at $500 and a **placeholder** $5 CPC | Google Ads; GA4 session via latched `gclid` | ✅ |
| 3 | Landing page view | | GA4 `page_view` (manual — loader sets `send_page_view:false`) | ✅ |
| 4 | `/coach/book` view | | GA4 `page_view`, plus **`booking_step_view`** step 1 (`details`) | ✅ |
| 5a | Step 1 → 2 (details validated, calendar shown) | | **`booking_step_view`** step 2 (`schedule`). Refusals land as **`booking_step_blocked`** with `first_field` | ✅ **newly measured** |
| 5b | Left without reaching the next step | | **`booking_abandoned`** — step, seconds on step, and whether validation had already refused them once | ✅ **newly measured** |
| 6 | Cal.com confirmed the slot | | **`slot_reserved`**, `transaction_id` = booking uid. Fires alongside `booking_step_view` step 3 (`hold`). The Cal.com webhook still only handles `BOOKING_CREATED` server-side | ✅ **newly measured** (client-side) |
| 7 | $0 card hold succeeded | 2–5/mo | **`assessment_booked`**, server-side on `setup_intent.succeeded`, value `$1,150`/`$1,450`, `transaction_id` = Cal.com booking uid | ✅ **The Primary conversion** |
| 8 | Assessment attended | target >85% | — | ❌ **UNMEASURED.** See below |
| 9 | Assessment delivered → plan | target 45% | **`plan_started`**, on `customer.subscription.created`, value = first month, `transaction_id` = Subscription id | ⚠️ Numerator only. The **denominator does not exist** |
| 9b | Pack checkout opened → paid | | **`checkout_started`** (session created, carries value) → **`pack_purchased`**, gated on `mode === 'payment'`, value = real `amount_total`. Same `transaction_id`, so abandoned checkout is measurable in dollars. Refusals land as **`checkout_blocked`** with `reason` | ✅ **newly measured** |
| 10 | Month 2, 3, … | target >70% at month 3 | **`retained_student`** on every `invoice.paid`, carrying `months_retained` and `past_breakeven` | ✅ — and this is why Gate B matters |
| 11 | Churn | | `markChurned()` writes Stripe metadata and emails the operator. **No GA4 event** | ❌ **UNMEASURED in GA4** |

### The remaining unmeasured steps, and which one to fix first

The mid-funnel gap that made this list four items long has largely closed while this plan was
being written — steps 5 and 6 and pack-checkout abandonment are now instrumented. **Two gaps
remain, and the first is the important one.**

1. **Assessment show rate (step 8) — fix this first.** `app/api/calcom/webhook/route.ts` returns
   early for anything that is not `BOOKING_CREATED`, so cancellations and no-shows produce nothing.
   `FunnelStage` in `lib/students.ts` is `'booked' | 'active' | 'churned'` — there is no
   *attended* state anywhere in the system. This matters more than it sounds: a booked assessment
   nobody attends is a **paid $1,150-valued conversion with zero real value**, and Smart Bidding
   will happily buy more of exactly that. `launch-checklist.md` sets a kill criterion at a show
   rate under 60% — a threshold that currently cannot be evaluated. Interim: **J** marks attendance
   in Cal.com and **O** counts it by hand weekly. Proper fix: request to **A** to handle
   `BOOKING_CANCELLED` and a no-show signal.
2. **Assessment→plan rate (step 9 denominator).** `plan_started` counts plans; nothing counts
   delivered assessments. Until step 8 is instrumented this headline rate — the number
   `ASSESSMENT_VALUE_USD` is built on — is computed by hand from Cal.com and Stripe.
3. **Churn.** Retention is visible as a rising `months_retained` and invisible as a stop.
   `markChurned()` writes Stripe metadata and emails the operator, but no GA4 event fires. In GA4
   you infer churn from the *absence* of a `retained_student`, which is workable in an exploration
   and awkward everywhere else. Low priority: this only becomes readable once there are enough
   students for a cohort, and by then Stripe is the better source anyway.

**Now resolved, for the record:** booking form start and abandonment (`booking_step_view`,
`booking_abandoned`), the specific field that refuses people (`booking_step_blocked.first_field`),
Cal.com slot confirmation (`slot_reserved`), and abandoned pack checkout in dollars
(`checkout_started` vs `pack_purchased`). `docs/rebrand-plan.md` flags that `/coach/book` promises
"two questions and a calendar" against ~8 fields plus a card — that expectation violation now has
a number attached to it, which makes it a fixable problem rather than a suspicion.

### ⚠️ Two traps that will make GA4 numbers wrong

**GA4 will show roughly double the true count for `assessment_booked`, `plan_started` and
`pack_purchased`.** Both a server fire and a client mirror send the same event with the same
`transaction_id`. GA4 deduplicates *nothing*; Google Ads collapses on `transaction_id`. So
**Google Ads' count is right and GA4's raw count is not.** Every GA4 report on these events must
either count **distinct `transaction_id`** or filter **`delivery = server`**. `retained_student`
has no mirror and is unaffected. The code says this out loud in
`components/coach/ConversionMirror.tsx` — believe it.

**Turned around, that is the single best diagnostic in the property.** Comparing
`delivery = client` against `delivery = server` for the same event measures your actual
browser-side loss to ad blockers and Safari ITP. The 20–30% figure in `lib/ga-server.ts` is an
industry estimate; this property can measure its own, and if the gap is much larger than that,
something is broken rather than merely blocked.

### GA4 reports and explorations to build

Once, in this order:

1. **Realtime, no filter** — the Gate A proof (see the DebugView caveat in Gate A).
2. **Mark all four as key events**, Admin → Events. Prerequisite for the Ads import.
3. **Custom definitions** — Gate B. Not retroactive. Before spend.
4. **Funnel exploration — the most valuable report in the property.** `page_view` on a paid
   landing page → `booking_step_view` step 1 → step 2 → step 3 / `slot_reserved` →
   `assessment_booked` → `plan_started`. Open funnel, segmented by `campaign`. This is the report
   that tells you *which* step is losing people, which is exactly what §5's decision table needs
   to pick a remedy. Steps 1–3 are client-side and `assessment_booked` is server-side, so read the
   step-to-step ratios and treat the final step's absolute number as coming from Ads, not here.
4b. **Free-form: `booking_step_blocked` by `first_field`.** One table, sorted by count. It names
   the single form field costing the most bookings. Cheapest actionable report on this list.
4c. **Free-form: `checkout_blocked` by `reason`.** Watch `not_configured` — it means
   `/api/stripe/checkout` returned 503 on a live deployment, every purchase is failing, and today
   the only person who finds out is the buyer, who is shown an email address.
5. **Free-form: conversions by `mode`.** Rows `mode`, metric distinct `transaction_id`,
   filter `delivery = server`. In-person is worth 26% more per assessment and 29% more in LTV; if
   the mix is all online the blended CAC ceiling is lower than planned.
6. **Free-form: `delivery` client vs server**, per event. The loss-rate diagnostic above.
7. **Free-form: retention.** Rows `months_retained`, breakdown by `campaign`, metric event count.
   Plus `past_breakeven` as a single number — the share of the cohort that has cleared two months
   is the closest thing to a profitability read the property can produce.
8. **Landing pages × session source/medium**, restricted to the three paid destinations. This is
   also where a GBP-sourced booking stays distinguishable — the appointment link is UTM-tagged
   (`utm_source=gbp`), and without the tags organic profile bookings land in the paid bucket and
   quietly flatter CAC.
9. **Link Search Console to GA4.** The organic half of §3 has no other feedback loop.

### The weekly ritual, first 8 weeks

30 minutes, same order, one day of the week. Gate 3 of `launch-checklist.md` owns items 1–5 and
they are correct — do not rewrite them, do them. This adds the site and proof side.

| Order | Item | Owner | Time |
|---|---|---|---|
| 1 | **Search terms, last 7 days, by cost. Read every term.** At $16.44/day one junk term at $6 a click is a third of the day's budget | O | 8 min |
| 2 | Add negatives aggressively. When unsure, exclude — a wrongly excluded term costs one keyword you can add back; a wrongly kept term costs money every week | O | 3 min |
| 3 | Any converting search term not already a keyword → add as exact | O | 2 min |
| 4 | Geographic report. Any spend outside the radius means Presence is set wrong | O | 2 min |
| 5 | **Show rate**, counted by hand from Cal.com | J → O | 3 min |
| 6 | Conversions in GA4 **filtered to `delivery = server`**, cross-checked against Google Ads' count. A widening gap is a tracking failure, not a performance change | O | 3 min |
| 6b | The booking funnel: step 1 → 2 → 3 ratios, and the top `booking_step_blocked.first_field`. One number and one field name | O | 2 min |
| 7 | GBP: reply to every new review; one post from the 4-week rotation in `gbp-setup.md` §8 | J | 8 min |
| 8 | **Ask: did any proof arrive this week?** One named outcome, one consented clip. This is the constraint (§6), so it belongs in the weekly ritual, not on a wishlist | J | 1 min |

**Week 2 specifically:** narrow the three over-blocking negatives flagged in `negatives.txt` —
`free`, `school`, `audition`. `free` blocks people searching for the exact free offer being sold,
`school` blocks "high school singing lessons", and `audition` contradicts the account's own
"Audition prep" structured snippet and a service listed in `content/coach.json`. Do it at week 2,
not later. Also week 2: replace the placeholder CPC and booking-rate numbers in
`launch-checklist.md` gate 1 with real ones.

**From week 9:** same review, fortnightly. Which also aligns with the bid-adjustment cadence, so
one meeting covers both.

---

## 5. The optimisation loop

Not "test things". A decision table. The four failure modes below have **completely different
remedies**, and applying the wrong one is how a working account gets broken.

**The cheapest lever at this scale is negative keywords.** It is free, it is immediate, it needs
no volume threshold to be valid, and at $31/day the waste it removes is a large fraction of the
budget. It is also the only lever whose effect is visible within one week. Everything else on this
page needs weeks of data or someone's unpaid hours. **Second cheapest: asking for reviews** —
free, compounding, and currently switched off. **Most expensive and slowest: bidding changes.**
They cost a fortnight of learning every time and, at 2–5 conversions a month, usually resolve
nothing.

| Observed signal | Diagnosis | Do this | Do NOT | Wait before judging |
|---|---|---|---|---|
| **CPA > $230, search terms dirty** | Wasted spend | Negatives, exhaustively. Tighten match types. Check Presence and radius | Touch the bid strategy — you would be optimising against noise | 1 week |
| **CPA > $230, terms clean, `booking_step_view` step 1 healthy, step 2 low** | The **details form** is the leak | Read `booking_step_blocked.first_field` — it names the field. Then fix that field, not the page. Also fix the "two questions and a calendar" expectation gap | Reduce fields blindly | 2 weeks |
| **Step 2 healthy, step 3 / `slot_reserved` low** | The **calendar** is the leak | Check available slots exist and are soon enough. In-person clusters on Tue/Thu (`IN_PERSON_DAYS`) — an empty calendar reads as "she has no time for me" | Blame the form | 2 weeks |
| **`slot_reserved` healthy, `assessment_booked` low** | The **card hold** is the leak | Make "you will see a $0 hold and no payment" impossible to miss. The FAQ answer already says it well; the booking flow should say it at the card step | Remove the card hold — it is the qualifying mechanism | 2 weeks |
| **CPA > $230, clean terms, low click-through** | Ad copy or the term is wrong for the offer | Rotate RSA assets. Pause the most informational-intent keyword (`learn to write songs` is the flagged candidate) | Add keywords | 2 weeks |
| **CPA > $400 at week 8, everything clean** | **LA voice terms may be unwinnable at this budget** | Move the money to Campaign 2 (Songwriting), where competition is lowest | Raise the budget to "give it a chance" | Act at week 8 |
| **Zero bookings after a full $500 month, clean terms** | Landing page or the offer, not the bid | Pause Campaign 1. Fix the page. Relaunch | Increase spend | Act immediately |
| **Show rate 60–85%** | Reminder cadence, or too long between booking and slot | Reminder at 24h and 2h. Restate that nothing is charged. Offer sooner slots | Change bids. This is not a bidding problem | 2 weeks |
| **Show rate < 60%** | Something is actively wrong | **Stop spending.** Fix reminders and the card-hold copy first | Spend another dollar. You are buying conversions that produce nothing *and* training bidding toward more of them | Act immediately |
| **Assessment→plan < 45%, ≥ 25%** | **The proof gap.** People meet her, like her, and do not buy | §6 items 1 and 5. Then the follow-up: a plan-start link sent same-day while the assessment is fresh | Cut price. The single-lesson premium is load-bearing — `lib/pricing.ts` build-time invariants will literally fail the build | 6+ assessments |
| **Assessment→plan < 25%** | Either the assessment or the offer is wrong | **Revalue `ASSESSMENT_VALUE_USD` downward** (§7) and re-plan the whole budget before optimising anything | Keep bidding at $1,150 against a rate that is not real | 6+ assessments |
| **Month-3 retention < 70%** | **Not a marketing problem.** Delivery | Progress-reporting cadence (§6 item 9). Parents quit, not kids — if they cannot see progress they judge value by how the child felt afterward | Spend more on acquisition. Acquiring into a leaking bucket at $600 CAC against a 2-month breakeven loses money faster the better the ads work | 3 months. There is no shortcut |
| **Cost per click rising, impression share falling, brand terms** | A competitor is bidding on her name | Raise the Brand campaign's $2 CPC ceiling. Cheapest defensive spend in the account | Ignore it | 1 week |
| **CPA fine, volume tiny (< 2/mo)** | The market is thin at this radius | Widen to 25 miles, or launch Campaign 2 early | Loosen match types to broad — that is how the search terms report gets dirty again | 4 weeks |

### What to leave alone

- **Ad schedule.** All hours. At this volume day-parting removes impressions and adds no
  information.
- **Prices.** `lib/pricing.ts` encodes the single-lesson premium, the pack-must-not-undercut-plan
  rule and the in-person premium as **build-time throws**. Those are not style preferences; they
  are the reason the monthly plan is the obvious choice, and the monthly plan is the only product
  that produces retention.
- **The bid strategy during weeks 1–4.** It is supposed to spend the full daily budget.
- **Anything, based on a single week.** At 2–5 conversions a month a week is 0.5–1.2 events.

---

## 6. What only Juliana can supply

Ordered by leverage. Nothing here can be written from the repo, and `docs/rebrand-plan.md` and
`content/coach.json` `_pendingFromOperator` both say so already. This orders them by what they
unblock *commercially*.

| # | Item | Unblocks | Cost to her |
|---|---|---|---|
| 1 | **One named student and one specific thing that changed for them**, with written consent. Not "testimonials" — one sentence of the form "Maya sang at her sister's wedding after five months" or "Daniel finished the first song he'd started in three years" | The only asset that moves assessment→plan, which is the rate the entire budget is built on. Also: ad copy that is about the student instead of about her; the proof block under the pricing cards; a GBP post; the honest answer to "will I actually improve" | One conversation, one email |
| 2 | **GBP verification** — her ID, a utility bill in her name, a continuous unedited video of the teaching setup | Everything in Gate G. Local presence, `GOOGLE_REVIEW_URL`, the review cron, the review engine, the compounding ranking asset | ~1 hour |
| 3 | **Google Ads account with her billing details** | All paid spend. Hard blocker | 30 min |
| 4 | **Resend: a verified sending domain + API key** (`RESEND_API_KEY` is empty today) | Review requests, assessment confirmations, plan-start links. Every automated follow-up in the codebase currently degrades to a logged warning | 30 min |
| 5 | **Student before/after audio, 3–5 pairs.** Same material both times, true elapsed time stated, unrehearsed | The claim is *auditory*, so text cannot substantiate it — that is a categorical argument, not a statistical one. The code seam already exists (`STUDENT_CLIPS`) | 3–5 × 10 min |
| 6 | **A written release** naming **audio, video, stills and voice** explicitly, parent-signed for anyone under 18 | Legal cover for items 1 and 5. Cal. Civ. Code §3344 lists voice separately and carries fee-shifting; a release signed by a 15-year-old is voidable under Cal. Fam. Code §6710 | One template, once |
| 7 | **How she counts a no-show**, and the habit of recording it in Cal.com | The show-rate metric (§4, step 8). Currently the kill criterion at <60% cannot be evaluated at all | 30 seconds per assessment |
| 8 | **Testimonial enrichment** for the five existing reviews: discipline, months studied, online or in person, parent or adult learner | Identity-descriptive detail is the one testimonial variable with quantitative support (Forman et al. 2008, cited in `rebrand-plan.md`). Cheap and immediate — the reviews already exist | 15 min |
| 9 | **A progress-reporting cadence she will actually keep** — weekly note, monthly summary, a recording every 6–8 weeks | Month-3 retention → `LTV_USD` → `ASSESSMENT_VALUE_USD` → what the account can afford to bid. The highest-leverage item on this list for the *economics*, and it is a delivery habit rather than a marketing asset | Ongoing, 10 min/student/week |
| 10 | **The Spanish landing page copy** (she writes it; **S** builds the page) | The one uncontested advantage in the ad account, currently wasted by pointing nine Spanish keywords at an English page | 2 hours |
| 11 | **Years teaching**, as a field in `content/coach.json` | "7 years teaching" has been proposed in copy and appears nowhere in the repo. No page may render it until the true number exists | 1 minute |
| 12 | **A safeguarding statement** the under-18 FAQ answer can point at | The parent buyer's blocking objection. Parents are a core segment (ages 5+) and the site has nothing for them on this | 1 hour |
| 13 | **An LA rate benchmark she will stand behind**, with source and date | The strongest unused argument on the site: $280/mo is 4 × $70. `rebrand-plan.md` cites "~$60–200/hr with established coaches higher" — **that figure is unverified and must not be published until she has a source she will name** | 30 min |
| 14 | **A background check the site can name.** `rebrand-plan.md` proposes TrustLine at ~$143 — **price needs verifying** | Against a $3,240 in-person LTV it is a rounding error, and no local competitor will have it | ~$143, once |
| 15 | **A phone number she is willing to publish** — never a personal mobile | The Google Ads call asset, deferred in `README.md` §3 | Her decision |

### What must not be manufactured to fill the gap

`docs/rebrand-plan.md` already lists the claims to refuse and it is right: "video testimonials
convert 34%/80%/86% better", "people retain 95% of video vs 10% of text" (a mutation of Dale's
Cone — no such study exists), "named testimonials are 35% more persuasive", "only 1.5% of people
are tone deaf". These trace to marketing blogs citing each other. No credible published A/B test
of video versus text testimonials exists.

Where a mechanism is real, state the mechanism instead of inventing a number. Reviews rank a local
business because Google's local algorithm weights review count and recency — that is an
observable ranking behaviour, not a percentage lift. Audio proves a claim about sound because the
claim is about sound. Neither statement needs a statistic and neither should be given one.

---

## 7. Honest economics

Every figure below comes from `lib/pricing.ts` and `content/pricing.json`. Nothing is invented and
the assumptions are labelled as assumptions.

### The inputs

| Input | Value | Source | Confidence |
|---|---|---|---|
| Online monthly plan, 4 × 60 | **$280/mo** | `online_monthly_60` | Real |
| In-person monthly plan, 4 × 60 | **$360/mo** | `inperson_monthly_60` | Real |
| Online single lesson | **$85** | `online_single_60` | Real |
| In-person single lesson | **$110** | `inperson_single_60` | Real |
| Online 10-pack | **$700** | `online_pack_10` | Real |
| In-person 10-pack | **$900** | `inperson_pack_10` | Real |
| `LTV_USD.online` | **$2,520** | `lib/pricing.ts` | **Assumption** = 9 × $280 |
| `LTV_USD.inperson` | **$3,240** | `lib/pricing.ts` | **Assumption** = 9 × $360 |
| `ASSESSMENT_TO_PLAN_RATE` | **0.45** | `lib/pricing.ts` | **Assumption**. Zero observations |
| `ASSESSMENT_VALUE_USD` | **$1,150 / $1,450** | derived | **Product of two assumptions** |
| Budget | **$950/mo** committed; **$500/mo** until Gate F | `campaigns.csv` | Real |
| Target cost per booked assessment | **< $250** | `launch-checklist.md` | Target |
| Target all-in CAC | **< $600** | `launch-checklist.md` | Target |
| Breakeven | **~2 months of retention** | `lib/pricing.ts` | See below |

**On `ASSESSMENT_VALUE_USD` and stacked uncertainty.** It is LTV × conversion rate, and *both*
factors are unvalidated, so the uncertainty is multiplicative rather than additive. `LTV_USD` of
$2,520 is nine months of $280 — if median retention turns out to be four months, LTV is $1,120.
Combine that with a 25% conversion rate and the correct value is **$280** — the exact figure
`lib/pricing.ts` spends a paragraph explaining why you must never send. That is not an argument
for sending $280 now; the estimate is the right thing to bid on until real data exists. It is an
argument for treating the revalidation trigger in `lib/pricing.ts` (~30 students past month 3, at
which point `scripts/offline-conversions.ts` starts feeding true outcomes) as a real commitment
rather than a footnote.

**On "breakeven at ~2 months".** Be precise about what that number is: $600 CAC ÷ $280/mo ≈ 2.1
months to **recover the acquisition cost in cash**. It is a payback period, not a profit
threshold — it counts gross revenue and prices her teaching hours at zero. The blended Stripe
take rate (target <3.5%) comes off the top. If her hours have any opportunity cost, true breakeven
is later than two months and the CAC ceiling is lower than $600.

### ⚠️ The $250 CPA ceiling and the $600 CAC target are inconsistent

CAC = cost-per-booked-assessment ÷ (show rate × assessment→plan rate). At the plan's own targets of
85% and 45%, the multiplier is **1 ÷ 0.3825 = 2.61×**:

| Cost per booked assessment | Implied all-in CAC (85% show, 45% plan) |
|---|---|
| $150 | $392 |
| $200 | $523 |
| **$229** | **$600 — the actual ceiling** |
| **$250** | **$653 — over target** |
| $300 | $784 |

**A $250 CPA does not deliver a $600 CAC; it delivers $653, before any tooling cost** — and
`launch-checklist.md` defines all-in CAC as *(ad spend + tooling) ÷ students started*, so Cal.com,
Resend, Vercel and Stripe fees push it higher still. Two coherent resolutions, and a choice has to
be made rather than left ambiguous: either **the real CPA ceiling is $230** (600 x 0.85 x 0.45 = 229.50, rounded up), or **the CAC target
is ~$650**. The first is honest and harder; the second is honest and admits a longer payback
(2.3 months instead of 2.1). Do not carry both numbers forward as if they agreed.

### What has to be true for $950/mo to work

Campaign 1 only, $500/mo. CPC is a **placeholder — verify in Keyword Planner**.

| | Pessimistic | Middle | Optimistic |
|---|---|---|---|
| CPC | $6.00 | $5.00 | $4.00 |
| Clicks/mo | 83 | 100 | 125 |
| Click → booked assessment | 2.0% | 3.5% | 5.0% |
| Booked assessments/mo | **1.7** | **3.5** | **6.3** |
| Cost per booked assessment | **$300** | **$143** | **$80** |
| Delivered at 85% show | 1.4 | 3.0 | 5.3 |
| Plans at 45% | **0.6** | **1.3** | **2.4** |
| All-in CAC (ads only) | **$784** | **$373** | **$209** |
| New MRR added/mo (online) | $175 | $375 | $667 |

So the requirement, stated as a single sentence: **the click-to-booked-assessment rate has to be
at least ~3% and the show rate has to hold above 85%.** Below that, CAC breaks $600 no matter how
good the bidding is. The click-to-booking half of that is now instrumented step by step (§4), so
when it comes in below 3% you will be able to say *which* step is responsible. The show rate is
not instrumented, so the other half is still counted by hand.

**The cash-flow shape, which the CAC number hides.** The first bill lands about a month after the
click — scheduling lag plus the deliberate one-week delay after the assessment (`content/coach.json`).
So month 1 is pure outflow. At the middle scenario with **zero churn** (optimistic), cumulative
gross revenue overtakes cumulative ad spend somewhere in **month 4**. At a 25% conversion rate it
is **month 6**, and with any realistic churn, never. **Paid acquisition here needs roughly
$1,500–3,000 of working capital before it self-funds, even when it is working.** That is the real
ask, and it is not in any of the existing documents.

### If assessment→plan comes in at 25% instead of 45%

Plainly: **the ad account as specified stops working, and almost every number in `marketing/`
needs redoing.**

| | At 45% | At 25% |
|---|---|---|
| `ASSESSMENT_VALUE_USD` online | $1,150 | **$630** (2,520 × 0.25) |
| `ASSESSMENT_VALUE_USD` in-person | $1,450 | **$810** (3,240 × 0.25) |
| CAC multiplier (85% show) | 2.61× | **4.71×** |
| CAC at a $250 CPA | $653 | **$1,176** |
| CPA needed for a $600 CAC | $229 | **$127** |
| Months of $280 to repay CAC at $250 CPA | 2.3 | **4.2** |

Consequences, in order:

1. **`ASSESSMENT_VALUE_USD` must be corrected in `lib/pricing.ts`.** Bidding at $1,150 against a
   real $630 makes Smart Bidding pay roughly 1.8× what a conversion is worth, and it does so
   silently and confidently.
2. **A $127 CPA on LA voice terms is very unlikely.** At a $5 CPC that requires a 3.9%
   click-to-booking rate *and* a $127 ceiling — a combination the market probably does not offer.
   Paid search on voice terms would then be structurally unprofitable, not merely badly optimised.
3. **The response is to change the funnel, not the bid.** Three real options, in order of cost:
   (a) fix the assessment→plan step, which is §6 items 1, 5 and 8, and is free; (b) move the
   budget to Songwriting and Brand, which have lower CPCs and where the conversion problem may be
   different; (c) reconsider the free assessment. A free 30-minute assessment attracts people who
   want a free 30 minutes. A nominal paid trial converts a smaller number of better-qualified
   people. **This would be a significant strategic change and needs her decision** — the current
   offer is well-built and honestly presented, and the $0 card hold is already the qualifying
   mechanism. Do not touch it on fewer than ~15 observed assessments.
4. **A 25% rate is not a marketing failure and should not be treated as one.** It means people
   meet her, like her, and do not buy — which is the proof gap, and the proof gap is item 1 of §6.

### The one-line version

At $950/mo this business needs roughly **1.6 new plan students a month** to hold CAC under $600 —
and at the plan's own show and conversion targets, that requires a cost per booked assessment of
**$230, not $250** — decided by the operator 2026-08-14. Whether LA voice terms can deliver that is unknown and unknowable from here.
What *is* knowable: the conversion rates that decide it are gated on proof she has not yet
supplied, the show rate that determines whether a paid conversion is worth anything is still
counted by hand, and the review engine that compounds independently of all of it is switched off
in two places for the want of two environment variables.

**Spend nothing until Gate A passes. Start Gate G today — it costs nothing and it is the only
thing here that compounds.**
