'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { CalEmbed } from '@/components/coach/CalEmbed';
import {
  ATTRIBUTION_KEYS,
  GA_ENABLED,
  GA_MEASUREMENT_ID,
  type Attribution,
  getAttribution,
} from '@/lib/analytics';
import { ASSESSMENT, type LessonMode, IN_PERSON_DAYS, formatUsd, singleLesson } from '@/lib/pricing';
import { EMAIL } from '@/lib/site';
import { ASSESSMENT_CARD_COPY } from '@/components/coach/PriceGrid';

/**
 * The free-assessment booking form.
 *
 * ===========================================================================
 * WHY THIS FORM EXISTS INSTEAD OF SENDING PEOPLE STRAIGHT TO CAL.COM
 * ===========================================================================
 * Cal.com can collect a name, an email and custom questions perfectly well. It
 * cannot hand the GA4 `client_id` and the latched UTMs to Stripe, and that join
 * is the whole point: the authoritative `assessment_booked` conversion fires
 * server-side from the Stripe webhook (client-side alone loses 20–30% to ad
 * blockers and Safari ITP), and a server-side conversion with no `client_id`
 * attaches to no session and lands in GA4 as `(not set)`. An unattributable
 * conversion cannot train Smart Bidding, so the ad budget would be spending
 * blind.
 *
 * So the sequence is: our form captures the attribution → it rides into the
 * Cal.com booking as prefill + metadata → /coach/book/hold reads the booking
 * and stamps it onto the Stripe Customer → the webhook reads it back off the
 * Customer and sends the conversion with a real session to attach to.
 *
 * ===========================================================================
 * WHY MODE IS THE FIRST QUESTION
 * ===========================================================================
 * Online and in-person are different Cal.com event types with different
 * availability (in-person is restricted to IN_PERSON_DAYS). Asking anything
 * else first risks showing a calendar that cannot honour the answer.
 *
 * ===========================================================================
 * WHY THE COUNTER SAYS THREE
 * ===========================================================================
 * It used to say "Step 2 of 2" over the calendar, and then a Stripe page asked
 * for a card. A counter that promises the end and then produces a payment form
 * is the most expensive sentence on the site: it breaks trust at the exact
 * moment the visitor is deciding whether this is a real teacher or a funnel.
 * The third step is therefore named up front, wherever the counter appears —
 * see STEP_LABEL — and ASSESSMENT_CARD_COPY is shown before it, never after.
 *
 * ===========================================================================
 * WHY ONLY FOUR THINGS ARE REQUIRED
 * ===========================================================================
 * Nothing is required here unless a slot cannot be reserved without it:
 *
 *   mode                    decides which Cal.com event type and which
 *                           availability the visitor is shown at all
 *   name, email             who the booking and the calendar invite belong to
 *   under 18 + guardian     a minor cannot enter a payment agreement, so the
 *                           Stripe Customer whose card holds the slot has to be
 *                           the parent or guardian. This is a legal question,
 *                           not a preference.
 *
 * focus, experience, goals and the student's age all help Juliana prepare, and
 * none of them is needed to hold half an hour on a calendar. They stay on the
 * form — collecting them later would mean a second ask nobody answers — but in
 * a collapsed, plainly optional group that cannot block submission. The two
 * selects deliberately start empty rather than on "Voice" and "Beginner": a
 * default that is silently submitted is worse than a blank, because Juliana
 * cannot tell a real beginner from someone who skipped the question.
 *
 * ===========================================================================
 * ACCESSIBILITY
 * ===========================================================================
 * This is the one page in the site where a labelling bug costs money, so it
 * does not inherit the older forms' habit of unlabelled `<label>` elements:
 * every control has a real `htmlFor`/`id` pair, hints are wired with
 * `aria-describedby`, invalid controls carry `aria-invalid`, each message is
 * associated with its field, and the submit-time summary is announced through
 * `role="alert"` before focus moves to the first offending control.
 */

type Status = 'details' | 'scheduling' | 'handoff';

const EMPTY = {
  name: '',
  email: '',
  age: '',
  focus: '',
  experience: '',
  goals: '',
  guardianName: '',
  guardianEmail: '',
};

type Fields = typeof EMPTY;
type Errors = Partial<Record<keyof Fields | 'mode', string>>;

/** Old enough to enter a payment agreement in California. */
const ADULT_AGE = 18;

/**
 * The counter, in one place so the two renders below cannot drift apart, and so
 * the third step keeps its name. "(no charge)" is part of the label rather than
 * a footnote underneath it: the whole point is that a visitor knows a card is
 * coming, and knows it is not a payment, before they type anything.
 */
const STEP_LABEL = {
  1: 'Step 1 of 3 · Your details',
  2: 'Step 2 of 3 · Pick your time',
  3: 'Step 3 of 3 · Hold your slot (no charge)',
} as const;

