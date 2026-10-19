import { createFileRoute } from "@tanstack/react-router";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { audit, sendTeamEmail, teamAdminClient } from "@/lib/team-server";
import { syncTeamSubscription } from "@/lib/team-subscription";

async function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service role not configured");
  return createClient(url, key);
}

async function updateProfileData(userId: string, patch: Record<string, unknown>) {
  const client = await getSupabaseAdmin();

  const { data: existing } = await client.from("profiles").select("data").eq("id", userId).single();

  const merged = { ...(existing?.data ?? {}), ...patch };

  await client
    .from("profiles")
    .upsert({ id: userId, data: merged, updated_at: new Date().toISOString() });
}

function customerId(raw: Stripe.Subscription["customer"]): string | undefined {
  return typeof raw === "string" ? raw : undefined;
}

function invoiceSubscriptionId(inv: Stripe.Invoice) {
  const raw = inv as unknown as {
    parent?: { subscription_details?: { subscription?: string | { id: string } } };
  };
  const sub = raw.parent?.subscription_details?.subscription;
  return typeof sub === "string" ? sub : sub?.id;
}

async function recordStripeEntry(
  ref: string,
  amountCents: number,
  category: string,
  orgId?: string,
  occurredAt = Date.now(),
) {
  if (!amountCents) return;
  const db = teamAdminClient();
  const { error } = await db.from("platform_ledger_entries").upsert(
    {
      occurred_on: new Date(occurredAt).toISOString().slice(0, 10),
      category,
      amount_cents: amountCents,
      source: "stripe",
      external_ref: ref,
      organization_id: orgId ?? null,
      memo: ref,
    },
    { onConflict: "external_ref", ignoreDuplicates: true },
  );
  if (error) throw error;
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
              if (session.metadata?.customModuleRequestId) {
                if (session.payment_status !== "paid" || session.amount_total !== 2000)
                  throw new Error("Custom module request payment was not confirmed at $20.");
                const db = teamAdminClient();
                const { data: item, error } = await db
                  .from("custom_module_requests")
                  .select("id,title,audience,situations,vocabulary,status,organization_id")
                  .eq("id", session.metadata.customModuleRequestId)
                  .eq("stripe_session_id", session.id)
                  .single();
                if (error || !item) throw error ?? new Error("Custom module request not found.");
                if (item.status === "pending_payment") {
                  const { error: updateError } = await db
                    .from("custom_module_requests")
                    .update({
                      status: "submitted",
                      paid_at: new Date(event.created * 1000).toISOString(),
                      updated_at: new Date().toISOString(),
                    })
                    .eq("id", item.id)
                    .eq("status", "pending_payment");
                  if (updateError) throw updateError;
                  await audit(
                    db,
                    null,
                    "custom_module.submitted",
                    item.organization_id ?? undefined,
                    { requestId: item.id },
                  );
                  const ownerEmail = process.env.PLATFORM_OWNER_EMAIL;
                  if (ownerEmail) {
                    try {
                      await sendTeamEmail(
                        ownerEmail,
                        `New custom module request: ${item.title}`,
                        `A $20 custom module request was paid.\n\nTitle: ${item.title}\nAudience: ${item.audience}\nSituations: ${item.situations}\nVocabulary: ${item.vocabulary || "None provided"}\n\nReview in the owner dashboard: ${new URL(request.url).origin}/owner`,
                      );
                    } catch {
                      console.error("Custom module owner email delivery could not be confirmed.");
                    }
                  }
                }
                await recordStripeEntry(
                  `checkout:${session.id}`,
                  session.amount_total,
                  "Custom module request revenue",
                  item.organization_id ?? undefined,
                  event.created * 1000,
                );
                break;
              }
              if (session.metadata?.organizationId) {
                const subscriptionId =
                  typeof session.subscription === "string"
                    ? session.subscription
                    : session.subscription?.id;
                if (subscriptionId)
                  await syncTeamSubscription(await stripe.subscriptions.retrieve(subscriptionId));
                break;
              }
              if (session.mode === "payment" && session.amount_total) {
                await recordStripeEntry(
                  `checkout:${session.id}`,
                  session.amount_total,
                  "One-time revenue",
                  undefined,
                  event.created * 1000,
                );
              }
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
              if (await syncTeamSubscription(sub)) break;
              const userId = sub.metadata?.userId;
              if (userId) {
                const primaryItem = sub.items.data[0];
                await updateProfileData(userId, {
                  subscription_status: sub.status,
                  subscription_id: sub.id,
                  period_end: primaryItem?.current_period_end ?? null,
                  price_id: primaryItem?.price?.id ?? null,
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
              if (await syncTeamSubscription(sub)) break;
              const userId = sub.metadata?.userId;
              if (userId) {
                await updateProfileData(userId, { subscription_status: "canceled" });
              }
              break;
            }

            case "customer.subscription.paused": {
              const sub = event.data.object as Stripe.Subscription;
              if (await syncTeamSubscription(sub)) break;
              const userId = sub.metadata?.userId;
              if (userId) {
                await updateProfileData(userId, { subscription_status: "paused" });
              }
              break;
            }

            case "customer.subscription.resumed": {
              const sub = event.data.object as Stripe.Subscription;
              if (await syncTeamSubscription(sub)) break;
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
              const subId = invoiceSubscriptionId(inv);
              const subscription = subId ? await stripe.subscriptions.retrieve(subId) : null;
              if (subscription) await syncTeamSubscription(subscription);
              await recordStripeEntry(
                `invoice:${inv.id}`,
                inv.amount_paid,
                "Subscription revenue",
                subscription?.metadata.organizationId,
                event.created * 1000,
              );
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
              const subId = invoiceSubscriptionId(inv);
              if (subId) {
                await syncTeamSubscription(await stripe.subscriptions.retrieve(subId));
              }
              const userId = inv.metadata?.userId;
              if (userId) {
                await updateProfileData(userId, { last_payment_failed: true });
              }
              break;
            }

            case "charge.refunded": {
              const charge = event.data.object as Stripe.Charge;
              for (const refund of charge.refunds?.data ?? []) {
                if (refund.status === "succeeded")
                  await recordStripeEntry(
                    `refund:${refund.id}`,
                    -refund.amount,
                    "Refunds",
                    undefined,
                    refund.created * 1000,
                  );
              }
              break;
            }

            case "charge.succeeded":
            case "charge.updated": {
              const charge = event.data.object as Stripe.Charge;
              const fullCharge = await stripe.charges.retrieve(charge.id, {
                expand: ["balance_transaction"],
              });
              const balance = fullCharge.balance_transaction;
              if (balance && typeof balance !== "string" && balance.fee > 0) {
                await recordStripeEntry(
                  `fee:${balance.id}`,
                  -balance.fee,
                  "Payment processing",
                  undefined,
                  balance.created * 1000,
                );
              }
              break;
            }
          }
        } catch {
          console.error("Webhook processing could not be confirmed.");
          return new Response("Webhook processing failed", { status: 500 });
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
