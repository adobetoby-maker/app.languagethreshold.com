import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
const uid = "10000000-0000-4000-8000-000000000001";
async function fixture(run) {
  const dir = mkdtempSync(resolve("node_modules/.cache/owner-api-"));
  const oldFetch = globalThis.fetch;
  const keys = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "PLATFORM_OWNER_EMAIL",
    "STRIPE_SECRET_KEY",
    "STRIPE_OWNER_SECRET_KEY",
  ];
  const saved = keys.map((k) => process.env[k]);
  try {
    await build({
      stdin: {
        contents: `export {Route as platform} from '@/routes/api.platform';export {Route as users} from '@/routes/api.owner-users';export {Route as discounts} from '@/routes/api.owner-discounts';export {Route as checkout} from '@/routes/api.create-checkout';export {Route as customers} from '@/routes/api.owner-customers';export {Route as referral} from '@/routes/api.customer-referral';export {Route as unsubscribe} from '@/routes/api.customer-unsubscribe';`,
        resolveDir: process.cwd(),
      },
      outfile: join(dir, "api.mjs"),
      bundle: true,
      format: "esm",
      platform: "node",
      packages: "external",
      logLevel: "silent",
      plugins: [
        {
          name: "shell",
          setup(b) {
            b.onResolve({ filter: /^@tanstack\/react-router$/ }, () => ({
              path: "shell",
              namespace: "shell",
            }));
            b.onLoad({ filter: /.*/, namespace: "shell" }, () => ({
              contents: "export const createFileRoute=()=>config=>config;",
            }));
          },
        },
      ],
    });
    const api = await import(join(dir, "api.mjs"));
    process.env.SUPABASE_URL = "https://fixture.invalid";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "fake-service";
    delete process.env.PLATFORM_OWNER_EMAIL;
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_OWNER_SECRET_KEY;
    const c = { role: "learner", calls: [], fail: false };
    globalThis.fetch = async (input, init) => {
      const url = new URL(String(input));
      c.calls.push(url.pathname);
      if (url.pathname === "/auth/v1/user")
        return Response.json({
          id: uid,
          email: "owner@example.invalid",
          email_confirmed_at: "2026-01-01",
          user_metadata: { role: "owner" },
        });
      if (url.pathname === "/rest/v1/platform_admin_roles")
        return Response.json(c.role === "learner" ? [] : [{ role: c.role }]);
      if (c.fail) return Response.json({ message: "PRIVATE backend detail" }, { status: 500 });
      if (url.pathname === "/rest/v1/rpc/platform_user_directory")
        return Response.json({
          users: [{ id: uid, email: "owner@example.invalid" }],
          total: 1,
          page: 0,
          pageSize: 50,
        });
      if (url.pathname === "/rest/v1/platform_audit_events")
        return new Response(null, { status: 201 });
      throw Error("Unexpected private operation " + url.pathname);
    };
    const request = (path, body, auth = true, origin = "https://app.invalid") =>
      new Request("https://app.invalid" + path, {
        method: body ? "POST" : "GET",
        headers: {
          ...(auth ? { authorization: "Bearer fake-token" } : {}),
          ...(body ? { origin, "content-type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    await run(api, c, request);
  } finally {
    globalThis.fetch = oldFetch;
    keys.forEach((k, i) =>
      saved[i] === undefined ? delete process.env[k] : (process.env[k] = saved[i]),
    );
    rmSync(dir, { recursive: true, force: true });
  }
}
test("owner APIs deny guests, support and user-editable role claims before any directory or billing call", () =>
  fixture(async (api, c, req) => {
    for (const route of [api.users, api.discounts, api.customers]) {
      c.calls = [];
      let r = await route.server.handlers.GET({
        request: req("/api/owner-users", undefined, false),
      });
      assert.equal(r.status, 403);
      assert.equal(c.calls.length, 0);
      for (const role of ["learner", "support"]) {
        c.role = role;
        c.calls = [];
        r = await route.server.handlers.GET({ request: req("/api/owner-users") });
        assert.equal(r.status, 403);
        assert.equal(
          c.calls.some((p) => p.includes("/rpc/")),
          false,
        );
        assert.equal(r.headers.get("cache-control"), "private, no-store");
      }
    }
  }));
test("verified owner sees paged directory projection, fixed failures and explicit email readiness", () =>
  fixture(async (api, c, req) => {
    c.role = "owner";
    const r = await api.users.server.handlers.GET({
      request: req("/api/owner-users?search=example&page=1"),
    });
    assert.equal(r.status, 200);
    const result = await r.json();
    assert.equal(result.total, 1);
    assert.equal(typeof result.emailReady, "boolean");
    assert.doesNotMatch(JSON.stringify(result), /user_metadata|fake-service|fake-token/);
    c.fail = true;
    const bad = await api.users.server.handlers.GET({ request: req("/api/owner-users") });
    assert.equal(bad.status, 503);
    assert.doesNotMatch(await bad.text(), /PRIVATE backend/);
  }));
test("cross-origin writes are rejected before auth; forged checkout account cannot reach Stripe", () =>
  fixture(async (api, c, req) => {
    const body = {
      action: "password_invite",
      userId: uid,
      requestId: "10000000-0000-4000-8000-000000000002",
      delivery: "copy",
    };
    const bad = await api.users.server.handlers.POST({
      request: req("/api/owner-users", body, true, "https://evil.invalid"),
    });
    assert.equal(bad.status, 403);
    assert.equal(c.calls.length, 0);
    const checkout = await api.checkout.server.handlers.POST({
      request: req("/api/create-checkout", {
        priceId: "price_fake",
        userId: "10000000-0000-4000-8000-000000000002",
      }),
    });
    assert.equal(checkout.status, 403);
    assert.equal(c.calls.filter((p) => p !== "/auth/v1/user").length, 0);
  }));

test("customer writes require owner authorization; public referral/preferences reject cross-origin writes before service access", () =>
  fixture(async (api, c, req) => {
    const customer = { action: "draft", id: uid, userId: uid, subject: "Offer", body: "Hi" };
    for (const role of ["learner", "support"]) {
      c.role = role;
      c.calls = [];
      const denied = await api.customers.server.handlers.POST({
        request: req("/api/owner-customers", customer),
      });
      assert.equal(denied.status, 403);
      assert.equal(
        c.calls.some((p) => p.includes("customer_")),
        false,
      );
    }
    c.calls = [];
    for (const [route, path, body] of [
      [api.customers, "owner-customers", customer],
      [api.referral, "customer-referral", { code: uid }],
      [api.unsubscribe, "customer-unsubscribe", { token: uid }],
    ]) {
      const denied = await route.server.handlers.POST({
        request: req("/api/" + path, body, false, "https://evil.invalid"),
      });
      assert.equal(denied.status, 403);
    }
    assert.equal(c.calls.length, 0);
    const guest = await api.referral.server.handlers.POST({
      request: req("/api/customer-referral", { code: uid }, false),
    });
    assert.equal(guest.status, 403);
    assert.equal(c.calls.length, 0);
  }));


test("account-menu owner discovery uses the existing policy and reads no customer report", () =>
  fixture(async (api, c, req) => {
    for (const role of ["learner", "support", "owner"]) {
      c.role = role; c.calls = [];
      const result = await api.platform.server.handlers.GET({ request: req("/api/platform?view=access") });
      assert.equal(result.status, role === "owner" ? 200 : 403);
      if (role === "owner") assert.deepEqual(await result.json(), { owner: true });
      assert.equal(result.headers.get("cache-control"), "private, no-store");
      assert.deepEqual(c.calls, ["/auth/v1/user", "/rest/v1/platform_admin_roles"]);
    }
    c.calls = [];
    const guest = await api.platform.server.handlers.GET({ request: req("/api/platform?view=access", undefined, false) });
    assert.equal(guest.status, 403);
    assert.equal(c.calls.length, 0);
  }));
