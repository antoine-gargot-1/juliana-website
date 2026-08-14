import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { JsonLd } from '@/components/JsonLd';
import { Marquee } from '@/components/Marquee';
import { ParallaxHero } from '@/components/ParallaxHero';
import { Reveal } from '@/components/Reveal';
import { VideoFacade } from '@/components/artist/VideoFacade';
import { ModeToggle } from '@/components/coach/ModeToggle';
import {
  ASSESSMENT_CARD_COPY,
  ASSESSMENT_CTA_LABEL,
  IN_PERSON_DAYS_SENTENCE,
  PRICING_CTA_LABEL,
  PriceGrid,
} from '@/components/coach/PriceGrid';
import {
  AGGREGATE_RATING,
  BOOKING_LIVE_VIDEO,
  CREDITS,
  PLAYLISTS,
  SERVICES,
  TESTIMONIALS,
  monthYear,
} from '@/lib/content';
import {
  ASSESSMENT,
  IN_PERSON_DAYS,
  LESSONS_PER_MONTH,
  type Price,
  formatUsd,
  monthlyPlans,
  perLessonCents,
  singleLesson,
} from '@/lib/pricing';
import { assessmentOfferSchema, coachingServiceSchema, localBusinessSchema } from '@/lib/schema';
import { SOCIAL } from '@/lib/site';
import { breadcrumbList, pageMeta } from '@/lib/seo';

/*
 * ---------------------------------------------------------------------------
 * WHAT THIS PAGE IS FOR, AND WHY IT IS ORDERED LIKE THIS
 * ---------------------------------------------------------------------------
 * This used to run hero → marquee → "I teach because I love it" → what I teach →
 * Spotify → why work with me → press → testimonial carousel → CTA. Five of those
 * nine sections were about Juliana, none was about the lesson, no price appeared
 * anywhere on the page, and the only solid button between the hero and the close
 * was a link OUT to Spotify sitting on a 420px iframe.
 *
 * The buyers are parents booking for a child and adults over 40 coming back to
 * music. Neither of them is deciding whether Juliana is interesting; they are
 * deciding what a lesson is, what it costs, and what happens if it does not
 * work out. So the order is now: what it is and what it costs → hear it →
 * what a lesson contains → the two buyers, each in their own order → every
 * price → what you get before you commit → reviews → credits → the objections
 * → one CTA.
 *
 * Three rules this file has to keep:
 *
 *   PRICES COME FROM lib/pricing.ts. Every figure below is computed. No amount
 *   is typed into this file, so a rate change cannot leave a stale number on the
 *   busiest page on the site.
 *
 *   NO PREMISES. In-person lessons happen in a private residence. This page may
 *   say "in person in Los Angeles" and that the address is sent privately after
 *   booking, and nothing else about place. See content/pricing.json
 *   `_inPersonNote`.
 *
 *   THE CARD SENTENCE TRAVELS WITH THE FREE ASSESSMENT AND NOWHERE ELSE.
 *   ASSESSMENT_CARD_COPY appears in the hero, in the risk block and in the
 *   close — the three places this page offers the assessment. It must never sit
 *   beside a paid purchase control, which is also why the rate cards here are
 *   `buy={false}`: the money is taken on /coach/pricing.
 */

/**
 * Build-time throw rather than a fallback, in the same spirit as PriceGrid's
 * guards: the whole argument of this page is a published price, and a home page
 * that quietly renders "$NaN a lesson" is worse than a failed deploy.
 */
function quoted(price: Price | undefined, what: string): Price {
  if (!price) {
    throw new Error(
      `coach home: content/pricing.json has no ${what}, and this page quotes it. ` +
        'Restore the price or stop quoting it here.',
    );
  }
  return price;
}

/** The lesson everything else is measured against: the full-hour online plan. */
const ONLINE_PLAN = quoted(monthlyPlans('online')[0], 'online monthly plan');
const IN_PERSON_PLAN = quoted(monthlyPlans('inperson')[0], 'in-person monthly plan');
const ONLINE_SINGLE = quoted(singleLesson('online'), 'online single lesson');

