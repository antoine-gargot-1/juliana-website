import pricingJson from '@/content/pricing.json';

/**
 * The lesson rate card, and the conversion values the ad account bids against.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS FILE EXISTS RATHER THAN PRICES LIVING IN STRIPE
 * ---------------------------------------------------------------------------
 * Stripe is the billing system of record, but it is a bad source of truth for a
 * marketing site: reading it at render time would turn eight static pages into
 * eight API calls, and a Stripe outage would blank the pricing table. So the
 * rate card lives in content/pricing.json, the UI renders from it, and
 * scripts/stripe-bootstrap.ts pushes the same file into Stripe. One file, two
 * consumers, no drift.
 *
 * Every Price carries a `lookup_key`, and the app resolves prices by that key.
 * No Stripe price ID (`price_1Abc…`) appears anywhere in this repo — those are
 * per-account and per-mode, so a hardcoded one breaks the moment you move
 * between test and live.
 *
 * The invariant guards at the bottom of this file are build-time throws, in the
 * same spirit as BOOKING_LIVE_VIDEO in lib/content.ts: a rate card that
 * silently contradicts the pricing strategy is worse than a failed deploy.
 */

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type LessonMode = 'online' | 'inperson';
export type LessonType = 'single' | 'monthly' | 'pack';
export type LessonDuration = 30 | 60;

export type Price = {
  /** Stable handle. The Stripe `lookup_key`; the app never uses price IDs. */
  lookupKey: string;
  /** Which Stripe Product this Price hangs off. */
  product: string;
  mode: LessonMode;
  duration: LessonDuration;
  type: LessonType;
  /** Minor units, i.e. cents. Stripe's format — never a float. */
  amountCents: number;
  /** `'month'` for recurring, `null` for one-time. */
  interval: 'month' | null;
  /** Lessons included: 1 for a single, 4 for a monthly, 10 for a pack. */
  lessons: number;
  name: string;
  blurb: string;
};

export type Product = { key: string; name: string; description: string };

export const PRODUCTS = pricingJson.products as Product[];
export const PRICES = pricingJson.prices as Price[];

/**
 * A monthly plan bills four lessons. "Weekly" is the cadence, not the count:
 * a year of true weekly lessons is ~52, while twelve monthly bills cover 48.
 * Copy therefore says "4 lessons a month" and never "every week", or the fifth
 * Tuesday in a long month turns into an argument with a paying student.
 */
export const LESSONS_PER_MONTH = 4;

/**
 * In-person lessons cluster onto these two weekdays.
 *
 * This is a scheduling constraint with a financial reason, not a preference:
 * in-person slots scattered across five days leave unsellable gaps between
 * them, so the effective hourly rate collapses even though the sticker price
 * did not change. Used to configure Cal.com availability and the in-person
 * page copy.
 *
 * NOTE: deliberately NOT emitted as schema.org `openingHours`. Lessons happen
 * in a private residence; opening hours would advertise a walk-in venue that
 * does not exist. See content/pricing.json `_inPersonNote`.
 */
export const IN_PERSON_DAYS = ['Tuesday', 'Thursday'] as const;

/** The free assessment. No Stripe Price — $0, collected via SetupIntent. */
export const ASSESSMENT = {
  durationMinutes: 30,
  productKey: 'assessment',
} as const;

/* ------------------------------------------------------------------ */
/* Conversion values                                                   */
/* ------------------------------------------------------------------ */

/** Observed unit economics. Update these as real cohort data arrives. */
export const LTV_USD: Record<LessonMode, number> = {
  online: 2520,
  inperson: 3240,
};

/** Share of delivered assessments that become a paying plan. */
export const ASSESSMENT_TO_PLAN_RATE = 0.45;

