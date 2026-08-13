# marketing/

Launch-ready Google Ads and Google Business Profile artifacts. Nothing here is application
code and nothing here runs — these are files you import or follow.

| File | What it is |
|---|---|
| `google-ads/campaigns.csv` | 4 Search campaigns + 6 ad groups, with budgets, bid strategies, geo and language settings. |
| `google-ads/keywords.csv` | 62 keywords (29 exact, 33 phrase), each mapped to its landing page. |
| `google-ads/rsa-ads.csv` | 18 responsive search ads — 3 per ad group — with a machine-verified character count for every asset. |
| `google-ads/extensions.csv` | Sitelinks, callouts and structured snippets, with character counts. A **specification**, not a clean import (see §3). |
| `google-ads/negatives.txt` | The shared negative keyword list, grouped by why each term is excluded. |
| `gbp-setup.md` | Google Business Profile as a service-area business with the address hidden, plus the review engine. |
| `launch-checklist.md` | The gate sequence. Gate 0 blocks all spend. Read this first. |

**Read `launch-checklist.md` before importing anything.** It contains two blockers that must
be cleared first: a Consent Mode setting in `components/SiteAnalytics.tsx` that currently
prevents Google Ads from attributing any conversion, and five landing pages that do not exist
yet.

---

## 1. What I could not verify — read before importing

**I had no access to a Google Ads account or to a Google Ads Editor install, and I did not
verify these column headers against a live Editor import.** The schema below is modelled on
the shape of Editor's whole-account CSV export (one row per entity, one wide column set,
blank cells where a column does not apply to that row type). That shape is right. Several
individual header strings and enum values may not be.

So do not paste these into a production account and hope. **Do this instead — it takes five
minutes and removes the entire class of problem:**

1. Open Google Ads Editor against the (empty) account.
2. `Account → Export → Export whole account (CSV)`.
3. Open the export. Its headers are, by definition, the headers Editor accepts.
4. Rename my headers to match, then use `Account → Import → From file`, or paste into
   `Make multiple changes`.
5. Editor's import dialog also lets you map or skip unrecognised columns by hand. Use it —
   it previews every change before applying, so nothing lands silently.

### The specific headers and values I am unsure about

| Where | What I wrote | Concern |
|---|---|---|
| `keywords.csv` | `Match Type` | Editor's native header for this is, I believe, **`Criterion Type`**, with values `Broad` / `Phrase` / `Exact`. The task specified `Match Type`, so that is what ships. Rename it, or map it in the import dialog. |
| `keywords.csv` | bare keyword text | Keyword text is written **plain**, with the match type in its own column — not as `[exact]` / `"phrase"`. Supplying both is how you end up with a keyword whose literal text includes brackets. If you switch to bracket/quote syntax, delete the match-type column. |
| `campaigns.csv` | `Budget` | May need to be `Campaign Daily Budget`. Values are **daily** dollars, not monthly. |
| `campaigns.csv` | `Bid Strategy Type` | Value strings `Maximize conversions` / `Maximize clicks` — capitalisation and exact wording unverified. |
| `campaigns.csv` | `Max CPC` on the Brand row | For Maximize Clicks the CPC ceiling is a *bid limit*, which is probably a distinct column, not `Max CPC`. If it will not import, set the $2.00 ceiling by hand in the web UI. |
| `campaigns.csv` | `Networks` = `Google search` | The semicolon-separated form (`Google search;Search Partners;Display Network`) is what I recall from Editor exports. **Whatever happens, confirm in the UI that Search Partners and Display are OFF** — this is the single most costly setting to get wrong, so verify it visually rather than trusting the CSV. |
| `campaigns.csv` | `Radius` / `Radius Units` / `Latitude` / `Longitude` | Proximity targeting in Editor is its own criterion type and may not be settable from a campaign row at all. **Recommendation: set the 15-mile radius in the web UI by hand.** It is one control, once. |
| `campaigns.csv` | `Location Target Type` = `Presence` | Header almost certainly wrong; the setting is real and important. Set it in the UI: *Locations → Location options → **Presence: people in your targeted locations***. |
| `campaigns.csv` | `Campaign Subtype` = `Standard` | Unverified enum. May need to be blank or `All features`. |
| `campaigns.csv` | `Final URL Suffix` | The column exists in the platform; the ValueTrack string itself (`{campaignid}`, `{creative}`, `{keyword}`) is correct. |
| `rsa-ads.csv` | `Ad Type` = `Responsive search ad` | Unverified enum string. |
| `rsa-ads.csv` | `Ad Name` | **Not a real Google Ads field.** RSAs have no name. It is there so a human can tell the three ads in an ad group apart. **Delete this column before import.** |
| `extensions.csv` | everything | See §3. Do not attempt to import it. |

Nothing in `negatives.txt` or `gbp-setup.md` depends on any of this — those are paste-and-go.

### Encoding

All CSVs are UTF-8 without BOM. They contain accented characters in the Spanish ad copy
(`Español`, `Años`, `Evaluación`) and in the brand keyword `juliana beltrán`. If any of those
import as mojibake, re-save as UTF-16LE tab-delimited, which Editor also accepts. **Do not
strip the accents** — `Anos` instead of `Años` means something entirely different and would
run as live ad copy.