/** "$70" — the price floor, per lesson, on the cheapest full-hour commitment. */
const FROM_PER_LESSON = formatUsd(perLessonCents(ONLINE_PLAN));
const LESSON_MINUTES = ONLINE_PLAN.duration;

/**
 * TITLE AND DESCRIPTION ARE BOTH SHORTER THAN THEY WERE, FOR TWO DIFFERENT REASONS.
 *
 * TITLE — was "Music Lessons in Los Angeles — Voice, Guitar, Piano &
 * Songwriting", which the `%s | Juliana Beltran` template in app/layout.tsx took
 * to 83 characters. Google renders roughly 600px of title, so everything from
 * "Piano" onwards was cut, and this page was also the fourth on the site whose
 * title claimed the instrument list. It is the hub: it should own the head term
 * ("music lessons in Los Angeles") and leave the instrument long-tails to the
 * two delivery-mode pages, which is where the content that answers them lives.
 *
 * DESCRIPTION — was 254 characters. Google shows ~155 on desktop and ~120 on a
 * phone, and this traffic is mobile-majority, so "Start with a free 30-minute
 * assessment" — the single most useful sentence on the page and the entry point
 * to the entire funnel — sat past character 216 and was never rendered. Same
 * facts, front-loaded, inside the budget.
 *
 * The price still comes from lib/pricing.ts. A price in a description is a price
 * Google puts in the SERP, and a stale one is what the visitor arrives expecting.
 */
export const metadata: Metadata = pageMeta({
  title: 'Music Lessons in Los Angeles & Online',
  description:
    `Voice, guitar, piano and songwriting lessons online and in person in Los Angeles. ` +
    `${LESSONS_PER_MONTH} a month from ${FROM_PER_LESSON} a lesson, English or Spanish. ` +
    `Free ${ASSESSMENT.durationMinutes}-minute assessment.`,
  path: '/coach',
});

/* ------------------------------------------------------------------ */
/* Local type styling                                                  */
/* ------------------------------------------------------------------ */

/**
 * There is no shared class for a mid-page h2 in app/styles.css — the existing
 * rules are scoped to `.listen h2` and `.cta h2` — so the headings here carry
 * `.display` for the family, weight and floor, and take only their size inline.
 *
 * Sizes are `rem`-based clamps so a reader who raises their browser font size
 * gets the benefit, and the small end of every clamp stays at or above
 * `--fs-display-min` (28px): the display face has a hard floor and is not
 * allowed to carry anything smaller.
 */
const H2_STYLE: React.CSSProperties = {
  /* 30px → 52px */
  fontSize: 'clamp(1.875rem, 3.6vw, 3.25rem)',
  lineHeight: 1.12,
  margin: '10px 0 0',
};

const H3_STYLE: React.CSSProperties = {
  /* 28px → 34px, i.e. exactly the display floor at the small end. */
  fontSize: 'clamp(1.75rem, 2.4vw, 2.125rem)',
  lineHeight: 1.12,
  margin: '8px 0 20px',
};

/**
 * A review's rating as five marks and one label.
 *
 * `role="img"` plus `aria-label` so it is announced once as "5 out of 5 stars"
 * rather than as five repeated glyph names. `--accent-text` is the 6.67:1 token,
 * which clears AA as text as well as the 3:1 non-text minimum — a rating is
 * information, not decoration, so it is held to the text bar.
 */
function Stars({ rating }: { rating: number }) {
  return (
    <span
      role="img"
      aria-label={`${rating} out of ${AGGREGATE_RATING.best} stars`}
      style={{
        color: 'var(--accent-text)',
        fontSize: 'var(--fs-ui)',
        letterSpacing: '0.2em',
        lineHeight: 1,
      }}
    >
      {'★'.repeat(rating)}
    </span>
  );
}

