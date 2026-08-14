# Operator to-do

Everything that needs a human, ordered so that finishing a section unblocks the next.
Nothing here can be done from the codebase — that work is finished and deployed.

**Legend:** ⏱ time · 🔓 what it unblocks · ⚠️ what happens if skipped

---

## A. Before a single dollar of ad spend

These are cheap and they gate everything. Spending before A is done buys traffic you
cannot measure and trains Smart Bidding on nothing.

### A1. Confirm GA4 actually receives a conversion ⏱ 5 min
**GA4 → Reports → Realtime.** Book a test assessment on the live site (use a real card;
nothing is charged) and watch for `assessment_booked`.

- **Use Realtime, not DebugView.** Server-side conversions carry no `debug_mode`, so they
  never appear in DebugView. Earlier advice to use DebugView was wrong for these events.
- 🔓 Everything in this section. ⚠️ The Measurement Protocol returns HTTP 204 even with a
  wrong secret, so silence is indistinguishable from success. Without this you may spend a
  month reporting zero conversions and never know why.

### A2. Add referral exclusions ⏱ 2 min — **launch blocker**
**GA4 → Admin → Data Streams → your web stream → Configure tag settings → List unwanted
referrals.** Add all four:

```
checkout.stripe.com
cal.com
app.cal.com
billing.stripe.com
```

⚠️ The funnel leaves this origin twice and returns from Stripe. GA4 reads that as a new
session, so **every conversion is credited to "checkout.stripe.com / referral" instead of
the ad click that paid for it.** Your campaign shows the click and none of the conversion.
The failure looks like organic performing well, not like a bug.

### A3. Register custom dimensions ⏱ 5 min — **not retroactive**
**GA4 → Admin → Custom definitions → Create custom dimension** (event-scoped):

| Parameter | Dimension name | Why |
|---|---|---|
| `mode` | Lesson mode | online LTV $2,520 vs in-person $3,240 — a blended CPA is a wrong number |
| `lookup_key` | Tier | which plan actually sells |
| `step` | Booking step | where people drop out of the 3-step form |

⚠️ GA4 will not report on a custom parameter until it is registered, and **registration
does not backfill.** Every day of spend before this is a day you cannot slice.

### A4. Mark key events, and mark the right ones ⏱ 5 min
**GA4 → Admin → Events → mark as key event:** `assessment_booked`, `plan_started`,
`pack_purchased`.

**Do NOT mark** `assessment_booked_client`, `pack_purchased_client`, `plan_started_client`.
Those are browser-side mirrors that exist to measure how much tracking the browser loses.
⚠️ Marking them double-counts every conversion, and Smart Bidding would bid on twice the
real volume at twice the real value — which looks like success.

### A5. Create the Google Ads account and link it ⏱ 30 min
- Create the account. **Do not build campaigns by hand** — the CSVs are ready.
- Link Google Ads ↔ GA4, import the three key events, set **`assessment_booked` as
  Primary** and the other two Secondary.
- Turn on **Enhanced Conversions**.
- 🔓 A6.

### A6. Export your empty account from Google Ads Editor, and send me the headers ⏱ 10 min
⚠️ Our campaign CSVs were written without access to a live Editor, so **no header string is
verified.** Importing them as-is may fail. Exporting the empty account gives the exact
schema and I will rewrite the files to match.

### A7. Decide: CPA ceiling or CAC ceiling ⏱ 2 min thinking
The two targets you have been carrying are arithmetically incompatible:

```
CAC = CPA ÷ (show rate × plan rate) = CPA ÷ (0.85 × 0.45) = CPA × 2.61

$250 CPA → $654 CAC   ← breaks the $600 CAC target
$600 CAC → $230 CPA maximum
```

**Recommendation: cap CPA at $230.** A $600 CAC against a $2,520 online LTV is already a
4.2× ratio; loosening it is how paid acquisition quietly stops working. Tell me which and I
will make every document agree.

### A8. Working capital ⏱ decision
First bill lands ~1 month after the click. Zero churn → cumulative revenue passes
cumulative ad spend in **month 4**. At a 25% plan rate → **month 6**. With realistic churn
→ never.

**Have $1,500–3,000 available before starting.** ⚠️ Otherwise you stop spending in month 2,
right when the bidding has finally learned something, and lose the learning.

---

## B. Things that are silently broken right now

### B1. `RESEND_API_KEY` ⏱ 10 min
It is present but **empty**, so `send()` logs a warning and returns. Dead today:
booking confirmations, the plan link, **dunning emails**, review requests.

