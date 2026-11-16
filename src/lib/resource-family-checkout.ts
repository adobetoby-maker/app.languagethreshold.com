import type Stripe from "stripe";
import { randomUUID } from "node:crypto";
import { TeamOperationError } from "./team-server";
import type { OfferClaim, OfferRepo } from "./resource-offer-server";
const ref = (v: string | { id: string } | null | undefined) => (typeof v === "string" ? v : v?.id);
/** Full-price Family purchase guard; shares customer/lease, never issues a coupon. */
export async function guardedFamilyCheckout(
  {
    stripe,
    repo,
    bind,
    catalog,
    active,
    now,
  }: {
    stripe: Stripe;
    repo: OfferRepo;
    bind: (u: { id: string; email: string }, c: OfferClaim, l: string) => Promise<OfferClaim>;
    catalog: () => Promise<{ plans: Record<string, Stripe.Price>; products: string[] }>;
    active: () => void;
    now: () => number;
  },
  user: { id: string; email: string },
  plan: "family" | "family-monthly",
) {
  const lease = randomUUID();
  let c: OfferClaim | undefined;
  const call = async <T>(fn: () => Promise<T>) => {
    active();
    const r = await fn();
    active();
    return r;
  };
  try {
    const products = await catalog();
    c = await repo.reserve(user.id, "family-pricing", lease, "checkout");
    c = await bind(user, c, lease);
    if (c.checkout_attempted_at && !c.checkout_session_id)
      throw new TeamOperationError(
        "An earlier offer checkout needs reconciliation before a Family purchase.",
        409,
      );
    if (c.checkout_session_id) {
      const earlier = await call(() => stripe.checkout.sessions.retrieve(c!.checkout_session_id!));
      if (
        ref(earlier.customer) !== c.stripe_customer_id ||
        earlier.metadata?.resourceOfferClaimId !== c.id
      )
        throw Error("receipt");
      if (earlier.status === "open")
        throw new TeamOperationError(
          "An offer checkout is already open. Finish or reconcile it before a Family purchase.",
          409,
        );
    }
    if ((await repo.juniorPending(user.id)).length)
      throw new TeamOperationError(
        "An earlier Junior checkout must be completed or reconciled. Contact support for a reviewed Family upgrade before another charge.",
        409,
      );
    const subscriptions = await call(() =>
      stripe.subscriptions.list({ customer: c!.stripe_customer_id!, status: "all", limit: 100 }),
    );
    if (
      subscriptions.has_more ||
      subscriptions.data.some(
        (s) =>
          !["canceled", "incomplete_expired"].includes(s.status) &&
          s.items.data.some((i) => products.products.includes(ref(i.price.product)!)),
      )
    )
      throw new TeamOperationError(
        "An active or pending plan already exists. Contact support to review the Family upgrade before another charge.",
        409,
      );
    if (c.normal_family_checkout_session_id) {
      const prior = await call(() =>
        stripe.checkout.sessions.retrieve(c!.normal_family_checkout_session_id!),
      );
      if (
        ref(prior.customer) !== c.stripe_customer_id ||
        prior.metadata?.familyCheckoutAttempt !== c.normal_family_attempt_id ||
        prior.client_reference_id !== user.id
      )
        throw Error("receipt");
      if (prior.status === "open") {
        if (
          c.normal_family_price_id !== products.plans[plan].id ||
          !prior.url?.startsWith("https://checkout.stripe.com/")
        )
          throw new TeamOperationError(
            "Finish or reconcile the earlier Family checkout before changing plans.",
            409,
          );
        return { url: prior.url };
      }
      if (prior.status !== "expired" && prior.status !== "complete") throw Error("receipt");
      c = await repo.checkpoint(user.id, lease, "clear_family_checkout", { session: prior.id });
    }
    if (
      c.normal_family_attempted_at &&
      (!Number.isFinite(Date.parse(c.normal_family_attempted_at)) ||
        now() - Date.parse(c.normal_family_attempted_at) >= 23 * 3600000)
    )
      throw new TeamOperationError(
        "An earlier Family checkout needs reconciliation. No replacement was created.",
        503,
      );
    c = await repo.checkpoint(user.id, lease, "attempt_family_checkout", {
      plan,
      price: products.plans[plan].id,
    });
    const metadata = {
      userId: user.id,
      resourceCustomerClaimId: c.id,
      familyCheckoutAttempt: c.normal_family_attempt_id!,
      billingIssuer: "lt-family-authenticated-v1",
    };
    const session = await call(() =>
      stripe.checkout.sessions.create(
        {
          mode: "subscription",
          customer: c!.stripe_customer_id!,
          client_reference_id: user.id,
          integration_identifier: `lt-family-${c!.normal_family_attempt_id!.replaceAll("-", "").slice(0, 8)}`,
          line_items: [{ price: c!.normal_family_price_id!, quantity: 1 }],
          subscription_data: { trial_period_days: 7, metadata },
          metadata,
          // A public manual-code input could consume the shared one-use PDF code on a
          // $0 trial invoice. That reserved offer belongs in the explicit /offer flow.
          success_url:
            "https://app.languagethreshold.com/subscribe/success?session_id={CHECKOUT_SESSION_ID}",
          cancel_url: "https://app.languagethreshold.com/pricing",
        },
        { idempotencyKey: `lt-family-checkout:${c!.normal_family_attempt_id}` },
      ),
    );
    if (
      !session.url?.startsWith("https://checkout.stripe.com/") ||
      ref(session.customer) !== c.stripe_customer_id ||
      session.metadata?.familyCheckoutAttempt !== c.normal_family_attempt_id ||
      session.client_reference_id !== user.id
    )
      throw Error("receipt");
    await repo.checkpoint(user.id, lease, "family_checkout", { session: session.id });
    return { url: session.url };
  } catch (error) {
    if (error instanceof TeamOperationError) throw error;
    throw new TeamOperationError(
      "Family billing needs review. No replacement purchase was created.",
      503,
    );
  } finally {
    if (c)
      await repo.checkpoint(user.id, lease, "release").catch(() => {
        /* Preserve the original result; never repeat a provider write from cleanup. */
      });
  }
}
