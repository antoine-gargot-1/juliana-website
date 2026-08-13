import type { Metadata } from 'next';
import Link from 'next/link';

import { JsonLd } from '@/components/JsonLd';
import { Reveal } from '@/components/Reveal';
import { VideoFacade } from '@/components/artist/VideoFacade';
import {
  ASSESSMENT_CARD_COPY,
  ASSESSMENT_CTA_LABEL,
  AssessmentCta,
  AssessmentOffer,
  PackagesAside,
  PriceGrid,
} from '@/components/coach/PriceGrid';
import { AGGREGATE_RATING, BOOKING_LIVE_VIDEO, TESTIMONIALS, type Video } from '@/lib/content';
import { formatUsd, monthlyPlans, perLessonCents } from '@/lib/pricing';
import { assessmentOfferSchema, lessonsServiceSchema } from '@/lib/schema';
import { breadcrumbList, pageMeta } from '@/lib/seo';

/**
 * The cheapest per-lesson rate, read off the rate card rather than typed.
 *
 * This description used to carry a hardcoded "$70 a lesson". A price in a meta
 * description is a price Google shows in the SERP, and a stale one is a price
 * the visitor arrives expecting — so it comes from lib/pricing.ts like every
 * other number on the site. Module scope, because `metadata` is evaluated
 * before any component runs.
 */
const ANCHOR = monthlyPlans('online')[0];

export const metadata: Metadata = pageMeta({
  title: 'Online Singing Lessons — Free 30-Minute Assessment, Any Timezone',
  description:
    'Live one-to-one online singing lessons with a touring Colombian singer-songwriter. She plays live underneath you instead of using a backing track, and you keep a recording of your own exercises. English or Spanish, ages 5 to 70+, from ' +
    `${formatUsd(perLessonCents(ANCHOR))} a lesson on a monthly plan.`,
  path: '/online-singing-lessons',
});

/** See the LA page: student clips drop in here when they exist and are consented. */
const STUDENT_CLIPS: Video[] = [];

const OBJECTIONS = [
  {
    t: '“Does singing even work over video?”',
    d: 'Not on default settings, no. A video call is tuned for speech, so it gates your quiet notes and flattens anything soft. I set my end up for music instead of speech and change three settings on yours, once, and after that breath, tone and pitch all arrive intact. Several of my longest-running students have never been in the same city as me.',
  },
  {
    /* THE ACCOMPANIMENT CLAIM, corrected.
       This used to say "tempo and key move with your voice in real time",
       which consumer video cannot deliver: ensemble synchronisation needs
       roughly 8–25ms of round-trip and a consumer call is well above 30ms.
       On the page whose entire job is establishing that online works, an
       overclaim a musician can hear through is the most expensive sentence
       available. What is true is better anyway — a live instrument can change
       key, drop tempo and loop four bars, and a backing track cannot. */
    t: '“Won’t I just be singing to a backing track?”',
    d: 'No. I play guitar or piano live underneath you, so I can drop the key, slow the tempo or loop four bars the moment you need it — none of which a pre-recorded track will do for you. Video does add a fraction of a second of delay, so we aren’t locked together the way we’d be in one room: one of us leads and the other follows, and it’s usually you.',
  },
  {
    t: '“Do I need equipment?”',
    d: 'Wired headphones. That’s the whole list. No microphone, no interface, no software to buy — bring a microphone if you already own one and I’ll help you set it up, but nothing depends on it.',
  },
  {
    t: '“I’m not in your timezone.”',
    d: 'Lessons run early and late Pacific, which covers most of Europe and Latin America comfortably, and the scheduler shows times in your clock rather than mine. Nobody has to do mental arithmetic to book.',
  },
  {
    t: '“I’ve never had a lesson.”',
    d: 'Then the first thirty minutes is exactly the right place to start. No audition, no theory, and no expectation that you can already do the thing you’re coming to learn.',
  },
];

