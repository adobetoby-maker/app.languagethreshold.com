import Stripe from "stripe";
import { teamAdminClient, TeamOperationError } from "./team-server";
export function documentStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new TeamOperationError("Purchases are temporarily unavailable.", 503);
  return new Stripe(key, { apiVersion: "2026-04-22.dahlia", maxNetworkRetries: 1, timeout: 15000 });
}
export async function fulfillDocumentSession(stripe: Stripe, session: Stripe.Checkout.Session) {
  const kind = session.metadata?.documentPurchase;
  if (!kind) return false;
  if (session.payment_status !== "paid") return true;
  const user = session.metadata?.userId;
  if (!user || !["storage", "translations"].includes(kind))
    throw Error("Invalid document purchase metadata");
  const items = await stripe.checkout.sessions.listLineItems(session.id, { limit: 2 });
  if (
    items.data.length !== 1 ||
    items.data[0].price?.unit_amount !== 500 ||
    items.data[0].quantity !== 1 ||
    items.data[0].price?.currency !== "usd"
  )
    throw Error("Document purchase price mismatch");
  const subId =
    typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
  const sub = subId ? await stripe.subscriptions.retrieve(subId) : null;
  if (
    kind === "storage" &&
    (!sub ||
      session.mode !== "subscription" ||
      sub.metadata.documentPurchase !== "storage" ||
      sub.metadata.userId !== user)
  )
    throw Error("Invalid document storage subscription");
  if (kind === "translations" && session.mode !== "payment")
    throw Error("Invalid document translation payment");
  const db = teamAdminClient();
  const { error } = await db.rpc(
    "document_grant" as never,
    {
      p_user: user,
      p_payment: `checkout:${session.id}`,
      p_kind: kind,
      p_until: sub ? new Date(sub.items.data[0].current_period_end * 1000).toISOString() : null,
      p_subscription: subId ?? null,
      p_customer: typeof session.customer === "string" ? session.customer : null,
    } as never,
  );
  if (error) throw error;
  return true;
}
export async function fulfillDocumentInvoice(
  stripe: Stripe,
  invoice: Stripe.Invoice,
  subscription: Stripe.Subscription | null,
) {
  if (subscription?.metadata.documentPurchase !== "storage") return false;
  if (invoice.status !== "paid") return true;
  const item = subscription.items.data[0];
  if (
    item.price.unit_amount !== 500 ||
    item.price.currency !== "usd" ||
    item.price.recurring?.interval !== "month" ||
    item.quantity !== 1
  )
    throw Error("Invalid storage renewal price");
  const { error } = await teamAdminClient().rpc(
    "document_grant" as never,
    {
      p_user: subscription.metadata.userId,
      p_payment: `invoice:${invoice.id}`,
      p_kind: "storage",
      p_until: new Date(
        Math.min(item.current_period_end, ...invoice.lines.data.map((line) => line.period.end)) *
          1000,
      ).toISOString(),
      p_subscription: subscription.id,
      p_customer: typeof subscription.customer === "string" ? subscription.customer : null,
    } as never,
  );
  if (error) throw error;
  return true;
}
