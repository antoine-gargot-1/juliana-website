# Meta ads — "Serás Tú" release show

Juliana Beltrán & The Divas · **Thu Nov 5 2026, 9 PM** · Dragonfly, 6510 Santa Monica Blvd,
LA 90038 · $15 advance / $20 door · **21+** · tickets on Partiful.

Budget **~$300 total**, separate from the $400/mo Google Search budget for coaching (that
one stays Search-only, see `README.md` §4). Runway Oct 22 → Nov 5.

Landing page for every ad: `/artist/live/seras-tu-release-show-dragonfly-2026-11-05`.

## 0. What's measured, and what isn't

| Step | Signal | Where |
|---|---|---|
| Watched the video (in-feed) | ThruPlay, 50% / 75% viewers | Meta Ads Manager |
| Landed on the show page | PageView + ViewContent, GA4 page_view + UTMs | Meta Pixel, GA4 |
| Clicked "Get tickets" | **InitiateCheckout** / GA4 **`ticket_click`** | Meta Pixel, GA4 |
| Bought a ticket | — | **Partiful only.** No pixel there. |

`ticket_click` is the last step the site sees. Write down the Partiful RSVP/ticket count
every morning — the day-over-day change is the real result, and comparing it with spend
by phase is the only honest read on cost per ticket.

## 1. Before the first dollar (Oct 22)

- [ ] Meta Business account + ad account, payment method added.
- [ ] Events Manager → create a Dataset (Pixel) → set `NEXT_PUBLIC_META_PIXEL_ID` in
      Vercel (Production) → redeploy. Check with Meta Pixel Helper (§6).
- [ ] Partiful URL in `content/shows.json` `tickets` → redeploy. The "Get tickets" button
      only renders once it's set.
- [ ] Video live on YouTube → add it to `content/videos.json` and set the show's
      `videoSlug` → redeploy.
- [ ] Upload the video natively to the FB Page and IG account too. Ads run on the native
      upload, not a YouTube link — that's what builds the video-viewer audience.
- [ ] Facebook Event created, **Dragonfly added as co-host** (and The Divas, if they have a
      Page). Ticket URL on the event = the show page with UTMs (§4), not Partiful directly.
- [ ] GA4 Admin → Events → mark `ticket_click` as a key event.
- [ ] Facebook Sharing Debugger on the show URL → "Scrape again". Should show the 1200×630
      Serás Tú image.

## 2. Phases and budget

| Phase | Dates | Objective (Ads Manager) | Audience | Budget |
|---|---|---|---|---|
| **P1 Video** | Oct 22–26 | Engagement → Video views → **ThruPlay** | Cold LA (§3) | $15/day = **$75** |
| **Event** | Oct 22–31 | Engagement → **Event responses** on the FB Event | Cold LA (§3) | $5/day = **$50** |
| **P2 Traffic** | Oct 27–Nov 1 | Traffic → **Landing page views** → show page | Cold LA, exclude video viewers & engagers | $15/day = **$90** |
| **P3 Retarget** | Nov 2–5, **stop 6 PM Nov 5** | Traffic → Landing page views → show page | Warm (§3), exclude InitiateCheckout | ~$21/day = **$85** |

Why this shape: on $300 the ad account will never collect the ~50 conversions a week Meta
needs to optimise for a purchase, so the plan buys cheap video attention first, then spends
the click money on people who already watched. Event responses are cheap reach and give the
FB Event its reminder notifications; treat "Interested" as reach, not sales.

Don't use the **Boost** button — it hides the objective, exclusions and placement controls.
Use Ads Manager.

## 3. Audiences

**Cold LA** (P1, Event, P2)
- Location: 18 mi around 6510 Santa Monica Blvd, "People living in or recently in".
- **Age 21–44.** Dragonfly is 21+; never go below 21.
- Languages: leave blank (covers English and Spanish speakers).
- Detailed targeting, manual (budget is too small for Advantage+ audience to find its
  feet): Latin alternative, Latin pop, Rock en español, plus similar artists —
  Natalia Lafourcade, Ximena Sariñana, Mon Laferte, Carla Morrison, Julieta Venegas,
  Kali Uchis. Check each still exists as an interest; Meta merged many in 2025.
- Placements: Advantage+ placements, but make sure the 9:16 cut is assigned to Reels and
  Stories.