export default function OnlineSingingLessonsPage() {
  const anchor = ANCHOR;

  return (
    <div className="page-fade">
      <Reveal />
      <div className="wrap">
        <section className="lp-hero">
          <div className="eyebrow">Online singing lessons &middot; worldwide</div>
          <h1>
            Singing lessons that <span className="it">travel well.</span>
          </h1>
          <p className="lp-hero-sub">
            Live one-to-one voice lessons over video with Colombian singer-songwriter Juliana
            Beltran, in English or Spanish and in your own timezone. She plays live underneath you
            instead of pressing play on a track, and you leave with a recording of your own
            exercises to practise against.
          </p>
          <div className="lp-hero-ctas">
            <Link className="btn btn--solid" href="/coach/book">
              {ASSESSMENT_CTA_LABEL} <span className="arrow">&rarr;</span>
            </Link>
            <span className="eyebrow">
              {AGGREGATE_RATING.value}/5 from {AGGREGATE_RATING.count} students
            </span>
          </div>
          <p className="lp-hero-note">{ASSESSMENT_CARD_COPY}</p>
        </section>

        {/* Proof above the fold. Facade only — the poster is the LCP element and
            no YouTube JavaScript loads until somebody chooses to play it. */}
        <section className="lp-proof">
          <div className="video-primary-flag">
            <span className="line" />
            <span className="eyebrow">This is the voice teaching you</span>
          </div>
          <VideoFacade
            video={BOOKING_LIVE_VIDEO}
            placement="lp-online-singing"
            primary
            posterPriority
          />
          {STUDENT_CLIPS.length > 0 && (
            <div className="video-grid" style={{ marginTop: 40 }}>
              {STUDENT_CLIPS.map((clip) => (
                <VideoFacade key={clip.slug} video={clip} placement="lp-online-singing-students" />
              ))}
            </div>
          )}
        </section>

        <section className="block" style={{ paddingTop: 60, paddingBottom: 40 }}>
          <div className="eyebrow reveal" style={{ marginBottom: 24 }}>
            The five things everyone asks first
          </div>
          <ul className="numbered">
            {OBJECTIONS.map((o, i) => (
              <li key={o.t} className="reveal" style={{ '--rd': `${i * 50}ms` }}>
                <span className="n">{String(i + 1).padStart(2, '0')}</span>
                <span>
                  <span className="t">{o.t}</span>
                  {o.d}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="block" style={{ paddingTop: 20, paddingBottom: 40 }}>
          <div className="lp-grid">
            <div>
              <div className="eyebrow reveal" style={{ marginBottom: 10 }}>
                What online lessons cost
              </div>
              <p className="prose" style={{ marginBottom: 30 }}>
                {formatUsd(perLessonCents(anchor))} a lesson on a monthly plan of full-length
                sessions, and less for the shorter ones. Every price is below. There&apos;s no form
                to fill in first.
              </p>
              {/* buy={false}: the primary action on a paid-search landing page is
                  the free session, and buy buttons here would compete with it. The
                  required purchaseHref is what stops that becoming a price with no
                  way to pay for it. */}
              <PriceGrid mode="online" buy={false} purchaseHref="/coach/pricing" />
              <div style={{ marginTop: 40 }}>
                <AssessmentCta mode="online" tone="primary" />
              </div>
            </div>
            <div>
              <div className="eyebrow reveal" style={{ marginBottom: 24 }}>
                Who teaches
              </div>
              <p className="prose">
                Juliana Beltran is a Colombian singer-songwriter based in Los Angeles. She toured
                internationally as a vocalist for Amanda Miguel, her own songs sit on Spotify
                editorial playlists, and she still plays rooms like Hotel Café — a full 47-minute
                headline set there, ten songs with a four-piece band, is the video at the top of
                this page.
              </p>
              <p className="prose">
                She teaches healthy technique first. Range and volume come out of support and
                release rather than force, which is what stops a beginner building habits that take
                years to undo.
              </p>
              <p className="prose">
                Students have ranged from age five to seventy-plus. Lessons run in whichever
                language you think in, and switching mid-sentence is normal here.
              </p>
              <div className="press-strip reveal" style={{ paddingTop: 30, paddingBottom: 30 }}>
                <span>Amanda Miguel</span>
                <span>Hotel Cafe &middot; LA</span>
                <span>Spotify Editorial</span>
              </div>
              <p className="prose" style={{ marginTop: 26 }}>
                Prefer to be in the same room? Lessons also run{' '}
                <Link href="/coach/lessons/in-person" style={{ color: 'var(--accent-text)' }}>
                  in person in Los Angeles
                </Link>
                .
              </p>
            </div>
          </div>
        </section>

        <section className="block" style={{ paddingTop: 20, paddingBottom: 40 }}>
          <div className="eyebrow reveal" style={{ marginBottom: 30 }}>
            What students say
          </div>
          <div className="press-quotes-grid">
            {TESTIMONIALS.slice(1, 4).map((t, i) => (
              <div key={t.name} className="press-quote-card reveal" style={{ '--rd': `${i * 100}ms` }}>
                <blockquote
                  style={{
                    fontFamily: 'var(--serif)',
                    fontSize: 'clamp(20px, 2vw, 28px)',
                    lineHeight: 1.2,
                    margin: 0,
                    fontWeight: 600,
                  }}
                >
                  {t.quote}
                </blockquote>
                <div className="eyebrow" style={{ marginTop: 16 }}>
                  {t.name}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="block" style={{ paddingTop: 0, paddingBottom: 20 }}>
          <AssessmentOffer mode="online">
            <PackagesAside />
          </AssessmentOffer>
        </div>
      </div>

      <JsonLd
        data={[
          lessonsServiceSchema('online'),
          assessmentOfferSchema(),
          breadcrumbList([
            { name: 'Home', path: '/' },
            { name: 'Online Singing Lessons', path: '/online-singing-lessons' },
          ]),
        ]}
      />
    </div>
  );
}
