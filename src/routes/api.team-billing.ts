import { createFileRoute } from "@tanstack/react-router";
import { randomUUID } from "node:crypto";
import Stripe from "stripe";
import { z } from "zod";
import {
  audit,
  authenticatedUser,
  json,
  requireTeamAdmin,
  teamAdminClient,
  teamBillingReady,
  teamError,
} from "@/lib/team-server";
import { syncTeamSubscription } from "@/lib/team-subscription";
import {
  TEAM_MIN_SEATS,
  TEAM_VOLUME_SEATS,
  teamPeriodCents,
  teamPriceTiers,
  type TeamTerm,
} from "@/lib/team-pricing";

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("checkout"),
    orgId: z.string().uuid(),
    term: z.enum(["monthly", "quarterly", "annual"]),
    seats: z.number().int().min(TEAM_MIN_SEATS).max(1000),
  }),
  z.object({
    action: z.literal("quote"),
    orgId: z.string().uuid(),
    addSeats: z.number().int().min(1).max(100),
  }),
  z.object({
    action: z.literal("add_seats"),
    orgId: z.string().uuid(),
    addSeats: z.number().int().min(1).max(100),
  }),
  z.object({ action: z.literal("portal"), orgId: z.string().uuid() }),
]);

async function teamStripePrice(stripe: Stripe, term: TeamTerm) {
  const lookupKey = `language-threshold-team-${term}-v3`;
  const existing = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 });
  if (existing.data[0]) return existing.data[0];
  const { baseCents, standardSeatCents, volumeSeatCents } = teamPriceTiers(term);
  return stripe.prices.create(
    {
      currency: "usd",
      billing_scheme: "tiered",
      tiers_mode: "graduated",
      tiers: [
        { up_to: TEAM_MIN_SEATS, flat_amount: baseCents, unit_amount: 0 },
        { up_to: TEAM_VOLUME_SEATS, unit_amount: standardSeatCents },
        { up_to: "inf", unit_amount: volumeSeatCents },
      ],
      recurring:
        term === "annual"
          ? { interval: "year" }
          : { interval: "month", interval_count: term === "quarterly" ? 3 : 1 },
      product_data: { name: "Language Threshold Teams learner seats" },
      lookup_key: lookupKey,
    },
    { idempotencyKey: `team-price:${lookupKey}` },
  );
}

