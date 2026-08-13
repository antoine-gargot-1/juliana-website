/**
 * Create the Cal.com schedules and event types this funnel needs. Idempotent.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS A SCRIPT AND NOT A DASHBOARD CHECKLIST
 * ---------------------------------------------------------------------------
 * Six event types, each needing the right length, the right location type, the
 * right availability schedule and — for the two assessment types — a
 * redirect-after-booking URL with parameter forwarding switched on. Set any one
 * of those by hand and it will be wrong eventually, silently: an in-person event
 * type on the Mon-Fri schedule offers days the teacher does not teach in person,
 * and a missing `forwardParamsSuccessRedirect` sends the student to a hold page
 * with no booking uid, so the card capture never starts.
 *
 * Usage:
 *   npm run calcom:bootstrap -- --dry-run
 *   npm run calcom:bootstrap
 *   npm run calcom:bootstrap -- --base-url https://juliana-website.vercel.app
 *
 * ---------------------------------------------------------------------------
 * NO PREMISES — READ BEFORE EDITING ANY LOCATION FIELD
 * ---------------------------------------------------------------------------
 * In-person lessons happen in a private residence. No event type here may carry a
 * street address, a neighbourhood, a venue name or a map link, and none may be
 * marked with a public address. The in-person location says only that it is in
 * person in Los Angeles and that details follow privately, which is both true and
 * the pattern used everywhere else in this repo (see modeLabel() in
 * lib/pricing.ts and the _inPersonNote in content/pricing.json).
 *
 * ---------------------------------------------------------------------------
 * THE WEBHOOK IS NOT CREATED HERE
 * ---------------------------------------------------------------------------
 * It needs a deployed https URL, and creating it is also the only way to obtain
 * CALCOM_WEBHOOK_SECRET. See createBookingWebhook() in lib/calcom.ts and the
 * runbook.
 */

import { calRequest } from '@/lib/calcom';
import { ASSESSMENT, IN_PERSON_DAYS, LESSONS_PER_MONTH } from '@/lib/pricing';
import { SITE_URL } from '@/lib/site';

const DRY_RUN = process.argv.includes('--dry-run');

const baseUrlArg = process.argv.indexOf('--base-url');
const BASE_URL =
  baseUrlArg !== -1 ? process.argv[baseUrlArg + 1] : (process.env.NEXT_PUBLIC_SITE_URL ?? SITE_URL);

/** Where Cal.com sends the student the instant they pick a slot. */
const HOLD_URL = new URL('/coach/book/hold', BASE_URL).toString();

/**
 * In-person availability window, Pacific.
 *
 * Wider than the existing Mon-Fri 09:00-17:00 schedule on purpose: in-person days
 * are only two, so they have to absorb evening students who cannot make a
 * workday slot. The days themselves come from IN_PERSON_DAYS in lib/pricing.ts —
 * clustering in-person onto two fixed days is a financial constraint, not a
 * preference, because scattered in-person slots leave unsellable gaps between them
 * and the effective hourly rate collapses.
 */
const IN_PERSON_WINDOW = { startTime: '10:00', endTime: '20:00' } as const;
const IN_PERSON_SCHEDULE_NAME = 'In-person days (Tue/Thu)';
const TIMEZONE = 'America/Los_Angeles';

const actions: string[] = [];
const act = (text: string) => {
  actions.push(text);
  console.log(`${DRY_RUN ? 'WOULD ' : ''}${text}`);
};
const note = (text: string) => console.log(`       ${text}`);
const line = (char = '-') => console.log(char.repeat(78));
function heading(text: string) {
  console.log('');
  line('=');
  console.log(text);
  line('=');
}

/* ------------------------------------------------------------------ */
/* Types — only the fields this script reads                           */
/* ------------------------------------------------------------------ */

type CalSchedule = {
  id: number;
  name: string;
  timeZone: string;
  isDefault: boolean;
  availability: Array<{ days: string[]; startTime: string; endTime: string }>;
};

