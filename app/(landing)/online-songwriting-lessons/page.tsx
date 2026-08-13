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
import { ASSESSMENT, formatUsd, monthlyPlans, perLessonCents } from '@/lib/pricing';
import { assessmentOfferSchema, songwritingServiceSchema } from '@/lib/schema';
import { breadcrumbList, pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta({
  title: 'Online Songwriting Lessons — Finish the Songs You Start',
  description:
    'One-to-one online songwriting lessons with a released, touring singer-songwriter. Lyrics, melody, structure, second verses and actually finishing songs. English or Spanish. Free 30-minute first session.',
  path: '/online-songwriting-lessons',
});

/** See the LA page: student clips drop in here when they exist and are consented. */
const STUDENT_CLIPS: Video[] = [];

const PROBLEMS = [
  {
    t: 'Fifty voice memos, nothing finished',
    d: 'The commonest state to arrive in, and the most fixable. We go through what you already have, find the two fragments that are alive, and finish one. A finished imperfect song teaches more than nine unfinished good ones.',
  },
  {
    t: 'The second verse',
    d: 'Where songs die, because you have already said the interesting thing. Prosody, structure, and how to make the second pass earn its place rather than restate the first.',
  },
  {
    t: 'Lyrics that stay general',
    d: 'The difference between a line that lands and one that does not is almost never vocabulary — it is specificity. Object writing, sensory detail, and the discipline of cutting the line you are proudest of when it is doing no work.',
  },
  {
    t: 'Every song sounds the same',
    d: 'Usually the same three chords and the same melodic shape. We widen both, deliberately, and give you a way to hear the option you keep not choosing.',
  },
  {
    t: 'Choruses that do not lift',
    d: 'Where the highest note goes and why. How a hook can come from a rhythm rather than a bigger note. Why your verse is already doing the chorus’s job.',
  },
  {
    t: 'Writing in two languages',
    d: 'Sessions run in English or Spanish, and switching between them mid-song is normal here rather than a problem to be managed.',
  },
];

export default function OnlineSongwritingLessonsPage() {
  const anchor = monthlyPlans('online')[0];

  return (
    <div className="page-fade">
      <Reveal />
      <div className="wrap">
        <section className="lp-hero">
          <div className="eyebrow">Online songwriting lessons &middot; worldwide</div>
          <h1>
            Finish the songs you <span className="it">keep starting.</span>
          </h1>
          <p className="lp-hero-sub">
            One-to-one online songwriting sessions with Juliana Beltran — a Colombian
            singer-songwriter who releases her own records and plays them to rooms full of people.
            Lyrics, melody, structure, and the unglamorous craft of getting a song over the line.
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

        {/* The proof for a songwriting teacher is not a testimonial, it is a
            tracklist: seven of the ten songs in this set are hers. The setlist is
            rendered as real text, so it is both the evidence and indexable copy. */}
        <section className="lp-proof">
          <div className="video-primary-flag">
            <span className="line" />
            <span className="eyebrow">Her own songs, in front of an audience</span>
          </div>
          <VideoFacade
            video={BOOKING_LIVE_VIDEO}
            placement="lp-online-songwriting"
            primary
            posterPriority
            showSetlist
          />
          {STUDENT_CLIPS.length > 0 && (
            <div className="video-grid" style={{ marginTop: 40 }}>
              {STUDENT_CLIPS.map((clip) => (
                <VideoFacade
                  key={clip.slug}
                  video={clip}
                  placement="lp-online-songwriting-students"
                />
              ))}
            </div>
          )}
        </section>

        <section className="block" style={{ paddingTop: 60, paddingBottom: 40 }}>
          <div className="eyebrow reveal" style={{ marginBottom: 24 }}>
            What we usually fix first
          </div>
          <ul className="numbered">
            {PROBLEMS.map((p, i) => (
              <li key={p.t} className="reveal" style={{ '--rd': `${i * 50}ms` }}>
                <span className="n">{String(i + 1).padStart(2, '0')}</span>
                <span>
                  <span className="t">{p.t}</span>
                  {p.d}
                </span>
              </li>
            ))}
          </ul>
          <p className="prose" style={{ marginTop: 26 }}>
            Sessions are not a workshop with a curriculum. They are two writers with one song open
            between them — and she is the one who has finished more of them. There is a fuller account
            of how the work tends to go on the{' '}
            <Link href="/coach/songwriting" style={{ color: 'var(--accent)' }}>
              songwriting page
            </Link>
            .
          </p>
        </section>

        <section className="block" style={{ paddingTop: 20, paddingBottom: 40 }}>
          <div className="lp-grid">
            <div>
              <div className="eyebrow reveal" style={{ marginBottom: 10 }}>
                What sessions cost
              </div>
              <p className="prose" style={{ marginBottom: 30 }}>
                Same rate card as every other lesson — {formatUsd(perLessonCents(anchor))} a session
                on a monthly plan. The price is for the hour, not the subject, so a session can be
                half lyric-writing and half voice.
              </p>
              {/* buy={false}: on a paid-search landing page the free session is
                  the primary action and buy buttons would compete with it. The
                  required purchaseHref keeps every tier purchasable somewhere. */}
              <PriceGrid mode="online" buy={false} purchaseHref="/coach/pricing" />
              <div style={{ marginTop: 40 }}>
                <AssessmentCta mode="online" tone="primary" />
              </div>
            </div>
            <div>
              <div className="eyebrow reveal" style={{ marginBottom: 24 }}>
                Bring one unfinished song
              </div>
              <p className="prose">
                That is the entire preparation. A chorus with no verse, a verse with no chorus, a
                voice note from a car — anything you have stopped being able to hear.
              </p>
              <p className="prose">
                In the first {ASSESSMENT.durationMinutes} minutes we will look at it properly, find
                the thing that is actually stopping it, and you will leave knowing what the next move
                is. If you decide not to carry on, you keep that.
              </p>
              <p className="prose">
                If you do not play an instrument yet, that is fine: six chords and a strumming pattern
                is genuinely enough to write with, and we can get you there alongside the writing.
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
          <div className="eyebrow reveal" style={{ marginBottom: 30 }}>
            What students say
          </div>
          <div className="press-quotes-grid">
            {TESTIMONIALS.slice(2, 5).map((t, i) => (
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
          <AssessmentOffer
            mode="online"
            headline={
              <>
                Bring one <span className="it">unfinished</span> song.
              </>
            }
          >
            <PackagesAside />
          </AssessmentOffer>
        </div>
      </div>

      <JsonLd
        data={[
          songwritingServiceSchema(),
          assessmentOfferSchema(),
          breadcrumbList([
            { name: 'Home', path: '/' },
            { name: 'Online Songwriting Lessons', path: '/online-songwriting-lessons' },
          ]),
        ]}
      />
    </div>
  );
}
