/**
 * Push content/pricing.json into Stripe. Idempotent. Safe to re-run.
 *
 * ---------------------------------------------------------------------------
 * RUN scripts/stripe-audit.ts FIRST, ESPECIALLY AGAINST LIVE
 * ---------------------------------------------------------------------------
 * Products and Prices cannot be deleted from a Stripe account, only archived. A
 * duplicate is therefore permanent, and unwinding one means archiving objects by
 * hand while live invoices still reference them.
 *
 * ---------------------------------------------------------------------------
 * WHAT "IDEMPOTENT" MEANS HERE, AND WHY IT IS MORE THAN "SKIP IF EXISTS"
 * ---------------------------------------------------------------------------
 * Resolution is by `lookup_key`, never by name and never by list position. Three
 * outcomes per price, and the third is the one naive scripts get wrong:
 *
 *   absent            create it.
 *   present, correct  leave it alone (metadata is patched in place if it drifted;
 *                     metadata IS mutable, unlike amount).
 *   present, WRONG AMOUNT
 *                     A Stripe Price is immutable — the amount cannot be edited.
 *                     Skipping would leave the site advertising one price and
 *                     Stripe charging another, which is the worst possible
 *                     failure for a pricing page and produces no error anywhere.
 *                     So: create a new Price at the correct amount, move the
 *                     lookup_key onto it with `transfer_lookup_key: true`, and
 *                     archive the old one. Existing subscriptions keep billing
 *                     the archived Price, which is correct — a price change
 *                     should not silently re-price current students.
 *
 * Usage:
 *   npm run stripe:bootstrap -- --dry-run     # read-only; prints the plan
 *   npm run stripe:bootstrap                  # apply
 *   npm run stripe:bootstrap -- --skip-portal # catalog only
 */

import Stripe from 'stripe';
import { getStripe, isLiveMode } from '@/lib/stripe';
import { PRICES, PRODUCTS, formatUsd, type Price } from '@/lib/pricing';

const DRY_RUN = process.argv.includes('--dry-run');
const SKIP_PORTAL = process.argv.includes('--skip-portal');

/** Marks the objects this script manages, so it can find its own Portal config. */
const MANAGED_BY = 'juliana-website';

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
/* Products                                                            */
/* ------------------------------------------------------------------ */

/**
 * Product ids are set explicitly to the catalog key rather than letting Stripe
 * generate `prod_…`.
 *
 * Two reasons. Idempotency becomes a single `retrieve(id)` instead of a
 * name-matching heuristic — and matching on name would be genuinely fragile
 * here, because these names are marketing copy that will get edited. And the
 * dashboard becomes readable: a line item reading `inperson_monthly_30` tells
 * the operator exactly which plan it is, where `prod_QxKm2…` tells them nothing.
 *
 * The cost: a product id is permanent, so renaming a lookupKey in
 * content/pricing.json later leaves an orphaned product behind. Accepted — the
 * keys are structural (`mode_type_duration`), not copy, so they should not churn.
 */
