import Link from 'next/link';

import { BuyButton, PURCHASE_NOTE, PurchaseScope } from '@/components/coach/Purchase';
import {
  ASSESSMENT,
  IN_PERSON_DAYS,
  LESSONS_PER_MONTH,
  type LessonMode,
  type Price,
  byMode,
  find,
  formatUsd,
  lookup,
  modeLabel,
  monthlyPlans,
  monthlySavingVs,
  pack10,
  packSavingVs,
  perLessonCents,
  priceLabel,
  singleLesson,
} from '@/lib/pricing';

/**
 * The rate card, the buy controls that sit on it, and the two calls to action
 * every coaching page is built out of.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS TIER CARDS AND NOT AN EDITORIAL LEDGER
 * ---------------------------------------------------------------------------
 * This card used to be a ruled rate sheet with a paragraph of reasoning under
 * every row. It matched the rest of the site and it was the wrong trade: the
 * students here are 5 to 70+, most of them arrive on a phone, and a price page
 * has one job — make what you get and what you pay legible in under ten
 * seconds. So this is now the layout everybody already knows from every
 * subscription checkout: a two-option format switch, then one card per
 * purchasable tier, each card carrying a name, a big price, the per-lesson
 * maths, at most one honest saving line, three short bullets and one button.
 *
 * Familiarity is the usability feature. The brand voice lives on the pages
 * around this component, not inside it.
 *
 * ---------------------------------------------------------------------------
 * WHY ALL OF THIS LIVES IN ONE MODULE
 * ---------------------------------------------------------------------------
 * Seven pages show a price. Six offer the free assessment. Four sell a package
 * directly. Splitting the price cards from the offer copy would mean the
 * card-capture sentence gets retyped seven times, and a retyped legal-ish
 * promise drifts. So the copy is a const, the offers are components, and nothing
 * on the site says "we take a card" — or "paid in full now" — in its own words.
 *
 * This is a server component. It reads content/pricing.json through
 * lib/pricing.ts at render time, so the prices are in the static HTML — which is
 * also what lets the JSON-LD Offers and the visible numbers come from one source
 * and therefore agree. Only the buy button itself is a client leaf.
 */

/**
 * NON-NEGOTIABLE COPY. Reproduce verbatim, everywhere the assessment is
 * offered, at reading size.
 *
 * WHY IT IS NOT SOFTENED OR TUCKED AWAY: the assessment is free but a card is
 * held, and a visitor who discovers the card field without warning abandons.
 * Stating it up front costs a small number of clicks and buys back a much
 * larger number of no-shows, because a held card is a commitment. Being coy
 * here converts worse, not better — and it is the sentence a chargeback
 * dispute would be judged on.
 *
 * EQUALLY IMPORTANT, AND EASY TO GET WRONG: this sentence must never appear
 * beside a buy button. There the card IS charged, in full, immediately. Printing
 * "you won't be charged" next to a $700 purchase would be a false statement
 * rather than a reassurance. The purchase side has its own note —
 * PURCHASE_NOTE in components/coach/Purchase.tsx — and the two never mix.
 */
export const ASSESSMENT_CARD_COPY =
  "We take a card to hold your slot. You won't be charged for the assessment.";

/* ------------------------------------------------------------------ */
/* CTA labels — one string per destination                             */
/* ------------------------------------------------------------------ */

/**
 * Three destinations, three labels, and no page writes its own.
 *
 * Every one is short and starts with a verb. Variety in CTA wording reads as
 * variety in the offer: three differently-worded buttons pointing at the same
 * place make a visitor stop and work out which one they want. The same words
 * every time read as one insistent offer, and they are the words a 16-year-old
 * and a 60-year-old both parse without thinking.
 */

/** Scrolls to the tier cards on the current page. */
export const PURCHASE_CTA_LABEL = 'Choose a plan';

/** Goes to /coach/book. */
export const ASSESSMENT_CTA_LABEL = 'Book a free assessment';