type CalEventType = {
  id: number;
  title: string;
  slug: string;
  lengthInMinutes: number;
  description?: string;
  scheduleId: number | null;
  successRedirectUrl: string | null;
  forwardParamsSuccessRedirect: boolean;
  locations?: Array<Record<string, unknown>>;
  hidden?: boolean;
};

/* ------------------------------------------------------------------ */
/* Locations                                                           */
/* ------------------------------------------------------------------ */

/** Online lessons run on Cal Video, so the link is generated per booking. */
const ONLINE_LOCATION = [{ type: 'integration', integration: 'cal-video' }];

/**
 * In-person location.
 *
 * `public: false` is the load-bearing flag: it keeps the string off the public
 * booking page and shows it only in the confirmation, which is exactly the
 * "address shared privately after booking" policy. The string itself still names
 * no place, because the real address is given by the teacher personally and must
 * never sit in an API record, a calendar invite or a crawlable page.
 */
const IN_PERSON_LOCATION = [
  {
    type: 'address',
    address: 'In person · Los Angeles — exact details shared privately once your booking is confirmed',
    public: false,
  },
];

/* ------------------------------------------------------------------ */
/* Desired event types                                                 */
/* ------------------------------------------------------------------ */

type Desired = {
  slug: string;
  title: string;
  lengthInMinutes: number;
  description: string;
  inPerson: boolean;
  /** Assessment types redirect into the $0 card hold; lesson types do not. */
  redirectToHold: boolean;
};

const DESIRED: Desired[] = [
  {
    slug: 'vocal-assessment-online',
    title: `Free Vocal Assessment · ${ASSESSMENT.durationMinutes} min · Online`,
    lengthInMinutes: ASSESSMENT.durationMinutes,
    description:
      'A free 30-minute vocal assessment over video. We listen to where your voice is now and map ' +
      'out what to work on. A card is collected to hold your slot and is not charged.',
    inPerson: false,
    redirectToHold: true,
  },
  {
    slug: 'vocal-assessment-in-person',
    title: `Free Vocal Assessment · ${ASSESSMENT.durationMinutes} min · In person, Los Angeles`,
    lengthInMinutes: ASSESSMENT.durationMinutes,
    description:
      'A free 30-minute vocal assessment in person in Los Angeles. A card is collected to hold your ' +
      'slot and is not charged. Details are shared privately once your booking is confirmed.',
    inPerson: true,
    redirectToHold: true,
  },
  {
    slug: 'lesson-online-60',
    title: 'Lesson · 60 min · Online',
    lengthInMinutes: 60,
    description: `A 60-minute one-to-one lesson over video. Monthly plans include ${LESSONS_PER_MONTH} lessons a month.`,
    inPerson: false,
    redirectToHold: false,
  },
  {
    slug: 'lesson-online-30',
    title: 'Lesson · 30 min · Online',
    lengthInMinutes: 30,
    description: `A 30-minute one-to-one lesson over video. Monthly plans include ${LESSONS_PER_MONTH} lessons a month.`,
    inPerson: false,
    redirectToHold: false,
  },
  {
    slug: 'lesson-in-person-60',
    title: 'Lesson · 60 min · In person, Los Angeles',
    lengthInMinutes: 60,
    description: `A 60-minute one-to-one lesson in person in Los Angeles. Monthly plans include ${LESSONS_PER_MONTH} lessons a month.`,
    inPerson: true,
    redirectToHold: false,
  },
  {
    slug: 'lesson-in-person-30',
    title: 'Lesson · 30 min · In person, Los Angeles',
    lengthInMinutes: 30,
    description: `A 30-minute one-to-one lesson in person in Los Angeles. Monthly plans include ${LESSONS_PER_MONTH} lessons a month.`,
    inPerson: true,
    redirectToHold: false,
  },
];

/* ------------------------------------------------------------------ */
/* Schedule                                                            */
/* ------------------------------------------------------------------ */

