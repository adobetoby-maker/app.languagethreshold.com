import { TeamOperationError, type TeamDb } from "./team-server";
import { RESOURCE_OFFER_CAMPAIGN } from "./resource-offer";
import type { OfferClaim, OfferRepo } from "./resource-offer-server";
export function resourceOfferRepo(db: TeamDb): OfferRepo {
  const checked = (value: unknown): OfferClaim => {
    if (!value || typeof value !== "object")
      throw new TeamOperationError("Offer storage is unavailable.", 503);
    if ("busy" in value)
      throw new TeamOperationError(
        "An offer request is already in progress. Please refresh shortly.",
        409,
      );
    if (!("id" in value) || !("user_id" in value))
      throw new TeamOperationError("Offer storage needs review.", 503);
    return value as OfferClaim;
  };
  return {
    async read(userId) {
      const r = await db
        .from("resource_offer_claims")
        .select("*")
        .eq("user_id", userId)
        .eq("campaign", RESOURCE_OFFER_CAMPAIGN)
        .maybeSingle();
      if (r.error) throw new TeamOperationError("Offer storage is unavailable.", 503);
      return r.data ? checked(r.data) : null;
    },
    async juniorPending(userId) {
      const r = await db
        .from("jl_billing_checkouts")
        .select("id,claim_id,stripe_customer_id,stripe_session_id,price_id,state")
        .eq("user_id", userId)
        .in("state", ["pending", "open"])
        .eq("source", "normal")
        .limit(2);
      if (r.error)
        throw new TeamOperationError(
          "Junior checkout history is not ready yet. No duplicate checkout was created.",
          503,
        );
      return r.data || [];
    },
    async profileCustomer(userId) {
      const r = await db.from("profiles").select("data").eq("id", userId).maybeSingle();
      if (r.error) throw new TeamOperationError("Your billing profile could not be checked.", 503);
      const value = r.data?.data?.stripe_customer_id;
      if (
        value !== null &&
        value !== undefined &&
        (typeof value !== "string" || !/^cus_[a-zA-Z0-9]+$/.test(value))
      )
        throw new TeamOperationError(
          "Your billing profile needs review. No replacement account was created.",
          503,
        );
      return value || null;
    },
    async reserve(userId, resource, lease, purpose) {
      const r = await db.rpc("reserve_resource_offer_claim", {
        p_user: userId,
        p_resource: resource,
        p_lease: lease,
        p_purpose: purpose,
      });
      if (r.error)
        throw new TeamOperationError(
          "The offer request could not be reserved. Please refresh.",
          503,
        );
      return checked(r.data);
    },
    async checkpoint(userId, lease, phase, fields = {}) {
      const r = await db.rpc("checkpoint_resource_offer_claim", {
        p_user: userId,
        p_lease: lease,
        p_phase: phase,
        p_customer: fields.customer ?? null,
        p_promotion: fields.promotion ?? null,
        p_plan: fields.plan ?? null,
        p_session: fields.session ?? null,
        p_invoice: fields.invoice ?? null,
        p_price: fields.price ?? null,
        p_product: fields.product ?? null,
        p_amount: fields.amount ?? null,
      });
      if (r.error)
        throw new TeamOperationError(
          "The offer receipt could not be saved. Please refresh before retrying.",
          503,
        );
      return checked(r.data);
    },
  };
}
