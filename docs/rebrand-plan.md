# Rebrand plan — readable type, and a site that actually argues for the lessons

## Why

Two complaints from the operator, both correct, both now measured rather than assumed:

1. **"The font is too fancy — hard to read for parents and older adults."**
2. **"There might be no incentive to buy classes."**

Lesson buyers here are mostly parents booking for a child and adults over 40 returning to
music. That audience is the one the current type system fails hardest, and the current page
structure never makes them an argument.

### The evidence

**Type.** Both text faces are display faces by their designers' own published descriptions —
Italiana: *"designed for use in the headlines of newspapers and magazines"*; Cormorant:
*"a free display type family"*. They are carrying body copy, FAQ questions, form labels and
prices.

- Cormorant's x-height is **0.386 em**, smallest of any text-intent serif measured (Literata
  0.508). 18px Cormorant renders a 6.95px x-height; matching 18px Literata would need
  **23.7px**. It is a quarter smaller than it looks, at every weight, with no optical-size
  axis to compensate.
- Italiana's hairline at 22px — the `.brand` and every FAQ question — is **0.18px**. It cannot
  be rendered as ink, so it antialiases to pale grey and the contrast ratio computed from the
  hex values is fiction.
- **No element on the site reaches the fluent-reading floor** of 0.2° angular x-height
  (Legge & Bigelow 2011). The largest body text hits 0.164°; `form .submit-note` reaches 0.099°.
- Contrast, computed from the oklch tokens: `--muted` **3.88:1** and `--gold` **1.82:1** both
  fail WCAG AA for text, and both carry real text. 43 font-size declarations sit below 16px;
  38 declarations set `font-weight: 300`.
- Worst single line: `styles.css:902`, `form .submit-note` — 12px Cormorant *italic* at weight
  *300* in `--muted`. Thickest stroke ≈0.49px.
- Both faces default to **old-style figures** and the CSS never opts out, so `.choice-price`
  renders zeros 5.8px tall and `.show-day` renders "12" a fifth shorter than "13". Inconsistent
  numeral heights on prices and dates.
- Mechanism is age-specific: high-spatial-frequency contrast sensitivity — exactly what
  hairlines and small x-heights are made of — begins declining at 40–50 (Owsley et al. 1983),
  and 88.9% of US adults 45+ are presbyopic (Fricke et al. 2018).

**Selling.** The site can sell; it never argues.

- `/coach` renders **no price, no description of what a lesson is, and no purchase path.**
  Verified: one import of `ASSESSMENT`, zero rendered numbers.
- The nav item labelled **"Lessons" points at `/coach/services`** — no price, no proof, no
  testimonial, no video. The highest-intent dead end in the nav.
- `/coach/lessons/online` and `/coach/lessons/in-person` are the only pages that combine proof →
  mechanics → rates → buy. They appear **0 times in the nav** and only in the footer.
- The only mid-page solid button on `/coach` is an **exit link to Spotify** (line 195), sitting
  on a 420px iframe between the hero and the close.
- The two strongest risk-reversal facts — the free month-long pause, and the first bill landing
  a week *after* the assessment — exist only inside the FAQ accordion. Meanwhile the first thing
  under the pricing CTA is `PURCHASE_NOTE`: **"Paid in full now."** Risk stated, reversal hidden.
- `/coach/pricing` — the page that asks for $900 — carries **zero** testimonials, video or credits.

**Voice.** 73 uncontracted forms against 24 contractions (**3.04:1**), and the distribution is
the tell: the most *personal* pages avoid contractions most while the transactional ones use them
freely. That is backwards from how a person writes, and it is what makes the prose read as carved
rather than said. Hedged unfalsifiable copy is not merely weak — deception judgments correlate
with impressions of incompetence (Hartwig & Bond 2011), so "helping students feel confident,
connected, and inspired" patterns with how readers detect a liar.

## Decision: refinement, not redirection

