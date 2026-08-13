import type { Metadata } from 'next';
import Link from 'next/link';

import { JsonLd } from '@/components/JsonLd';
import { Reveal } from '@/components/Reveal';
import { ASSESSMENT_CARD_COPY } from '@/components/coach/PriceGrid';
import legal from '@/content/legal.json';
import { ASSESSMENT, IN_PERSON_DAYS, LESSONS_PER_MONTH } from '@/lib/pricing';
import { breadcrumbList, pageMeta } from '@/lib/seo';
import { EMAIL, SITE_NAME } from '@/lib/site';

/**
 * Terms of service.
 *
 * ===========================================================================
 * NOT STATUTORILY REQUIRED. STILL NECESSARY.
 * ===========================================================================
 * No statute compels a terms-of-service page the way §22575 compels a privacy
 * policy. This business needs one anyway, for three specific reasons rather than
 * out of habit: it bills a card every month until someone stops it, a large
 * share of its students are minors whose guardian is the actual contracting
 * party, and it sells time slots that get missed. Each of those is an argument
 * waiting to happen, and each one goes better if it was written down first, in
 * words a parent can read once.
 *
 * ===========================================================================
 * THE ONE THING THAT MUST NEVER BE ADDED TO THIS PAGE
 * ===========================================================================
 * A NOTICE PERIOD FOR CANCELLING A PLAN. Not 30 days, not 14, not "before the
 * next billing cycle as a condition of cancelling". California's Automatic
 * Renewal Law, Bus. & Prof. Code §17602(d), requires that a subscription a
 * consumer started online be terminable "exclusively online, at will, and
 * without engaging any further steps that obstruct or delay the consumer's
 * ability to terminate immediately". A notice requirement in these terms would
 * be exactly such a step, would contradict the FAQ ("there's no notice period"),
 * and would contradict the renewal disclosure rendered next to every buy button
 * by renewalDisclosure() in components/coach/PriceGrid.tsx, which promises
 * "cancel any time from your billing page — no email and no phone call".
 *
 * #cancelling therefore states the absence of a notice period as a right, cites
 * the section, and points at the one control that does it. The pause policy is
 * the one thing that DOES need a message, and it is described honestly as such
 * (lib/portal.ts explains why: Stripe removed subscription_pause from the Portal
 * configuration API, so there is no button that could exist).
 *
 * ===========================================================================
 * WHERE EACH TERM COMES FROM
 * ===========================================================================
 * Verified, so a future edit can re-check rather than trust:
 *
 *   guardian is the contracting party   components/coach/BookingForm.tsx (isMinor,
 *                                       ADULT_AGE) + content/coach.json FAQ
 *   free assessment + $0 card hold      ASSESSMENT_CARD_COPY (imported verbatim
 *                                       below), lib/booking.ts mode: 'setup'
 *   4 lessons a month, same date        LESSONS_PER_MONTH, content/coach.json FAQ
 *   first bill a week after the         content/coach.json FAQ, lib/email.ts
 *     assessment                        (planLinkEmail)
 *   cancel: self-serve, no notice,      content/coach.json FAQ, lib/portal.ts,
 *     keep paid-for lessons             PriceGrid renewalDisclosure()
 *   one free 1-month pause per year,    lib/portal.ts pauseSubscriptionOneMonth()
 *     by message not self-serve
 *   in-person days                      IN_PERSON_DAYS
 *   address shared privately            content/coach.json FAQ, lib/email.ts header
 *   a failed payment cancels nothing    lib/email.ts paymentFailedEmail()
 *   one review request, no reward        lib/email.ts reviewRequestEmail(),
 *                                       app/api/cron/review-requests/route.ts
 *   packs: one payment, no renewal      components/coach/PriceGrid.tsx bullets
 *
 * NO PRICES ARE TYPED HERE. Not one figure. The rate card is
 * content/pricing.json via lib/pricing.ts and it is rendered on
 * /coach/pricing, which this page links to instead: a price restated on a terms
 * page is a price that goes stale, and a stale price in a document headed
 * "terms" is worse than a stale price on a marketing page. LESSONS_PER_MONTH and
 * IN_PERSON_DAYS are imported because they are counts and days, not money, and
 * they are the two facts the lesson terms genuinely turn on.
 *
 * NO PREMISES. #where says the address is shared privately once a lesson is
 * confirmed, and names no street, neighbourhood or venue.
 */

