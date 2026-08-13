import { EMAIL as PUBLIC_INBOX, SITE_NAME, SITE_URL } from '@/lib/site';
import { modeLabel, type LessonMode } from '@/lib/pricing';

/**
 * Transactional email.
 *
 * ---------------------------------------------------------------------------
 * PROVIDER CHOICE, AND WHY THE INTERFACE HIDES IT
 * ---------------------------------------------------------------------------
 * `vercel integration list` was run against this project before writing a line
 * of this file, and it reported "No resources found" — no email provider is
 * provisioned, so there was nothing to adopt. Resend is the default here: a
 * plain JSON REST endpoint, so it needs no SDK and adds no dependency, which
 * matters because `stripe` is the only package this phase is allowed to add.
 *
 * The provider still sits behind `send()`. Deliverability problems are the
 * normal reason to switch providers and they show up after launch, not before,
 * so the swap is a likely future edit — and when it happens it should be one
 * function, not five call sites. Every template below builds an EmailMessage and
 * hands it to send(); none of them knows Resend exists.
 *
 * ---------------------------------------------------------------------------
 * NO-OPS RATHER THAN THROWS
 * ---------------------------------------------------------------------------
 * With RESEND_API_KEY unset, send() logs a warning with the full message and
 * returns. That is deliberate in three places:
 *
 *   - `next build` must succeed with no env vars at all.
 *   - Local funnel testing with `stripe listen` should exercise the webhook
 *     logic without needing a mail account.
 *   - A Stripe webhook that throws gets retried for hours, re-running whatever
 *     ran before the throw. An email is the least important side effect in the
 *     handler and must never be the reason billing state gets replayed.
 *
 * The warning is loud and includes the body, so a missed send is visible in the
 * Vercel logs rather than silent.
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

/**
 * Resend refuses to send from a domain you have not verified, so this must be an
 * address on a domain added under Resend → Domains. `onboarding@resend.dev`
 * works for testing but only delivers to the account owner's own address, which
 * looks like success while no student ever receives anything.
 */
const FROM = process.env.EMAIL_FROM ?? `${SITE_NAME} <onboarding@resend.dev>`;

/** Where operator alerts go. Falls back to the public inbox in lib/site.ts. */
export const OPERATOR_EMAIL = process.env.OPERATOR_EMAIL ?? PUBLIC_INBOX;

export type EmailMessage = {
  to: string;
  subject: string;
  /**
   * Plain text. Required, not optional, and not derived from HTML.
   *
   * A text/plain part measurably improves deliverability — HTML-only mail scores
   * worse with spam filters — and these are transactional messages whose entire
   * job is to arrive. Writing text first also keeps the templates short.
   */
  text: string;
  html?: string;
  replyTo?: string;
};

export type SendResult = { sent: boolean; id?: string; error?: string };

/**
 * Send one message. Never throws.
 *
 * `idempotencyKey` maps to Resend's `Idempotency-Key` header, which suppresses a
 * duplicate send for 24 hours. Every caller here passes one, because Stripe
 * redelivers webhooks and a student receiving the same dunning notice four times
 * reads as a billing system out of control.
 */
export async function send(
  message: EmailMessage,
  opts: { idempotencyKey?: string } = {},
): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn(
      `[email] RESEND_API_KEY is not set — NOT SENDING.\n` +
        `  to:      ${message.to}\n` +
        `  subject: ${message.subject}\n` +
        `  ${message.text.replace(/\n/g, '\n  ')}`,
    );
    return { sent: false, error: 'RESEND_API_KEY not set' };
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
        ...(opts.idempotencyKey ? { 'idempotency-key': opts.idempotencyKey } : {}),
      },
      body: JSON.stringify({
        from: FROM,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        ...(message.html ? { html: message.html } : {}),
        // Replies from students go to a mailbox that is actually read, not to a
        // no-reply address. This is a teacher's inbox, not a SaaS product.
        reply_to: message.replyTo ?? PUBLIC_INBOX,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error(`[email] send failed (HTTP ${response.status}) to ${message.to}: ${detail}`);
      return { sent: false, error: `HTTP ${response.status}: ${detail}` };
    }

    const body = (await response.json()) as { id?: string };
    return { sent: true, id: body.id };
  } catch (error) {
    console.error(`[email] send threw for ${message.to}:`, error);
    return { sent: false, error: String(error) };
  }
}

/* ------------------------------------------------------------------ */
/* Templates                                                           */
/* ------------------------------------------------------------------ */

/**
 * NO PREMISES. None of these templates may name a street, a neighbourhood, a
 * drive time or a venue. In-person lessons happen in a private residence, and
 * the address is shared by the teacher personally once a booking is confirmed —
 * not by an automated email, and never anywhere a crawler can read it. Mode is
 * always described with modeLabel() from lib/pricing.ts.
 */