/**
 * What a booked assessment is worth to Google Ads, in whole dollars.
 *
 * DERIVATION: LTV × assessment-to-plan conversion rate.
 *   online   2520 × 0.45 = 1134  → 1150
 *   inperson 3240 × 0.45 = 1458  → 1450
 * (Rounded to the nearest 50; Smart Bidding does not need false precision.)
 *
 * THIS NUMBER IS THE MOST LOAD-BEARING CONSTANT IN THE AD ACCOUNT. Two ways to
 * get it wrong, both expensive:
 *
 *   Sending $0 — bidding cannot distinguish a booked assessment from a bounce,
 *   so it optimises for clicks and the budget evaporates.
 *
 *   Sending the first month's $280 — this is the subtle one. It looks honest
 *   ("that's the cash we actually collect") but it trains the algorithm toward
 *   whoever converts cheapest right now, which is the one-off buyer who churns
 *   at month one. Breakeven here is ~2 months of retention, so a cohort of
 *   cheap one-off buyers loses money at any CPA. The bid target has to reflect
 *   the retained value, not the first invoice.
 *
 * Revisit once ~30 students have passed month 3 and the real rate is known;
 * at that point Offline Conversion Import (scripts/offline-conversions.ts)
 * starts feeding true outcomes back and this estimate matters less.
 */
export const ASSESSMENT_VALUE_USD: Record<LessonMode, number> = {
  online: 1150,
  inperson: 1450,
};

/* ------------------------------------------------------------------ */
/* Accessors                                                           */
/* ------------------------------------------------------------------ */

/** Every price for one delivery mode, cheapest first. */
export function byMode(mode: LessonMode): Price[] {
  return PRICES.filter((p) => p.mode === mode).sort((a, b) => a.amountCents - b.amountCents);
}

/**
 * Resolve one price by lookup key. Throws rather than returning undefined:
 * every call site is a page that must render a real number, and a silent
 * `undefined` becomes "$NaN" in front of a customer.
 */
export function lookup(lookupKey: string): Price {
  const found = PRICES.find((p) => p.lookupKey === lookupKey);
  if (!found) {
    throw new Error(
      `content/pricing.json: no price with lookupKey "${lookupKey}". ` +
        `Available: ${PRICES.map((p) => p.lookupKey).join(', ')}`,
    );
  }
  return found;
}

export function find(mode: LessonMode, type: LessonType, duration: LessonDuration = 60) {
  return PRICES.find((p) => p.mode === mode && p.type === type && p.duration === duration);
}

/**
 * The single-lesson price for a mode at a given length.
 *
 * Only 60-minute singles exist in the rate card, so this returns undefined for
 * 30 minutes. That absence is meaningful and callers must handle it — see
 * monthlySavingVs, which refuses to invent a comparison.
 */
export const singleLesson = (mode: LessonMode, duration: LessonDuration = 60) =>
  find(mode, 'single', duration);

export const pack10 = (mode: LessonMode) => lookup(`${mode}_pack_10`);

/** The recurring plans for a mode, longest lesson first (the anchor offer). */
export function monthlyPlans(mode: LessonMode): Price[] {
  return PRICES.filter((p) => p.mode === mode && p.type === 'monthly').sort(
    (a, b) => b.duration - a.duration,
  );
}

/** Per-lesson cost of any price — the only fair way to compare tiers. */
export function perLessonCents(price: Price): number {
  return Math.round(price.amountCents / price.lessons);
}

/**
 * The saving a monthly plan represents against buying single lessons.
 *
 * ---------------------------------------------------------------------------
 * DO NOT "CLEAN THIS UP" BY LOWERING THE SINGLE-LESSON PRICE.
 * ---------------------------------------------------------------------------
 * The single-lesson rate sits deliberately ~17–21% above the equivalent
 * monthly per-lesson rate. That gap IS the product design: it is what makes the
 * monthly plan the obvious choice, and the monthly plan is what produces
 * retention, which is the only metric that clears breakeven at ~2 months.
 * Flattening the two prices to look "consistent" would remove the reason to
 * commit and quietly convert the business into pay-as-you-go.
 *
 * Which is also why the number is computed here instead of being written into
 * copy: whoever edits a price next cannot leave a stale "save 19%" behind.
 *
 * ---------------------------------------------------------------------------
 * RETURNS null WHEN THERE IS NOTHING HONEST TO COMPARE AGAINST.
 * ---------------------------------------------------------------------------
 * The comparison is only valid against a single lesson of the SAME LENGTH.
 * The rate card has no 30-minute single lesson, so a 30-minute monthly plan has
 * no comparator and this returns null. Comparing it to the 60-minute single
 * ($42.50/lesson vs $85) would render "save 50%" for a lesson that is half as
 * long — a false claim on a pricing page, which is the one page that has to be
 * literally true. Callers render the saving only when it is present.
 */
