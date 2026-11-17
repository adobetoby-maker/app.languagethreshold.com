import Stripe from "stripe";
import { createHash, randomUUID } from "node:crypto";
import { ownerDiscountProducts } from "./owner-discount-products";
import {
  JUNIOR_OFFER_PRICES,
  isJuniorOfferPlan,
  resourceOfferTrialDays,
  resourceOfferDiscountMode,
} from "./resource-offer-products";
import { guardedFamilyCheckout } from "./resource-family-checkout";
import { INDIVIDUAL_PRICES } from "./individual-pricing";
import { TeamOperationError } from "./team-server";
import {
  RESOURCE_OFFER_CAMPAIGN,
  RESOURCE_OFFER_COUPON,
  RESOURCE_OFFER_PERCENT,
  RESOURCE_OFFER_PLANS,
  RESOURCE_OFFER_TERMS,
  type ResourceOfferPlan,
  type ResourceOfferView,
} from "./resource-offer";

export type OfferClaim = {
  id: string;
  user_id: string;
  resource_slug: string;
  code: string;
  state: "pending" | "uncertain" | "issued" | "redeemed";
  stripe_customer_id: string | null;
  stripe_promotion_id: string | null;
  customer_attempted_at: string | null;
  promotion_attempted_at: string | null;
  checkout_attempt_id: string | null;
  checkout_attempted_at: string | null;
  checkout_plan: ResourceOfferPlan | null;
  checkout_session_id: string | null;
  checkout_price_id: string | null;
  checkout_product_id: string | null;
  checkout_unit_amount: number | null;
  checkout_trial_days: number | null;
  checkout_discount_mode: "checkout" | "deferred" | null;
  applied_invoice_id: string | null;
  normal_family_attempt_id: string | null;
  normal_family_attempted_at: string | null;
  normal_family_price_id: string | null;
  normal_family_checkout_session_id: string | null;
};
export type OfferRepo = {
  read(userId: string): Promise<OfferClaim | null>;
  profileCustomer(userId: string): Promise<string | null>;
  juniorPending(userId: string): Promise<
    {
      id: string;
      claim_id: string;
      stripe_customer_id: string;
      stripe_session_id: string | null;
      price_id: string;
      state: string;
    }[]
  >;
  reserve(userId: string, resource: string, lease: string, purpose: string): Promise<OfferClaim>;
  checkpoint(
    userId: string,
    lease: string,
    phase: string,
    fields?: {
      customer?: string;
      promotion?: string;
      plan?: ResourceOfferPlan;
      session?: string;
      invoice?: string;
      price?: string;
      product?: string;
      amount?: number;
    },
  ): Promise<OfferClaim>;
};
const unavailable = (
  message = "Your offer could not be confirmed. No purchase was made. Please refresh before retrying.",
) => new TeamOperationError(message, 503);
const ownedId = (v: unknown, prefix: string): v is string =>
  typeof v === "string" && new RegExp(`^${prefix}_[a-zA-Z0-9_]+$`).test(v);
const uuid = (v: unknown): v is string =>
  typeof v === "string" && /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(v);
const resumedTooLate = (at: string | null, now: number) =>
  at !== null && (!Number.isFinite(Date.parse(at)) || now - Date.parse(at) >= 23 * 3600000);
const stripeRef = (v: string | { id: string } | null | undefined) =>
  typeof v === "string" ? v : v?.id;