⚠️ **A failed payment currently alerts nobody** — not the student, not Juliana. The
subscription silently enters retry and then dies.

### B2. `GOOGLE_REVIEW_URL` ⏱ 2 min
Unset. The review cron runs daily at 17:00 UTC and returns `{ok:true, skipped}` every time.
Two independent reasons the review engine sends nothing — this and B1.

🔓 Reviews are the dominant local ranking factor and the only marketing lever that compounds.

### B3. Edge rate-limit rule ⏱ 15 min
**Vercel Firewall or Cloudflare**, on `/api/stripe/*` and `/coach/book/hold`.

The middleware I shipped only limits per-connection — I demonstrated it being bypassed in
production by opening fresh connections. ⚠️ `/coach/book/hold` creates real live Stripe
Customers, unthrottled.

### B4. Roll the live Stripe key ⏱ 5 min
`sk_live_…` was pasted into a chat transcript. **Stripe Dashboard → Developers → API keys →
Roll.** Replace with a **restricted key (`rk_live_`)** scoped to what this app touches, and
add it with `vercel env add` — never a file.

---

## C. Published claims that need your confirmation

These are live on the site *now*, next to a payment button. **They were written by an AI
agent, not by Juliana**, and nothing in the repo corroborates them.

| Claim | Where | Action |
|---|---|---|
| **24 hours' notice moves a lesson free** | 5 surfaces incl. `/coach`, pricing, terms | confirm or give me the real window |
| **Make-up lesson policy** | `/coach/terms` | confirm or replace |
| **Refunds** | `/coach/terms` | confirm or replace |
| **"the setting Zoom calls Original Sound for Musicians"** | `/coach/lessons/online` | which platform does she actually teach on? |

⏱ 5 minutes to answer all four. I will correct every surface.

Also: **"7 years teaching" exists nowhere in the repo**, so no page renders it. Give me the
number and the year she started and it goes into `content/coach.json`.

---

## D. The conversion ceiling — the real bottleneck

The site can now show Juliana is **pleasant**. It cannot show she is **effective**. Five
reviews describe warmth and patience; **zero say what changed for anyone.** Every agent that
looked at this reached the same conclusion independently.

This matters numerically: the whole model rests on a **45% assessment→plan rate**. At 25%
the assessment is worth ~$630 rather than $1,150, the bid target is wrong by nearly half, and
CAC blows through any ceiling you set.

Ordered by leverage:

### D1. One named student, one thing that changed ⏱ one conversation
"Sang at her sister's wedding after five months." "Passed a musical-theatre audition."
Plus written permission to print it. **Highest-value item on this entire list.**

### D2. Three to five before/after audio pairs ⏱ a few hours
Same material both times, true elapsed time stated, unrehearsed. The code seam already
exists (`STUDENT_CLIPS`). Vocal coaching is judged by ear; text cannot substantiate an
auditory claim.

### D3. A written release — get this before D2, not after ⏱ attorney, ~1 hour
Must name **audio, video, stills and voice** explicitly. California Civil Code §3344 lists
**voice separately** from name and likeness, with attorney-fee shifting either way. A
release signed by a 15-year-old is voidable (Fam. Code §6710) — **the parent must sign.**
Make it revocable on request and honour takedowns in 48 hours; §3344(a)(2) now allows a
two-business-day removal order.

### D4. Enrich the five existing reviews ⏱ 15 min
For each: discipline, months studied, online or in person, parent or adult learner.
Identity-descriptive detail is the one testimonial variable with real quantitative support.

### D5. An LA rate benchmark you will stand behind ⏱ 20 min
With a source and the date checked. $280/mo = $70/lesson is low-to-mid for LA — but the
page cannot say so without a citation, so **$280 is currently stated and never positioned.**

### D6. Her own audio, hosted ⏱ varies
So `/coach` need not send people to Spotify to hear her sing.

### D7. Media inventory spreadsheet ⏱ 30 min, then ongoing
Student · date · what was signed · **every URL where it is published.** Without it a
two-business-day takedown order cannot be met, and "I don't know everywhere it's posted" is
not a defence.

---

## E. California — operating correctly

### E1. Restructure the in-person schedule ⏱ 1 hour — **do this first**
LA permits teaching in a residence, capped at **one client visit per hour**, between
**8:00 a.m. and 8:00 p.m.**

- Back-to-back 30-minute lessons are **two visits per hour** — not allowed.
- A lesson running past 8 p.m. is not allowed. **This is the likely current breach**, since
  working adults want evening slots.
