import type { SupabaseClient } from "@supabase/supabase-js";

/** Personal subscription (active/trialing) or an active team entitlement the user belongs to. */
export async function hasActivePlan(db: SupabaseClient, userId: string) {
  const [{ data: profile, error: profileError }, { data: memberships, error: membersError }] =
    await Promise.all([
      db.from("profiles").select("data").eq("id", userId).maybeSingle(),
      db
        .from("team_members")
        .select("organization_id")
        .eq("user_id", userId)
        .eq("status", "active"),
    ]);
  if (profileError || membersError) throw profileError ?? membersError;
  const status = (profile?.data as Record<string, unknown> | null)?.subscription_status;
  if (status === "active" || status === "trialing") return true;
  const ids = (memberships ?? []).map((member) => member.organization_id);
  if (!ids.length) return false;
  const { data: plans, error } = await db
    .from("team_entitlements")
    .select("status,period_end")
    .in("organization_id", ids)
    .in("status", ["active", "manual"]);
  if (error) throw error;
  return (plans ?? []).some(
    (plan) =>
      plan.status === "active" ||
      (plan.status === "manual" &&
        !!plan.period_end &&
        new Date(plan.period_end).getTime() > Date.now()),
  );
}