async function ensureInPersonSchedule(): Promise<number | null> {
  heading('SCHEDULES');

  const { data: schedules } = await calRequest<{ data: CalSchedule[] }>('/schedules', {
    group: 'schedules',
  });

  for (const schedule of schedules) {
    const days = schedule.availability.flatMap((a) => a.days).join(', ');
    console.log(
      `existing  ${schedule.id}  "${schedule.name}"${schedule.isDefault ? ' [default]' : ''}  ${schedule.timeZone}`,
    );
    console.log(`          ${days || '(no availability)'}`);
  }

  const existing = schedules.find((s) => s.name === IN_PERSON_SCHEDULE_NAME);
  if (existing) {
    console.log('');
    console.log(`OK     in-person schedule ${existing.id} "${IN_PERSON_SCHEDULE_NAME}"`);
    return existing.id;
  }

  console.log('');
  act(`CREATE schedule "${IN_PERSON_SCHEDULE_NAME}" — ${IN_PERSON_DAYS.join(' + ')}`);
  note(`${IN_PERSON_WINDOW.startTime}-${IN_PERSON_WINDOW.endTime} ${TIMEZONE}`);
  note('The existing Mon-Fri schedule stays as-is and continues to serve the online event types.');

  if (DRY_RUN) return null;

  const created = await calRequest<{ data: CalSchedule }>('/schedules', {
    group: 'schedules',
    method: 'POST',
    body: {
      name: IN_PERSON_SCHEDULE_NAME,
      timeZone: TIMEZONE,
      // isDefault stays false: making this the default would restrict ONLINE
      // lessons to Tuesday and Thursday too, which would cut online availability
      // (the scalable, worldwide tier) by 60% for no reason.
      isDefault: false,
      availability: [
        {
          days: [...IN_PERSON_DAYS],
          startTime: IN_PERSON_WINDOW.startTime,
          endTime: IN_PERSON_WINDOW.endTime,
        },
      ],
    },
  });

  note(`id ${created.data.id}`);
  return created.data.id;
}

/* ------------------------------------------------------------------ */
/* Event types                                                         */
/* ------------------------------------------------------------------ */

/** Event types on the account that this script does not manage. */
let unmanaged: CalEventType[] = [];

/**
 * Set when Cal.com refuses `successRedirectUrl` as a paid-plan-only feature.
 *
 * ---------------------------------------------------------------------------
 * THIS IS A LAUNCH BLOCKER, NOT A DEGRADED MODE
 * ---------------------------------------------------------------------------
 * Redirect-after-booking is what carries the student from Cal.com into the $0
 * card hold. Without it Cal.com shows its own "you're booked" page and the funnel
 * ends there: no Stripe customer, no card on file, no assessment_booked
 * conversion, and a slot given away to someone with no commitment. That is
 * precisely the no-show problem the card hold exists to solve.
 *
 * So when Cal.com refuses it, the event type is still created — a bookable
 * calendar is better than nothing and the redirect can be added later without
 * recreating anything — but the run ends with an unmissable BLOCKER banner and a
 * non-zero exit code. A silent fallback here would look like success.
 */
let redirectRefused = false;

/**
 * Cal.com's exact refusal message. Matched on substring because the status code
 * (403) is shared with unrelated permission errors, and misreading a genuine
 * permissions problem as "plan too low" would send the operator to the billing
 * page for no reason.
 */
const REDIRECT_GATE_MESSAGE = 'Redirect on booking is a feature for team plan users';

const isRedirectGate = (error: unknown): boolean =>
  error instanceof Error && error.message.includes(REDIRECT_GATE_MESSAGE);