/** Sent when the $0 card hold succeeds and the assessment slot is confirmed. */
export function assessmentConfirmedEmail(args: {
  to: string;
  name: string | null;
  mode: LessonMode;
  assessmentAt: Date | null;
}): EmailMessage {
  const greeting = args.name ? `Hi ${args.name.split(' ')[0]},` : 'Hi,';
  const when = args.assessmentAt
    ? args.assessmentAt.toLocaleString('en-US', {
        dateStyle: 'full',
        timeStyle: 'short',
        timeZone: 'America/Los_Angeles',
      }) + ' (Pacific)'
    : 'the time you selected';

  return {
    to: args.to,
    subject: 'Your vocal assessment is confirmed',
    text: [
      greeting,
      '',
      `Your free 30-minute vocal assessment is confirmed for ${when}.`,
      `Format: ${modeLabel(args.mode)}.`,
      '',
      // Restating this is not padding. The card was collected on a $0 checkout
      // and the charge appears as a temporary authorisation on some banks'
      // statements; a student who sees that and was not told plainly will
      // dispute it, and a dispute on a $0 hold costs the account more than the
      // lesson is worth.
      'Your card was saved to hold the slot and has NOT been charged. The assessment is free.',
      'If you need to reschedule or cancel, just reply to this email.',
      '',
      args.mode === 'inperson'
        ? 'For in-person lessons I will send you the details privately before your session.'
        : 'I will send you the video call link before your session.',
      '',
      'Looking forward to hearing you sing,',
      'Juliana',
    ].join('\n'),
  };
}

/** The one-click plan link, sent after the assessment. The conversion moment. */
export function planLinkEmail(args: {
  to: string;
  name: string | null;
  mode: LessonMode;
  planLinkUrl: string;
}): EmailMessage {
  const greeting = args.name ? `Hi ${args.name.split(' ')[0]},` : 'Hi,';
  return {
    to: args.to,
    subject: 'Your lesson plan — one click to start',
    text: [
      greeting,
      '',
      'Thank you for your assessment. Here is the link to start your monthly plan:',
      '',
      args.planLinkUrl,
      '',
      `Format: ${modeLabel(args.mode)}. Your card is already on file, so there is nothing to re-enter.`,
      // Both facts belong in the email rather than only on the page: this is the
      // message a student forwards to a parent or a partner before deciding.
      'Your first payment is a week after your assessment, not today. You can cancel any time.',
      '',
      'Any questions, just reply.',
      'Juliana',
    ].join('\n'),
  };
}

/**
 * Dunning: a payment failed.
 *
 * Written to be recoverable rather than punitive. Stripe Smart Retries will keep
 * trying for about two weeks on its own, so the useful content of this email is
 * "here is the link to fix it", not a warning. The lesson is not cancelled —
 * pulling a student's lesson over one declined card loses the whole remaining
 * LTV over one month's fee.
 */
export function paymentFailedEmail(args: {
  to: string;
  name: string | null;
  amountDue: string;
  invoiceUrl: string | null;
}): EmailMessage {
  const greeting = args.name ? `Hi ${args.name.split(' ')[0]},` : 'Hi,';
  return {
    to: args.to,
    subject: 'Your lesson payment did not go through',
    text: [
      greeting,
      '',
      `Your card was declined for ${args.amountDue}. This is usually an expiry date or a bank block, not you.`,
      '',
      ...(args.invoiceUrl ? ['You can pay or update your card here:', '', args.invoiceUrl, ''] : []),
      'Your lessons continue as normal in the meantime — nothing is cancelled.',
      'If it is easier to sort out by message, just reply.',
      '',
      'Juliana',
    ].join('\n'),
  };
}

/**
 * The Google review request, three weeks after a student's first paid month.
 *
 * Reviews are the dominant local ranking factor for a service business, and a
 * student who has just paid for a second month is at their most positive. Three
 * weeks in is late enough to have real progress to describe and early enough
 * that the initial enthusiasm has not faded.
 */
export function reviewRequestEmail(args: {
  to: string;
  name: string | null;
  reviewUrl: string;
}): EmailMessage {
  const greeting = args.name ? `Hi ${args.name.split(' ')[0]},` : 'Hi,';
  return {
    to: args.to,
    subject: 'A quick favour?',
    text: [
      greeting,
      '',
      'You have been working with me for about a month now, and I hope you are hearing the difference.',
      '',
      'If you have two minutes, a short Google review genuinely helps other singers find me:',
      '',
      args.reviewUrl,
      '',
      // No incentive is offered, ever. Google's review policies prohibit
      // incentivised reviews and enforcement is by listing suspension.
      'Whatever you write is fine — even one sentence. And if something has not been working, ' +
        'I would much rather hear it from you directly, so reply instead.',
      '',
      'Thank you,',
      'Juliana',
    ].join('\n'),
  };
}

/**
 * Operator alert. Goes to the teacher, not the student.
 *
 * Exists because there is no admin dashboard and no error monitoring on this
 * project: for anything that needs a human, email IS the alerting channel.
 */
export function operatorAlertEmail(args: { subject: string; lines: string[] }): EmailMessage {
  return {
    to: OPERATOR_EMAIL,
    subject: `[juliana-beltran.com] ${args.subject}`,
    text: [...args.lines, '', `Stripe dashboard: https://dashboard.stripe.com`, `Site: ${SITE_URL}`].join(
      '\n',
    ),
  };
}
