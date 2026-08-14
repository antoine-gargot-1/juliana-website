import type { Metadata } from 'next';
import Link from 'next/link';

import { JsonLd } from '@/components/JsonLd';
import { Reveal } from '@/components/Reveal';
import legal from '@/content/legal.json';
import { ASSESSMENT } from '@/lib/pricing';
import { breadcrumbList, pageMeta } from '@/lib/seo';
import { EMAIL } from '@/lib/site';

/**
 * The privacy policy.
 *
 * ===========================================================================
 * WHY THIS PAGE EXISTS AT ALL
 * ===========================================================================
 * CalOPPA — California Business & Professions Code §22575 — requires any
 * commercial website that collects personally identifiable information about
 * Californians to conspicuously post a privacy policy. There is no revenue
 * threshold and no size threshold: a one-teacher studio taking a name and an
 * email is inside it. §22575(b) enumerates what the policy must contain, and
 * every one of those elements is answered here in a section of its own:
 *
 *   (b)(1) categories of PII collected, and the categories of third parties
 *          it is shared with            → #what-i-collect and #who-else
 *   (b)(2) how a consumer may review    → #your-information
 *          and request changes
 *   (b)(3) how material changes to the  → #changes
 *          policy are notified
 *   (b)(4) an effective date            → the .legal-meta line under the h1
 *   (b)(5) how the operator responds    → #do-not-track
 *          to Do Not Track signals
 *   (b)(6) whether third parties may    → #across-other-sites
 *          collect PII about a
 *          consumer's activity across
 *          different sites
 *
 * (b)(6) is answered YES, in its own section, in the first sentence, because it
 * is true — Google Analytics and Google's advertising signals are on every page
 * of this site — and because the whole point of that clause is that the answer
 * not be buried. See components/SiteAnalytics.tsx for the actual consent
 * defaults it describes.
 *
 * ===========================================================================
 * WHAT THIS PAGE IS NOT
 * ===========================================================================
 * It is NOT a CCPA/CPRA policy, and it deliberately does not contain a "your
 * California privacy rights" section of the kind that lists a right to opt out
 * of sale, a right to correct, a 45-day response window and an authorised-agent
 * process. The CCPA applies to a "business" as defined by Civil Code
 * §1798.140(d): $25M+ annual gross revenue, personal information of 100,000+
 * California consumers or households, or 50%+ of annual revenue from selling or
 * sharing personal information. This studio meets none of the three. Printing
 * that rights section anyway would misdescribe the operator's obligations —
 * inventing a statutory process she is not bound by and has no machinery to
 * honour — which is worse than the omission. #california says so out loud, names
 * the thresholds, and says what happens if one is ever crossed.
 *
 * ===========================================================================
 * EVERY CLAIM ON THIS PAGE IS CHECKED AGAINST CODE, NOT AGAINST A TEMPLATE
 * ===========================================================================
 * The source for each one, so a future edit can re-verify rather than trust:
 *
 *   booking form fields          components/coach/BookingForm.tsx (EMPTY, validate)
 *   guardian fields under 18     same file, ADULT_AGE / isMinor
 *   studio inquiry fields        components/coach/ContactForm.tsx (EMPTY) — and it
 *                                really does not ask for an email address
 *   Formspree                    ContactForm.tsx / components/artist/BookingForm.tsx
 *   Cal.com hand-off             BookingForm.tsx (metadata, calFields), lib/calcom.ts
 *   card never touches this site lib/booking.ts — Stripe hosted Checkout, session.url
 *   Stripe Customer metadata     lib/students.ts (META)
 *   $0 hold, not a charge        lib/booking.ts (mode: 'setup')
 *   GA4 + Consent Mode regions   components/SiteAnalytics.tsx
 *   SHA-256 of the email only    lib/ga-server.ts (hashEmail, userData)
 *   attribution latch + keys     lib/analytics.ts (ATTRIBUTION_KEY, ATTRIBUTION_KEYS)
 *   cookieless page views        app/layout.tsx (@vercel/analytics, speed-insights)
 *   Resend                       lib/email.ts
 *   billing page is a signed     lib/booking-token.ts, lib/portal.ts
 *     expiring link, no password
 *   youtube-nocookie facade      components/artist/VideoFacade.tsx
 *   review request email         lib/email.ts (reviewRequestEmail)
 *
 * NO PREMISES. This page may not name a street, a neighbourhood or a venue.
 * In-person lessons happen in a private residence and the address is shared
 * privately, by Juliana, once a lesson is booked — see #contact, which says that
 * rather than printing a postal address.
 */