async function ensureEventTypes(inPersonScheduleId: number | null): Promise<CalEventType[]> {
  heading('EVENT TYPES');

  const { data: existing } = await calRequest<{ data: CalEventType[] }>('/event-types', {
    group: 'eventTypes',
  });

  const managedSlugs = new Set(DESIRED.map((d) => d.slug));
  unmanaged = existing.filter((e) => !managedSlugs.has(e.slug));

  for (const eventType of existing) {
    console.log(`existing  ${eventType.id}  /${eventType.slug}  ${eventType.lengthInMinutes}min  "${eventType.title}"`);
  }
  console.log('');

  const result: CalEventType[] = [];

  for (const want of DESIRED) {
    const found = existing.find((e) => e.slug === want.slug);

    const body: Record<string, unknown> = {
      title: want.title,
      slug: want.slug,
      lengthInMinutes: want.lengthInMinutes,
      description: want.description,
      locations: want.inPerson ? IN_PERSON_LOCATION : ONLINE_LOCATION,
      // Two hours' notice. Enough to prevent a booking ten minutes from now,
      // short enough that a motivated student can still book same-day — and
      // same-day intent is the highest-converting intent there is.
      minimumBookingNotice: 120,
      ...(want.inPerson && inPersonScheduleId ? { scheduleId: inPersonScheduleId } : {}),
      ...(want.redirectToHold
        ? {
            successRedirectUrl: HOLD_URL,
            /*
             * THE SINGLE MOST BREAKABLE SETTING IN THE FUNNEL.
             *
             * With this false, Cal.com redirects to the hold URL with no query
             * string. /coach/book/hold then has no booking uid, so it cannot fetch
             * the slot, cannot key the Stripe idempotency, and cannot create the
             * card hold — the student lands on a dead page having just picked a
             * time. Nothing errors; the funnel simply stops converting.
             */
            forwardParamsSuccessRedirect: true,
          }
        : {}),
    };

    if (!found) {
      act(`CREATE event type /${want.slug} (${want.lengthInMinutes}min, ${want.inPerson ? 'in person' : 'online'})`);
      if (want.redirectToHold) note(`redirect -> ${HOLD_URL} (params forwarded)`);
      if (want.inPerson) note(`schedule -> ${inPersonScheduleId ?? '(pending, dry run)'} (${IN_PERSON_DAYS.join('/')})`);
      if (!DRY_RUN) {
        const created = await writeEventType('/event-types', 'POST', body, want);
        note(`id ${created.id}`);
        result.push(created);
      }
      continue;
    }

    const drift: string[] = [];
    if (found.title !== want.title) drift.push(`title "${found.title}" -> "${want.title}"`);
    if (found.lengthInMinutes !== want.lengthInMinutes) {
      drift.push(`length ${found.lengthInMinutes} -> ${want.lengthInMinutes}`);
    }
    if (want.redirectToHold && found.successRedirectUrl !== HOLD_URL) {
      drift.push(`redirect ${found.successRedirectUrl ?? '(none)'} -> ${HOLD_URL}`);
    }
    if (want.redirectToHold && !found.forwardParamsSuccessRedirect) {
      drift.push('forwardParamsSuccessRedirect false -> true (booking uid is not reaching the hold page)');
    }
    if (want.inPerson && inPersonScheduleId && found.scheduleId !== inPersonScheduleId) {
      drift.push(`scheduleId ${found.scheduleId ?? 'null (default Mon-Fri)'} -> ${inPersonScheduleId}`);
    }

    if (drift.length === 0) {
      console.log(`OK     event type ${found.id} /${found.slug}`);
      result.push(found);
      continue;
    }

    act(`UPDATE event type ${found.id} /${found.slug}`);
    for (const d of drift) note(d);
    if (!DRY_RUN) {
      result.push(await writeEventType(`/event-types/${found.id}`, 'PATCH', body, want));
    }
  }

  return result;
}

/**
 * Write an event type, retrying without the redirect if Cal.com refuses it.
 *
 * The retry exists so one gated field cannot abort the whole bootstrap and leave
 * the account half-configured — four of the six event types do not use a redirect
 * at all and have no reason to be blocked by it. The refusal is recorded rather
 * than swallowed; see `redirectRefused`.
 */
async function writeEventType(
  path: string,
  method: 'POST' | 'PATCH',
  body: Record<string, unknown>,
  want: Desired,
): Promise<CalEventType> {
  try {
    const { data } = await calRequest<{ data: CalEventType }>(path, {
      group: 'eventTypes',
      method,
      body,
    });
    return data;
  } catch (error) {
    if (!want.redirectToHold || !isRedirectGate(error)) throw error;

    redirectRefused = true;
    note('!! Cal.com REFUSED successRedirectUrl — creating without it (see BLOCKER below)');

    const { successRedirectUrl: _url, forwardParamsSuccessRedirect: _fwd, ...withoutRedirect } = body;
    const { data } = await calRequest<{ data: CalEventType }>(path, {
      group: 'eventTypes',
      method,
      body: withoutRedirect,
    });
    return data;
  }
}

