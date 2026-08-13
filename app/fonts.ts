import { Literata, Manrope, Pinyon_Script, Playfair } from 'next/font/google';

/**
 * Self-hosted via next/font instead of render-blocking
 * <link href="fonts.googleapis.com"> tags. Each family is exposed as a CSS
 * variable that app/fonts.css maps onto the design tokens
 * (--serif / --display / --sans / --script) used throughout styles.css.
 *
 * WHY THESE FOUR
 *
 *   Literata (--serif) carries every paragraph, answer, label and input. It is
 *   a text face with an x-height of 0.508 em and an optical-size axis (7–72)
 *   that thickens strokes and opens spacing as the size drops. It replaced
 *   Cormorant Garamond, a display face whose 0.386 em x-height made 18px read
 *   like 14px with no way to compensate.
 *
 *   Playfair (--display) is display-only, and styles.css keeps it above a hard
 *   28px floor. Its stroke contrast at hero sizes (7.70–9.45:1) matches the
 *   Italiana it replaced, so the dramatic register survives, but its hairlines
 *   are roughly 3x thicker at every size and it has real italics and an
 *   optical-size axis. Below 28px the hairlines stop being renderable as ink,
 *   which is exactly the failure being fixed — hence the floor.
 *
 *   Manrope (--sans) is unchanged. Its x-height is 0.540 em; the problem was
 *   weight 300 at 11.5px, not the face.
 *
 *   Pinyon Script (--script) is unchanged, at 400, in its two decorative
 *   places (.signature, .float-script) — inside the designer's intended range
 *   and carrying brand at no legibility cost.
 *
 * `axes` is only accepted when `weight` is omitted: omitting it requests the
 * variable font, whose wght axis then covers the 400/500/600 the stylesheet
 * asks for (Literata 200–900, Playfair 300–900). Listing a weight would pin
 * static instances and drop the optical-size axis, which is the whole point.
 * `wght` is never a valid member of `axes`.
 *
 * adjustFontFallback is left at its default (true) so next/font emits a
 * metric-adjusted local fallback face per family, which is what keeps
 * display: 'swap' from costing layout shift.
 */

export const literata = Literata({
  subsets: ['latin'],
  axes: ['opsz'],
  style: ['normal', 'italic'],
  variable: '--font-literata',
  display: 'swap',
});

export const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
});

export const pinyonScript = Pinyon_Script({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-pinyon',
  display: 'swap',
});

/*
 * Playfair carries headings only, and it is requested as narrowly as possible
 * because it is the largest font on the site and it competes with the preloaded
 * hero image for bandwidth on exactly the mobile paid-search traffic this site
 * is built for.
 *
 * Measured, latin subset, woff2:
 *   opsz + wdth + wght, normal + italic   385.1 KB
 *   opsz + wght, normal only              107.3 KB   <- what this asks for
 *
 * WHY `wdth` IS GONE: nothing varies width. No rule in styles.css sets
 * `font-stretch` or `font-variation-settings`, so the axis was 152 KB of range
 * no selector could reach. `opsz` stays because it is the whole reason for
 * choosing Playfair — it is what keeps the hairlines renderable as the size
 * drops toward the 28px floor.
 *
 * WHY ITALIC IS GONE: the site's 55 italic spans are `.it`, and `.it` switches
 * to `var(--serif)` — they are Literata italic, not Playfair italic. The only
 * Playfair italic on the site was one decorative word over the hero
 * photograph, which now uses Literata italic too (see `.hero-corner .mark`).
 * Loading a 206 KB italic file for a single word is not a trade worth making.
 *
 * If a future heading genuinely needs Playfair italic, add `style` back and
 * accept the cost knowingly rather than by default.
 */
export const playfair = Playfair({
  subsets: ['latin'],
  axes: ['opsz'],
  variable: '--font-playfair',
  display: 'swap',
});

export const fontClassNames = [
  literata.variable,
  manrope.variable,
  pinyonScript.variable,
  playfair.variable,
].join(' ');
