import assert from "node:assert/strict";
import test from "node:test";
import Stripe from "stripe";
import { loadModule } from "./helpers/bundle.mjs";
const { ownerDiscountAction, checkDiscount } = await loadModule("src/lib/owner-discounts.ts");
const { manageOwnerDiscount } = await loadModule("src/lib/owner-discounts-server.ts", {
  external: ["stripe"],
});
const input = () =>
  ownerDiscountAction.parse({
    action: "create",
    requestId: "10000000-0000-4000-8000-000000000003",
    code: "test20",
    kind: "percent",
    value: 20,
    duration: "once",
    maxRedemptions: 2,
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
  });
function fixture() {
  let coupon;
  let promotions = [];
  const calls = [];
  const stripe = {
    prices: {
      retrieve: async (id) => ({ active: true, product: "prod_" + id.replace(/\W|_/g, "") }),
      list: async ({ lookup_keys }) => ({
        data: [
          {
            id: "price_team",
            active: true,
            product: "prod_" + lookup_keys[0].replace(/\W|_/g, ""),
          },
        ],
      }),
      create: async () => {
        throw Error("Unexpected catalog creation");
      },
    },
    paymentLinks: {
      list: async () => ({
        data: [
          {
            id: "plink_junior",
            active: true,
            url: "https://buy.stripe.com/bJe8wRgun8xT6U1eyObfO0d",
          },
        ],
        has_more: false,
      }),
      listLineItems: async () => ({
        data: [{ price: { active: true, product: "prod_junior" } }],
        has_more: false,
      }),
    },
    coupons: {
      retrieve: async (id) => {
        if (coupon) return coupon;
        throw new Stripe.errors.StripeInvalidRequestError({
          message: "missing",
          code: "resource_missing",
        });
      },
      create: async (value, opts) => {
        calls.push(["coupon", value, opts]);
        coupon = {
          ...value,
          percent_off: value.percent_off ?? null,
          amount_off: value.amount_off ?? null,
        };
        return coupon;
      },
    },
    promotionCodes: {
      list: async () => ({ data: promotions }),
      create: async (value, opts) => {
        calls.push(["promotion", value, opts]);
        const p = {
          ...value,
          id: "promo_test",
          active: true,
          times_redeemed: 0,
          promotion: { type: "coupon", coupon },
        };
        promotions.push(p);
        return p;
      },
      retrieve: async () => promotions[0],
      update: async (id, value) => {
        calls.push(["update", id, value]);
      },
    },
  };
  return { stripe, calls, setPromotions: (v) => (promotions = v) };
}
test("discount schema validates amounts, date, duration and finite redemption limits before Stripe writes", () => {
  assert.equal(input().code, "TEST20");
  for (const change of [{ value: 101 }, { expiresAt: "2020-01-01T00:00:00Z" }])
    assert.throws(() => checkDiscount({ ...input(), ...change }));
  for (const change of [
    { maxRedemptions: 0 },
    { duration: "repeating" },
    { code: "<script>" },
    { value: 1.5 },
  ])
    assert.throws(() => ownerDiscountAction.parse({ ...input(), ...change }));
});
test("percentage discounts create actual coupon + promotion; exact retries return the same code without duplicates", async () => {
  const f = fixture(),
    body = input();
  const first = await manageOwnerDiscount(f.stripe, "owner", body);
  const again = await manageOwnerDiscount(f.stripe, "owner", body);
  assert.equal(first.discount.id, again.discount.id);
  assert.equal(f.calls.length, 2);
  assert.equal(f.calls[0][1].percent_off, 20);
  assert.equal(f.calls[0][1].duration, "once");
  assert.equal(f.calls[1][1].max_redemptions, 2);
  assert.equal(f.calls[1][1].expires_at, Math.floor(Date.parse(body.expiresAt) / 1000));
  await assert.rejects(
    manageOwnerDiscount(f.stripe, "owner", { ...body, value: 30 }),
    /different discount settings/,
  );
});
test("USD cents and every-renewal duration remain explicit; unrelated codes cannot be disabled", async () => {
  const f = fixture();
  await manageOwnerDiscount(f.stripe, "owner", {
    ...input(),
    kind: "usd",
    value: 1250,
    duration: "forever",
  });
  assert.equal(f.calls[0][1].amount_off, 1250);
  assert.equal(f.calls[0][1].currency, "usd");
  assert.equal(f.calls[0][1].duration, "forever");
  f.setPromotions([{ id: "promo_external", metadata: {} }]);
  await assert.rejects(
    manageOwnerDiscount(f.stripe, "owner", { action: "disable", promotionId: "promo_external" }),
    /externally created/,
  );
  assert.equal(
    f.calls.some((c) => c[0] === "update"),
    false,
  );
});
test("disabling an owned code changes future redemption only, never a subscription or invoice", async () => {
  const f = fixture();
  await manageOwnerDiscount(f.stripe, "owner", input());
  await manageOwnerDiscount(f.stripe, "owner", { action: "disable", promotionId: "promo_test" });
  assert.deepEqual(f.calls.at(-1), ["update", "promo_test", { active: false }]);
});