/** The same three steps, short enough to sit side by side on a phone. */
const STEPS = [
  { n: 1, label: 'Your details', note: 'a minute' },
  { n: 2, label: 'Pick your time', note: 'your timezone' },
  { n: 3, label: 'Hold your slot', note: 'no charge' },
] as const;

/**
 * Fields that live inside the collapsed optional group.
 *
 * Only used to reopen it before moving focus: a control inside a closed
 * <details> cannot take focus, so an error there would otherwise announce itself
 * and then send the visitor nowhere.
 */
const OPTIONAL_KEYS = new Set<string>(['age', 'focus', 'experience', 'goals']);

/* ------------------------------------------------------------------ */
/* Cal.com wiring                                                      */
/* ------------------------------------------------------------------ */

/**
 * The scheduler is configured by env rather than hardcoded, because the Cal.com
 * account is provisioned by the operator and the event slugs are theirs to
 * name. When the link is absent — which is the state before credentials arrive
 * — the form degrades to an email hand-off rather than to a broken iframe, so
 * this page never has a state where a visitor who wants to book cannot.
 */
const CAL_LINK = process.env.NEXT_PUBLIC_CAL_LINK ?? '';
const CAL_EVENT: Record<LessonMode, string> = {
  online: process.env.NEXT_PUBLIC_CAL_EVENT_ONLINE ?? 'vocal-assessment-online',
  inperson: process.env.NEXT_PUBLIC_CAL_EVENT_INPERSON ?? 'vocal-assessment-in-person',
};

/**
 * Ad-click ids, read straight off this page's own URL.
 *
 * lib/analytics.ts latches these into sessionStorage along with the UTMs, and
 * that latch is the path that matters — it is what carries a click id from a
 * landing page through to this form. This direct read is belt-and-braces for the
 * one case the latch cannot cover: sessionStorage unavailable (private-mode
 * Safari, cookie-blocked contexts), where the write silently fails.
 *
 * It is worth the ten lines because the failure is permanent and invisible.
 * Google Ads Offline Conversion Import is keyed SOLELY on the click id — there is
 * no email fallback and a gclid cannot be reconstructed afterwards — so a click
 * id lost here means that student's true retained value can never be fed back to
 * the auction, which is the mechanism that eventually makes bidding optimise for
 * students who stay past month three rather than for cheap bookings.
 */
const CLICK_ID_KEYS = ['gclid', 'gbraid', 'wbraid'] as const;

function withClickIdsFromUrl(latched: Attribution): Attribution {
  if (typeof window === 'undefined') return latched;
  const params = new URLSearchParams(window.location.search);
  const merged: Attribution = { ...latched };
  for (const key of CLICK_ID_KEYS) {
    const value = params.get(key);
    if (value) merged[key] = value.slice(0, 200);
  }
  return merged;
}

