# Google Business Profile — setup for Juliana Beltran

Companion to `marketing/google-ads/`. Organic local presence, no ad spend involved.

---

## 1. The listing type. Read this before touching anything else.

**This must be a service-area business (SAB) with the address hidden. Not a storefront.**

In-person lessons happen in a private residence. There is no studio and no commercial
space. Two consequences, and the second is the expensive one:

1. Publishing the address publishes her home address to the internet, permanently, next to
   a map pin.
2. **Listing a residence as a storefront is a suspension risk.** Google's guidelines expect
   a storefront listing to be a business location staffed during its posted hours and
   signed for customers. A suspended profile takes weeks to appeal and, while suspended,
   it ranks nowhere — which also removes the review asset the ads rely on.

So: service-area business, address entered for verification but **not shown**, service area
defined by the cities she covers.

### The honest tradeoff

Hiding the address costs local-pack ranking. Google's local ranking is partly proximity-
based, and an SAB with no public pin competes less well for "vocal coach near me" than a
storefront three blocks from the searcher. That is a real cost and it is worth paying:

- Reviews and profile completeness are the levers she *can* pull, and they are the ones
  that compound (see §7).
- The paid Search campaign in `google-ads/` is precisely the tool for the proximity queries
  the SAB listing will under-serve. That is why Campaign 1 exists and why it is funded
  first.

Do not "fix" the ranking by revealing the address later. That is the failure mode this
whole section exists to prevent.

---

## 2. Setup steps, in order

1. Go to `business.google.com` and search for "Juliana Beltran" first — check no listing
   already exists (an old one may have been auto-generated). If one exists, **claim it**
   rather than creating a duplicate. Duplicates get merged or suspended.
2. Business name: **`Juliana Beltran Music`** — or plain `Juliana Beltran`.
   - Do **not** use "Juliana Beltran Vocal Coach Los Angeles". Keyword-stuffed names are
     the single most commonly enforced GBP name violation, and the penalty is suspension.
3. When asked *"Do you want to add a location customers can visit?"* → **No**.
   - If you already answered yes, fix it: `Edit profile` → `Location` → turn OFF
     **"Show business address to customers"**, then define service areas.
4. Enter the residence address when prompted for verification purposes. It is used by
   Google to verify and is not published once the toggle above is off.
5. Set the service area (§4).
6. Categories (§3).
7. Verify (§5).
8. Complete the profile: services, attributes, hours, photos, links (§6).

---

## 3. Categories

| | |
|---|---|
| **Primary** | Singing Instructor |
| **Secondary** | Music Instructor |

**Caveat, verify in the picker:** GBP categories are a fixed, occasionally-renamed picklist
and cannot be freetexted. I could not confirm the exact current strings from here. If
"Singing Instructor" is not offered, the nearest correct options are, in order of
preference: `Singing Teacher`, `Voice Instructor`, `Music Instructor`. Pick the most
specific one available as primary and put `Music Instructor` second.

Do **not** add `Music School` — it implies an institution and premises she does not have.
The primary category is the strongest single ranking signal on the profile, so it is worth
a minute in the picker to get right.

---

## 4. Service area

Service areas are named places (cities, ZIPs, regions), max 20. List where students
actually come from — the neighbourhood list already in the repo
(`app/(coach)/coach/voice-lessons-los-angeles/page.tsx`, `NEIGHBOURHOODS`) is the honest
source:

```
Los Angeles, CA          Culver City, CA        West Hollywood, CA
Santa Monica, CA         Beverly Hills, CA      Glendale, CA
Burbank, CA              Pasadena, CA           Inglewood, CA
Sherman Oaks, CA         Studio City, CA        Long Beach, CA
```

Then add **online lessons as a listed service** (§6) so the profile also answers the
"can you teach me remotely" question. Note the asymmetry and do not paper over it: GBP's
service-area model assumes the business travels to the customer, whereas here students
either come to her or meet online. SAB with a hidden address is still the correct and
lowest-risk listing type for teaching from a residence; the service area is simply the
honest statement of *where her students are*.

---

## 5. Verification

Expect **video verification** — it is now the common path for service-area businesses.
It is a single continuous, unedited recording. Have ready:

