/**
 * Read-only audit of a Stripe account. Creates nothing, changes nothing.
 *
 * ---------------------------------------------------------------------------
 * RUN THIS AGAINST LIVE BEFORE RUNNING THE BOOTSTRAP. IT IS THE POINT OF PHASE 0.
 * ---------------------------------------------------------------------------
 * Stripe Products and Prices cannot be deleted, only archived. A bootstrap run
 * against an account that already has a half-built catalog therefore leaves
 * permanent duplicates: two "Online Lessons · Monthly, 60 min" products, two
 * $280 prices, and a `lookup_key` sitting on whichever one won the race. Every
 * later invoice and receipt then references an object nobody can tell apart from
 * its twin, and the only remedy is archiving things by hand in the dashboard.
 *
 * So: look first. This script prints what actually exists and states plainly
 * whether each lookup_key from content/pricing.json is already there.
 *
 * Usage:
 *   npm run stripe:audit
 *
 * It uses whichever STRIPE_SECRET_KEY is loaded, and prints TEST or LIVE in the
 * header — because "I ran it against the wrong account" is the other half of the
 * same problem.
 */

import { getStripe, isLiveMode, STRIPE_API_VERSION } from '@/lib/stripe';
import { PRICES, PRODUCTS, formatUsd } from '@/lib/pricing';

const line = (char = '-') => console.log(char.repeat(78));

function heading(text: string) {
  console.log('');
  line('=');
  console.log(text);
  line('=');
}

