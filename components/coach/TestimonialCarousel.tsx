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
