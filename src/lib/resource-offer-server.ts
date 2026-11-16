import Stripe from "stripe";
import { createHash, randomUUID } from "node:crypto";
import { ownerDiscountProducts } from "./owner-discount-products";
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
  applied_invoice_id: string | null;
};
export type OfferRepo = {
  read(userId: string): Promise<OfferClaim | null>;
  profileCustomer(userId: string): Promise<string | null>;
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
  };
  const amounts: Record<ResourceOfferPlan, number> = {
    monthly: 1900,
    annual: 14900,
    "family-monthly": 3500,
    family: 24900,
  };
  const plans = {} as Record<ResourceOfferPlan, Stripe.Price>;
  for (const [plan, id] of Object.entries(mapping) as [ResourceOfferPlan, string][]) {
    const price = await stripe.prices.retrieve(id);
    if (
      !price.active ||
      price.currency !== "usd" ||
      price.unit_amount !== amounts[plan] ||
      price.recurring?.interval !==
        (plan === "monthly" || plan === "family-monthly" ? "month" : "year") ||
      !products.includes(stripeRef(price.product)!)
    )
      throw unavailable("The eligible plan catalog needs verification. No offer was issued.");
    plans[plan] = price;
  }
  return { products, plans };
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
export function resourceOfferService({
  stripe,
  repo,
  active = () => {},
  now = Date.now,
}: {
  stripe: Stripe;
  repo: OfferRepo;
  active?: () => void;
  now?: () => number;
}) {
  const call = async <T>(operation: () => Promise<T>) => {
    active();
    const value = await operation();
    active();
    return value;
  };
  async function customerOwned(id: string, claim: OfferClaim) {
    if (!ownedId(id, "cus")) throw unavailable();
    const c = await call(() => stripe.customers.retrieve(id));
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
      value = await call(() => stripe.coupons.retrieve(RESOURCE_OFFER_COUPON));
    } catch (e) {
      if (!(e instanceof Stripe.errors.StripeInvalidRequestError) || e.code !== "resource_missing")
        throw e;
      value = await call(() =>
        stripe.coupons.create(
          {
            id: RESOURCE_OFFER_COUPON,
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
    const redeemed = c?.state === "redeemed" || (p?.times_redeemed || 0) > 0;
    return {
      enabled: true,
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
    return view(c, c?.stripe_promotion_id ? await promotion(c) : undefined);
  }
  async function claim(user: { id: string; email: string }, resource = "study-guide") {
    const lease = randomUUID();
    let c: OfferClaim | undefined;
    try {
      c = await repo.reserve(user.id, resource, lease, "claim");
      if (c.user_id !== user.id || !uuid(c.id)) throw unavailable();
      if (c.stripe_promotion_id) return view(c, await promotion(c));
      const { products } = await call(() => resourceOfferCatalog(stripe));
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
    const lease = randomUUID();
    let c: OfferClaim | undefined;
    try {
      const existing = await repo.read(user.id);
      if (!existing?.stripe_promotion_id)
        throw new TeamOperationError("Claim the study-guide offer before choosing a plan.", 409);
      c = await repo.reserve(user.id, existing.resource_slug, lease, "checkout");
      if (
        c.user_id !== user.id ||
        !c.stripe_customer_id ||
        c.state !== "issued" ||
        c.applied_invoice_id
      )
        throw new TeamOperationError(
          "This offer has already been reserved or used. Open your account to manage an existing subscription.",
          409,
        );
      await customerOwned(c.stripe_customer_id, c);
      const p = await promotion(c);
      if (!p.active || p.times_redeemed > 0)
        throw new TeamOperationError(
          "This one-use offer has already been used or is unavailable.",
          409,
        );
      const catalog = await call(() => resourceOfferCatalog(stripe));
      const subs = await call(() =>
        stripe.subscriptions.list({ customer: c!.stripe_customer_id!, status: "all", limit: 100 }),
      );
      if (
        subs.has_more ||
        subs.data.some(
          (s) =>
            !["canceled", "incomplete_expired"].includes(s.status) &&
            s.items.data.some((i) => catalog.products.includes(stripeRef(i.price.product)!)),
        )
      )
        throw new TeamOperationError(
          "You already have an active or pending eligible subscription. Manage it in your account instead of creating another.",
          409,
        );
      if (c.checkout_session_id) {
        const prior = await call(() => stripe.checkout.sessions.retrieve(c!.checkout_session_id!));
        if (
          stripeRef(prior.customer) !== c.stripe_customer_id ||
          prior.metadata?.resourceOfferClaimId !== c.id
        )
          throw unavailable();
        if (prior.status === "open") {
          if (c.checkout_plan !== plan)
            throw new TeamOperationError(
              "An offer checkout is already open for another plan. Finish it or wait for it to expire before changing plans.",
              409,
            );
          if (!prior.url?.startsWith("https://checkout.stripe.com/")) throw unavailable();
          await repo.checkpoint(user.id, lease, "release");
          return { url: prior.url };
        }
        if (prior.status !== "expired")
          throw new TeamOperationError(
            "That checkout is complete. Open your account to manage your subscription.",
            409,
          );
        c = await repo.checkpoint(user.id, lease, "expired_checkout", { session: prior.id });
      }
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
      // Deliberately no discount on the $0 trial invoice. invoice.created applies
      // the reserved customer-bound promotion to the first eligible paid draft.
      const session = await call(() =>
        stripe.checkout.sessions.create(
          {
            mode: "subscription",
            customer: c!.stripe_customer_id!,
            client_reference_id: user.id,
            integration_identifier: `lt-resource-offer-${c!.checkout_attempt_id!.replaceAll("-", "").slice(0, 8)}`,
            line_items: [{ price: catalog.plans[plan].id, quantity: 1 }],
            subscription_data: {
              trial_period_days: 7,
              metadata: { userId: user.id, resourceOfferClaimId: c!.id },
            },
            metadata: {
              userId: user.id,
              resourceOfferClaimId: c!.id,
              resourceOfferAttempt: c!.checkout_attempt_id!,
            },
            custom_text: {
              submit: {
                message:
                  "Your study-guide offer takes 10% off the first eligible regular paid subscription invoice after the 7-day trial. Later renewals are at the normal price. One redemption per adult account.",
              },
            },
            success_url: `${origin}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
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
  return { status, claim, checkout, verifyPromotion, promotion };
}
