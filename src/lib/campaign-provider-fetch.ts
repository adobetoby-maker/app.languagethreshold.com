import { AsyncLocalStorage } from "node:async_hooks";
import type { TeamDb } from "./team-server.ts";
import { paidProvider, providerReservation } from "./campaign-budget-cost.ts";
type Identity = {
  userId: string;
  campaign: boolean;
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
  let paid = false;
  if (promo.data && process.env.STRIPE_SECRET_KEY) {
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
  if (promo.data && !paid) {
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
  return { userId: user.id, campaign: !!promo.data, paid, db };
}
function denied(message: string, status = 402) {
  return Response.json(
    { error: { type: "invalid_request_error", message }, message },
    { status, headers: { "Cache-Control": "private, no-store" } },
  );
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
    if (!actor.campaign || actor.paid) return fetch(input, options);
    let body: unknown = options?.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        return denied("Paid generation input could not be budgeted.", 400);
      }
    }
    const amount = providerReservation(url, body);
    if (amount === null || amount <= 0)
      return denied("This generation option is unavailable within the campaign allowance.");
    const admitted = await actor.db.rpc("reserve_reddit_generation", {
      p_user: actor.userId,
      p_amount: amount,
    });
    if (admitted.error || admitted.data !== true)
      return denied(
        "Your campaign AI/audio allowance is used up or unavailable. Saved lessons, recordings and device voices remain available.",
      );
    if (scope.request.signal.aborted || options?.signal?.aborted)
      return denied("Request cancelled.", 499);
    return fetch(input, options);
  } catch {
    return denied(
      "Sign in to check your paid generation allowance. Saved lessons and device voices remain available.",
      403,
    );
  }
};
