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
 * ACCESSIBILITY
 * ===========================================================================
 * This is the one page in the site where a labelling bug costs money, so it
 * does not inherit the older forms' habit of unlabelled `<label>` elements:
 * every control has a real `htmlFor`/`id` pair, hints are wired with
 * `aria-describedby`, invalid controls carry `aria-invalid`, each message is
 * associated with its field, and the submit-time summary is announced through
 * `role="alert"` before focus moves to the first offending control.
 */

type Status = 'details' | 'scheduling';

const EMPTY = {
  name: '',
  email: '',
  age: '',
  focus: 'Voice',
  experience: 'Beginner — never had a lesson',
  goals: '',
  availability: '',
  guardianName: '',
  guardianEmail: '',
};

type Fields = typeof EMPTY;
type Errors = Partial<Record<keyof Fields | 'mode', string>>;

/** Old enough to enter a payment agreement in California. */
const ADULT_AGE = 18;

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
  const isMinor = Number.isFinite(ageNumber) && ageNumber > 0 && ageNumber < ADULT_AGE;

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

    if (!form.age.trim()) {
      next.age = 'Please add the student’s age — lessons run from 5 to 70+ and it changes the plan.';
    } else if (!Number.isFinite(ageNumber) || ageNumber < 3 || ageNumber > 110) {
      next.age = 'Please enter an age in years.';
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

    if (!form.goals.trim()) {
      next.goals = 'A sentence about what you want to work on makes the 30 minutes much better.';
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
      document.getElementById(firstKey === 'mode' ? 'mode-online' : `bf-${firstKey}`)?.focus();
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
      notes: [
        `Focus: ${form.focus}`,
        `Experience: ${form.experience}`,
        `Goals: ${form.goals.trim()}`,
        form.availability.trim() ? `Availability: ${form.availability.trim()}` : '',
        isMinor ? `Student is ${form.age}; guardian ${form.guardianName}` : `Age: ${form.age}`,
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
  }, [form, isMinor, metadata]);

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

  /* -------------------- scheduling step -------------------- */

  if (status === 'scheduling' && mode) {
    return (
      <div>
        <div className="bform-step">Step 2 of 2</div>
        <h2
          style={{
            fontFamily: 'var(--display)',
            fontWeight: 400,
            fontSize: 'clamp(28px, 6vw, 40px)',
            lineHeight: 1.05,
            margin: '0 0 12px',
          }}
        >
          Pick a time that suits you.
        </h2>
        <p className="bform-hint">
          Times are shown in your own timezone.{' '}
          {mode === 'inperson'
            ? `In-person assessments run on ${IN_PERSON_DAYS.join('s and ')}s.`
            : 'Online assessments run most days, early and late.'}
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
              onBooked={(uid) => router.push(holdUrl(uid))}
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
                  [
                    `Name: ${form.name}`,
                    `Email: ${form.email}`,
                    `Age: ${form.age}`,
                    `Format: ${mode === 'online' ? 'Online' : 'In-person · Los Angeles'}`,
                    `Focus: ${form.focus}`,
                    `Experience: ${form.experience}`,
                    `Goals: ${form.goals}`,
                    form.availability ? `Availability: ${form.availability}` : '',
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

      {/* ---------------- mode ---------------- */}
      <fieldset>
        <div className="bform-step">Step 1 of 2</div>
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
        <legend>About the student</legend>

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

        <div className="row">
          <div>
            <label htmlFor="bf-age">Age</label>
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
              required
            />
            {errors.age ? (
              <span className="field-error" id="error-age">
                {errors.age}
              </span>
            ) : (
              <span className="field-hint" id="hint-age">
                Students run from 5 to 70+. Under 18 adds two questions below.
              </span>
            )}
          </div>
          <div>
            <label htmlFor="bf-focus">Mainly interested in</label>
            <select id="bf-focus" name="focus" value={form.focus} onChange={set('focus')}>
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
          aria-invalid={Boolean(errors.goals)}
          aria-describedby={errors.goals ? 'error-goals' : 'hint-goals'}
          required
        />
        {errors.goals ? (
          <span className="field-error" id="error-goals">
            {errors.goals}
          </span>
        ) : (
          <span className="field-hint" id="hint-goals">
            One sentence is plenty. It means the 30 minutes starts on your actual problem.
          </span>
        )}

        <label htmlFor="bf-availability">When are you usually free?</label>
        <input
          id="bf-availability"
          name="availability"
          type="text"
          value={form.availability}
          onChange={set('availability')}
          placeholder="Weeknights after 6, Saturday mornings…"
          aria-describedby="hint-availability"
        />
        <span className="field-hint" id="hint-availability">
          Optional — the calendar comes next, this just helps if we need to rearrange.
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

      {/* Constraint: the card promise appears wherever the assessment is
          offered, above the button that acts on it. */}
      <strong className="assess-card-note" style={{ marginTop: 0 }}>
        {ASSESSMENT_CARD_COPY}
      </strong>

      <div className="submit-row">
        <span className="submit-note">
          {ASSESSMENT.durationMinutes} minutes, no charge, no audition.
        </span>
        <button type="submit" className="btn btn--solid">
          Choose a time <span className="arrow">&rarr;</span>
        </button>
      </div>
    </form>
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