export function BookingForm() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>('details');
  const [mode, setMode] = useState<LessonMode | null>(null);
  const [form, setForm] = useState<Fields>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  /**
   * "The student is under 18" as a checkbox, replacing the required age field.
   *
   * WHY A CHECKBOX AND NOT AN AGE. The only thing the booking legally needs is
   * the answer to one yes/no question — whether a guardian has to be the one
   * contracting and holding the card. An exact age is useful to Juliana when she
   * plans the lesson, and it is asked for in the optional group below, so nothing
   * she relies on is lost; it just no longer stands between a parent and a
   * calendar.
   */
  const [underEighteen, setUnderEighteen] = useState(false);
  /** Whether the optional group is expanded. Controlled so an error can open it. */
  const [optionalOpen, setOptionalOpen] = useState(false);
  /** The hold URL, kept only so the hand-off screen can offer it as a link. */
  const [handoff, setHandoff] = useState('');
  // Honeypot: off-screen but not display:none, so screen readers skip it and
  // headless form-fillers still see it. Same pattern as ContactForm.
  const [gotcha, setGotcha] = useState('');

  /* -------------------- attribution capture -------------------- */

  const [attribution, setAttribution] = useState<Attribution>({});
  const [gaClientId, setGaClientId] = useState('');

  /**
   * The latched attribution set — utm_* AND the ad-click ids (gclid, gbraid,
   * wbraid) together, from lib/analytics.ts.
   *
   * The click ids used to be read straight off this page's URL instead, which
   * only worked for a visitor who landed directly on /coach/book with the id
   * still attached. Anyone who arrived on a landing page and then navigated here
   * — i.e. the intended path of every campaign — lost the click id silently, and
   * a click id cannot be recovered afterwards. They are now latched into
   * sessionStorage on first sight along with the UTMs, so one read covers both.
   *
   * sessionStorage is only readable in the browser, so this runs after mount
   * rather than during render.
   */
  useEffect(() => setAttribution(withClickIdsFromUrl(getAttribution())), []);

  // The GA4 client_id is only obtainable by asking gtag for it, and only after
  // the loader has run. If GA is disabled or blocked the callback never fires
  // and this stays empty — the booking still completes, we just lose the
  // session join for that visitor, which is the right way round to degrade.
  useEffect(() => {
    if (!GA_ENABLED) return;
    window.gtag?.('get', GA_MEASUREMENT_ID, 'client_id', (id: unknown) => {
      if (typeof id === 'string' && id) setGaClientId(id);
    });
  }, []);

  const ageNumber = Number.parseInt(form.age, 10);
  const ageGiven = form.age.trim() !== '';
  const ageIsMinor = Number.isFinite(ageNumber) && ageNumber > 0 && ageNumber < ADULT_AGE;
  /**
   * The checkbox is the answer that counts, but an age typed into the optional
   * group is honoured too: someone who tells me the student is 12 and leaves the
   * box unticked has still told me a guardian is needed, and taking a card from a
   * child because of a missed tick is not a mistake worth being relaxed about.
   */
  const isMinor = underEighteen || ageIsMinor;

  const set =
    (key: keyof Fields) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
      // Clear a field's error as soon as it is being corrected; leaving stale
      // errors on screen while someone types reads as the form arguing back.
      setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
    };

  /* -------------------- validation -------------------- */

  const validate = (): Errors => {
    const next: Errors = {};

    if (!mode) next.mode = 'Choose online or in-person so I can show the right availability.';
    if (!form.name.trim()) next.name = 'Please add the student’s name.';

    // Deliberately loose: the only thing worth rejecting is an address that
    // cannot possibly be delivered to. Stricter patterns reject real addresses.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = 'Please add an email address I can send the confirmation to.';
    }

    // A minor cannot enter a payment agreement, so the card on file and the
    // booking confirmation both have to belong to a parent or guardian. This is
    // not optional politeness — it is who the Stripe Customer is.
    if (isMinor) {
      if (!form.guardianName.trim()) next.guardianName = 'Please add a parent or guardian’s name.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.guardianEmail.trim())) {
        next.guardianEmail = 'Please add the parent or guardian’s email address.';
      }
    }

    /*
     * Age is optional and is checked only when something has been typed — and the
     * message says it may be left blank, because an optional field that rejects an
     * answer without saying that reads as a trap. It is validated LAST so that
     * insertion order matches the order of the controls on screen: focus goes to
     * the first problem a visitor would meet scrolling down, not to the one buried
     * in a collapsed group.
     *
     * goals is no longer validated at all. It was the only required field on the
     * form that a slot could be reserved without.
     */
    if (ageGiven && (!Number.isFinite(ageNumber) || ageNumber < 3 || ageNumber > 110)) {
      next.age = 'Please enter an age in years, or leave it blank.';
    }

    return next;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);

    // Bot. Show the scheduler-free success path and send nothing anywhere.
    if (gotcha) {
      setStatus('scheduling');
      return;
    }

    const found = validate();
    setErrors(found);

    const firstKey = Object.keys(found)[0];
    if (firstKey) {
      // Move focus to the offending control so a keyboard or screen-reader user
      // is taken to the problem rather than told one exists somewhere above.
      const id = firstKey === 'mode' ? 'mode-online' : `bf-${firstKey}`;
      if (OPTIONAL_KEYS.has(firstKey)) {
        // A control inside a closed <details> is not focusable, so the group has
        // to be open before focus can land in it. One tick is enough for React to
        // commit the open attribute.
        setOptionalOpen(true);
        window.setTimeout(() => document.getElementById(id)?.focus(), 0);
      } else {
        document.getElementById(id)?.focus();
      }
      return;
    }

    setStatus('scheduling');
    // No conversion event fires here. A submitted form is not a booked
    // assessment: the slot is only real once Cal.com has it and the $0 card
    // hold has succeeded, and that conversion is fired server-side from the
    // Stripe webhook. Firing on submit would inflate the number the ad account
    // bids against with people who never picked a time.
  };

  /* -------------------- Cal.com hand-off -------------------- */

  /**
   * Everything the rest of the funnel needs, flattened into strings. This is
   * the payload that must survive the trip through Cal.com: /coach/book/hold
   * reads it back off the booking and writes it onto the Stripe Customer.
   */
  const metadata = useMemo(() => {
    const entries: Record<string, string> = {
      mode: mode ?? '',
      age: form.age,
      focus: form.focus,
      experience: form.experience,
      // THE JOIN. Without this the server-side conversion has no GA4 session to
      // attach to and reports as (not set). See the file header.
      ga_client_id: gaClientId,
      // Every latched key, iterated rather than listed. Listing them by hand is
      // how gclid went missing in the first place: a key added to the latch but
      // forgotten here is dropped with no error anywhere, and for a click id that
      // loss is permanent.
      ...Object.fromEntries(ATTRIBUTION_KEYS.map((key) => [key, attribution[key] ?? ''])),
      landing_page: attribution.landing_page ?? '',
      guardian_name: isMinor ? form.guardianName : '',
      guardian_email: isMinor ? form.guardianEmail : '',
    };
    // Drop the empties so the URL stays short, and truncate: Cal.com metadata
    // values are not a place to put an essay, and an over-long query string can
    // be rejected by an edge proxy.
    return Object.fromEntries(
      Object.entries(entries)
        .filter(([, v]) => v !== '')
        .map(([k, v]) => [k, v.slice(0, 300)]),
    );
  }, [attribution, form, gaClientId, isMinor, mode]);

  /** "juliana-beltran/vocal-assessment-online" — the embed's calLink. */
  const calLink = CAL_LINK && mode ? `${CAL_LINK}/${CAL_EVENT[mode]}` : '';

  /**
   * Everything handed to the scheduler, as flat string fields.
   *
   * Used twice: as the embed's `config` (which Cal.com turns into the embed
   * iframe's own query string) and as the query string of the open-in-a-new-tab
   * escape hatch. One object, so the two cannot drift and the escape hatch can
   * never be the version missing the attribution.
   */
  const calFields = useMemo(() => {
    const fields: Record<string, string> = {
      name: form.name.trim(),
      email: form.email.trim(),
      /*
       * Every line is conditional now, because every field in it is optional. An
       * unanswered optional question must not arrive as "Goals:" with nothing
       * after it — a note full of empty labels is harder to read at a glance than
       * a short one, and this is what Juliana actually opens before a lesson.
       *
       * The old "Availability:" line is gone with the field it came from: asking
       * "when are you usually free?" and then showing a slot picker was the same
       * work twice, and the answer was never used for anything.
       */
      notes: [
        form.focus ? `Focus: ${form.focus}` : '',
        form.experience ? `Experience: ${form.experience}` : '',
        form.goals.trim() ? `Goals: ${form.goals.trim()}` : '',
        isMinor
          ? `Student is under 18${ageGiven ? ` (age ${form.age})` : ''}; guardian ${form.guardianName}`
          : ageGiven
            ? `Age: ${form.age}`
            : '',
      ]
        .filter(Boolean)
        .join('\n')
        .slice(0, 1000),
      layout: 'month_view',
      // Timezone is deliberately not forced: Cal.com defaults to the visitor's
      // own, and an online student in another timezone should see their own
      // clock, not Pacific.
    };

    /**
     * The same payload goes to Cal.com twice, and that redundancy is deliberate
     * rather than sloppy.
     *
     *   metadata[key]  — persists on the booking and comes back from the Cal.com
     *                    REST API. Needs no configuration on the event type.
     *   key            — prefills a Cal.com booking question of the same
     *                    identifier (landing in `booking.responses`, which is
     *                    what lib/calcom.ts normalises), and Cal.com also
     *                    forwards unrecognised query params onto the
     *                    success-redirect URL, where /coach/book/hold can read
     *                    them straight off its own searchParams.
     *
     * Three independent paths for one value, because that value is the GA4
     * client_id: lose it and every server-side conversion for this student lands
     * in GA4 as "(not set)", which is indistinguishable from not tracking at all.
     */
    for (const [key, value] of Object.entries(metadata)) {
      fields[`metadata[${key}]`] = value;
      fields[key] = value;
    }

    // A guardian is added as a guest so the confirmation and the calendar
    // invite reach the person whose card will be on file.
    if (isMinor && form.guardianEmail.trim()) fields.guests = form.guardianEmail.trim();

    return fields;
  }, [ageGiven, form, isMinor, metadata]);

  /** The scheduler on cal.com itself, for the new-tab fallback. */
  const calUrl = calLink ? `https://cal.com/${calLink}?${new URLSearchParams(calFields)}` : '';

  /**
   * Where a completed booking goes: the route that creates the $0 card hold.
   *
   * The uid is the load-bearing parameter — /coach/book/hold resolves the booking
   * from the Cal.com API with it, and it is what makes the hold idempotent, so
   * this callback firing as well as a successRedirectUrl produces one hold rather
   * than two. The rest of the payload rides along because /coach/book/hold reads
   * these keys off its own searchParams as the third of its three channels, and
   * the click ids in particular have no second chance: a gclid that is not on the
   * Stripe Customer can never be reconstructed, and without it Google Ads
   * Offline Conversion Import has nothing to key that student's true LTV to.
   */
  const holdUrl = (uid: string) => {
    const params = new URLSearchParams({ uid });
    for (const [key, value] of Object.entries(metadata)) params.set(key, value);
    return `/coach/book/hold?${params}`;
  };

  /* -------------------- hand-off to the card step -------------------- */

  /**
   * The half-second between Cal.com confirming the booking and /coach/book/hold
   * taking over.
   *
   * It exists because that gap used to be spent looking at a calendar that had
   * just gone quiet, and then a Stripe page appeared. Naming step 3 here — with
   * the card promise above it — means the payment page is something the visitor
   * was told about twice before it loads. It changes nothing about the hand-off
   * itself: the same router.push with the same holdUrl fires immediately.
   *
   * WHAT IT CANNOT SAY. Not the chosen time. The embed reports one thing to this
   * page, the booking uid (see bookingUidFrom in CalEmbed), and the slot itself is
   * only resolvable server-side from the Cal.com API — which is what
   * /coach/book/hold does. Inventing a reassuring "you're holding Tuesday at 6"
   * from data we do not have is exactly the kind of small lie this flow is being
   * cleaned up to remove.
   */
  if (status === 'handoff') {
    return (
      <div>
        <StepRail current={3} />
        <div className="bform-step">{STEP_LABEL[3]}</div>
        <h2 className="bform-h2">Your time is booked.</h2>
        <p className="bform-hint">
          One last screen — Stripe&rsquo;s own, so this site never sees your card — and then
          you&rsquo;re done. Taking you there now.
        </p>
        <strong className="assess-card-note">{ASSESSMENT_CARD_COPY}</strong>

        {/* A visible way forward if the client-side navigation does not land — a
            blocked route change would otherwise leave someone whose slot IS booked
            staring at "taking you there now". Same URL as the push, and
            /coach/book/hold is idempotent on the uid, so following both is safe. */}
        {handoff && (
          <p className="cal-note" style={{ marginTop: 20 }}>
            Still here?{' '}
            <a
              href={handoff}
              style={{ color: 'var(--accent-text)', textDecoration: 'underline' }}
            >
              Open the last step
            </a>
            .
          </p>
        )}
      </div>
    );
  }

  /* -------------------- scheduling step -------------------- */

  if (status === 'scheduling' && mode) {
    return (
      <div>
        <StepRail current={2} />
        <div className="bform-step">{STEP_LABEL[2]}</div>
        <h2 className="bform-h2">Pick a time that suits you.</h2>
        <p className="bform-hint">
          Times are shown in your own timezone.{' '}
          {mode === 'inperson'
            ? `In-person assessments run on ${IN_PERSON_DAYS.join('s and ')}s.`
            : 'Online assessments run most days, early and late.'}{' '}
          Choosing a time books it. Then there&rsquo;s one step left — holding the slot with a card,
          on Stripe&rsquo;s own page, for nothing.
        </p>

        {/* The card promise is restated here, immediately before the step that
            asks for it. Constraint: verbatim, at reading size, never tucked into
            a footnote. */}
        <strong className="assess-card-note">{ASSESSMENT_CARD_COPY}</strong>

        <div style={{ marginTop: 30 }}>
          {calLink ? (
            /*
             * Cal.com's official embed, not a raw iframe.
             *
             * The difference that matters: the embed can tell this page that a
             * booking happened, via `bookingSuccessful`. A plain iframe cannot,
             * which left the $0 card hold reachable only through the event type's
             * `successRedirectUrl` — a feature Cal.com refuses to set on this
             * account until a paid plan is active. See components/coach/CalEmbed.tsx
             * for the full three-step fallback chain; it does not depend on
             * anyone's billing state.
             */
            <CalEmbed
              calLink={calLink}
              config={calFields}
              fallbackUrl={calUrl}
              title="Choose a time for your free vocal assessment"
              onBooked={(uid) => {
                // Order matters only for what is on screen: the push is the same
                // push it has always been, and the hold route is idempotent on the
                // uid, so this cannot produce a second hold.
                const url = holdUrl(uid);
                setHandoff(url);
                setStatus('handoff');
                router.push(url);
              }}
            />
          ) : (
            /* TODO(integration): remove this branch once NEXT_PUBLIC_CAL_LINK is
               set in Vercel. Until the Cal.com Teams account exists there is no
               calendar to embed, and an empty iframe would look broken, so the
               booking completes by email instead. */
            <div className="cal-fallback">
              <p style={{ margin: '0 0 14px' }}>
                The online scheduler is being connected this week. In the meantime, send this
                straight to me and I will reply with two or three times within a day.
              </p>
              <a
                className="btn btn--solid"
                href={`mailto:${EMAIL}?subject=${encodeURIComponent(
                  `Free ${ASSESSMENT.durationMinutes}-minute assessment — ${form.name}`,
                )}&body=${encodeURIComponent(
                  /* Same rule as the Cal.com note: only the lines that have an
                     answer. Every field after the first three is optional now, and
                     the availability line is gone with the field. */
                  [
                    `Name: ${form.name}`,
                    `Email: ${form.email}`,
                    `Format: ${mode === 'online' ? 'Online' : 'In-person · Los Angeles'}`,
                    isMinor ? 'Student is under 18' : '',
                    ageGiven ? `Age: ${form.age}` : '',
                    form.focus ? `Focus: ${form.focus}` : '',
                    form.experience ? `Experience: ${form.experience}` : '',
                    form.goals.trim() ? `Goals: ${form.goals.trim()}` : '',
                    isMinor ? `Guardian: ${form.guardianName} (${form.guardianEmail})` : '',
                  ]
                    .filter(Boolean)
                    .join('\n'),
                )}`}
              >
                Send my details <span className="arrow">&rarr;</span>
              </a>
            </div>
          )}
        </div>

        <button
          type="button"
          className="btn btn--ghost"
          style={{ marginTop: 34 }}
          onClick={() => setStatus('details')}
        >
          &larr; Change my answers
        </button>
      </div>
    );
  }

  /* -------------------- details step -------------------- */

  const errorList = Object.entries(errors).filter(([, v]) => Boolean(v)) as [string, string][];

  return (
    <form className="bform" onSubmit={handleSubmit} noValidate>
      {/* honeypot — off-screen, never announced, never display:none */}
      <div
        aria-hidden="true"
        style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}
      >
        <label htmlFor="booking-company-website">Company website</label>
        <input
          id="booking-company-website"
          type="text"
          name="_gotcha"
          tabIndex={-1}
          autoComplete="off"
          value={gotcha}
          onChange={(e) => setGotcha(e.target.value)}
        />
      </div>

      {/* Attribution rides in hidden inputs as well as in the Cal.com URL, so
          the values are inspectable during QA and are already in the form
          payload if a server route is added later. */}
      <input type="hidden" name="ga_client_id" value={gaClientId} readOnly />
      {/* Generated from ATTRIBUTION_KEYS for the same reason the Cal.com metadata
          object is: a key that exists in the latch but not here is dropped
          silently, and for gclid/gbraid/wbraid that loss cannot be undone. */}
      {ATTRIBUTION_KEYS.map((key) => (
        <input key={key} type="hidden" name={key} value={attribution[key] ?? ''} readOnly />
      ))}
      <input type="hidden" name="landing_page" value={attribution.landing_page ?? ''} readOnly />
      <input type="hidden" name="landed_at" value={attribution.landed_at ?? ''} readOnly />

      {/* The shape of the whole thing, before anyone commits a keystroke to it:
          three steps, how long, and the card named as the third. Anxiety on a
          booking form is mostly about not knowing how long the corridor is. */}
      <StepRail current={1} />
      <p className="bform-flow">
        Three steps, about two minutes. Four things here, then the calendar, then a card to hold the
        slot &mdash; which isn&rsquo;t charged for this.
      </p>

      {submitted && errorList.length > 0 && (
        <div className="bform-summary" role="alert">
          There {errorList.length === 1 ? 'is one thing' : `are ${errorList.length} things`} to fix
          before I can show you times:
          <ul>
            {errorList.map(([key, message]) => (
              <li key={key}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="bform-step">{STEP_LABEL[1]}</div>

      {/* ---------------- mode ---------------- */}
      <fieldset>
        <legend>Online or in person?</legend>
        <p className="bform-hint">
          They run on different days, so this decides which times you see next.
        </p>

        <div className="choice-grid">
          <ModeChoice
            id="mode-online"
            value="online"
            checked={mode === 'online'}
            onChange={() => {
              setMode('online');
              setErrors((prev) => ({ ...prev, mode: undefined }));
            }}
            name="Online"
            note="Anywhere in the world, in English or Spanish. Several of my longest-running students have never been in the same city."
            price={`Lessons from ${formatUsd(singleLesson('online')?.amountCents ?? 0)}`}
            invalid={Boolean(errors.mode)}
          />
          <ModeChoice
            id="mode-inperson"
            value="inperson"
            checked={mode === 'inperson'}
            onChange={() => {
              setMode('inperson');
              setErrors((prev) => ({ ...prev, mode: undefined }));
            }}
            name="In-person · Los Angeles"
            note={`${IN_PERSON_DAYS.join('s and ')}s only. I send you the exact address privately once your lesson is confirmed.`}
            price={`Lessons from ${formatUsd(singleLesson('inperson')?.amountCents ?? 0)}`}
            invalid={Boolean(errors.mode)}
          />
        </div>
        {errors.mode && (
          <span className="field-error" id="error-mode">
            {errors.mode}
          </span>
        )}
      </fieldset>

      {/* ---------------- student ---------------- */}
      <fieldset>
        <legend>Who&rsquo;s this for?</legend>
        <p className="bform-hint">
          Two lines and a tick box. Everything else is optional and further down.
        </p>

        <div className="row">
          <div>
            <label htmlFor="bf-name">Student&rsquo;s name</label>
            <input
              id="bf-name"
              name="name"
              type="text"
              autoComplete="name"
              value={form.name}
              onChange={set('name')}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'error-name' : undefined}
              required
            />
            {errors.name && (
              <span className="field-error" id="error-name">
                {errors.name}
              </span>
            )}
          </div>
          <div>
            <label htmlFor="bf-email">Email</label>
            <input
              id="bf-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={form.email}
              onChange={set('email')}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'error-email' : 'hint-email'}
              required
            />
            {errors.email ? (
              <span className="field-error" id="error-email">
                {errors.email}
              </span>
            ) : (
              <span className="field-hint" id="hint-email">
                Where the confirmation and the calendar invite go.
              </span>
            )}
          </div>
        </div>

        {/* ---------------- under 18 ----------------
            One checkbox where a required age field used to be. It is here, in the
            required block, because it decides who contracts and whose card holds
            the slot — and the label says that plainly rather than making a parent
            work it out from a hint. */}
        <div className="bform-check">
          <input
            id="bf-under18"
            name="under18"
            type="checkbox"
            checked={isMinor}
            onChange={(e) => setUnderEighteen(e.target.checked)}
            aria-describedby="hint-under18"
          />
          <label htmlFor="bf-under18">The student is under 18</label>
        </div>
        <span className="field-hint" id="hint-under18">
          {ageIsMinor && !underEighteen
            ? 'The age below is under 18, so a parent or guardian’s details are needed.'
            : 'Tick this and I’ll ask for a parent or guardian — they book, and the card sits with them.'}
        </span>

        {/* Shown only for a minor. Rendered conditionally rather than disabled
            so nobody is asked for a guardian who does not need one — and so the
            two fields are genuinely required when they do appear. */}
        {isMinor && (
          <div className="bform-guardian">
            <label
              htmlFor="bf-guardianName"
              style={{ marginTop: 20 }}
              id="guardian-legend"
            >
              Parent or guardian&rsquo;s name
            </label>
            <input
              id="bf-guardianName"
              name="guardianName"
              type="text"
              autoComplete="name"
              value={form.guardianName}
              onChange={set('guardianName')}
              aria-invalid={Boolean(errors.guardianName)}
              aria-describedby={errors.guardianName ? 'error-guardianName' : 'hint-guardian'}
              required
            />
            {errors.guardianName && (
              <span className="field-error" id="error-guardianName">
                {errors.guardianName}
              </span>
            )}

            <label htmlFor="bf-guardianEmail">Parent or guardian&rsquo;s email</label>
            <input
              id="bf-guardianEmail"
              name="guardianEmail"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={form.guardianEmail}
              onChange={set('guardianEmail')}
              aria-invalid={Boolean(errors.guardianEmail)}
              aria-describedby={errors.guardianEmail ? 'error-guardianEmail' : 'hint-guardian'}
              required
            />
            {errors.guardianEmail && (
              <span className="field-error" id="error-guardianEmail">
                {errors.guardianEmail}
              </span>
            )}
            <span className="field-hint" id="hint-guardian">
              A student under 18 cannot enter a payment agreement, so the booking and the card sit
              with a parent or guardian. They are added to the confirmation too.
            </span>
          </div>
        )}
      </fieldset>

      {/* ---------------- optional ----------------
          WHY THESE FOUR ARE HERE AND NOT ABOVE. They are the questions that make
          the half hour better and none of them is needed to reserve it. Collapsed
          by default, so the form a visitor first sees is as short as it honestly
          can be; still on this page, because a follow-up email asking for them
          would be answered by almost nobody, and Juliana reads them before the
          lesson.

          <details> is doing real work on a phone here: it takes four controls out
          of the initial scroll without hiding them, needs no JavaScript to open,
          and cannot block submission because nothing inside it is required. The
          open state is controlled only so that a bad age can reopen it and take
          focus — see handleSubmit. */}
      <details
        className="bform-optional"
        open={optionalOpen}
        onToggle={(e) => setOptionalOpen(e.currentTarget.open)}
      >
        <summary>
          Anything you want me to know?
          <span className="bform-optional-tag">Optional</span>
        </summary>

        <div className="bform-optional-body">
          <p className="bform-hint" style={{ marginBottom: 0 }}>
            Skip all of it if you like &mdash; it changes nothing about your booking. Answer any of
            it and the {ASSESSMENT.durationMinutes} minutes starts on your actual problem instead of
            on questions.
          </p>

          <div className="row">
            <div>
              <label htmlFor="bf-age">Student&rsquo;s age</label>
              <input
                id="bf-age"
                name="age"
                type="number"
                inputMode="numeric"
                min={3}
                max={110}
                value={form.age}
                onChange={set('age')}
                aria-invalid={Boolean(errors.age)}
                aria-describedby={errors.age ? 'error-age' : 'hint-age'}
              />
              {errors.age ? (
                <span className="field-error" id="error-age">
                  {errors.age}
                </span>
              ) : (
                <span className="field-hint" id="hint-age">
                  Students run from 5 to 70+, and it changes how a lesson is built.
                </span>
              )}
            </div>
            <div>
              <label htmlFor="bf-focus">Mainly interested in</label>
              <select id="bf-focus" name="focus" value={form.focus} onChange={set('focus')}>
                {/* Empty first, deliberately. A pre-selected "Voice" is submitted
                    by everyone who never looked at this control, which makes the
                    answer worthless to the person reading it. */}
                <option value="">Not sure yet</option>
                <option>Voice</option>
                <option>Songwriting</option>
                <option>Guitar</option>
                <option>Piano</option>
                <option>Artist development</option>
                <option>A mix</option>
              </select>
            </div>
          </div>

          <label htmlFor="bf-experience">Experience so far</label>
          <select
            id="bf-experience"
            name="experience"
            value={form.experience}
            onChange={set('experience')}
          >
            <option value="">Rather not say</option>
            <option>Beginner — never had a lesson</option>
            <option>Sung a bit, self-taught</option>
            <option>Had lessons before</option>
            <option>Performing regularly</option>
            <option>Releasing music</option>
          </select>

          <label htmlFor="bf-goals">What do you want to work on?</label>
          <textarea
            id="bf-goals"
            name="goals"
            rows={3}
            value={form.goals}
            onChange={set('goals')}
            placeholder="A song you cannot get through, a range you cannot reach, an audition in six weeks…"
            aria-describedby="hint-goals"
          />
          <span className="field-hint" id="hint-goals">
            One sentence is plenty. This is the one I read twice.
          </span>
        </div>
      </details>

      {/* Constraint: the card promise appears wherever the assessment is
          offered, above the button that acts on it. */}
      <strong className="assess-card-note" style={{ marginTop: 0 }}>
        {ASSESSMENT_CARD_COPY}
      </strong>

      <div className="submit-row">
        <span className="submit-note">
          {ASSESSMENT.durationMinutes} minutes, no charge, no audition. Next: the calendar.
        </span>
        <button type="submit" className="btn btn--solid">
          Choose a time <span className="arrow">&rarr;</span>
        </button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Step rail                                                           */
/* ------------------------------------------------------------------ */

/**
 * The whole flow, visible at every step of it.
 *
 * An ordered list rather than a row of styled divs, because that is what it is:
 * a screen reader announces "list of 3" and the position, which is the same
 * information the numbers give everyone else. `aria-current="step"` marks where
 * the visitor is. The third item is named "Hold your slot / no charge" wherever
 * this appears, which is the point — the card is never a surprise.
 */
function StepRail({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="bform-rail" aria-label="Booking, in three steps">
      {STEPS.map((step) => (
        <li
          key={step.n}
          data-state={step.n === current ? 'now' : step.n < current ? 'done' : 'next'}
          aria-current={step.n === current ? 'step' : undefined}
        >
          <span className="bform-rail-n" aria-hidden="true">
            {step.n}
          </span>
          <span className="bform-rail-t">{step.label}</span>
          <span className="bform-rail-note">{step.note}</span>
        </li>
      ))}
    </ol>
  );
}

/* ------------------------------------------------------------------ */
/* Mode choice                                                         */
/* ------------------------------------------------------------------ */

/**
 * A radio whose whole card is the label. The input is visually hidden but stays
 * in the accessibility tree and in the tab order — `display: none` would remove
 * it from both and turn this into an unusable control for keyboard users.
 */
function ModeChoice({
  id,
  value,
  checked,
  onChange,
  name,
  note,
  price,
  invalid,
}: {
  id: string;
  value: LessonMode;
  checked: boolean;
  onChange: () => void;
  name: string;
  note: string;
  price: string;
  invalid: boolean;
}) {
  return (
    <label className={`choice${checked ? ' is-checked' : ''}`} htmlFor={id}>
      <input
        id={id}
        type="radio"
        name="mode"
        value={value}
        checked={checked}
        onChange={onChange}
        aria-invalid={invalid}
        aria-describedby={invalid ? 'error-mode' : undefined}
      />
      <span className="choice-name">{name}</span>
      <span className="choice-note">{note}</span>
      <span className="choice-price">{price}</span>
    </label>
  );
}