/** Goes to /coach/pricing, from a page that only displays prices. */
export const PRICING_CTA_LABEL = 'See pricing';

/**
 * The verb on every tier card's button. ONE verb, repeated four times: the
 * choice a visitor is making is between the cards, not between the buttons, so
 * four differently-labelled buttons would add a second decision to a page whose
 * whole point is making the first one easy.
 */
export const BUY_CTA_LABEL = 'Choose';

/** Where the purchase CTA points: the tier cards on the current page. */
export const RATES_ANCHOR = '#rates';

/* ------------------------------------------------------------------ */
/* Tier cards                                                          */
/* ------------------------------------------------------------------ */

type PriceGridProps = {
  /** Extra note under the cards — e.g. the in-person scheduling constraint. */
  footnote?: React.ReactNode;
  mode: LessonMode;
  /**
   * Render a buy control on every card. Default true.
   *
   * Set false only on pages where the primary action is deliberately something
   * else — the paid-search landing pages, where a stranger converts far better
   * on a free session than on $360 and a row of buy buttons would be a second
   * competing CTA. When it is false a `purchaseHref` is REQUIRED, so a price can
   * be displayed without being buyable *here* but never without being buyable
   * anywhere.
   */
  buy?: boolean;
  /** Where these prices are purchasable, when this grid is display-only. */
  purchaseHref?: string;
};

/**
 * One mode's prices as a row of tier cards.
 *
 * ---------------------------------------------------------------------------
 * THE MONTHLY PLAN AND THE SINGLE LESSON ARE ALWAYS SHOWN TOGETHER, SIDE BY SIDE
 * ---------------------------------------------------------------------------
 * There is deliberately no prop to render one without the other, and the order
 * is asserted below rather than merely intended. The single lesson sits ~18%
 * above the monthly per-lesson rate, and that gap is the entire argument for
 * committing to a plan; a page showing only "$85 a lesson" reads as expensive
 * with no answer, and a page showing only "$280/month" reads as a subscription
 * with nothing to compare it to. Both, adjacent, or neither.
 *
 * Every claim on a card is computed, never written into copy, so a price edit
 * cannot leave a stale "save 19%" behind:
 *
 *   monthlySavingVs()  the "% cheaper than single lessons" line. Returns null
 *                      for 30-minute plans, because the rate card has no
 *                      30-minute single lesson to compare against, and then NO
 *                      saving line is rendered at all. Comparing a half-length
 *                      plan to the 60-minute single would print "50% cheaper"
 *                      for half a lesson.
 *   packSavingVs()     the "nearly 2 lessons free" line. The whole-number claim
 *                      is gated on wholeLessonsFree, so the page can only ever
 *                      round DOWN — see freeLessonsPhrase.
 *   perLessonCents()   the per-lesson rate on every card, which is the only fair
 *                      way to compare tiers of different sizes and is the column
 *                      the eye actually scans.
 */
