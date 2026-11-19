import test from "node:test";
import assert from "node:assert/strict";
import { loadModule } from "./helpers/bundle.mjs";
const { isPersonalLanguageThresholdSubscription: allowed, personalSessionSubscription } =
  await loadModule("src/lib/personal-subscription-product.ts");
const { INDIVIDUAL_PRICES } = await loadModule("src/lib/individual-pricing.ts");
const base = () => ({
  id: "sub_lt",
  customer: "cus_owner",
  metadata: { userId: "adult" },
  items: { has_more: false, data: [{ quantity: 1, price: { id: INDIVIDUAL_PRICES.annual } }] },
});
test("only exact Individual/Family prices may affect LT personal subscription state", () => {
  for (const id of Object.values(INDIVIDUAL_PRICES)) {
    const sub = base();
    sub.items.data[0].price.id = id;
    assert.equal(allowed(sub), true);
  }
  for (const sub of [
    {
      ...base(),
      items: { has_more: false, data: [{ quantity: 1, price: { id: "price_junior" } }] },
    },
    { ...base(), metadata: { userId: "adult", billingIssuer: "junior-authenticated-v1" } },
    { ...base(), metadata: { organizationId: "team" } },
    { ...base(), metadata: { documentPurchase: "1" } },
    { ...base(), items: { has_more: true, data: base().items.data } },
    { ...base(), items: { has_more: false, data: [...base().items.data, ...base().items.data] } },
  ])
    assert.equal(allowed(sub), false);
});
test("one-time payments and copied/mismatched user or customer metadata cannot activate a personal subscription", async () => {
  const stripe = { subscriptions: { retrieve: async () => base() } };
  const session = {
    mode: "subscription",
    subscription: "sub_lt",
    customer: "cus_owner",
    client_reference_id: "adult",
  };
  assert.equal((await personalSessionSubscription(stripe, session)).id, "sub_lt");
  for (const patch of [
    { mode: "payment" },
    { client_reference_id: "someone-else" },
    { customer: "cus_other" },
    { subscription: null },
  ])
    assert.equal(await personalSessionSubscription(stripe, { ...session, ...patch }), null);
});