---

## 2. Import order

Order matters: a keyword cannot be created before its ad group, and an ad cannot be created
before its campaign.

```
1. campaigns.csv     campaign rows first, then the ad group rows in the same file
2. keywords.csv
3. rsa-ads.csv       delete the trailing count columns + "Ad Name" first — see below
4. extensions.csv    by hand in the web UI, not by import
5. negatives.txt     Shared library > Negative keyword lists
```

Then `Post` from Editor, and re-check in the web UI: budgets, Search-Partners-off,
Presence targeting, the 15-mile radius, and that only `Search - LA Local` is Enabled.

### Columns to delete before importing `rsa-ads.csv`

- `H1 Chars` … `H15 Chars`, `D1 Chars` … `D4 Chars` — my verification columns.
- `Ad Name` — not a Google Ads field.
- `Comment (delete before import)` — per-ad rationale.

`campaigns.csv` has one such column too: `Comment (delete before import)`.

### About those character counts

Every headline and description in `rsa-ads.csv` was generated and validated by a script that
**fails rather than truncates**. Verified maxima across all 18 ads: longest headline **29
characters** (limit 30), longest description **85** (limit 90).

This matters more than it looks. **Google silently drops an over-length headline** — no
warning, no error, the asset simply never serves. An ugly headline you can see is strictly
better than a good one that was discarded. The counts ship in the file so the next person to
edit the copy can re-check by hand instead of trusting the limit.

If you edit the copy, re-verify. In a spreadsheet: `=LEN(I2)` next to each asset.

Inventory: **18 RSAs, 255 headline slots filled (127 distinct strings), 72 descriptions.**
Reuse across ad groups is deliberate — the offer headline and the mode-clarity headline
should appear in every ad, because they are the two things every visitor needs to know.

---

## 3. `extensions.csv` is a specification, not an import file

Google Ads assets (sitelinks, callouts, structured snippets) are a separate entity type from
campaigns and ads, they live at account, campaign or ad-group level, and Editor's import
format for them is the part of the schema I am least confident about. Rather than invent
headers that will fail, the file uses a plain long format — one row per field, with the field
name, the text, its character count and the platform limit — that you type into the UI.

There are 4 sitelinks, 6 callouts and 1 structured snippet set. Manual entry is about ten
minutes and carries zero import risk.

Verified against the platform limits: sitelink link text ≤ 25, sitelink description lines
≤ 35 each, callout text ≤ 25, structured snippet value ≤ 25.

### Two assets deliberately omitted, and why

- **Location assets. Never add one to this account.** A location asset publishes an address,
  a map pin or a distance-to-you. Lessons happen in a private residence. Do not add a
  location asset, do not add affiliate locations, and do not link the Google Business Profile
  to this ads account.
- **Call asset — deferred.** No business phone line is documented in the repo. Add one only
  with a number she is willing to publish; do not use a personal mobile.

---

## 4. Structure at a glance

| Campaign | Budget | Geo | Landing page | Launch |
|---|---|---|---|---|
| `Search - LA Local` | $500/mo · $16.44/day | LA + 15 mi radius, Presence | `/vocal-coach-los-angeles` | **Now** |
| `Search - Songwriting US` | $250/mo · $8.22/day | US, LA excluded | `/online-songwriting-lessons` | After gate 5 |
| `Search - Online Voice US` | $150/mo · $4.93/day | US, LA excluded | `/online-singing-lessons` | After gate 5 |
| `Search - Brand` | $50/mo · $1.64/day | US | `/` | After gate 5 |

$16.44 + $8.22 + $4.93 + $1.64 = **$31.23/day × 30.4 = $949.39/mo**. Google Ads budgets are
daily and monthly spend is capped at daily × 30.4, which is where those decimals come from.

Ad groups: `LA Vocal Coach` (12 kw) · `LA Singing Lessons` (10) · `LA Clases de Canto ES` (9)
· `Songwriting` (11) · `Online Voice` (11) · `Brand` (9).

**Search only. No Display, no Discovery, no Performance Max.** At $16/day PMax would spend
the whole budget on cheap Display and YouTube placements before it accumulated enough
conversions to learn anything — you would fund the education and never receive it. This is
not a phase-one caution; it holds for as long as the budget is this size.

Every ad group sends traffic to its own landing page. **Only Campaign 4 (Brand) points at the
homepage.**

---

## 5. Copy decisions worth knowing before you edit anything

**No premises. This is the constraint that most easily breaks.** In-person lessons happen in
Juliana's apartment. There is no studio. So nothing in any ad, extension, sitelink or GBP
post says "our studio", "visit the studio", "the Mid-City studio", or names a neighbourhood,
an address or a drive-time. Mode clarity is always **"online or in person in LA"** — never
"in-person studio". If you write new copy, this is the rule to check it against first.

**Bilingual is the lever, not a footnote.** She genuinely teaches in Spanish, and almost no
competing LA vocal coach advertises in it. Hence a dedicated Spanish ad group with three
Spanish RSAs, a Spanish callout, and a Spanish-language post in the GBP rotation. Note that
**language targeting in Google Ads is campaign-level, not ad-group level**, which is why
`Search - LA Local` targets `English;Spanish` as a whole.

