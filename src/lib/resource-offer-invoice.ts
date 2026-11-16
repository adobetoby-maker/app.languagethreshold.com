import Stripe from "stripe";
import { randomUUID } from "node:crypto";
import { TeamOperationError } from "./team-server";
import { resourceOfferService, type OfferRepo, type OfferClaim } from "./resource-offer-server";
import { RESOURCE_OFFER_COUPON } from "./resource-offer";
const ref = (v: string | { id: string } | null | undefined) => (typeof v === "string" ? v : v?.id);
const uuid = (v: unknown): v is string =>
  typeof v === "string" && /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(v);
const hold = () =>
  new TeamOperationError("The reserved study-guide invoice discount needs review.", 503);
function evidence(invoice: Stripe.Invoice) {
  const meta = invoice.parent?.subscription_details?.metadata;
  const subscription = ref(invoice.parent?.subscription_details?.subscription);
  return meta && uuid(meta.resourceOfferClaimId) && uuid(meta.userId) && subscription
    ? { claimId: meta.resourceOfferClaimId, userId: meta.userId, subscription }
    : null;
}
function ownsDiscount(invoice: Stripe.Invoice, claim: OfferClaim) {
  return (
    invoice.discounts.length === 1 &&
    typeof invoice.discounts[0] === "object" &&
    !invoice.discounts[0].deleted &&
    ref(invoice.discounts[0].promotion_code) === claim.stripe_promotion_id &&
    ref(invoice.discounts[0].source?.coupon) === RESOURCE_OFFER_COUPON
  );
}
/** Called only after verification of the original Stripe webhook signature. */
export async function applyResourceOfferInvoice(
  stripe: Stripe,
  repo: OfferRepo,
  eventInvoice: Stripe.Invoice,
) {
  const e = evidence(eventInvoice);
  if (
    !e ||
    eventInvoice.amount_due <= 0 ||
    !["subscription_create", "subscription_cycle"].includes(eventInvoice.billing_reason || "")
  )
    return { applied: false, reason: "not_eligible_paid_invoice" };
  const existing = await repo.read(e.userId);
  if (
    !existing ||
    existing.id !== e.claimId ||
    existing.state === "redeemed" ||
    (existing.applied_invoice_id && existing.applied_invoice_id !== eventInvoice.id)
  )
    return { applied: false, reason: "not_an_unused_offer" };
  const direct = existing.checkout_discount_mode === "checkout";
  if (direct && eventInvoice.billing_reason !== "subscription_create")
    return { applied: false, reason: "junior_renewal_at_normal_price" };
  const lease = randomUUID();
  let claim: OfferClaim | undefined;
  try {
    claim = await repo.reserve(e.userId, existing.resource_slug, lease, "invoice");
    if (
      claim.id !== e.claimId ||
      !claim.stripe_customer_id ||
      !claim.stripe_promotion_id ||
      !claim.checkout_session_id ||
      !claim.checkout_price_id ||
      !claim.checkout_product_id ||
      !claim.checkout_unit_amount ||
      ref(eventInvoice.customer) !== claim.stripe_customer_id
    )
      throw hold();
    const [subscription, session, invoice, price] = await Promise.all([
      stripe.subscriptions.retrieve(e.subscription),
      stripe.checkout.sessions.retrieve(claim.checkout_session_id),
      stripe.invoices.retrieve(eventInvoice.id, { expand: ["discounts"] }),
      stripe.prices.retrieve(claim.checkout_price_id),
    ]);
    if (
      subscription.metadata?.userId !== e.userId ||
      subscription.metadata?.resourceOfferClaimId !== claim.id ||
      ref(subscription.customer) !== claim.stripe_customer_id ||
      ref(session.customer) !== claim.stripe_customer_id ||
      (ref(session.subscription) !== subscription.id &&
        !(direct && session.status === "open" && !session.subscription)) ||
      (direct
        ? !["open", "complete"].includes(session.status || "")
        : session.status !== "complete") ||
      session.mode !== "subscription" ||
      (direct &&
        (subscription.trial_start ||
          subscription.trial_end ||
          claim.checkout_trial_days !== 0 ||
          claim.checkout_discount_mode !== "checkout" ||
          subscription.metadata?.resourceOfferAttempt !== claim.checkout_attempt_id ||
          subscription.metadata?.resourceOfferMode !== "checkout")) ||
      session.client_reference_id !== e.userId ||
      session.metadata?.resourceOfferClaimId !== claim.id ||
      ref(invoice.customer) !== claim.stripe_customer_id ||
      ref(invoice.parent?.subscription_details?.subscription) !== subscription.id ||
      ref(price.product) !== claim.checkout_product_id ||
      price.currency !== "usd" ||
      price.unit_amount !== claim.checkout_unit_amount
    )
      throw hold();
    if (invoice.amount_due <= 0 && !ownsDiscount(invoice, claim)) {
      await repo.checkpoint(e.userId, lease, "release");
      return { applied: false, reason: "no_positive_invoice" };
    }
    if (invoice.lines.has_more || invoice.lines.data.length !== 1) throw hold();
    const line = invoice.lines.data[0];
    if (
      line.pricing?.price_details?.price !== claim.checkout_price_id ||
      line.quantity !== 1 ||
      line.currency !== "usd" ||
      line.amount !== claim.checkout_unit_amount ||
      !line.discountable ||
      line.parent?.subscription_item_details?.proration ||
      line.parent?.invoice_item_details?.proration
    )
      throw hold();
    if (invoice.discounts.length && !ownsDiscount(invoice, claim)) throw hold();
    const service = resourceOfferService({ stripe, repo });
    const promotion = await service.promotion(claim);
    let discounted = invoice;
    if (!ownsDiscount(invoice, claim)) {
      // Junior's positive first invoice is already discounted by Checkout. Never
      // wait for Checkout completion or mutate this invoice to install its code.
      if (direct) throw hold();
      if (invoice.status !== "draft" || !promotion.active || promotion.times_redeemed > 0)
        throw hold();
      discounted = await stripe.invoices.update(
        invoice.id,
        {
          discounts: [{ promotion_code: promotion.id }],
          expand: ["discounts"],
        },
        { idempotencyKey: `resource-offer-invoice:${claim.id}:${invoice.id}` },
      );
    }
    if (
      !ownsDiscount(discounted, claim) ||
      (discounted.total_discount_amounts || []).reduce((n, d) => n + d.amount, 0) !==
        Math.round(line.amount * 0.1)
    )
      throw hold();
    await repo.checkpoint(e.userId, lease, "invoice", { invoice: invoice.id });
    if (discounted.status === "paid" && discounted.amount_paid > 0)
      await recordResourceOfferPaid(stripe, repo, discounted);
    return { applied: true };
  } catch {
    if (claim) {
      try {
        await repo.checkpoint(e.userId, lease, "uncertain");
      } catch {
        // Keep the original failure; an unavailable/stale journal must not trigger another provider write.
      }
    }
    // A non-2xx invoice.created delivery keeps Stripe's retry/finalization delay.
    // Never acknowledge a promised discount which was not confirmed.
    throw hold();
  }
}
export async function recordResourceOfferPaid(
  stripe: Stripe,
  repo: OfferRepo,
  invoice: Stripe.Invoice,
) {
  const e = evidence(invoice);
  if (!e || invoice.status !== "paid" || invoice.amount_paid <= 0) return { recorded: false };
  const existing = await repo.read(e.userId);
  if (
    !existing ||
    existing.id !== e.claimId ||
    (existing.applied_invoice_id && existing.applied_invoice_id !== invoice.id) ||
    existing.state === "redeemed"
  )
    return { recorded: false };
  const current = await stripe.invoices.retrieve(invoice.id, { expand: ["discounts"] });
  if (
    current.status !== "paid" ||
    current.amount_paid <= 0 ||
    ref(current.customer) !== existing.stripe_customer_id ||
    !ownsDiscount(current, existing)
  )
    throw hold();
  if (!existing.applied_invoice_id) {
    const reconciled = await applyResourceOfferInvoice(stripe, repo, current);
    if (!reconciled.applied) throw hold();
    return { recorded: true };
  }
  const lease = randomUUID();
  await repo.reserve(e.userId, existing.resource_slug, lease, "invoice");
  if (!existing.applied_invoice_id) {
    await repo.checkpoint(e.userId, lease, "invoice", { invoice: current.id });
    await repo.reserve(e.userId, existing.resource_slug, lease, "invoice");
  }
  await repo.checkpoint(e.userId, lease, "redeemed", { invoice: current.id });
  return { recorded: true };
}
