/**
 * Studio policy constants — the scheduling and make-up terms, in one place.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS FILE EXISTS
 * ---------------------------------------------------------------------------
 * These numbers appear on five surfaces: /coach, /coach/pricing (via
 * PurchaseFacts and RiskReversal, which render on four pages),
 * /coach/lessons/in-person, /coach/terms, and the FAQ in content/coach.json.
 *
 * They were previously typed into each one. That is how the studio ended up
 * publishing a 24-hour rule, a make-up policy and a refund policy that **no
 * human had ever agreed to** — an AI agent wrote them, they propagated across
 * five files, and the only reason it was caught is that the terms page keeps a
 * provenance table listing where each term was verified, and these three had no
 * row in it. The same class of bug appeared twice more in this project: a
 * booking form that promised "two questions and a calendar" against eight
 * fields, and a step counter that said "2 of 2" before a third step.
 *
 * A number in prose drifts. A number imported from here cannot.
 *
 * ---------------------------------------------------------------------------
 * THESE ARE OPERATIONAL COMMITMENTS, NOT COPY
 * ---------------------------------------------------------------------------
 * Every value below was researched against real independent-studio policies and
 * then CONFIRMED WITH THE OPERATOR on 2026-08-14. Two of them commit her to
 * doing something rather than merely saying something:
 *
 *   the online fallback     a late cancellation is taught over video at the
 *                           original time. When a Tuesday 4pm cancels at 2pm,
 *                           she sits down at a computer at 4pm.
 *   the video turnaround    she watches a student's practice video and writes
 *                           back with notes, inside FEEDBACK_TURNAROUND_HOURS.
 *
 * If either stops being true, it comes off the page the same day. A policy the
 * teacher will not honour is worse than a stricter one she will — it converts a
 * reassurance into a complaint, and it is the specific failure the studio
 * literature names as a reason parents leave.
 */

/**
 * Notice needed to move a lesson at no cost.
 *
 * 24 hours, not 48. It is the modal window for independent teachers, and it was
 * already published to existing students — tightening a number that is sitting
 * next to a payment button, for people who have already read it, costs more in
 * trust than it gains in schedule protection. Voice studios do cluster at 48,
 * and if in-person slots turn out to be genuinely unfillable that is the
 * defensible change; it is a change to make deliberately, not by drift.
 */
export const RESCHEDULE_NOTICE_HOURS = 24;

/**
 * How long a moved lesson stays available.
 *
 * Replaces "another time that week or the next", which was structurally
 * unkeepable: in-person runs two days a week, one student per clock hour,
 * nothing past 8pm — roughly eight to ten slots. A Tuesday cancellation had one
 * alternative day, probably already full. 30 days is what the studios that
 * publish a window actually use.
 */
export const MAKEUP_WINDOW_DAYS = 30;

/**
 * Ceiling on unused moved lessons.
 *
 * The previous version had no cap and said "if they start piling up we'll talk",
 * which is precisely the failure mode the literature names: an unschedulable
 * credit balance is the single most common source of studio disputes. Two is a
 * real limit that still absorbs a bad fortnight.
 *
 * A cap she will not enforce is worse than no cap, so this is the number she
 * confirmed rather than the number that reads best.
 */
export const MAX_PENDING_MAKEUPS = 2;

/**
 * Turnaround on written feedback when a student is too ill to take the lesson
 * but sends a practice video instead.
 *
 * 48 hours matches the studios that offer this. It is a promise about her own
 * working week, so it is the one value here most likely to need revising in
 * light of reality rather than research.
 */
export const FEEDBACK_TURNAROUND_HOURS = 48;

/**
 * Whether a prepaid lesson pack expires. It does not, and the page says so.
 *
 * Two independent reasons, and the legal one is the reason it is a constant
 * rather than a preference. California Civil Code §1749.5 makes it unlawful to
 * sell a gift certificate carrying an expiration date, and §1749.45 defines
 * "gift certificate" inclusively — it says what the term includes and never
 * says what it is. Whether a prepaid block of lessons falls inside it is
 * genuinely unresolved, no California case decides it, and §1749.5 has active
 * class-action machinery pointed at it. Putting no expiry on the pack means the
 * question never has to be answered.
 *
 * The operational argument points the same way: a ten-lesson pack at four
 * lessons a month is about ten weeks of teaching, so an expiry window would
 * almost never bind. It also reads as a feature on the largest number on the
 * rate card.
 *
 * Note for later: selling a pack AS A GIFT — a parent buying for a spouse, a
 * holiday certificate — sits far more clearly inside §1749.5. No such product
 * exists in content/pricing.json today. Decide before adding one.
 */
export const PACK_EXPIRES = false;