**Voice AND songwriting is the differentiator.** Every competitor teaches voice. Very few
teach voice and songwriting with the same coach, and none of them tour as a working artist
while doing it. That combination carries the headline set.

**Every claim in the ad copy traces to a source file.** $85 / $280 / $360 and "cancel anytime"
come from `content/pricing.json` and the Stripe Portal config. "Toured with Amanda Miguel",
"Spotify editorial", "ages 5 to 70+" and the six disciplines come from `content/coach.json`
and the live site. Nothing was invented for the ads, and nothing should be.

---

## 6. Where I departed from the source brief, and why

1. **"Studio" removed everywhere.** The source brief used "studio" throughout — "in-person
   studio", "studio in Mid-City". That was wrong and it is corrected here. There are no
   premises, so no ad, extension or GBP post implies one.
   I re-audited the app while writing this, and the two misleading strings the plan flagged
   have **already been fixed**: `app/(coach)/coach/voice-lessons-los-angeles/page.tsx` now
   reads "In-person lessons happen one-to-one in Los Angeles", and `lib/schema.ts` has
   replaced "Weekly one-to-one sessions at the Mid-City studio" and documents why
   `streetAddress`, `geo` and `openingHours` must never be added. Surviving uses of "studio"
   in the app (`app/page.tsx` "the studio, where I teach", "Studio inquiry", and the artist
   side's recording-studio sense) are the practice sense and assert no premises — leave them.
   Re-run the audit before launch, since the ads point at these pages:
   `grep -rniE 'studio|mid-city|address' app components lib content`.
2. **Kids/teens negatives dropped.** The brief's list included `kids near me`, `kids`,
   `children`, `teens`. She teaches ages 5 to 70+ (`content/coach.json`, `/coach/faq`), so
   those negatives would block a real, well-converting segment. Everything else from the
   brief's list stands. Do not add them back.
3. **"Geo: US excluding the Campaign 1 radius" is not implementable as written.** Google Ads
   can exclude named locations but **not** a proximity radius. Campaigns 2 and 3 therefore
   target the US and exclude the *city* of Los Angeles, which is the closest supported
   approximation. Documented in the campaign row comments.
4. **The negative list is a shared list on Campaigns 1–3, not a true account-level list.**
   Applied account-wide it also filters brand queries — "juliana beltran free lesson",
   "juliana beltran youtube" — which are the cheapest conversions in the account. Reasoning
   in `negatives.txt`.
5. **Three brief negatives will over-block, and are flagged rather than silently changed.**
   `free` blocks people searching for the exact free offer being sold; `school` blocks "high
   school singing lessons"; and `audition` directly contradicts the account's own "Audition
   prep" structured snippet and the audition-prep service in `content/coach.json`. All three
   ship as specified, with narrower alternatives written out and a week-2 review task in the
   launch checklist.
6. **Match types chosen to limit collateral damage.** `the voice` is a *phrase* negative, not
   broad. As a broad negative it blocks any query containing both "the" and "voice" — which
   would kill "who is the best voice teacher in los angeles". Same reasoning for
   `"how to sing"`, `"american idol"`, `"piano tuning"`, `"guitar repair"`.
7. **The review-request cron does not exist yet.** The brief describes it as already
   implemented. It is not: there is no `app/api/` directory in the repo and `vercel.json`
   contains only `redirects` and `headers`. `gbp-setup.md` references the planned path
   (`app/api/cron/review-requests/route.ts`) and states plainly that the ask is manual until
   Phase 3 ships.
8. **Consent Mode blocks Google Ads attribution today.** Not mentioned in the brief at all.
   `components/SiteAnalytics.tsx` sets `ad_storage: 'denied'` and `ad_user_data: 'denied'` by
   default. That was correct for an analytics-only site; with ads running it means `gclid` is
   never stored and conversions cannot be attributed to clicks, and Enhanced Conversions
   cannot work. Gate 0.9 in `launch-checklist.md` specifies the fix. **This is a launch
   blocker, and it is app code, so it was not changed from here.**
9. **The Spanish ad group points at an English landing page.** There is no Spanish page, so
   `LA Clases de Canto ES` sends Spanish searchers to `/vocal-coach-los-angeles`. That hurts
   both Quality Score and conversion rate. It is honest to run — she does teach in Spanish —
   but a `/clases-de-canto-los-angeles` page, or at minimum a Spanish section on the LA page,
   is the highest-value follow-up work in this whole set of files.
10. **Target CPA at this volume is directional, not precise.** The brief's week-5 switch to
    $250 tCPA is kept, but Google wants roughly 30 conversions per 30 days for a stable
    target and this campaign will produce single digits. The checklist says what to do when
    that shows up, including when to revert.
11. **Brand campaign uses Maximize Clicks with a $2 CPC ceiling**, not a conversion strategy.
    $50/mo of brand traffic cannot teach Smart Bidding anything, and a ceiling is what stops
    a competitor bidding war from consuming the budget.
