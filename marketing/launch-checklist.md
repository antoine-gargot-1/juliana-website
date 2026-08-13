# Google Ads launch checklist

Gated and ordered. **Nothing below gate 0 spends money until gate 0 passes.**

Total committed budget: **$950/mo**, all Search, one campaign live at a time to start.

---

## Gate 0 — tracking, verified. Hard blocker on all spend.

Launching without verified conversion tracking wastes the first month's budget **and teaches
Smart Bidding nothing**, which is the more expensive half: Maximize Conversions with no
conversion signal degrades to buying whatever clicks are cheapest, and the month of data it
accumulates is not a head start, it is noise you then have to unlearn.

- [ ] **0.1** All four Stripe webhook conversions replayed with `stripe trigger` and confirmed
      landing in **GA4 DebugView** — `assessment_booked`, `plan_started`, `pack_purchased`,
      `retained_student`.
- [ ] **0.2** For each: correct `value`, correct `currency`, and a real `client_id`.
      **`(not set)` is a failure, not a warning.** It means the server-side event had no
      session to attach to, so Google Ads will never connect it to a click.
- [ ] **0.3** `utm_source` / `utm_medium` / `utm_campaign` present on the conversion events,
      arriving via the `sessionStorage` latch in `lib/analytics.ts`.
- [ ] **0.4** GA4 property linked to the Google Ads account, and all four imported as
      conversion actions.
- [ ] **0.5** `assessment_booked` set to **Primary**. `plan_started` and `pack_purchased` set
      to **Secondary**. Secondary conversions are reported but not bid on — which is exactly
      right, because bidding on `plan_started` would optimise against an event that happens
      weeks after the click.
- [ ] **0.6** `assessment_booked` value = **"Use the value from the event"**, not a fixed
      value. The value differs by mode ($1,150 online / $1,450 in-person, from
      `ASSESSMENT_VALUE_USD` in `lib/pricing.ts`) and a fixed value would erase that.
- [ ] **0.7** Count setting = **One**, not Every. One person booking one assessment is one
      conversion.
- [ ] **0.8** **Auto-tagging ON** in Google Ads (`Settings → Account settings → Auto-tagging`).
      Without `gclid` there is no click-to-conversion join at all.

### 0.9 — Consent Mode blocker. Found in the code; must be fixed before launch.

`components/SiteAnalytics.tsx` currently boots Consent Mode with:

```js
gtag('consent','default',{ ad_storage:'denied', ad_user_data:'denied',
                           ad_personalization:'denied', analytics_storage:'granted' });
```

That was the correct posture for a site doing analytics and no advertising. **It is not
compatible with running Google Ads.** With `ad_storage: 'denied'` the Google tag cannot write
the `_gcl_*` cookie, so the `gclid` from an ad click is never stored, and conversions arrive
with no click to attribute them to — they degrade to modelling or vanish. `ad_user_data:
'denied'` separately disables Enhanced Conversions, which is the mechanism that recovers the
Safari/ad-blocker share the plan is counting on.

- [ ] **0.9** Required change (Phase 3, app code — deliberately not made from this
      marketing-only work): grant `ad_storage` and `ad_user_data` by default, keep
      `ad_personalization: 'denied'` since there is no remarketing, and add a region-scoped
      `denied` default for the EEA/UK so the current privacy posture is preserved where it is
      legally required. Then re-run 0.1–0.8.

### 0.10 — landing pages must exist and return 200

Every Final URL in `google-ads/keywords.csv` and `google-ads/extensions.csv` must return 200
on `https://www.juliana-beltran.com` (the `www` host — the apex 308-redirects, and a redirect
in a Final URL is a policy problem and a wasted hop).

At the time of writing, **these do not exist yet** (Phase 4):

```
/vocal-coach-los-angeles        ← Campaign 1 destination, all three ad groups
/online-songwriting-lessons     ← Campaign 2 destination
/online-singing-lessons         ← Campaign 3 destination
/coach/pricing                  ← sitelink
/coach/book                     ← sitelink + GBP appointment link
```

- [ ] **0.10** All five live, 200, mobile-tested, with the free-assessment CTA above the fold.

---

## Gate 1 — Campaign 1 only

Import order: campaigns → keywords → ads → extensions → negatives. Details in
`google-ads/README.md`.