async function ensureProducts(stripe: Stripe): Promise<void> {
  heading('PRODUCTS');
  console.log(
    `${PRODUCTS.length} expected — one per purchasable plan. See the _productModel note in\n` +
      'content/pricing.json for why this is not two products with several prices each:\n' +
      'Checkout and invoices render the PRODUCT name on each line, so collapsing them would make\n' +
      'a 30-minute monthly receipt read identically to a 10-lesson pack.',
  );
  console.log('');

  for (const product of PRODUCTS) {
    let existing: Stripe.Product | null = null;
    try {
      existing = await stripe.products.retrieve(product.key);
    } catch (error) {
      if (!(error instanceof Stripe.errors.StripeInvalidRequestError && error.statusCode === 404)) {
        throw error;
      }
    }

    if (!existing) {
      act(`CREATE product ${product.key} — "${product.name}"`);
      if (!DRY_RUN) {
        await stripe.products.create(
          {
            id: product.key,
            name: product.name,
            description: product.description,
            metadata: { managed_by: MANAGED_BY, catalog_key: product.key },
          },
          { idempotencyKey: `product:${product.key}` },
        );
      }
      continue;
    }

    // Name and description ARE mutable, so copy edits in the JSON propagate on
    // the next run instead of needing a dashboard visit.
    const nameDrift = existing.name !== product.name;
    const descDrift = (existing.description ?? '') !== product.description;
    const inactive = !existing.active;

    if (nameDrift || descDrift || inactive) {
      act(`UPDATE product ${product.key}`);
      if (nameDrift) note(`name: "${existing.name}" -> "${product.name}"`);
      if (descDrift) note('description updated from content/pricing.json');
      if (inactive) note('reactivating (it was archived)');
      if (!DRY_RUN) {
        await stripe.products.update(product.key, {
          name: product.name,
          description: product.description,
          active: true,
          metadata: { managed_by: MANAGED_BY, catalog_key: product.key },
        });
      }
    } else {
      console.log(`OK     product ${product.key}`);
    }
  }

  console.log('');
  console.log('The "assessment" product carries no Price on purpose: the free assessment is $0 and');
  console.log('is collected with a SetupIntent (Checkout mode:"setup"), which has no amount at all.');
  console.log('It exists so the assessment appears as a named thing in the dashboard rather than as');
  console.log('an unexplained zero-value SetupIntent.');
}

/* ------------------------------------------------------------------ */
/* Prices                                                              */
/* ------------------------------------------------------------------ */

/** Every Price carries these, so a webhook can reason about a price it did not create. */
const priceMetadata = (price: Price) => ({
  mode: price.mode,
  duration: String(price.duration),
  type: price.type,
  lessons: String(price.lessons),
  managed_by: MANAGED_BY,
});

async function ensurePrices(stripe: Stripe): Promise<void> {
  heading('PRICES');

  for (const wanted of PRICES) {
    // Resolution is by lookup_key. Never by name — names are copy — and never by
    // list position.
    const found = (
      await stripe.prices.list({ lookup_keys: [wanted.lookupKey], active: true, limit: 1 })
    ).data[0];

    const createParams: Stripe.PriceCreateParams = {
      product: wanted.product,
      currency: 'usd',
      unit_amount: wanted.amountCents,
      lookup_key: wanted.lookupKey,
      nickname: wanted.name,
      metadata: priceMetadata(wanted),
      ...(wanted.interval ? { recurring: { interval: wanted.interval } } : {}),
    };

    if (!found) {
      act(`CREATE price ${wanted.lookupKey} @ ${formatUsd(wanted.amountCents)}${wanted.interval ? '/mo' : ''}`);
      if (!DRY_RUN) {
        await stripe.prices.create(createParams, { idempotencyKey: `price:${wanted.lookupKey}:${wanted.amountCents}` });
      }
      continue;
    }

    const amountOk = found.unit_amount === wanted.amountCents;
    const intervalOk = (found.recurring?.interval ?? null) === wanted.interval;
    const productOk =
      (typeof found.product === 'string' ? found.product : found.product.id) === wanted.product;

    if (amountOk && intervalOk && productOk) {
      // Metadata is the one mutable part, so drift is repaired in place.
      const want = priceMetadata(wanted);
      const drifted = Object.entries(want).some(([k, v]) => found.metadata?.[k] !== v);
      if (drifted) {
        act(`UPDATE price ${wanted.lookupKey} metadata (amount unchanged)`);
        note(`have ${JSON.stringify(found.metadata)}`);
        note(`want ${JSON.stringify(want)}`);
        if (!DRY_RUN) await stripe.prices.update(found.id, { metadata: want });
      } else {
        console.log(`OK     price ${wanted.lookupKey} ${found.id} ${formatUsd(found.unit_amount ?? 0)}`);
      }
      continue;
    }

    /*
     * IMMUTABLE FIELD CHANGED. This is the branch that must not be a silent skip.
     *
     * Amount, currency, interval and product are all fixed at creation. The only
     * correct move is a new Price with the lookup_key transferred onto it —
     * `transfer_lookup_key: true` is what makes the switchover atomic, because a
     * lookup_key is unique per account and Stripe would otherwise reject the
     * create. Everything in the app resolves by lookup_key, so the site starts
     * charging the new amount with no deploy and no price ID anywhere to update.
     *
     * The old Price is then archived, not deleted (Stripe cannot delete it).
     * Subscriptions already on it keep billing it, which is deliberate: raising
     * the rate card should not silently re-price existing students.
     */
    act(`REPLACE price ${wanted.lookupKey} (immutable field changed)`);
    if (!amountOk) {
      note(
        `amount   ${found.unit_amount === null ? 'null' : formatUsd(found.unit_amount)} -> ${formatUsd(
          wanted.amountCents,
        )}`,
      );
    }
    if (!intervalOk) {
      note(`interval ${found.recurring?.interval ?? 'one-time'} -> ${wanted.interval ?? 'one-time'}`);
    }
    if (!productOk) {
      note(
        `product  ${typeof found.product === 'string' ? found.product : found.product.id} -> ${wanted.product}`,
      );
    }
    note(`new Price created with transfer_lookup_key, old Price ${found.id} archived`);
    note('EXISTING SUBSCRIPTIONS KEEP THE OLD PRICE — migrate them deliberately if that is wanted.');

    if (!DRY_RUN) {
      /*
       * A DIFFERENT idempotency key from the create-from-nothing path above, and
       * this is not cosmetic — it was a real failure the first time this branch
       * ran for real:
       *
       *   Keys for idempotent requests can only be used with the same parameters
       *   they were first used with.
       *
       * The plain create had already used `price:<key>:<amount>`. This request
       * sends the same body PLUS `transfer_lookup_key: true`, so Stripe rejected
       * the replay outright — which would have left the stale Price still holding
       * the lookup_key and the script dead in the middle of a price change.
       *
       * Keyed on the Price being replaced instead. Retrying the same replacement
       * is idempotent; replacing a different stale Price gets its own key.
       */
      await stripe.prices.create(
        { ...createParams, transfer_lookup_key: true },
        { idempotencyKey: `price-replace:${found.id}:${wanted.amountCents}` },
      );
      await stripe.prices.update(found.id, { active: false });
    }
  }

  await archiveOrphanedPrices(stripe);
}