export const metadata: Metadata = pageMeta({
  title: 'Terms & Conditions — Lessons, Billing, Cancelling & Make-Up Lessons',
  description:
    'The terms for music lessons with Juliana Beltran: who the agreement is with, how a parent or guardian contracts for a student under 18, scheduling and 24 hours notice, make-up lessons, monthly plans, and cancelling online at any time with no notice period.',
  path: '/coach/terms',
});

/** In-page anchors, in the order they appear. Also the contents list. */
const SECTIONS: [string, string][] = [
  ['who', 'Who this agreement is between'],
  ['under-18', 'Students under 18'],
  ['assessment', 'The free assessment'],
  ['where', 'Where lessons happen'],
  ['moving-a-lesson', 'If you need to move a lesson'],
  ['if-i-move-one', 'If I need to move a lesson'],
  ['plans', 'Monthly plans'],
  ['cancelling', 'Cancelling'],
  ['pausing', 'Pausing'],
  ['packs', 'Packs and single lessons'],
  ['refunds', 'Refunds'],
  ['failed-payment', 'If a payment fails'],
  ['what-i-ask', 'What I ask of you'],
  ['what-you-get', "What I'm promising, and what I'm not"],
  ['your-music', 'Your music, and this website'],
  ['reviews', 'Reviews'],
  ['limits', 'Limits'],
  ['law', 'Governing law'],
  ['changes', 'Changes to these terms'],
  ['contact', 'How to reach me'],
];