- [ ] **1.1** `Search - LA Local` **Enabled**. `Search - Songwriting US`,
      `Search - Online Voice US` and `Search - Brand` **Paused**. The CSV ships them paused;
      keep them that way.
- [ ] **1.2** Search Network only. **Search Partners OFF. Display Network expansion OFF.**
- [ ] **1.3** No Performance Max campaign exists in the account, and no one creates one.
      At $16/day PMax would spend the entire budget across cheap Display and YouTube
      placements before it gathered enough conversion data to learn anything — you would pay
      for the education and never receive it. Same reasoning rules out Display and Discovery.
      **Search only, for the whole account, indefinitely at this budget.**
- [ ] **1.4** Location targeting set to **Presence** ("people in your targeted locations"),
      not "presence or interest". Interest-based targeting on a local campaign buys clicks
      from people in other states reading about LA.
- [ ] **1.5** Bid strategy: **Maximize Conversions, no target CPA**. Weeks 1–4.
- [ ] **1.6** Ad schedule: all hours. Do not day-part before there is data; at this volume
      day-parting removes impressions and adds no information.
- [ ] **1.7** Check ad approvals within 24 hours of launch. Specifically watch the headlines
      naming **Amanda Miguel** — a third-party name can trip the trademark filter even when
      the claim is factual. `Toured With a Latin Star` is already in the rotation as the
      drop-in replacement; if disapproved, remove the named headlines and file the appeal
      with evidence of the touring credit.

### The budget arithmetic, so expectations are calibrated

This is arithmetic on assumed inputs, not a forecast. **The CPCs and rates below are
placeholders to be replaced with real data after week 2.**

```
$500/mo  = $16.44/day
If CPC lands at $5.00  → ~3.3 clicks/day → ~100 clicks/month
If 5% of those book    → ~5 booked assessments/month → ~$100 per booked assessment
If 2% of those book    → ~2 booked assessments/month → ~$250 per booked assessment
```

Two things follow. First, the $250 target CPA is a *ceiling*, not a goal. Second, at
2–5 conversions a month this campaign will sit far below the ~30-conversions-per-30-days
that Smart Bidding wants for a stable Target CPA — see gate 2.

---

## Gate 2 — bidding schedule

| When | Strategy | Rule |
|---|---|---|
| Weeks 1–4 | **Maximize Conversions, no target** | Gather data. Do not touch it. It will spend the full daily budget; that is what it is for. |
| Week 5+ | **Target CPA, $250** | $250 = cost per *booked assessment*, not per student. |
| Ongoing | Target CPA adjustments | **Never more than once per two weeks. Never by more than 20%.** |

$250 ± 20% means one move is $200 or $300. Then wait two full weeks. The reason is
mechanical, not stylistic: each change re-enters the learning period, and a campaign
producing a handful of conversions a month needs every one of those two weeks to say
anything statistically. Adjusting weekly means the strategy is permanently learning and
never optimising.

**Honest caveat on Target CPA at this volume.** Google's guidance is roughly 30 conversions
in 30 days before Target CPA is reliable; this campaign will likely produce single digits.
So treat the switch at week 5 as directional, and if impressions collapse after it, the
target is below what the auction will bear — raise it once, by 20%, and wait. If it is still
starving two weeks later, go back to Maximize Conversions and stay there until volume grows.
Reverting is not a failure; forcing a target onto data that cannot support it is.

**Do not use Target ROAS.** It needs the same volume plus meaningful variance in conversion
value, and there are exactly two values here ($1,150 and $1,450).

---

## Gate 3 — the weekly ritual, first 8 weeks

Wasted spend at $16/day is fatal, not merely inefficient. One junk term at $6 a click eats a
third of the day's budget.

Every week, same order, 20 minutes:

- [ ] **3.1** Search terms report, last 7 days, sorted by cost. Read **every** term.
- [ ] **3.2** Add negatives aggressively. When unsure, exclude — a wrongly excluded term
      costs one keyword you can add back; a wrongly kept junk term costs money every week.
- [ ] **3.3** Any search term that converted and is not already a keyword: add it as exact in
      the right ad group.
- [ ] **3.4** Check the three terms flagged in `google-ads/negatives.txt` under "will cost you
      traffic" — `free`, `school`, `audition` — against Search Terms. Narrow them if the
      report supports it. **Do this at week 2**, not later; `audition` is blocking a service
      the account actively advertises.
