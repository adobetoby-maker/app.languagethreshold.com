import type Stripe from "stripe";
import { configuredIndividualPriceIds } from "./individual-pricing";
const ref = (value: string | { id: string } | null | undefined) =>
  typeof value === "string" ? value : value?.id;
/** Product isolation only; legacy metadata is not a general ownership proof. */
export function isPersonalLanguageThresholdSubscription(
  sub: Stripe.Subscription | null | undefined,
) {
  if (
    !sub ||
    sub.metadata?.organizationId ||
    sub.metadata?.documentPurchase ||
    sub.metadata?.billingIssuer?.startsWith("junior-") ||
    sub.items.has_more ||
    sub.items.data.length !== 1
  )
    return false;
  const item = sub.items.data[0];
  return item.quantity === 1 && configuredIndividualPriceIds().includes(item.price.id);
}
export async function personalSessionSubscription(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
) {
  const subscription = ref(session.subscription);
  if (session.mode !== "subscription" || !subscription) return null;
  const sub = await stripe.subscriptions.retrieve(subscription);
  const userId = session.client_reference_id ?? session.metadata?.userId;
  return isPersonalLanguageThresholdSubscription(sub) &&
    userId &&
    sub.metadata?.userId === userId &&
    ref(sub.customer) === ref(session.customer)
    ? sub
    : null;
}