export function PriceGrid({ mode, footnote, buy = true, purchaseHref }: PriceGridProps) {
  const plans = monthlyPlans(mode);
  const single = singleLesson(mode);
  const pack = pack10(mode);

  // Guard, not a fallback. If the rate card ever loses its single-lesson price
  // this component cannot keep its promise, and rendering a lone monthly price
  // is exactly the failure the promise exists to prevent.
  if (!single) {
    throw new Error(
      `PriceGrid: no single lesson price for mode "${mode}". The monthly plan is only ` +
        'ever shown next to the single-lesson price it saves against, so this component ' +
        'cannot render without it. Restore the single lesson in content/pricing.json.',
    );
  }
  if (plans.length === 0) {
    throw new Error(`PriceGrid: mode "${mode}" has no monthly plan. See content/pricing.json.`);
  }

  /*
   * A displayed price must be a buyable price.
   *
   * The failure this prevents: someone adds a tier, renders it for the display
   * value, and it sells nothing for a quarter because no control was ever wired
   * to it. Either every card carries a buy control, or the grid names the page
   * where they do. There is no third option and no silent default.
   */
  if (!buy && !purchaseHref) {
    throw new Error(
      `PriceGrid: mode "${mode}" is rendered with buy={false} and no purchaseHref. ` +
        'A price shown without a way to pay for it is a dead price. Pass a ' +
        'purchaseHref pointing at the page where these tiers are purchasable ' +
        '(normally "/coach/pricing"), or leave buy on.',
    );
  }

  // Cheapest commitment first, biggest last, which puts the single lesson and
  // the full-length monthly plan next to each other. See the adjacency
  // assertion below — that neighbouring is the point, not a side effect.
  const cards: Price[] = [single, ...plans, pack];

  // A price added to the rate card must appear on the page. Without this a new
  // tier could be created in Stripe by the bootstrap script and silently never
  // be sold, which is the sort of bug nobody notices for a quarter.
  const missing = byMode(mode).filter((p) => !cards.some((r) => r.lookupKey === p.lookupKey));
  if (missing.length > 0) {
    throw new Error(
      `PriceGrid: ${missing.map((p) => p.lookupKey).join(', ')} exist in content/pricing.json ` +
        'for this mode but are not rendered. Add a card here (or remove the price).',
    );
  }

  /*
   * ADJACENCY, ASSERTED.
   *
   * The reason to commit is visible only when the two prices can be compared in
   * one glance, so the single lesson and the monthly plan of the SAME LENGTH
   * must be neighbours in the grid. Reordering the array above — putting the
   * pack second because it is the biggest sale, say — would separate them and
   * quietly remove the argument. This throws instead.
   */
  const singleIndex = cards.findIndex((p) => p.lookupKey === single.lookupKey);
  const samePlan = find(mode, 'monthly', single.duration);
  const planIndex = samePlan ? cards.findIndex((p) => p.lookupKey === samePlan.lookupKey) : -1;
  if (planIndex < 0 || Math.abs(planIndex - singleIndex) !== 1) {
    throw new Error(
      `PriceGrid: the ${single.duration}-minute single lesson and the ${single.duration}-minute ` +
        'monthly plan are not adjacent in the card order. The single lesson is deliberately ' +
        'priced above the monthly per-lesson rate and that gap is the reason to commit, ' +
        'which only reads if the two prices sit next to each other. Restore the order: ' +
        'single, monthly, (short monthly), pack.',
    );
  }

  // Every card must resolve against the rate card by lookup key, because that
  // key is the only thing the buy button sends and the server validates.
  // lookup() throws on a miss, so a card whose key the checkout endpoint could
  // not resolve fails the build here instead of failing in front of a customer.
  for (const card of cards) lookup(card.lookupKey);
  // And every card must have a name and bullets. Both switches are exhaustive
  // over LessonType, so adding a tier type without deciding how it is described
  // is a compile-and-build error rather than a blank card.
  for (const card of cards) {
    tierName(card);
    tierPoints(card);
  }

  /*
   * The one recommended tier, computed rather than asserted.
   *
   * "Best value per lesson" is arithmetic the reader can check against two
   * numbers on the same card, which is why it can be stated as fact — unlike
   * "most popular", which nobody here has the data for and which is therefore
   * not on this page in any form.
   *
   * Restricted to 60-minute tiers on purpose: the 30-minute plan is the cheapest
   * per lesson on the card, and flagging it would be true only if you did not
   * care how long a lesson lasted.
   *
   * TIE-BREAK: the pack and the plan land at the same per-lesson rate in both
   * modes, so the cheapest UP-FRONT of the tied tiers wins. That is still a
   * fact — among equals on the rate the reader is comparing, this one is the
   * smallest amount of money to hand over — and it means exactly one card
   * carries the label, which is what makes a recommendation useful.
   */
  const fullHour = cards.filter((p) => p.duration === 60);
  const bestPerLesson = Math.min(...fullHour.map(perLessonCents));
  const recommended = fullHour
    .filter((p) => perLessonCents(p) === bestPerLesson)
    .sort((a, b) => a.amountCents - b.amountCents)[0];
  if (!recommended) {
    throw new Error(
      `PriceGrid: mode "${mode}" has no 60-minute tier, so no tier can be recommended. ` +
        'See content/pricing.json.',
    );
  }

  const grid = (
    <div className="tiers">
      {cards.map((price) => {
        const isBest = price.lookupKey === recommended.lookupKey;
        const saving = savingLine(price);

        return (
          <article
            key={price.lookupKey}
            className={`tier${isBest ? ' is-best' : ''}`}
            aria-labelledby={`tier-${price.lookupKey}`}
          >
            {/* Plain words, not a coloured ribbon. The label says what it means,
                so it survives being read in greyscale or aloud. The element is
                always present, and empty on the other cards, so every tier name
                sits on the same line and the four prices stay comparable at a
                glance; an empty element is skipped by assistive tech. */}
            <p className="tier-flag" aria-hidden={isBest ? undefined : true}>
              {isBest ? 'Best value per lesson' : ''}
            </p>

            <h3 className="tier-name" id={`tier-${price.lookupKey}`}>
              {tierName(price)}
            </h3>

            <p className="tier-price">
              <span className="tier-amount">{formatUsd(price.amountCents)}</span>
              {price.interval && <span className="tier-per">/month</span>}
            </p>

            <p className="tier-math">{formatUsd(perLessonCents(price))} per lesson</p>

            {/* Absent, not empty, when there is nothing honest to claim. */}
            {saving && <p className="tier-save">{saving}</p>}

            <ul className="tier-points">
              {tierPoints(price).map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>

            {buy ? (
              <BuyButton
                lookupKey={price.lookupKey}
                label={BUY_CTA_LABEL}
                /* Four buttons reading "Choose" need to be distinguishable out
                   of context, which is how a screen reader reads them. */
                ariaLabel={`${BUY_CTA_LABEL} ${tierName(price)}`}
                variant={isBest ? 'solid' : 'outline'}
              />
            ) : (
              <Link className="btn tier-btn" href={purchaseHref as string}>
                {PRICING_CTA_LABEL}
              </Link>
            )}
          </article>
        );
      })}
    </div>
  );

  return (
    <div className="tiers-wrap">
      {/* PurchaseScope owns the under-18 guardian question for the whole grid,
          so it is asked once rather than once per button. */}
      {buy ? <PurchaseScope>{grid}</PurchaseScope> : grid}

      {/* True only where a card is charged. The assessment's "you won't be
          charged" promise must never appear here — see ASSESSMENT_CARD_COPY. */}
      {buy && <p className="tier-note">{PURCHASE_NOTE}</p>}

      <p className="tier-foot">
        A monthly plan is {LESSONS_PER_MONTH} lessons a month. Cancel any time. All prices in US
        dollars.
        {footnote ? <> {footnote}</> : null}
      </p>
    </div>
  );
}

/**
 * The tier name in the words a stranger would use.
 *
 * Built from the price data rather than read out of content/pricing.json: the
 * catalogue names are receipt names ("Online Lessons · Monthly, 30 min") and
 * have to stay that way, because Stripe prints the PRODUCT name on an invoice
 * and a student needs to recognise what they bought. On the page the same tier
 * wants "Monthly — 4 short lessons". Exhaustive over LessonType by
 * construction, so a new tier type cannot reach a card unnamed.
 */
function tierName(price: Price): string {
  switch (price.type) {
    case 'single':
      return 'One lesson';
    case 'monthly':
      // "short" rather than "30 min" in the name, with the exact length in the
      // bullets underneath. The distinction a reader needs first is which of
      // the two monthly plans is the small one.
      return price.duration === 60
        ? `Monthly — ${price.lessons} lessons`
        : `Monthly — ${price.lessons} short lessons`;
    case 'pack':
      return `${price.lessons}-lesson pack`;
    default: {
      const unhandled: never = price.type;
      throw new Error(
        `PriceGrid: no tier name for price type "${String(unhandled)}" ` +
          `(${(price as Price).lookupKey}). Every displayed tier needs a plain-words name.`,
      );
    }
  }
}

/**
 * Three bullets per card, six words or fewer each. Not sentences.
 *
 * Deliberately NOT the `blurb` from content/pricing.json: those are sentences,
 * and a card that has to be read is a card that gets skipped.
 *
 * "Your slot is held" rather than "a lesson every week": a plan bills
 * LESSONS_PER_MONTH lessons a month, and a month with five of your weekday
 * still bills four. Promising a weekly lesson in a bullet is how the fifth
 * Tuesday becomes an argument with a paying student.
 */
function tierPoints(price: Price): string[] {
  switch (price.type) {
    case 'single':
      return [`${price.duration} minutes, one to one`, 'Pay once', 'No plan to cancel'];
    case 'monthly':
      return [`${price.duration} minutes each`, 'Your slot is held', 'Cancel any time'];
    case 'pack':
      return [`${price.duration} minutes each`, 'Use at your own pace', 'One payment, no renewal'];
    default: {
      const unhandled: never = price.type;
      throw new Error(
        `PriceGrid: no bullets for price type "${String(unhandled)}" ` +
          `(${(price as Price).lookupKey}). Every displayed tier needs 2–4 short bullets.`,
      );
    }
  }
}

/**
 * The one saving line a card is allowed, or null.
 *
 * ONE LINE, OR NOTHING. Both branches can return null and both returns are
 * load-bearing:
 *
 *   30-minute monthly plans — monthlySavingVs() returns null because the rate
 *   card has no 30-minute single lesson. Rendering the 60-minute comparison
 *   there would print "50% cheaper" for a lesson that is half as long, which is
 *   false on the one page that has to be literally true.
 *
 *   The single lesson — it is the thing the others are measured against, so it
 *   has nothing to save against and claims nothing.
 */
function savingLine(price: Price): string | null {
  if (price.type === 'monthly') {
    const saving = monthlySavingVs(price);
    if (!saving) return null;
    return `${saving.savingPercent}% cheaper than single lessons`;
  }

  if (price.type === 'pack') {
    const saving = packSavingVs(price);
    return saving ? freeLessonsPhrase(saving) : null;
  }

  return null;
}

/**
 * "Nearly 2 lessons free" / "1 lesson free" / nothing.
 *
 * THE ROUNDING RULE, WHICH IS THE WHOLE POINT OF THIS FUNCTION: a bare whole
 * number is only ever claimed when wholeLessonsFree supports it, and the word
 * "nearly" is only used when the decimal is within 0.3 of the next whole lesson.
 * 1.8 → "Nearly 2", 1.4 → "1", 0.6 → nothing at all. The page cannot round up,
 * and cannot say "2 free" for anything under 2, no matter how the prices are
 * edited later.
 */
function freeLessonsPhrase(saving: NonNullable<ReturnType<typeof packSavingVs>>): string | null {
  const whole = saving.wholeLessonsFree;
  const next = whole + 1;

  if (saving.lessonsFree >= next - 0.3) {
    return `Nearly ${next} lessons free`;
  }
  if (whole >= 1) {
    return `${whole} lesson${whole > 1 ? 's' : ''} free`;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* The three questions people actually ask before paying               */
/* ------------------------------------------------------------------ */

/**
 * One short strip, three questions, one sentence each.
 *
 * These are the objections that stop a purchase — what happens if I miss one,
 * can I get out of it, do I have to pay now — and answering them within a
 * thumb's reach of the button is worth more than nine FAQs one page away.
 *
 * Mounted ONCE per page, outside any ModeToggle: the answers are the same for
 * both delivery modes, so putting them inside the toggle would ship the same
 * three sentences twice.
 */
export function PurchaseFacts() {
  return (
    <dl className="facts">
      <div className="fact">
        <dt>What if I miss a lesson?</dt>
        <dd>Tell me 24 hours ahead and we move it, at no cost.</dd>
      </div>
      <div className="fact">
        <dt>Can I cancel?</dt>
        <dd>Yes — cancel a monthly plan any time from your billing page.</dd>
      </div>
      <div className="fact">
        <dt>Do I pay upfront?</dt>
        <dd>Yes. You pay in full, then choose your lesson times.</dd>
      </div>
    </dl>
  );
}

/* ------------------------------------------------------------------ */
/* Calls to action                                                     */
/* ------------------------------------------------------------------ */

/**
 * The purchase CTA, as a link to the tier cards on the same page.
 *
 * ONE definition, used above the fold and at the end, so the two appearances
 * cannot drift apart in label or destination. It scrolls rather than navigates
 * because the decision is made on the cards, and sending someone to a second
 * page to make it adds a load and a bounce.
 */
export function PurchaseCtaLink({
  href = RATES_ANCHOR,
  className = 'btn btn--solid',
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link className={className} href={href}>
      {PURCHASE_CTA_LABEL}{' '}
      <span className="arrow" aria-hidden="true">
        &darr;
      </span>
    </Link>
  );
}

/**
 * The end-of-page purchase block. Same label, same destination, second time.
 *
 * The card-hold sentence is deliberately absent: this block sells a package,
 * where the card is charged in full. PURCHASE_NOTE is the true statement here.
 */
export function PurchaseCta({
  href = RATES_ANCHOR,
  headline,
}: {
  href?: string;
  headline?: React.ReactNode;
}) {
  return (
    <section className="purchase-cta">
      <h2 className="purchase-cta-headline">{headline ?? 'Pick a plan and start.'}</h2>
      <p className="purchase-cta-note">{PURCHASE_NOTE}</p>
      <div className="purchase-cta-actions">
        <PurchaseCtaLink href={href} />
      </div>
    </section>
  );
}

/**
 * The quieter of the two paths, wherever the other one is primary.
 *
 * `tone="secondary"` is the version that sits under the tier cards: an aside,
 * ruled off, obviously the smaller of the two offers. `tone="primary"` is the
 * compact mid-page repeat on the landing pages, where the assessment IS the
 * primary action.
 *
 * ASSESSMENT_CARD_COPY appears in BOTH, at reading size, because it is a
 * condition of the offer rather than a disclaimer about it. There is no variant
 * of this component that offers the assessment without stating it.
 */
export function AssessmentCta({
  mode,
  href = '/coach/book',
  tone = 'secondary',
}: {
  mode?: LessonMode;
  href?: string;
  tone?: 'primary' | 'secondary';
}) {
  if (tone === 'primary') {
    return (
      <div className="assess-cta-block">
        <div className="eyebrow">
          No charge &middot; {ASSESSMENT.durationMinutes} minutes &middot;{' '}
          {mode ? modeLabel(mode) : 'Online or in-person in Los Angeles'}
        </div>
        <strong className="assess-card-note">{ASSESSMENT_CARD_COPY}</strong>
        <div style={{ marginTop: 22 }}>
          <Link className="btn btn--solid" href={href}>
            {ASSESSMENT_CTA_LABEL}{' '}
            <span className="arrow" aria-hidden="true">
              &rarr;
            </span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <aside className="alt-path">
      <p className="alt-path-lede">
        Not ready to pay? Start with a free {ASSESSMENT.durationMinutes}-minute assessment instead.
      </p>
      <strong className="alt-path-note">{ASSESSMENT_CARD_COPY}</strong>
      <Link className="btn" href={href}>
        {ASSESSMENT_CTA_LABEL}
      </Link>
    </aside>
  );
}

/**
 * The mirror image: the secondary path on a page whose primary action is the
 * free assessment. Used on the paid-search landing pages, where a stranger
 * converts far better on a free session than on $360 — but the minority who
 * already know what they want should not have to sit through one.
 *
 * No card copy here on purpose: this block offers a purchase, and on a purchase
 * the card is charged.
 */
export function PackagesAside({ href = '/coach/pricing' }: { href?: string }) {
  return (
    <aside className="alt-path">
      <p className="alt-path-lede">
        Already know what you want? Every price is on one page, and you can buy now.
      </p>
      <Link className="btn" href={href}>
        {PRICING_CTA_LABEL}
      </Link>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/* Free assessment — the full block                                    */
/* ------------------------------------------------------------------ */

type AssessmentOfferProps = {
  /** Shown in the steps when the page is about one delivery mode. */
  mode?: LessonMode;
  href?: string;
  /** Overrides the headline where a page needs its own angle. */
  headline?: React.ReactNode;
  /** Rendered under the button — normally the secondary purchase path. */
  children?: React.ReactNode;
};

/**
 * The offer block. Every page whose PRIMARY action is the free assessment ends
 * on this — which now means the three paid-search landing pages, and not the
 * pricing or lesson pages, where a package purchase is primary and this block
 * would out-shout it.
 *
 * The visual anchor is a vocal-range bar rather than a "FREE" badge, because
 * what the 30 minutes actually produces is a map of where the voice sits and
 * what is holding it back. A badge says "discount"; the bar says what happens.
 * It is decorative and aria-hidden — it asserts no measurement about anyone.
 */
export function AssessmentOffer({ mode, href = '/coach/book', headline, children }: AssessmentOfferProps) {
  return (
    <section className="assess">
      <div className="eyebrow">
        No charge &middot; {ASSESSMENT.durationMinutes} minutes &middot;{' '}
        {mode ? modeLabel(mode) : 'Online or in-person in Los Angeles'}
      </div>

      <h2 className="assess-headline">
        {headline ?? (
          <>
            Start with a free {ASSESSMENT.durationMinutes}-minute <span className="it">vocal</span>{' '}
            assessment.
          </>
        )}
      </h2>

      <p className="assess-lede">
        Not a sales call. You sing, I listen, and we work out what is actually in the way — usually
        breath, usually tension. You leave with two exercises and a straight answer about what a few
        months of work would change.
      </p>

      {/* Illustrative only. No claim is made about any particular voice. */}
      <div className="range-bar" aria-hidden="true">
        <div className="range-track">
          <div className="range-fill" />
        </div>
        <div className="range-ticks">
          <span>E2</span>
          <span>C3</span>
          <span>C4</span>
          <span>C5</span>
          <span>C6</span>
        </div>
        <div className="range-caption">Where your voice sits &middot; where it could</div>
      </div>

      <ol className="assess-steps">
        <li>
          <span className="n">01</span>
          <span>
            Pick online or in-person, tell me what you want to sing, and choose a time that works in
            your timezone.
          </span>
        </li>
        <li>
          <span className="n">02</span>
          <span>
            {ASSESSMENT.durationMinutes} minutes together: warm-up, range, one song you care about,
            and an honest read on what is holding the sound back.
          </span>
        </li>
        <li>
          <span className="n">03</span>
          <span>
            If it feels right, we start weekly lessons. If it does not, you keep the exercises and
            owe nothing.
          </span>
        </li>
      </ol>

      {/* Constraint: this sentence appears wherever the assessment is offered,
          at reading size, above the button rather than under it. */}
      <strong className="assess-card-note">{ASSESSMENT_CARD_COPY}</strong>

      <div className="assess-cta">
        <Link className="btn btn--solid" href={href}>
          {ASSESSMENT_CTA_LABEL}{' '}
          <span className="arrow" aria-hidden="true">
            &rarr;
          </span>
        </Link>
      </div>

      {children}
    </section>
  );
}

/**
 * The in-person scheduling sentence, in one place because it appears on the
 * in-person page, the pricing page and the LA landing page, and it must always
 * name the same two days as Cal.com's availability.
 */
export const IN_PERSON_DAYS_SENTENCE = `In-person lessons run on ${IN_PERSON_DAYS.join(
  's and ',
)}s.`;

/** "$85" / "$280/mo" for a mode's headline price, for use in ad-facing copy. */
export const singleLessonLabel = (mode: LessonMode) => {
  const price = singleLesson(mode);
  return price ? priceLabel(price) : '';
};