/**
 * Archive any ACTIVE Price on a managed Product that does not hold one of our
 * lookup_keys.
 *
 * WHY THIS EXISTS — it caught a real orphan on the first live run.
 *
 * The replace branch above is two API calls: create-with-transfer_lookup_key,
 * then archive-the-old-one. Those are not atomic and cannot be made atomic.
 * If the process dies in between — a crash, a network failure, or in the case
 * that motivated this, the run being killed partway — the lookup_key has
 * already moved to the new Price while the old one is left ACTIVE and keyless.
 *
 * Nothing downstream would notice. The app resolves purely by lookup_key, so
 * the site keeps working and the leak is invisible from the outside. But the
 * Dashboard then shows two active Prices at the same amount on one Product, and
 * a human building a subscription by hand can pick the unmanaged one, which
 * silently escapes the rate card this repo is supposed to be the source of
 * truth for. Stripe cannot delete Prices, so orphans accumulate permanently.
 *
 * This sweep makes the whole script converge rather than merely apply: running
 * it twice always ends in the same clean state regardless of how a previous run
 * died. It is deliberately conservative — it only touches Products this file
 * manages, so a Price created for something else in this account is left alone.
 */
async function archiveOrphanedPrices(stripe: Stripe): Promise<void> {
  const managedProducts = new Set(PRICES.map((p) => p.product));
  const expectedKeys = new Set(PRICES.map((p) => p.lookupKey));
  const orphans: Stripe.Price[] = [];

  for await (const price of stripe.prices.list({ active: true, limit: 100 })) {
    const productId = typeof price.product === 'string' ? price.product : price.product.id;
    if (!managedProducts.has(productId)) continue;
    if (price.lookup_key && expectedKeys.has(price.lookup_key)) continue;
    orphans.push(price);
  }

  if (orphans.length === 0) {
    console.log('OK     no orphaned active Prices on managed Products');
    return;
  }

  for (const orphan of orphans) {
    const productId =
      typeof orphan.product === 'string' ? orphan.product : orphan.product.id;
    act(`ARCHIVE orphaned price ${orphan.id} on ${productId}`);
    note(
      `${formatUsd(orphan.unit_amount ?? 0)}${orphan.recurring ? '/mo' : ''}, ` +
        `lookup_key ${orphan.lookup_key ?? 'none'} — not in the rate card`,
    );
    note('almost certainly a replace that created the new Price but never archived the old one');
    if (!DRY_RUN) {
      await stripe.prices.update(orphan.id, {
        active: false,
        metadata: {
          ...orphan.metadata,
          archived_by: 'stripe-bootstrap',
          archived_reason: 'orphaned: active Price on a managed Product with no rate-card lookup_key',
        },
      });
    }
  }
}

