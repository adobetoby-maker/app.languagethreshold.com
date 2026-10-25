import assert from "node:assert/strict";
import { test } from "node:test";
import { individualCheckoutUrl } from "../src/lib/individual-checkout.ts";
test("successful authenticated checkout uses only the server-created destination", async () => {
  const url = "https://checkout.stripe.com/c/pay/cs_test_example";
  assert.equal(await individualCheckoutUrl(Response.json({ url })), url);
});
test("checkout errors do not silently substitute an immediate-charge payment link", async () => {
  for (const status of [400, 401, 403, 503])
    await assert.rejects(
      individualCheckoutUrl(Response.json({ url: "https://buy.stripe.com/alternate" }, { status })),
      /could not open checkout/,
    );
});
test("missing or unrelated redirect destinations are rejected", async () => {
  for (const url of [
    null,
    7,
    "",
    "https://checkout.stripe.com.evil.test/pay",
    "javascript:alert(1)",
    "http://checkout.stripe.com/pay",
  ])
    await assert.rejects(individualCheckoutUrl(Response.json({ url })), /temporarily unavailable/);
});
