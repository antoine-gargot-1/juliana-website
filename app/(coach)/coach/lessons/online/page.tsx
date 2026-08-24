import type { Metadata } from 'next';
import Link from 'next/link';

import { JsonLd } from '@/components/JsonLd';
import { Reveal } from '@/components/Reveal';
import { VideoFacade } from '@/components/artist/VideoFacade';
import {
  AssessmentCta,
  PriceGrid,
  PurchaseCta,
  PurchaseCtaLink,
  PurchaseFacts,
  RiskReversal,
} from '@/components/coach/PriceGrid';
import { PURCHASE_NOTE } from '@/components/coach/Purchase';
import { TestimonialCarousel } from '@/components/coach/TestimonialCarousel';
import { BOOKING_LIVE_VIDEO, TESTIMONIALS } from '@/lib/content';
import { formatUsd, monthlyPlans, perLessonCents } from '@/lib/pricing';
import { assessmentOfferSchema, lessonsServiceSchema } from '@/lib/schema';
import { breadcrumbList, pageMeta } from '@/lib/seo';

/**
 * "Online Music Lessons", NOT "Online Singing & Music Lessons". READ THIS BEFORE
 * PUTTING "SINGING" BACK IN THE TITLE.
 * ---------------------------------------------------------------------------
 * Three pages could plausibly claim "online singing lessons": this one,
 * /online-singing-lessons and /coach/voice-lessons-los-angeles. Two of them
 * claiming it in the <title> is not two chances at the term, it is one term with
 * its links, its clicks and its relevance signals split across two URLs, and
 * Google picking whichever it likes for any given query.
 *
 * The split, which docs/seo-audit.md states in full:
 *
 *   /online-singing-lessons   owns SINGING over video — "online singing
 *                             lessons", "online voice lessons", "virtual voice
 *                             lessons", "online vocal coach". It has the
 *                             exact-match slug and it is where all 11 of the
 *                             matching keywords in marketing/google-ads/
 *                             keywords.csv already point.
 *
 *   THIS PAGE                 owns online lessons as a DELIVERY MODE across the
 *                             instruments — "online music lessons", "online
 *                             guitar lessons", "online piano lessons" — and the
 *                             question intent, "do online singing lessons
 *                             actually work". Which is what the page is: audio
 *                             calibration, turn-taking accompaniment, the
 *                             Journal of Voice split of what video carries and
 *                             what it doesn't. None of that is on the landing
 *                             page and all of it answers a different query.
 *
 * THE PRICE IS COMPUTED NOW. It was the literal "$70". Same rule as everywhere
 * else on the site: a number in a description is a number Google shows in the
 * SERP, and lib/pricing.ts is the only place it may come from.
 */
const FROM_PER_LESSON = formatUsd(perLessonCents(monthlyPlans('online')[0]));

export const metadata: Metadata = pageMeta({
  title: 'Online Music Lessons — Voice, Guitar, Piano & Songwriting',
  description:
    `Live one-to-one voice, guitar, piano and songwriting lessons over video. Real audio, live ` +
    `accompaniment, from ${FROM_PER_LESSON} a lesson. English or Spanish.`,
  path: '/coach/lessons/online',
});

/**
 * What actually makes an online lesson work, in the order students ask about
 * it. This is the page's substance rather than a feature list: everyone
 * arriving here has already decided they want lessons and is really asking
 * "does this work over video?".
 */
