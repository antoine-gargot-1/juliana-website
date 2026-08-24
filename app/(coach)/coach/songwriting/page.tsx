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

/**
 * THIS PAGE AND /online-songwriting-lessons WERE THE SAME PAGE TO A SEARCH
 * ENGINE. READ THIS BEFORE CHANGING THE TITLE OR THE H1 BACK.
 * ---------------------------------------------------------------------------
 * Both shipped with the identical H1 — "Finish the songs you keep starting." —
 * and titles that both opened on the phrase "…Songwriting Lessons — Online".
 * They also both emit the same `songwritingServiceSchema()` node, whose `url` is
 * this page. Two URLs asserting one heading, one lead phrase and one entity is
 * the textbook shape of keyword cannibalisation, and it was happening on the one
 * cluster this studio can realistically win: songwriting terms are materially
 * less contested than voice terms.
 *
 * The split, stated in full in docs/seo-audit.md:
 *
 *   THIS PAGE                     owns the unqualified and the local terms —
 *                                 "songwriting lessons", "songwriting coach",
 *                                 "songwriting teacher", "songwriting mentor",
 *                                 "learn to write songs", "songwriting lessons
 *                                 los angeles". It is the depth page, it is in
 *                                 the footer of every coach page, and it holds
 *                                 the six-part arc.
 *
 *   /online-songwriting-lessons   owns the online-qualified terms — "online
 *                                 songwriting lessons", "songwriting lessons
 *                                 online". Exact-match slug, and where all 11
 *                                 songwriting keywords in
 *                                 marketing/google-ads/keywords.csv point.
 *
 * So the word "Online" comes out of this title's lead and "in Los Angeles" moves
 * into it, and the conversion headline "Finish the songs you keep starting."
 * stays on the landing page — which is the page whose job is conversion — while
 * this one takes the plain descriptive H1 its four sibling /coach pages use
 * ("Voice lessons in Los Angeles.", "In-person lessons in Los Angeles."). That
 * also fixes a real gap: this page's H1 previously contained neither the word
 * "songwriting" nor a location.
 */
export const metadata: Metadata = pageMeta({
  title: 'Songwriting Lessons in Los Angeles & Online',
  description:
    'Songwriting lessons in Los Angeles and online with a released, touring singer-songwriter. Lyrics, melody, structure, and finishing what you start.',
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
          {/* "Finish the songs you keep starting." moved to
              /online-songwriting-lessons, where it was already the H1 too — see
              the note above `metadata`. Two URLs cannot share one H1. This is the
              house style for a /coach/* service page and it puts the discipline
              and the city in the heading, which the old one did neither of. */}
          <h1>
            Songwriting lessons in <span className="it">Los Angeles.</span>
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

        {/*
          THE OUTLINE ON THIS PAGE IS LOAD-BEARING. DO NOT PUT THE DIVS BACK.
          ---------------------------------------------------------------------
          This is 1,830 words and until now it shipped one h1 and one h2, because
          every section label below was a <div className="eyebrow"> and every row
          title in the numbered lists a <span className="t">. To a crawler that
          is one undifferentiated block; to a screen reader it is a page with no
          landmarks. Finding #9 in docs/seo-audit.md, written up in its §10.3 as
          the highest-value structural fix left on the site.

          The outline is now: h1 (the page title, the only Playfair on the page)
          → h2 per section → h3 per row inside a section's list, plus the h3s
          PriceGrid emits for the tier names, which now nest under the "Songwriting
          rates" h2 instead of jumping straight from the h1.

          It is a semantics change and nothing else. .eyebrow and .numbered .t
          still own every type declaration, and app/styles.css got a heading
          margin reset — the SEMANTIC HEADING RESET section at the end of it — so
          the UA's 0.83em block margins cannot reintroduce themselves. If you add
          a section here, label it with an h2 carrying .eyebrow; if you add a row
          to one of these lists, its title is an h3 carrying .t.
        */}
        {/* The setlist is the proof, and it is the reason this component is used
            here with chapters on: seven of the ten songs in that set are hers.
            "I write songs" is an adjective; a tracklist is evidence. */}
        <section className="block" style={{ paddingTop: 20, paddingBottom: 40 }}>
          <div className="video-primary-flag reveal">
            <span className="line" />
            <h2 className="eyebrow">A set of mostly my own songs</h2>
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
          <h2 className="eyebrow reveal" style={{ marginBottom: 24 }}>
            How the work tends to go
          </h2>
          <ul className="numbered">
            {ARC.map((a, i) => (
              <li key={a.t} className="reveal" style={{ '--rd': `${i * 50}ms` }}>
                <span className="n">{String(i + 1).padStart(2, '0')}</span>
                <span>
                  <h3 className="t">{a.t}</h3>
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
              <h2 className="eyebrow reveal" style={{ marginBottom: 24 }}>
                Who this is for
              </h2>
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
              <h2 className="eyebrow reveal" style={{ marginBottom: 24 }}>
                Songwriting and voice together
              </h2>
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
              {/* Reciprocal link to /online-songwriting-lessons, which had one
                  internal link pointing at it (the chooser list on the home page)
                  and links back here already. Songwriting is the winnable
                  cluster, so the two pages in it should be one click apart, and
                  this is the honest division of labour between them: this page is
                  mode-agnostic, that one answers "will this work over video". */}
              <p className="prose">
                Not in Los Angeles? Everything here runs over video, and{' '}
                <Link href="/online-songwriting-lessons" style={{ color: 'var(--accent)' }}>
                  how the online songwriting sessions work
                </Link>{' '}
                has a page of its own.
              </p>
            </div>
          </div>
        </section>

        <section id="rates" className="block" style={{ paddingTop: 20, paddingBottom: 40 }}>
          <h2 className="eyebrow reveal" style={{ marginBottom: 24 }}>
            Songwriting rates
          </h2>
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
          <h2 className="eyebrow reveal" style={{ marginBottom: 30 }}>
            What students say
          </h2>
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
