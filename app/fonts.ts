import { Cormorant_Garamond, Italiana, Manrope, Pinyon_Script } from 'next/font/google';

/**
 * Self-hosted via next/font instead of the four render-blocking
 * <link href="fonts.googleapis.com"> tags the Vite build shipped.
 * Each family is exposed as a CSS variable that app/fonts.css maps onto the
 * design tokens (--serif / --display / --sans / --script) already used
 * throughout styles.css, which is left untouched.
 */

export const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
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

export const italiana = Italiana({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-italiana',
  display: 'swap',
});

export const fontClassNames = [
  cormorant.variable,
  manrope.variable,
  pinyonScript.variable,
  italiana.variable,
].join(' ');
