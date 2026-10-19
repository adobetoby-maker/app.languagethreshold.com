import Stripe from "stripe";
import { createHash } from "node:crypto";
import { checkDiscount, type OwnerDiscountAction, type OwnerDiscount } from "./owner-discounts";
import { TeamOperationError } from "./team-server";
export function ownerStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new TeamOperationError("Stripe discounts are not configured.", 503);
  return new Stripe(key, {
    apiVersion: "2026-04-22.dahlia",
    httpClient: Stripe.createFetchHttpClient(),
    maxNetworkRetries: 0,
    timeout: 15000,
  });
}
export function discountView(item: Stripe.PromotionCode): OwnerDiscount {
  const coupon = item.promotion.coupon;
  const details = typeof coupon === "object" && coupon !== null ? coupon : null;
  return {
    id: item.id,
    code: item.code,
    active: item.active,
    percentOff: details?.percent_off ?? null,
    amountOff: details?.amount_off ?? null,
    duration: details?.duration ?? "unknown",
    expiresAt: item.expires_at,
    maxRedemptions: item.max_redemptions,
    timesRedeemed: item.times_redeemed,
  };
}
export async function manageOwnerDiscount(
  stripe: Stripe,
  actor: string,
  body: OwnerDiscountAction,
) {
  if (body.action === "disable") {
    const existing = await stripe.promotionCodes.retrieve(body.promotionId);
    if (existing.metadata?.lt_owner_discount !== "1")
      throw new TeamOperationError("Manage externally created codes in Stripe.");
    await stripe.promotionCodes.update(body.promotionId, { active: false });
    return {
      notice:
        "Discount code disabled for future redemptions. Existing subscription discounts are unchanged.",
    };
  }
  try {
    checkDiscount(body);
  } catch {
    throw new TeamOperationError("Use a discount of 1–100 percent and an expiry within one year.");
  }
  const fingerprint = createHash("sha256").update(JSON.stringify(body)).digest("hex");
  const couponId = `lt_owner_${body.requestId}`;
  let coupon: Stripe.Coupon;
  try {
    coupon = await stripe.coupons.retrieve(couponId);
  } catch (error) {
    if (
      !(error instanceof Stripe.errors.StripeInvalidRequestError) ||
      error.code !== "resource_missing"
    )
      throw error;
    coupon = await stripe.coupons.create(
      {
        id: couponId,
        name: body.code,
        duration: body.duration,
        ...(body.kind === "percent"
          ? { percent_off: body.value }
          : { amount_off: body.value, currency: "usd" }),
        metadata: { lt_owner_discount: "1", fingerprint, actor },
      },
      { idempotencyKey: `owner-coupon:${body.requestId}` },
    );
  }
  if (coupon.metadata?.fingerprint !== fingerprint || coupon.metadata?.actor !== actor)
    throw new TeamOperationError(
      "This request was already used with different discount settings. Start a new discount.",
    );
  const existing = await stripe.promotionCodes.list({
    code: body.code,
    limit: 100,
    expand: ["data.promotion.coupon"],
  });
  const match = existing.data.find((p) => p.metadata?.requestId === body.requestId);
  if (match) return { notice: "Discount code is ready.", discount: discountView(match) };
  if (existing.data.some((p) => p.active))
    throw new TeamOperationError("That code is already active. Choose another code.");
  const promo = await stripe.promotionCodes.create(
    {
      code: body.code,
      promotion: { type: "coupon", coupon: coupon.id },
      max_redemptions: body.maxRedemptions,
      expires_at: Math.floor(Date.parse(body.expiresAt) / 1000),
      metadata: { lt_owner_discount: "1", requestId: body.requestId, actor },
      expand: ["promotion.coupon"],
    },
    { idempotencyKey: `owner-promotion:${body.requestId}` },
  );
  return {
    notice: "Discount code created. Share it with customers to enter at subscription checkout.",
    discount: discountView(promo),
  };
}

/** Owner configuration guidance is fixed; Stripe diagnostics and keys stay private. */
export function ownerDiscountFailure(error: unknown) {
  const type = error && typeof error === "object" && "type" in error ? error.type : "";
  if (type === "StripeAuthenticationError")
    return new TeamOperationError(
      "The Stripe connection needs a valid server key before discounts can be managed.",
      503,
    );
  if (type === "StripePermissionError")
    return new TeamOperationError(
      "The Stripe connection needs permission to manage coupons and promotion codes.",
      503,
    );
  if (type === "StripeConnectionError" || type === "StripeAPIError")
    return new TeamOperationError(
      "Stripe could not be reached. Refresh before retrying a discount action.",
      503,
    );
  if (type === "StripeInvalidRequestError")
    return new TeamOperationError(
      "Stripe did not accept these discount settings. Check the code, expiry and connection before retrying.",
      503,
    );
  return error;
}