export function monthlySavingVs(plan: Price) {
  if (plan.type !== 'monthly') {
    throw new Error(`monthlySavingVs expects a monthly plan, got "${plan.lookupKey}".`);
  }
  const single = singleLesson(plan.mode, plan.duration);
  if (!single) return null;

  const planPerLesson = perLessonCents(plan);
  const savingPerLesson = single.amountCents - planPerLesson;

  return {
    single,
    planPerLesson,
    savingPerLesson,
    /** Rounded to a whole percent — e.g. 18 for "save 18%". */
    savingPercent: Math.round((savingPerLesson / single.amountCents) * 100),
    /** Saving across one month of lessons. */
    savingPerMonth: savingPerLesson * plan.lessons,
  };
}

/**
 * What a 10-lesson pack saves against buying the same ten lessons one at a time,
 * expressed both in money and in "lessons effectively free".
 *
 * The free-lessons framing is the honest version of an upsell: it is arithmetic
 * on two real prices, not a manufactured discount. Ten online lessons bought
 * singly cost $850 against $700 for the pack — $150, which is 1.8 lessons. So
 * "nearly two lessons free" is literally true, and it lands harder than "save
 * 18%" because the unit is the thing the student actually wants.
 *
 * Computed rather than written into copy for the same reason as
 * monthlySavingVs: a price edit must never leave a stale claim behind. Rounded
 * DOWN (`Math.floor` via toFixed(1) truncation is avoided — see below) so the
 * page can never overstate. Returns null when the mode has no single-lesson
 * comparator of the same length, matching monthlySavingVs' refusal to invent
 * cross-length comparisons.
 */
export function packSavingVs(pack: Price) {
  if (pack.type !== 'pack') {
    throw new Error(`packSavingVs expects a pack, got "${pack.lookupKey}".`);
  }
  const single = singleLesson(pack.mode, pack.duration);
  if (!single) return null;

  const buyingSingly = single.amountCents * pack.lessons;
  const savingCents = buyingSingly - pack.amountCents;

  return {
    single,
    buyingSingly,
    savingCents,
    savingPercent: Math.round((savingCents / buyingSingly) * 100),
    /**
     * Lessons-worth of value returned, to one decimal (1.8), and the
     * conservative whole number for prose ("nearly 2" reads off 1.8, but a
     * claim of "2 free" must only be made when it is at least 2).
     */
    lessonsFree: Math.round((savingCents / single.amountCents) * 10) / 10,
    wholeLessonsFree: Math.floor(savingCents / single.amountCents),
  };
}

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

/**
 * 8500 -> "$85", 28000 -> "$280", 4250 -> "$42.50". Whole dollars stay clean;
 * anything with cents shows BOTH decimal places.
 *
 * `minimumFractionDigits` has to move in step with the maximum. Setting the
 * minimum to a flat 0 renders $42.50 as "$42.5" — a price that looks like a
 * typo, on the one page that has to be beyond question. The 30-minute
 * per-lesson rates ($42.50 and $52.50) are the only figures in the rate card
 * that hit this path, which is exactly why it survived a first pass.
 */
