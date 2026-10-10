import { createFileRoute } from "@tanstack/react-router";
import Stripe from "stripe";
import { z } from "zod";
import {
  audit,
  authenticatedUser,
  json,
  requireTeamAdmin,
  teamAdminClient,
  teamError,
} from "@/lib/team-server";

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("checkout"),
    orgId: z.string().uuid(),
    term: z.enum(["quarterly", "annual"]),
    seats: z.number().int().min(15).max(1000),
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
const unitCents = { quarterly: 4980, annual: 16600 } as const;

export const Route = createFileRoute("/api/team-billing")({
  server: {
    handlers: {
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
            if (process.env.TEAM_ENROLLMENT_ENABLED !== "true")
              throw new Error("Team enrollment is paused while invitation email is being set up.");
            if (
              entitlement.stripe_subscription_id &&
              ["active", "past_due"].includes(entitlement.status)
            )
              throw new Error(
                "This team already has a subscription. Use Add seats or Manage billing.",
              );
            const unit = unitCents[body.term];
            const checkout: Stripe.Checkout.SessionCreateParams = {
              mode: "subscription",
              customer_email: org.billing_email,
              client_reference_id: user.id,
              line_items: [
                {
                  quantity: body.seats,
                  price_data: {
                    currency: "usd",
                    unit_amount: unit,
                    product_data: { name: "Language Threshold Teams learner seat" },
                    recurring:
                      body.term === "quarterly"
                        ? { interval: "month", interval_count: 3 }
                        : { interval: "year" },
                  },
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
              success_url: `${origin}/team?checkout=success`,
              cancel_url: `${origin}/team?checkout=cancel`,
            };
            let session = await stripe.checkout.sessions.create(checkout, {
              idempotencyKey: `team-checkout:${body.orgId}:${body.term}:${body.seats}`,
            });
            if (session.status === "expired") {
              session = await stripe.checkout.sessions.create(checkout, {
                idempotencyKey: `team-checkout-retry:${body.orgId}:${Date.now()}`,
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
          const estimateCents = Math.round(
            unitCents[entitlement.term as "quarterly" | "annual"] * body.addSeats * fraction,
          );
          if (body.action === "quote")
            return json({
              addSeats: body.addSeats,
              newSeatLimit: current + body.addSeats,
              estimateCents,
              unitCents: unitCents[entitlement.term as "quarterly" | "annual"],
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