/* ------------------------------------------------------------------ */
/* Customer Portal                                                     */
/* ------------------------------------------------------------------ */

/**
 * The Customer Portal is the whole of the student's self-service surface.
 *
 * /coach/account redirects to it, which is why there is no account UI, no login
 * and no password reset anywhere in this repo. Stripe hosts it, Stripe keeps it
 * PCI-compliant, and the cost is that its capabilities are a configuration
 * rather than something we can code around.
 *
 * ---------------------------------------------------------------------------
 * WHAT IS ENABLED, AND THE ONE THING THAT CANNOT BE
 * ---------------------------------------------------------------------------
 * cancel               enabled, at_period_end, proration_behavior 'none'.
 *                      "Cancel anytime" is a promise made on the pricing page, so
 *                      it has to be true without emailing anyone. At period end
 *                      rather than immediately because the student has already
 *                      paid for the month's lessons and should get them.
 * payment method       enabled. This is the self-service fix for the dunning
 *                      path, and the reason a declined card does not need the
 *                      teacher to intervene.
 * invoice history      enabled. Receipts, for students expensing lessons.
 * customer_update      name and email only. NOT address: this business has no
 *                      premises and does not ship anything, so collecting
 *                      addresses would be gathering data with no purpose.
 * subscription_update  DISABLED, deliberately. Switching between a 60- and a
 *                      30-minute plan changes the length of a recurring calendar
 *                      slot, and a self-serve dropdown cannot rearrange the
 *                      teacher's week. That conversation has to reach a human.
 *
 * PAUSE CANNOT BE CONFIGURED HERE. The plan called for "one free 1-month pause
 * per year" as a Portal setting, and that is no longer possible: Stripe removed
 * `features.subscription_pause` from the Portal Configuration API, and it is
 * absent from the current SDK types. Pausing is still available — but only
 * operator-side, via `subscriptions.update(id, { pause_collection: … })`. The
 * promise can still be honoured; it just cannot be self-served. Documented in
 * docs/stripe-runbook.md.
 */
const PORTAL_HEADLINE = 'Manage your lessons with Juliana Beltran';

/** Set-equality on a string list, so option order in the JSON is not a diff. */
const sameSet = (a: readonly string[] = [], b: readonly string[] = []) =>
  a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|');

/**
 * Does the live Portal configuration already say what we want it to say?
 *
 * Compares only the fields this script sets. Anything the operator changed in the
 * dashboard that we do not manage is deliberately ignored rather than reverted.
 */
function portalMatches(
  live: Stripe.BillingPortal.Configuration,
  wanted: Stripe.BillingPortal.ConfigurationCreateParams.Features,
  headline: string,
): boolean {
  const cancel = live.features.subscription_cancel;
  const wantedCancel = wanted.subscription_cancel;

  return (
    live.business_profile.headline === headline &&
    live.features.customer_update.enabled === wanted.customer_update?.enabled &&
    sameSet(
      live.features.customer_update.allowed_updates,
      (wanted.customer_update?.allowed_updates ?? []) as string[],
    ) &&
    live.features.invoice_history.enabled === wanted.invoice_history?.enabled &&
    live.features.payment_method_update.enabled === wanted.payment_method_update?.enabled &&
    live.features.subscription_update.enabled === wanted.subscription_update?.enabled &&
    cancel.enabled === wantedCancel?.enabled &&
    cancel.mode === wantedCancel?.mode &&
    cancel.proration_behavior === wantedCancel?.proration_behavior &&
    cancel.cancellation_reason.enabled === wantedCancel?.cancellation_reason?.enabled &&
    sameSet(
      cancel.cancellation_reason.options,
      (wantedCancel?.cancellation_reason?.options ?? []) as string[],
    )
  );
}

