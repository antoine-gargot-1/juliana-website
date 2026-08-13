import type { Metadata } from 'next';
import Link from 'next/link';

import { JsonLd } from '@/components/JsonLd';
import { Reveal } from '@/components/Reveal';
import { VideoFacade } from '@/components/artist/VideoFacade';
import { ModeToggle } from '@/components/coach/ModeToggle';
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
import { assessmentOfferSchema, songwritingServiceSchema } from '@/lib/schema';
import { breadcrumbList, pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta({
  title: 'Songwriting Lessons — Online & In Person in Los Angeles',
  description:
    'Songwriting lessons with a working, released singer-songwriter. Lyrics, melody, structure, co-writing and finishing songs you have abandoned — online anywhere or in person in Los Angeles. Free 30-minute session to start.',
  path: '/coach/songwriting',
});

/**
 * This page carries more depth than the others on purpose. Voice keywords are a
 * national bloodbath dominated by directories and franchises; "songwriting
 * lessons" is a fraction of the volume but a fraction of the competition too,
 * and the intent is far better — someone searching it has already decided to
 * write and is looking for a person, not a price. Depth is what wins that query.
 */

/** The six-week arc a new songwriting student actually goes through. */
const ARC = [
  {
    t: 'Week one — what you already have',
    d: 'Everyone arrives with fragments: voice notes, half a chorus, a notes app full of lines. We go through them and find the two that are alive. Starting from your own material means the first finished song sounds like you rather than like an exercise.',
  },
  {
    t: 'Lyrics that are specific',
    d: "The difference between a line that lands and a line that doesn't is almost never vocabulary — it's specificity. Object writing (ten timed minutes on one physical object, through every sense you have), sensory detail, and the discipline of cutting the line you're proudest of when it's doing nothing.",
  },
  {
    t: 'Melody as a decision, not an accident',
    d: 'Where the highest note goes and why. Why your verses keep sounding like your choruses. How to make a hook out of a rhythm rather than a bigger note.',
  },
  {
    t: 'Structure and the second verse',
    d: 'Second verses are where songs die. Form, prosody — whether the stressed syllables in your words land on the stressed beats of your melody — and the specific problem of having said the interesting thing already.',
  },
  {
    t: 'Chords under it',
    d: "Enough guitar or piano to accompany yourself and to get out of the three-chord loop you write everything in. You don't need to play well; you need to play enough to hear your options.",
  },
  {
    t: 'Finishing, and then finishing again',
    d: 'A finished bad song teaches you more than nine unfinished good ones. We finish things — demo, lyric sheet, a version you can play to somebody — and then we do it again.',
  },
];

const FOR_WHO = [
  'Singers who write in secret and have never played a song to anyone',
  'Writers with fifty voice memos and nothing finished',
  'Artists preparing a first release and choosing between eleven songs',
  'Bilingual writers working in Spanish, English or both at once',
  'Instrumentalists who can play anything and cannot write a chorus',
  'Teenagers writing seriously, with a parent or guardian on the booking',
];

export default function SongwritingPage() {
  return (
    <div className="page-fade">
      <Reveal />
      <div className="wrap">
        <section className="svc-page-hero">
          <div className="eyebrow">Songwriting &middot; online &amp; in person in LA</div>
          <h1>
            Finish the songs you <span className="it">keep starting.</span>
          </h1>
          <p className="prose" style={{ fontSize: 20, marginTop: 24, maxWidth: 700 }}>
            Songwriting lessons with someone who releases her own records and plays them to rooms
            full of people. Lyrics, melody, structure and the unglamorous craft of getting a song
            over the line — in English, in Spanish, or moving between the two.
          </p>
          {/* PRIMARY: buy a package. Songwriting is the winnable search term and
              the depth of this page is what earns the click, so the visitor who
              reaches the bottom of it is a considered buyer, not a browser. The
              free session stays as the quieter second path. */}
          <div style={{ marginTop: 32, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <PurchaseCtaLink />
          </div>
          <p className="lp-hero-note">{PURCHASE_NOTE}</p>
          <RiskReversal />
        </section>

        {/* The setlist is the proof, and it is the reason this component is used
            here with chapters on: seven of the ten songs in that set are hers.
            "I write songs" is an adjective; a tracklist is evidence. */}
        <section className="block" style={{ paddingTop: 20, paddingBottom: 40 }}>
          <div className="video-primary-flag reveal">
            <span className="line" />
            <span className="eyebrow">A set of mostly my own songs</span>
          </div>
          <div className="split">
            <VideoFacade
              video={BOOKING_LIVE_VIDEO}
              placement="coach-songwriting"
              primary
              showSetlist
            />
            <div>
              <p className="prose">
                I am a Colombian singer-songwriter based in Los Angeles. I have toured
                internationally as a vocalist for Amanda Miguel, my originals sit on Spotify
                editorial playlists, and I still play rooms like Hotel Café with a set that is mostly
                mine.
              </p>
              <p className="prose">
                That matters for a songwriting teacher in one specific way: I am currently making the
                decisions I am going to ask you to make. Which line to cut. Whether the bridge earns
                its place. What to do when a song is nearly right and you have stopped being able to
                hear it.
              </p>
              <p className="prose">
                Sessions are not workshops with a curriculum. They are two writers with one song open
                between them, and I am the one who has finished more of them.
              </p>
            </div>
          </div>
        </section>

        <section className="block" style={{ paddingTop: 20, paddingBottom: 40 }}>
          <div className="eyebrow reveal" style={{ marginBottom: 24 }}>
            How the work tends to go
          </div>
          <ul className="numbered">
            {ARC.map((a, i) => (
              <li key={a.t} className="reveal" style={{ '--rd': `${i * 50}ms` }}>
                <span className="n">{String(i + 1).padStart(2, '0')}</span>
                <span>
                  <span className="t">{a.t}</span>
                  {a.d}
                </span>
              </li>
            ))}
          </ul>
          <p className="prose" style={{ marginTop: 26 }}>
            That is a shape, not a syllabus. Someone arriving with an album half-written and a
            release date doesn&rsquo;t start at week one, and someone who has never written a line
            doesn&rsquo;t get handed a co-write. The first session exists to work out which of those
            you are.
          </p>
        </section>

        <section className="block" style={{ paddingTop: 20, paddingBottom: 40 }}>
          <div className="split">
            <div>
              <div className="eyebrow reveal" style={{ marginBottom: 24 }}>
                Who this is for
              </div>
              <ul className="numbered">
                {FOR_WHO.map((f, i) => (
                  <li key={f} className="reveal" style={{ '--rd': `${i * 50}ms` }}>
                    <span className="n">{String(i + 1).padStart(2, '0')}</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="eyebrow reveal" style={{ marginBottom: 24 }}>
                Songwriting and voice together
              </div>
              <p className="prose">
                Most students end up doing both, and the rate card doesn&rsquo;t care: a 60-minute lesson
                costs the same whether we spend it on technique, on a lyric, or half on each. Writers
                who sing their own songs need a voice that can deliver what they wrote, and singers
                who write stop being dependent on someone else&rsquo;s material.
              </p>
              <p className="prose">
                If you play, we&rsquo;ll use it. If you don&rsquo;t, we&rsquo;ll get you far enough
                on guitar or piano to accompany yourself — six chords and a strumming pattern is
                genuinely enough to write with.
              </p>
              <p className="prose">
                Artist development sits next to this for people getting ready to release: identity,
                song selection, live set order, what to put out first. See{' '}
                <Link href="/coach/services" style={{ color: 'var(--accent)' }}>
                  all six disciplines
                </Link>
                .
              </p>
            </div>
          </div>
        </section>

        <section id="rates" className="block" style={{ paddingTop: 20, paddingBottom: 40 }}>
          <div className="eyebrow reveal" style={{ marginBottom: 24 }}>
            Songwriting rates
          </div>
          <p className="lede-plain" style={{ marginBottom: 26, marginTop: 0 }}>
            The price is for the lesson, not the subject.
          </p>
          <ModeToggle
            online={<PriceGrid mode="online" />}
            inperson={<PriceGrid mode="inperson" />}
            label="Songwriting lesson format"
          />
          <PurchaseFacts />
          <AssessmentCta tone="secondary" />
        </section>

        {/* This page emitted aggregateRating with reviewCount 5 through
            songwritingServiceSchema() while rendering no review at all, so the
            markup claimed five reviews a reader could not find anywhere on the
            page. All five, with the aggregate line the component renders over
            the reviews it was actually given. */}
        <section className="block" style={{ paddingTop: 20, paddingBottom: 40 }}>
          <div className="eyebrow reveal" style={{ marginBottom: 30 }}>
            What students say
          </div>
          <TestimonialCarousel testimonials={TESTIMONIALS} />
        </section>

        <div className="block" style={{ paddingTop: 0, paddingBottom: 60 }}>
          <PurchaseCta
            headline={
              <>
                Bring one <span className="it">unfinished</span> song.
              </>
            }
          />
        </div>
      </div>

      <JsonLd
        data={[
          songwritingServiceSchema(),
          assessmentOfferSchema(),
          breadcrumbList([
            { name: 'Home', path: '/' },
            { name: 'Coaching', path: '/coach' },
            { name: 'Songwriting Lessons', path: '/coach/songwriting' },
          ]),
        ]}
      />
    </div>
  );
}
