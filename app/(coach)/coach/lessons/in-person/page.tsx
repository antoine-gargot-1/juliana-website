import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { JsonLd } from '@/components/JsonLd';
import { Reveal } from '@/components/Reveal';
import {
  AssessmentCta,
  IN_PERSON_DAYS_SENTENCE,
  PriceGrid,
  PurchaseCta,
  PurchaseCtaLink,
  PurchaseFacts,
  RiskReversal,
} from '@/components/coach/PriceGrid';
import { PURCHASE_NOTE } from '@/components/coach/Purchase';
import { TestimonialCarousel } from '@/components/coach/TestimonialCarousel';
import { TESTIMONIALS } from '@/lib/content';
import { IN_PERSON_DAYS, formatUsd, singleLesson } from '@/lib/pricing';
import { assessmentOfferSchema, lessonsServiceSchema, localBusinessSchema } from '@/lib/schema';
import { breadcrumbList, pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta({
  title: 'In-Person Music Lessons in Los Angeles — Voice, Guitar, Piano & Songwriting',
  description:
    'One-to-one in-person voice, guitar, piano and songwriting lessons in Los Angeles with Colombian singer-songwriter Juliana Beltran. Tuesdays and Thursdays, English or Spanish, ages 5 to 70+. Free 30-minute vocal assessment.',
  path: '/coach/lessons/in-person',
});

/**
 * NO PREMISES — read before editing a word of this page.
 *
 * In-person lessons happen in a private residence. There is no teaching studio,
 * no commercial space and nothing to visit, so this page must never imply one:
 * no address, no neighbourhood, no cross-streets, no travel times, no parking
 * notes, no opening hours. The only permitted reference to location is that the
 * exact address is sent privately once a lesson is confirmed.
 *
 * That is not squeamishness. Advertising a residence as a venue invites walk-in
 * visitors to someone's home, and listing one as a storefront is how a Google
 * Business Profile gets suspended. `areaServed` in the JSON-LD carries the local
 * signal instead, which is what it is for.
 */
const WHY_IN_PERSON = [
  {
    t: 'Physical feedback',
    d: 'Breath support is easier to teach with a hand on a ribcage than through a screen. Jaw tension, shoulder position, where the weight sits in your feet — all of it is quicker to fix in the same room.',
  },
  {
    t: 'Real acoustics',
    d: 'Singing into a space rather than into a microphone changes what you hear yourself doing, and that feedback loop is most of what technique is.',
  },
  {
    t: 'Piano and guitar under your hands',
    d: 'Sitting at the instrument together, rather than watching a camera angle of it.',
  },
  {
    t: 'Performance rehearsal',
    d: 'Auditions, showcases, first gigs. Standing up and delivering to a person two metres away is a different skill from delivering to a laptop, and it’s the one the audition tests.',
  },
];

export default function InPersonLessonsPage() {
  const single = singleLesson('inperson');

  return (
    <div className="page-fade">
      <Reveal />
      <div className="wrap">
        <section className="svc-page-hero">
          <div className="eyebrow">In-person &middot; Los Angeles</div>
          <h1>
            In-person lessons in <span className="it">Los Angeles.</span>
          </h1>
          <p className="prose" style={{ fontSize: 20, marginTop: 24, maxWidth: 700 }}>
            One-to-one voice, guitar, piano and songwriting lessons in person, in Los Angeles, in
            English or Spanish. {IN_PERSON_DAYS_SENTENCE} I send you the exact address privately once
            your lesson is confirmed.
          </p>
          {/* PRIMARY: buy a package. In-person is the higher-LTV tier and the one
              with genuinely limited supply — two days a week — so the visitor who
              is ready should be able to take a slot rather than queue for a free
              session first. The assessment stays as the quieter second path. */}
          <div style={{ marginTop: 32, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <PurchaseCtaLink />
            <Link className="btn btn--ghost" href="/coach/lessons/online">
              Or lessons online
            </Link>
          </div>
          <p className="lp-hero-note">{PURCHASE_NOTE}</p>
          <RiskReversal />
        </section>

        <section className="block" style={{ paddingTop: 20, paddingBottom: 40 }}>
          <div className="split">
            <div>
              <div className="eyebrow reveal" style={{ marginBottom: 24 }}>
                Why in person, if online works
              </div>
              <ul className="numbered">
                {WHY_IN_PERSON.map((w, i) => (
                  <li key={w.t} className="reveal" style={{ '--rd': `${i * 60}ms` }}>
                    <span className="n">{String(i + 1).padStart(2, '0')}</span>
                    <span>
                      <span className="t">{w.t}</span>
                      {w.d}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="prose" style={{ marginTop: 26 }}>
                Plenty of students mix the two: in person when it matters, online when the week is
                difficult. The plans are per mode, and I&rsquo;ll move you between them without fuss
                rather than letting a bad week become a missed month.
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
        </section>

        <section className="block" style={{ paddingTop: 20, paddingBottom: 40 }}>
          <div className="split">
            <div>
              <div className="eyebrow reveal" style={{ marginBottom: 24 }}>
                Days and scheduling
              </div>
              <p className="prose">
                In-person lessons run on <strong>{IN_PERSON_DAYS.join('s and ')}s</strong>. Keeping
                them on two fixed days means consecutive slots and a predictable week, which is what
                makes it possible to hold your time for you for months at a stretch rather than
                rebooking it every week.
              </p>
              <p className="prose">
                If neither day works, take the same lessons online — the teaching is identical, and
                the rate is lower. Everything else about how a lesson runs is on the{' '}
                <Link href="/coach/lessons/online" style={{ color: 'var(--accent)' }}>
                  online lessons page
                </Link>
                .
              </p>
            </div>
            <div>
              <div className="eyebrow reveal" style={{ marginBottom: 24 }}>
                Practical details
              </div>
              <ul className="numbered">
                <li>
                  <span className="n">01</span>
                  <span>
                    <span className="t">Where</span>
                    Los Angeles. The exact address is shared privately once your lesson is confirmed
                    — it&rsquo;s a private space, not a walk-in one.
                  </span>
                </li>
                <li>
                  <span className="n">02</span>
                  <span>
                    <span className="t">Under 18</span>
                    A parent or guardian books, is on the confirmation, and is welcome to sit in for
                    the whole lesson.
                  </span>
                </li>
                <li>
                  <span className="n">03</span>
                  <span>
                    <span className="t">Rescheduling</span>
                    24 hours&rsquo; notice moves a lesson at no cost. Illness is illness — tell me and
                    we&rsquo;ll sort it out.
                  </span>
                </li>
                <li>
                  <span className="n">04</span>
                  <span>
                    <span className="t">Languages</span>
                    English or Spanish, switching mid-sentence if that is how you think.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* The rate card gets the full page width rather than half of a split.
            Four tier cards in a 560px column stack two-by-two, and comparing
            four prices in two rows is measurably harder than comparing them in
            one — on the page whose only job is that comparison. */}
        <section id="rates" className="block" style={{ paddingTop: 20, paddingBottom: 40 }}>
          <div className="eyebrow reveal" style={{ marginBottom: 20 }}>
            In-person rates
          </div>
          <PriceGrid mode="inperson" footnote={<>{IN_PERSON_DAYS_SENTENCE}</>} />
          <PurchaseFacts />
          <p className="lede-plain" style={{ marginTop: 26 }}>
            In-person costs more than online
            {single
              ? ` — ${formatUsd(single.amountCents)} against ${formatUsd(
                  singleLesson('online')?.amountCents ?? 0,
                )} for one lesson`
              : ''}
            . If that&rsquo;s the deciding factor, start online.
          </p>
          <AssessmentCta mode="inperson" tone="secondary" />
        </section>

        <section className="block" style={{ paddingTop: 20, paddingBottom: 40 }}>
          <div className="eyebrow reveal" style={{ marginBottom: 30 }}>
            What students say
          </div>
          {/* ALL FIVE, with the aggregate line the component renders for itself.
              lessonsServiceSchema('inperson') attaches aggregateRating with
              reviewCount 5 to this page, and three quotes with no rating meant
              the markup claimed a number the reader could not see. The
              component computes its line over the reviews actually passed to
              it, so the visible count and reviewCount cannot drift. Do not add
              a second aggregate sentence beside it. */}
          <TestimonialCarousel testimonials={TESTIMONIALS} />
        </section>

        <div className="block" style={{ paddingTop: 0, paddingBottom: 60 }}>
          <PurchaseCta
            headline={
              /* The days come from IN_PERSON_DAYS, like every other mention of
                 them on the site, so the headline cannot outlive a change to
                 Cal.com's in-person availability. */
              <>
                Take a <span className="it">{IN_PERSON_DAYS.join(' or a ')}.</span>
              </>
            }
          />
          <AssessmentCta mode="inperson" tone="secondary" />
        </div>
      </div>

      <JsonLd
        data={[
          localBusinessSchema(),
          lessonsServiceSchema('inperson'),
          assessmentOfferSchema(),
          breadcrumbList([
            { name: 'Home', path: '/' },
            { name: 'Coaching', path: '/coach' },
            { name: 'In-Person Lessons in Los Angeles', path: '/coach/lessons/in-person' },
          ]),
        ]}
      />
    </div>
  );
}