**Warm** (P3) — build these on Oct 26 as Custom Audiences:
- Video: people who watched ≥50% of any Serás Tú cut, last 30 days.
- Website: Pixel visitors to `/artist`, last 30 days.
- Instagram account + Facebook Page engagers, last 30 days.
- FB Event: people who responded Interested/Going.
- **Exclude**: Website → InitiateCheckout, last 14 days (already clicked through to tickets).

## 4. UTMs

Meta ads (paste into the ad's URL parameters field; Meta fills the `{{…}}` values):

```
utm_source={{site_source_name}}&utm_medium=paid_social&utm_campaign=seras-tu-2026-11&utm_content={{ad.name}}&utm_term={{adset.name}}
```

Organic links:

| Where | Parameters |
|---|---|
| IG bio / stories | `utm_source=instagram&utm_medium=social&utm_campaign=seras-tu-2026-11&utm_content=bio` (or `story-1102`) |
| YouTube description / pinned comment | `utm_source=youtube&utm_medium=social&utm_campaign=seras-tu-2026-11&utm_content=pinned` |
| FB Event ticket link | `utm_source=facebook&utm_medium=social&utm_campaign=seras-tu-2026-11&utm_content=fb-event` |
| Email | `utm_source=newsletter&utm_medium=email&utm_campaign=seras-tu-2026-11` |

Name ads so `utm_content` reads on its own: `p1-vid-916-hook-a`, `p2-flyer-11`, `p3-tonight-916`.

## 5. Creative

- **3–5 vertical 9:16 cuts** of the video, 6–15 s each. Different hook per cut: chorus,
  first vocal line, a strong visual moment.
- Hook in the first 1–2 seconds. Most people watch muted: burned-in captions/lyrics.
- Last 3 s on screen: **SERÁS TÚ · NOV 5 · DRAGONFLY · $15 · 21+**.
- One 1:1 cut for feed. The flyer as a static ad in P2 as a control.
- P3 copy turns urgent: "last advance tickets" (Nov 2–4), "tonight" (Nov 5 morning).
- No drink shots — bar venue + ads = review trouble.
- Copy rules from `docs/rebrand-plan.md`: contractions, no banned words, no invented stats.

Draft primary text (edit freely; bilingual on purpose):

- P1: "Serás Tú — el nuevo sencillo, out now. 🎥"
- P2: "Serás Tú, live for the first time. Juliana Beltrán & The Divas at Dragonfly,
  Thursday Nov 5, 9 PM. $15 advance, $20 at the door. 21+."
- P3: "Nos vemos el jueves. Advance tickets are $15 until the day of the show."
- P3 (Nov 5): "Tonight at Dragonfly, 9 PM. Serás Tú, live."

## 6. Daily check (10 minutes)

Write it down each morning: spend, CPM, cost per ThruPlay, cost per landing page view,
GA4 `ticket_click` (by `utm_content`), **Partiful count**.

Rough expectations (from published 2025–26 benchmarks, **not measured on this account**):
cost per ThruPlay $0.05–0.30, cost per landing page view $0.40–1.50, CTR 1–4%. A
reasonable outcome on $300 is somewhere around 20–60 tickets influenced by ads, on top of
organic.

Kill rules:
- An ad with frequency > 3 on a cold audience → pause it, swap in a new cut.
- An ad costing > 2× its ad set's median per result after $10 spent → pause.
- A P2 ad set with **0 `ticket_click` after $25** → kill it, move the money to P3.
- Partiful count flat for 3 days while `ticket_click` rises → check the ticket link/flow
  on a phone before spending more.

## 7. Free channels, same window

- Instagram **Collab post** with Dragonfly (and The Divas) — lands in both audiences' feeds.
- YouTube: premiere the video, **pinned comment** with the show link (UTMs §4).
- Spotify for Artists: Canvas loop on Serás Tú once it's on DSPs.
- Link-in-bio → show page.
- IG Stories countdown sticker for Nov 5; reshare every Story mention.
- Email the list: Oct 22 (video + show), Nov 1 (one week), Nov 5 (tonight).

## 8. Calendar

| Date | Do |
|---|---|
| Oct 22 | §1 checklist. Launch P1 + Event ads. |
| Oct 26 | Build Warm custom audiences (§3). |
| Oct 27 | Launch P2. Pause P1 if ThruPlay cost has climbed past the benchmark. |
| Nov 1 | Event ads end. Email #2. |
| Nov 2 | Launch P3. Pause P2. |
| Nov 5, 6 PM | **Stop all ads.** |
| Nov 6 | Write the result here: spend per phase, `ticket_click`, Partiful total, door count. |
