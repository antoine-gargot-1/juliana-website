# Meta ads — "Serás Tú" release show

Juliana Beltrán & The Divas · **Thu Nov 5 2026, 9 PM** · Dragonfly, 6510 Santa Monica Blvd,
LA 90038 · $15 advance / $20 door · **21+** · tickets on Partiful.

Budget **~$300 total pre-show**, separate from the $400/mo Google Search budget for coaching
(that one stays Search-only, see `README.md` §4). Runway Oct 22 → Nov 5. Optional ~$30
post-show (Nov 6–10) **on top**, only if the budget allows (§2).

Landing page for every ad: `/artist/live/seras-tu-release-show-dragonfly-2026-11-05`.

## Goals

1. **Sell tickets.** Partiful count is the number that matters.
2. **Get industry in the room**: talent managers, agents, A&R, press, curators (§8).

The two goals are the same goal. Managers judge an artist on draw, engagement and momentum,
so a full room does more than ad reach ever will — every ticket counts for more than any
number of impressions. Sources: [TunePact](https://tunepact.com/blog/diy-artist-booking-strategy),
[Elton Audio](https://www.eltonaudio.com/artist-advantage/what-artist-managers-actually-expect-from-artists).

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

Status Oct 22: Partiful link and music video are on the site. **Pixel ID still pending.**

- [ ] Meta Business account + ad account, payment method added.
- [ ] Events Manager → create a Dataset (Pixel) → set `NEXT_PUBLIC_META_PIXEL_ID` in
      Vercel (Production) → redeploy. Check with Meta Pixel Helper (§6). **Pending.**
- [x] Partiful URL in `content/shows.json` `tickets`
      (https://partiful.com/e/gJpY5xCjiuMCxANodxAQ). The "Get tickets" button renders.
- [x] Video live on YouTube ("Serás tú (Video Oficial)", `wBa79q9rT2I`, out Oct 22) →
      in `content/videos.json`, show's `videoSlug` set.
- [ ] Upload the video natively to the FB Page and IG account too. Ads run on the native
      upload, not a YouTube link — that's what builds the video-viewer audience.
- [ ] Facebook Event created, **Dragonfly added as co-host** (and The Divas, if they have a
      Page). Ticket URL on the event = the show page with UTMs (§4), not Partiful directly.
- [ ] GA4 Admin → Events → mark `ticket_click` as a key event.
- [ ] Facebook Sharing Debugger on the show URL → "Scrape again". Should show the 1200×630
      Serás Tú image.

## 2. Phases and budget

Split below is an **estimate**, set from published benchmarks (§6), not from this account.

| Phase | Dates | Objective (Ads Manager) | Audience | Budget |
|---|---|---|---|---|
| **P1 Video** | Oct 22–25 | Engagement → Video views → **ThruPlay** | Cold LA (§3) | $12.50/day = **$50** |
| **Event** | Oct 22–31 | Engagement → **Event responses** on the FB Event | Cold LA (§3) | $5/day = **$50** |
| **P2 Traffic** | Oct 26–30 | Traffic → **Landing page views** → show page | Cold LA, exclude video viewers & engagers | $18/day = **$90** |
| **P3 Retarget** | Oct 31–Nov 3 | Traffic → Landing page views → show page. Copy: "tickets going fast" | Warm (§3), exclude InitiateCheckout | $15/day = **$60** |
| **P3 Tonight + reminder** | Nov 4–5, **stop 6 PM Nov 5** | Traffic → Landing page views. Copy: "tomorrow" (Nov 4), "tonight" (Nov 5) | Warm (§3) **plus** FB Event Interested/Going and InitiateCheckout (ticket clickers) — reminder cuts no-shows | $25/day = **$50** |
| | | | **Total pre-show** | **$300** |
| *Optional post-show* | Nov 6–10 | Engagement → video views, live clip as social proof | Warm + Cold LA | ~$6/day = **~$30, on top** |

P3 total = $60 + $50 = **$110**. The post-show line only runs if there's money left over
(or the $30 is clearly spare); it isn't part of the $300.

**Stall rule:** if the Partiful count hasn't moved by **Oct 30**, stop P2 and the Event ads
and move every remaining dollar into P3 retargeting.

Why this shape: on $300 the ad account will never collect the ~50 conversions a week Meta
needs to optimise for a purchase, so the plan buys cheap video attention first, then spends
the click money on people who already watched. Retargeting starts Oct 31 and gets the
biggest share because a warm click is more likely to be a ticket, and tickets are what
managers look at (Goals). Event responses are cheap reach and give the FB Event its
reminder notifications; treat "Interested" as reach, not sales.

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
  Kali Uchis. Check each still exists as an interest; Meta removed many detailed-targeting
  options on Jan 15 2026 (§8).
- Placements: Advantage+ placements, but make sure the 9:16 cut is assigned to Reels and
  Stories.

**Warm** (P3) — build these on Oct 26 as Custom Audiences:
- Video: people who watched ≥50% of any Serás Tú cut, last 30 days.
- Website: Pixel visitors to `/artist`, last 30 days.
- Instagram account + Facebook Page engagers, last 30 days.
- FB Event: people who responded Interested/Going.
- **Exclude** (Oct 31–Nov 3 only): Website → InitiateCheckout, last 14 days (already
  clicked through to tickets). The Nov 4–5 reminder ad set **includes** them instead.

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
| Industry invites (§8) | `utm_source=email&utm_medium=outreach&utm_campaign=seras-tu-2026-11` |

Name ads so `utm_content` reads on its own: `p1-vid-916-hook-a`, `p2-flyer-11`,
`p3-fast-916`, `p3-tonight-916`, `p3-reminder-going`.

## 5. Creative

- **3–5 vertical 9:16 cuts** of the video, 6–15 s each. Different hook per cut: chorus,
  first vocal line, a strong visual moment.
- Hook in the first 1–2 seconds. Most people watch muted: burned-in captions/lyrics.
- Last 3 s on screen: **SERÁS TÚ · NOV 5 · DRAGONFLY · $15 · 21+**.
- One 1:1 cut for feed. The flyer as a static ad in P2 as a control.
- P3 copy turns urgent: "tickets going fast" (Oct 31–Nov 3), "tomorrow" (Nov 4),
  "tonight" (Nov 5 morning). Only say "going fast" if the Partiful count is actually
  moving — otherwise use the $15-advance line. No invented scarcity.
- No drink shots — bar venue + ads = review trouble.
- Copy rules from `docs/rebrand-plan.md`: contractions, no banned words, no invented stats.

Draft primary text (edit freely; bilingual on purpose):

- P1: "Serás Tú — el nuevo sencillo, out now. 🎥"
- P2: "Serás Tú, live for the first time. Juliana Beltrán & The Divas at Dragonfly,
  Thursday Nov 5, 9 PM. $15 advance, $20 at the door. 21+."
- P3 (Oct 31–Nov 3): "Tickets are going fast. Nos vemos el jueves — $15 advance until the
  day of the show."
- P3 reminder (Nov 4): "Tomorrow night at Dragonfly. You said you'd come — nos vemos."
- P3 (Nov 5): "Tonight at Dragonfly, 9 PM. Serás Tú, live."
- Post-show (optional): "Serás Tú, live at Dragonfly. Thank you, LA." + 15–30 s live clip.

## 6. Daily check (10 minutes)

Write it down each morning: spend, CPM, cost per ThruPlay, cost per landing page view,
GA4 `ticket_click` (by `utm_content`), **Partiful count**, industry RSVPs (§8).

Rough expectations (from published 2025–26 benchmarks, **not measured on this account**):
cost per ThruPlay $0.05–0.30, cost per landing page view $0.40–1.50, CTR 1–4%. A
reasonable outcome on $300 is somewhere around 20–60 tickets influenced by ads, on top of
organic (estimate).

Kill rules:
- An ad with frequency > 3 on a cold audience → pause it, swap in a new cut.
- An ad costing > 2× its ad set's median per result after $10 spent → pause.
- A P2 ad set with **0 `ticket_click` after $25** → kill it, move the money to P3.
- Partiful count flat by **Oct 30** → stall rule (§2): all remaining money to P3.
- Partiful count flat for 3 days while `ticket_click` rises → check the ticket link/flow
  on a phone before spending more.

## 7. Free channels, same window

- Instagram **Collab post** with Dragonfly (and The Divas) — lands in both audiences' feeds.
- YouTube: premiere the video, **pinned comment** with the show link (UTMs §4).
- Spotify for Artists: Canvas loop on Serás Tú once it's on DSPs.
- Link-in-bio → show page.
- IG Stories countdown sticker for Nov 5; reshare every Story mention.
- Email the list: Oct 22 (video + show), Nov 1 (one week), Nov 5 (tonight).
- **Press pitch this week** (by Oct 26): Grimy Goods (monthly LA show roundups), Remezcla
  LA, KCRW (Raul Campos). Details and links in §8.

## 8. Industry invites (not ads)

**Why not ads:** paid industry targeting isn't viable at this budget.
- Meta removed many detailed-targeting categories on Jan 15 2026, and detailed-targeting
  exclusions too ([AdLibrary](https://adlibrary.com/posts/meta-interest-targeting-removed),
  [Wicked Reports](https://www.wickedreports.com/blog/meta-removes-detailed-targeting-exclusions-from-ad-campaigns)).
- LinkedIn: $10/day minimum, 300-member minimum audience, recommends 20K+
  ([Stackmatix](https://www.stackmatix.com/blog/linkedin-ads-audience-size)). LA music
  managers are nowhere near 20K.

Channel = **personal email or DM**, one at a time.

### The list (30–50 names, a reason next to each)

| Who | Where to find them |
|---|---|
| Managers of similar-size Latin pop / indie artists | Management roster pages, IG bios ("mgmt:"), LinkedIn, release credits |
| Managers, agents, A&R | Music Business Registry — Artist Managers / A&R Registry, $100/issue ([link](https://www.musicregistry.com/product-page/A-and-R-Registry-1-pdf-issue)) |
| Press: Remezcla LA | [remezcla.com/about-us](https://remezcla.com/about-us/) |
| Radio: KCRW, Raul Campos | [submission notes](https://label-engine.com/news/submit-your-music-to-kcrw-fm/) |
| Press: Grimy Goods | Monthly LA show roundups — **pitch this week** |
| Curators | Editors/owners of the 3 editorial playlists already featuring Juliana, local promoters |

Reason column = one line on why this person (e.g. "manages X, same size, same scene").
No reason, no invite.

### Comp block (estimate)

- [ ] Hold **~15–20 guest-list spots, each +1**, with the Dragonfly door. Separate from
      Partiful; these don't count as tickets.
- [ ] Confirm set time with Dragonfly. If there are openers, ask for **~10–10:30 PM**
      (estimate — late enough that industry who come after dinner see the set).

### Cadence (estimate)

| When | Send |
|---|---|
| By **Oct 26** | Invites (template below). |
| **Nov 3** | Short reminder to everyone who said yes or didn't answer. |
| **Nov 5**, morning | "Still a maybe for tonight, or should I free up your spot?" ([Team Around You](https://theteamaroundyou.substack.com/p/how-independent-artists-build-a-live)) |

### Email template

Subject: **Guest list for you: Juliana Beltrán — Serás Tú release show, Thu 11/5, Dragonfly**

> Hi {name},
>
> {One personal line: why them — an artist they manage, a piece they wrote, a show they
> booked.}
>
> I'm Juliana Beltrán, an LA singer-songwriter — {one line on the sound}. ~9K monthly
> Spotify listeners and 3 editorial playlists so far. My new single Serás Tú came out
> Oct 22, and I'm playing it live for the first time on Thursday Nov 5 at Dragonfly.
>
> - New video: https://www.youtube.com/watch?v=wBa79q9rT2I
> - Best live clip: https://www.juliana-beltran.com/artist/live-video?utm_source=email&utm_medium=outreach&utm_campaign=seras-tu-2026-11
> - EPK: https://www.juliana-beltran.com/artist/press?utm_source=email&utm_medium=outreach&utm_campaign=seras-tu-2026-11
> - Show: https://www.juliana-beltran.com/artist/live/seras-tu-release-show-dragonfly-2026-11-05?utm_source=email&utm_medium=outreach&utm_campaign=seras-tu-2026-11
>
> Set time: {set time}. Reply and you're on the list, +1.
>
> Juliana

Numbers come from `content/artist.json` (9K+ monthly listeners, 3 editorial playlists).
Don't round them up.

### Website

- [x] Show page has an **"Industry & press"** guest-list line: mailto to
      julianabeltranmusic@gmail.com with the subject prefilled, plus the EPK link.

### Day of (Nov 5)

- [ ] One friend runs the guest list and greets industry by name at the door.
- [ ] QR code for email signup at merch and by the stage (estimate: one printed sign each).
- [ ] Film from two angles — this is the post-show clip and the follow-up clip.
- [ ] Finish on time.

### Follow-up (within 24–48h, estimate)

- [ ] Everyone who came: thanks + a 60–90 s live clip + the attendance and merch numbers
      (real counts from the door and Partiful).
- [ ] No-shows: the clip + the next date.

Sources: [CD Baby](https://diymusician.cdbaby.com/music-career/top-tips-for-booking-gigs-as-an-indie-artist/),
[Team Around You](https://theteamaroundyou.substack.com/p/how-independent-artists-build-a-live).

## 9. Calendar

| Date | Do |
|---|---|
| Oct 22 | §1 checklist (Pixel ID still pending). Launch P1 + Event ads. Start the industry list (§8). |
| Oct 25 | P1 ends. |
| Oct 26 | Build Warm custom audiences (§3). Launch P2. **Industry invites out** + press pitches (Grimy Goods, Remezcla, KCRW). |
| Oct 30 | **Stall check:** Partiful count flat? Stop P2 + Event, move everything left to P3. P2 ends. |
| Oct 31 | Launch P3 ("tickets going fast"). Event ads end. |
| Nov 1 | Email #2. |
| Nov 3 | Industry reminder. Confirm guest list + set time with Dragonfly. |
| Nov 4 | Launch reminder ad set (Interested/Going + ticket clickers), "tomorrow". |
| Nov 5, morning | "Tonight" ads. Industry day-of check. |
| Nov 5, 6 PM | **Stop all ads.** |
| Nov 6 | Write the result here: spend per phase, `ticket_click`, Partiful total, door count, industry who came. Start industry follow-ups (done by Nov 7). |
| Nov 6–10 | Optional ~$30 live-clip ad, on top of the $300, only if budget allows. |

## 10. Built in Meta (Oct 24) — everything created PAUSED

Ad account `act_404919904776859` ("Juliana Beltran ADS", USD, America/Los_Angeles).
Site pixel `250433990668051` (linked to that ad account).

| What | ID | Budget | Window (PT) |
|---|---|---|---|
| Campaign P1 Video views (Engagement) | 120250517619380553 | | |
| ↳ Ad set: Cold LA 21–44, ThruPlay | 120250517621120553 | $50 lifetime | Oct 24 6 PM → Oct 26 |
| Campaign P2 Traffic (show page) | 120250517619730553 | | |
| ↳ Ad set: Cold LA 21–44, landing page views | 120250517621480553 | $90 lifetime | Oct 27 → Oct 30 |
| Campaign P3 Retarget + reminder (Traffic) | 120250517627290553 | | |
| ↳ Ad set: site visitors, excl. ticket clickers | 120250517627390553 | $60 lifetime | Oct 31 → Nov 3 |
| ↳ Ad set: reminder, visitors + ticket clickers | 120250517627620553 | $50 lifetime | Nov 4 → **Nov 5 6 PM** |
| Audience: site visitors /artist 30d | 120250517626950553 | | |
| Audience: ticket clickers (InitiateCheckout) 14d | 120250517626980553 | | |
| Ad videos p1-vid-916-hook-a / b / c | 1993163431340625 / 1850474392631747 / 946176204954246 | | |

Cold targeting: 18 mi around Dragonfly, 21–44, interests Natalia Lafourcade, Mon Laferte,
Julieta Venegas, rock en español, Latin pop, Indie pop. Carla Morrison and Ximena Sariñana
were merged away by Meta and are not available. Advantage+ audience off.

Audiences added to both P3 ad sets: IG engagers 60d (120250517647700553), Page engagers 60d
(120250517647750553), video viewers 50% 30d (120250517648640553). Ad identity: Page 110266958308844 +
IG @juliana.beltran (17841404276201029). Copy per phase as in §5.

| Ad (all PAUSED) | ID |
|---|---|
| p1-vid-916-hook-a | 120250517669340553 |
| p1-vid-916-hook-b | 120250517670010553 |
| p1-vid-916-hook-c | 120250517671150553 |
| p2-vid-916-hook-a | 120250517672050553 |
| p2-vid-916-hook-b | 120250517672560553 |
| p2-vid-916-hook-c | 120250517672880553 |
| p3-vid-916-hook-a | 120250517673040553 |
| p3-vid-916-hook-b | 120250517673210553 |
| p3-vid-916-hook-c | 120250517673450553 |
| p3r-vid-916-hook-a | 120250517673790553 |
| p3r-vid-916-hook-b | 120250517674150553 |
| p3r-vid-916-hook-c | 120250517674610553 |

Facebook: full official video (final_v18, = YouTube cut) posted to the Page Oct 24 as
video 1435112397966462. Old Reel 1324716976327907 (Oct 22, 2:55, wrong cut) deleted Oct 24.

FB Event 29305227702446034 ("Single Release Show - Serás tú"). Event-responses campaign
120250518798290553, ad set 120250518799700553 ($50 lifetime, Oct 25 8 AM → Oct 31, Facebook feed +
stories, cold LA 21–44), ads 120250518801050553, 120250518801640553, 120250518802810553 — all PAUSED.

### Oct 24 evening revision (after full review)

- **Instagram only** (Stories + Reels for P1/P2; Feed + Stories + Reels for P3/P3r). FB
  Event ads **paused** — the audience doesn't use FB events; its $50 moved to P2.
- Budget, still $300: P1 $50 (Oct 24 6 PM → 26) · P2 **$120** (Oct 27 → **Nov 2**) · P3
  **$70** (**Nov 1** → 3) · P3r **$60** (Nov 4 → **8:30 PM Nov 5**, door sales count).
- Warm audiences now include IG engagers 365d (120250519559190553); ticket-clicker
  exclusion removed (with Venmo chip-in a click isn't a purchase).
- **v2 creatives**: "SERÁS TÚ · LIVE THU NOV 5 · HOLLYWOOD" lower third from 0:00, end card
  at 11 s; Spanish-first copy; v1 ads paused. Videos 4672024279789483, 1714868866879260, 1784003786162651.
- P3r has one ad straight to Partiful (p3r-v2-partiful-direct-a): skips a page load at the
  last moment; pixel can't see it, judge it by Partiful's count.
- Video-viewer audience from the ad videos can't be built until they've run (Meta needs a
  Page association). Retry Oct 26; until then P3 relies on site visitors + IG/Page engagers.
- Venmo chip-in is honor-system and against Venmo's personal-account terms for ticket
  sales. Switch Partiful to its card/Apple Pay ticketing (same URL) before Oct 27.
- Doors 8:45 PM, music 9 PM (site, schema doorTime). Partiful must say the same.

### Oct 26 — tickets move to DICE

- Tickets: **DICE**, $17 all-in (fees included), $20 at the door. Public URL
  `https://dice.fm/event/6dyoqq-single-release-show-sers-t-5th-nov-dragonfly-hollywood-los-angeles-tickets`.
  Source tags in DICE's dashboard: `dice_tags=website` (site button), `dice_tags=meta_ads`
  (direct ad). Partiful stays as a free RSVP page (Venmo chip-in removed).
- Every price in ads and on the site is now $17. The FTC's 2025 live-event rule requires the
  advertised price to be the total; the $15 end card and copy are retired.
- **v3 creatives** (A and C only; B underperformed): end card "TICKETS $17 ON DICE · 21+",
  copy mentions DICE. v2 ads and the Partiful-direct ad paused; P3r has a DICE-direct ad
  (`p3r-v3-dice-direct-a`).
- Ground truth for sales is now the DICE dashboard (by tag), not Partiful.
- To do after v3 has run: add the v3 ad posts' page videos to the ad-video viewer audience.

### Oct 26 evening — traffic phase narrowed to 21–34

P1 data: Meta put 46% of impressions on 35–44 (cheapest views) although 25–34 watch more
(46% to the end vs 30%) and 21–24 most (63%). P2 (cold traffic, $120, from Oct 27) now
targets **21–34**; estimated audience ~650–770K (was ~1.0–1.2M). P3 and P3r stay 21+ — they
only reach people who already watched, visited or engaged.

### Oct 28 — straight-to-DICE test in the traffic phase

26 show-page visits from P2 produced 0 "Get tickets" clicks (the site overall: 172 page views,
7 ticket clicks since Oct 24). To test whether the extra hop costs sales, $30 of P2 moved
into a new ad set in the same campaign:

| Ad set | Destination | Optimises for | Budget | Tag in DICE |
|---|---|---|---|---|
| P2 (120250517621480553) | show page → DICE button | landing page views | $90 (was $120) | `website` |
| P2b (120250571474440553) | **DICE directly** | link clicks | $30, Oct 28 → Nov 2 | `meta_ads_traffic` |

Same audience (LA 18 mi, 21–34, same interests, IG Stories + Reels), same v3 video A and copy.
Total budget unchanged at $300. Read the result in DICE's dashboard by tag around Oct 31;
the Pixel can't see P2b visitors.

**Oct 28, 4 PM — budget moved to the direct route.** First read: straight-to-DICE 5.77% CTR at
$0.29/click (6 clicks) vs show page 1.26% at $0.90 (27 clicks, none since the morning, 0 ticket
clicks). On the operator's call, P2 $90 → **$50** (keeps ~$25 of site visits to feed the
retargeting audiences) and P2b $30 → **$70**. Total still $300. Small sample: confirm against
DICE sales by tag (`meta_ads_traffic` vs `website`) before Nov 1.

**Oct 29, 5 AM — direct route confirmed, more budget moved.** P2b (straight to DICE): 24 clicks,
3.40% CTR, $0.39/click, Reels best ($0.24/click). P2 (show page): 3 clicks for $10.08 on Oct 28
(0.32% CTR, $3.36/click), still 0 ticket clicks. P2 $50 → **$35** (~$10 left, keeps a trickle of
site visitors for retargeting), P2b $70 → **$85**. Traffic total still $120; plan total $300.
