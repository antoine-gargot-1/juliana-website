import type { CSSProperties } from 'react';
import type { Testimonial } from '@/lib/content';

/**
 * Student reviews — all of them, at once, standing still.
 *
 * ---------------------------------------------------------------------------
 * THIS WAS A CAROUSEL. DO NOT MAKE IT ONE AGAIN.
 * ---------------------------------------------------------------------------
 * It auto-advanced every 7000ms with no pause, play or stop control, showed
 * exactly one of the five reviews at a time, rendered no star rating even
 * though `rating: 5` sits on every record in content/coach.json, and drove
 * itself from a `role="button"` dot measuring 28x1 CSS px — a fifth of the
 * 24x24 minimum in WCAG 2.5.8 Target Size (Minimum), coloured `--rule` on
 * `--bg-deep` at 1.29:1 when inactive, i.e. invisible.
 *
 * Every one of those is worst for the people who buy lessons here: parents and
 * adults past 40. Moving content is where that group loses the most (NN/g's
 * over-65 testing: substantially slower, far higher error rates), and four
 * fifths of the available proof was off-screen at any instant. Surfacing
 * testimonials out of a rotating container is a sales fix as much as an
 * accessibility one — a review nobody scrolls to is a review nobody reads.
 *
 * WHY THE EXPORT IS STILL CALLED `TestimonialCarousel`: pages across the
 * /coach tree import this name. Renaming the symbol (or the file) is a
 * cross-page rename for no behavioural gain. The name is now wrong and the
 * component is right; that is the better trade. Rename it in one pass when
 * nothing else is in flight.
 *
 * WHY NO `.reveal` CLASS: `.reveal` is `opacity: 0` until an IntersectionObserver
 * in hooks/useReveal.ts adds `.in`. Proof content should not depend on client JS
 * to become visible, and this component now has no motion of any kind — nothing
 * to gate behind `prefers-reduced-motion`, because there is no transition,
 * animation or timer left in it.
 *
 * WHY INLINE STYLES: app/styles.css is owned by the type-system workstream, and
 * inline `style={{}}` alongside existing class names is already this codebase's
 * idiom for component-local layout. Sizes are in `rem` so a reader who raises
 * their browser font size gets the benefit; the old `.testi-*` rules were px.
 *
 * WHY NOT A DISPLAY OR SERIF FACE ON THE QUOTES: the old `.testi-quote` set
 * `var(--display)` at up to 50px, which is a headline, not five readable cards.
 * These inherit the body UI face at 17px/1.6 weight 400 — the one face in the
 * stack whose x-height is not the problem.
 */

/* Visually hidden, still read aloud. There is no `.sr-only` in styles.css and
   this workstream may not add one, so it lives here as a style object. */
const SR_ONLY: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  border: 0,
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
};

const GRID: CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'grid',
  // min() keeps a 20rem card from overflowing a narrow viewport.
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 20rem), 1fr))',
  gap: '1.5rem',
  textAlign: 'left',
};

const CARD: CSSProperties = {
  background: 'var(--bg)',
  border: '1px solid var(--rule)',
  padding: '1.5rem',
  display: 'flex',
};

const FIGURE: CSSProperties = {
  margin: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '0.875rem',
};

const QUOTE: CSSProperties = {
  margin: 0,
  fontSize: '1.0625rem',
  lineHeight: 1.6,
  fontWeight: 400,
  color: 'var(--ink)',
};

const NAME: CSSProperties = {
  fontStyle: 'normal',
  fontSize: '0.875rem',
  fontWeight: 600,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--ink)',
};

const DATE: CSSProperties = {
  display: 'block',
  marginTop: '0.375rem',
  fontSize: '0.8125rem',
  fontWeight: 400,
  letterSpacing: 'normal',
  color: 'var(--ink-soft)',
};

/**
 * The reviewer-detail line: "songwriting · 8 months · online".
 *
 * Same size and colour as the date beneath it, deliberately — this is attribution
 * rather than a claim of its own, and it should read as the quiet second line of
 * a byline. `textTransform: 'none'` is defensive: NAME above uppercases the
 * <cite>, and if that ever moves up to the <figcaption> this line must not
 * follow it into SHOUTING ABOUT A STUDENT'S LESSON HISTORY.
 */
const DETAIL: CSSProperties = {
  display: 'block',
  marginTop: '0.375rem',
  fontSize: '0.8125rem',
  fontWeight: 400,
  letterSpacing: 'normal',
  textTransform: 'none',
  color: 'var(--ink-soft)',
};

const SUMMARY: CSSProperties = {
  margin: '0 0 2rem',
  fontSize: '0.9375rem',
  fontWeight: 500,
  letterSpacing: '0.02em',
  color: 'var(--ink-soft)',
};

