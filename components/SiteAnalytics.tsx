'use client';

import { useEffect } from 'react';
import Script from 'next/script';
import { usePathname } from 'next/navigation';

import { GA_ENABLED, GA_MEASUREMENT_ID, captureAttribution, track, trackPageView } from '@/lib/analytics';

/**
 * GA4 loader plus the two site-wide listeners.
 *
 * Reads NEXT_PUBLIC_GA_MEASUREMENT_ID (a "G-XXXXXXXXXX" string) at build time;
 * the committed default lives in .env and the Vercel dashboard overrides it.
 * If it is ever unset or malformed, every branch below no-ops: no script tags
 * are emitted, no network requests are made, and track() calls elsewhere in the
 * app quietly do nothing. Failing closed is deliberate — a broken ID should
 * cost analytics, not break the page.
 *
 * Deliberately uses usePathname() and reads window.location.search directly
 * rather than useSearchParams(): useSearchParams() forces a client-side bailout
 * that would drop these statically prerendered routes into dynamic rendering.
 */
type Props = {
  /**
   * Suppresses GA4 entirely. Passed from the root layout, which reads the same
   * SITE_NOINDEX flag robots.ts uses to mark a deployment that is not the real
   * production site.
   *
   * Preview deployments serve a byte-for-byte copy of the site. Without this,
   * every click around a preview URL would land in the same GA4 property as
   * real venue traffic, and "did emailing Hotel Cafe produce a video play"
   * would be answered partly with our own testing. Opt-in rather than derived
   * from VERCEL_ENV for the reason robots.ts already documents: a throwaway
   * review project builds to its own production target, so VERCEL_ENV reads
   * "production" there too.
   */
  disabled?: boolean;
};

export function SiteAnalytics({ disabled = false }: Props) {
  const pathname = usePathname();

  // Latch UTMs on the very first paint, before any conversion can fire, so an
  // outreach visitor who immediately hits play is still attributed.
  useEffect(() => {
    captureAttribution();
  }, []);

  // App Router client navigation does not reload the page, so page_view has to
  // be sent by hand on every path change (the loader sets send_page_view:false).
  useEffect(() => {
    if (!GA_ENABLED || disabled) return;
    trackPageView(window.location.href, document.title);
  }, [pathname, disabled]);

  // Outbound Spotify clicks, by delegation. A single listener catches every
  // Spotify link on both the artist and coach sides — including any added later
  // — without threading an onClick through a dozen server components.
  //
  // Note this only sees real <a> clicks. Plays that happen *inside* the embedded
  // Spotify iframes are cross-origin and cannot be observed from here.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const link = target?.closest?.('a[href*="open.spotify.com"]') as HTMLAnchorElement | null;
      if (!link) return;

      const href = link.href;
      track('spotify_click', {
        href,
        // "artist" | "playlist" | "track" ... from the Spotify URL shape.
        resource: new URL(href).pathname.split('/').filter(Boolean)[0] ?? 'unknown',
        page: window.location.pathname,
      });
    };

    document.addEventListener('click', onClick, { capture: true });
    return () => document.removeEventListener('click', onClick, { capture: true });
  }, []);

  if (!GA_ENABLED || disabled) return null;

  return (
    <>
      {/*
        A plain inline <script>, not next/script. next/script defers inline
        content until after hydration, and Consent Mode requires the
        consent-default command to be in the dataLayer *before* the GA library
        initialises — otherwise there is a window in which GA boots with Google's
        own defaults. Rendering it into the server HTML makes the ordering
        unconditional: this executes at parse time, the loader below is async and
        can only run later.
      */}
      <script
        id="ga4-init"
        dangerouslySetInnerHTML={{
          __html: [
            'window.dataLayer=window.dataLayer||[];',
            'function gtag(){dataLayer.push(arguments);}',
            'window.gtag=gtag;',
            "gtag('js',new Date());",
            // Analytics only: every advertising signal is denied up front, so no
            // remarketing identifiers are ever collected. Flip analytics_storage
            // to 'denied' and call gtag('consent','update',...) from a banner if
            // this site ever markets into the EU.
            "gtag('consent','default',{" +
              "ad_storage:'denied'," +
              "ad_user_data:'denied'," +
              "ad_personalization:'denied'," +
              "analytics_storage:'granted'});",
            `gtag('config','${GA_MEASUREMENT_ID}',{send_page_view:false,anonymize_ip:true});`,
          ].join(''),
        }}
      />
      <Script
        id="ga4-src"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />
    </>
  );
}