export default function CoachHomePage() {
  /*
   * What a lesson is. Not invented here: every line is the substance of `HOW` on
   * /coach/lessons/online and `plain-points` on /coach/pricing, which is where
   * this copy has always lived — it had just never appeared on the page most
   * people land on.
   *
   * One deliberate omission: the online page's "tempo and key move with your
   * voice in real time". Consumer video round-trip is well above the ~8–25ms
   * ensemble window, so that claim is not repeated here.
   */
  const LESSON = [
    {
      t: `${LESSON_MINUTES} minutes, one to one`,
      d: 'Voice, guitar, piano or songwriting. The price is for the lesson, not the subject, so we spend it on whatever the week actually needs.',
    },
    {
      t: 'Live accompaniment, not a backing track',
      d: "I play guitar or piano under you while you sing, rather than sending you off to practise against a recording that can't follow you.",
    },
    {
      t: 'A recording of your own exercises',
      d: 'You leave with the audio of your exercises at your pitch and your speed. Most of the progress happens in the week between lessons, and that recording is what makes the week useful.',
    },
    {
      t: 'Two or three written notes',
      d: 'Specific things to work on, written down, each one pointing back at the moment in the lesson it came from. Not homework sheets.',
    },
    {
      t: 'English or Spanish',
      d: 'Whichever you think in. Technique instructions land differently in a second language, and singing is mostly about thinking in the right image.',
    },
    {
      t: `${LESSONS_PER_MONTH} lessons a month, your slot held`,
      d: `A monthly plan bills ${LESSONS_PER_MONTH} lessons a month and keeps the same time for you. Four a month rather than one a week, because some months have five of your weekday and four is the number you can hold me to.`,
    },
  ];

  /*
   * The objections that stop a sale, in open text. All four are answered
   * somewhere on the site already — the first is the best sentence anybody has
   * written for this business and it appeared on exactly one page, /coach/book.
   */
  const OBJECTIONS = [
    {
      q: "I've never had a lesson, and I'm not sure I can sing.",
      a: 'No audition, no experience required, and no sales call disguised as a lesson. Plenty of people arrive having only ever sung in the car. We start exactly where you are.',
    },
    {
      q: 'Does this really work over video?',
      a: 'Several of my longest-running students have never been in the same city as me. A video call is built for speech, so it flattens quiet notes and mangles breath — which is why I run a proper audio setup on my end and walk you through three settings on yours. Four minutes, once, and after that the quiet notes survive the call.',
    },
    {
      q: 'Where do in-person lessons happen?',
      a: `In Los Angeles, on ${IN_PERSON_DAYS.join('s and ')}s. I teach from a private space rather than a commercial studio, so I send you the exact address privately once your lesson is confirmed. If those two days don't work, online is the same lesson.`,
    },
    {
      q: 'What if it turns out not to be right for us?',
      a: "Then you stop. Nothing is billed until a week after the first session, a monthly plan can be cancelled any time from your own billing page, and you keep the lessons you've already paid for.",
    },
  ];

  return (
    <div className="page-fade">
      <Reveal />

      {/* ---------------------------------------------------------------- */}
      {/* 1 · Hero — the outcome, who it is for, the format, the price floor */}
      {/* ---------------------------------------------------------------- */}
      <ParallaxHero
        bg={
          <Image
            src="/img/juliana-goldenhour.png"
            alt="Juliana Beltran with guitar at golden hour"
            width={1990}
            height={3355}
            priority
            fetchPriority="high"
            sizes="100vw"
          />
        }
        corner={
          <div className="hero-corner">
            <div className="mark">music</div>
            <span>Los Angeles &middot; Online &amp; In-Person</span>
          </div>
        }
      >
        <div className="hero-text">
          <div className="hero-eyebrow reveal">
            <span className="line" />
            <span className="eyebrow">Hi — I&apos;m Juliana</span>
          </div>
          <h1>
            <span className="reveal-up">
              <span style={{ '--rd': '50ms' }}>You can learn</span>
            </span>{' '}
            <span className="reveal-up">
              <span className="it" style={{ '--rd': '180ms' }}>
                to sing.
              </span>
            </span>
          </h1>
          <p className="hero-sub reveal" style={{ '--rd': '420ms', maxWidth: 620 }}>
            One-to-one voice, guitar, piano and songwriting lessons — online anywhere, or in person
            in Los Angeles. Ages 5 to 70+, beginners welcome, English or Spanish.{' '}
            {LESSONS_PER_MONTH} lessons a month, from {FROM_PER_LESSON} a lesson.
          </p>
          <div className="hero-ctas reveal" style={{ '--rd': '580ms' }}>
            <Link className="btn btn--solid" href="/coach/book">
              {ASSESSMENT_CTA_LABEL} <span className="arrow">&rarr;</span>
            </Link>
            <Link className="btn btn--ghost" href="/coach/pricing">
              {PRICING_CTA_LABEL}
            </Link>
          </div>
          {/* The card-hold sentence, verbatim, at reading size, next to the
              button that offers the free assessment. `.lp-hero-note` is the
              class for this elsewhere but it is inked for a light background;
              the hero is light-on-photograph, so the colour is set here. */}
          <p
            className="reveal"
            style={{
              '--rd': '680ms',
              fontFamily: 'var(--serif)',
              fontSize: 'var(--fs-md)',
              lineHeight: 1.5,
              fontWeight: 400,
              color: 'color-mix(in oklch, var(--bg) 90%, transparent)',
              borderLeft: '2px solid var(--gold)',
              paddingLeft: 14,
              margin: '26px 0 0',
              maxWidth: '46ch',
            }}
          >
            {ASSESSMENT_CARD_COPY}
          </p>
        </div>
      </ParallaxHero>

      <Marquee />

      {/* ---------------------------------------------------------------- */}
      {/* 2 · Playable proof, immediately                                   */}
      {/* ---------------------------------------------------------------- */}
      {/* Coaching is bought by ear. This page used to make you leave for
          Spotify to hear anything at all. Facade only — a poster image and a
          button, no YouTube JS until a real click, so it cannot compete with
          the hero for LCP. */}
      <section className="block" style={{ paddingTop: 90, paddingBottom: 40 }}>
        <div className="wrap">
          <div className="video-primary-flag reveal">
            <span className="line" />
            <span className="eyebrow">
              Hear it first
            </span>
          </div>
          <div className="split">
            <VideoFacade video={BOOKING_LIVE_VIDEO} placement="coach-home" primary />
            <div>
              <h2 className="display" style={H2_STYLE}>
                I still <span className="it">perform,</span> still{' '}
                <span className="it">write,</span> still <span className="it">tour.</span>
              </h2>
              <p className="prose" style={{ marginTop: 22 }}>
                Forty-seven minutes at Hotel Café in Los Angeles, most of it original material.
                That&apos;s why the lessons are about how singing behaves on a stage rather than how
                it behaves in a textbook.
              </p>
              <p className="prose">
                Toured internationally as a vocalist for Amanda Miguel. Original music on Spotify
                editorial playlists. Students from age five to seventy-plus, in English and Spanish.
              </p>
              <div className="press-strip reveal" style={{ paddingTop: 26, paddingBottom: 26 }}>
                <span>Amanda Miguel</span>
                <span>Hotel Cafe &middot; LA</span>
                <span>Spotify Editorial</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* 3 · What a lesson actually is                                     */}
      {/* ---------------------------------------------------------------- */}
      <section className="block" style={{ paddingTop: 60, paddingBottom: 40 }}>
        <div className="wrap">
          <div className="split">
            <div>
              <div className="eyebrow reveal">
                &mdash; What a lesson is
              </div>
              <h2 className="display" style={H2_STYLE}>
                An hour with a piano under your voice — and{' '}
                <span className="it">a recording</span> to take home.
              </h2>
              <ul className="numbered" style={{ marginTop: 30 }}>
                {LESSON.map((item, i) => (
                  <li key={item.t} className="reveal" style={{ '--rd': `${i * 60}ms` }}>
                    <span className="n">{String(i + 1).padStart(2, '0')}</span>
                    <span>
                      <span className="t">{item.t}</span>
                      {item.d}
                    </span>
                  </li>
                ))}
              </ul>
              {/* The five disciplines, compressed to a line of links. They were
                  a full section of their own, which is a lot of page for a
                  navigation aid. Songwriting has its own page; the rest land on
                  the services menu. */}
              <p className="lede-plain" style={{ marginTop: 26 }}>
                {SERVICES.slice(0, 5).map((s, i) => (
                  <span key={s.n}>
                    {i > 0 ? ' · ' : ''}
                    <Link
                      href={s.name === 'Songwriting' ? '/coach/songwriting' : '/coach/services'}
                      style={{ color: 'var(--accent-text)' }}
                    >
                      {s.name}
                    </Link>
                  </span>
                ))}
              </p>
            </div>
            <div className="ken reveal" style={{ '--rd': '160ms' }}>
              <Image
                src="/img/juliana-guitar-couch.jpg"
                alt="Juliana Beltran with a guitar during a lesson"
                width={1440}
                height={1080}
                sizes="(max-width: 920px) 100vw, 45vw"
                style={{ width: '100%', aspectRatio: '4/5', objectFit: 'cover', height: 'auto' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* 4 · Two doors, in page                                            */}
      {/* ---------------------------------------------------------------- */}
      {/*
        NOT an interstitial and not a nav split. Two buyers arrive here — an
        adult coming back to music and a parent booking for a child — and they
        want the same facts in different orders, so each column is ordered for
        its reader rather than for the writer.

        Adult: permission first, then evidence that people like them are here,
        then what the first half hour is, then privacy, then price. Permission
        before price on purpose — someone who is not sure they are allowed to
        want this does not care what it costs yet.

        Parent: price and logistics first, then proof, then safeguarding, then
        whether it will suit their particular child, then how to leave.
      */}
      <section className="block" style={{ paddingTop: 40, paddingBottom: 40 }}>
        <div className="wrap">
          <div className="eyebrow reveal">
            &mdash; Who it&apos;s for
          </div>
          <h2 className="display" style={{ ...H2_STYLE, marginBottom: 40 }}>
            Two ways people <span className="it">arrive here.</span>
          </h2>
          <div className="split">
            <div
              className="reveal"
              style={{ border: '1px solid var(--rule)', padding: '34px 30px' }}
            >
              <div className="eyebrow">
                For yourself
              </div>
              <h3 className="display" style={H3_STYLE}>
                You meant to do this <span className="it">at twenty.</span>
              </h3>
              <ul className="plain-points" style={{ gridTemplateColumns: '1fr' }}>
                <li>
                  No audition, no experience required, and no sales call disguised as a lesson.
                </li>
                <li>
                  Plenty of people arrive having only ever sung in the car, or never outside their
                  own kitchen. My students have run from age five to seventy-plus.
                </li>
                <li>
                  The first half hour is you singing and me listening. We work out what&apos;s
                  actually in the way — usually breath, usually tension — and you leave with two
                  exercises.
                </li>
                <li>
                  Online, you&apos;re in your own room with the door shut. Nobody has to hear you
                  but me.
                </li>
                <li>
                  {formatUsd(perLessonCents(ONLINE_PLAN))} a lesson on a monthly plan,{' '}
                  {formatUsd(ONLINE_SINGLE.amountCents)} for a single lesson. Every price is
                  published.
                </li>
              </ul>
              <div style={{ marginTop: 28 }}>
                <Link className="btn" href="/coach/lessons/online">
                  How online lessons run <span className="arrow">&rarr;</span>
                </Link>
              </div>
            </div>

            <div
              className="reveal"
              style={{ border: '1px solid var(--rule)', padding: '34px 30px', '--rd': '120ms' }}
            >
              <div className="eyebrow">
                For your child
              </div>
              <h3 className="display" style={H3_STYLE}>
                You want to know <span className="it">the details first.</span>
              </h3>
              <ul className="plain-points" style={{ gridTemplateColumns: '1fr' }}>
                <li>
                  {LESSONS_PER_MONTH} lessons a month: {formatUsd(ONLINE_PLAN.amountCents)} online,{' '}
                  {formatUsd(IN_PERSON_PLAN.amountCents)} in person in Los Angeles. Same price
                  whatever we work on. {IN_PERSON_DAYS_SENTENCE}
                </li>
                <li>
                  {AGGREGATE_RATING.count} reviews on this site, averaging {AGGREGATE_RATING.value}{' '}
                  out of {AGGREGATE_RATING.best}, with names and dates. They&apos;re all further
                  down the page.
                </li>
                <li>
                  A parent or guardian books, is on the account, and it&apos;s their card on file.
                  You&apos;re welcome to sit in — especially for the first few lessons with a
                  younger child.
                </li>
                <li>
                  Mine have started as young as five. Some settle faster with a parent in the room
                  and some without, and we&apos;ll work out which yours is.
                </li>
                <li>
                  Cancel any time from your billing page. No notice period, no contract to see out,
                  and you keep the lessons you&apos;ve already paid for.
                </li>
              </ul>
              <div style={{ marginTop: 28 }}>
                <Link className="btn" href="/coach/lessons/in-person">
                  In-person lessons in LA <span className="arrow">&rarr;</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* 5 · Prices, in full                                               */}
      {/* ---------------------------------------------------------------- */}
      {/* `buy={false}` with a purchaseHref: the checkout lives on /coach/pricing,
          which is where the guardian question, the purchase note and the buy
          controls already are. PriceGrid throws if a price is displayed with no
          route to paying for it, which is why the href is not optional. Both
          panels are in the served HTML — see ModeToggle. */}
      <section id="rates" className="block" style={{ paddingTop: 40, paddingBottom: 40 }}>
        <div className="wrap">
          <div className="eyebrow reveal">&mdash; Prices</div>
          <h2 className="display" style={{ ...H2_STYLE, marginBottom: 12 }}>
            Every price, <span className="it">on the page.</span>
          </h2>
          <p className="lede-plain" style={{ marginBottom: 28 }}>
            Single lessons from {formatUsd(ONLINE_SINGLE.amountCents)}, or {FROM_PER_LESSON} a
            lesson on a monthly plan. In-person costs more than online, and both are below.
          </p>
          <ModeToggle
            online={<PriceGrid mode="online" buy={false} purchaseHref="/coach/pricing" />}
            inperson={
              <PriceGrid
                mode="inperson"
                buy={false}
                purchaseHref="/coach/pricing"
                footnote={<>{IN_PERSON_DAYS_SENTENCE}</>}
              />
            }
            label="Lesson format"
          />
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* 6 · What you get before you commit                                */}
      {/* ---------------------------------------------------------------- */}
      {/*
        Five facts, all of them already true, all of them previously buried in
        the FAQ accordion. Framed as what you get rather than as what happens if
        you dislike it: the two strongest — the free month-long pause and the
        first bill landing a week AFTER the assessment — read as generosity, and
        hiding them behind a click was costing more than any headline.
      */}
      <section className="block" style={{ paddingTop: 40, paddingBottom: 40 }}>
        <div className="wrap">
          <div className="eyebrow reveal">
            &mdash; Before you commit
          </div>
          <h2 className="display" style={H2_STYLE}>
            Five things that are true <span className="it">before you pay anything.</span>
          </h2>
          <dl className="facts">
            <div className="fact">
              <dt>The first {ASSESSMENT.durationMinutes} minutes are free</dt>
              <dd>
                You sing, I listen, and you leave with two exercises whether or not you book
                anything else.
              </dd>
            </div>
            <div className="fact">
              <dt>Your first bill lands a week later</dt>
              <dd>
                A week after the assessment, so the first payment comes after you&apos;ve had a
                proper lesson and know whether this is for you.
              </dd>
            </div>
            <div className="fact">
              <dt>Cancel from your own billing page</dt>
              <dd>
                Any time, with no notice period and no contract to see out. You keep the lessons
                you&apos;ve already paid for.
              </dd>
            </div>
            <div className="fact">
              <dt>Pause a month, once a year, at no charge</dt>
              <dd>
                No billing that month, and your slot is still yours when you come back. Just tell me
                before the next billing date.
              </dd>
            </div>
            <div className="fact">
              <dt>A day&apos;s notice moves a lesson</dt>
              <dd>Tell me 24 hours ahead and we move it, at no cost.</dd>
            </div>
          </dl>
          {/* Required beside the free assessment, verbatim, at reading size. */}
          <strong className="assess-card-note" style={{ marginTop: 26 }}>
            {ASSESSMENT_CARD_COPY}
          </strong>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* 7 · Reviews — all five, static, with stars, names and dates       */}
      {/* ---------------------------------------------------------------- */}
      {/* A static grid rather than a carousel: every review is in the HTML, in
          the DOM, and readable without a control. The old carousel showed one
          quote at a time, rotated itself every seven seconds and printed no
          star, no date and no way to see the other four. */}
      <section className="block" style={{ paddingTop: 40, paddingBottom: 40 }}>
        <div className="wrap">
          <div className="eyebrow reveal">
            &mdash; What students say
          </div>
          <h2 className="display" style={{ ...H2_STYLE, marginBottom: 34 }}>
            In their <span className="it">own words.</span>
          </h2>
          <div className="press-quotes-grid">
            {TESTIMONIALS.map((t) => (
              /*
                DELIBERATELY NOT `.reveal`, unlike every other block on this page.
                `.reveal` is opacity:0 until hooks/useReveal.ts adds `.in`, so a
                reader with JS blocked, a slow connection mid-hydration, or a
                text-only reader gets five empty cards where the evidence should
                be. Everything else on the page can afford to fade in; the proof
                cannot, because it is the one section whose absence changes
                whether someone believes the rest.
                The staggered `--rd` delay went with it. Most students here are
                over forty, and moving content measurably slows comprehension
                and raises error rates for older readers — a 400ms cascade
                across five quotes buys nothing and costs them.
              */
              <div key={t.name} className="press-quote-card">
                <div>
                  <Stars rating={t.rating} />
                  {/* The UI face at reading size, NOT the display face. Five
                      thirty-word quotes are five paragraphs of body copy, and
                      the display face has a 28px floor it would have to break
                      to fit them into a card. */}
                  <blockquote
                    style={{
                      fontFamily: 'var(--sans)',
                      fontSize: 'var(--fs-sm)',
                      lineHeight: 1.6,
                      fontWeight: 400,
                      color: 'var(--ink)',
                      margin: '16px 0 0',
                    }}
                  >
                    {t.quote}
                  </blockquote>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    gap: 16,
                    marginTop: 20,
                  }}
                >
                  <span className="eyebrow">
                    {t.name}
                  </span>
                  <time
                    dateTime={t.datePublished}
                    className="eyebrow"
                    style={{ letterSpacing: '0.14em' }}
                  >
                    {monthYear(t.datePublished)}
                  </time>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* 8 · Credits, compressed — and her music as a credit line           */}
      {/* ---------------------------------------------------------------- */}
      {/*
        This was two sections: a ruled credits gallery, and a 420px Spotify
        iframe whose "Open in Spotify" was the only solid button between the
        hero and the close — a link OFF the page, at the exact point a reader is
        deciding. Her performing work is the credential, so it is a badge line,
        and her music is a credit with a text link rather than an embed.
      */}
      <section className="block" style={{ paddingTop: 40, paddingBottom: 40 }}>
        <div className="wrap">
          <div className="eyebrow reveal">
            &mdash; Who is teaching
          </div>
          <ul
            className="reveal"
            style={{
              listStyle: 'none',
              padding: 0,
              margin: '20px 0 0',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            {CREDITS.map((c) => (
              <li
                key={c.what}
                style={{
                  border: '1px solid var(--rule)',
                  borderRadius: 999,
                  padding: '10px 18px',
                  fontFamily: 'var(--sans)',
                  /* 16px, not a 13px pill: this line is a credential and the
                     readers it is for are presbyopic. */
                  fontSize: 'var(--fs-ui)',
                  lineHeight: 1.35,
                  fontWeight: 400,
                  color: 'var(--ink)',
                }}
              >
                {c.what} <span style={{ color: 'var(--ink-soft)' }}>&middot; {c.em}</span>
              </li>
            ))}
          </ul>
          <p className="prose" style={{ marginTop: 26, maxWidth: '62ch' }}>
            I write, record and release my own music — Latin pop, indie pop, singer-songwriter. It
            lives on{' '}
            <a
              href={SOCIAL.spotify}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--accent-text)', borderBottom: '1px solid currentColor' }}
            >
              Spotify
            </a>
            {PLAYLISTS.length > 0 && (
              <>
                , featured in{' '}
                {PLAYLISTS.map((p, i) => (
                  <span key={p.url}>
                    {i > 0 ? ' and ' : ''}
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--accent-text)', borderBottom: '1px solid currentColor' }}
                    >
                      <em style={{ fontStyle: 'italic' }}>{p.name}</em>
                    </a>
                  </span>
                ))}
              </>
            )}
            . Press play if you like — it&apos;s the same person you&apos;d be booking.
          </p>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* 9 · Objections, in open text                                      */}
      {/* ---------------------------------------------------------------- */}
      {/* Readable without a click. An accordion is the right shape for
          seventeen FAQs and the wrong shape for the four questions that stop a
          purchase, because a collapsed answer is an unanswered one. */}
      <section className="block" style={{ paddingTop: 40, paddingBottom: 40 }}>
        <div className="wrap">
          <div className="split">
            <div>
              <div className="eyebrow reveal">
                &mdash; The honest answers
              </div>
              <h2 className="display" style={H2_STYLE}>
                What people ask <span className="it">before they book.</span>
              </h2>
              <p className="lede-plain" style={{ marginTop: 20 }}>
                The rest is on the{' '}
                <Link href="/coach/faq" style={{ color: 'var(--accent-text)' }}>
                  FAQ
                </Link>
                , and you can{' '}
                <Link href="/coach/contact" style={{ color: 'var(--accent-text)' }}>
                  just ask me
                </Link>
                .
              </p>
            </div>
            <div>
              <ul className="numbered">
                {OBJECTIONS.map((o, i) => (
                  <li key={o.q} className="reveal" style={{ '--rd': `${i * 60}ms` }}>
                    <span className="n">{String(i + 1).padStart(2, '0')}</span>
                    <span>
                      <span className="t">{o.q}</span>
                      {o.a}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* 10 · Close — one CTA, the same label as the hero's                 */}
      {/* ---------------------------------------------------------------- */}
      <section className="cta">
        <div className="eyebrow reveal" style={{ marginBottom: 30 }}>
          &mdash; Whenever you&apos;re ready
        </div>
        <h2 className="reveal" style={{ '--rd': '120ms' }}>
          Come <span className="it">sing.</span>
        </h2>
        <p className="reveal" style={{ '--rd': '240ms' }}>
          First step is a free {ASSESSMENT.durationMinutes}-minute assessment. {ASSESSMENT_CARD_COPY}
        </p>
        <Link className="btn btn--solid reveal" style={{ '--rd': '320ms' }} href="/coach/book">
          {ASSESSMENT_CTA_LABEL} <span className="arrow">&rarr;</span>
        </Link>
      </section>

      <JsonLd
        data={[
          localBusinessSchema(),
          coachingServiceSchema(),
          assessmentOfferSchema(),
          breadcrumbList([
            { name: 'Home', path: '/' },
            { name: 'Coaching', path: '/coach' },
          ]),
        ]}
      />
    </div>
  );
}
