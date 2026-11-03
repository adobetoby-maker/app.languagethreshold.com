import test from "node:test";
import assert from "node:assert/strict";
import { loadModule } from "./helpers/bundle.mjs";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";

const USER = "10000000-0000-4000-8000-000000000021";
const OTHER = "10000000-0000-4000-8000-000000000022";
const { apiUsageTotals } = await loadModule("src/lib/api-usage.ts");

test("API totals count accepted calls separately from all attempts", () => {
  assert.deepEqual(apiUsageTotals([
    { provider: "anthropic", request_status: "accepted", calls: 2, cost_ceiling_micro_usd: 1000 },
    { provider: "anthropic", request_status: "rejected", calls: 1, cost_ceiling_micro_usd: null },
  ]), { calls: 3, accepted: 2, costCeilingMicroUsd: 1000 });
});

test("learner usage endpoint always scopes the RPC to the authenticated account", async () => {
  const dir = mkdtempSync(resolve("node_modules/.cache/api-usage-"));
  const oldFetch = globalThis.fetch;
  const oldUrl = process.env.SUPABASE_URL;
  const oldKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  try {
    await build({
      entryPoints: ["src/routes/api.api-usage.ts"],
      outfile: join(dir, "route.mjs"), bundle: true, format: "esm", platform: "node",
      packages: "external", logLevel: "silent",
      plugins: [{ name: "router", setup(b) {
        b.onResolve({ filter: /^@tanstack\/react-router$/ }, () => ({ path: "router", namespace: "router" }));
        b.onLoad({ filter: /.*/, namespace: "router" }, () => ({ contents: "export const createFileRoute=()=>config=>config;" }));
      } }],
    });
    const { Route } = await import(join(dir, "route.mjs"));
    process.env.SUPABASE_URL = "https://fixture.invalid";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "fixture";
    const calls = [];
    globalThis.fetch = async (input, init) => {
      const path = new URL(String(input)).pathname;
      calls.push({ path, body: init?.body });
      if (path === "/auth/v1/user") return Response.json({ id: USER, email: "learner@example.invalid" });
      if (path === "/rest/v1/rpc/api_usage_summary") return Response.json([]);
      throw Error(`Unexpected ${path}`);
    };
    const guest = await Route.server.handlers.GET({ request: new Request("https://app.invalid/api/api-usage") });
    assert.equal(guest.status, 403);
    assert.equal(calls.length, 0);
    const request = new Request(`https://app.invalid/api/api-usage?userId=${OTHER}`, {
      headers: { authorization: "Bearer fixture-token" },
    });
    const response = await Route.server.handlers.GET({ request });
    assert.equal(response.status, 200);
    assert.deepEqual(JSON.parse(calls.find((call) => call.path.endsWith("/api_usage_summary")).body), { p_user: USER });
  } finally {
    globalThis.fetch = oldFetch;
    if (oldUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = oldUrl;
    if (oldKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = oldKey;
    rmSync(dir, { recursive: true, force: true });
  }
});
