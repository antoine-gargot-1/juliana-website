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
} from '@/components/coach/PriceGrid';
import { PURCHASE_NOTE } from '@/components/coach/Purchase';
import { BOOKING_LIVE_VIDEO, TESTIMONIALS } from '@/lib/content';
import { assessmentOfferSchema, lessonsServiceSchema } from '@/lib/schema';
import { breadcrumbList, pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta({
  title: 'Online Singing & Music Lessons — One-to-One, Any Timezone',
  description:
    'Live one-to-one online voice, guitar, piano and songwriting lessons with Colombian singer-songwriter Juliana Beltran. English or Spanish, ages 5 to 70+, from $70 a lesson. Start with a free 30-minute vocal assessment.',
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
    d: 'A video call optimises for speech, which means it gates quiet notes, flattens dynamics and mangles breath. I run a calibrated audio setup on my end and walk you through three settings on yours, so tone and pitch arrive intact. It takes four minutes once.',
  },
  {
    t: 'You always have accompaniment',
    d: 'I play guitar or piano live under you rather than sending you off to practise with a backing track, so tempo and key move with your voice in real time.',
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
  'A room where you are not worried about being heard',
  'Water, and something to write on',
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
        </section>

        {/* Proof. Coaching is bought by ear, so the pitch is a recording rather
            than an adjective. Facade only — no iframe until a real click, so it
            cannot compete with LCP. */}
        <section className="block" style={{ paddingTop: 20, paddingBottom: 40 }}>
          <div className="video-primary-flag reveal">
            <span className="line" />
            <span className="eyebrow">Hear it first</span>
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
              <div className="eyebrow reveal" style={{ marginBottom: 24 }}>
                How an online lesson runs
              </div>
              <ul className="numbered">
                {HOW.map((h, i) => (
                  <li key={h.t} className="reveal" style={{ '--rd': `${i * 60}ms` }}>
                    <span className="n">{String(i + 1).padStart(2, '0')}</span>
                    <span>
                      <span className="t">{h.t}</span>
                      {h.d}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="eyebrow reveal" style={{ marginBottom: 24 }}>
                What you need
              </div>
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
                bring it and I will help you set it up — but nothing on this page depends on it.
              </p>
              <p className="prose">
                Timezones are the real constraint, not distance. Lessons run early mornings and
                evenings Pacific, which covers most of Europe and Latin America comfortably. The
                scheduler shows times in <strong>your</strong> clock, not mine.
              </p>
            </div>
          </div>
        </section>

        <section id="rates" className="block" style={{ paddingTop: 20, paddingBottom: 40 }}>
          <div className="eyebrow reveal" style={{ marginBottom: 24 }}>
            Online rates
          </div>
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
          <div className="eyebrow reveal" style={{ marginBottom: 30 }}>
            What students say
          </div>
          <div className="press-quotes-grid">
            {TESTIMONIALS.slice(0, 3).map((t, i) => (
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