async function ensurePortalConfiguration(stripe: Stripe): Promise<void> {
  heading('CUSTOMER PORTAL CONFIGURATION');

  const features: Stripe.BillingPortal.ConfigurationCreateParams.Features = {
    customer_update: { enabled: true, allowed_updates: ['name', 'email'] },
    invoice_history: { enabled: true },
    payment_method_update: { enabled: true },
    subscription_cancel: {
      enabled: true,
      mode: 'at_period_end',
      proration_behavior: 'none',
      cancellation_reason: {
        enabled: true,
        // Asked because churn reason is the only churn data this business will
        // ever collect — there is no exit survey and no admin UI to build one in.
        options: ['too_expensive', 'missing_features', 'switched_service', 'unused', 'other'],
      },
    },
    subscription_update: { enabled: false },
  };

  const existing = (await stripe.billingPortal.configurations.list({ limit: 100 })).data.find(
    (config) => config.metadata?.managed_by === MANAGED_BY,
  );

  if (existing) {
    /*
     * Compared field by field before writing, so a second run reports no change.
     *
     * Unconditionally PATCHing would be harmless to Stripe but would make this
     * script permanently non-idempotent in its own output — and the whole value
     * of "a second run prints nothing" is that it is a usable signal. Once one
     * line always appears, nobody reads the list, and a genuine unexpected change
     * hides in it.
     */
    if (portalMatches(existing, features, PORTAL_HEADLINE)) {
      console.log(`OK     portal configuration ${existing.id}`);
    } else {
      act(`UPDATE portal configuration ${existing.id}`);
      if (!DRY_RUN) {
        await stripe.billingPortal.configurations.update(existing.id, {
          features,
          business_profile: { headline: PORTAL_HEADLINE },
        });
      }
    }
  } else {
    act('CREATE portal configuration');
    if (!DRY_RUN) {
      const created = await stripe.billingPortal.configurations.create({
        features,
        business_profile: { headline: PORTAL_HEADLINE },
        metadata: { managed_by: MANAGED_BY },
      });
      note(`id ${created.id}`);
    }
  }

  console.log('');
  console.log('PAUSE IS NOT IN THIS CONFIG, AND CANNOT BE.');
  console.log('  Stripe removed features.subscription_pause from the Portal Configuration API; it is');
  console.log('  absent from the SDK types this repo builds against. The "one free 1-month pause per');
  console.log('  year" policy is still keepable, but only operator-side:');
  console.log('');
  console.log('    stripe subscriptions update sub_xxx \\');
  console.log('      --pause-collection[behavior]=void \\');
  console.log('      --pause-collection[resumes-at]=<unix-timestamp>');
  console.log('');
  console.log('  Use behavior=void (not keep_as_draft) so the paused month is never invoiced at all.');
}

/* ------------------------------------------------------------------ */
/* Dashboard settings this script cannot touch                         */
/* ------------------------------------------------------------------ */