const HOW = [
  {
    t: 'Sound before video',
    d: "A video call optimises for speech, which means it gates quiet notes, flattens dynamics — how loud and how soft you can actually get — and mangles breath. I run a calibrated audio setup on my end, meaning a microphone and levels set for singing rather than talking, and I walk you through three settings on yours, so tone and pitch arrive intact. It takes four minutes, once.",
  },
  /*
   * THIS ENTRY USED TO CLAIM "tempo and key move with your voice in real time".
   *
   * It is not achievable and it was on the page whose entire job is convincing
   * a musician that online lessons work. Two people staying locked in the same
   * bar need latency in the region of 10–25ms, and a consumer video call is
   * well past that in each direction — anyone who has tried to play music over
   * Zoom knows it in their body, so the sentence read as either naive or
   * dishonest to exactly the reader it was written for. What she actually does
   * is turn-taking accompaniment, which is a real and better answer than a
   * backing track. Do not restore any version of "in real time", "together in
   * time", or "we play as a duo".
   */
  {
    t: 'A real accompanist, taking turns',
    d: "I play guitar or piano for you rather than sending you off to a backing track, and I pick the key and the tempo your voice wants that day. What I won't tell you is that we're playing in time together: two musicians staying locked in the same bar need a delay of a couple of hundredths of a second at most, and a video call is past that in both directions. So we take turns. I play a phrase and you sing it back. I set a tempo, count you in, and listen to what you do with it. You leave with a recording at your key and speed, and singing along is the part that happens in the week between lessons — where it works perfectly.",
  },
  {
    t: 'Every lesson is recorded, for you',
    d: 'You leave with the audio of your own exercises at the right pitch and speed. Most of the progress happens in the week between lessons, and this is what makes that week useful.',
  },
  {
    t: 'Notes, not homework sheets',
    d: 'Two or three specific things to work on, written down, referring to the moment in the lesson they came from.',
  },
  {
    t: 'English or Spanish',
    d: 'Whichever you think in. Technique instructions land differently in a second language, and singing is largely about thinking in the right image.',
  },
];

const NEED = [
  'A laptop, tablet or phone with a stable connection',
  'Wired headphones or earbuds — the single biggest improvement you can make',
  "A room where you're not worried about being heard",
  'Water, and something to write on',
];

/*
 * THE HONEST COMPARISON, WHICH IS THE MOST PERSUASIVE THING ON THIS PAGE.
 *
 * Source, and the only place on the site that cites one: Murdaugh, Hausknecht &
 * Herbst, "In-Person or Virtual? — Assessing the Impact of COVID-19 on the
 * Teaching Habits of Voice Pedagogues", Journal of Voice 36(5): 735.e19–735.e25
 * — 387 singing-voice teachers surveyed worldwide. PMID 33243666.
 *
 * ON THE DATE, which the visible copy gets right and an earlier draft did not:
 * the print issue is 2022, but the survey ran and the paper appeared online in
 * OCTOBER 2020, in the first months of the pandemic. Citing "2022" is
 * bibliographically defensible and rhetorically misleading — a reader takes it
 * as when the teachers were asked, and a 2020 answer describes 2020
 * conferencing software. Since the entire purpose of this block is that the
 * honest version out-persuades the confident one, the visible copy says 2020.
 * Do not "correct" it to the print year.
 *
 * Their finding, in their words:
 * the singing voice "can be assessed relatively well through features which
 * provide both acoustic and visual clues", while it "may be harder to judge
 * those aspects of the singing voice that are solely defined acoustically, such
 * as dynamic range and spectral composition", because the technology is
 * "typically optimized for speech instead of singing".
 *
 * So the split below is not a guess and not a sales device: it is what the
 * teachers who did this at scale reported, and the two lists are drawn straight
 * from that acoustic-plus-visual versus acoustic-only line. Nothing here may be
 * strengthened. Naming what video does WORSE is what makes the rest of the page
 * believable, and the page still ends with a purchase.
 */
const TRAVELS = [
  'Words, diction and phrasing',
  'Rhythm, timing and counting',
  "Whether it's actually memorised",
  'Jaw, tongue and shoulder tension — visible',
  'Posture, and where you take a breath',
];

const NEEDS_ROOM = [
  'Dynamics — how loud and how soft you really get',
  'Resonance — how the sound rings in your chest and head',
  'Tone colour, and the top of a big voice',
  'Singing into a space instead of into a microphone',
];

