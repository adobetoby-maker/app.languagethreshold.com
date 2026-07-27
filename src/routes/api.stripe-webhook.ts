import { createFileRoute } from "@tanstack/react-router";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

async function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service role not configured");
  return createClient(url, key);
}

async function updateProfileData(
  userId: string,
  patch: Record<string, unknown>,
) {
  const client = await getSupabaseAdmin();

  const { data: existing } = await client
    .from("profiles")
    .select("data")
    .eq("id", userId)
    .single();

  const merged = { ...(existing?.data ?? {}), ...patch };

  await client
    .from("profiles")
    .upsert({ id: userId, data: merged, updated_at: new Date().toISOString() });
}

function customerId(raw: Stripe.Subscription["customer"]): string | undefined {
  return typeof raw === "string" ? raw : undefined;
}

export const Route = createFileRoute("/api/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const SECRET_KEY = process.env.STRIPE_SECRET_KEY;
        const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

        if (!SECRET_KEY || !WEBHOOK_SECRET) {
          return new Response("Stripe not configured", { status: 503 });
        }

        const rawBody = await request.text();
        const sig = request.headers.get("stripe-signature") ?? "";

        const stripe = new Stripe(SECRET_KEY, { apiVersion: "2026-04-22.dahlia" });

        let event: Stripe.Event;
        try {
          event = await stripe.webhooks.constructEventAsync(rawBody, sig, WEBHOOK_SECRET);
        } catch {
          return new Response("Invalid signature", { status: 400 });
        }

        try {
          switch (event.type) {
            // ── Trial / checkout ──────────────────────────────────────────
            case "checkout.session.completed": {
              const session = event.data.object as Stripe.Checkout.Session;
              const userId = session.client_reference_id ?? session.metadata?.userId;
              if (userId) {
                await updateProfileData(userId, {
                  subscription_status: session.subscription ? "trialing" : "active",
                  ...(typeof session.customer === "string"
                    ? { stripe_customer_id: session.customer }
                    : {}),
                });
              }
              break;
            }

            // ── Subscription lifecycle ────────────────────────────────────
            case "customer.subscription.created":
            case "customer.subscription.updated": {
              const sub = event.data.object as Stripe.Subscription;
              const userId = sub.metadata?.userId;
              if (userId) {
                await updateProfileData(userId, {
                  subscription_status: sub.status,
                  subscription_id: sub.id,
                  period_end: sub.items.data[0]?.current_period_end ?? null,
                  price_id: sub.items.data[0]?.price?.id ?? null,
                  cancel_at_period_end: sub.cancel_at_period_end,
                  ...(customerId(sub.customer)
                    ? { stripe_customer_id: customerId(sub.customer) }
                    : {}),
                });
              }
              break;
            }

            case "customer.subscription.deleted": {
              const sub = event.data.object as Stripe.Subscription;
              const userId = sub.metadata?.userId;
              if (userId) {
                await updateProfileData(userId, { subscription_status: "canceled" });
              }
              break;
            }

            case "customer.subscription.paused": {
              const sub = event.data.object as Stripe.Subscription;
              const userId = sub.metadata?.userId;
              if (userId) {
                await updateProfileData(userId, { subscription_status: "paused" });
              }
              break;
            }

            case "customer.subscription.resumed": {
              const sub = event.data.object as Stripe.Subscription;
              const userId = sub.metadata?.userId;
              if (userId) {
                await updateProfileData(userId, { subscription_status: "active" });
              }
              break;
            }

            // ── Trial ending soon (fires 3 days before trial expires) ──────
            case "customer.subscription.trial_will_end": {
              const sub = event.data.object as Stripe.Subscription;
              const userId = sub.metadata?.userId;
              if (userId) {
                await updateProfileData(userId, { trial_ending_soon: true });
              }
              break;
            }

            // ── Payment events ────────────────────────────────────────────
            case "invoice.payment_succeeded": {
              const inv = event.data.object as Stripe.Invoice;
              const userId = inv.metadata?.userId;
              if (userId) {
                await updateProfileData(userId, {
                  subscription_status: "active",
                  last_payment_failed: false,
                });
              }
              break;
            }

            case "invoice.payment_failed": {
              const inv = event.data.object as Stripe.Invoice;
              const userId = inv.metadata?.userId;
              if (userId) {
                await updateProfileData(userId, { last_payment_failed: true });
              }
              break;
            }
          }
        } catch (err) {
          console.error("Webhook handler error:", err);
          // Return 200 so Stripe doesn't keep retrying
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