export const metadata: Metadata = pageMeta({
  title: 'Privacy Policy — What I Collect and Who Sees It',
  description:
    "What this site collects when you book or pay for a lesson, which companies handle it, what happens to a student under 18's data, and how to get it deleted.",
  path: '/coach/privacy',
});

/** In-page anchors, in the order they appear. Also the contents list. */
const SECTIONS: [string, string][] = [
  ['short-version', 'The short version'],
  ['what-i-collect', 'What I collect, and when'],
  ['who-else', 'Which companies see it'],
  ['across-other-sites', 'Tracking that follows you off this site'],
  ['do-not-track', 'Do Not Track'],
  ['cookies', "Cookies, and what's stored on your device"],
  ['under-18', 'Students under 18'],
  ['your-information', 'Seeing, changing or deleting your information'],
  ['how-long', 'How long I keep it'],
  ['security', 'How it is kept'],
  ['changes', 'Changes to this page'],
  ['california', 'California, specifically'],
  ['contact', 'How to reach me'],
];

export default function PrivacyPage() {
  return (
    <div className="page-fade">
      <Reveal />
      <div className="wrap">
        <section className="svc-page-hero">
          <div className="eyebrow">Privacy Policy</div>
          <h1>
            Privacy, <span className="it">plainly.</span>
          </h1>
          <p className="lede-plain">
            I teach singing. I&apos;m not a data company, and there&apos;s nothing clever going on
            here. This page says what I collect when you book a lesson, which companies end up
            handling it, and how to get any of it changed or deleted.
          </p>

          <p className="legal-meta">
            Effective {legal.privacy.effectiveDate} &middot; Last updated{' '}
            {legal.privacy.lastUpdated}
          </p>

          <div className="legal-note">
            <p>{legal.draftNotice}</p>
          </div>

          <ul className="legal-toc">
            {SECTIONS.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`}>{label}</a>
              </li>
            ))}
          </ul>
        </section>

        <section className="block" style={{ paddingTop: 40 }}>
          <div className="legal-body">
            {/* ---------------- short version ---------------- */}
            <h2 id="short-version">The short version</h2>
            <ul>
              <li>
                To book a lesson I need a name, an email, an age and a sentence about what you want
                to work on. If the student is under 18 I also need a parent or guardian&apos;s name
                and email, because they&apos;re the one the account belongs to.
              </li>
              <li>
                <strong>Card numbers never touch this site.</strong>{' '}You type them on Stripe&apos;s
                own checkout page. I can see the last four digits and the expiry, like a shopkeeper
                sees a receipt, and that&apos;s all.
              </li>
              <li>
                Google Analytics runs on every page, and Google&apos;s advertising signals are
                switched on for visitors outside Europe. That means yes &mdash; Google can connect
                what you did here to what you do on other sites. There&apos;s a whole section on
                that below, because California requires me to answer it plainly and it deserves a
                plain answer.
              </li>
              <li>
                I don&apos;t sell your information. Not to anyone, for anything. There is no
                advertising network buying data off this site.
              </li>
              <li>
                If you want to know what I hold, or want it gone, email{' '}
                <a href={`mailto:${EMAIL}`}>{EMAIL}</a>{' '}and ask. There&apos;s no form and no
                process.
              </li>
            </ul>

            {/* ---------------- what I collect ---------------- */}
            <h2 id="what-i-collect">What I collect, and when</h2>
            <p>
              Nothing here is collected quietly. Every piece of it comes from a form you filled in,
              a payment you made, or a page you looked at.
            </p>

            <h3>When you book a free assessment</h3>
            <p>
              The booking form at <Link href="/coach/book">/coach/book</Link>{' '}asks for the
              student&apos;s name, an email address, the student&apos;s age, which of voice,
              songwriting, guitar, piano or artist development you&apos;re mainly interested in, how
              much experience you&apos;ve had, what you want to work on, and &mdash; optionally
              &mdash; when you&apos;re usually free.
            </p>
            <p>
              If the age you enter is under 18, the form asks two more questions: a parent or
              guardian&apos;s name and their email address. It has to. A student under 18 can&apos;t
              enter a payment agreement in California, so the booking and the card belong to an
              adult, and that adult needs to be reachable. The guardian is also added to the
              calendar invitation, so the confirmation reaches the person whose card is on file.
            </p>
            <p>
              Those answers then travel with the booking: they go to Cal.com, which is the
              scheduler, and they end up written onto your customer record at Stripe so that I can
              read them back before your first lesson instead of asking you the same questions
              twice.
            </p>

            <h3>When you send a studio inquiry</h3>
            <p>
              The form at <Link href="/coach/contact">/coach/contact</Link>{' '}asks for a name, an age,
              what you&apos;re interested in, your experience so far, what you want to work on,
              artists you like the sound of, whether you&apos;d rather be online or in person, and
              when you&apos;re usually free. It does <strong>not</strong>{' '}ask for an email address.
              It lands in my inbox through a form service called Formspree.
            </p>
            <p>
              The event-booking form on the music side of the site (
              <Link href="/artist/booking">/artist/booking</Link>) works the same way and asks for a
              name, an organisation, the kind of event, a date, a location, a budget and a message.
            </p>
            <p>
              Both forms contain one hidden field that you&apos;ll never see and should never fill
              in. It&apos;s a spam trap: automated form-fillers complete it, people don&apos;t, and
              anything that arrives with it filled in is discarded rather than sent.
            </p>

            <h3>When you pay</h3>
            <p>
              Payments run through <strong>Stripe</strong>, and Stripe is also where the studio&apos;s
              records live &mdash; there&apos;s no separate customer database here, and no login for
              you to create.
            </p>
            <p>
              You enter your card details on a checkout page hosted by Stripe, not on this site. The
              number, the security code and the billing details you type there go straight to Stripe
              and never pass through anything I control. What I can see afterwards is what Stripe
              shows me: your name, your email, the card&apos;s brand, last four digits and expiry
              date, your invoices, and whether a payment succeeded.
            </p>
            <p>
              Alongside that, Stripe holds the answers from your booking form as notes on your
              customer record &mdash; the format you chose, the age, your goals, your experience,
              your availability, a guardian&apos;s name and email where there is one &mdash; plus
              which plan you&apos;re on, when your assessment was, and how many months you&apos;ve
              been a student.
            </p>
            <p>
              For the free {ASSESSMENT.durationMinutes}-minute assessment, Stripe saves a card
              without charging it. That&apos;s a $0 authorisation to hold the slot, not a payment.
              Some banks show it briefly on a statement, which is why it&apos;s said out loud on
              every page that offers the assessment.
            </p>

            <h3>While you&apos;re just reading</h3>
            <ul>
              <li>
                <strong>Page views and speed.</strong>{' '}Vercel, which hosts the site, counts page
                views and measures how quickly pages load. Both are cookieless and neither
                identifies you.
              </li>
              <li>
                <strong>Google Analytics.</strong>{' '}Which pages you saw, which videos you played,
                which buttons you pressed, roughly where in the world you are, and what kind of
                device you&apos;re on.
              </li>
              <li>
                <strong>Where you came from.</strong>{' '}If you arrive from a Google ad or from an
                email I sent, the link carries a tag identifying the campaign. The site keeps that
                tag for the rest of your visit and attaches it to a booking, so I know which ads are
                worth paying for. It&apos;s cleared when you close the tab.
              </li>
              <li>
                <strong>Your IP address.</strong>{' '}Every website sees this; it&apos;s how a page gets
                sent back to you. Cloudflare and Vercel handle it as part of delivering the site.
              </li>
            </ul>

            {/* ---------------- third parties ---------------- */}
            <h2 id="who-else">Which companies see it</h2>
            <p>
              These are the categories, and then the actual names, because a list of categories
              without names tells you nothing useful. Each one only gets what it needs to do its
              job.
            </p>
            <dl className="legal-dl">
              <dt>Stripe &mdash; payments, and the studio&apos;s records</dt>
              <dd>
                Your name, email, card details (typed on their page, never on mine), invoices, and
                the booking notes described above. Stripe is a payment processor and is bound by
                card-network rules about what it may do with your card data.
              </dd>

              <dt>Cal.com &mdash; scheduling</dt>
              <dd>
                Your name, email, the time you picked, your timezone, and your booking answers as
                notes on the appointment. A guardian&apos;s email is added as a guest so they get the
                invitation too. Their booking page is loaded into this site as an embedded frame,
                which means their scripts run in your browser when you reach the scheduling step.
              </dd>

              <dt>Google &mdash; analytics and advertising</dt>
              <dd>
                Google Analytics 4 runs on every page. When a booking or a payment completes, my
                server also tells Google that it happened, and sends a{' '}
                <strong>one-way scrambled version of your email address</strong>{' '}&mdash; a SHA-256
                hash &mdash; rather than the address itself, so that Google can match the sale to an
                ad click without me handing over your address. Google can&apos;t read an email back
                out of that hash; it can only compare it to hashes it already has.
              </dd>

              <dt>Formspree &mdash; the two inquiry forms</dt>
              <dd>Whatever you typed into the studio-inquiry or event-booking form.</dd>

              <dt>Resend &mdash; the emails I send you</dt>
              <dd>
                Your email address and the contents of transactional messages: a booking
                confirmation, a link to start a plan, a note if a payment fails.
              </dd>

              <dt>Vercel &mdash; hosting</dt>
              <dd>
                Server logs, cookieless page-view counts and page-speed measurements. Vercel runs
                the site.
              </dd>

              <dt>Cloudflare &mdash; delivery and protection</dt>
              <dd>
                Sits in front of Vercel, so every request to this site passes through it. It sees
                your IP address and the page you asked for, and it&apos;s what keeps the site up
                under a flood of automated traffic.
              </dd>

              <dt>YouTube and Spotify &mdash; embedded players</dt>
              <dd>
                On the music side of the site. A video shows a still image until you press play, and
                only then loads a player from <code>youtube-nocookie.com</code>{' '}&mdash; so no YouTube
                player and no YouTube cookie arrives unless you ask for one. The still images
                themselves come from Google&apos;s image servers with the page, which means Google
                sees the request for them. The Spotify players on the music pages load with the page,
                and Spotify sets its own cookies when they do.
              </dd>
            </dl>
            <p>
              <strong>
                I don&apos;t sell your information, I don&apos;t rent it, and I don&apos;t pass it to
                anyone for their own marketing.
              </strong>{' '}
              California&apos;s &ldquo;Shine the Light&rdquo; law (Civil Code §1798.83) requires a
              business to tell you if it shares your details with other companies for their direct
              marketing. I don&apos;t, so there&apos;s nothing to disclose.
            </p>

            {/* ---------------- cross-site tracking, §22575(b)(6) ---------------- */}
            <h2 id="across-other-sites">Tracking that follows you off this site</h2>
            <div className="legal-note">
              <p>
                Yes. Other companies can collect information about what you do on this site and
                connect it to what you do on other websites. That company is Google.
              </p>
            </div>
            <p>
              California asks me to answer that question plainly rather than leave you to work it
              out, so here it is in detail. Google Analytics loads on every page of this site from
              Google&apos;s own servers. Google&apos;s advertising signals &mdash; the ones that let
              it recognise a browser across different sites and use that for advertising &mdash; are
              handled like this:
            </p>
            <ul>
              <li>
                <strong>In the EEA, the UK and Switzerland, they&apos;re off.</strong>{' '}Advertising
                storage, ad personalisation and analytics storage are all denied by default, and ad
                identifiers are stripped from whatever measurement still goes out. Nothing on this
                site turns them on.
              </li>
              <li>
                <strong>Everywhere else, including the United States, they&apos;re on.</strong>{' '}So
                for most visitors, Google may use activity on this site as part of what it knows
                about that browser, including for advertising and for measuring the studio&apos;s
                ads.
              </li>
            </ul>
            <p>
              If you arrive from a Google ad, the link carries a click identifier. That identifier is
              stored with your booking so the studio can tell which advertising actually produced a
              student. It identifies the click, not you by name.
            </p>
            <p>
              Nothing else on this site does cross-site tracking. There is no advertising network,
              no data broker, no social pixel, no Meta or TikTok tag, and no chat widget.
            </p>

            {/* ---------------- DNT, §22575(b)(5) ---------------- */}
            <h2 id="do-not-track">Do Not Track</h2>
            <p>
              Some browsers can send a &ldquo;Do Not Track&rdquo; signal with every request, asking
              sites not to track you. <strong>This site does not respond to it</strong>, and the same
              goes for the Global Privacy Control signal. I&apos;d rather tell you that than imply an
              honour system I haven&apos;t built.
            </p>
            <p>
              The honest reason is that there was never an agreed standard for what responding should
              actually do, browsers largely stopped sending it, and the tracking on this page is
              Google&apos;s &mdash; controlled through Google&apos;s own consent settings, which is
              what the section above describes, rather than through that header.
            </p>
            <p>
              What I do instead: advertising signals are off by default for visitors in Europe, the
              UK and Switzerland; the page-view and speed measurement is cookieless; and YouTube
              videos don&apos;t load until you press play. And if you want none of it, a content
              blocker or your browser&apos;s built-in tracking protection will stop the Google tag
              loading, and every part of this site &mdash; including booking and paying &mdash; still
              works. That&apos;s deliberate: the measurement is built to fail quietly rather than to
              take a page down with it.
            </p>

            {/* ---------------- cookies ---------------- */}
            <h2 id="cookies">Cookies, and what&apos;s stored on your device</h2>
            <ul>
              <li>
                <code>_ga</code>{' '}and related Google Analytics cookies, so a second visit is
                recognised as the same browser rather than a new person. Only set where analytics
                storage is allowed, which excludes the EEA, the UK and Switzerland.
              </li>
              <li>
                <code>jb:attribution</code>, in your browser&apos;s session storage: the campaign
                tag from the link you arrived on. It disappears when you close the tab.
              </li>
              <li>
                <code>juliana-mode</code>, in local storage: whether you were last on the coaching
                side or the music side of the site, so you land in the right place next time. It
                says nothing about who you are.
              </li>
              <li>
                Stripe, Cal.com, YouTube and Spotify set their own cookies when you use those parts
                of the site, under their own policies.
              </li>
            </ul>
            <p>
              <strong>There&apos;s no cookie banner on this site, and that&apos;s a choice rather
              than an oversight.</strong>{' '}
              Instead of interrupting everyone with a box to dismiss, the site simply switches
              advertising cookies off by default for visitors in the places where consent is legally
              required, and leaves them on elsewhere. It means nobody in Europe has anything
              collected for advertising without asking, and nobody anywhere has to click through a
              banner to read a page. If that ever needs to change, this page changes with it.
            </p>

            {/* ---------------- minors ---------------- */}
            <h2 id="under-18">Students under 18</h2>
            <p>
              I teach children &mdash; some have started as young as five &mdash; so this section
              matters more to me than the rest of the page, and it&apos;s the one I&apos;d want to
              read first if I were a parent.
            </p>
            <ul>
              <li>
                <strong>A parent or guardian is the account holder.</strong>{' '}Not the student. The
                booking, the card, the invoices and the billing page are all theirs, and their name
                and email go on the record at Stripe. See{' '}
                <Link href="/coach/terms">the terms</Link>{' '}for what that means contractually.
              </li>
              <li>
                <strong>What I hold about the student is small on purpose:</strong>{' '}their name, their
                age, what they want to work on, how much experience they&apos;ve had, and which
                lessons they&apos;ve had. Nothing else about a child is asked for, and nothing else
                is needed to teach one.
              </li>
              <li>
                <strong>There&apos;s no account and no password for a student.</strong>{' '}No profile,
                no login, no messaging, nothing a child could sign into and nothing they could post.
              </li>
              <li>
                <strong>The booking form is meant to be filled in by an adult.</strong>{' '}If a young
                child filled one in on their own and you&apos;d rather I didn&apos;t have it, email
                me and it&apos;s gone the same day &mdash; no explanation needed.
              </li>
              <li>
                <strong>You can ask me to hold less.</strong>{' '}The only two answers a lesson actually
                needs are the age and what they want to work on. If you&apos;d rather I deleted the
                rest, say so and I will.
              </li>
            </ul>

            {/* ---------------- access & deletion, §22575(b)(2) ---------------- */}
            <h2 id="your-information">Seeing, changing or deleting your information</h2>
            <p>
              <strong>Email me at <a href={`mailto:${EMAIL}`}>{EMAIL}</a>{' '}and ask.</strong>{' '}That is
              the whole process. There&apos;s no form to complete, no portal to register for and no
              template to follow &mdash; &ldquo;what do you have about me&rdquo; or &ldquo;please
              delete my son&apos;s information&rdquo; is enough. I&apos;ll reply within a few days;
              it&apos;s one person reading that inbox.
            </p>
            <p>
              The one thing I&apos;ll check is that you are who you say you are, or that you&apos;re
              the parent or guardian of the student in question. Usually that means writing from the
              email address on the booking. I&apos;m not going to hand someone&apos;s billing
              history to whoever asks for it.
            </p>
            <p>You can also change some of it yourself, without me:</p>
            <ul>
              <li>
                <strong>Your card, your billing details and your invoices.</strong>{' '}The receipt email
                for any payment contains a link to your billing page, which opens Stripe&apos;s own
                portal. Update your card, download an invoice, or cancel a plan from there.
              </li>
              <li>
                <strong>Anything I got wrong.</strong>{' '}Tell me the correct version and I&apos;ll
                change it. An age typed wrong, a misspelled name, a guardian&apos;s email that
                bounced &mdash; that&apos;s a two-minute fix.
              </li>
            </ul>
            <p>
              On deletion, here&apos;s what I can and can&apos;t do, because a promise to
              &ldquo;delete everything&rdquo; would not be true:
            </p>
            <ul>
              <li>
                <strong>I can delete</strong>{' '}your booking notes, your goals, your availability, a
                guardian&apos;s details, the campaign tags, your appointments at Cal.com, and your
                messages in my inbox.
              </li>
              <li>
                <strong>I can&apos;t delete</strong>{' '}the record of money that changed hands. Invoices
                and payment records have to be kept &mdash; for tax, and because a card payment can
                be disputed for months afterwards and Stripe needs the transaction to answer the
                dispute. Those stay at Stripe under their retention rules.
              </li>
              <li>
                <strong>Analytics is a separate matter.</strong>{' '}What Google Analytics holds
                isn&apos;t filed under your name, so I can&apos;t look you up in it and pull you out.
                What I can do is stop it collecting anything further about you, and your browser&apos;s
                tracking protection or a content blocker does that immediately.
              </li>
            </ul>

            {/* ---------------- retention ---------------- */}
            <h2 id="how-long">How long I keep it</h2>
            <p>
              I haven&apos;t set a fixed retention schedule, and I&apos;d rather say so than print a
              number I don&apos;t actually follow. In practice: your customer record stays at Stripe
              while you&apos;re a student and afterwards, because that&apos;s where the invoices are;
              inquiry messages stay in my inbox; and Google Analytics deletes what it holds on
              Google&apos;s own schedule.
            </p>
            <p>
              If you&apos;d like everything gone that can go, ask, and see the section above for what
              that covers.
            </p>

            {/* ---------------- security ---------------- */}
            <h2 id="security">How it is kept</h2>
            <p>
              I&apos;m one teacher with a website, so rather than claim a security programme I
              don&apos;t have, here is what&apos;s actually true.
            </p>
            <ul>
              <li>
                The whole site is served over an encrypted connection, and card details are entered
                on Stripe&apos;s systems rather than mine. The most sensitive thing you&apos;ll ever
                type is the one thing I never receive.
              </li>
              <li>
                There are no student accounts and no passwords, which means there is no password
                database here to be stolen.
              </li>
              <li>
                Your billing page is reached through a signed link that expires, emailed to you with
                your receipt, instead of a login. <strong>Treat that link like a key:</strong>{' '}
                anyone who has it can see your invoices and cancel your plan, so don&apos;t forward
                it. It only ever reaches your own account, never anyone else&apos;s.
              </li>
            </ul>

            {/* ---------------- changes, §22575(b)(3) ---------------- */}
            <h2 id="changes">Changes to this page</h2>
            <p>
              If something material changes &mdash; a new company handling your information, a new
              kind of information collected, a change to how any of it is shared &mdash; I&apos;ll
              update this page, move the effective date at the top, and say what changed and when in
              this section. If you&apos;re a current student at the time, I&apos;ll email you as
              well rather than expect you to come back and check.
            </p>
            <p>
              A change won&apos;t be applied backwards to information already collected under an
              earlier version of this page. Nothing has changed since{' '}
              {legal.privacy.effectiveDate}, which is the first version.
            </p>

            {/* ---------------- California ---------------- */}
            <h2 id="california">California, specifically</h2>
            <p>
              This page exists because of California&apos;s Online Privacy Protection Act (Business
              &amp; Professions Code §22575), which requires any commercial site collecting personal
              information about Californians to post a privacy policy and to answer a specific list
              of questions in it &mdash; including the two above about cross-site tracking and Do Not
              Track, which are on this page for exactly that reason.
            </p>
            <p>
              <strong>The California Consumer Privacy Act does not apply to this studio</strong>, and
              I&apos;m not going to print a rights section describing obligations I don&apos;t have.
              The CCPA covers a business that meets at least one of three tests (Civil Code
              §1798.140(d)): more than $25 million in annual gross revenue; personal information of
              100,000 or more California residents or households; or more than half its revenue from
              selling or sharing personal information. A one-teacher music studio meets none of them,
              and the third isn&apos;t close &mdash; nothing here is sold at all.
            </p>
            <p>
              If the studio ever crosses one of those lines, this page will change and I&apos;ll say
              so plainly. In the meantime, the two things that Act is mostly about &mdash; seeing what
              a business holds about you and having it deleted &mdash; you can simply ask me for. See{' '}
              <a href="#your-information">above</a>.
            </p>

            {/* ---------------- contact ---------------- */}
            <h2 id="contact">How to reach me</h2>
            <p>
              Email <a href={`mailto:${EMAIL}`}>{EMAIL}</a>. It&apos;s my inbox, not a ticketing
              system, and it&apos;s the fastest way to get any of this dealt with.
            </p>
            <p>
              There&apos;s no postal address on this page on purpose. In-person lessons happen in a
              private home rather than a commercial studio, and I&apos;m not willing to publish that
              address &mdash; students get it from me directly once a lesson is confirmed. If you
              need a mailing address for a formal notice, email me and I&apos;ll give you one.
            </p>
            <p>
              For the lesson and billing terms &mdash; cancelling, make-up lessons, who&apos;s
              contracting for a student under 18 &mdash; see{' '}
              <Link href="/coach/terms">the terms of service</Link>.
            </p>
          </div>
        </section>
      </div>

      <JsonLd
        data={[
          breadcrumbList([
            { name: 'Home', path: '/' },
            { name: 'Coaching', path: '/coach' },
            { name: 'Privacy Policy', path: '/coach/privacy' },
          ]),
        ]}
      />
    </div>
  );
}