Keep the bones, the palette's dark tokens, the warm paper, the asymmetric editorial layout, and
Pinyon Script exactly where it is. Replace the two display-faces-doing-text-work, fix the two
failing colour tokens, and restructure `/coach` so it argues.

Rationale: Playfair at hero sizes measures **7.70–9.45:1** stroke contrast — matching Italiana's
8.47, so the dramatic register survives — with hairlines **3× thicker at every size**, real
italics, and optical sizing. The site will still look like itself. A full visual redirection
would risk the live funnel for no measured gain.

**Non-negotiable: the `/coach/pricing` type system is already correct** — sans at 16–17px,
weight 400–600, `--ink`/`--ink-soft`, 48px targets, 54ch/66ch measures. The job is extending it
to the other 1300 lines, not replacing it.

---

## Workstream 1 — Type system and tokens

Owns: `app/fonts.ts`, `app/fonts.css`, `app/styles.css`. **Sole owner of the stylesheet.**

- Display → **Playfair** (`axes: ['opsz','wdth']`, normal + italic). **Hard floor: ≥28px only.**
  Playfair's x-height is 0.414 em; it is display-only too.
- Body → **Literata** (`axes: ['opsz']`, 400/500/600 + italic). x-height +31.6% vs Cormorant;
  opsz 7–72 drops contrast to 1.51 at caption sizes.
- UI → **keep Manrope** (x-height 0.540, metrically fine). Its problem was weight 300 at 11.5px,
  not the face.
- Script → **keep Pinyon Script**, unchanged, in its two existing places.
- `font-variant-numeric: lining-nums` globally; `tabular-nums` on prices, dates and timecodes.
- Minimum weight **400** everywhere (Bernard et al. 2013: −23.3% reading speed at both thinnest
  and thickest strokes — the fix for older eyes is size and contrast, not bold).
- Body **19px / 1.6**, measure **60–70ch**, letter-spacing ceiling 0.12em and never on lowercase.
- Convert the type scale to **rem** — everything is px today, so a reader who raises their
  browser font size gets nothing.
- Token fixes: `--muted` → `oklch(0.497 0.012 60)` (5.50:1); add `--rule-strong`
  `oklch(0.630 0.012 70)` (3.2:1) for form borders and control edges; add `--accent-text`
  `oklch(0.46 0.09 45)` (6.67:1). Simplest correct move for text is to prefer `--ink-soft` (9.08:1).
- Remove `* { -webkit-font-smoothing: antialiased }` — it thins already-sub-pixel strokes, and
  W3C's own draft method warns against it.
- Promote `.eyebrow` to `--ink-soft`, 14px, weight 600, tracking ≤0.08em — ~150 instances, and
  the repo's own comment at `styles.css:1666` already documents that it fails AA everywhere the
  `.page-plain` opt-in does not reach.

## Workstream 2 — `/coach` restructure and navigation

Owns: `app/(coach)/coach/page.tsx`, `components/coach/CoachNav.tsx`, `components/coach/CoachFooter.tsx`.

New section order, replacing "hero → marquee → I-teach-because-I-love-it → what I teach →
Spotify → why work with me → press → carousel → CTA" (sections 3–7 are all about Juliana; none is
about the lesson, the price, or the week):

1. **Hero** — outcome, who it is for, format, and the price floor in one glance. Two CTAs using
   the existing labels.
2. **Playable proof immediately** — `VideoFacade` with `BOOKING_LIVE_VIDEO`. Coaching is bought by
   ear and the home page currently asks people to leave to hear anything.
3. **What a lesson actually is** — the missing section. 60 minutes one-to-one; live accompaniment;
   a recording of your own exercises; two or three written notes; English or Spanish; four lessons
   a month, your slot held. Every line already exists in `HOW` and `plain-points`.
4. **Two doors, in-page** — "For yourself" / "For your child", in each buyer's own information
   order. Not an interstitial; role-based routing as secondary structure only.
