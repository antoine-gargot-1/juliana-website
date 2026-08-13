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

export const metadata: Metadata = pageMeta({
  title: 'Online Singing Lessons — Free 30-Minute Assessment, Any Timezone',
  description:
    'Live one-to-one online singing lessons with a touring Colombian singer-songwriter. Real audio, live accompaniment and a recording of your own exercises. English or Spanish, ages 5 to 70+, from $70 a lesson on a monthly plan.',
  path: '/online-singing-lessons',
});

/** See the LA page: student clips drop in here when they exist and are consented. */
const STUDENT_CLIPS: Video[] = [];

const OBJECTIONS = [
  {
    t: '“Does singing even work over video?”',
    d: 'Not on default settings, no — a video call is tuned for speech, so it gates quiet notes and flattens dynamics. I run calibrated audio on my end and change three settings on yours, once, and after that breath, tone and pitch all arrive intact. Several of my longest-running students have never been in the same city as me.',
  },
  {
    t: '“Won’t I just be singing to a backing track?”',
    d: 'No. I play guitar or piano live underneath you, so tempo and key move with your voice in real time. That is the part a pre-recorded track cannot do and the part that teaches you to sing with musicians.',
  },
  {
    t: '“Do I need equipment?”',
    d: 'Wired headphones. That is the whole list. No microphone, no interface, no software to buy — bring a microphone if you own one and I will help you set it up, but nothing depends on it.',
  },
  {
    t: '“I’m not in your timezone.”',
    d: 'Lessons run early and late Pacific, which covers most of Europe and Latin America comfortably, and the scheduler shows times in your clock rather than mine. Nobody has to do mental arithmetic to book.',
  },
  {
    t: '“I’ve never had a lesson.”',
    d: 'Then the first thirty minutes is exactly the right place to start. No audition, no theory required, no expectation that you can already do the thing you are coming to learn.',
  },
];

export default function OnlineSingingLessonsPage() {
  const anchor = monthlyPlans('online')[0];

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
            Beltran. Real audio instead of speech-optimised mush, live accompaniment under your
            voice, and a recording of your own exercises to practise with. English or Spanish, in your
            timezone.
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
                {formatUsd(perLessonCents(anchor))} a lesson on a monthly plan for full-length weekly
                sessions, with shorter sessions available for less. Every price is below — no enquiry
                required.
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
                Juliana Beltran is a Colombian singer-songwriter based in Los Angeles. She has toured
                internationally as a vocalist for Amanda Miguel, releases her own music — some of it
                on Spotify editorial playlists — and still plays rooms like Hotel Café.
              </p>
              <p className="prose">
                She teaches healthy technique first: range and volume are the result of support and
                release rather than force, which is what makes a voice last through a run of shows
                and what stops a beginner building habits that take years to undo.
              </p>
              <p className="prose">
                Students have ranged from age five to seventy-plus. Lessons run in English or Spanish
                — whichever you think in, switching mid-sentence if that is easier.
              </p>
              <div className="press-strip reveal" style={{ paddingTop: 30, paddingBottom: 30 }}>
                <span>Amanda Miguel</span>
                <span>Hotel Cafe &middot; LA</span>
                <span>Spotify Editorial</span>
              </div>
              <p className="prose" style={{ marginTop: 26 }}>
                Prefer to be in the same room? Lessons also run{' '}
                <Link href="/coach/lessons/in-person" style={{ color: 'var(--accent)' }}>
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
                    fontFamily: 'var(--display)',
                    fontSize: 'clamp(20px, 2vw, 28px)',
                    lineHeight: 1.2,
                    margin: 0,
                    fontWeight: 400,
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