function printDashboardReminders(): void {
  heading('DASHBOARD SETTINGS — NOT SETTABLE BY API, CHECK THEM BY HAND');

  console.log('1. SMART RETRIES — must be ON.');
  console.log('   Settings → Billing → Subscriptions and emails → Manage failed payments.');
  console.log('   Stripe retries declined cards on a schedule derived from its own data about when');
  console.log('   retries succeed. Without it, one expired card at month three ends a ~$2,520 LTV');
  console.log('   relationship over a $280 invoice. app/api/stripe/webhook/route.ts deliberately');
  console.log('   implements NO retry logic of its own — hand-rolled retries on top of Smart Retries');
  console.log('   double-charge and trip fraud rules.');
  console.log('');
  console.log('2. STRIPE TAX — must be OFF.');
  console.log('   Private music instruction is generally not taxable in California. That is the');
  console.log('   accountant\'s determination, not an assumption for code to bake in either way, so');
  console.log('   no call in this repo passes automatic_tax.');
  console.log('   Know the trap in both directions: automatic_tax {enabled:true} with no active tax');
  console.log('   registration does NOT error — it computes and collects nothing, silently. An');
  console.log('   operator who switched it on believing they were now compliant would get no signal');
  console.log('   that they were not.');
  console.log('');
  console.log('3. PAYMENT METHODS — enable ACH Direct Debit, and rank it above card.');
  console.log('   Settings → Payment methods.');
  console.log('   No call in this repo passes payment_method_types, so this Dashboard setting is what');
  console.log('   decides which methods appear and in what order. ACH is 0.8% capped at $5 (~$4.20 on');
  console.log('   a $280 plan) against 2.9% + 30c (~$10.08) — about $70 per student per year.');
  console.log('   It requires completed account activation. The free assessment stays card-only');
  console.log('   regardless, via excluded_payment_method_types in lib/booking.ts: a bank mandate at');
  console.log('   that step adds minutes of friction to the one moment that must be frictionless.');
  console.log('');
  console.log('4. WEBHOOK ENDPOINT — create it for each deployed environment.');
  console.log('   Developers → Webhooks → Add endpoint → https://<host>/api/stripe/webhook');
  console.log('   Events: setup_intent.succeeded, checkout.session.completed,');
  console.log('           customer.subscription.created, customer.subscription.deleted,');
  console.log('           invoice.payment_failed, invoice.paid');
  console.log('   Then copy the signing secret to STRIPE_WEBHOOK_SECRET. Every conversion this');
  console.log('   project reports originates there; without it the ad account is blind.');
}

/* ------------------------------------------------------------------ */

async function main() {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error(
      'STRIPE_SECRET_KEY is not set. Put it in .env.local — NEVER in .env, which is committed.',
    );
    process.exit(1);
  }

  const stripe = getStripe();

  heading(
    `STRIPE BOOTSTRAP — ${isLiveMode() ? '*** LIVE MODE ***' : 'test mode'}${DRY_RUN ? ' — DRY RUN' : ''}`,
  );
  if (DRY_RUN) {
    console.log('Nothing will be created or modified. Reads only.');
  } else if (isLiveMode()) {
    console.log('WRITING TO THE LIVE ACCOUNT. Products and Prices cannot be deleted afterwards,');
    console.log('only archived. If you have not run `npm run stripe:audit` against live, stop now.');
  }

  await ensureProducts(stripe);
  await ensurePrices(stripe);
  if (SKIP_PORTAL) {
    heading('CUSTOMER PORTAL CONFIGURATION');
    console.log('skipped (--skip-portal)');
  } else {
    await ensurePortalConfiguration(stripe);
  }
  printDashboardReminders();

  heading(DRY_RUN ? 'DRY RUN COMPLETE' : 'BOOTSTRAP COMPLETE');
  if (actions.length === 0) {
    console.log('No changes needed — the account already matches content/pricing.json.');
    console.log('That is what a second run should always print. If it does not, this script is not');
    console.log('idempotent and that is a bug worth fixing before it runs against live.');
  } else {
    console.log(`${actions.length} action(s)${DRY_RUN ? ' would be' : ''} taken:`);
    for (const action of actions) console.log(`  ${action}`);
  }
  console.log('');
  console.log('Verify with: npm run stripe:audit');
}

main().catch((error) => {
  console.error('');
  console.error('BOOTSTRAP FAILED:', error instanceof Error ? error.message : error);
  console.error('');
  console.error('This script is idempotent — fix the cause and re-run it. Anything already created');
  console.error('will be recognised and left alone.');
  process.exit(1);
});