5. **Prices in full** — `PriceGrid`, buyable or `buy={false} purchaseHref="/coach/pricing"`.
6. **Risk reversal, positively framed, one block** — five facts, all already true, all currently
   hidden.
7. **Reviews as a static grid** — all five, with stars, names and dates.
8. **Credits, compressed** — performing work as a badge, not a gallery.
9. **Objections in open text** — the three or four that block a sale, readable without a click.
10. **Close** — one CTA, same label as the hero's.

**Demote the Spotify iframe and remove its `btn--solid`.** Nav: `/coach/lessons/*` must be
reachable; "Lessons" must not point at a page with no price.

## Workstream 3 — Risk reversal and proof at the point of sale

Owns: `components/coach/PriceGrid.tsx`, `app/(coach)/coach/pricing/page.tsx`,
`app/(coach)/coach/lessons/{online,in-person}/page.tsx`, `app/(coach)/coach/songwriting/page.tsx`.

- **Expand `PurchaseFacts` from three to five** — add the one-month pause and the week-delayed
  first bill. This block is the best-placed element on the page and is missing the two best facts.
- Put risk reversal **adjacent to `PURCHASE_NOTE`**, positively framed.
- Add **one proof block under the cards** — two named reviews plus one credit line.
- Reframe the secondary CTA: "Not ready to pay?" is negative framing on the buyer's ability.
- **Fix the accompaniment claim** at `lessons/online/page.tsx:39`. "tempo and key move with your
  voice in real time" is not achievable over consumer video — ensemble synchronisation needs
  ~8–25ms and consumer round-trip is well above 30ms. On the page whose job is establishing that
  online works, this is the sentence that costs the most credibility.
- Add the **honest online-vs-in-person block**: memorisation, rhythm and diction transmit well;
  dynamics, resonance and tone need the room (387 pedagogues, *Journal of Voice*). Plus the
  unused argument for the 40+ buyer — online means your own house with the door shut, which for
  someone afraid of being heard is an advantage, not a compromise.
- Keep the tier-card layout, the computed savings, the round-down free-lessons rule, the
  adjacency assertion, and the refusal to fake "most popular". All of it is right.

## Workstream 4 — Voice and copy

Owns: `content/coach.json`, `app/(coach)/coach/{about,faq,services,contact}/page.tsx`,
`app/(landing)/**`, `app/page.tsx`.

- **Use contractions where they sound natural.** Cheapest edit in the report; touches nearly
  every page.
- **Ban**: elevate, unlock, delve, seamless, robust, "in today's fast-paced world", "it's not
  just X, it's Y", "whether you're A or B", utilize, and the triadic-list-everywhere cadence.
  Replace hedged symmetry with one specific fact.
- **Gloss the jargon** once each: prosody, object writing, calibrated, ear training, resonance,
  range extension, vals. A parent who is not a musician does not know what object writing is.
- **Plain lede above richer prose**, not flattened prose — WCAG 3.1.5 is satisfied by a summary
  alongside, so her longer personal writing can stay.
- **Numbers move belief, stories move action.** Keep the aggregate rating and a named student's
  sentence in different places, not side by side.
- Fix `/coach/book:33` — "Two questions and a calendar" against a form asking ~8 fields plus a
  card. That expectation violation lands at the moment of highest anxiety.
- **"7 years teaching" is nowhere in the repo.** It cannot be rendered until it exists in
  `content/coach.json`.

## Workstream 5 — Accessibility and structured data

Owns: `components/coach/TestimonialCarousel.tsx`, `lib/schema.ts`.

- Replace the carousel with a **static five-review grid**. It currently auto-rotates every 7000ms
  and shows one quote with no stars; its dot control is a `role="button"` measuring **28×1px**,
  failing WCAG 2.5.8 (24×24 minimum), with an inactive colour at 1.29:1.
- `aggregateRatingSchema()` is attached to **five nodes** including `localBusinessSchema`.
  Google disallows self-serving review markup on LocalBusiness/Organization. Rich-result risk —
  keep it on `Service`, remove from the business node.

