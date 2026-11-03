import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
const USER = "00000000-0000-4000-8000-000000000101";
async function fixture(run, entry = "api.reddit-offer.ts") {
  const dir = mkdtempSync(resolve("node_modules/.cache/reddit-route-"));
  const oldFetch = globalThis.fetch;
  const oldUrl = process.env.SUPABASE_URL,
    oldKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  try {
    await build({
      entryPoints: ["src/routes/" + entry],
      outfile: join(dir, "route.mjs"),
      bundle: true,
      format: "esm",
      platform: "node",
      packages: "external",
      logLevel: "silent",
      plugins: [
        {
          name: "route",
          setup(b) {
            b.onResolve({ filter: /^@tanstack\/react-router$/ }, () => ({
              path: "route",
              namespace: "test",
            }));
            b.onLoad({ filter: /.*/, namespace: "test" }, () => ({
              contents: "export const createFileRoute=()=>config=>config;",
            }));
          },
        },
      ],
    });
    const { Route } = await import(join(dir, "route.mjs"));
    process.env.SUPABASE_URL = "https://fixture.invalid";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "fixture-key";
    const state = { calls: [], confirmed: true, owner: false };
    globalThis.fetch = async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : String(input));
      state.calls.push({ url, method: init?.method, body: init?.body });
      if (url.pathname === "/auth/v1/user")
        return Response.json({
          id: USER,
          email: "verified@example.invalid",
          email_confirmed_at: state.confirmed ? "2026-01-01" : null,
        });
      if (url.pathname === "/rest/v1/platform_admin_roles")
        return Response.json(state.owner ? [{ role: "owner" }] : []);
      if (url.pathname === "/rest/v1/rpc/save_product_feedback") return Response.json(true);
      if (url.pathname === "/rest/v1/rpc/reward_reddit_feedback")
        return Response.json({ user_id: USER, expires_at: "2027-02-02T12:00:00Z" });
      if (url.pathname === "/rest/v1/rpc/redeem_reddit_month")
        return Response.json({ user_id: USER, expires_at: "2026-12-02T12:00:00Z" });
      if (url.pathname === "/rest/v1/promo_redemptions") return Response.json({ user_id: USER });
      throw Error("Unexpected request " + url.pathname);
    };
    const request = (body, { token = true, origin = "https://app.example.invalid" } = {}) =>
      new Request("https://app.example.invalid/api/reddit-offer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: origin,
          ...(token ? { Authorization: "Bearer fixture-token" } : {}),
        },
        body: JSON.stringify(body),
      });
    await run(Route.server.handlers, state, request);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = oldUrl;
    if (oldKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = oldKey;
    rmSync(dir, { recursive: true, force: true });
  }
}
test("redemption uses confirmed server identity and explicit email consent", () =>
  fixture(async (h, s, req) => {
    const response = await h.POST({
      request: req({ code: "REDDITMONTH", feedbackEmailConsent: false }),
    });
    assert.equal(response.status, 200);
    const rpc = s.calls.find((c) => c.url.pathname.includes("/rpc/"));
    assert.deepEqual(JSON.parse(rpc.body), {
      p_user: USER,
      p_email: "verified@example.invalid",
      p_consent: false,
    });
  }));
test("unconfirmed account cannot receive a promotional grant", () =>
  fixture(async (h, s, req) => {
    s.confirmed = false;
    const response = await h.POST({
      request: req({ code: "REDDITMONTH", feedbackEmailConsent: true }),
    });
    assert.equal(response.status, 403);
    assert.equal(
      s.calls.some((c) => c.url.pathname.includes("/rpc/")),
      false,
    );
  }));
test("cross-origin, missing authentication and forged identities do not redeem", () =>
  fixture(async (h, s, req) => {
    for (const [body, options, status] of [
      [
        { code: "REDDITMONTH", feedbackEmailConsent: false },
        { origin: "https://attacker.invalid" },
        403,
      ],
      [{ code: "REDDITMONTH", feedbackEmailConsent: false }, { token: false }, 403],
      [{ code: "REDDITMONTH", feedbackEmailConsent: false, userId: USER }, {}, 400],
    ])
      assert.equal((await h.POST({ request: req(body, options) })).status, status);
    assert.equal(
      s.calls.some((c) => c.url.pathname.includes("/rpc/")),
      false,
    );
  }));
test("withdraw feedback permission changes only the authenticated account", () =>
  fixture(async (h, s, req) => {
    assert.equal((await h.POST({ request: req({ feedbackEmailConsent: false }) })).status, 200);
    const write = s.calls.find((c) => c.method === "PATCH");
    assert.equal(write.url.searchParams.get("user_id"), "eq." + USER);
    assert.equal(JSON.parse(write.body).feedback_email_consent, false);
    assert.equal(
      s.calls.some((c) => c.url.pathname.includes("/rpc/")),
      false,
    );
  }));

test("only platform owners can approve feedback rewards, with explicit confirmation", () =>
  fixture(async (h, s, req) => {
    const body = { feedbackId: USER, confirm: true };
    assert.equal((await h.POST({ request: req(body) })).status, 403);
    assert.equal(
      s.calls.some((c) => c.url.pathname.includes("reward_reddit_feedback")),
      false,
    );
    s.owner = true;
    assert.equal((await h.POST({ request: req({ ...body, confirm: false }) })).status, 400);
    assert.equal((await h.POST({ request: req(body) })).status, 200);
    const rpc = s.calls.find((c) => c.url.pathname.includes("reward_reddit_feedback"));
    assert.deepEqual(JSON.parse(rpc.body), {
      p_feedback: USER,
      p_user: null,
      p_reason: null,
      p_actor: USER,
    });
  }, "api.owner-reddit.ts"));
test("owner can record emailed feedback for an existing coupon account", () =>
  fixture(async (h, s, req) => {
    s.owner = true;
    assert.equal(
      (
        await h.POST({
          request: req({
            userId: USER,
            feedbackSummary: "Specific critical feedback about the replay controls",
            confirm: true,
          }),
        })
      ).status,
      200,
    );
    const rpc = s.calls.find((c) => c.url.pathname.includes("reward_reddit_feedback"));
    assert.equal(JSON.parse(rpc.body).p_user, USER);
    assert.equal(JSON.parse(rpc.body).p_feedback, null);
  }, "api.owner-reddit.ts"));

test("owner can track emailed feedback without granting access", () =>
  fixture(async (h, s, req) => {
    s.owner = true;
    assert.equal(
      (
        await h.POST({
          request: req({
            action: "record_email_feedback",
            feedbackId: USER,
            userId: USER,
            feedbackSummary: "Specific feedback received by email",
          }),
        })
      ).status,
      200,
    );
    const saved = s.calls.find((c) => c.url.pathname.includes("save_product_feedback"));
    assert.equal(JSON.parse(saved.body).p_source, "email");
    assert.equal(JSON.parse(saved.body).p_actor, USER);
    assert.equal(
      s.calls.some((c) => c.url.pathname.includes("reward_reddit_feedback")),
      false,
    );
  }, "api.owner-reddit.ts"));
