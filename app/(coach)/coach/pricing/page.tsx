import type { Metadata } from 'next';
import Link from 'next/link';

import { JsonLd } from '@/components/JsonLd';
import { Reveal } from '@/components/Reveal';
import { ModeToggle } from '@/components/coach/ModeToggle';
import {
  AssessmentCta,
  IN_PERSON_DAYS_SENTENCE,
  PriceGrid,
  PurchaseCta,
  PurchaseCtaLink,
  PurchaseFacts,
} from '@/components/coach/PriceGrid';
import { PURCHASE_NOTE } from '@/components/coach/Purchase';
import { formatUsd, monthlyPlans, monthlySavingVs } from '@/lib/pricing';
import { assessmentOfferSchema, pricingOfferCatalogSchema } from '@/lib/schema';
import { breadcrumbList, pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta({
  title: 'Lesson Prices — Voice, Guitar, Piano & Songwriting in Los Angeles',
  description:
    'Clear prices for one-to-one music lessons online and in person in Los Angeles: single lessons, monthly plans and 10-lesson packs, from $70 a lesson on a monthly plan. Buy a package and choose your times, or start with a free 30-minute vocal assessment. Cancel any time.',
  path: '/coach/pricing',
});

/**
 * The price page, deliberately the plainest page on the site.
 *
 * ---------------------------------------------------------------------------
 * WHAT WAS CUT FROM THIS FILE, AND WHY IT SHOULD NOT COME BACK
 * ---------------------------------------------------------------------------
 * This page used to carry a "how the money works" column of four paragraphs, a
 * nine-question accordion, and a lede that explained the pricing strategy in
 * prose. All of it was accurate and none of it was read. Students here are 5 to
 * 70+ and most arrive on a phone; the job of this page is to make what you get
 * and what you pay obvious in under ten seconds, and every extra sentence works
 * against that.
 *
 * So: one sentence of intro, the tier cards, the three questions that actually
 * stop a purchase, a short list of what a lesson includes, and one repeat of the
 * CTA. Everything else lives on /coach/faq. The editorial voice stays in the
 * heading and the nav; it does not get between a reader and a number.
 */
export default function PricingPage() {
  /*
   * Computed, so the sentence below can never contradict the cards under it.
   * The figure is the full-length (60-minute) online plan rate rather than the
   * cheapest tier: quoting the 30-minute rate as the headline price would be
   * technically true and practically misleading, since almost nobody buys
   * half-length lessons.
   */
  const anchor = monthlySavingVs(monthlyPlans('online')[0]);

  return (
    /* page-plain opts this page into the darker eyebrow colour — see the
       contrast note in app/styles.css. This is the page where a 3.9:1 label is
       not good enough. */
    <div className="page-fade page-plain">
      <Reveal />
      <div className="wrap">
        <section className="svc-page-hero">
          <div className="eyebrow">Prices &middot; online &amp; in person in Los Angeles</div>
          <h1>
            What lessons <span className="it">cost.</span>
          </h1>
          <p className="lede-plain">
            {anchor
              ? `Single lessons from ${formatUsd(
                  anchor.single.amountCents,
                )}, or ${formatUsd(anchor.planPerLesson)} a lesson on a monthly plan.`
              : 'Every price is on this page.'}{' '}
            Pick a plan below and choose your lesson times straight after paying.
          </p>
          <div style={{ marginTop: 30 }}>
            <PurchaseCtaLink />
          </div>
          <p className="lp-hero-note">{PURCHASE_NOTE}</p>
        </section>

        {/* The tier cards, and the destination of every purchase CTA on the page.
            Each card carries its own buy control — see PriceGrid's guards, which
            fail the build rather than render a price nobody can pay for. */}
        <section id="rates" className="block" style={{ paddingTop: 20, paddingBottom: 40 }}>
          <ModeToggle
            online={<PriceGrid mode="online" />}
            inperson={<PriceGrid mode="inperson" footnote={<>{IN_PERSON_DAYS_SENTENCE}</>} />}
            label="Lesson format"
          />

          {/* Mounted once, outside the toggle: the three answers are the same for
              both delivery modes. */}
          <PurchaseFacts />

          {/* SECONDARY, and deliberately quieter: the other path, for the visitor
              who is not ready to choose. It carries ASSESSMENT_CARD_COPY because
              it offers the assessment; the buy buttons above must never carry it,
              because there the card is charged. */}
          <AssessmentCta tone="secondary" />
        </section>

        {/*
          Short phrases, not sentences. This block earned its place because "what
          do I actually get for $70" is a fair question and the cards cannot hold
          the answer — but it was six items of two sentences each, which is a
          page of reading on a page of prices.
        */}
        <section className="block" style={{ paddingTop: 20, paddingBottom: 40 }}>
          <div className="eyebrow reveal" style={{ marginBottom: 18 }}>
            Every lesson includes
          </div>
          <ul className="plain-points">
            <li>A held slot on a plan</li>
            <li>Live guitar or piano, not a backing track</li>
            <li>A recording of your own exercises</li>
            <li>Written notes to work from</li>
            <li>English or Spanish</li>
            <li>Voice, guitar, piano or songwriting</li>
          </ul>
          <p className="lede-plain" style={{ marginTop: 24 }}>
            Anything else is on the{' '}
            <Link href="/coach/faq" style={{ color: 'var(--accent)' }}>
              FAQ
            </Link>
            , and you can{' '}
            <Link href="/coach/account" style={{ color: 'var(--accent)' }}>
              manage billing
            </Link>{' '}
            yourself at any time.
          </p>
        </section>

        {/* Second and last appearance of the primary CTA. The full
            AssessmentOffer block deliberately does NOT close this page: it is the
            biggest, loudest block in the design language, and ending a price page
            on it would make the free session look like the offer and the plans
            look like the small print. It closes the landing pages instead, where
            the assessment genuinely is primary. */}
        <div className="block" style={{ paddingTop: 20, paddingBottom: 60 }}>
          <PurchaseCta />
        </div>
      </div>

      <JsonLd
        data={[
          pricingOfferCatalogSchema(),
          assessmentOfferSchema(),
          breadcrumbList([
            { name: 'Home', path: '/' },
            { name: 'Coaching', path: '/coach' },
            { name: 'Prices', path: '/coach/pricing' },
          ]),
        ]}
      />
    </div>
  );
}
