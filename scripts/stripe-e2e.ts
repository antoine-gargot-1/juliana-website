/**
 * End-to-end funnel test against the TEST-MODE Stripe account.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS PROVES THAT NOTHING ELSE CAN
 * ---------------------------------------------------------------------------
 * The two most expensive failures in this codebase are both silent:
 *
 *   1. `proration_behavior: 'none'` going missing from startPlan(), which makes
 *      Stripe charge the student on day zero instead of a week after their
 *      assessment. No error, no warning — money simply moves on the wrong day.
 *   2. A webhook handler that verifies but does the wrong thing, so conversions
 *      never reach GA4 while every delivery shows 200 in the dashboard.
 *
 * Neither is catchable by typecheck or by reading the code. This script walks the
 * real objects: it creates a Stripe TEST CLOCK, runs the $0 SetupIntent hold,
 * starts a plan, asserts there is NO non-zero invoice before the anchor, then
 * advances the clock past the anchor and asserts the first real invoice is the
 * full month. It signs synthetic webhook payloads with the real
 * STRIPE_WEBHOOK_SECRET and posts them at a locally running dev server, so the
 * signature path, the idempotency path and the replay path are all exercised.
 *
 * PREREQUISITES — it fails fast and unhelpfully without these:
 *   - `npm run dev` running on localhost:3000
 *   - STRIPE_SECRET_KEY (test), STRIPE_WEBHOOK_SECRET, CRON_SECRET and
 *     CALCOM_WEBHOOK_SECRET set in .env.local
 *
 * Run with: npm run stripe:e2e
 *
 * It creates real test-mode Customers, Subscriptions and Test Clocks. They are
 * left behind on purpose — reading them in the dashboard afterwards is half the
 * value — and are free to delete. NEVER run this against a live key: it would
 * create live subscriptions. It does not guard on isLiveMode() because the test
 * clock API is test-mode-only and Stripe will refuse it anyway.
 */

import Stripe from 'stripe';
import { getStripe, subscriptionIdFromInvoice } from '@/lib/stripe';
import { startPlan } from '@/lib/booking';
import { getStudent, retentionMonths } from '@/lib/students';
import { formatUsd } from '@/lib/pricing';

const stripe = getStripe();
const WH = process.env.STRIPE_WEBHOOK_SECRET!;
const URL_ = 'http://localhost:3000/api/stripe/webhook';
const ok = (b: boolean) => (b ? 'PASS' : '**FAIL**');