---

## What only Juliana can supply

Nothing here can be written from the repo. Ordered by leverage.

1. **Student before/after audio, 3–5 pairs.** Same material both times, true elapsed time stated,
   unrehearsed. The only asset that answers "am I any good" and "will I improve" at once. The code
   seam already exists (`STUDENT_CLIPS`).
2. **A written release, parent-signed for anyone under 18.** Must name **audio, video, stills and
   voice** explicitly — Cal. Civ. Code §3344 lists voice separately, and its fee-shifting makes
   this a real risk for a solo operator. A release signed by a 15-year-old is voidable
   (Cal. Fam. Code §6710).
3. **Real outcomes attributable to named students** — "sang at her sister's wedding after five
   months", "passed a musical-theatre audition". **Zero outcomes appear anywhere on the site
   today**: five reviews about warmth and patience, nothing about what changed.
4. **Enrichment for the five existing reviews** — discipline, months studied, online or in person,
   parent or adult learner. Identity-descriptive detail is the one quantitatively supported
   testimonial variable (Forman et al. 2008).
5. **"7 years teaching"** into `content/coach.json`.
6. **A background check the site can name** — TrustLine, ~$143, the only CA check with access to
   DOJ criminal history, the Child Abuse Central Index and FBI prints. Against a $3,240 in-person
   LTV that is a rounding error and no local competitor will have it.
7. **A one-page parent/safeguarding statement.**
8. **A progress-reporting cadence she will keep** — weekly note, monthly summary, a recording
   every 6–8 weeks. Highest-leverage item for month-3 retention, which is the metric the business
   runs on. Parents quit, not kids: if they cannot see progress they judge value by how the child
   feels afterward.
9. **An LA rate benchmark she will stand behind**, with source and date. LA voice lessons run
   ~$60–200/hr with established coaches higher, so $280 = 4 × $70 is low-to-mid for the market.
   The strongest unused argument on the site.
10. **Her own audio, hosted**, so `/coach` need not send people to Spotify to hear her sing.

## Explicitly rejected — do not put on a page

"Video testimonials convert 34%/80%/86% better"; "people retain 95% of video vs 10% of text" (a
mutation of Dale's Cone — no such study); "named testimonials are 35% more persuasive"; "only 1.5%
of people are tone deaf"; any gym-retention statistic of the "50% quit within six months" genre.
No credible published A/B test of video vs text testimonials exists. The argument for audio here
is categorical, not statistical: **the claim is auditory, so text cannot substantiate it.**

## Verification

1. `npx tsc --noEmit` clean; `npm run build` succeeds; all 22 routes still present.
2. **Recompute every contrast pair** after the token change; no text pair below 4.5:1, target 7:1
   on purchase pages. Non-text boundaries ≥3:1.
3. Confirm in built HTML: no Playfair below 28px; no display face on any paragraph, label, price
   or button; body ≥19px equivalent; lining figures on every price and date.
4. Prices still all derivable from `content/pricing.json`; 30-minute rows still carry no saving
   claim; no unhedged free-lesson claim; zero dark patterns; exactly one sticky bar per page.
5. Contraction ratio moves from 3.04:1 toward parity; banned-list greps clean.
6. Lighthouse mobile on `/coach`, `/coach/pricing` and one landing page — LCP under 2.0s with the
   new fonts (watch for a swap-driven CLS regression).
7. `/coach` renders a price and a lesson description; `/coach/lessons/*` reachable from the nav.

## Sequencing

Workstream 1 owns `app/styles.css` exclusively. Workstreams 2–5 must use existing classes and
inline `style={{}}` — which is already the codebase's idiom — so all five can run in parallel
without touching the same file. Workstream 4 is copy-only. No workstream touches `lib/pricing.ts`,
`content/pricing.json`, `app/api/**`, `scripts/**` or the live Stripe/Cal.com integration.