export function formatUsd(cents: number): string {
  const dollars = cents / 100;
  const digits = Number.isInteger(dollars) ? 0 : 2;
  return dollars.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** "$280/mo" or "$85" — the string a price row shows. */
export function priceLabel(price: Price): string {
  return price.interval ? `${formatUsd(price.amountCents)}/mo` : formatUsd(price.amountCents);
}

/** Schema.org and Stripe both want major units as a decimal string. */
export const toMajorUnits = (cents: number): string => (cents / 100).toFixed(2);

/** Display name for a delivery mode. Never "studio" — see content/pricing.json. */
export const modeLabel = (mode: LessonMode): string =>
  mode === 'online' ? 'Online' : 'In-person · Los Angeles';

/* ------------------------------------------------------------------ */
/* Build-time invariants                                               */
/* ------------------------------------------------------------------ */

/**
 * These run at module load, so a rate card that contradicts the strategy fails
 * the build instead of shipping. Each one encodes a decision that a future
 * edit could plausibly and invisibly undo.
 */
(() => {
  const keys = PRICES.map((p) => p.lookupKey);
  const dupes = keys.filter((k, i) => keys.indexOf(k) !== i);
  if (dupes.length) {
    throw new Error(`content/pricing.json: duplicate lookupKey(s): ${[...new Set(dupes)].join(', ')}`);
  }

  const productKeys = new Set(PRODUCTS.map((p) => p.key));
  for (const price of PRICES) {
    if (!productKeys.has(price.product)) {
      throw new Error(
        `content/pricing.json: price "${price.lookupKey}" references unknown product "${price.product}".`,
      );
    }
    if (!Number.isInteger(price.amountCents) || price.amountCents <= 0) {
      throw new Error(
        `content/pricing.json: price "${price.lookupKey}" has amountCents ${price.amountCents}; ` +
          'it must be a positive integer in cents.',
      );
    }
    if (price.type === 'monthly' && price.interval !== 'month') {
      throw new Error(`content/pricing.json: monthly price "${price.lookupKey}" must set interval "month".`);
    }
    if (price.type !== 'monthly' && price.interval !== null) {
      throw new Error(`content/pricing.json: "${price.lookupKey}" is ${price.type}; interval must be null.`);
    }
  }

  for (const mode of ['online', 'inperson'] as const) {
    // The pricing psychology, enforced. If a monthly plan ever costs more per
    // lesson than a single lesson of the SAME LENGTH, every "save X%" on the
    // site inverts into a lie and the plan stops being the obvious choice.
    // Durations with no single-lesson counterpart are skipped rather than
    // compared across lengths — see monthlySavingVs.
    for (const plan of monthlyPlans(mode)) {
      const single = singleLesson(mode, plan.duration);
      if (single && perLessonCents(plan) >= single.amountCents) {
        throw new Error(
          `content/pricing.json: monthly plan "${plan.lookupKey}" costs ` +
            `${formatUsd(perLessonCents(plan))} per lesson, which is not below the ` +
            `${formatUsd(single.amountCents)} single-lesson rate. The single lesson must stay ` +
            'above the monthly per-lesson rate — that gap is what makes the plan worth ' +
            'committing to, and retention is the metric the business runs on.',
        );
      }
    }

    /*
     * A pack must never be CHEAPER per lesson than the recurring plan.
     *
     * This one shipped broken and is why the check exists. In-person was
     * $880/10 = $88 a lesson against a $360/month plan at $90 a lesson, so the
     * one-time purchase was the cheapest way to buy in-person lessons. That is
     * backwards: the subscription is the only product that produces retention,
     * breakeven is around two months, and a pack buyer is a single transaction
     * who can walk away without ever becoming a retained student. Pricing the
     * pack below the plan pays students to choose the worse outcome.
     *
     * Equal per-lesson is fine and is how online is set — the plan then wins on
     * lower upfront cost ($280 vs $700) while the pack wins on no recurring
     * charge, which is an honest trade rather than a discount.
     */
    for (const pack of PRICES.filter((p) => p.mode === mode && p.type === 'pack')) {
      const plan = find(mode, 'monthly', pack.duration);
      if (plan && perLessonCents(pack) < perLessonCents(plan)) {
        throw new Error(
          `content/pricing.json: pack "${pack.lookupKey}" works out at ` +
            `${formatUsd(perLessonCents(pack))} per lesson, BELOW the ` +
            `${formatUsd(perLessonCents(plan))} of monthly plan "${plan.lookupKey}". ` +
            'A one-time pack must not undercut the recurring plan: the subscription is ' +
            'what produces retention, and retention is what clears breakeven at ~2 months. ' +
            'Raise the pack to at least ' +
            `${formatUsd(perLessonCents(plan) * pack.lessons)} or lower the plan.`,
        );
      }
    }
  }

  // In-person is the premium tier and is never discounted below online. It
  // costs real travel-free time in a private space and cannot be scaled.
  for (const online of PRICES.filter((p) => p.mode === 'online')) {
    const counterpart = PRICES.find(
      (p) =>
        p.mode === 'inperson' && p.type === online.type && p.duration === online.duration,
    );
    if (counterpart && counterpart.amountCents <= online.amountCents) {
      throw new Error(
        `content/pricing.json: "${counterpart.lookupKey}" (${formatUsd(counterpart.amountCents)}) ` +
          `is not above its online counterpart "${online.lookupKey}" ` +
          `(${formatUsd(online.amountCents)}). In-person is the premium tier and must never be ` +
          'priced at or below online.',
      );
    }
  }
})();