/* ------------------------------------------------------------------ */

async function main() {
  if (!process.env.CALCOM_API_KEY) {
    console.error(
      'CALCOM_API_KEY is not set. Put it in .env.local — NEVER in .env, which is committed.',
    );
    process.exit(1);
  }

  heading(`CAL.COM BOOTSTRAP${DRY_RUN ? ' — DRY RUN' : ''}`);
  console.log(`Redirect target for assessments: ${HOLD_URL}`);
  if (!HOLD_URL.startsWith('https://')) {
    console.log('');
    console.log('WARNING: that is not an https URL. Cal.com will accept it, but a student redirected');
    console.log('         to localhost from a real booking lands nowhere. Pass --base-url for the');
    console.log('         deployed host before this goes anywhere near real traffic.');
  }

  const scheduleId = await ensureInPersonSchedule();
  const eventTypes = await ensureEventTypes(scheduleId);

  heading('ENV VARS TO SET FROM THIS RUN');
  const online = eventTypes.find((e) => e.slug === 'vocal-assessment-online');
  const inperson = eventTypes.find((e) => e.slug === 'vocal-assessment-in-person');
  console.log('These map a Cal.com booking back to a delivery mode in the webhook handler. Mapped by');
  console.log('ID rather than by event title, because a title is copy and copy gets edited — renaming');
  console.log('an event type must never start pricing in-person students at online rates.');
  console.log('');
  console.log(`CALCOM_EVENT_TYPE_ID_ONLINE=${online?.id ?? '<run without --dry-run to get this>'}`);
  console.log(`CALCOM_EVENT_TYPE_ID_INPERSON=${inperson?.id ?? '<run without --dry-run to get this>'}`);

  heading('STILL TO DO BY HAND');
  console.log('1. WEBHOOK — not created by this script, on purpose.');
  console.log('   It needs a deployed https URL, and creating it is also the only way to get');
  console.log('   CALCOM_WEBHOOK_SECRET. A subscription pointed at a guessed host would fail every');
  console.log('   delivery and Cal.com disables endpoints that keep failing, leaving the account in a');
  console.log('   broken state that looks configured. See createBookingWebhook() in lib/calcom.ts and');
  console.log('   the command in docs/stripe-runbook.md.');
  console.log('');
  if (unmanaged.length > 0) {
    console.log(`2. ${unmanaged.length} UNMANAGED EVENT TYPE(S) — hide or delete them in the dashboard:`);
    for (const eventType of unmanaged) {
      console.log(`     /${eventType.slug}  "${eventType.title}"  (id ${eventType.id})`);
    }
    console.log('   These are left alone deliberately — this script only touches what it created, and');
    console.log('   deleting event types it does not recognise could destroy something intentional.');
    console.log('   But each one is a bookable slot with NO price, NO card hold and NO tracking behind');
    console.log('   it: a booking through Cal.com\'s stock "15 min meeting" gives away the teacher\'s');
    console.log('   time and never reaches Stripe, so nothing confirms it and no conversion is');
    console.log('   recorded. Cal.com also exposes them all at cal.com/juliana-beltran, so they are');
    console.log('   publicly bookable right now.');
  } else {
    console.log('2. No unmanaged event types — every bookable slot on the account is one of ours.');
  }
  console.log('');
  console.log('3. Confirm the booking page timezone defaults to the VISITOR\'s, not Pacific. Online');
  console.log('   lessons sell worldwide and a student in Madrid reading Pacific times will book the');
  console.log('   wrong slot or give up.');

  heading(DRY_RUN ? 'DRY RUN COMPLETE' : 'BOOTSTRAP COMPLETE');
  if (actions.length === 0) {
    console.log('No changes needed — Cal.com already matches. That is what a second run should print.');
  } else {
    console.log(`${actions.length} action(s)${DRY_RUN ? ' would be' : ''} taken:`);
    for (const action of actions) console.log(`  ${action}`);
  }

  if (redirectRefused) {
    heading('NOTE: REDIRECT-AFTER-BOOKING IS REFUSED BY CAL.COM (not a launch blocker)');
    console.log('Cal.com rejected successRedirectUrl with:');
    console.log(`  "${REDIRECT_GATE_MESSAGE} ..."`);
    console.log('');
    console.log('THIS DOES NOT BREAK THE FUNNEL, and an earlier version of this message wrongly said');
    console.log('it did. The booking hand-off does not depend on the redirect: the Cal.com embed in');
    console.log('components/coach/CalEmbed.tsx subscribes to the embed\'s `bookingSuccessful` event and');
    console.log('navigates to /coach/book/hold itself, which works on every Cal.com plan. The redirect');
    console.log('is a redundant SERVER-side second path, not the mechanism. /coach/book/hold is');
    console.log('idempotent on the booking uid, so whenever Cal.com does start honouring the redirect,');
    console.log('the second arrival is a no-op rather than a double booking. Fallback three is the');
    console.log('Cal.com webhook, which emails a card-capture link if the browser never gets there.');
    console.log('');
    console.log('SO: this is worth fixing for belt-and-braces, but it does not gate ad spend. What');
    console.log('DOES gate ad spend is conversion tracking verified in GA4 DebugView.');
    console.log('');
    console.log('RULED OUT BY DIRECT TESTING — do not spend time re-checking these:');
    console.log('  - Entitlement is NOT missing. The team plan is demonstrably ACTIVE: on the paid');
    console.log('    team, `PATCH /v2/teams/<id> {hideBranding:true}` returns 200 and');
    console.log('    `POST /v2/teams/<id>/event-types` (without the redirect field) returns 201.');
    console.log('    Both are team-plan-only capabilities, so billing state is fine.');
    console.log('  - Pending invitations are NOT the cause. The team has exactly one membership:');
    console.log('    the owner, accepted=true. No unpaid seat is being occupied.');
    console.log('  - Event-type SCOPE is not the fix. setting successRedirectUrl is refused with the');
    console.log('    identical message on a personal event type, on a team-owned event type created');
    console.log('    under the paid team, at create time and via PATCH afterwards. Switching this');
    console.log('    script to team scope will not help.');
    console.log('  - Cal.com\'s own docs do not document any plan requirement for this field.');
    console.log('');
    console.log('MOST LIKELY CAUSE: the redirect gate checks the USER\'s personal paid status rather');
    console.log('than the owning team\'s entitlement. That would explain why it fails identically for');
    console.log('personal and team-owned event types while other team features work. If so, no amount');
    console.log('of team configuration fixes it and it needs Cal.com support.');
    console.log('');
    console.log('WHAT TO DO:');
    console.log('  1. Send Cal.com support the contradiction above verbatim — team features return');
    console.log('     200/201 on the same team whose entitlement this endpoint claims is missing.');
    console.log('  2. Meanwhile, do nothing. The embed path already covers it.');
    console.log('  3. Once they fix it, re-run `npm run calcom:bootstrap`. It is idempotent and will');
    console.log('     PATCH the redirect onto the existing event types without recreating them.');
    console.log('  4. Or set it by hand: Event Type → Advanced → "Redirect on booking", and TICK');
    console.log('     "forward parameters" — without forwarding, the booking uid never reaches');
    console.log('     /coach/book/hold and the redirect is useless.');
    console.log('');
    console.log('Exit code stays 0: this is a known upstream limitation with a working fallback, and');
    console.log('failing CI over it would be crying wolf.');
  }
}

main().catch((error) => {
  console.error('');
  console.error('CAL.COM BOOTSTRAP FAILED:', error instanceof Error ? error.message : error);
  console.error('');
  console.error('This script is idempotent — fix the cause and re-run it. Anything already created');
  console.error('will be recognised and left alone.');
  process.exit(1);
});
