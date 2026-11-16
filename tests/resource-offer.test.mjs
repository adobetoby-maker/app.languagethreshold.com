import assert from "node:assert/strict";
import test from "node:test";
import Stripe from "stripe";
import { loadModule } from "./helpers/bundle.mjs";
const { resourceOfferService, verifyOfferInvoiceWebhook } = await loadModule(
  "src/lib/resource-offer-server.ts",
  { external: ["stripe"] },
);
const { applyResourceOfferInvoice, recordResourceOfferPaid } = await loadModule(
  "src/lib/resource-offer-invoice.ts",
  { external: ["stripe"] },
);
const { adultOfferAccount, RESOURCE_OFFER_COUPON } = await loadModule("src/lib/resource-offer.ts");
const { INDIVIDUAL_PRICES } = await loadModule("src/lib/individual-pricing.ts");
const user = { id: "10000000-0000-4000-8000-000000000001", email: "adult@example.test" };
const clone = (value) => structuredClone(value);
function fixture() {
  let now = Date.parse("2026-11-16T12:00:00Z"),
    claim = null,
    lease = null,
    profile = null,
    coupon = null,
    invoice = null;
  const calls = [],
    customers = new Map(),
    promotions = new Map(),
    sessions = new Map(),
    subscriptions = new Map(),
    idempotency = new Map(),
    failOnce = new Set();
  const prices = new Map(
    Object.entries(INDIVIDUAL_PRICES).map(([name, id]) => [
      id,
      {
        id,
        active: true,
        currency: "usd",
        product: name.startsWith("family") ? "prod_family" : "prod_individual",
        unit_amount: { monthly: 1900, annual: 14900, familyMonthly: 3500, family: 24900 }[name],
        recurring: { interval: name === "monthly" || name === "familyMonthly" ? "month" : "year" },
      },
    ]),
  );
  const repo = {
    read: async (id) => (id === user.id ? clone(claim) : null),
    profileCustomer: async () => profile,
    reserve: async (id, resource, nextLease, purpose) => {
      if (id !== user.id) throw Error("wrong actor");
      claim ||= {
        id: "20000000-0000-4000-8000-000000000001",
        user_id: id,
        resource_slug: resource,
        code: "LT10-0123456789ABCDEF0123456789ABCDEF",
        state: "pending",
        stripe_customer_id: null,
        stripe_promotion_id: null,
        customer_attempted_at: null,
        promotion_attempted_at: null,
        checkout_attempt_id: null,
        checkout_attempted_at: null,
        checkout_plan: null,
        checkout_price_id: null,
        checkout_product_id: null,
        checkout_unit_amount: null,
        checkout_session_id: null,
        applied_invoice_id: null,
      };
      if (claim.state === "redeemed" || (claim.state === "issued" && purpose === "claim"))
        return clone(claim);
      if (lease && lease !== nextLease) throw Error("busy");
      lease = nextLease;
      return clone(claim);
    },
    checkpoint: async (id, expectedLease, phase, fields = {}) => {
      if (id !== user.id || expectedLease !== lease) throw Error("lease changed");
      if (failOnce.delete(phase)) throw Error("storage unavailable");
      if (phase === "attempt_customer") claim.customer_attempted_at ||= new Date(now).toISOString();
      else if (phase === "customer") {
        if (profile && profile !== fields.customer) throw Error("profile changed");
        claim.stripe_customer_id = profile = fields.customer;
      } else if (phase === "attempt_promotion")
        claim.promotion_attempted_at ||= new Date(now).toISOString();
      else if (phase === "issued") {
        claim.stripe_promotion_id = fields.promotion;
        claim.state = "issued";
        lease = null;
      } else if (phase === "attempt_checkout") {
        if (claim.checkout_plan && claim.checkout_plan !== fields.plan) throw Error("plan changed");
        claim.checkout_plan = fields.plan;
        claim.checkout_price_id = fields.price;
        claim.checkout_product_id = fields.product;
        claim.checkout_unit_amount = fields.amount;
        claim.checkout_attempt_id ||= "30000000-0000-4000-8000-000000000001";
        claim.checkout_attempted_at ||= new Date(now).toISOString();
      } else if (phase === "checkout") {
        claim.checkout_session_id = fields.session;
        lease = null;
      } else if (phase === "expired_checkout") {
        claim.checkout_session_id =
          claim.checkout_plan =
          claim.checkout_price_id =
          claim.checkout_product_id =
          claim.checkout_unit_amount =
          claim.checkout_attempt_id =
          claim.checkout_attempted_at =
            null;
      } else if (phase === "invoice") {
        if (claim.applied_invoice_id && claim.applied_invoice_id !== fields.invoice)
          throw Error("invoice changed");
        claim.applied_invoice_id = fields.invoice;
        lease = null;
      } else if (phase === "redeemed") {
        assert.equal(fields.invoice, claim.applied_invoice_id);
        claim.state = "redeemed";
        lease = null;
      } else if (phase === "release") lease = null;
      else if (phase === "uncertain") {
        if (claim.state === "pending") claim.state = "uncertain";
        lease = null;
      }
      return clone(claim);
    },
  };
  const idem = (kind, input, options, create) => {
    const key = options.idempotencyKey,
      previous = idempotency.get(key);
    if (previous) {
      assert.deepEqual(input, previous.input);
      return clone(previous.value);
    }
    calls.push([kind, clone(input), clone(options)]);
    const value = create();
    idempotency.set(key, { input: clone(input), value: clone(value) });
    return clone(value);
  };
  const stripe = {
    prices: {
      retrieve: async (id) => clone(prices.get(id)),
      list: async () => {
        throw Error("unexpected team catalog read");
      },
    },
    paymentLinks: {
      list: async () => {
        throw Error("unexpected Junior catalog read");
      },
    },
    customers: {
      search: async () => ({
        data: clone([...customers.values()].filter((c) => c.metadata?.userId === user.id)),
        has_more: false,
      }),
      retrieve: async (id) => {
        if (!customers.has(id)) throw Error("missing customer");
        return clone(customers.get(id));
      },
      create: async (input, options) =>
        idem("customer", input, options, () => {
          const value = { id: "cus_resource1", ...input };
          customers.set(value.id, value);
          return value;
        }),
    },
    coupons: {
      retrieve: async () => {
        if (!coupon)
          throw new Stripe.errors.StripeInvalidRequestError({
            message: "missing",
            code: "resource_missing",
          });
        return clone(coupon);
      },
      create: async (input, options) =>
        idem(
          "coupon",
          input,
          options,
          () =>
            (coupon = {
              ...input,
              valid: true,
              amount_off: null,
              max_redemptions: null,
              redeem_by: null,
            }),
        ),
    },
    promotionCodes: {
      list: async ({ code, customer }) => ({
        data: clone(
          [...promotions.values()].filter((p) => p.code === code && p.customer === customer),
        ),
        has_more: false,
      }),
      retrieve: async (id) => clone(promotions.get(id)),
      create: async (input, options) =>
        idem("promotion", input, options, () => {
          const value = { id: "promo_resource1", active: true, times_redeemed: 0, ...input };
          promotions.set(value.id, value);
          return value;
        }),
    },
    subscriptions: {
      search: async () => ({
        data: clone([...subscriptions.values()].filter((s) => s.metadata?.userId === user.id)),
        has_more: false,
      }),
      list: async ({ customer }) => ({
        data: clone([...subscriptions.values()].filter((s) => s.customer === customer)),
        has_more: false,
      }),
      retrieve: async (id) => clone(subscriptions.get(id)),
    },
    checkout: {
      sessions: {
        create: async (input, options) =>
          idem("checkout", input, options, () => {
            const value = {
              id: "cs_test_resource1",
              url: "https://checkout.stripe.com/c/pay/resource1",
              status: "open",
              subscription: null,
              ...input,
            };
            sessions.set(value.id, value);
            return value;
          }),
        retrieve: async (id) => clone(sessions.get(id)),
      },
    },
    invoices: {
      retrieve: async () => clone(invoice),
      update: async (id, input, options) => {
        calls.push(["invoice", clone(input), clone(options)]);
        assert.equal(id, invoice.id);
        assert.equal(invoice.status, "draft");
        invoice.discounts = [
          {
            id: "di_resource",
            deleted: undefined,
            promotion_code: claim.stripe_promotion_id,
            source: { type: "coupon", coupon: RESOURCE_OFFER_COUPON },
          },
        ];
        invoice.total_discount_amounts = [
          { amount: Math.round(invoice.lines.data[0].amount * 0.1), discount: "di_resource" },
        ];
        invoice.amount_due -= invoice.total_discount_amounts[0].amount;
        return clone(invoice);
      },
    },
    webhookEndpoints: {
      list: async () => ({
        data: [
          {
            status: "enabled",
            url: "https://app.languagethreshold.com/api/stripe-webhook",
            enabled_events: ["invoice.created", "invoice.paid"],
          },
        ],
        has_more: false,
      }),
    },
  };
  const service = resourceOfferService({ stripe, repo, now: () => now });
  return {
    service,
    stripe,
    repo,
    calls,
    customers,
    promotions,
    sessions,
    subscriptions,
    failOnce,
    get claim() {
      return clone(claim);
    },
    set claim(v) {
      claim = clone(v);
    },
    get invoice() {
      return invoice;
    },
    set invoice(v) {
      invoice = v;
    },
    set profile(v) {
      profile = v;
    },
    advance: (ms) => (now += ms),
    async paidDraft() {
      await service.claim(user);
      await service.checkout(user, "monthly", "https://app.languagethreshold.com");
      const session = sessions.get(claim.checkout_session_id);
      session.status = "complete";
      session.subscription = "sub_resource";
      subscriptions.set("sub_resource", {
        id: "sub_resource",
        customer: claim.stripe_customer_id,
        status: "trialing",
        metadata: { userId: user.id, resourceOfferClaimId: claim.id },
        items: { data: [{ price: prices.get(INDIVIDUAL_PRICES.monthly) }] },
      });
      invoice = {
        id: "in_resource",
        status: "draft",
        billing_reason: "subscription_cycle",
        amount_due: 1900,
        amount_paid: 0,
        currency: "usd",
        customer: claim.stripe_customer_id,
        parent: {
          subscription_details: {
            subscription: "sub_resource",
            metadata: { userId: user.id, resourceOfferClaimId: claim.id },
          },
        },
        discounts: [],
        total_discount_amounts: [],
        lines: {
          has_more: false,
          data: [
            {
              quantity: 1,
              amount: 1900,
              currency: "usd",
              discountable: true,
              pricing: { price_details: { price: INDIVIDUAL_PRICES.monthly } },
              parent: { subscription_item_details: { proration: false } },
            },
          ],
        },
      };
      return clone(invoice);
    },
  };
}
test("only confirmed parent/adult accounts are eligible; child flags and synthetic child-domain accounts cannot claim", () => {
  const adult = { email: "parent@example.test", email_confirmed_at: "2026-11-16" };
  assert.equal(adultOfferAccount(adult), true);
  for (const changes of [
    { email_confirmed_at: null },
    { app_metadata: { is_kid: true } },
    { user_metadata: { is_kid: true } },
    { email: "learner@kids.languagethreshold.app" },
    { email: "learner@kids.juniorlinguist.app" },
  ])
    assert.equal(adultOfferAccount({ ...adult, ...changes }), false);
});
test("each account gets one customer-bound single-redemption code while the shared coupon remains available to other readers", async () => {
  const f = fixture();
  const first = await f.service.claim(user, "module-one"),
    second = await f.service.claim(user, "module-two");
  assert.equal(first.code, second.code);
  assert.equal(f.claim.resource_slug, "module-one");
  assert.equal(f.calls.filter((c) => c[0] === "customer").length, 1);
  const coupon = f.calls.find((c) => c[0] === "coupon")[1],
    promo = f.calls.find((c) => c[0] === "promotion")[1];
  assert.equal(coupon.percent_off, 10);
  assert.equal(coupon.duration, "once");
  assert.equal(coupon.max_redemptions, undefined);
  assert.deepEqual(coupon.applies_to.products, ["prod_family", "prod_individual"]);
  assert.equal(promo.max_redemptions, 1);
  assert.equal(promo.customer, f.claim.stripe_customer_id);
  assert.equal(promo.expires_at, undefined);
  assert.equal(coupon.redeem_by, undefined);
});
test("concurrent claims and lost provider-receipt saves cannot issue duplicate customers or codes", async () => {
  const f = fixture();
  const result = await Promise.allSettled([f.service.claim(user), f.service.claim(user)]);
  assert.ok(result.some((r) => r.status === "fulfilled"));
  assert.equal(f.calls.filter((c) => c[0] === "customer").length, 1);
  const g = fixture();
  g.failOnce.add("issued");
  await assert.rejects(g.service.claim(user));
  const recovered = await g.service.claim(user);
  assert.equal(recovered.status, "ready");
  assert.equal(g.calls.filter((c) => c[0] === "promotion").length, 1);
  const h = fixture();
  h.failOnce.add("customer");
  await assert.rejects(h.service.claim(user));
  await h.service.claim(user);
  assert.equal(h.calls.filter((c) => c[0] === "customer").length, 1);
});
test("ambiguous customer creation past the provider idempotency window holds instead of recreating a customer", async () => {
  const f = fixture();
  f.failOnce.add("customer");
  await assert.rejects(f.service.claim(user));
  f.advance(24 * 3600000);
  f.stripe.customers.search = async () => ({ data: [], has_more: false });
  await assert.rejects(f.service.claim(user), /reconciliation/);
  assert.equal(f.calls.filter((c) => c[0] === "customer").length, 1);
});
test("unsafe legacy userId metadata holds for review after the profile cache is removed", async () => {
  const f = fixture();
  f.customers.set("cus_legacy", { id: "cus_legacy", metadata: {} });
  f.subscriptions.set("sub_legacy", {
    id: "sub_legacy",
    customer: "cus_legacy",
    status: "active",
    metadata: { userId: user.id },
    items: { data: [{ price: { product: "prod_individual" } }] },
  });
  await assert.rejects(f.service.claim(user), /could not be verified/);
  assert.equal(f.claim.stripe_customer_id, null);
  assert.equal(f.calls.filter((c) => c[0] === "customer").length, 0);
});
test("an unverified existing billing identity cannot be replaced or borrowed", async () => {
  const f = fixture();
  f.profile = "cus_foreign";
  f.customers.set("cus_foreign", { id: "cus_foreign", metadata: { userId: "another-user" } });
  await assert.rejects(f.service.claim(user), /could not be verified/);
  assert.equal(f.calls.length, 0);
});
test("checkout preserves the seven-day trial, binds the stable customer and reserves the discount for a paid invoice", async () => {
  const f = fixture();
  await f.service.claim(user);
  const one = await f.service.checkout(user, "monthly", "https://app.languagethreshold.com");
  const two = await f.service.checkout(user, "monthly", "https://app.languagethreshold.com");
  assert.equal(one.url, two.url);
  assert.equal(f.calls.filter((c) => c[0] === "checkout").length, 1);
  const payload = f.calls.find((c) => c[0] === "checkout")[1];
  assert.equal(payload.subscription_data.trial_period_days, 7);
  assert.equal(payload.customer, f.claim.stripe_customer_id);
  assert.equal(payload.discounts, undefined);
  assert.equal(payload.allow_promotion_codes, undefined);
  assert.match(payload.custom_text.submit.message, /after the 7-day trial/);
  assert.equal(f.claim.checkout_price_id, INDIVIDUAL_PRICES.monthly);
  assert.equal(f.claim.checkout_unit_amount, 1900);
  await assert.rejects(
    f.service.checkout(user, "family", "https://app.languagethreshold.com"),
    /already open/,
  );
  await assert.rejects(
    f.service.checkout(user, "junior", "https://app.languagethreshold.com"),
    /eligible/,
  );
});
test("active eligible subscriptions prevent another subscription, regardless of stale app profile state", async () => {
  const f = fixture();
  await f.service.claim(user);
  f.subscriptions.set("sub_existing", {
    id: "sub_existing",
    customer: f.claim.stripe_customer_id,
    status: "active",
    items: { data: [{ price: { product: "prod_individual" } }] },
  });
  await assert.rejects(
    f.service.checkout(user, "annual", "https://app.languagethreshold.com"),
    /already have an active/,
  );
  assert.equal(
    f.calls.some((c) => c[0] === "checkout"),
    false,
  );
});
test("the $0 trial invoice and proration invoices never consume the reserved one-use discount", async () => {
  const f = fixture(),
    invoice = await f.paidDraft();
  assert.equal(
    (await applyResourceOfferInvoice(f.stripe, f.repo, { ...invoice, amount_due: 0 })).applied,
    false,
  );
  assert.equal(
    (
      await applyResourceOfferInvoice(f.stripe, f.repo, {
        ...invoice,
        billing_reason: "subscription_update",
      })
    ).applied,
    false,
  );
  assert.equal(
    f.calls.some((c) => c[0] === "invoice"),
    false,
  );
  assert.equal(f.claim.applied_invoice_id, null);
});
test("the first positive regular invoice receives 10% exactly once; retries and later invoices do not extend the offer", async () => {
  const f = fixture(),
    invoice = await f.paidDraft();
  assert.equal((await applyResourceOfferInvoice(f.stripe, f.repo, invoice)).applied, true);
  assert.equal(f.invoice.amount_due, 1710);
  assert.equal(f.claim.applied_invoice_id, invoice.id);
  assert.equal((await applyResourceOfferInvoice(f.stripe, f.repo, invoice)).applied, true);
  assert.equal(f.calls.filter((c) => c[0] === "invoice").length, 1);
  assert.equal(
    (await applyResourceOfferInvoice(f.stripe, f.repo, { ...invoice, id: "in_renewal" })).applied,
    false,
  );
  const paid = { ...f.invoice, status: "paid", amount_paid: 1710 };
  f.invoice = paid;
  const p = [...f.promotions.values()][0];
  p.times_redeemed = 1;
  p.active = false;
  assert.equal((await recordResourceOfferPaid(f.stripe, f.repo, paid)).recorded, true);
  assert.equal(f.claim.state, "redeemed");
  assert.equal((await recordResourceOfferPaid(f.stripe, f.repo, paid)).recorded, false);
});
test("out-of-order paid delivery recovers a lost invoice receipt without creating another discount", async () => {
  const f = fixture(),
    invoice = await f.paidDraft();
  f.failOnce.add("invoice");
  await assert.rejects(applyResourceOfferInvoice(f.stripe, f.repo, invoice));
  assert.equal(f.claim.applied_invoice_id, null);
  const paid = { ...f.invoice, status: "paid", amount_paid: 1710 };
  f.invoice = paid;
  assert.equal((await recordResourceOfferPaid(f.stripe, f.repo, paid)).recorded, true);
  assert.equal(f.claim.state, "redeemed");
  assert.equal(f.calls.filter((c) => c[0] === "invoice").length, 1);
});
test("foreign customers, unrelated prices, mixed invoices and another discount are never modified", async () => {
  for (const change of ["customer", "price", "mixed", "discount", "finalized"]) {
    const f = fixture(),
      invoice = await f.paidDraft();
    if (change === "customer") invoice.customer = "cus_foreign";
    if (change === "price") f.invoice.lines.data[0].pricing.price_details.price = "price_unrelated";
    if (change === "mixed") f.invoice.lines.has_more = true;
    if (change === "discount")
      f.invoice.discounts = [
        { id: "di_other", promotion_code: "promo_other", source: { coupon: "another-coupon" } },
      ];
    if (change === "finalized") f.invoice.status = "open";
    await assert.rejects(applyResourceOfferInvoice(f.stripe, f.repo, invoice), /needs review/);
    assert.equal(f.calls.filter((c) => c[0] === "invoice").length, 0);
  }
});
test("claim creation requires the exact enabled invoice webhook and never changes registrations itself", async () => {
  const f = fixture();
  await verifyOfferInvoiceWebhook(f.stripe, "https://app.languagethreshold.com/api/stripe-webhook");
  f.stripe.webhookEndpoints.list = async () => ({
    data: [
      {
        status: "enabled",
        url: "https://app.languagethreshold.com/api/stripe-webhook",
        enabled_events: ["invoice.paid"],
      },
    ],
    has_more: false,
  });
  await assert.rejects(
    verifyOfferInvoiceWebhook(f.stripe, "https://app.languagethreshold.com/api/stripe-webhook"),
    /not ready/,
  );
});
