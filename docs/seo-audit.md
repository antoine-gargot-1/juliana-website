# SEO audit — www.juliana-beltran.com

Audited 2026-08-13 against the live site (all 30 sitemap URLs fetched and parsed)
and against the repository at commit `42b2ed6`. Fixes in this pass were applied to
metadata, internal links, `app/sitemap.ts` and one schema bug; every change is
listed in [§9](#9-every-change-made-in-this-pass).

**Scope boundary.** This pass could edit `docs/`, `lib/seo.ts`, `app/sitemap.ts`,
`app/robots.ts` and the `metadata` exports plus internal links under
`app/(coach)/**` and `app/(landing)/**`. The artist side (`app/(artist)/**`) and
`app/page.tsx` were audited but **not** edited; their fixes are written out as
copy-paste diffs in [§8](#8-needs-a-human).

**No web research was used.** Nothing below asserts a search volume, a ranking or
an indexation state. Everything that needs live data is listed in
[§10](#10-what-needs-search-console-or-field-data).

---

## Contents

1. [Headline findings](#1-headline-findings)
2. [Titles and meta descriptions, all 30 URLs](#2-titles-and-meta-descriptions-all-30-urls)
3. [Keyword ownership map](#3-keyword-ownership-map)
4. [Internal linking and orphans](#4-internal-linking-and-orphans)
5. [The songwriting opportunity](#5-the-songwriting-opportunity)
6. [Schema coverage per page](#6-schema-coverage-per-page)
7. [The dual-persona question](#7-the-dual-persona-question)
8. [Technical](#8-technical)
9. [Every change made in this pass](#9-every-change-made-in-this-pass)
10. [Needs a human](#10-needs-a-human)
11. [What needs Search Console or field data](#11-what-needs-search-console-or-field-data)

---

## 1. Headline findings

Ranked by what they cost, not by how easy they were to fix.

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | **`/coach/songwriting` and `/online-songwriting-lessons` shipped with the identical H1** — "Finish the songs you keep starting." — near-identical title lead phrases, and the same `songwritingServiceSchema()` node. Two URLs, one page, on the *only* cluster this studio can realistically win. | High | **Fixed** |
| 2 | **`/coach/lessons/online` and `/online-singing-lessons` both claimed "online singing lessons" in the `<title>`.** Two half-owners of a term is not two chances at it. | High | **Fixed** |
| 3 | **All three root landing pages had exactly one internal inbound link each** (the chooser list on `/`). `/live-music-for-events-los-angeles` has 13. An orphan does not rank regardless of its content. | High | **Fixed** (2 each; see §4 for why 2 and not 12) |
| 4 | **`bookingChannel()` sent event-booking enquiries to the vocal-assessment scheduler.** `liveMusicServiceSchema()` inherited a hardcoded `serviceUrl: /coach/book` while all three of its own `Offer`s point at `/artist/booking`. The node contradicted itself and the machine-readable answer was the wrong one. | High | **Fixed** |
| 5 | **Two meta descriptions carried a hardcoded `$70`** (`/coach/pricing`, `/coach/lessons/online`) while four other places on the site derive the same figure from `lib/pricing.ts`. A price in a description is a price Google renders in the SERP. | Medium | **Fixed** |
| 6 | **19 of 30 meta descriptions were over 160 characters**, up to 269. Google renders ~155 on desktop and ~120 on a phone, and this traffic is mobile-majority — so on `/coach`, `/coach/pricing` and `/online-singing-lessons` the free assessment and the price were past the truncation point and never shown. | Medium | **Fixed** for the 16 in-scope pages; 7 artist-side pages listed in §10 |
| 7 | **Five titles were 83–93 characters**, with the local qualifier or the instrument list in the truncated tail. | Medium | **Fixed** in scope |
| 8 | **The sitemap stamped `lastModified: new Date()` on all 30 URLs**, regenerating daily. It asserted that a 2024 show page and an untouched privacy policy had both changed this morning. | Medium | **Fixed** (omitted) |
| 9 | **Section structure is invisible to a crawler.** `/coach/songwriting` is 1,830 words with **one H1 and one H2**; every section label is a `<div className="eyebrow">`. Same on eight other coach pages. | Medium | **Needs a human** (§10.3 — not CSS-neutral) |
| 10 | **Six Spanish keywords point at an English-language page.** `clases de canto los angeles`, `maestra de canto`, `profesora de canto` and three variants all route to `/vocal-coach-los-angeles`, which is `lang="en"`, `locale: en_US`, with no Spanish text. Paid can buy those clicks; organic cannot rank for them. | Medium | **Needs a human** (§10.4) |
| 11 | **`/artist` and all six show-page titles duplicate the brand name** — "Juliana Beltran — … \| Juliana Beltran" — because the page title already opens with it and `app/layout.tsx` appends the template. Wastes 17 of ~60 usable characters. | Low | **Needs a human** (§10.1 — out of scope) |
| 12 | **377 KB of webfonts, all five families preloaded on every page**, contending with a 128 KB cross-origin LCP image that has no `preconnect`. | Low–Medium | **Needs a human** (§10.5 — `app/fonts.ts` / `app/layout.tsx` out of scope) |

---

## 2. Titles and meta descriptions, all 30 URLs

Lengths are the full rendered `<title>` including the ` | Juliana Beltran` template
from `app/layout.tsx` (18 characters), because that is what Google measures.
`D` is the meta description length.

**Budget used.** Title: Google renders roughly 600px, which is ~60 characters of
mixed-case text; beyond that the tail is cut. Truncation is a click-through
problem, not a ranking one — the keyword is read either way — so the rule applied
here was *the primary keyword and any local qualifier must be inside the first 60
characters*, not *every title must be under 60*. Description: 155 desktop / 120
mobile, so ≤160 with the hook front-loaded.

### Coaching side and landing pages (in scope — fixed)

| URL | Title (now) | T | D | Verdict |
|---|---|---:|---:|---|
| `/coach` | Music Lessons in Los Angeles & Online | 55 | 157 | **Fixed.** Was 83/254. Was also the fourth title on the site claiming the instrument list; as the hub it now owns the head term and leaves instrument long-tails to the two mode pages. Free assessment was at char 216 — invisible — now at 133. |
| `/coach/about` | About Juliana Beltran — Vocal Coach in Los Angeles | 68 | 147 | **Fixed.** Was 79/266. Dropped "& Singer-Songwriter" — that identity belongs to `/artist` and `/artist/press`, and naming it here made three pages compete for it. "Los Angeles" spelled out, not "LA", because that is how the query is typed. |
| `/coach/services` | What I Teach — Voice, Guitar, Piano & Songwriting | 67 | 147 | **Fixed.** "Lessons & Coaching" was generic enough to fight `/coach` and `/coach/lessons/online` for a term it cannot win. "What I Teach" is what the footer already calls it and what the page is. |
| `/coach/voice-lessons-los-angeles` | Voice Lessons in Los Angeles — Online & In Person | 67 | 156 | **Title kept deliberately.** This is the organic owner of the *lesson*-noun local terms — exact-match slug, indexed at this URL before the landing pages existed. Description cut from 211; "Beginners welcome" was being truncated and it is the objection this visitor actually has, so the coach's résumé went instead. |
| `/coach/faq` | Music Lesson FAQ — Ages, Levels, Billing & Booking | 68 | 159 | **Fixed.** Was 83/235. |
| `/coach/contact` | Contact Juliana — Ask Something Before You Book | 65 | 158 | Title fine. Description cut from 215. |
| `/coach/pricing` | Music Lesson Prices — Los Angeles & Online | 60 | 140 | **Fixed.** Was 83/269, and "in Los Angeles" — the one word a local pricing query needs — was in the truncated tail. Price now computed from `lib/pricing.ts`. |
| `/coach/book` | Book a Free 30-Minute Vocal Assessment | 56 | 144 | **Fixed.** Was 83/201. Duration now read off `ASSESSMENT` rather than typed. |
| `/coach/lessons/online` | Online Music Lessons — Voice, Guitar, Piano & Songwriting | 75 | 143 | **Fixed — this is finding #2.** Was "Online Singing & Music Lessons", competing head-on with `/online-singing-lessons`. Now owns online-as-a-delivery-mode across instruments, plus the question intent ("does singing work over video"), which is literally what the page's 1,865 words are about. Price computed. 75 is over budget but the keyword is in the first 20 characters. |
| `/coach/lessons/in-person` | In-Person Music Lessons in Los Angeles | 56 | 142 | **Fixed.** Was 93 — longest on the site — so all four instruments it listed were cut. "Tuesdays and Thursdays" now generated from `IN_PERSON_DAYS`, which is what configures Cal.com; a description promising days the scheduler does not offer sends people to an empty booking page. |
| `/coach/songwriting` | Songwriting Lessons in Los Angeles & Online | 61 | 146 | **Fixed — this is finding #1.** "Online" out of the lead, "in Los Angeles" in. H1 changed too (see §5). |
| `/vocal-coach-los-angeles` | Vocal Coach in Los Angeles — Free 30-Minute Assessment | 72 | 151 | **Title kept deliberately** — owns the *person* noun. Description cut from 210 and "Tuesdays and Thursdays" now generated from `IN_PERSON_DAYS`; this page takes 31 paid keywords, so a promise the scheduler cannot keep costs money directly. |
| `/online-singing-lessons` | Online Singing Lessons — One-to-One, Any Timezone | 67 | 154 | **Fixed.** Was 82/266 with the price at char 230 — the most clickable fact in it, on a page bought against 11 keywords, never rendered. "One-to-One, Any Timezone" swapped in from `/coach/lessons/online` in the same trade; "One-to-One" is the differentiator against the group-class franchises. |
| `/online-songwriting-lessons` | Online Songwriting Lessons — Finish the Songs You Start | 73 | 153 | **Title and H1 kept deliberately** — this is the page that keeps the conversion headline. Description cut from 202 so the free-session CTA lands inside the budget. |
| `/coach/privacy` | Privacy Policy — What I Collect and Who Sees It | 65 | 155 | **Fixed.** Was 85/231. |
| `/coach/terms` | Terms & Conditions — Lessons, Billing & Cancelling | 68 | 157 | **Fixed.** Was 85/256. |

### Home and artist side (audited, not edited — see §10.1 and §10.2)

| URL | Title (live) | T | D | Verdict |
|---|---|---:|---:|---|
| `/` | Juliana Beltran — Colombian Singer-Songwriter & Music Coach in Los Angeles | 74 | 184 | Acceptable. No brand duplication because Next's title template does not apply to the same segment as the layout that defines it. H1 is "Juliana Beltran." — brand only, no keyword, which is defensible on a chooser page. Description 24 over. |
| `/artist` | Juliana Beltran — Latin Pop & Indie Pop Artist, Los Angeles \| Juliana Beltran | 77 | 175 | **Brand duplicated.** 17 wasted characters. Fix in §10.1. |
| `/artist/music` | Music — Discography, Singles & Spotify Playlists | 66 | 152 | Good. Both inside budget. |
| `/artist/live-video` | Live Video — Full Show at Hotel Café & Live Sessions | 70 | 211 | Title fine. Description 51 over. |
| `/artist/live` | Live — Tour Dates & Upcoming Shows in Los Angeles | 67 | 178 | Title fine. Description 18 over. |
| `/artist/press` | Press Kit — Bio, Photos, Live Video & Coverage | 64 | 195 | Title fine. Description 35 over. |
| `/artist/booking` | Booking — Hire Juliana Beltran for Shows & Events | 67 | 181 | Title fine. Description 21 over. |
| `/live-music-for-events-los-angeles` | Live Music for Events in Los Angeles — Bilingual Latin & Pop Vocalist | 87 | 230 | Longest artist title; "Bilingual Latin & Pop Vocalist" is the differentiator and it is in the truncated tail. Description 70 over. |
| `/artist/live/harvard-and-stone-…-2026-09-01` | Juliana Beltran live at Harvard and Stone — Tuesday, September 1, 2026 \| … | 88 | 129 | **Brand duplicated** on all six show pages. Description length is good. Fix in §10.1. |
| `/artist/live/the-palm-and-the-pine-…-2026-04-15` | Juliana Beltran played The Palm and The Pine — Wednesday, April 15, 2026 \| … | 90 | 149 | As above. Longest title on the site. |
| `/artist/live/hotel-cafe-hollywood-2026-03-15` | Juliana Beltran played Hotel Cafe — Sunday, March 15, 2026 \| … | 76 | 133 | As above. |
| `/artist/live/the-virgil-…-2025-04-15` | Juliana Beltran played The Virgil — Tuesday, April 15, 2025 \| … | 77 | 136 | As above. |
| `/artist/live/hotel-cafe-hollywood-2025-03-08` | Juliana Beltran played Hotel Cafe — Saturday, March 8, 2025 \| … | 77 | 170 | As above. **Also shares its H1 ("Hotel Cafe.") with the 2026-03-15 show page** — the only remaining duplicate H1 on the site. Fix in §10.2. |
| `/artist/live/the-bourbon-room-…-2024-02-08` | Juliana Beltran played The Bourbon Room — Thursday, February 8, 2024 \| … | 86 | 145 | As above. |

**Verified after the fixes:** all 30 titles unique, all 30 descriptions unique and
present, all 30 canonicals self-referential and on the `www` host, 29 of 30 H1s
unique (the exception is the two Hotel Cafe show pages — §10.2).

---

## 3. Keyword ownership map

`marketing/google-ads/keywords.csv` maps 62 rows (39 distinct terms, Exact +
Phrase) to four URLs. Paid can point ten keywords at one page and let the auction
sort it out. Organic cannot: two pages claiming one term split its links, its
clicks and its relevance signals, and Google picks whichever it likes per query.

The three collisions that existed, and the resolution:

### Collision A — "online singing lessons" / "online voice lessons"

Three candidates: `/coach/lessons/online` (title said "Online **Singing** &
Music Lessons"), `/online-singing-lessons`, `/coach/voice-lessons-los-angeles`.
Two of them claimed it in the `<title>`.

**Resolved on the modifier, which is a distinction searchers actually make:**

| Term | Owner | Why it wins the term |
|---|---|---|
| online singing lessons, online voice lessons, online vocal coach, virtual voice lessons, remote singing lessons, online singing teacher | `/online-singing-lessons` | Exact-match slug. All 11 matching paid keywords already point here. Content is voice-only and objection-led. |
| online music lessons, online guitar lessons, online piano lessons, "do online singing lessons work" | `/coach/lessons/online` | It is the delivery-mode page: 1,865 words of audio calibration, turn-taking accompaniment and the *Journal of Voice* split of what video carries and what it does not. None of that is on the landing page, and all of it answers a different query. Retitled to "Online Music Lessons". |
| voice lessons los angeles, singing lessons los angeles, vocal lessons los angeles, voice teacher los angeles, singing lessons near me, voice lessons near me, vocal lessons near me | `/coach/voice-lessons-los-angeles` | Exact-match slug, and it was indexed at this URL before the landing pages existed. Local, not online — it does not contest this collision at all once its title stays on the lesson noun. |

### Collision B — the LA local cluster

Five titles contained "in Los Angeles". Resolved on the **noun**, which is the
split the queries themselves make:

| Term | Owner | Why |
|---|---|---|
| vocal coach los angeles, vocal coach in los angeles, vocal coach near me, singing coach los angeles | `/vocal-coach-los-angeles` | *Person* noun. Proof-led page (video above the fold), opens on the in-person rate card, and the paid destination for 31 keywords. |
| voice lessons los angeles, singing lessons los angeles, vocal lessons los angeles, voice teacher los angeles + all four "near me" variants | `/coach/voice-lessons-los-angeles` | *Service* noun. Exact-match slug and pre-existing index history — moving this term off it would throw away whatever equity the URL has. |
| music lessons los angeles, guitar lessons los angeles, piano lessons los angeles | `/coach` | The hub. Retitled to "Music Lessons in Los Angeles & Online" so it stops competing on the instrument long-tails. |
| in-person music lessons los angeles, "music lessons near me" (multi-instrument) | `/coach/lessons/in-person` | The other delivery-mode page. |
| music lesson prices, singing lesson cost los angeles, how much are voice lessons | `/coach/pricing` | Retitled to "Music Lesson Prices — Los Angeles & Online". |

**Note on the paid/organic disagreement, which is fine.** `keywords.csv` sends
`voice lessons los angeles`, `singing lessons los angeles` and
`vocal lessons los angeles` to `/vocal-coach-los-angeles`. Organically those
belong to `/coach/voice-lessons-los-angeles`. That is not a contradiction to fix —
paid should land on the page built to convert a stranger, organic should rank the
page built to answer a question. Do not "align" them by retitling either page onto
the other's term.

### Collision C — songwriting (the expensive one)

Both pages shipped the **identical H1**, both titles opened on "…Songwriting
Lessons — Online", and both emit the same `songwritingServiceSchema()` node whose
`url` is `/coach/songwriting`.

| Term | Owner | Why |
|---|---|---|
| songwriting lessons, songwriting coach, songwriting teacher, songwriting mentor, learn to write songs, songwriting lessons los angeles | `/coach/songwriting` | The depth page — 1,830 words, the six-part arc, the setlist proof. In the footer of every coach page. Now titled "Songwriting Lessons in Los Angeles & Online" with H1 "Songwriting lessons in Los Angeles." |
| online songwriting lessons, songwriting lessons online | `/online-songwriting-lessons` | Exact-match slug, and where all 11 songwriting keywords in `keywords.csv` point. Keeps the conversion H1 "Finish the songs you keep starting." |

### Unresolved: the Spanish terms

Six keywords — `clases de canto`, `clases de canto los angeles`,
`clases de canto en los angeles`, `clases de canto cerca de mi`,
`maestra de canto`, `maestra de canto los angeles`, `profesora de canto` — point at
`/vocal-coach-los-angeles`, which is `<html lang="en">`, `locale: en_US`, with no
Spanish body text. Paid will serve those clicks; organic will not rank. This is a
content decision, not a metadata one — see §10.4.

### Brand terms

`juliana beltran`, `juliana beltran music`, `juliana beltran vocal coach`,
`juliana beltran lessons`, `juliana beltran singing lessons`, `juliana beltrán` all
point at `/`. Correct: `/` carries `Person` + `WebSite` JSON-LD with `sameAs` to
all four platforms, and both halves of the site are linked from its body. Nothing
to change.

---

## 4. Internal linking and orphans

Inbound internal links per URL, counted from the built HTML (chrome and body
links, deduplicated per source page, self-links excluded).

### Before this pass

| URL | Inbound | Reachable from |
|---|---:|---|
| `/vocal-coach-los-angeles` | **1** | `/` only |
| `/online-singing-lessons` | **1** | `/` only |
| `/online-songwriting-lessons` | **1** | `/` only |
| `/artist/live/…` × 5 past shows | 1 | `/artist/live` only |
| everything else on the coaching side | 12–16 | nav + footer |
| everything else on the artist side | 12–14 | artist nav + footer |

### After

| URL | Inbound | Added from |
|---|---:|---|
| `/vocal-coach-los-angeles` | **2** | `/coach/lessons/in-person`, body, "Days and scheduling" |
| `/online-singing-lessons` | **2** | `/coach/lessons/online`, body, after the what-travels-over-video section |
| `/online-songwriting-lessons` | **2** | `/coach/songwriting`, body, reciprocal to the link that already came back |
| `/coach/songwriting` | 14 → 14 | + contextual links from `/coach/voice-lessons-los-angeles` body and `/coach/services` (both were already footer-linked, so no new edge — but a contextual in-copy link is a stronger relevance signal than a footer entry) |
| `/coach/voice-lessons-los-angeles` | 13 → 13 | + contextual link from `/coach/services` |

### Why two inbound links and not twelve

The brief's own instruction — "not a link farm in the footer" — is the right call
here, and there is a harder reason than tidiness. Each of the three root landing
pages is a near-duplicate of a `/coach` page by design:

- `/vocal-coach-los-angeles` ↔ `/coach/voice-lessons-los-angeles`
- `/online-singing-lessons` ↔ `/coach/lessons/online`
- `/online-songwriting-lessons` ↔ `/coach/songwriting`

Putting them in the footer would place a near-duplicate destination next to its
twin on all 16 coaching pages, which helps no reader and dilutes rather than
concentrates the signal. Each got exactly one contextual link, from the page whose
reader would genuinely want it, placed in copy that already existed (the
`/coach/voice-lessons-los-angeles` → `/coach/songwriting` link required **no new
prose at all** — the word "songwriting" was already sitting there unlinked).

**The structural finding underneath this,** which two inbound links does not fix:
before this pass, *every* body link on *every* coaching page pointed at a URL that
was already in the nav or the footer. The coaching side had 16 pages and zero
contextual links that added a route to anything. `/coach/services` was the worst
case — a menu naming six disciplines, linking to none of them, with the only exits
being `/coach/pricing` and `/coach/book`, both already two clicks away in the
chrome. It now links Voice → `/coach/voice-lessons-los-angeles` and Songwriting →
`/coach/songwriting`, keyed by discipline name so renumbering the list cannot move
a link onto the wrong one.

### Genuine orphans remaining

None, on the strict definition. The five past show pages have one inbound link
each (`/artist/live`), which is thin but correct — a 2024 gig does not deserve
sitewide linking, and `/artist/live` is itself linked 13 times.

### One asymmetry worth noting, not fixing

`/` has **zero** inbound internal links. Both navs point their wordmark at
`/coach` or `/artist` respectively, deliberately (see the comment in
`CoachNav.tsx`). The root is still the sitemap's priority-1.0 entry and the brand
query destination, and search engines reach it from the sitemap and from external
links, so this is a UX/PageRank-flow curiosity rather than a defect. Adding a
"both sides of this site" link to the footers would fix it; it is not obviously
worth a footer slot.

---

## 5. The songwriting opportunity

This was the highest-upside item and it had the worst problem on the site.

### Is the content substantial enough to compete?

Yes on volume, no on structure.

| Page | Words | H1 | H2 | Section labels as headings? |
|---|---:|---:|---:|---|
| `/coach/lessons/online` | 1,865 | 1 | 1 | No |
| `/coach/songwriting` | **1,830** | 1 | **1** | **No** |
| `/coach` | 1,840 | 1 | 8 | Partly |
| `/coach/lessons/in-person` | 1,289 | 1 | 1 | No |
| `/online-songwriting-lessons` | **1,156** | 1 | **1** | **No** |
| `/coach/faq` | 1,183 | 1 | 1 | No |
| `/vocal-coach-los-angeles` | 1,018 | 1 | 1 | No |
| `/coach/voice-lessons-los-angeles` | 899 | 1 | 1 | No |

`/coach/songwriting` is the second-longest page on the coaching side and the
substance is genuinely good — the six-week arc, object writing, prosody, the
second-verse problem, and a setlist where seven of ten songs are hers, rendered as
real indexable text rather than an assertion. That last part is the strongest
single asset in the songwriting cluster: *"I write songs"* is an adjective, a
tracklist is evidence, and Google can read the tracklist.

**What is missing is not words, it is machine-readable structure.** A 1,830-word
page with one H1 and one H2 has no outline. Every one of its section labels
("How the work tends to go", "Who this is for", "Songwriting rates", "What
students say") is a `<div className="eyebrow">`, and every item title inside the
numbered lists is a `<span className="t">`. To a crawler the page is one
undifferentiated block. That is the single highest-value remaining fix on the site
and it is not CSS-neutral, so it is written up in §10.3 rather than done here.

### Were they linked as if they mattered?

No. `/online-songwriting-lessons` had **one** inbound link. `/coach/songwriting`
was footer-only from every page, with no contextual in-copy link anywhere — while
`/coach/voice-lessons-los-angeles` contained the sentence *"If you also write, or
want to, songwriting and artist development sessions can run alongside the voice
work"* with the word "songwriting" sitting there unlinked. Fixed: that word is now
the anchor, `/coach/services` links the discipline to its page, and the two
songwriting pages now link to each other in both directions.

### The disambiguation applied

The two pages were the same page to a search engine: identical H1, colliding title
lead phrases, one shared `Service` node. Resolved by giving each a distinct job —

- `/coach/songwriting` takes the plain descriptive H1 its four sibling `/coach/*`
  pages already use ("Voice lessons in Los Angeles.", "In-person lessons in Los
  Angeles.") → **"Songwriting lessons in Los Angeles."** This also closes a real
  gap: the old H1 contained neither the word "songwriting" nor a location.
- `/online-songwriting-lessons` keeps **"Finish the songs you keep starting."** —
  it is a conversion headline and that page's job is conversion.

The good line survives, on the page where it earns money, and the page that needs
the keyword gets it.

### What content depth is still missing

Specified, not written — a later pass or a human should write these:

1. **Headings** (§10.3). Highest value. Nothing else in this list matters as much.
2. **A worked example.** The page describes object writing and prosody
   abstractly. One before/after of a real lyric line — four words of a general
   line, four of the specific rewrite — would be the most linkable and most
   quotable thing in the cluster, and no competitor page has it.
3. **Student outcomes.** `STUDENT_CLIPS: Video[] = []` is an empty array on both
   pages, waiting for consented clips. A finished student song, embedded, is the
   proof this cluster is missing. The array exists precisely so dropping one in
   needs no redesign.
4. **A songwriting FAQ.** `/coach/faq` is entirely about booking, billing and
   ages. "Do I need to play an instrument to write songs?", "Can we co-write?",
   "Do you help with lyrics in Spanish?", "What if I only have a chorus?" are
   real queries with no page on this site answering them, and an `FAQPage` node
   scoped to `/coach/songwriting` would be a genuine addition rather than a
   duplicate of the booking FAQ.
5. **A second songwriting page, not a longer one.** Topical authority in a cluster
   comes from covering the cluster. `/coach/songwriting` and
   `/online-songwriting-lessons` are two pages about buying lessons. One
   *informational* page — "how to finish a song", "how to write a second verse" —
   would attract links the two commercial pages never will, and can link down into
   both. Recommend one; do not build five.

---

## 6. Schema coverage per page

Every JSON-LD block on all 30 URLs parses. No `@type` typos, no unresolved bare
`@id` references, no `MusicSchool`. Types below are as emitted, from the build.

| URL | Types emitted | Verdict |
|---|---|---|
| `/` | `BreadcrumbList`, `Person`, `WebSite` | Correct. `WebSite` + `Person` are sitewide from the root layout. |
| `/artist` | `MusicGroup`, `VideoObject`, `ItemList`, `BreadcrumbList`, `Person`, `WebSite` | Good. `ItemList` of upcoming `MusicEvent`s. |
| `/artist/music` | `MusicGroup`, `BreadcrumbList`, `Person`, `WebSite` | **Gap:** the discography renders singles and playlists with no `MusicRecording` / `MusicAlbum` nodes. Low priority — music rich results are largely Knowledge Panel territory — but it is the one obvious missing type on the site. |
| `/artist/live-video` | `MusicGroup`, `VideoObject`, `BreadcrumbList`, `Person`, `WebSite` | Correct, and video rich results are the realistic upside here. Needs verification that Google accepts the click-to-load facade as "playable on the page" — see §11. |
| `/artist/live` | `ItemList`, `BreadcrumbList`, `Person`, `WebSite` | Correct. |
| `/artist/press` | `MusicGroup`, `VideoObject`, `BreadcrumbList`, `Person`, `WebSite` | Fine. The FEMMUSIC / LOUD WOMEN / Jammerzine quotes are unmarked, correctly — third-party review markup on your own page is not eligible for a rich result and marking it up buys nothing. |
| `/artist/booking` | `Service`, `BreadcrumbList`, `Person`, `WebSite` | Correct. |
| `/live-music-for-events-los-angeles` | `Service`, `BreadcrumbList`, `Person`, `WebSite` | **`liveMusicServiceSchema` re-verified and one real bug fixed.** Holding: no `availableLanguage` on `Service` (out of domain), `en`/`es` on the `ServiceChannel`, no `aggregateRating` on the node, `provider` restated as a self-standing `MusicGroup` reference, `areaServed` as seven `AdministrativeArea`s. **Broken:** `serviceUrl` was `/coach/book` — the free vocal-assessment scheduler — on the Service that sells weddings and corporate events, while all three of its `Offer`s pointed at `/artist/booking`. Fixed. |
| `/coach` | `LocalBusiness`+`EducationalOrganization`, `Service`, `Offer`, `BreadcrumbList`, `Person`, `WebSite` | Correct. Re-verified: no `streetAddress`, no `geo`, no `openingHours`/`openingHoursSpecification`, `address` narrowed to locality/region/country, `aggregateRating` and `review` **not** on the business node. All five reviews render on the page that carries them. |
| `/coach/about` | `Person`, `BreadcrumbList`, `WebSite` | Correct. `hasCredential`, not a fabricated `alumniOf` — holding. |
| `/coach/services` | `Service`, `Offer`, `BreadcrumbList`, `Person`, `WebSite` | Correct **now**. `lib/schema.ts` carries a note offering `{ withReviews: false }` for this page "because it asserted the aggregate with no review content". That is no longer true — the page renders all five testimonials with names, dates and stars via `TestimonialCarousel`. The comment is stale, not wrong; left alone. |
| `/coach/voice-lessons-los-angeles` | `Service`, `Offer`, `BreadcrumbList`, `Person`, `WebSite` | Correct. |
| `/coach/faq` | `FAQPage`, `BreadcrumbList`, `Person`, `WebSite` | Valid, and **almost certainly will not produce a rich result.** Google restricted FAQ rich results to well-known authoritative government and health sites in August 2023. Keep it — it still helps entity understanding and AI summaries — but do not expect SERP real estate from it, and do not add `FAQPage` to more pages hoping for one. |
| `/coach/contact` | `LocalBusiness`+`EducationalOrganization`, `BreadcrumbList`, `Person`, `WebSite` | Correct. |
| `/coach/pricing` | `OfferCatalog`, `Offer`, `BreadcrumbList`, `Person`, `WebSite` | Correct. Nested per-mode catalogs, `UnitPriceSpecification` on recurring plans. |
| `/coach/book` | `Offer`, `BreadcrumbList`, `Person`, `WebSite` | Correct. |
| `/coach/lessons/online` | `Service`, `Offer`, `BreadcrumbList`, `Person`, `WebSite` | Correct. |
| `/coach/lessons/in-person` | `LocalBusiness`+`EducationalOrganization`, `Service`, `Offer`, `BreadcrumbList`, `Person`, `WebSite` | Correct, and no premises asserted. |
| `/coach/songwriting` | `Service`, `Offer`, `BreadcrumbList`, `Person`, `WebSite` | Correct. Candidate for a scoped `FAQPage` — see §5.4. |
| `/vocal-coach-los-angeles` | `LocalBusiness`+`EducationalOrganization`, `Service`, `Offer`, `BreadcrumbList`, `Person`, `WebSite` | Correct. Note the `lib/schema.ts` comment saying the full `LocalBusiness` node is emitted "on `/coach` and `/coach/contact` only" is now stale — it is on four pages. Harmless: they all merge on the same `@id`. |
| `/online-singing-lessons` | `Service`, `Offer`, `BreadcrumbList`, `Person`, `WebSite` | Correct, with one thing worth knowing. Its only `Service` node is `lessonsServiceSchema('online')`, whose `url` is `/coach/lessons/online` — so this landing page has no self-referential entity. That is legitimate (one service, two pages describing it) and the `@id` merge is correct, but it does mean the entity signal points at the twin. Not worth a fix; worth knowing if rankings ever swap between the pair. Same pattern on `/online-songwriting-lessons`. |
| `/online-songwriting-lessons` | `Service`, `Offer`, `BreadcrumbList`, `Person`, `WebSite` | As above. |
| `/coach/privacy`, `/coach/terms` | `BreadcrumbList`, `Person`, `WebSite` | Correct. No `WebPage` node needed — it earns nothing. |
| `/artist/live/<slug>` × 6 | `MusicEvent`, `BreadcrumbList`, `Person`, `WebSite` | Correct. |

### Review markup honesty — checked, and it holds

`aggregateRatingSchema()`'s own rule is that a page carrying a rated `Service`
must render the reviews **or at least the visible aggregate sentence**.

- `/coach`, `/coach/services`, `/coach/voice-lessons-los-angeles`,
  `/coach/lessons/online`, `/coach/lessons/in-person`, `/coach/songwriting`:
  all five reviews via `TestimonialCarousel`, which computes its visible aggregate
  from the same records. Compliant.
- The three landing pages render three quotes, not five — but each renders
  `{AGGREGATE_RATING.value}/5 from {AGGREGATE_RATING.count} students` in the hero,
  so the marked-up count is visible. Compliant under the "or at least the
  aggregate sentence" clause. Inconsistent with the treatment on the coach pages,
  which is a style question, not a violation. **No change made.**

### Pages that should have structured data and do not

None, on any type that earns a result today. The one real gap is
`MusicRecording`/`MusicAlbum` on `/artist/music`, and it is low value.

---

## 7. The dual-persona question

**Answer: leave it alone. The artist side is a net asset to the coaching side, and
the reasons it is are load-bearing, not sentimental.**

The dilution worry is real in general — one domain covering two topics does split
topical focus, and 8 of 30 URLs on this site are about booking a performer rather
than buying a lesson. But the specific mechanics here point the other way.

**1. The artist side is the proof, and the coaching pages already spend it.** Six
of the coaching pages carry `BOOKING_LIVE_VIDEO` — the 47-minute Hotel Café set —
above the fold, and the songwriting pages render the setlist as text because seven
of ten songs in it are hers. "Vocal coach who still sings for a living" is the
entire positioning of `/vocal-coach-los-angeles`, and it is falsifiable: the shows
have dated `MusicEvent` markup, the releases have Spotify and Apple `sameAs`, the
press quotes name real outlets. Remove the artist side and the coaching side's
central claim becomes an unverifiable assertion in a paragraph. Google's
quality-rater framing for a paid service in the "your money" category is
experience and demonstrable expertise; this domain has the rare version where both
are on the same host and machine-readable.

**2. The entity graph is already unified, correctly.** A single `Person` node
(`/#person`) with `jobTitle: ['Singer-songwriter', 'Vocal coach']` is emitted on
every page of both halves, `MusicGroup` (`/artist#musicgroup`) and `LocalBusiness`
(`/coach#business`) both hang off it, and `sameAs` runs to Spotify, Apple, YouTube
and Instagram. So a search engine is not being asked to reconcile two unrelated
businesses; it is being told, consistently, that one person does two things. That
is a true statement about the world and the markup says it once.

**3. The two halves genuinely do not compete for a single query.** `voice lessons
los angeles` and `live music for events los angeles` share no intent, no SERP and
no competitor set. There is no cannibalisation across the seam — every collision
found in §3 was *within* the coaching side.

**4. The one real cost, stated honestly.** The chooser at `/` is a split entry
point, so the root — the strongest URL on the domain — is doing brand
disambiguation rather than concentrating authority on either business. That is a
conversion-rate question more than a ranking one, and it is a design decision made
deliberately (see `ChooserSide` and `ModeRedirect`). It is not worth reopening for
SEO reasons.

**What I would do, in order:**

- **Nothing structural.** No subdomain, no second domain, no `noindex` on the
  artist side. Splitting the domain would cost the coaching side its proof and
  would halve whatever link equity exists — the artist side is the half more
  likely to attract editorial links (venues, blogs, playlists), and those links
  currently flow to the same host as the lesson pages.
- **Keep the seam clean, which it already is.** Don't add coaching CTAs to show
  pages or event CTAs to lesson pages. The current single crossover link
  (`/coach/privacy` → `/artist/booking`, and the nav's "Artist →" toggle) is the
  right amount.
- **If topical focus ever needs sharpening, do it inside the coaching side** by
  adding the informational songwriting page from §5.5 — that raises coaching-side
  depth without touching the artist side at all.

---

## 8. Technical

### Canonicals — clean

All 30 pages emit a self-referential `<link rel="canonical">` on the `www` host,
assembled in one place (`pageMeta` in `lib/seo.ts`) with `metadataBase` forcing the
host. No cross-canonicals, no canonical pointing at a `noindex` page, no page
canonicalising to another. **`lib/seo.ts` needed no changes.**

One cosmetic inconsistency, deliberately **not** fixed: `/` emits
`canonical="https://www.juliana-beltran.com"` (no trailing slash) while
`app/sitemap.ts` and the `BreadcrumbList` "Home" item both emit
`.../` (with one). Next.js normalises the root path away when resolving
`alternates.canonical`. RFC 3986 §6.2.3 makes an empty path equivalent to `/`, and
Google normalises them, so this costs nothing — and forcing them to agree would
mean either fighting Next's resolver or special-casing the root in three places.

### The `www` redirect and hop count — correct, one thing to know

Measured live:

| Request | Result |
|---|---|
| `https://juliana-beltran.com/` | `200` at `https://www.juliana-beltran.com/` |
| `https://juliana-beltran.com/coach/pricing` | `307` → `https://www.juliana-beltran.com/coach/pricing` |
| `http://www.juliana-beltran.com/coach` | `301` → `https://www.juliana-beltran.com/coach` |
| `https://www.juliana-beltran.com/coach/` | `308` → `https://www.juliana-beltran.com/coach` |

Single-hop in every case, path preserved, no chains. The apex→www redirect is a
`307` (temporary) rather than `301`/`308` for path requests. Google follows both
and treats a consistently-applied `307` as a canonical signal in practice, and the
self-referential canonical on every page says the same thing independently — so
this is not costing anything measurable. Worth changing to `308` in `vercel.json`
if that file is ever touched for another reason; not worth a deploy on its own.

### `robots.txt` — correct, and the `Disallow: /` lines are not a problem

Fetched live. Structure:

```
# BEGIN Cloudflare Managed content
User-agent: *
Content-Signal: search=yes,ai-train=no,use=reference
Allow: /

User-agent: Amazonbot          Disallow: /
User-agent: Applebot-Extended  Disallow: /
User-agent: Bytespider         Disallow: /
User-agent: CCBot              Disallow: /
User-agent: ClaudeBot          Disallow: /
User-agent: CloudflareBrowserRenderingCrawler  Disallow: /
User-agent: Google-Extended    Disallow: /
User-agent: GPTBot             Disallow: /
User-agent: meta-externalagent Disallow: /
# END Cloudflare Managed Content

User-Agent: *
Allow: /

Host: https://www.juliana-beltran.com
Sitemap: https://www.juliana-beltran.com/sitemap.xml
```

Confirmed harmless to search:

- **`Googlebot` is not in the block list.** Nor is `Bingbot`. Every `Disallow: /`
  targets a named AI-training or AI-answer agent.
- **`Google-Extended` is not a crawler.** It is the opt-out token for Gemini and
  Vertex AI grounding. Disallowing it has no effect on Google Search crawling,
  indexing or ranking. This is the one line most likely to be misread as "we
  blocked Google", and it is not.
- **Two `User-agent: *` groups** (Cloudflare's and Next's) is legal — the REP
  merges records for identical user-agent tokens — and both say `Allow: /`, so
  there is no conflict to resolve.
- `Host:` is a non-standard, Yandex-only directive emitted by
  `app/robots.ts`. Ignored by Google. Harmless.

**`app/robots.ts` needed no changes.** Its `SITE_NOINDEX=1` behaviour — full
`Disallow: /` and no sitemap reference on preview deployments — is the correct
mechanism, and the reasoning in its comment (a canonical is a hint, not a
directive, so a crawlable preview copy can be indexed) is right.

### Sitemap — `lastModified` was dishonest; now omitted

30 URLs, matching the allow-list exactly. Verified none of the five noindexed
transactional routes is present, and all five are still `noindex`. Nothing was
removed from the index and nothing was newly noindexed.

**`lastModified` was `new Date()` on all 30 entries**, with `revalidate = 86400`
above it, so the sitemap regenerated daily asserting that every page on the site —
including `/artist/live/the-bourbon-room-los-angeles-2024-02-08` and a privacy
policy nobody had edited — had changed that morning.

That is worse than saying nothing, for two reasons. Google uses `lastmod` only
while the value looks trustworthy and ignores it site-wide once it does not, so a
blanket "everything changed today" spends the credibility of the one field that
could prioritise a re-crawl. And a date identical across every URL carries zero
information even if believed — it cannot rank any URL above any other.

**Now omitted entirely.** `lastmod` is optional in the sitemap protocol, so
omitting it is valid and leaves Google to its own change detection, which is what
it was already doing. The comment in `app/sitemap.ts` records what a real
`lastmod` would have to come from (git author date of the page file and of the
`content/*.json` it reads, or a per-route date committed with the copy) and
explicitly rules out file mtimes, since a CI checkout gives every file the same
timestamp — the same lie in a different costume.

### `changeFrequency` and `priority` — no effect, kept as documentation

Google has stated it ignores both. They are harmless, and `app/sitemap.ts`
documents `priority` as an internal relative scale rather than a claim on the
crawler, which is the right framing. One inconsistency against that scale was
fixed: `/online-singing-lessons` was `0.8` while the file's own rule is that `0.9`
means "a page paid traffic or local search lands on" — and 11 keywords point at it.
Now `0.9`. Zero crawler impact; the file is now self-consistent.

### Core Web Vitals — the font payload is real, and it is not the only thing in the LCP path

Measured live, brotli/gzip where applicable:

| Asset | Transfer size | Notes |
|---|---:|---|
| Literata roman (variable, `opsz`) | 113.2 KB | woff2, `immutable`, Cloudflare `HIT` |
| Literata italic | 110.3 KB | 55 `.it` spans site-wide use it |
| Playfair (variable, `opsz`, no `wdth`, no italic) | 109.9 KB | already narrowed from 385 KB — that work was done well |
| Manrope | 28.1 KB | |
| Pinyon Script | 24.6 KB | |
| **Font total** | **377.0 KB** | **all five `rel=preload` on all 30 pages** |
| CSS | 13.4 KB | one file, `data-precedence="next"` |
| HTML (`/vocal-coach-los-angeles`) | 13.5 KB | |
| LCP image (`i.ytimg.com/…/maxresdefault.jpg`) | **128.1 KB** | `rel=preload as=image fetchPriority=high`, **cross-origin, no `preconnect`** |

`display: swap` plus `adjustFontFallback` (metric-adjusted local fallbacks) is the
right configuration and means the fonts should not cost CLS. The LCP risk is
**bandwidth contention, not blocking**: 377 KB of fonts preloaded at high priority
share the connection with a 128 KB high-priority LCP image, and on a throttled
mobile profile 377 KB alone is on the order of two seconds of transfer. Against a
stated LCP target under 2.0s on mobile-majority traffic, that is the constraint.

Three specific costs, in order of size and none of them in this pass's file scope
(`app/fonts.ts`, `app/layout.tsx`, `app/styles.css`) — see §10.5:

1. **The LCP element is a third-party JPEG with no `preconnect`.** Every landing
   page's LCP is `i.ytimg.com/vi/…/maxresdefault.jpg`, preloaded, but nothing warms
   that connection — so DNS + TCP + TLS to a new origin sits in front of the byte
   that decides LCP. This is the cheapest available win.
2. **Pinyon Script — 24.6 KB, preloaded on all 30 pages, for two decorative
   selectors** (`.signature`, `.float-script`) that do not appear on any landing
   page. Declared in the root layout, so every page pays.
3. **Literata italic — 110.3 KB, preloaded at the same priority as the roman.** It
   is genuinely used site-wide, so it cannot be dropped; but nothing in the first
   viewport of a landing page needs it before the H1 (Playfair) and the lede
   (Literata roman) have painted.

**None of these numbers is a field measurement.** They are transfer sizes and a
dependency graph read off the live HTML from a warm connection on a desktop. Actual
LCP against the 2.0s target has to come from CrUX — see §11.

---

## 9. Every change made in this pass

`npx tsc --noEmit` → **clean**. `npm run build` → **succeeds**, 38 routes, 30
sitemap entries, no new warnings. (The one pre-existing warning — Next's
`middleware` → `proxy` rename notice — is untouched and out of scope.)

### `app/sitemap.ts`

| Change | Reason |
|---|---|
| Removed `lastModified` from both entry builders | It was `new Date()` on all 30 URLs with daily revalidation, asserting every page changed this morning. §8. |
| `/online-singing-lessons` priority `0.8` → `0.9` | The file's own documented scale says `0.9` = "a page paid traffic lands on"; 11 keywords point here. No crawler effect. |

### `lib/schema.ts` — one actual bug, stated before fixing

| Change | Reason |
|---|---|
| `bookingChannel(name)` → `bookingChannel(name, bookingPath = '/coach/book')` | The URL was hardcoded when all four callers were coaching services. |
| `liveMusicServiceSchema()` passes `'/artist/booking'` | The events Service told consumers to book a wedding through the free **vocal assessment** scheduler, while all three of its own `Offer`s pointed at `/artist/booking`. Self-contradictory node, wrong answer in the machine-readable field. |

Re-verified after the change that nothing else in `lib/schema.ts` moved:
no `availableLanguage` on any `Service`, no `aggregateRating` on the business node,
no `streetAddress`/`geo`/`openingHours` anywhere, `hasCredential` intact, no
`MusicSchool`.

### `app/(coach)/**`

| File | Change | Reason |
|---|---|---|
| `coach/page.tsx` | Title 83→55, description 254→157 | Fourth title claiming the instrument list; free assessment was at char 216, invisible. |
| `coach/about/page.tsx` | Title 79→68 (dropped "& Singer-Songwriter"), description 266→147 | That identity belongs to `/artist`; three pages were competing for it. |
| `coach/services/page.tsx` | Title → "What I Teach…", description 212→147 | "Lessons & Coaching" fought `/coach` and `/coach/lessons/online` for a term it cannot win. |
| `coach/services/page.tsx` | **New `DISCIPLINE_PAGES` map + per-discipline link** | The menu named six disciplines and linked to none. Voice → `/coach/voice-lessons-los-angeles`, Songwriting → `/coach/songwriting`. Keyed by name so renumbering cannot misroute a link. |
| `coach/voice-lessons-los-angeles/page.tsx` | Description 211→156; **linked the existing word "songwriting"** to `/coach/songwriting`; added ownership comment | The anchor was already in the copy, unlinked. Zero new prose. Comment records why this title must not be retitled onto `/vocal-coach-los-angeles`'s term. |
| `coach/faq/page.tsx` | Title 83→68, description 235→159 | Truncation. |
| `coach/contact/page.tsx` | Description 215→158 | Truncation. |
| `coach/pricing/page.tsx` | Title 83→60; description 269→140 with **price computed from `lib/pricing.ts`** | "in Los Angeles" was in the truncated tail — the one word a local pricing query needs. Hardcoded `$70` in a SERP-rendered field on the page people arrive at to check the price. |
| `coach/book/page.tsx` | Title 83→56 with **duration from `ASSESSMENT`**; description 201→144 | Truncation; and a duration in a title is the same stale-number hazard as a price. |
| `coach/lessons/online/page.tsx` | **Title "Online Singing & Music Lessons" → "Online Music Lessons — Voice, Guitar, Piano & Songwriting"**; description 217→143 with **price computed**; long comment recording the ownership split | Finding #2 — two pages claiming "online singing lessons" in the `<title>`. |
| `coach/lessons/online/page.tsx` | **Contextual link → `/online-singing-lessons`** | That page had one inbound link. This is where a reader who has just decided video works goes looking for the voice-specific version. |
| `coach/lessons/in-person/page.tsx` | Title 93→56; description 222→142 with **days generated from `IN_PERSON_DAYS`** | Longest title on the site, all four instruments cut. `IN_PERSON_DAYS` configures Cal.com — a description promising days the scheduler does not offer sends people to an empty booking page. |
| `coach/lessons/in-person/page.tsx` | **Contextual link → `/vocal-coach-los-angeles`** | That page had one inbound link, and it opens on the in-person rate card, making this its closest neighbour. |
| `coach/songwriting/page.tsx` | **Title → "Songwriting Lessons in Los Angeles & Online"**; **H1 → "Songwriting lessons in Los Angeles."**; description 220→146; long comment recording the split | Finding #1 — identical H1 with `/online-songwriting-lessons`. Old H1 contained neither "songwriting" nor a location. New H1 matches the house style of its four sibling `/coach/*` service pages. |
| `coach/songwriting/page.tsx` | **Contextual link → `/online-songwriting-lessons`** | Reciprocal; that page already linked back here and had one inbound link. |
| `coach/privacy/page.tsx` | Title 85→65, description 231→155 | Truncation. |
| `coach/terms/page.tsx` | Title 85→68, description 256→157 | Truncation. |

### `app/(landing)/**`

| File | Change | Reason |
|---|---|---|
| `vocal-coach-los-angeles/page.tsx` | Description 210→151 with **days generated from `IN_PERSON_DAYS`**; added `IN_PERSON_DAYS` import; ownership comment | 31 paid keywords land here, so a scheduling promise the scheduler cannot keep costs money directly. Comment records that this page owns the *person* noun and must not be retitled onto `/coach/voice-lessons-los-angeles`'s term. |
| `online-singing-lessons/page.tsx` | Title 82→67 ("One-to-One, Any Timezone" swapped in); description 266→154; ownership comment | Price was at char 230 on a page bought against 11 keywords. "One-to-One" is the differentiator against group-class franchises. |
| `online-songwriting-lessons/page.tsx` | Description 202→153; ownership comment | Title and H1 deliberately unchanged — this is the page that keeps the conversion headline. Comment says so, so nobody puts it back on `/coach/songwriting`. |

### Files in scope that needed no change

- **`lib/seo.ts`** — canonical, OG and Twitter assembly is already correct and
  centralised, and every one of the 30 pages gets a distinct, self-referential
  canonical on the `www` host from it.
- **`app/robots.ts`** — correct, including the `SITE_NOINDEX` preview behaviour.
  The `Host:` directive is obsolete but harmless.

### Things deliberately not done

- No page had `noindex` added. No page had `noindex` removed. All five
  transactional routes are still `noindex` and still absent from the sitemap.
- No body copy rewritten. The three new contextual links add one clause each; the
  fourth added no words at all.
- No prices typed. Every price and duration in metadata now derives from
  `lib/pricing.ts`.
- The landing pages were **not** added to the footer. See §4.
- The stale comments in `lib/schema.ts` (the `withReviews: false` suggestion for
  `/coach/services`, and "emitted on `/coach` and `/coach/contact` only") were
  left alone. Both are now inaccurate but neither describes a defect.

---

## 10. Needs a human

Prioritised. Each is out of this pass's file scope, or needs a judgement call, or
needs copy written.

### 10.1 Brand duplication in seven titles — `app/(artist)/**` (15 minutes)

`/artist` and all six show pages read "Juliana Beltran — … **| Juliana Beltran**"
because the page title opens with the brand and `app/layout.tsx` appends the
template. 17 of ~60 usable characters, wasted, on seven URLs.

`app/(artist)/artist/page.tsx:15`
```diff
- title: 'Juliana Beltran — Latin Pop & Indie Pop Artist, Los Angeles',
+ title: 'Latin Pop & Indie Pop Artist in Los Angeles',
```

`app/(artist)/artist/live/[slug]/page.tsx:38`
```diff
- title: `Juliana Beltran ${past ? 'played' : 'live at'} ${show.venue} — ${when}`,
+ title: `${show.venue}, ${show.city} — ${when}`,
```
That yields e.g. "Harvard and Stone, Los Angeles, CA — Tuesday, September 1, 2026 |
Juliana Beltran" (79). Still long, but the venue and date — the only two things
anyone searches on a gig page — are now inside the first 60 characters instead of
starting at character 24.

### 10.2 Two show pages share an H1 — `app/(artist)/**` (5 minutes)

`/artist/live/hotel-cafe-hollywood-2026-03-15` and
`.../hotel-cafe-hollywood-2025-03-08` both render `<h1>Hotel Cafe.</h1>`. The only
duplicate H1 left on the site. Adding the year — `Hotel Cafe. 2025.` — or the
show's `note` would separate them.

### 10.3 Section labels are not headings — highest remaining value, needs a designer

Nine coaching pages, including both 1,800-word songwriting and online-lesson
pages, have **one H1 and one H2**. Every section label is
`<div className="eyebrow">` and every list-item title is `<span className="t">`.
So the longest and best content on the site has no crawlable outline, and its
subheadings — "How the work tends to go", "What comes through video, and what
doesn't", "Who this is for" — are invisible as structure to both a search engine
and a screen reader.

**This is not a find-and-replace.** `app/styles.css` has no global heading margin
reset (`.eyebrow` at line 204 sets only family, size, tracking, transform, colour
and weight), so swapping `div` → `h2` inherits the UA default `0.83em` top and
bottom margin and will move layout on every one of those pages. The change needs
`margin: 0` added to `.eyebrow` — or a `.eyebrow` heading variant — plus a visual
pass, and `app/styles.css` was explicitly out of scope for this audit. It is worth
doing properly and it is the single highest-value structural fix outstanding.

### 10.4 Six Spanish keywords have no Spanish page — needs copy and a decision

`clases de canto los angeles`, `clases de canto en los angeles`,
`clases de canto cerca de mi`, `clases de canto`, `maestra de canto`,
`maestra de canto los angeles`, `profesora de canto` all point at
`/vocal-coach-los-angeles`, which is `<html lang="en">`, `locale: en_US`, with no
Spanish body text. Paid will serve those clicks; organic will not rank an English
page for a Spanish query.

Bilingual teaching is a genuine differentiator in this market and it is already
asserted in the markup (`knowsLanguage: ['en','es']` on `Person`,
`availableLanguage: ['en','es']` on every `ServiceChannel`) — the markup is ahead
of the content. The decision is between:

- **One Spanish landing page** (`/clases-de-canto-los-angeles`) with real Spanish
  copy, `lang="es"`, and reciprocal `hreflang` with its English twin. Correct, and
  the only option that can rank. Needs a native-quality Spanish writer, not a
  translation pass.
- **Leave organic alone and keep buying the terms.** Defensible if there is no
  Spanish writer. If so, remove the expectation rather than half-doing it — do not
  sprinkle Spanish phrases into the English page, which helps neither language.

Volume for these terms in the LA market is exactly the kind of claim this audit
cannot make without data — see §11.

### 10.5 Core Web Vitals — `app/fonts.ts` and `app/layout.tsx` (out of scope)

In order of expected LCP gain per unit of risk:

1. **`<link rel="preconnect" href="https://i.ytimg.com">` in `app/layout.tsx`.**
   The LCP element on all three landing pages is a preloaded cross-origin JPEG
   with no warmed connection, so DNS + TCP + TLS to a new origin sits in front of
   it. No `crossorigin` attribute — the existing preload is a plain `as="image"`,
   and the two must match or the connection is not reused. Lowest-risk item here.
2. **Self-host the LCP poster.** 128 KB from `i.ytimg.com` cannot be
   `next/image`-optimised, cannot be served as AVIF, and needs a third-party
   connection. Committing the poster to `/public` and running it through
   `next/image` would cut it to roughly a quarter of the bytes *and* eliminate the
   extra origin — which makes item 1 unnecessary. Bigger change, bigger win.
3. **Drop Pinyon Script or move it out of the root layout.** 24.6 KB preloaded on
   all 30 pages for two decorative selectors that appear on none of the landing
   pages.
4. **Stop preloading Literata italic at first-paint priority.** 110.3 KB. It is
   genuinely used site-wide so it cannot be removed, but nothing above the fold on
   a landing page needs it before the Playfair H1 and the Literata-roman lede have
   painted. Requires care: `display: swap` plus the metric-adjusted fallback is
   what currently keeps CLS at zero, and that must not regress.

Do **not** reintroduce Playfair's `wdth` axis or its italic — the comment in
`app/fonts.ts` documents the 385 KB → 107 KB measurement behind removing them, and
that was the right call.

### 10.6 Smaller items, roughly in value order

- **Description length on seven artist pages** (§2): `/live-music-for-events-los-angeles`
  at 230, `/artist/live-video` at 211, `/artist/press` at 195, `/artist/booking`
  at 181, `/artist/live` at 178, `/artist` at 175, `/` at 184. Same truncation
  problem as the coaching side, same fix, out of scope here.
- **`/coach/services` H1 vs title.** The title is now "What I Teach"; the H1 is
  still "Lessons & coaching." Not wrong — the H1 is the visible page heading and a
  recent voice pass set it — but they no longer agree. Worth a look next time
  anyone is in that file.
- **`vercel.json`: apex→www is a `307` for path requests**, `308` would be more
  correct. Not worth a deploy on its own (§8).
- **`MusicRecording`/`MusicAlbum` on `/artist/music`** — the only missing schema
  type on the site, and low value.
- **A songwriting `FAQPage` scoped to `/coach/songwriting`** (§5.4). Note the
  honest expectation: FAQ rich results have been restricted to authoritative
  government and health sites since August 2023, so build it for the content, not
  for a snippet.
- **Two stale comments in `lib/schema.ts`** — the `{ withReviews: false }`
  suggestion for `/coach/services` (that page now renders all five reviews) and
  "the full LocalBusiness node is emitted on `/coach` and `/coach/contact` only"
  (it is on four pages). Neither describes a defect; both will mislead the next
  reader.

---

## 11. What needs Search Console or field data

Nothing in this audit asserts any of the following. Each needs to be looked up
before anyone acts on it.

**Indexation and coverage**

1. Are all 30 sitemap URLs actually indexed? Specifically the three root landing
   pages, which had one internal link each until this pass — a page discoverable
   only from a sitemap is a common "Discovered – currently not indexed" case.
   *Search Console → Pages → check each of the 30 individually.*
2. Are any of the five `noindex` transactional routes indexed despite the tag?
   Verify `/coach/purchase/confirmed` in particular; if it is indexed it can serve
   a booking confirmation to someone who never booked. *Coverage → "Excluded by
   'noindex' tag"*, and a `site:` check.
3. Did dropping sitemap `lastmod` change crawl behaviour? Compare crawl-request
   volume for the four weeks either side. *Settings → Crawl stats.*
4. Is Google honouring the self-referential canonicals, or picking its own?
   *URL Inspection → "Google-selected canonical"* on `/coach/songwriting`,
   `/online-songwriting-lessons`, `/coach/lessons/online` and
   `/online-singing-lessons` — the four pages involved in a cannibalisation fix.

**Whether the cannibalisation fixes worked**

5. For each term in the §3 ownership map, which URL does Google currently rank?
   *Performance → filter by query → look at the Pages breakdown per query.* The
   signature of unresolved cannibalisation is one query alternating between two
   URLs across weeks. Re-check 4–8 weeks after this deploys, especially the
   songwriting pair and the online-singing pair.
6. Do the retitled pages hold or lose impressions? `/coach/songwriting`,
   `/coach/lessons/online`, `/coach`, `/coach/pricing`,
   `/coach/lessons/in-person`, `/coach/services` and `/coach/about` all changed
   title. Watch impressions and average position per page for a month. A title
   change occasionally loses a term it was ranking for by accident; if that
   happens the query data will name it.
7. Does Google keep the new titles or rewrite them? *Check the rendered SERP
   title.* Rewrites are common when a title is judged a poor match for the query,
   and a rewrite is itself the signal that the title and the page disagree.

**Search volume and competition — none of this is knowable from the repo**

8. Actual monthly volume and competitive difficulty for the terms in §3, and
   whether the "songwriting is less contested than voice" premise this audit and
   `app/sitemap.ts` both build on still holds. *Keyword Planner; Search Console
   impressions as a free proxy for terms already ranking.*
9. Volume for the six Spanish terms in the LA metro (§10.4). This decides whether
   a Spanish page is worth writing. Do not commission the page without it.
10. Whether `/coach/voice-lessons-los-angeles` has enough existing equity to be
    worth protecting as the "voice lessons los angeles" owner. `app/sitemap.ts`
    records that it was indexed before the landing pages existed, and the
    ownership map in §3 assumes that history is worth something — but "how much"
    is a rankings-and-links question. *Performance, filtered to that page, over
    16 months.*

**Core Web Vitals**

11. Field LCP at p75 on mobile, against the stated 2.0s target, for the three
    landing pages. §8 gives transfer sizes and a dependency graph, not a
    measurement. *Search Console → Core Web Vitals, and the CrUX field data in
    PageSpeed Insights.* Origin-level CrUX may not have enough traffic for
    per-URL data, in which case Vercel Speed Insights (already installed) is the
    fallback.
12. Whether CLS is genuinely zero. `display: swap` plus `adjustFontFallback` should
    make it so, and nothing in this pass touched fonts, but it is worth confirming
    from field data rather than from the configuration being correct.
13. Whether the click-to-load `VideoFacade` counts as "playable on the page" for
    the `VideoObject` markup on `/artist/live-video` and `/artist/press`.
    *Search Console → Video indexing report.* If the videos are not indexed, the
    facade is the first thing to suspect.

**Off-site**

14. Whether the artist side actually attracts the editorial links §7 assumes it
    does. That assumption is the main reason the recommendation is "keep one
    domain". *Links report → external links by target page.* If the artist pages
    have no external links after this long, the topical-authority argument for
    keeping both halves on one host is weaker than stated — though the
    demonstrable-experience argument stands on its own.