async function post(type: string, object: unknown, label = type) {
  const payload = JSON.stringify({
    id: `evt_test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    object: 'event', api_version: '2026-07-29.dahlia',
    created: Math.floor(Date.now() / 1000),
    type, data: { object }, livemode: false, pending_webhooks: 0,
    request: { id: null, idempotency_key: null },
  });
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret: WH });
  const res = await fetch(URL_, { method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': header }, body: payload });
  console.log(`   POST ${label} -> HTTP ${res.status} ${await res.text()}`);
  return res.status;
}

async function waitClock(id: string) {
  for (let i = 0; i < 60; i++) {
    const c = await stripe.testHelpers.testClocks.retrieve(id);
    if (c.status === 'ready') return c;
    if (c.status === 'internal_failure') throw new Error('test clock internal_failure');
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error('test clock never became ready');
}

async function scenario(card: string, label: string) {
  console.log(`\n${'='.repeat(70)}\nSCENARIO: ${label} (${card})\n${'='.repeat(70)}`);
  const now = new Date();
  const clock = await stripe.testHelpers.testClocks.create({ frozen_time: Math.floor(now.getTime() / 1000), name: label });
  const uid = `e2e-${Date.now()}`;

  const customer = await stripe.customers.create({
    email: `e2e-${Date.now()}@example.com`, name: 'E2E Student', test_clock: clock.id,
    metadata: { mode: 'online', funnel_stage: 'booked', ga_client_id: '555.666', gclid: 'GCLID_E2E',
      utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'la-local',
      booking_uid: uid, assessment_at: now.toISOString() },
  });
  console.log(`customer ${customer.id}  clock ${clock.id}`);

  console.log('\n1) SetupIntent (the $0 card hold)');
  const si = await stripe.setupIntents.create({
    customer: customer.id, payment_method: card, confirm: true, usage: 'off_session',
    automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
    metadata: { kind: 'assessment_hold', booking_uid: uid, mode: 'online', assessment_at: now.toISOString() },
  });
  console.log(`   ${si.id} status=${si.status}  ${ok(si.status === 'succeeded')}`);
  await post('setup_intent.succeeded', si);

  const afterSi = await stripe.customers.retrieve(customer.id) as Stripe.Customer;
  const dpm = afterSi.invoice_settings?.default_payment_method;
  console.log(`   default_payment_method set: ${ok(Boolean(dpm))} (${typeof dpm === 'string' ? dpm : dpm?.id})`);
  console.log(`   conv_assessment_booked stamped: ${ok(Boolean(afterSi.metadata?.conv_assessment_booked))}`);

  console.log('\n   replay the SAME event (GA4 must NOT double-count)');
  await post('setup_intent.succeeded', si, 'setup_intent.succeeded [replay]');

  console.log('\n2) startPlan — anchor = assessment + 7d, proration_behavior none');
  const started = await startPlan({ customerId: customer.id, lookupKey: 'online_monthly_60', assessmentAt: now });
  const anchor = started.subscription.billing_cycle_anchor;
  console.log(`   ${started.subscription.id} status=${started.subscription.status}`);
  console.log(`   anchor ${new Date(anchor * 1000).toISOString()} (expected ~${started.firstChargeAt.toISOString()})`);
  console.log(`   anchor is +7d: ${ok(Math.abs(anchor * 1000 - (now.getTime() + 7 * 86400000)) < 120000)}`);

  const pre = await stripe.invoices.list({ customer: customer.id, limit: 20 });
  const preNonZero = pre.data.filter((i) => i.amount_due > 0);
  console.log(`   invoices now=${pre.data.length}, non-zero=${preNonZero.length}`);
  console.log(`   *** NO DAY-ZERO CHARGE: ${ok(preNonZero.length === 0)} ***`);
  for (const i of pre.data) console.log(`      ${i.id} amount_due=${i.amount_due} status=${i.status} billing_reason=${i.billing_reason}`);
  await post('customer.subscription.created', started.subscription);

  console.log('\n3) advance clock past the anchor');
  // advance(id, params) — the id is a POSITIONAL argument, not a field in the
  // body. Calling it with one object argument type-errors, and the `as never`
  // cast that used to be here silenced the error rather than fixing it.
  await stripe.testHelpers.testClocks.advance(clock.id, { frozen_time: anchor + 7200 });
  await waitClock(clock.id);
  await new Promise((r) => setTimeout(r, 4000));

  const post_ = await stripe.invoices.list({ customer: customer.id, limit: 20 });
  console.log(`   invoices after=${post_.data.length}`);
  for (const i of post_.data) {
    console.log(`      ${i.id} amount_due=${formatUsd(i.amount_due)} amount_paid=${formatUsd(i.amount_paid)} status=${i.status} reason=${i.billing_reason} sub=${subscriptionIdFromInvoice(i) ?? 'none'}`);
  }
  const first = post_.data.find((i) => i.amount_due > 0);
  if (first) {
    console.log(`   first charge amount is $280: ${ok(first.amount_due === 28000)}`);
    console.log(`   subscriptionIdFromInvoice resolves: ${ok(Boolean(subscriptionIdFromInvoice(first)))}`);
    if (first.status === 'paid') {
      await post('invoice.paid', first);
      console.log(`   retentionMonths=${await retentionMonths(customer.id)} ${ok((await retentionMonths(customer.id)) === 1)}`);
      const s = await getStudent(customer.id);
      console.log(`   stage=${s.stage} firstPaidAt=${s.firstPaidAt?.toISOString()} ${ok(s.stage === 'active' && Boolean(s.firstPaidAt))}`);
    } else {
      console.log(`   invoice NOT paid (status=${first.status}) — dunning path`);
      await post('invoice.payment_failed', first);
      const s = await getStudent(customer.id);
      console.log(`   retentionMonths=${await retentionMonths(customer.id)} ${ok((await retentionMonths(customer.id)) === 0)}`);
      console.log(`   stage stayed ${s.stage}`);
    }
  } else {
    console.log('   **FAIL** no invoice was generated after the anchor');
  }
  return customer.id;
}

async function main() {
  await scenario('pm_card_visa', 'success 4242');
  await scenario('pm_card_chargeCustomerFail', 'attaches then fails on charge (dunning)');

  console.log(`\n${'='.repeat(70)}\nCRON AUTH\n${'='.repeat(70)}`);
  const c = 'http://localhost:3000/api/cron/review-requests';
  const noauth = await fetch(c);
  console.log(`   no header        -> ${noauth.status} ${ok(noauth.status === 401)}`);
  const bad = await fetch(c, { headers: { authorization: 'Bearer wrong' } });
  console.log(`   wrong secret     -> ${bad.status} ${ok(bad.status === 401)}`);
  const good = await fetch(c, { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } });
  console.log(`   correct secret   -> ${good.status} ${await good.text()} ${ok(good.status === 200)}`);

  console.log(`\n${'='.repeat(70)}\nCALCOM WEBHOOK AUTH\n${'='.repeat(70)}`);
  const cal = 'http://localhost:3000/api/calcom/webhook';
  const body = JSON.stringify({ triggerEvent: 'BOOKING_CREATED', createdAt: new Date().toISOString(), payload: { uid: 'x', startTime: new Date().toISOString(), attendees: [{ email: 'nobody@example.com', name: 'N', timeZone: 'Europe/Madrid' }], eventTypeId: 6654042 } });
  const unsigned = await fetch(cal, { method: 'POST', headers: { 'content-type': 'application/json' }, body });
  console.log(`   unsigned         -> ${unsigned.status} ${ok(unsigned.status === 401)}`);
  const { createHmac } = await import('node:crypto');
  const sig = createHmac('sha256', process.env.CALCOM_WEBHOOK_SECRET!).update(body, 'utf8').digest('hex');
  const signed = await fetch(cal, { method: 'POST', headers: { 'content-type': 'application/json', 'x-cal-signature-256': sig }, body });
  console.log(`   signed           -> ${signed.status} ${await signed.text()} ${ok(signed.status === 200)}`);
  const tampered = await fetch(cal, { method: 'POST', headers: { 'content-type': 'application/json', 'x-cal-signature-256': sig }, body: body.replace('nobody', 'someone') });
  console.log(`   tampered body    -> ${tampered.status} ${ok(tampered.status === 401)}`);

  console.log('\nBAD STRIPE SIGNATURE');
  const res = await fetch(URL_, { method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': 't=1,v1=deadbeef' }, body: '{}' });
  console.log(`   -> ${res.status} ${ok(res.status === 400)}`);
}
main().catch((e) => { console.error('E2E FAILED:', e); process.exit(1); });