- Proof of the teaching setup: instruments, mic/interface, the space where lessons happen.
- Proof it is her business: a bank statement or utility bill in her name, business email.
- Photo ID.

Two rules:

- **Do not stage a storefront.** No signage, no fake reception. You are verifying a
  service-area business; showing a shopfront that does not exist is what gets appeals
  denied.
- **Do not film the building exterior, street sign or house number** unless Google
  explicitly asks. The video is private, but there is no reason to create the asset.

If verification fails, appeal with the same evidence and the words "service area business,
address not displayed". Do not open a second profile — that is a duplicate.

---

## 6. Profile completion

**Services.** Add each as a service with its own description. Use the real rate card
(`content/pricing.json`) — published prices set expectations and filter out the
unqualified before they book:

| Service | Price to show | Notes |
|---|---|---|
| Free 30-minute vocal assessment | Free | The lead offer. Card held, never charged. |
| Voice lesson, 60 min (online) | $85 | |
| Voice lesson, 60 min (in person) | $110 | Label "In person · Los Angeles". |
| Monthly plan, 4 × 60 min (online) | $280/mo | |
| Monthly plan, 4 × 60 min (in person) | $360/mo | |
| Monthly plan, 4 × 30 min (online) | $170/mo | Good for younger students. |
| Monthly plan, 4 × 30 min (in person) | $210/mo | Was missing from this table. |
| 10-lesson pack (online) | $700 | |
| 10-lesson pack (in person) | $900 | Was missing from this table. |
| Songwriting lessons | from $85 | |
| Guitar lessons · Piano lessons | from $85 | |
| Artist development | from $85 | |
| Online lessons (worldwide) | from $85 | Makes remote availability explicit. |
| Clases de canto en español | from $85 | Bilingual delivery, stated in Spanish. |

Group classes stay off the list — they are quoted per group and deliberately off the grid.

**Attributes.** Turn on `Online appointments` and `Online classes` if offered.
`Identifies as Latino-owned` and `Identifies as women-owned` are hers to choose — offer
them, do not set them on her behalf.

**Hours.** Set them (e.g. Mon–Sat 10:00–19:00, closed Sunday) and add the
"by appointment" note if available.
*Why hours here but no `openingHours` in the site's JSON-LD:* on the site, `openingHours`
sits inside a `LocalBusiness` block next to an address and reads as "walk in during these
hours". On GBP the address is hidden, so hours read as "when you can reach me", which is
true and which the profile uses for the "open now" filter. Different signal, different
call. In-person availability really clusters on Tuesday and Thursday
(`IN_PERSON_DAYS` in `lib/pricing.ts`) — say that in the booking flow, not in GBP hours.

**Photos.** 10 minimum, then a few a month. Her portraits, performance shots, the
instruments, the teaching corner. **No exteriors, no street, no house number, no mail.**
Geotagging photos does nothing for ranking and can leak location — strip EXIF before
upload.

**Links.**
- Website → `https://www.juliana-beltran.com/coach?utm_source=gbp&utm_medium=organic&utm_campaign=profile`
- Appointment link → `https://www.juliana-beltran.com/coach/book?utm_source=gbp&utm_medium=organic&utm_campaign=booking`

Tag them. `lib/analytics.ts` latches UTMs into `sessionStorage` and stamps them onto every
conversion, so a GBP-sourced booking stays distinguishable from a paid one. Without the
tags, organic profile bookings land in the same bucket as ad clicks and quietly flatter
the paid CAC.

---

## 7. The review engine

**Reviews are the dominant local ranking factor and the strongest conversion asset on the
page.** They are also the one thing that compounds while everything else stays static, so
this is the part of the profile that deserves automation.

### The automated ask

The plan puts this in the app rather than in anyone's calendar:

- `app/api/cron/review-requests/route.ts` — queries Stripe for students whose first paid
  month completed 3 weeks ago and emails a review request. `CRON_SECRET`-guarded.
- Schedule lives in the `crons` entry in `vercel.json`.

**Status check, so nobody assumes this already runs:** as of writing, neither the route nor
the `crons` entry exists in the repo — `vercel.json` has `redirects` and `headers` only,
and there is no `app/api/` directory. This is Phase 3 work. The GBP profile can and should
be built and verified now; the automated ask switches on when Phase 3 ships, and until
then the request is sent by hand on the same 3-week trigger.