export default function TermsPage() {
  return (
    <div className="page-fade">
      <Reveal />
      <div className="wrap">
        <section className="svc-page-hero">
          <div className="eyebrow">Terms of Service</div>
          <h1>
            Terms &amp; <span className="it">conditions.</span>
          </h1>
          <p className="lede-plain">
            The deal, written down. What you&apos;re signing up for, what I owe you, what happens if
            a lesson has to move, and how to stop paying me &mdash; which takes one click and no
            conversation. It&apos;s written to be read in one sitting.
          </p>

          <p className="legal-meta">
            Effective {legal.terms.effectiveDate} &middot; Last updated {legal.terms.lastUpdated}
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
            {/* ---------------- parties ---------------- */}
            <h2 id="who">Who this agreement is between</h2>
            <p>
              These terms are between you and me &mdash; {SITE_NAME}, teaching as Juliana Beltran
              Music, in Los Angeles and online. When this page says <strong>I</strong>{' '}or{' '}
              <strong>me</strong>, that&apos;s me. When it says <strong>you</strong>, it means the
              person paying for the lessons, who isn&apos;t always the person taking them.
            </p>
            <p>
              They apply from the moment you book a lesson, whether that&apos;s the free assessment
              or a paid one. They cover lessons in every subject I teach &mdash; voice, guitar,
              piano, songwriting, artist development &mdash; online or in person, because it&apos;s
              the same lesson slot and the same arrangement either way.
            </p>

            {/* ---------------- minors ---------------- */}
            <h2 id="under-18">Students under 18</h2>
            <div className="legal-note">
              <p>
                If the student is under 18, this agreement is with the parent or guardian. Not with
                the student.
              </p>
            </div>
            <p>
              A person under 18 can&apos;t enter into a payment agreement in California, so the
              adult is the one contracting and the one paying. That&apos;s why the booking form asks
              for a parent or guardian&apos;s name and email the moment you enter an age under 18:
              the booking, the card on file, the invoices and the billing page all belong to them,
              and the confirmation and calendar invitation go to them too.
            </p>
            <p>
              By booking for a student under 18, you&apos;re confirming that you&apos;re their parent
              or legal guardian and that you agree to these terms on their behalf as well as your
              own.
            </p>
            <p>
              You&apos;re welcome to sit in on lessons, especially the first few with a younger
              child. Some students settle faster with a parent in the room and some without, and
              we&apos;ll work out which yours is. What happens to a student&apos;s information is in{' '}
              <Link href="/coach/privacy">the privacy policy</Link>, and the section on children is
              the longest one on that page for a reason.
            </p>

            {/* ---------------- assessment ---------------- */}
            <h2 id="assessment">The free assessment</h2>
            <p>
              Every new student starts with a free {ASSESSMENT.durationMinutes}-minute assessment.
              There&apos;s no audition to pass to get one and nothing to pay for it.
            </p>
            <p>
              <strong>{ASSESSMENT_CARD_COPY}</strong>
            </p>
            <p>
              What that means mechanically: booking the assessment saves a card against your name
              without charging it, which is a $0 authorisation to hold the slot. It doesn&apos;t
              become a payment on its own and it doesn&apos;t turn into a plan. A plan only ever
              starts when you separately choose one and buy it. If you never do, nothing is ever
              charged, and the saved card just sits there until you ask me to remove it.
            </p>
            <p>
              An assessment is a real slot in a teaching week, which is the whole reason for the
              card. If you can&apos;t make it, tell me &mdash; a reply to the confirmation email is
              enough &mdash; and we&apos;ll find another time.
            </p>

            {/* ---------------- where ---------------- */}
            <h2 id="where">Where lessons happen</h2>
            <p>
              <strong>Online</strong>{' '}lessons happen over a video call, anywhere in the world, in
              English or Spanish. I send the link before your session. You&apos;ll need a connection
              that holds up and somewhere you can make a noise without worrying about it.
            </p>
            <p>
              <strong>In person</strong>{' '}lessons happen in Los Angeles, on{' '}
              {IN_PERSON_DAYS.join('s and ')}s. I teach from a private space rather than a commercial
              studio, so <strong>I share the exact address with you privately once your lesson is
              confirmed</strong>{' '}&mdash; it isn&apos;t published anywhere, and that&apos;s
              deliberate. If those two days don&apos;t work for you, online is the same lesson.
            </p>

            {/* ---------------- rescheduling ---------------- */}
            <h2 id="moving-a-lesson">If you need to move a lesson</h2>
            <p>
              Life happens, and I&apos;d much rather move a lesson than have you push through one
              badly.
            </p>
            <ul>
              <li>
                <strong>With at least 24 hours&apos; notice</strong>, tell me and we&apos;ll find
                another time that week or the next. Nothing is lost.
              </li>
              <li>
                <strong>With less than 24 hours&apos; notice</strong>, or if a lesson is missed
                without a message, that lesson counts as taught. I&apos;ve held the time and
                can&apos;t sell it to anyone else at that point.
              </li>
              <li>
                <strong>If you&apos;re ill, or something serious happens, just tell me.</strong>{' '}The
                24 hours is there to protect a teaching week from casual no-shows, not to fine
                someone for having a bad week. I&apos;d rather use judgement than a rule, and in
                practice that means I&apos;ll usually move it anyway.
              </li>
            </ul>
            <p>
              A make-up lesson is a lesson moved, not a lesson banked. If they start piling up
              we&apos;ll talk about whether the schedule is the wrong shape, rather than carrying a
              growing balance neither of us can honour.
            </p>

            <h2 id="if-i-move-one">If I need to move a lesson</h2>
            <p>
              Then it&apos;s on me to fix it. I&apos;ll give you as much notice as I can, and
              you&apos;ll get the lesson back at a time that works for you &mdash; or, if that
              can&apos;t be arranged, credited so you&apos;re not paying for a lesson I didn&apos;t
              teach. I&apos;m a working musician, so occasionally a show or a session moves a lesson;
              that&apos;s my problem to solve and not a cost I&apos;ll pass to you.
            </p>

            {/* ---------------- plans ---------------- */}
            <h2 id="plans">Monthly plans</h2>
            <p>
              A monthly plan covers {LESSONS_PER_MONTH} lessons a month at a weekly cadence, billed
              once a month on the same date, and it renews every month until you cancel. Current
              prices are on <Link href="/coach/pricing">the pricing page</Link>{' '}and nowhere else, so
              there&apos;s only ever one number to trust.
            </p>
            <p>
              It&apos;s {LESSONS_PER_MONTH} a month rather than &ldquo;every week&rdquo; on purpose:
              some months have five of your weekday, and the number in your plan should be the number
              you can hold me to. If a fifth lesson suits us both we can add it as a single lesson.
            </p>
            <p>
              <strong>Your first payment is taken a week after your assessment</strong>, not at the
              assessment itself &mdash; so the first bill lands after you&apos;ve had a real lesson
              and know whether this is for you. After that it&apos;s the same date each month.
            </p>
            <p>
              Payments are taken by Stripe from the card you saved. If you want to change which
              card, use your billing page &mdash; the link is in every receipt email.
            </p>

            {/* ---------------- cancelling ---------------- */}
            <h2 id="cancelling">Cancelling</h2>
            <div className="legal-note">
              <p>
                Cancel any time, yourself, from your billing page. No email, no phone call, no
                notice period, and no conversation with me unless you want one.
              </p>
            </div>
            <p>
              The link to your billing page is in every receipt email. It opens Stripe&apos;s own
              portal, where cancelling is a button. Your plan stops renewing, and{' '}
              <strong>you keep the lessons you&apos;ve already paid for</strong>{' '}&mdash; the month
              you&apos;re in runs out as normal rather than being cut short.
            </p>
            <p>
              There is deliberately no notice period, and I couldn&apos;t impose one even if I
              wanted to: California law (Business &amp; Professions Code §17602(d)) requires that a
              subscription you started online be cancellable online, at will, and without any extra
              step that delays it. So the button is the whole process. If anything on this site ever
              seems to contradict that, the button wins.
            </p>
            <p>
              You&apos;re not signing a contract with a term to see out, and cancelling costs
              nothing. If you&apos;d like to tell me why, I&apos;d genuinely like to know &mdash; but
              that&apos;s a favour, not a condition.
            </p>

            {/* ---------------- pausing ---------------- */}
            <h2 id="pausing">Pausing</h2>
            <p>
              If life gets in the way rather than ends the lessons, you can pause your plan for one
              month, once a year, at no cost. No billing for that month, and your slot is held for
              you.
            </p>
            <p>
              <strong>A pause is the one thing you can&apos;t do yourself</strong>{' '}&mdash; the
              billing portal has a cancel button but not a pause button, so I have to do it at my
              end. Message me before your next billing date and I&apos;ll set it up, so you&apos;re
              not charged for a month you&apos;re away. If you&apos;d rather not wait for me, cancel
              instead and start again whenever you&apos;re ready; nothing is lost by doing it that
              way.
            </p>

            {/* ---------------- packs ---------------- */}
            <h2 id="packs">Packs and single lessons</h2>
            <p>
              A single lesson is one payment for one lesson. A lesson pack is one payment for a
              number of lessons, paid in full up front, and{' '}
              <strong>it does not renew</strong>{' '}&mdash; nothing recurring starts when you buy one,
              and there is nothing to cancel.
            </p>
            <p>
              Lessons in a pack are yours to use at your own pace, and we&apos;ll schedule them
              between us as we go. The 24-hour rule above applies to a pack lesson the same way it
              applies to any other.
            </p>

            {/* ---------------- refunds ---------------- */}
            <h2 id="refunds">Refunds</h2>
            <ul>
              <li>
                <strong>A lesson I don&apos;t teach, you don&apos;t pay for.</strong>{' '}If I cancel and
                we can&apos;t rearrange, you get the lesson back or the money back &mdash; your
                choice.
              </li>
              <li>
                <strong>Changed your mind before anything has been delivered?</strong>{' '}Email me and
                I&apos;ll refund it. I&apos;m not going to keep money for lessons that never
                happened.
              </li>
              <li>
                <strong>Lessons already taught aren&apos;t refundable</strong>, and cancelling a plan
                stops future payments rather than reversing past ones. That&apos;s the trade for
                there being no notice period and no minimum term.
              </li>
              <li>
                <strong>Part-used pack?</strong>{' '}Tell me and we&apos;ll sort out the unused lessons
                fairly. I&apos;d rather do that than have you sitting on lessons you don&apos;t want.
              </li>
            </ul>
            <p>
              Refunds go back to the card that paid, through Stripe. If something feels wrong on a
              bill, email me before you dispute it with your bank &mdash; I can usually fix it the
              same day, and a dispute takes weeks and helps neither of us.
            </p>

            {/* ---------------- dunning ---------------- */}
            <h2 id="failed-payment">If a payment fails</h2>
            <p>
              Cards expire and banks block things; it&apos;s almost never about you. If a payment
              fails I&apos;ll email you a link to fix it, and Stripe will keep retrying on its own
              for about a fortnight.
            </p>
            <p>
              <strong>Your lessons carry on as normal in the meantime.</strong>{' '}Nothing is cancelled
              over one declined card. If it can&apos;t be sorted out at all, I&apos;ll talk to you
              before anything stops.
            </p>

            {/* ---------------- acceptable use ---------------- */}
            <h2 id="what-i-ask">What I ask of you</h2>
            <ul>
              <li>
                <strong>Turn up.</strong>{' '}On time, warmed up if you can, having spent some time on
                what we agreed. Consistent weeks are what actually change a voice; I can&apos;t do
                that part for you.
              </li>
              <li>
                <strong>Be decent.</strong>{' '}Lessons are a place where people are vulnerable about
                their own voice. Abuse, harassment or discrimination ends the lesson and the
                arrangement, and in that case I&apos;ll refund anything you&apos;ve paid for and
                haven&apos;t had.
              </li>
              <li>
                <strong>Ask before recording.</strong>{' '}Recording yourself in a lesson is often useful
                and I&apos;ll usually say yes. Just ask first, and don&apos;t publish a recording of
                a lesson without checking with me.
              </li>
              <li>
                <strong>Don&apos;t forward your billing link.</strong>{' '}It reaches your account
                without a password, so treat it like a key.
              </li>
              <li>
                <strong>Use the site as a site.</strong>{' '}No scraping it, no trying to break the
                booking or payment flow, no using it to send anyone anything they didn&apos;t ask
                for.
              </li>
              <li>
                <strong>For a younger child, stay reachable.</strong>{' '}If I&apos;m teaching a young
                student without you in the room, I need to be able to get hold of you during the
                lesson.
              </li>
            </ul>

            {/* ---------------- what teaching is ---------------- */}
            <h2 id="what-you-get">What I&apos;m promising, and what I&apos;m not</h2>
            <p>
              What I&apos;m promising is teaching: my full attention for the length of your lesson,
              an honest read on where your voice is and what it will take to get where you want, and
              a plan you can actually work on between sessions. If I don&apos;t think I&apos;m the
              right teacher for what you want, I&apos;ll tell you that instead of selling you a plan.
            </p>
            <p>
              What I can&apos;t promise is an outcome. Not a role, not an audition result, not a
              record deal, not a specific range by a specific date, and not a particular number of
              streams. Voices are bodies and they move at their own pace. Anyone who guarantees you a
              result is selling you something other than teaching.
            </p>

            {/* ---------------- IP ---------------- */}
            <h2 id="your-music">Your music, and this website</h2>
            <p>
              <strong>Your songs are yours.</strong>{' '}Nothing about taking a lesson from me gives me
              any claim on anything you write, in a lesson or after one &mdash; not a share, not a
              credit, not a say. If we ever actually write something together, we&apos;ll agree in
              writing who owns what before it goes anywhere.
            </p>
            <p>
              The writing, photographs, music and video on this website are mine. You&apos;re very
              welcome to link to any of it. Please don&apos;t republish it as your own.
            </p>

            {/* ---------------- reviews ---------------- */}
            <h2 id="reviews">Reviews</h2>
            <p>
              About three weeks after your first paid month, I&apos;ll email you once to ask whether
              you&apos;d leave a short Google review. That&apos;s a request and nothing more: there
              is no discount for writing one, no reward, and no consequence for ignoring it. If
              something hasn&apos;t been working, I&apos;d much rather you replied and told me.
            </p>

            {/* ---------------- liability ---------------- */}
            <h2 id="limits">Limits</h2>
            <p>
              Singing is physical. If something hurts, stop and tell me &mdash; and if you have a
              vocal or medical condition that affects your voice, tell me before we start and see a
              doctor or a speech pathologist about it. I&apos;m a teacher, not a clinician, and a
              lesson is not medical treatment.
            </p>
            <p>
              If something goes wrong and it&apos;s genuinely my fault, what you can hold me to is
              the money you&apos;ve paid me in the twelve months before it happened. That&apos;s not
              me being slippery &mdash; it&apos;s the ordinary limit for a service this size, and
              I&apos;d rather state it in a sentence you can read than bury it in capital letters.
              Nothing here limits anything that can&apos;t be limited by law.
            </p>

            {/* ---------------- law ---------------- */}
            <h2 id="law">Governing law</h2>
            <p>
              California law governs this agreement, and any dispute belongs in the state or federal
              courts of Los Angeles County, California.
            </p>
            <p>
              <strong>
                There&apos;s no arbitration clause here, and no class-action waiver.
              </strong>{' '}
              You keep every right to go to court, including small claims court, that you&apos;d have
              anyway. I&apos;d far rather you emailed me first &mdash; almost everything is a
              five-minute conversation &mdash; but I&apos;m not going to take that option away from
              you to make my life easier.
            </p>
            <p>
              If a court decides one part of this page can&apos;t stand, the rest of it still does.
            </p>

            {/* ---------------- changes ---------------- */}
            <h2 id="changes">Changes to these terms</h2>
            <p>
              If I change something that matters, I&apos;ll update this page, move the effective date
              at the top, and email current students rather than expect you to check. A change
              won&apos;t apply backwards to lessons you&apos;ve already bought.
            </p>
            <p>
              If you don&apos;t like a change, cancel &mdash; from your billing page, at any time,
              with no notice and no penalty. That&apos;s the point of there being no notice period.
              Nothing has changed since {legal.terms.effectiveDate}, which is the first version.
            </p>

            {/* ---------------- contact ---------------- */}
            <h2 id="contact">How to reach me</h2>
            <p>
              Email <a href={`mailto:${EMAIL}`}>{EMAIL}</a>. That&apos;s my inbox and I read it.
            </p>
            <p>
              For what happens to your information, see{' '}
              <Link href="/coach/privacy">the privacy policy</Link>. For prices, see{' '}
              <Link href="/coach/pricing">pricing</Link>. For everything people usually ask before
              booking, see <Link href="/coach/faq">the FAQ</Link>{' '}&mdash; it says the same things
              this page does, in fewer words.
            </p>
          </div>
        </section>
      </div>

      <JsonLd
        data={[
          breadcrumbList([
            { name: 'Home', path: '/' },
            { name: 'Coaching', path: '/coach' },
            { name: 'Terms & Conditions', path: '/coach/terms' },
          ]),
        ]}
      />
    </div>
  );
}
