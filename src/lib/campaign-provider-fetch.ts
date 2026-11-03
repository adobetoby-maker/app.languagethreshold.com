import { AsyncLocalStorage } from "node:async_hooks";
import type { TeamDb } from "./team-server.ts";
import { paidProvider, providerReservation } from "./campaign-budget-cost.ts";
type Identity = {
  userId: string;
  campaign: boolean;
  staff: boolean;
  paid: boolean;
  db: TeamDb;
};
type Scope = { request: Request; identity?: Promise<Identity> };
const scopes = new AsyncLocalStorage<Scope>();
export function withCampaignRequest<T>(request: Request, action: () => T): T {
  return scopes.run({ request }, action);
}
async function identity(scope: Scope): Promise<Identity> {
  const { teamAdminClient, authenticatedTeamUser } = await import("./team-server.ts");
  const { ownerServiceFetch } = await import("./owner-service-fetch.ts");
  const request = scope.request,
    db = teamAdminClient(ownerServiceFetch(request.signal), request);
  const user = await authenticatedTeamUser(request, db);
  const promo = await db
    .from("promo_redemptions")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (promo.error) throw promo.error;
  const staff = await db
    .from("staff_coupon_recipients")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (staff.error) throw staff.error;
  const campaign = !!promo.data || !!staff.data;
  let paid = false;
  if (campaign && process.env.STRIPE_SECRET_KEY) {
    const profile = await db.from("profiles").select("data").eq("id", user.id).maybeSingle();
    if (profile.error) throw profile.error;
    const subId = (profile.data?.data as Record<string, unknown>)?.subscription_id;
    if (typeof subId === "string" && /^sub_[A-Za-z0-9]+$/.test(subId)) {
      // A profile field alone is not proof of paid access; check the actual subscription owner.
      const { default: Stripe } = await import("stripe");
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        maxNetworkRetries: 0,
        timeout: 8000,
      });
      const sub = await stripe.subscriptions.retrieve(subId);
      paid = sub.metadata?.userId === user.id && sub.status === "active";
    }
  }
  if (campaign && !paid) {
    const members = await db
      .from("team_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .eq("status", "active");
    if (members.error) throw members.error;
    const ids = (members.data ?? []).map((row) => row.organization_id);
    if (ids.length) {
      const plans = await db
        .from("team_entitlements")
        .select("organization_id")
        .in("organization_id", ids)
        .eq("status", "active")
        .not("stripe_subscription_id", "is", null);
      if (plans.error) throw plans.error;
      paid = !!plans.data?.length;
    }
  }
  return { userId: user.id, campaign, staff: !!staff.data, paid, db };
}
function denied(message: string, status = 402) {
  return Response.json(
    { error: { type: "invalid_request_error", message }, message },
    { status, headers: { "Cache-Control": "private, no-store" } },
  );
}
function providerKind(url: string) {
  const u = new URL(url);
  if (u.hostname === "api.anthropic.com") return "anthropic";
  if (u.hostname === "texttospeech.googleapis.com") return "google_tts";
  return u.pathname.endsWith("/speech-to-text") ? "elevenlabs_stt" : "elevenlabs_tts";
}

async function recordProviderAttempt(
  actor: Identity,
  url: string,
  status: "accepted" | "rejected" | "transport_error",
  ceiling: number | null,
) {
  try {
    // Use a short independent write: a caller closing a lesson must not erase an already
    // dispatched provider attempt from the usage ledger.
    const { teamAdminClient } = await import("./team-server.ts");
    const { ownerServiceFetch } = await import("./owner-service-fetch.ts");
    const db = teamAdminClient(ownerServiceFetch(AbortSignal.timeout(5000)));
    const saved = await db.from("api_usage_events").insert({
      user_id: actor.userId,
      provider: providerKind(url),
      request_status: status,
      cost_ceiling_micro_usd: ceiling,
    });
    if (saved.error) throw saved.error;
  } catch {
    // An unavailable metering table must not turn a provider result into a failed lesson.
  }
}
/** Every physical paid-provider attempt reserves before dispatch; cancellations/failures never refund uncertain charges. */
export const campaignProviderFetch: typeof fetch = async (input, options) => {
  const url = input instanceof Request ? input.url : String(input),
    scope = scopes.getStore();
  if (
    !scope ||
    (options?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase() !==
      "POST" ||
    !paidProvider(url)
  )
    return fetch(input, options);
  try {
    if (scope.request.signal.aborted || options?.signal?.aborted)
      return denied("Request cancelled.", 499);
    const actor = await (scope.identity ??= identity(scope));
    let body: unknown = options?.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        if (actor.campaign && !actor.paid)
          return denied("Paid generation input could not be budgeted.", 400);
        body = null;
      }
    }
    const amount = providerReservation(url, body);
    if (actor.campaign && !actor.paid) {
      if (amount === null || amount <= 0)
        return denied("This generation option is unavailable within the campaign allowance.");
      const admitted = await actor.db.rpc(
        actor.staff ? "reserve_staff_generation" : "reserve_reddit_generation",
        {
          p_user: actor.userId,
          p_amount: amount,
        },
      );
      if (admitted.error || admitted.data !== true)
        return denied(
          "Your campaign AI/audio allowance is used up or unavailable. Saved lessons, recordings and device voices remain available.",
        );
    }
    if (scope.request.signal.aborted || options?.signal?.aborted)
      return denied("Request cancelled.", 499);
    try {
      const response = await fetch(input, options);
      await recordProviderAttempt(actor, url, response.ok ? "accepted" : "rejected", amount);
      return response;
    } catch (error) {
      await recordProviderAttempt(actor, url, "transport_error", amount);
      throw error;
    }
  } catch {
    return denied(
      "Sign in to check your paid generation allowance. Saved lessons and device voices remain available.",
      403,
    );
  }
};