async function main() {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error(
      'STRIPE_SECRET_KEY is not set.\n' +
        '  Put it in .env.local (gitignored via "*.local"); this script loads that file via\n' +
        '  --env-file-if-exists, see the npm script. NEVER put it in .env — that file is committed.',
    );
    process.exit(1);
  }

  const stripe = getStripe();

  heading(`STRIPE AUDIT — ${isLiveMode() ? '*** LIVE MODE ***' : 'test mode'}`);
  console.log(`API version pinned to ${STRIPE_API_VERSION} (lib/stripe.ts)`);

  /* ---------------- account ---------------- */

  // retrieveCurrent(), not retrieve(): `accounts.retrieve` requires an account
  // id (pass null for your own), while retrieveCurrent is the purpose-built
  // zero-argument call for "the account this key belongs to". Calling
  // retrieve() with no arguments is a type error and broke the build.
  const account = await stripe.accounts.retrieveCurrent();
  console.log('');
  console.log(`Account          ${account.id}`);
  console.log(`Country          ${account.country ?? 'unknown'}`);
  console.log(`Default currency ${account.default_currency ?? 'unknown'}`);
  console.log(`Charges enabled  ${account.charges_enabled}`);
  console.log(`Payouts enabled  ${account.payouts_enabled}`);
  console.log(`Onboarding done  ${account.details_submitted}`);

  const capabilities = Object.entries(account.capabilities ?? {});
  console.log(
    `Capabilities     ${capabilities.length === 0 ? 'NONE — account activation is incomplete' : ''}`,
  );
  for (const [name, status] of capabilities) console.log(`                 ${name}: ${status}`);

  if (!account.details_submitted) {
    console.log('');
    console.log('NOTE: onboarding is not complete, so no payment method capabilities are active.');
    console.log('      Which payment methods a Checkout Session offers is decided by Stripe from');
    console.log('      Dashboard → Settings → Payment methods, NOT by this codebase (no call here');
    console.log('      passes payment_method_types). ACH Direct Debit therefore appears on plans');
    console.log('      the moment it is enabled there — no deploy needed. Worth ~$70/student/year');
    console.log('      against card on a $280 plan.');
  }

  /* ---------------- products ---------------- */

  heading('PRODUCTS');

  const products: Awaited<ReturnType<typeof stripe.products.list>>['data'] = [];
  for await (const product of stripe.products.list({ limit: 100, active: undefined })) {
    products.push(product);
  }

  if (products.length === 0) {
    console.log('none — clean slate.');
  } else {
    for (const product of products) {
      console.log(`${product.active ? ' ' : '[archived] '}${product.id}`);
      console.log(`    name     ${product.name}`);
      const meta = Object.entries(product.metadata ?? {});
      if (meta.length) console.log(`    metadata ${meta.map(([k, v]) => `${k}=${v}`).join(' ')}`);
    }
  }
  console.log('');
  console.log(`content/pricing.json expects ${PRODUCTS.length} products (one per purchasable plan —`);
  console.log('see its _productModel note for why this is not 2 or 3).');

  /* ---------------- prices ---------------- */

  heading('PRICES');

  const prices: Awaited<ReturnType<typeof stripe.prices.list>>['data'] = [];
  for await (const price of stripe.prices.list({ limit: 100, active: undefined, expand: ['data.product'] })) {
    prices.push(price);
  }

  if (prices.length === 0) {
    console.log('none — clean slate.');
  } else {
    for (const price of prices) {
      const amount = price.unit_amount === null ? '(no unit_amount)' : formatUsd(price.unit_amount);
      const recurring = price.recurring ? `/${price.recurring.interval}` : ' one-time';
      const productName =
        typeof price.product === 'string'
          ? price.product
          : 'name' in price.product
            ? price.product.name
            : price.product.id;
      console.log(`${price.active ? ' ' : '[archived] '}${price.id}`);
      console.log(`    lookup_key ${price.lookup_key ?? '(none)'}`);
      console.log(`    amount     ${amount}${recurring} ${price.currency.toUpperCase()}`);
      console.log(`    product    ${productName}`);
      const meta = Object.entries(price.metadata ?? {});
      console.log(`    metadata   ${meta.length ? meta.map(([k, v]) => `${k}=${v}`).join(' ') : '(none)'}`);
    }
  }

  /* ---------------- the reconciliation that matters ---------------- */

  heading('CATALOG RECONCILIATION — content/pricing.json vs this account');

  let missing = 0;
  let mismatched = 0;

  for (const wanted of PRICES) {
    const found = prices.find((p) => p.lookup_key === wanted.lookupKey && p.active);
    if (!found) {
      missing += 1;
      console.log(`MISSING    ${wanted.lookupKey.padEnd(22)} want ${formatUsd(wanted.amountCents)}`);
      continue;
    }

    const amountOk = found.unit_amount === wanted.amountCents;
    const intervalOk = (found.recurring?.interval ?? null) === wanted.interval;
    const metaOk =
      found.metadata?.mode === wanted.mode &&
      found.metadata?.duration === String(wanted.duration) &&
      found.metadata?.type === wanted.type;

    if (amountOk && intervalOk && metaOk) {
      console.log(`OK         ${wanted.lookupKey.padEnd(22)} ${found.id} ${formatUsd(wanted.amountCents)}`);
      continue;
    }

    mismatched += 1;
    console.log(`MISMATCH   ${wanted.lookupKey.padEnd(22)} ${found.id}`);
    if (!amountOk) {
      console.log(
        `             amount   Stripe has ${
          found.unit_amount === null ? 'null' : formatUsd(found.unit_amount)
        }, JSON says ${formatUsd(wanted.amountCents)}`,
      );
    }
    if (!intervalOk) {
      console.log(
        `             interval Stripe has ${found.recurring?.interval ?? 'one-time'}, JSON says ${
          wanted.interval ?? 'one-time'
        }`,
      );
    }
    if (!metaOk) {
      console.log(
        `             metadata Stripe has ${JSON.stringify(found.metadata)}, JSON says ` +
          `{"mode":"${wanted.mode}","duration":"${wanted.duration}","type":"${wanted.type}"}`,
      );
    }
  }

  console.log('');
  console.log(
    `${PRICES.length - missing - mismatched} of ${PRICES.length} lookup_keys already correct · ` +
      `${missing} missing · ${mismatched} needing a new Price`,
  );
  if (mismatched > 0) {
    console.log('');
    console.log('A MISMATCH on amount cannot be edited: Stripe Prices are immutable. The bootstrap');
    console.log('script creates a new Price at the correct amount, moves the lookup_key onto it with');
    console.log('transfer_lookup_key, and archives the old one. It will not silently skip.');
  }

  /* ---------------- webhooks ---------------- */

  heading('WEBHOOK ENDPOINTS');

  const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
  if (endpoints.data.length === 0) {
    console.log('none.');
    console.log('');
    console.log('Nothing is wrong with that yet — locally, `stripe listen --forward-to');
    console.log('localhost:3000/api/stripe/webhook` needs no endpoint object. But NOTHING converts');
    console.log('in production without one: every conversion this project reports originates in');
    console.log('app/api/stripe/webhook/route.ts. See docs/stripe-runbook.md.');
  } else {
    for (const endpoint of endpoints.data) {
      console.log(`${endpoint.id}  [${endpoint.status}]`);
      console.log(`    url    ${endpoint.url}`);
      console.log(`    events ${endpoint.enabled_events.join(', ')}`);
    }
  }

  const REQUIRED_EVENTS = [
    'setup_intent.succeeded',
    'checkout.session.completed',
    'customer.subscription.created',
    'customer.subscription.deleted',
    'invoice.payment_failed',
    'invoice.paid',
  ];
  const covered = new Set(
    endpoints.data.flatMap((e) => (e.enabled_events.includes('*') ? REQUIRED_EVENTS : e.enabled_events)),
  );
  const uncovered = REQUIRED_EVENTS.filter((e) => !covered.has(e));
  if (endpoints.data.length > 0 && uncovered.length > 0) {
    console.log('');
    console.log(`NOT SUBSCRIBED by any endpoint: ${uncovered.join(', ')}`);
  }

  /* ---------------- portal ---------------- */

  heading('CUSTOMER PORTAL CONFIGURATIONS');

  const configs = await stripe.billingPortal.configurations.list({ limit: 100 });
  if (configs.data.length === 0) {
    console.log('none — the account default will be used until the bootstrap creates one.');
  } else {
    for (const config of configs.data) {
      console.log(`${config.id}${config.is_default ? '  [default]' : ''}  active=${config.active}`);
      console.log(`    cancel          ${config.features.subscription_cancel.enabled}`);
      console.log(`    payment method  ${config.features.payment_method_update.enabled}`);
      console.log(`    invoice history ${config.features.invoice_history.enabled}`);
      const meta = Object.entries(config.metadata ?? {});
      if (meta.length) console.log(`    metadata        ${meta.map(([k, v]) => `${k}=${v}`).join(' ')}`);
    }
  }

  heading('DONE — nothing was created or modified');
}

main().catch((error) => {
  console.error('');
  console.error('AUDIT FAILED:', error instanceof Error ? error.message : error);
  process.exit(1);
});