export async function resourceOfferCatalog(stripe: Stripe) {
  const products = await ownerDiscountProducts(stripe, {
    includeJunior: false,
    includeTeam: false,
  });
  const mapping: Record<ResourceOfferPlan, string> = {
    monthly: INDIVIDUAL_PRICES.monthly,
    annual: INDIVIDUAL_PRICES.annual,
    "family-monthly": INDIVIDUAL_PRICES.familyMonthly,
    family: INDIVIDUAL_PRICES.family,
    "junior-monthly": JUNIOR_OFFER_PRICES["junior-monthly"].id,
    "junior-annual": JUNIOR_OFFER_PRICES["junior-annual"].id,
  };
  const amounts: Record<ResourceOfferPlan, number> = {
    monthly: 1900,
    annual: 14900,
    "family-monthly": 3500,
    family: 24900,
    "junior-monthly": 999,
    "junior-annual": 7900,
  };
  const plans = {} as Record<ResourceOfferPlan, Stripe.Price>;
  for (const [plan, id] of Object.entries(mapping) as [ResourceOfferPlan, string][]) {
    const price = await stripe.prices.retrieve(id);
    if (
      !price.active ||
      !price.livemode ||
      price.currency !== "usd" ||
      price.unit_amount !== amounts[plan] ||
      price.recurring?.interval !==
        (plan === "monthly" || plan === "family-monthly" || plan === "junior-monthly"
          ? "month"
          : "year") ||
      price.recurring?.interval_count !== 1 ||
      (isJuniorOfferPlan(plan)
        ? stripeRef(price.product) !==
          JUNIOR_OFFER_PRICES[plan as keyof typeof JUNIOR_OFFER_PRICES].product
        : !products.includes(stripeRef(price.product)!))
    )
      throw unavailable("The eligible plan catalog needs verification. No offer was issued.");
    plans[plan] = price;
  }
  const allProducts = [
    ...new Set([...products, ...Object.values(JUNIOR_OFFER_PRICES).map((p) => p.product)]),
  ].sort();
  if (products.length !== 3 || allProducts.length !== 5)
    throw unavailable("The five eligible products need verification. No offer was issued.");
  const actualProducts = await Promise.all(allProducts.map((id) => stripe.products.retrieve(id)));
  if (actualProducts.some((p) => !p.active || !p.livemode)) throw unavailable();
  return { products: allProducts, plans };
}
export async function verifyOfferInvoiceWebhook(stripe: Stripe, target: string) {
  let after: string | undefined;
  for (let page = 0; page < 10; page++) {
    const list = await stripe.webhookEndpoints.list({
      limit: 100,
      ...(after ? { starting_after: after } : {}),
    });
    if (
      list.data.some(
        (w) =>
          w.status === "enabled" &&
          w.url === target &&
          (w.enabled_events.includes("*") || w.enabled_events.includes("invoice.created")) &&
          (w.enabled_events.includes("*") ||
            w.enabled_events.includes("invoice.paid") ||
            w.enabled_events.includes("invoice.payment_succeeded")),
      )
    )
      return;
    if (!list.has_more) break;
    after = list.data.at(-1)?.id;
    if (!after) break;
  }
  throw unavailable("The post-trial discount connection is not ready yet. No offer was issued.");
}
export async function verifyJuniorOfferWebhook(stripe: Stripe) {
  const target = "https://juniorlinguist.vercel.app/api/stripe-webhook";
  const required = [
    "checkout.session.completed",
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "customer.subscription.paused",
    "customer.subscription.resumed",
  ];
  let after: string | undefined;
  for (let page = 0; page < 10; page++) {
    const list = await stripe.webhookEndpoints.list({
      limit: 100,
      ...(after ? { starting_after: after } : {}),
    });
    if (
      list.data.some(
        (w) =>
          w.status === "enabled" &&
          w.url === target &&
          (w.enabled_events.includes("*") ||
            required.every((event) => w.enabled_events.some((value) => value === event))),
      )
    )
      return;
    if (!list.has_more) break;
    after = list.data.at(-1)?.id;
    if (!after) break;
  }
  throw unavailable("Junior subscription fulfillment is not ready yet. No checkout was created.");
}
export function resourceOfferService({
  stripe,
  repo,
  active = () => {},
  now = Date.now,
  juniorEnabled = false,
}: {
  stripe: Stripe;
  repo: OfferRepo;
  active?: () => void;
  now?: () => number;
  juniorEnabled?: boolean;
}) {
  const call = async <T>(operation: () => Promise<T>) => {
    active();
    const value = await operation();
    active();
    return value;
  };
  async function customerOwned(id: string, claim: OfferClaim) {
    if (!ownedId(id, "cus")) throw unavailable();
    const c = await call(() => stripe.customers.retrieve(id, { expand: ["cash_balance"] }));
    if (c.deleted)
      throw unavailable(
        "Your existing billing account needs review. No replacement account was created.",
      );
    // Legacy Junior Checkout accepted arbitrary metadata.userId. Neither that
    // field alone nor a writable profile/email proves billing ownership. Only
    // this authenticated issuer's unpredictable service-only claim token binds
    // customers automatically; existing legacy customers require owner review.
    if (c.metadata?.userId !== claim.user_id || c.metadata?.lt_resource_claim !== claim.id)
      throw unavailable(
        "Your billing account could not be verified. No replacement account was created. Please open your account or contact support.",
      );
    return c;
  }
  async function existingOwnedCustomer(claim: OfferClaim) {
    const userId = claim.user_id;
    if (!uuid(userId)) throw unavailable();
    // profiles.data is a client-writable legacy cache. Removing it must not
    // bypass an existing subscription or create another billing identity.
    const query = `metadata['userId']:'${userId}'`;
    const [customers, subscriptions] = await Promise.all([
      call(() => stripe.customers.search({ query, limit: 100 })),
      call(() => stripe.subscriptions.search({ query, limit: 100 })),
    ]);
    if (customers.has_more || subscriptions.has_more) throw unavailable();
    const ids = new Set([
      ...customers.data.map((c) => c.id),
      ...subscriptions.data.map((s) => stripeRef(s.customer)),
    ]);
    if (ids.has(undefined) || ids.size > 1)
      throw unavailable(
        "Your existing billing accounts need reconciliation. No replacement account was created.",
      );
    const id = [...ids][0];
    if (id) await customerOwned(id, claim);
    return id || null;
  }
  async function coupon(products: string[]) {
    const expected = [...products].sort();
    const fingerprint = createHash("sha256")
      .update(JSON.stringify({ percent: 10, duration: "once", products: expected }))
      .digest("hex");
    let value: Stripe.Coupon;
    try {
      value = await call(() => stripe.coupons.retrieve(RESOURCE_OFFER_COUPON, { expand: ["applies_to"] }));
    } catch (e) {
      if (!(e instanceof Stripe.errors.StripeInvalidRequestError) || e.code !== "resource_missing")
        throw e;
      value = await call(() =>
        stripe.coupons.create(
          {
            id: RESOURCE_OFFER_COUPON,
            expand: ["applies_to"],
            percent_off: 10,
            duration: "once",
            applies_to: { products: expected },
            name: "Study guide · 10% off one paid invoice",
            metadata: { lt_resource_offer: "1", campaign: RESOURCE_OFFER_CAMPAIGN, fingerprint },
          },
          { idempotencyKey: `resource-offer-coupon:${RESOURCE_OFFER_CAMPAIGN}` },
        ),
      );
    }
    if (
      !value.valid ||
      value.percent_off !== 10 ||
      value.duration !== "once" ||
      value.amount_off !== null ||
      value.metadata?.fingerprint !== fingerprint ||
      value.metadata?.campaign !== RESOURCE_OFFER_CAMPAIGN ||
      JSON.stringify([...(value.applies_to?.products || [])].sort()) !== JSON.stringify(expected) ||
      value.max_redemptions !== null ||
      value.redeem_by !== null
    )
      throw unavailable("The discount terms need review. No alternative discount was issued.");
    return value;
  }
  function verifyPromotion(p: Stripe.PromotionCode, c: OfferClaim) {
    const parent = p.promotion?.type === "coupon" ? stripeRef(p.promotion.coupon) : null;
    if (
      stripeRef(p.customer) !== c.stripe_customer_id ||
      parent !== RESOURCE_OFFER_COUPON ||
      p.code !== c.code ||
      p.max_redemptions !== 1 ||
      p.metadata?.claim !== c.id ||
      p.metadata?.campaign !== RESOURCE_OFFER_CAMPAIGN ||
      p.metadata?.userId !== c.user_id
    )
      throw unavailable("The offer record needs review. No replacement code was issued.");
    return p;
  }
  async function promotion(c: OfferClaim) {
    if (!c.stripe_promotion_id) throw unavailable();
    return verifyPromotion(
      await call(() => stripe.promotionCodes.retrieve(c.stripe_promotion_id!)),
      c,
    );
  }
  function view(c: OfferClaim | null, p?: Stripe.PromotionCode): ResourceOfferView {
    const redeemed = c?.state === "redeemed";
    return {
      enabled: true,
      juniorEnabled,
      terms: RESOURCE_OFFER_TERMS,
      status: redeemed
        ? "redeemed"
        : c?.applied_invoice_id || c?.checkout_session_id
          ? "reserved"
          : p?.active
            ? "ready"
            : p || c?.state === "uncertain"
              ? "needs_review"
              : c
                ? "pending"
                : "not_claimed",
      ...(p && !redeemed ? { code: p.code } : {}),
    };
  }
  async function status(userId: string) {
    const c = await repo.read(userId);
    const p = c?.stripe_promotion_id ? await promotion(c) : undefined;
    const result = view(c, p);
    if (c?.state !== "redeemed" && p && p.times_redeemed > 0) {
      if (!c?.applied_invoice_id)
        return {
          ...result,
          status: "needs_review" as const,
          notice:
            "The provider has reserved this code but its invoice receipt still needs reconciliation. No replacement code will be issued.",
        };
      const invoice = await call(() => stripe.invoices.retrieve(c.applied_invoice_id!));
      if (["void", "uncollectible"].includes(invoice.status || "") || invoice.amount_due <= 0)
        return {
          ...result,
          status: "needs_review" as const,
          notice:
            "This provider-used code needs billing review. It will not be replaced automatically.",
        };
    }
    return result;
  }
  async function bindCustomer(
    user: { id: string; email: string },
    initial: OfferClaim,
    lease: string,
  ) {
    let c = initial;
    let customerId = c.stripe_customer_id || (await repo.profileCustomer(user.id));
    if (!customerId) customerId = await existingOwnedCustomer(c);
    if (customerId) await customerOwned(customerId, c);
    else {
      if (resumedTooLate(c.customer_attempted_at, now()))
        throw unavailable(
          "An earlier billing-account request needs reconciliation. No replacement account was created.",
        );
      c = await repo.checkpoint(user.id, lease, "attempt_customer");
      const created = await call(() =>
        stripe.customers.create(
          { email: user.email, metadata: { userId: user.id, lt_resource_claim: c!.id } },
          { idempotencyKey: `resource-offer-customer:${c!.id}` },
        ),
      );
      customerId = created.id;
      if (created.metadata?.userId !== user.id) throw unavailable();
    }
    c = await repo.checkpoint(user.id, lease, "customer", { customer: customerId });
    return c;
  }
  async function claim(user: { id: string; email: string }, resource = "study-guide") {
    const lease = randomUUID();
    let c: OfferClaim | undefined;
    try {
      c = await repo.reserve(user.id, resource, lease, "claim");
      if (c.user_id !== user.id || !uuid(c.id)) throw unavailable();
      if (c.stripe_promotion_id) return view(c, await promotion(c));
      const { products } = await call(() => resourceOfferCatalog(stripe));
      c = await bindCustomer(user, c, lease);
      const customerId = c.stripe_customer_id!;
      await coupon(products);
      const list = await call(() =>
        stripe.promotionCodes.list({ code: c!.code, customer: customerId!, limit: 100 }),
      );
      if (list.has_more || list.data.length > 1) throw unavailable();
      let p = list.data[0] ? verifyPromotion(list.data[0], c) : undefined;
      if (!p) {
        if (resumedTooLate(c.promotion_attempted_at, now()))
          throw unavailable(
            "An earlier code request needs reconciliation. No replacement code was issued.",
          );
        c = await repo.checkpoint(user.id, lease, "attempt_promotion");
        p = verifyPromotion(
          await call(() =>
            stripe.promotionCodes.create(
              {
                code: c!.code,
                customer: customerId!,
                promotion: { type: "coupon", coupon: RESOURCE_OFFER_COUPON },
                max_redemptions: 1,
                metadata: {
                  lt_resource_offer: "1",
                  campaign: RESOURCE_OFFER_CAMPAIGN,
                  claim: c!.id,
                  userId: user.id,
                },
              },
              { idempotencyKey: `resource-offer-promotion:${c!.id}` },
            ),
          ),
          c,
        );
      }
      c = await repo.checkpoint(user.id, lease, "issued", { promotion: p.id });
      return view(c, p);
    } catch (e) {
      if (c) {
        try {
          await repo.checkpoint(user.id, lease, "uncertain");
        } catch {
          // Keep the original failure; an unavailable/stale journal must not trigger another provider write.
        }
      }
      if (e instanceof TeamOperationError) throw e;
      throw unavailable();
    }
  }
  async function checkout(
    user: { id: string; email: string },
    plan: ResourceOfferPlan,
    origin: string,
  ) {
    if (!RESOURCE_OFFER_PLANS.includes(plan))
      throw new TeamOperationError("Choose an eligible Language Threshold plan.", 400);
    if (isJuniorOfferPlan(plan) && !juniorEnabled)
      throw unavailable(
        "The Junior study-guide offer is being connected. No checkout was created.",
      );
    const lease = randomUUID();
    let c: OfferClaim | undefined;
    try {
      const existing = await repo.read(user.id);
      if (!existing?.stripe_promotion_id)
        throw new TeamOperationError("Claim the study-guide offer before choosing a plan.", 409);
      c = await repo.reserve(user.id, existing.resource_slug, lease, "checkout");
      if (c.user_id !== user.id || !c.stripe_customer_id || c.state !== "issued")
        throw new TeamOperationError(
          "This offer has already been reserved or used. Open your account to manage an existing subscription.",
          409,
        );
      const billingCustomer = await customerOwned(c.stripe_customer_id, c);
      const p = await promotion(c);
      if (c.checkout_session_id) {
        const prior = await call(() => stripe.checkout.sessions.retrieve(c!.checkout_session_id!));
        if (
          stripeRef(prior.customer) !== c.stripe_customer_id ||
          prior.metadata?.resourceOfferClaimId !== c.id ||
          prior.metadata?.resourceOfferAttempt !== c.checkout_attempt_id ||
          prior.client_reference_id !== user.id
        )
          throw unavailable();
        if (prior.status === "open") {
          if (c.checkout_plan !== plan)
            throw new TeamOperationError(
              "An offer checkout is already open for another plan. Finish it or wait for it to expire before changing plans.",
              409,
            );
          if (!prior.url?.startsWith("https://checkout.stripe.com/")) throw unavailable();
          if (p.times_redeemed > 0 || c.applied_invoice_id) {
            if (!c.applied_invoice_id)
              throw unavailable(
                "The provider has reserved this code. Its invoice receipt must be reconciled before resuming; no replacement was created.",
              );
            const invoice = await call(() =>
              stripe.invoices.retrieve(c!.applied_invoice_id!, { expand: ["discounts"] }),
            );
            const meta = invoice.parent?.subscription_details?.metadata,
              discount = invoice.discounts[0],
              line = invoice.lines.data[0];
            const invoiceSubId = stripeRef(invoice.parent?.subscription_details?.subscription);
            if (!invoiceSubId) throw unavailable();
            const invoiceSub = await call(() => stripe.subscriptions.retrieve(invoiceSubId));
            if (
              ["canceled", "incomplete_expired", "paused"].includes(invoiceSub.status) ||
              stripeRef(invoiceSub.customer) !== c.stripe_customer_id ||
              invoiceSub.metadata?.resourceOfferAttempt !== c.checkout_attempt_id
            )
              throw unavailable(
                "The earlier payment needs billing review. No replacement was created.",
              );
            if (
              !isJuniorOfferPlan(plan) ||
              !["draft", "open"].includes(invoice.status || "") ||
              invoice.amount_due <= 0 ||
              invoice.amount_remaining <= 0 ||
              stripeRef(invoice.customer) !== c.stripe_customer_id ||
              meta?.resourceOfferClaimId !== c.id ||
              meta?.userId !== user.id ||
              meta?.resourceOfferAttempt !== c.checkout_attempt_id ||
              invoice.billing_reason !== "subscription_create" ||
              invoice.discounts.length !== 1 ||
              typeof discount !== "object" ||
              discount.deleted ||
              stripeRef(discount.promotion_code) !== c.stripe_promotion_id ||
              stripeRef(discount.source?.coupon) !== RESOURCE_OFFER_COUPON ||
              invoice.lines.has_more ||
              invoice.lines.data.length !== 1 ||
              line?.pricing?.price_details?.price !== c.checkout_price_id ||
              line.amount !== c.checkout_unit_amount ||
              line.quantity !== 1 ||
              line.currency !== "usd" ||
              (invoice.total_discount_amounts || []).reduce((total, d) => total + d.amount, 0) !==
                Math.round(line.amount * 0.1)
            )
              throw unavailable(
                "This provider-used code needs billing review before checkout can resume. No replacement was created.",
              );
          } else if (!p.active)
            throw unavailable(
              "This offer is unavailable and needs billing review. No replacement was created.",
            );
          await repo.checkpoint(user.id, lease, "release");
          return { url: prior.url };
        }
        if (prior.status !== "expired")
          throw new TeamOperationError(
            "That checkout is complete. Open your account to manage your subscription.",
            409,
          );
        if (p.times_redeemed > 0 || c.applied_invoice_id)
          throw unavailable(
            "The earlier checkout expired after the provider reserved its code. Billing review is required; no replacement was created.",
          );
        c = await repo.checkpoint(user.id, lease, "expired_checkout", { session: prior.id });
      }
      if (!p.active || p.times_redeemed > 0 || c.applied_invoice_id)
        throw unavailable(
          "This code is already reserved or used and needs billing review. No replacement was created.",
        );
      if (resourceOfferTrialDays(plan) === 0) {
        const balances = billingCustomer as Stripe.Customer & {
          invoice_credit_balance?: Record<string, number>;
        };
        const credits = [
          ...Object.values(balances.invoice_credit_balance || {}),
          ...Object.values(balances.cash_balance?.available || {}),
        ];
        if (
          !Number.isFinite(billingCustomer.balance) ||
          billingCustomer.balance !== 0 ||
          credits.some((value) => !Number.isFinite(value) || value !== 0)
        )
          throw unavailable(
            "Existing billing credits need review before this first-paid offer can be used. No checkout was created.",
          );
      }
      const catalog = await call(() => resourceOfferCatalog(stripe));
      if (
        (isJuniorOfferPlan(plan) || plan === "family" || plan === "family-monthly") &&
        c.normal_family_attempted_at
      ) {
        if (!c.normal_family_checkout_session_id)
          throw unavailable(
            "An earlier Family checkout needs reconciliation. No duplicate was created.",
          );
        const family = await call(() =>
          stripe.checkout.sessions.retrieve(c!.normal_family_checkout_session_id!),
        );
        if (
          stripeRef(family.customer) !== c.stripe_customer_id ||
          family.metadata?.familyCheckoutAttempt !== c.normal_family_attempt_id ||
          family.status === "open"
        )
          throw unavailable(
            "An earlier Family checkout must be completed or reconciled before this purchase. No duplicate was created.",
          );
      }
      if (isJuniorOfferPlan(plan) || plan === "family" || plan === "family-monthly") {
        const pending = await repo.juniorPending(user.id);
        if (pending.length)
          throw new TeamOperationError(
            "An earlier Junior checkout must be completed or reconciled before opening this offer. No duplicate checkout was created.",
            409,
          );
      }
      const familyProducts = [
        stripeRef(catalog.plans.family.product)!,
        stripeRef(catalog.plans["family-monthly"].product)!,
      ];
      const duplicateProducts = isJuniorOfferPlan(plan)
        ? [...Object.values(JUNIOR_OFFER_PRICES).map((p) => p.product), ...familyProducts]
        : plan === "family" || plan === "family-monthly"
          ? catalog.products
          : catalog.products.filter(
              (id) => !Object.values(JUNIOR_OFFER_PRICES).some((p) => p.product === id),
            );
      const subs = await call(() =>
        stripe.subscriptions.list({ customer: c!.stripe_customer_id!, status: "all", limit: 100 }),
      );
      if (
        subs.has_more ||
        subs.data.some(
          (s) =>
            !["canceled", "incomplete_expired"].includes(s.status) &&
            s.items.data.some((i) => duplicateProducts.includes(stripeRef(i.price.product)!)),
        )
      )
        throw new TeamOperationError(
          "You already have an active or pending eligible subscription. Manage it in your account instead of creating another.",
          409,
        );
      if (c.checkout_plan && c.checkout_plan !== plan)
        throw new TeamOperationError(
          "The earlier checkout must be reconciled before changing plans.",
          409,
        );
      if (resumedTooLate(c.checkout_attempted_at, now()))
        throw unavailable("An earlier checkout needs reconciliation. No new checkout was created.");
      c = await repo.checkpoint(user.id, lease, "attempt_checkout", {
        plan,
        price: catalog.plans[plan].id,
        product: stripeRef(catalog.plans[plan].product),
        amount: catalog.plans[plan].unit_amount!,
      });
      const junior = isJuniorOfferPlan(plan),
        trialDays = resourceOfferTrialDays(plan),
        discountMode = resourceOfferDiscountMode(plan);
      if (c.checkout_trial_days !== trialDays || c.checkout_discount_mode !== discountMode)
        throw unavailable();
      const attemptMetadata = {
        userId: user.id,
        resourceOfferClaimId: c.id,
        resourceOfferAttempt: c.checkout_attempt_id!,
        resourceOfferMode: discountMode,
      };
      // Public Junior/LT plans keep the owner-approved seven-day trial.
      // Reserve the code for the first positive post-trial invoice; historical
      // direct-mode reconciliation never changes that prospective policy.
      const session = await call(() =>
        stripe.checkout.sessions.create(
          {
            mode: "subscription",
            customer: c!.stripe_customer_id!,
            client_reference_id: user.id,
            integration_identifier: `lt-resource-offer-${c!.checkout_attempt_id!.replaceAll("-", "").slice(0, 8)}`,
            line_items: [{ price: catalog.plans[plan].id, quantity: 1 }],
            ...(discountMode === "checkout" ? { discounts: [{ promotion_code: p.id }] } : {}),
            subscription_data: {
              ...(trialDays ? { trial_period_days: trialDays } : {}),
              metadata: attemptMetadata,
            },
            metadata: attemptMetadata,
            custom_text: {
              submit: {
                message:
                  discountMode === "checkout"
                    ? "Your one-use offer takes 10% off the first eligible paid invoice. Later renewals are at the normal price."
                    : "Your one-use offer takes 10% off the first eligible regular paid subscription invoice after the 7-day trial. Later renewals are at the normal price.",
              },
            },
            success_url: `${junior ? "https://juniorlinguist.com" : origin}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/offer`,
          },
          { idempotencyKey: `resource-offer-checkout:${c!.checkout_attempt_id}` },
        ),
      );
      if (
        !session.url?.startsWith("https://checkout.stripe.com/") ||
        stripeRef(session.customer) !== c.stripe_customer_id ||
        session.client_reference_id !== user.id ||
        session.metadata?.resourceOfferClaimId !== c.id ||
        session.metadata?.resourceOfferAttempt !== c.checkout_attempt_id
      )
        throw unavailable();
      await repo.checkpoint(user.id, lease, "checkout", { session: session.id });
      return { url: session.url };
    } catch (e) {
      if (c) {
        try {
          await repo.checkpoint(user.id, lease, "uncertain");
        } catch {
          // Keep the original failure; an unavailable/stale journal must not trigger another provider write.
        }
      }
      if (e instanceof TeamOperationError) throw e;
      throw unavailable();
    }
  }
  return {
    status,
    claim,
    checkout,
    verifyPromotion,
    promotion,
    familyCheckout: (user: { id: string; email: string }, plan: "family" | "family-monthly") =>
      guardedFamilyCheckout(
        {
          stripe,
          repo,
          bind: bindCustomer,
          catalog: () => resourceOfferCatalog(stripe),
          active,
          now,
        },
        user,
        plan,
      ),
  };
}
