'use client';

import { useEffect } from 'react';
import Script from 'next/script';
import { usePathname } from 'next/navigation';

import { GA_ENABLED, GA_MEASUREMENT_ID, captureAttribution, track, trackPageView } from '@/lib/analytics';

/**
 * GA4 loader plus the two site-wide listeners.
 *
 * ---------------------------------------------------------------------------
 * A CONFIGURATION DEPENDENCY THAT CANNOT BE SATISFIED FROM THIS FILE, AND THAT
 * SILENTLY DESTROYS ATTRIBUTION ON EVERY CONVERSION IF IT IS NOT DONE.
 * ---------------------------------------------------------------------------
 * The booking funnel leaves this origin twice and comes back:
 *
 *   /coach/book  →  cal.com (iframe)  →  /coach/book/hold
 *     →  checkout.stripe.com  →  /coach/book/confirmed
 *
 * When the browser returns from Stripe, the referrer is checkout.stripe.com. GA4
 * treats a mid-visit source change as a NEW session, so the confirmation page —
 * and the client-side conversion mirror on it — get attributed to
 * "checkout.stripe.com / referral" instead of to the ad click that paid for the
 * visit. The paid campaign then shows the click and none of the conversion.
 *
 * The fix is a GA4 admin setting and there is no code equivalent worth having:
 *   Admin → Data Streams → the web stream → Configure tag settings →
 *   List unwanted referrals → add `checkout.stripe.com`, `cal.com`, `app.cal.com`
 *   and `billing.stripe.com`.
 *
 * Nothing in this file or in lib/analytics.ts detects that it is missing. The
 * symptom is a healthy conversion count sitting under the wrong source, which
 * looks like organic doing well rather than like a bug. docs/measurement-spec.md
 * carries this as a launch-blocking step; it is recorded here too because this is
 * the file somebody edits when attribution looks wrong.
 *
 * NOTE ON GA4's OWN FORM EVENTS. Enhanced Measurement collects `form_start` and
 * `form_submit` automatically for real <form> elements, which includes the
 * booking form. They are left enabled — they cost nothing and they no longer
 * collide with anything, because the funnel events are deliberately named
 * `booking_step_*`. Do not rename those to `form_*`. See the naming note in
 * lib/analytics.ts.
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
            /*
              CONSENT MODE v2 — REGION-SCOPED DEFAULTS.
              ------------------------------------------------------------------
              This block previously denied every advertising signal worldwide,
              with a comment explaining that the site did analytics and no
              remarketing. That was correct at the time. It is no longer, because
              the studio now runs paid search.
              WHY IT MATTERS: with ad_storage denied, the gclid on an ad click is
              never stored, so Google Ads cannot attribute ANY conversion back to
              the click that produced it — the whole ad budget becomes
              unmeasurable. With ad_user_data denied, Enhanced Conversions cannot
              send the hashed email either. Both are load-bearing for bidding.
              WHY REGION-SCOPED RATHER THAN JUST GRANTING EVERYTHING: there is no
              cookie banner on this site. Granting advertising storage to an EEA
              or UK visitor without prior consent is exactly what ePrivacy
              forbids. Paid traffic here is LA-local and US-national, but organic
              reaches "online singing lessons" searchers anywhere, so EU visitors
              are a real if small share.
              So: deny everything in the EEA, UK and Switzerland — where Consent
              Mode's own behavioural modelling covers the gap — and grant
              everything elsewhere. The more specific region entry wins, so the
              denied block MUST be pushed before the global one below.
              ads_data_redaction strips ad identifiers from the pings that do go
              out from denied regions. url_passthrough keeps the gclid flowing
              through in-site navigation when cookies are unavailable.
              If EU volume ever justifies real measurement there, add a banner
              that calls gtag('consent','update',...) on accept. Nothing else in
              this file needs to change for that.
            */
            "gtag('consent','default',{" +
              "ad_storage:'denied'," +
              "ad_user_data:'denied'," +
              "ad_personalization:'denied'," +
              "analytics_storage:'denied'," +
              'region:[' +
              [
                // EEA
                'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU',
                'IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES',
                'SE','IS','LI','NO',
                // UK + Switzerland, same expectation in practice
                'GB','CH',
              ]
                .map((c) => `'${c}'`)
                .join(',') +
              ']});',
            "gtag('consent','default',{" +
              "ad_storage:'granted'," +
              "ad_user_data:'granted'," +
              "ad_personalization:'granted'," +
              "analytics_storage:'granted'});",
            "gtag('set','ads_data_redaction',true);",
            "gtag('set','url_passthrough',true);",
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