test("Stripe setup errors use fixed owner guidance without raw diagnostics", async () => {
  const { ownerDiscountFailure } = await loadModule("src/lib/owner-discounts-server.ts", {
    external: ["stripe"],
  });
  for (const type of [
    "StripeAuthenticationError",
    "StripePermissionError",
    "StripeConnectionError",
    "StripeInvalidRequestError",
  ]) {
    const e = ownerDiscountFailure({ type, message: "PRIVATE_KEY_FRAGMENT" });
    assert.equal(e.status, 503);
    assert.doesNotMatch(e.message, /PRIVATE_KEY_FRAGMENT/);
  }
});

test("owner discount credentials are isolated from the existing billing key", async () => {
  const { ownerStripe } = await loadModule("src/lib/owner-discounts-server.ts", {
    external: ["stripe"],
  });
  const keys = ["STRIPE_OWNER_SECRET_KEY", "STRIPE_SECRET_KEY"];
  const old = keys.map((k) => process.env[k]),
    oldFetch = globalThis.fetch;
  const headers = [];
  try {
    process.env.STRIPE_OWNER_SECRET_KEY = "sk_test_fixture_owner";
    process.env.STRIPE_SECRET_KEY = "sk_test_fixture_billing";
    globalThis.fetch = async (url, init) => {
      headers.push(new Headers(init.headers).get("authorization"));
      return Response.json({ object: "list", data: [], has_more: false, url: "/v1/coupons" });
    };
    await ownerStripe().coupons.list();
    delete process.env.STRIPE_OWNER_SECRET_KEY;
    await ownerStripe().coupons.list();
    assert.deepEqual(headers, ["Bearer sk_test_fixture_owner", "Bearer sk_test_fixture_billing"]);
  } finally {
    globalThis.fetch = oldFetch;
    keys.forEach((k, i) =>
      old[i] === undefined ? delete process.env[k] : (process.env[k] = old[i]),
    );
  }
});

test("coupons are restricted to app plan products and fail closed when the app catalog cannot be verified", async () => {
  const f = fixture();
  await manageOwnerDiscount(f.stripe, "owner", input());
  const scoped = f.calls.find((c) => c[0] === "coupon")[1].applies_to.products;
  assert.equal(scoped.length, 7);
  assert.ok(scoped.includes("prod_junior"));
  assert.ok(scoped.some((p) => p.includes("teammonthly")));
  assert.equal(scoped.includes("prod_unrelatedBusiness"), false);
  const bad = fixture();
  bad.stripe.paymentLinks.list = async () => ({
    data: [{ id: "plink_other", active: true, url: "https://buy.stripe.com/unrelated" }],
    has_more: false,
  });
  await assert.rejects(manageOwnerDiscount(bad.stripe, "owner", input()), /No discount was issued/);
  assert.equal(
    bad.calls.some((c) => c[0] === "coupon"),
    false,
  );
});