- [ ] **3.5** Geographic report: any spend outside the 15-mile radius means the Presence
      setting is wrong.
- [ ] **3.6** Check the assessment **show rate**. A booked assessment nobody attends is a paid
      conversion with zero value, and it will train bidding toward more of the same.
- [ ] **3.7** After week 2, replace the placeholder CPC and booking-rate numbers above with
      the real ones.

From week 9: same review, fortnightly.

---

## Gate 4 — why the conversion value is $1,150 / $1,450 and not $280

`assessment_booked` reports **$1,150 online / $1,450 in-person**
(`ASSESSMENT_VALUE_USD`, `lib/pricing.ts`), derived as LTV × assessment-to-plan rate:

```
online    $2,520 × 0.45 = $1,134  → $1,150
in-person $3,240 × 0.45 = $1,458  → $1,450
```

Feeding the first month's $280 instead is the tempting mistake, because it sounds like the
conservative and honest choice — it is the cash that actually arrives. It is also the one
that loses money.

Smart Bidding optimises toward whatever you tell it a conversion is worth. Tell it $280 and
it will hunt for whoever converts most cheaply *right now*, which is the price-shopping
one-off buyer who takes a lesson and leaves. **Breakeven here is roughly two months of
retention.** A cohort of one-month buyers is unprofitable at *any* CPA, so a bid target
built on the first invoice optimises the account into losing money more efficiently. The
target has to reflect retained value.

The opposite error is $0 (or no value at all): bidding then cannot tell a booked assessment
from a bounce and reverts to buying clicks.

These are estimates and they are labelled as such in `lib/pricing.ts`. Revisit once ~30
students have passed month 3; at that point Offline Conversion Import
(`scripts/offline-conversions.ts`) starts feeding true outcomes back and the estimate stops
mattering.

---

## Gate 5 — Campaigns 2–4

Only after **Campaign 1 shows a workable CPA** — a real cost per booked assessment under
$250, over a minimum of 4 weeks *and* at least 5 booked assessments. One cheap conversion in
week 2 is not a workable CPA.

Then, in this order, one at a time, two weeks apart:

1. [ ] **Campaign 4 — Brand ($50/mo).** First, because it is the cheapest and most certain
       conversion volume in the account and it stops a competitor bidding on her name.
       Watch impression share; if a competitor appears, the CPC ceiling may need lifting.
2. [ ] **Campaign 2 — Songwriting ($250/mo).** Lowest competition in the account, so the best
       expected CPA. Watch `learn to write songs` specifically — it is the most
       informational-intent keyword in the set and the first candidate to pause.
3. [ ] **Campaign 3 — Online Voice ($150/mo).** Most contested. Start small, scale **only**
       if CPA holds for four weeks.

Never send ad traffic to the homepage except Campaign 4.

---

## Success metrics

| Metric | Target | Where it comes from |
|---|---|---|
| Cost per booked assessment | **< $250** | Google Ads, `assessment_booked` |
| Assessment show rate | **> 85%** | Cal.com attended vs booked |
| Assessment → plan | **> 45%** | Stripe subscriptions ÷ assessments delivered |
| All-in CAC | **< $600** | (ad spend + tooling) ÷ students started |
| Month-3 retention | **> 70%** | paid invoices per customer, from Stripe |
| Blended Stripe take rate | **< 3.5%** | Stripe fees ÷ gross volume. Driven by ACH share on monthly plans. |

Read them together, not individually. A $150 CPA with a 60% show rate is worse than a $250
CPA at 90%, and the first three metrics multiply into cost per *student*, which is the number
that has to sit under $600.

### Kill criteria

- **Zero booked assessments after a full $500 month, with clean search terms.** The problem
  is the landing page or the offer, not the bid. Pause Campaign 1, fix the page, relaunch.
  Do not raise the budget to "give it a chance".
- **Show rate under 60%.** Stop and fix reminders and the card-hold copy before spending
  another dollar; you are paying for conversions that produce nothing.
- **Cost per booked assessment above $400 at week 8** with correct tracking and clean search
  terms. LA voice terms may simply be unwinnable at this budget — move the money to
  Campaign 2, where competition is lowest.
