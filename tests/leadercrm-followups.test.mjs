import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { loadModule } from "./helpers/bundle.mjs";
const { feedbackInput } = await loadModule("src/lib/reddit-offer.ts");
const { productFeedbackMessage } = await loadModule("src/lib/product-feedback.ts");
const base = {
  id: "00000000-0000-4000-8000-000000000101",
  category: "experience",
  message: "I had trouble finding my lesson.",
};
test("all ratings are retained privately; public permission is independent of rating", () => {
  for (let rating = 1; rating <= 5; rating++) {
    const input = feedbackInput.parse({
      ...base,
      rating,
      easeRating: 2,
      usefulnessRating: 4,
      improvement: "A clearer next step",
      testimonialConsent: false,
    });
    const message = productFeedbackMessage(input);
    assert.match(message, new RegExp(`Overall rating: ${rating}/5`));
    assert.match(message, /Ease of use: 2\/5/);
    assert.match(message, /private feedback only/);
    assert.match(message, /A clearer next step/);
    assert.match(
      productFeedbackMessage({ ...input, testimonialConsent: true }),
      /after owner review/,
    );
  }
  assert.equal(productFeedbackMessage(base), base.message);
  for (const rating of [0, 6, 1.5, "5"])
    assert.equal(feedbackInput.safeParse({ ...base, rating }).success, false);
  assert.equal(feedbackInput.safeParse({ ...base, testimonialConsent: "yes" }).success, false);
});

async function fixture(run) {
  const dir = mkdtempSync(resolve("node_modules/.cache/leader-route-"));
  const oldFetch = globalThis.fetch;
  const keys = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "LEADERCRM_FORM_KEY"];
  const env = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  try {
    await build({
      entryPoints: ["src/routes/api.crm-signup.ts"],
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
    process.env.SUPABASE_SERVICE_ROLE_KEY = "database-secret-fixture";
    process.env.LEADERCRM_FORM_KEY = "signup-secret-fixture";
    const state = { confirmed: true, limited: false, status: 202, fail: false, calls: [] };
    globalThis.fetch = async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : String(input));
      state.calls.push({ url, init });
      if (url.pathname === "/auth/v1/user")
        return Response.json({
          id: base.id,
          email: "verified@example.invalid",
          email_confirmed_at: state.confirmed ? "2026-01-01" : null,
          user_metadata: { full_name: "Test learner" },
        });
      if (url.pathname === "/rest/v1/rpc/consume_speaking_request")
        return Response.json(!state.limited);
      if (url.pathname === "/api/public/signup") {
        if (state.fail) throw Error("provider-secret-fixture");
        return Response.json({ secret: "provider-secret-fixture" }, { status: state.status });
      }
      throw Error("Unexpected request " + url.pathname);
    };
    const req = (
      body = { consent: true },
      { token = true, origin = "https://app.example.invalid" } = {},
    ) =>
      new Request("https://app.example.invalid/api/crm-signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: origin,
          ...(token ? { Authorization: "Bearer fixture-session" } : {}),
        },
        body: JSON.stringify(body),
      });
    await run(Route.server.handlers.POST, state, req);
  } finally {
    globalThis.fetch = oldFetch;
    for (const k of keys)
      if (env[k] === undefined) delete process.env[k];
      else process.env[k] = env[k];
    rmSync(dir, { recursive: true, force: true });
  }
}
test("signup uses the verified account email and isolated form key; success does not claim delivery", () =>
  fixture(async (post, s, req) => {
    const r = await post({ request: req() });
    assert.equal(r.status, 200);
    const text = await r.text();
    assert.match(text, /does not confirm email delivery/);
    assert.doesNotMatch(text, /secret-fixture|verified@example/);
    const call = s.calls.find((c) => c.url.pathname === "/api/public/signup");
    assert.equal(call.url.origin, "https://toby.leaderhq.io");
    assert.equal(call.init.headers["X-Form-Key"], "signup-secret-fixture");
    assert.equal(call.init.headers.Authorization, undefined);
    assert.equal(call.init.redirect, "error");
    assert.deepEqual(JSON.parse(call.init.body), {
      email: "verified@example.invalid",
      name: "Test learner",
      type: "Learner",
      source: "language-threshold-app-explicit-opt-in",
      website: "",
    });
  }));
test("no consent, forged recipient, cross-origin, missing auth and unconfirmed accounts never dispatch", () =>
  fixture(async (post, s, req) => {
    for (const [body, options] of [
      [{ consent: false }, {}],
      [{ consent: true, email: "other@example.invalid" }, {}],
      [{ consent: true }, { origin: "https://attacker.invalid" }],
      [{ consent: true }, { token: false }],
    ]) {
      const r = await post({ request: req(body, options) });
      assert.ok([400, 403].includes(r.status));
    }
    s.confirmed = false;
    assert.equal((await post({ request: req() })).status, 403);
    assert.equal(
      s.calls.some((c) => c.url.pathname === "/api/public/signup"),
      false,
    );
  }));
test("missing key and exhausted budget fail closed; provider failure leaks no diagnostics and is not retried", () =>
  fixture(async (post, s, req) => {
    delete process.env.LEADERCRM_FORM_KEY;
    assert.equal((await post({ request: req() })).status, 503);
    assert.equal(s.calls.length, 0);
    process.env.LEADERCRM_FORM_KEY = "signup-secret-fixture";
    s.limited = true;
    assert.equal((await post({ request: req() })).status, 429);
    assert.equal(
      s.calls.some((c) => c.url.pathname === "/api/public/signup"),
      false,
    );
    s.limited = false;
    s.fail = true;
    const r = await post({ request: req() });
    assert.equal(r.status, 503);
    assert.doesNotMatch(await r.text(), /secret-fixture/);
    assert.equal(s.calls.filter((c) => c.url.pathname === "/api/public/signup").length, 1);
  }));
