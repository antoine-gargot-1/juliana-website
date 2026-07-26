# juliana-beltran.com

Next.js (App Router) site for Juliana Beltran — the artist side (live dates,
music, press kit, event booking) and the coaching studio (lessons, FAQ, studio
inquiry). Every route is statically generated; there is no client-only
rendering fallback.

Canonical origin: `https://www.juliana-beltran.com`. The apex 308-redirects to
`www` via `vercel.json`.

## Commands

```bash
npm run dev     # next dev
npm run build   # next build — must pass with zero errors
npm start       # serve the production build locally
```

## Layout

```
app/
  layout.tsx                     root: fonts, styles.css, metadataBase, analytics,
                                 sitewide Person + WebSite JSON-LD
  page.tsx                       /  — crawlable landing page + client-side
                                 localStorage redirect for returning visitors
  (artist)/                      artist nav + footer
    artist/…                     /artist, /music, /live, /live/[slug], /press, /booking
    live-music-for-events-los-angeles/
  (coach)/                       coach nav + footer
    coach/…                      /coach, /about, /services, /faq, /contact,
                                 /voice-lessons-los-angeles
  sitemap.ts  robots.ts          generated, www host
  styles.css                     the original global stylesheet, unchanged
  fonts.ts / fonts.css           next/font families mapped onto the design tokens
components/                      server by default; "use client" only where a
                                 browser API is needed
content/*.json                   all copy-level data, ISO dates
lib/site.ts                      canonical host, socials, share image
lib/content.ts                   typed loaders + date derivation
lib/seo.ts                       per-route metadata helper + breadcrumbs
lib/schema.ts                    JSON-LD builders
```

## Content

Editing `content/shows.json` is enough to add a live date: it produces the row
on `/artist` and `/artist/live`, its own page at `/artist/live/<slug>`, a
`MusicEvent` JSON-LD block, and a sitemap entry. Upcoming vs. past is derived
from the ISO `end` datetime, never from which list a row sits in.

`content/artist.json` documents why the Spotify stat reads "9K+ monthly
listeners" — read the `_comment` there before changing it.
