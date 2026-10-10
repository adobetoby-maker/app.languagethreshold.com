import Stripe from "stripe";
import type { TeamDb } from "@/lib/team-server";

type StripeLedgerEntry = {
  occurred_on: string;
  category: string;
  amount_cents: number;
  source: "stripe";
  external_ref: string;
  memo: string;
};

export async function backfillStripeLedger(db: TeamDb) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe billing is not configured.");
  const stripe = new Stripe(key, { apiVersion: "2026-04-22.dahlia" });
  const rows: StripeLedgerEntry[] = [];
  const counts = { invoices: 0, checkouts: 0, refunds: 0, fees: 0 };
  const add = (ref: string, amount: number, category: string, created: number) => {
    if (!amount) return;
    rows.push({
      occurred_on: new Date(created * 1000).toISOString().slice(0, 10),
      category,
      amount_cents: amount,
      source: "stripe",
      external_ref: ref,
      memo: ref,
    });
  };

  for await (const invoice of stripe.invoices.list({ limit: 100, status: "paid" })) {
    if (invoice.amount_paid > 0) {
      add(`invoice:${invoice.id}`, invoice.amount_paid, "Subscription revenue", invoice.created);
      counts.invoices++;
    }
  }
  for await (const session of stripe.checkout.sessions.list({ limit: 100 })) {
    if (
      session.mode === "payment" &&
      session.payment_status === "paid" &&
      !session.invoice &&
      session.amount_total
    ) {
      add(`checkout:${session.id}`, session.amount_total, "One-time revenue", session.created);
      counts.checkouts++;
    }
  }
  for await (const refund of stripe.refunds.list({ limit: 100 })) {
    if (refund.status === "succeeded") {
      add(`refund:${refund.id}`, -refund.amount, "Refunds", refund.created);
      counts.refunds++;
    }
  }
  for await (const transaction of stripe.balanceTransactions.list({ limit: 100, type: "charge" })) {
    if (transaction.fee > 0) {
      add(`fee:${transaction.id}`, -transaction.fee, "Payment processing", transaction.created);
      counts.fees++;
    }
  }

  for (let index = 0; index < rows.length; index += 100) {
    const { error } = await db.from("platform_ledger_entries").upsert(rows.slice(index, index + 100), {
      onConflict: "external_ref",
      ignoreDuplicates: true,
    });
    if (error) throw error;
  }
  return { ...counts, total: rows.length };
}
