// One-time (safe to rerun) import of historical Stripe cash activity.
// Run only after the team_platform migration with STRIPE_SECRET_KEY,
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const key = process.env.STRIPE_SECRET_KEY;
const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!key || !url || !serviceKey) {
  throw new Error("STRIPE_SECRET_KEY, SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
}

const stripe = new Stripe(key, { apiVersion: "2026-04-22.dahlia" });
const db = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const counts = { invoices: 0, checkouts: 0, refunds: 0, fees: 0 };

async function insert(ref, amountCents, category, created, memo = ref) {
  if (!amountCents) return;
  const { error } = await db.from("platform_ledger_entries").upsert({
    occurred_on: new Date(created * 1000).toISOString().slice(0, 10),
    category,
    amount_cents: amountCents,
    source: "stripe",
    external_ref: ref,
    memo,
  }, { onConflict: "external_ref", ignoreDuplicates: true });
  if (error) throw error;
}

for await (const invoice of stripe.invoices.list({ limit: 100, status: "paid" })) {
  if (invoice.amount_paid > 0) {
    await insert(`invoice:${invoice.id}`, invoice.amount_paid, "Subscription revenue", invoice.created);
    counts.invoices++;
  }
}
for await (const session of stripe.checkout.sessions.list({ limit: 100 })) {
  if (session.mode === "payment" && session.payment_status === "paid" && !session.invoice && session.amount_total) {
    await insert(`checkout:${session.id}`, session.amount_total, "One-time revenue", session.created);
    counts.checkouts++;
  }
}
for await (const refund of stripe.refunds.list({ limit: 100 })) {
  if (refund.status === "succeeded") {
    await insert(`refund:${refund.id}`, -refund.amount, "Refunds", refund.created);
    counts.refunds++;
  }
}
for await (const transaction of stripe.balanceTransactions.list({ limit: 100, type: "charge" })) {
  if (transaction.fee > 0) {
    await insert(`fee:${transaction.id}`, -transaction.fee, "Payment processing", transaction.created);
    counts.fees++;
  }
}
process.stdout.write(`Stripe ledger backfill complete: ${JSON.stringify(counts)}\n`);