const STARS: CSSProperties = {
  color: 'var(--accent)',
  fontSize: '1rem',
  letterSpacing: '0.15em',
  lineHeight: 1,
};

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * `2025-06-01` → `June 2025`.
 *
 * Month granularity on purpose: every `datePublished` in content/coach.json is
 * the first of a month, which is a month-precision date written in a date
 * field, not a claim about the 1st. The exact stored value still goes out in
 * `<time dateTime>` for machines. Parsed off the string rather than through
 * `new Date()` so the rendered month cannot shift by a timezone.
 */
function monthYear(iso: string): string | null {
  const match = /^(\d{4})-(\d{2})/.exec(iso ?? '');
  if (!match) return null;
  const month = MONTHS[Number(match[2]) - 1];
  return month ? `${month} ${match[1]}` : match[1];
}

/** Decorative. Every use is paired with the rating in text. */
function StarGlyphs({ value }: { value: number }) {
  const filled = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <span aria-hidden="true" style={STARS}>
      {'★'.repeat(filled)}
      {'☆'.repeat(5 - filled)}
    </span>
  );
}

/** Quotes are stored wrapped in quotation marks; the markup supplies its own. */
const stripQuotes = (s: string) => s.replace(/^["“]|["”]$/g, '').trim();

/**
 * "songwriting · 8 months · online · parent of a student", from whichever of the
 * optional fields on the record actually exist — and `null` when none do.
 *
 * WHY THIS EXISTS AT ALL: a review that says who is speaking and what they
 * studied is materially more persuasive than the same sentence unattributed, and
 * that is the one testimonial variable with real quantitative support behind it.
 * None of the five records in content/coach.json carries any of it yet, because
 * none of it is known and guessing would be inventing a testimonial. This builds
 * the line from what is there so that the day the real answers are added to the
 * JSON they appear on the page with no code change at all. See
 * `_pendingFromOperator` in content/coach.json for exactly what to ask her for.
 *
 * WHY A FILTERED JOIN RATHER THAN CONDITIONAL SEPARATORS: joining only the parts
 * that survive the filter makes a dangling middot, a double middot, a leading
 * separator and an "undefined" all unrepresentable, rather than four cases to
 * remember. Absent fields are absent; there is nothing to lay out around them.
 *
 * ORDER IS FIXED, not source order: what they studied, then for how long, then
 * how, then who is talking. It reads as a sentence in that order and it stays
 * comparable across cards, which is the entire point of putting it on all of
 * them. `reviewerRole` sits last because it qualifies the name, and 'student' is
 * still rendered rather than assumed — a review that says it is from the student
 * is doing work that a review silent on the question is not.
 */
function reviewerDetail(t: Testimonial): string | null {
  const parts = [
    t.discipline,
    t.monthsStudied ? `${t.monthsStudied} ${t.monthsStudied === 1 ? 'month' : 'months'}` : null,
    // 'in-person' is the data value; "in person" is the English one.
    t.deliveryMode === 'in-person' ? 'in person' : t.deliveryMode,
    t.reviewerRole === 'parent' ? 'parent of a student' : t.reviewerRole,
  ].filter((part): part is string => typeof part === 'string' && part.trim().length > 0);

  return parts.length ? parts.join(' · ') : null;
}

export function TestimonialCarousel({ testimonials }: { testimonials: Testimonial[] }) {
  if (!testimonials.length) return null;

  const count = testimonials.length;
  const average = testimonials.reduce((sum, t) => sum + t.rating, 0) / count;

  return (
    <>
      {/*
        The aggregate, in text, next to the reviews it is computed from. This is
        the same arithmetic as AGGREGATE_RATING in lib/content.ts but over the
        reviews actually rendered here, so the number a visitor reads and the
        `reviewCount` in the JSON-LD cannot drift apart.
      */}
      <p style={SUMMARY}>
        <StarGlyphs value={average} />{' '}
        {average.toFixed(1)} out of 5 from {count} {count === 1 ? 'review' : 'reviews'}
      </p>

      <ul style={GRID}>
        {testimonials.map((t) => {
          const when = monthYear(t.datePublished);
          const detail = reviewerDetail(t);
          return (
            <li key={`${t.name}-${t.datePublished}`} style={CARD}>
              <figure style={FIGURE}>
                <div>
                  <StarGlyphs value={t.rating} />
                  <span style={SR_ONLY}>Rated {t.rating} out of 5</span>
                </div>
                <blockquote style={QUOTE}>
                  &ldquo;{stripQuotes(t.quote)}&rdquo;
                </blockquote>
                <figcaption>
                  <cite style={NAME}>{t.name}</cite>
                  {detail ? <span style={DETAIL}>{detail}</span> : null}
                  {when ? (
                    <time dateTime={t.datePublished} style={DATE}>
                      {when}
                    </time>
                  ) : null}
                </figcaption>
              </figure>
            </li>
          );
        })}
      </ul>
    </>
  );
}