export default function OnlineLessonsPage() {
  return (
    <div className="page-fade">
      <Reveal />
      <div className="wrap">
        <section className="svc-page-hero">
          <div className="eyebrow">Online lessons &middot; worldwide</div>
          <h1>
            Online lessons that <span className="it">actually sound</span> like lessons.
          </h1>
          <p className="prose" style={{ fontSize: 20, marginTop: 24, maxWidth: 700 }}>
            One-to-one voice, guitar, piano and songwriting lessons over video, with a working
            recording artist. Live accompaniment, real audio, and a recording of your own exercises
            to take away. Several of my longest-running students have never been in the same city as
            me.
          </p>
          {/* PRIMARY: buy a package. Someone deep enough into the site to be
              reading how online lessons work is past needing to be persuaded that
              lessons are a good idea. The free assessment stays available as the
              quieter second path, below the rate card. */}
          <div style={{ marginTop: 32, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <PurchaseCtaLink />
          </div>
          <p className="lp-hero-note">{PURCHASE_NOTE}</p>
          <RiskReversal />
        </section>

        {/* Proof. Coaching is bought by ear, so the pitch is a recording rather
            than an adjective. Facade only — no iframe until a real click, so it
            cannot compete with LCP. */}
        <section className="block" style={{ paddingTop: 20, paddingBottom: 40 }}>
          <div className="video-primary-flag reveal">
            <span className="line" />
            <h2 className="eyebrow">Hear it first</h2>
          </div>
          <div className="split">
            <VideoFacade video={BOOKING_LIVE_VIDEO} placement="coach-lessons-online" primary />
            <div>
              <p className="prose">
                Forty-seven minutes at Hotel Café in Los Angeles, most of it original material. I
                still perform, still write and still tour, which is why the lessons are about how
                singing actually behaves on a stage rather than how it behaves in a textbook.
              </p>
              <p className="prose">
                Toured internationally as a vocalist for Amanda Miguel. Original music on Spotify
                editorial playlists. Students from age five to seventy-plus, in English and Spanish.
              </p>
              <div className="press-strip reveal" style={{ paddingTop: 30, paddingBottom: 30 }}>
                <span>Amanda Miguel</span>
                <span>Hotel Cafe &middot; LA</span>
                <span>Spotify Editorial</span>
              </div>
            </div>
          </div>
        </section>

        <section className="block" style={{ paddingTop: 20, paddingBottom: 40 }}>
          <div className="split">
            <div>
              <h2 className="eyebrow reveal" style={{ marginBottom: 24 }}>
                How an online lesson runs
              </h2>
              <ul className="numbered">
                {HOW.map((h, i) => (
                  <li key={h.t} className="reveal" style={{ '--rd': `${i * 60}ms` }}>
                    <span className="n">{String(i + 1).padStart(2, '0')}</span>
                    <span>
                      <h3 className="t">{h.t}</h3>
                      {h.d}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="eyebrow reveal" style={{ marginBottom: 24 }}>
                What you need
              </h2>
              <ul className="numbered">
                {NEED.map((n, i) => (
                  <li key={n} className="reveal" style={{ '--rd': `${i * 60}ms` }}>
                    <span className="n">{String(i + 1).padStart(2, '0')}</span>
                    <span>{n}</span>
                  </li>
                ))}
              </ul>
              <p className="prose" style={{ marginTop: 26 }}>
                No microphone, no interface, no software to buy. If you already own a microphone,
                bring it and I’ll help you set it up — but nothing on this page depends on it.
              </p>
              <p className="prose">
                Timezones are the real constraint, not distance. Lessons run early mornings and
                evenings Pacific, which covers most of Europe and Latin America comfortably. The
                scheduler shows times in <strong>your</strong> clock, not mine.
              </p>
            </div>
          </div>
        </section>

        {/* The comparison this page used to avoid. See the note above TRAVELS
            for the source and for why none of it may be softened. */}
        <section className="block" style={{ paddingTop: 20, paddingBottom: 40 }}>
          <h2 className="eyebrow reveal" style={{ marginBottom: 24 }}>
            What comes through video, and what doesn&rsquo;t
          </h2>
          <div className="split">
            <div>
              <h3 className="eyebrow reveal" style={{ marginBottom: 14 }}>
                Comes through
              </h3>
              <ul className="plain-points" style={{ gridTemplateColumns: '1fr' }}>
                {TRAVELS.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="eyebrow reveal" style={{ marginBottom: 14 }}>
                Better in the room
              </h3>
              <ul className="plain-points" style={{ gridTemplateColumns: '1fr' }}>
                {NEEDS_ROOM.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </div>
          </div>

          <p className="prose" style={{ marginTop: 30, maxWidth: 700 }}>
            That split isn&rsquo;t my opinion. 387 singing teachers were surveyed about teaching over
            video for the <em>Journal of Voice</em> in 2020, and it&rsquo;s what they reported: the voice
            reads well through anything you can both see and hear, and the parts that are pure sound
            — how loud a note really is, the colour of it — are the ones the technology makes harder
            to judge. Their explanation is the same as the first item on this page. The software is
            built for speech, not for singing.
          </p>
          <p className="prose" style={{ maxWidth: 700 }}>
            Which is why those four minutes of setup are the difference between a lesson about your
            voice and a lesson about your internet. Left to itself, a call treats a sustained high
            note the way it treats a slamming door — as noise, to be turned down — so the note you
            were proudest of is the one it deletes. The fix is two switches:{' '}
            <strong>
              the setting Zoom calls &ldquo;Original Sound for Musicians&rdquo; turned on at both
              ends, and wired headphones at both ends
            </strong>
            . That&rsquo;s the whole configuration. I set it up with you once, and it&rsquo;s why the
            exercises we do sound like the exercises you take away.
          </p>
          <p className="prose" style={{ maxWidth: 700 }}>
            And there&rsquo;s one thing online does better, which nobody selling lessons ever says: you
            are in your own house with the door shut. A lot of adults coming back to singing at
            forty or fifty aren&rsquo;t frightened of the high notes — they&rsquo;re frightened of
            being heard trying. The only person hearing you is me, on headphones, in another
            building. If that&rsquo;s what has stopped you before, online isn&rsquo;t the compromise
            version of the lesson. It&rsquo;s the one where you can sing out.
          </p>
          <p className="prose" style={{ maxWidth: 700 }}>
            If the work you need is the other list — a big sound in a real room, an audition, a
            recital — say so and we&rsquo;ll do it{' '}
            <Link href="/coach/lessons/in-person" style={{ color: 'var(--accent)' }}>
              in person in Los Angeles
            </Link>{' '}
            instead. Most students mix the two.
          </p>
          {/* Contextual link to /online-singing-lessons, which had exactly one
              internal link pointing at it (the chooser list on the home page)
              before this. It is the page that owns "online singing lessons"
              organically — see the note above `metadata` — and this page is where
              a reader who has just decided video works goes looking for the
              voice-specific version. Not a footer entry: the footer is on every
              coach page and would put a near-duplicate of this page's own topic
              next to it 20 times over. */}
          <p className="prose" style={{ maxWidth: 700 }}>
            If it is specifically singing you came for, there is a page just about{' '}
            <Link href="/online-singing-lessons" style={{ color: 'var(--accent)' }}>
              online singing lessons
            </Link>{' '}
            — same rate card, the voice side on its own.
          </p>
        </section>

        <section id="rates" className="block" style={{ paddingTop: 20, paddingBottom: 40 }}>
          <h2 className="eyebrow reveal" style={{ marginBottom: 24 }}>
            Online rates
          </h2>
          <PriceGrid mode="online" />
          <PurchaseFacts />
          <p className="lede-plain" style={{ marginTop: 26 }}>
            The price is for the lesson, not the subject. Group sessions are quoted separately —{' '}
            <Link href="/coach/contact" style={{ color: 'var(--accent)' }}>
              ask me
            </Link>
            .
          </p>
          <AssessmentCta mode="online" tone="secondary" />
        </section>

        <section className="block" style={{ paddingTop: 20, paddingBottom: 40 }}>
          <h2 className="eyebrow reveal" style={{ marginBottom: 30 }}>
            What students say
          </h2>
          {/* ALL FIVE, not three, and with the aggregate line the component
              renders for itself. lessonsServiceSchema('online') attaches
              aggregateRating with reviewCount 5 to this page; showing three
              quotes and no rating meant the markup claimed a number the reader
              could not see, which is a structured-data violation on its own
              terms. The component computes its line over the reviews actually
              passed to it, so the two cannot drift. Do not add a second
              aggregate sentence beside it. */}
          <TestimonialCarousel testimonials={TESTIMONIALS} />
        </section>

        <div className="block" style={{ paddingTop: 0, paddingBottom: 60 }}>
          <PurchaseCta
            headline={
              <>
                Start lessons <span className="it">this week.</span>
              </>
            }
          />
          <AssessmentCta mode="online" tone="secondary" />
        </div>
      </div>

      <JsonLd
        data={[
          lessonsServiceSchema('online'),
          assessmentOfferSchema(),
          breadcrumbList([
            { name: 'Home', path: '/' },
            { name: 'Coaching', path: '/coach' },
            { name: 'Online Lessons', path: '/coach/lessons/online' },
          ]),
        ]}
      />
    </div>
  );
}