- **Online is uncapped.** Move evening and back-to-back demand there.
- ⏱ Check which zoning code governs the address on [ZIMAS](https://zimas.lacity.org/).

### E2. Read the lease ⏱ 15 min
Look for the use-of-premises clause. **Do not raise it with the landlord before getting
advice.** ⚠️ Realistic exposure is a 3-day notice to perform-or-quit demanding she stop
in-person lessons — with a cure right, not a surprise eviction.

### E3. General liability insurance ⏱ 1 hour · ~$230–600/yr
**Her renters policy almost certainly excludes this** — verified against filed policy
language and a published California opinion. Paid recurring instruction is a "business
pursuit"; an injured student in her apartment is probably uninsured.

**Buy abuse & molestation cover above the default $100k.** She teaches minors one-on-one in
a private residence with no witnesses. MTNA has a program; MTAC does not.

### E4. Register the LA Business Tax Registration Certificate ⏱ 30 min · tax $0
[latax.lacity.org](https://latax.lacity.org/businessregapp/eappreg_criteria). LA's own rate
table names **"music teacher"** explicitly.

⚠️ Tax is **$0** under the $100k small-business exemption — **but only if she registers and
renews.** Not registering does not make it zero; it makes it back tax plus penalties. **Put
February 28 in the calendar, annually.** The City actively data-matches Schedule C filings.

### E5. Get an EIN ⏱ 15 min · free
Not required, but it keeps her SSN off W-9s. Never pay a third party for this.

### E6. Google Business Profile ⏱ 45 min
**Service-area business with the address hidden.** ⚠️ Listing a residence as a storefront
risks suspension. Primary category "Singing Instructor", secondary "Music Instructor".
Service list is in `marketing/gbp-setup.md` (prices now reconciled against the rate card).

### E7. One hour with a California attorney ⏱ 1 hour
Highest-value questions, in order:
1. The **free-assessment stored-card flow** under the Automatic Renewal Law.
2. The **media release** for student recordings (voice, minors, revocation).
3. A read of the **privacy policy and terms** — both currently ship with a visible banner
   saying they have not been reviewed. That banner stays until someone has read them.

### E8. Free mandated-reporter training ⏱ 2 hours · free
[MandatedReporterCA.com](https://mandatedreporterca.com/), available in Spanish. She is
probably **not** a statutory mandated reporter — "A teacher" was deleted from the list
effective 2026-01-01 — but reporting is protected regardless and the certificate is a real
parent-facing trust signal.

### E9. Call TrustLine ⏱ 10 min · ~$143 if eligible
**1-800-822-8490.** Eligibility is genuinely unclear for a private instructor teaching in
her own home. If eligible it is the only fingerprint-based DOJ + FBI + Child Abuse Central
Index clearance available to her, and **parents can verify it by phone** — that
verifiability is the whole value.

⚠️ She **cannot** hand parents her own DOJ record: Penal Code §11125 makes *requesting* it a
misdemeanour. Do not offer it.

---

## F. Later, or when a trigger fires

| Item | Trigger |
|---|---|
| **Offline Conversion Import** — feed true LTV back to Google Ads | 30+ students |
| **Revalidate `ASSESSMENT_VALUE_USD`** ($1,150/$1,450) against real data | ~30 students. It is LTV × conversion rate — two unvalidated guesses multiplied |
| **Promote `slot_reserved` to a bid target** | Week 8, if under 10 real conversions/month |
| **Move Campaign 1 budget to Songwriting** | Week 8, if LA Local CPA exceeds $400 |
| **Form an LLC** | On/after 2027-01-01 — first-year tax is $400 instead of $800 |
| **Consider an S-corp** | Above ~$110k net profit. Below that it loses money |
| **A real Spanish landing page** | Six Spanish keywords currently point at an English page. Paid can buy those clicks; organic cannot rank |
| **Fix the heading outline** | Nine coaching pages have one H1 and one H2; section labels are styled `div`s, so the best content has no crawlable outline. Needs a CSS pass |
| **Content Security Policy** | Deliberately skipped — untestable without a browser, and a wrong one silently breaks analytics or booking |
| **`middleware` → `proxy` rename** | Next 16.3 deprecation warning on every build |
| **Prune Stripe payment methods** | Cosmetic only — dynamic payment methods already hide `blik`/`pix` etc. for USD |

---

## The three-item version

If nothing else gets done:

1. **A1 + A2** — GA4 Realtime check and referral exclusions. Without these the ad spend is unmeasurable.
2. **B1** — the Resend key. A failed payment currently alerts nobody.
3. **D1** — one named student and one thing that changed. Worth more than any campaign tuning.
