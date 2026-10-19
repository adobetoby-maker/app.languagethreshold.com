import type Stripe from "stripe";
import { INDIVIDUAL_PRICES, INDIVIDUAL_PAYMENT_LINKS } from "./individual-pricing";
import { teamPriceLookupKey } from "./team-pricing";
import { TeamOperationError } from "./team-server";
const unavailable = () =>
  new TeamOperationError(
    "Language Threshold plan products could not be confirmed. No discount was issued.",
    503,
  );
function product(price: Stripe.Price) {
  const id = typeof price.product === "string" ? price.product : price.product?.id;
  if (!price.active || !id || !/^prod_[A-Za-z0-9]+$/.test(id)) throw unavailable();
  return id;
}
/** Scope offers to this app's actual plans, never the Stripe account's other businesses. */
export async function ownerDiscountProducts(stripe: Stripe) {
  const individual = await Promise.all(
    Object.values(INDIVIDUAL_PRICES).map((id) => stripe.prices.retrieve(id)),
  );
  const products = new Set(individual.map(product));
  let after: string | undefined, junior: Stripe.PaymentLink | undefined;
  for (let page = 0; page < 10; page++) {
    const list = await stripe.paymentLinks.list({
      limit: 100,
      ...(after ? { starting_after: after } : {}),
    });
    junior = list.data.find((link) => link.url === INDIVIDUAL_PAYMENT_LINKS.junior && link.active);
    if (junior || !list.has_more) break;
    after = list.data.at(-1)?.id;
    if (!after) throw unavailable();
  }
  if (!junior) throw unavailable();
  const items = await stripe.paymentLinks.listLineItems(junior.id, { limit: 10 });
  if (items.has_more || items.data.length !== 1 || !items.data[0].price) throw unavailable();
  products.add(product(items.data[0].price));
  // Resolve existing catalog records only; issuing a coupon never creates prices.
  const team = await Promise.all(
    (["monthly", "quarterly", "annual"] as const).map(async (term) => {
      const result = await stripe.prices.list({
        lookup_keys: [teamPriceLookupKey(term)],
        limit: 1,
      });
      if (!result.data[0]) throw unavailable();
      return result.data[0];
    }),
  );
  for (const price of team) products.add(product(price));
  return [...products].sort();
}