**Why 3 weeks after the first paid month, not after the assessment:** at that point the
student has had roughly 4–8 lessons and has something specific to say. Asking after a free
assessment produces "seems nice", which converts nobody, and asking a student who has
already churned produces worse.

### The link to send

```
https://search.google.com/local/writereview?placeid=<PLACE_ID>
```

Get `<PLACE_ID>` from the profile dashboard's "Ask for reviews" short link
(`g.page/r/…/review`) — either form works. Put the raw link in the email; do not wrap it in
a redirect, because a review link that looks like tracking gets fewer clicks.

### Policy, non-negotiable

- **Never** offer a discount, a free lesson or anything else for a review. Review gating
  and incentivised reviews are both against Google's policy and both get reviews wiped.
- Ask everyone on the trigger, not only the students you expect to be positive.
- One ask, one reminder, then stop.

### Responding

Reply to **every** review inside 48 hours, positive or negative, in the reviewer's
language. Responses are public, indexed, and they are read by the next prospect far more
carefully than the review itself. A calm, specific reply to a 3-star review converts
better than a wall of 5-stars with no owner voice anywhere.

### Keep site testimonials and Google reviews separate

`content/coach.json` holds five real testimonials that back the `aggregateRating` in the
site's JSON-LD. Do not paste Google reviews in there to inflate the count — schema
`aggregateRating` must describe the reviews actually displayed on that page, and
mismatched review markup is a manual-action category.

---

## 8. Weekly posting cadence

One post a week, 15 minutes, rotating on a 4-week cycle. Posts expire from prominence
quickly, which is the point: a profile with a post from this week reads as active.

| Week | Type | Content |
|---|---|---|
| 1 | Offer / CTA | The free 30-minute vocal assessment. Booking button → `/coach/book`. |
| 2 | Teaching insight | One concrete idea: breath support, why range comes from release not force, what to do about a cracking chorus. Draw from the "How the lessons work" copy already on the voice-lessons page. |
| 3 | Proof | A performance clip or a Spotify editorial placement. `content/videos.json` is the source. |
| 4 | Spanish-language post | The same offer, written in Spanish. Bilingual coaching is the underused advantage in this market and almost no competing profile posts in Spanish. |

Rules for every post:

- Never write "our studio", "visit us", "drop by", an address, a neighbourhood or a
  drive-time. In-person is always **"in person in Los Angeles"**.
- Every post gets a CTA button. "Book" → the appointment link.
- Never repeat a post verbatim. Rewrite.

### Q&A

Seed the Q&A yourself — Google explicitly allows the owner to ask and answer. Use the five
highest-intent questions from `content/coach.json` `faqs`, verbatim, so the answers match
the site:

1. Do I need experience to start?
2. What ages do you teach?
3. Do you teach online?
4. Can you help me write original music?
5. What styles do you teach?

Then add two the FAQ does not cover, because they are the objections that actually stall a
booking: *"How much do lessons cost?"* (answer with the real rate card and link to
`/coach/pricing`) and *"Do you teach in Spanish?"* (answer in Spanish).

Upvote your own answers once. Monitor for user-submitted questions weekly — anyone can
answer them, and a wrong answer from a stranger sits there until you notice.

---

## 9. Never appears on this profile

- Any street address, house number, cross-street, or "near [landmark]".
- "Studio" used to mean a place: *our studio*, *the Mid-City studio*, *visit the studio*.
  "Studio" meaning her teaching practice ("studio policies") is fine and is standard
  music-pedagogy usage.
- Opening hours framed as walk-in availability.
- Exterior photographs of the building.
- Any implication of a second location.

---

## 10. What to watch monthly

From the profile's Performance tab: searches → profile views, calls, website clicks,
direction requests (should be near zero — there is no address), and bookings via the
appointment link. Cross-check the last one against GA4 filtered to
`utm_source=gbp`. If the two disagree, the appointment link lost its UTMs.

Review count and average rating are the two numbers that matter most. Target: **+2 reviews
a month, 4.8 or better**, which the cron in §7 should produce on its own once students are
flowing.