export const Route = createFileRoute("/api/team-billing")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const db = teamAdminClient();
          const user = await authenticatedUser(request, db);
          const params = new URL(request.url).searchParams;
          const orgId = z.string().uuid().parse(params.get("orgId"));
          const sessionId = z
            .string()
            .regex(/^cs_(?:test|live)_[A-Za-z0-9]+$/)
            .parse(params.get("sessionId"));
          await requireTeamAdmin(db, orgId, user.id);
          const key = process.env.STRIPE_SECRET_KEY;
          if (!key) throw new Error("Team billing is not configured.");
          const stripe = new Stripe(key, { apiVersion: "2026-04-22.dahlia" });
          const session = await stripe.checkout.sessions.retrieve(sessionId);
          if (session.mode !== "subscription" || session.metadata?.organizationId !== orgId)
            throw new Error("This checkout does not belong to your team.");
          if (session.status !== "complete") return json({ status: session.status });
          const subscriptionId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription?.id;
          if (!subscriptionId) return json({ status: "processing" });
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          if (subscription.metadata?.organizationId !== orgId)
            throw new Error("Billing account mismatch.");
          await syncTeamSubscription(subscription);
          return json({ status: subscription.status });
        } catch (error) {
          return teamError(error);
        }
      },
      POST: async ({ request }) => {
        try {
          const db = teamAdminClient();
          const user = await authenticatedUser(request, db);
          const body = bodySchema.parse(await request.json());
          await requireTeamAdmin(db, body.orgId, user.id);
          const key = process.env.STRIPE_SECRET_KEY;
          if (!key) throw new Error("Team billing is not configured.");
          const stripe = new Stripe(key, { apiVersion: "2026-04-22.dahlia" });
          const { data: org, error: orgError } = await db
            .from("team_organizations")
            .select("name,billing_email")
            .eq("id", body.orgId)
            .single();
          const { data: entitlement, error: entitlementError } = await db
            .from("team_entitlements")
            .select("seat_limit,term,status,period_end,stripe_customer_id,stripe_subscription_id")
            .eq("organization_id", body.orgId)
            .single();
          if (orgError || entitlementError || !org || !entitlement)
            throw orgError ?? entitlementError ?? new Error("Team not found.");
          const origin = new URL(request.url).origin;
          if (body.action === "checkout") {
            if (!teamBillingReady()) throw new Error("Team checkout is not configured yet.");
            if (
              entitlement.stripe_subscription_id &&
              ["active", "past_due"].includes(entitlement.status)
            )
              throw new Error(
                "This team already has a subscription. Use Add seats or Manage billing.",
              );
            const [learners, pendingInvites] = await Promise.all([
              db
                .from("team_members")
                .select("id", { count: "exact", head: true })
                .eq("organization_id", body.orgId)
                .eq("role", "learner")
                .eq("status", "active"),
              db
                .from("team_invitations")
                .select("id", { count: "exact", head: true })
                .eq("organization_id", body.orgId)
                .eq("role", "learner")
                .eq("status", "pending")
                .gt("expires_at", new Date().toISOString()),
            ]);
            if (learners.error || pendingInvites.error)
              throw learners.error ?? pendingInvites.error;
            if (body.seats < (learners.count ?? 0) + (pendingInvites.count ?? 0))
              throw new Error("Choose enough seats for active learners and pending invitations.");
            const price = await teamStripePrice(stripe, body.term);
            const checkout: Stripe.Checkout.SessionCreateParams = {
              mode: "subscription",
              ...(entitlement.stripe_customer_id
                ? { customer: entitlement.stripe_customer_id }
                : { customer_email: org.billing_email }),
              client_reference_id: user.id,
              line_items: [
                {
                  quantity: body.seats,
                  price: price.id,
                },
              ],
              metadata: { organizationId: body.orgId, teamPlan: "1", term: body.term },
              subscription_data: {
                metadata: {
                  organizationId: body.orgId,
                  teamPlan: "1",
                  term: body.term,
                  userId: user.id,
                },
              },
              success_url: `${origin}/team?org=${body.orgId}&checkout=success&session_id={CHECKOUT_SESSION_ID}`,
              cancel_url: `${origin}/team?org=${body.orgId}&checkout=cancel`,
            };
            let session = await stripe.checkout.sessions.create(checkout, {
              idempotencyKey: `team-checkout:${body.orgId}:${body.term}:${body.seats}`,
            });
            if (session.status === "complete") {
              const previousSubscriptionId =
                typeof session.subscription === "string"
                  ? session.subscription
                  : session.subscription?.id;
              if (!previousSubscriptionId)
                throw new Error(
                  "The previous checkout is still processing. Refresh the team page.",
                );
              const previous = await stripe.subscriptions.retrieve(previousSubscriptionId);
              if (!["canceled", "incomplete_expired"].includes(previous.status))
                throw new Error(
                  "This team already has a checkout in progress. Refresh the team page.",
                );
            }
            if (session.status !== "open") {
              session = await stripe.checkout.sessions.create(checkout, {
                idempotencyKey: `team-checkout-retry:${body.orgId}:${randomUUID()}`,
              });
            }
            if (!session.url)
              throw new Error("The existing checkout is being confirmed. Refresh the team page.");
            await audit(db, user.id, "team.checkout_started", body.orgId, {
              seats: body.seats,
              term: body.term,
            });
            return json({ url: session.url });
          }
          if (body.action === "portal") {
            if (!entitlement.stripe_customer_id)
              throw new Error("No Stripe billing account is linked to this team.");
            const session = await stripe.billingPortal.sessions.create({
              customer: entitlement.stripe_customer_id,
              return_url: `${origin}/team`,
            });
            return json({ url: session.url });
          }
          if (
            !entitlement.stripe_subscription_id ||
            !entitlement.term ||
            entitlement.status !== "active"
          )
            throw new Error("An active Stripe team plan is required to add seats.");
          const sub = await stripe.subscriptions.retrieve(entitlement.stripe_subscription_id);
          if (sub.metadata?.organizationId !== body.orgId)
            throw new Error("Billing account mismatch.");
          const item = sub.items.data[0];
          if (!item) throw new Error("The seat item is missing from this subscription.");
          const current = item.quantity ?? entitlement.seat_limit;
          if (current + body.addSeats > 1000)
            throw new Error("Contact us for teams over 1,000 seats.");
          const periodEnd = item.current_period_end * 1000;
          const periodStart = item.current_period_start * 1000;
          const fraction = Math.max(
            0,
            Math.min(1, (periodEnd - Date.now()) / Math.max(1, periodEnd - periodStart)),
          );
          const term = entitlement.term as TeamTerm;
          const legacyV2Price = item.price.lookup_key?.endsWith("-v2") ?? false;
          const oldPeriodCents = (seats: number) => {
            const monthsCharged = term === "annual" ? 10 : term === "quarterly" ? 3 : 1;
            return (9900 + (seats - TEAM_MIN_SEATS) * 1500) * monthsCharged;
          };
          const periodCents = legacyV2Price
            ? oldPeriodCents
            : (seats: number) => teamPeriodCents(seats, term);
          const fullPeriodIncrease =
            item.price.billing_scheme === "tiered"
              ? periodCents(current + body.addSeats) - periodCents(current)
              : (item.price.unit_amount ?? 0) * body.addSeats;
          const estimateCents = Math.round(fullPeriodIncrease * fraction);
          if (body.action === "quote")
            return json({
              addSeats: body.addSeats,
              newSeatLimit: current + body.addSeats,
              estimateCents,
              unitCents: item.price.billing_scheme === "tiered" ? null : item.price.unit_amount,
              term: entitlement.term,
              periodEnd: new Date(periodEnd).toISOString(),
              note: "Prorated estimate before tax or discounts. Stripe shows the final invoice.",
            });
          const updated = await stripe.subscriptions.update(sub.id, {
            items: [{ id: item.id, quantity: current + body.addSeats }],
            proration_behavior: "always_invoice",
            payment_behavior: "pending_if_incomplete",
          });
          await audit(db, user.id, "team.add_seats_requested", body.orgId, {
            before: current,
            requested: current + body.addSeats,
            status: updated.status,
          });
          return json({
            pending: true,
            requestedSeatLimit: current + body.addSeats,
            message:
              "Stripe is processing the seat change. Available seats update after payment confirmation.",
          });
        } catch (error) {
          return teamError(error);
        }
      },
    },
  },
});
