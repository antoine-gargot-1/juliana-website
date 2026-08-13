import type { Metadata } from 'next';
import Link from 'next/link';

import { JsonLd } from '@/components/JsonLd';
import { Reveal } from '@/components/Reveal';
import { VideoFacade } from '@/components/artist/VideoFacade';
import { ModeToggle } from '@/components/coach/ModeToggle';
import {
  ASSESSMENT_CARD_COPY,
  ASSESSMENT_CTA_LABEL,
  AssessmentCta,
  AssessmentOffer,
  IN_PERSON_DAYS_SENTENCE,
  PackagesAside,
  PriceGrid,
} from '@/components/coach/PriceGrid';
import { AGGREGATE_RATING, BOOKING_LIVE_VIDEO, TESTIMONIALS, type Video } from '@/lib/content';
import { ASSESSMENT, formatUsd, monthlyPlans, perLessonCents } from '@/lib/pricing';
import { assessmentOfferSchema, lessonsServiceSchema, localBusinessSchema } from '@/lib/schema';
import { breadcrumbList, pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta({
  title: 'Vocal Coach in Los Angeles — Free 30-Minute Assessment',
  description:
    'Work with a touring Colombian singer-songwriter and vocal coach in Los Angeles. In person on Tuesdays and Thursdays or online anywhere, English or Spanish, ages 5 to 70+. Book a free 30-minute vocal assessment.',
  path: '/vocal-coach-los-angeles',
});

/**
 * PROOF SEAM.
 *
 * Vocal coaching is bought by ear. The proof element on this page is therefore
 * a recording, not a testimonial — and it is her own live footage, because no
 * student before/after clips exist in the repo yet and inventing them is not an
 * option.
 *
 * When consented student clips do exist, they drop into this array and the
 * section below renders them in a grid beneath the primary player. No redesign,
 * no new component, no change to this page's structure — which is the whole
 * reason the empty array is here rather than the section being hardcoded to one
 * video.
 */
const STUDENT_CLIPS: Video[] = [];

const WHY = [
  {
    t: 'She’s still doing it',
    d: 'Touring vocalist for Amanda Miguel, her own songs on Spotify editorial playlists, and a 47-minute headline set at Hotel Café with a four-piece band — that’s the video above. Coaching from someone whose own voice has to get through a run of shows is different from coaching out of a textbook.',
  },
  {
    t: 'Healthy technique first',
    d: 'Range and volume come out of support and release, not force. Singers who get pushed hard arrive with habits that take longer to undo than they’d have taken to learn properly.',
  },
  {
    t: 'English or Spanish',
    d: 'A technique instruction lands differently in your second language, and most of singing is thinking in the right image. Lessons run in whichever language you think in, and switching mid-sentence is normal here.',
  },
  {
    t: 'Ages five to seventy-plus',
    d: 'Total beginners who’ve only ever sung in the car, teenagers preparing auditions, and adults finally doing the thing they meant to do at twenty.',
  },
];

export default function VocalCoachLosAngelesPage() {
  const anchor = monthlyPlans('inperson')[0];

  return (
    <div className="page-fade">
      <Reveal />
      <div className="wrap">
        <section className="lp-hero">
          <div className="eyebrow">
            Vocal coach &middot; Los Angeles &middot; in person &amp; online
          </div>
          <h1>
            A vocal coach who still <span className="it">sings for a living.</span>
          </h1>
          <p className="lp-hero-sub">
            One-to-one voice lessons in Los Angeles with Colombian singer-songwriter Juliana Beltran
            — in person, or online from anywhere, in English or Spanish. {ASSESSMENT.durationMinutes}{' '}
            minutes to find out what your voice can actually do, at no charge.
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

        {/* Above the fold, and the poster is the intended LCP element: a plain
            <img> with fetchPriority high, no iframe and no YouTube JavaScript
            until a real click. That is what keeps a page with video on it under
            2 seconds on a phone. */}
        <section className="lp-proof">
          <div className="video-primary-flag">
            <span className="line" />
            <span className="eyebrow">Listen before you decide</span>
          </div>
          <VideoFacade
            video={BOOKING_LIVE_VIDEO}
            placement="lp-vocal-coach-la"
            primary
            posterPriority
          />
          {STUDENT_CLIPS.length > 0 && (
            <div className="video-grid" style={{ marginTop: 40 }}>
              {STUDENT_CLIPS.map((clip) => (
                <VideoFacade key={clip.slug} video={clip} placement="lp-vocal-coach-la-students" />
              ))}
            </div>
          )}
        </section>

        <section className="block" style={{ paddingTop: 60, paddingBottom: 40 }}>
          <div className="lp-grid">
            <div>
              <div className="eyebrow reveal" style={{ marginBottom: 24 }}>
                Why work with her
              </div>
              <ul className="numbered">
                {WHY.map((w, i) => (
                  <li key={w.t} className="reveal" style={{ '--rd': `${i * 60}ms` }}>
                    <span className="n">{String(i + 1).padStart(2, '0')}</span>
                    <span>
                      <span className="t">{w.t}</span>
                      {w.d}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="eyebrow reveal" style={{ marginBottom: 24 }}>
                What we work on
              </div>
              <ul className="numbered">
                <li>
                  <span className="n">01</span>
                  <span>Breath support and healthy technique</span>
                </li>
                <li>
                  <span className="n">02</span>
                  <span>Range, without strain</span>
                </li>
                <li>
                  <span className="n">03</span>
                  <span>
                    Pitch, harmony, and ear training &mdash; learning to name what you&apos;re
                    hearing
                  </span>
                </li>
                <li>
                  <span className="n">04</span>
                  <span>Tone — finding a sound that is yours</span>
                </li>
                <li>
                  <span className="n">05</span>
                  <span>Singing and playing at the same time</span>
                </li>
                <li>
                  <span className="n">06</span>
                  <span>Stage nerves, auditions, showcases</span>
                </li>
              </ul>
              <p className="prose" style={{ marginTop: 26 }}>
                In person in Los Angeles or online, whichever fits your week.{' '}
                {IN_PERSON_DAYS_SENTENCE} The exact address is shared privately once your lesson is
                confirmed.
              </p>
            </div>
          </div>
        </section>

        <section className="block" style={{ paddingTop: 20, paddingBottom: 40 }}>
          <div className="eyebrow reveal" style={{ marginBottom: 10 }}>
            What lessons cost
          </div>
          <p className="prose" style={{ marginBottom: 30 }}>
            You don&apos;t have to ask to see a price. Monthly plans work out from{' '}
            {formatUsd(perLessonCents(anchor))} a lesson in person, and less online.
          </p>
          {/* Opens on in-person: that is the intent this page's ads are bought
              against. Both panels are in the HTML either way.

              buy={false} — and this is the decision to leave alone. This page is
              what the ad budget pays for, and the visitor is a stranger who typed
              "vocal coach los angeles" thirty seconds ago. A row of buy buttons
              here would be a second competing CTA against the free session, which
              is the offer a stranger actually converts on; the minority who
              already know what they want get the aside below instead.
              purchaseHref is required by PriceGrid precisely so this cannot
              become a price with no way to pay for it. */}
          <ModeToggle
            initial="inperson"
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

          {/* Mid-page repeat of the PRIMARY action, with the card promise. */}
          <div style={{ marginTop: 40 }}>
            <AssessmentCta mode="inperson" tone="primary" />
          </div>
        </section>

        <section className="block" style={{ paddingTop: 20, paddingBottom: 40 }}>
          <div className="eyebrow reveal" style={{ marginBottom: 30 }}>
            What students say
          </div>
          <div className="press-quotes-grid">
            {TESTIMONIALS.slice(0, 3).map((t, i) => (
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
          {/* PRIMARY, third appearance. The secondary purchase path is nested
              inside the block so it is unmistakably the smaller of the two — and
              it carries no card-hold copy, because a purchase does charge. */}
          <AssessmentOffer mode="inperson">
            <PackagesAside />
          </AssessmentOffer>
        </div>
      </div>

      <JsonLd
        data={[
          localBusinessSchema(),
          lessonsServiceSchema('inperson'),
          assessmentOfferSchema(),
          breadcrumbList([
            { name: 'Home', path: '/' },
            { name: 'Vocal Coach in Los Angeles', path: '/vocal-coach-los-angeles' },
          ]),
        ]}
      />
    </div>
  );
}
