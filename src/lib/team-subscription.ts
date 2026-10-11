import type Stripe from "stripe";
import { teamAdminClient } from "@/lib/team-server";

function customerId(raw: Stripe.Subscription["customer"]): string | null {
  return typeof raw === "string" ? raw : (raw?.id ?? null);
}

export async function syncTeamSubscription(sub: Stripe.Subscription): Promise<boolean> {
  const orgId = sub.metadata?.organizationId;
  if (!orgId) return false;
  const item = sub.items.data[0];
  if (!item) throw new Error("Stripe team subscription has no learner seat item.");
  const term = sub.metadata.term;
  if (term !== "monthly" && term !== "quarterly" && term !== "annual")
    throw new Error("Stripe team subscription has an unknown billing term.");

  const db = teamAdminClient();
  const { data: current, error: currentError } = await db
    .from("team_entitlements")
    .select("seat_limit,status,period_end,stripe_subscription_id")
    .eq("organization_id", orgId)
    .single();
  if (currentError || !current)
    throw currentError ?? new Error("Stripe team subscription has no matching organization.");

  // Delayed events from an older subscription cannot replace a newer paid plan.
  if (
    current.stripe_subscription_id &&
    current.stripe_subscription_id !== sub.id &&
    ["active", "past_due"].includes(current.status)
  )
    return true;

  const manualGrantValid =
    current.status === "manual" &&
    !!current.period_end &&
    new Date(current.period_end).getTime() > Date.now();
  const status =
    sub.status === "active" || sub.status === "trialing"
      ? "active"
      : sub.status === "past_due" || sub.status === "unpaid"
        ? "past_due"
        : sub.status === "incomplete" || sub.status === "incomplete_expired"
          ? manualGrantValid
            ? "manual"
            : "pending"
          : "canceled";
  const keepManualSeats = status === "manual";
  const { data, error } = await db
    .from("team_entitlements")
    .update({
      seat_limit: keepManualSeats ? current.seat_limit : (item.quantity ?? 0),
      status,
      term,
      stripe_customer_id: customerId(sub.customer),
      stripe_subscription_id: sub.id,
      period_end: keepManualSeats
        ? current.period_end
        : item.current_period_end
          ? new Date(item.current_period_end * 1000).toISOString()
          : null,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", orgId)
    .select("organization_id")
    .maybeSingle();
  if (error || !data)
    throw error ?? new Error("Stripe team subscription has no matching organization.");
  return true;
}
