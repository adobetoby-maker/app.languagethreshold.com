import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";

async function fixture(run) {
  const dir = mkdtempSync(resolve("node_modules/.cache/private-tts-"));
  const savedFetch = globalThis.fetch,
    keys = [
      "ELEVEN_API_KEY",
      "SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
      "VERCEL_ENV",
      "NODE_ENV",
    ],
    savedEnv = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  const calls = [];
  process.env.ELEVEN_API_KEY = "synthetic-only";
  process.env.SUPABASE_URL = "https://budget-store.invalid";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "synthetic-budget-only";
  process.env.VERCEL_ENV = "preview";
  process.env.NODE_ENV = "production";
  const controls = {
    budgetCalls: [],
    budget: async () => Response.json(true),
    provider: async () => new Response("synthetic audio"),
  };
  globalThis.fetch = async (url, opts) => {
    if (url.startsWith("https://budget-store.invalid")) {
      controls.budgetCalls.push({ url, opts });
      return controls.budget(url, opts);
    }
    calls.push({ url, opts });
    return controls.provider(url, opts);
  };
  try {
    const outfile = join(dir, "route.mjs");
    await build({
      entryPoints: ["src/routes/api.tts.ts"],
      outfile,
      bundle: true,
      format: "esm",
      platform: "node",
      logLevel: "silent",
      plugins: [
        {
          name: "route-fixture",
          setup(b) {
            b.onResolve({ filter: /^@tanstack\/react-router$/ }, () => ({
              path: "router",
              namespace: "fixture",
            }));
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              contents: "export const createFileRoute=()=>x=>x;",
            }));
          },
        },
      ],
    });
    const { Route } = await import(outfile);
    await run(Route.server.handlers, calls, controls);
  } finally {
    globalThis.fetch = savedFetch;
    for (const key of keys) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
    rmSync(dir, { recursive: true, force: true });
  }
}
function privateResponse(response) {
  for (const name of ["cache-control", "cdn-cache-control", "vercel-cdn-cache-control"])
    assert.match(response.headers.get(name), /no-store/);
}
const request = (body, signal) =>
  new Request("https://fixture.invalid/api/tts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://fixture.invalid",
      "x-vercel-forwarded-for": "192.0.2.37",
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
    signal,
  });

test("Pashto route refuses legacy URL generation and invalid bodies without contacting provider", () =>
  fixture(async (handlers, calls) => {
    for (const response of [
      await handlers.GET({
        request: new Request("https://fixture.invalid/api/tts?text=synthetic-private&lang=ps"),
      }),
      await handlers.POST({ request: request("{") }),
      await handlers.POST({ request: request({ text: "x", lang: "en" }) }),
      await handlers.POST({ request: request({ text: "x".repeat(401), lang: "ps" }) }),
    ]) {
      assert.ok([400, 405].includes(response.status));
      privateResponse(response);
      assert.doesNotMatch(await response.text(), /synthetic-private/);
    }
    assert.equal(calls.length, 0);
  }));

test("Pashto route streams private audio with text only in provider body and forwards cancellation", () =>
  fixture(async (handlers, calls) => {
    const controller = new AbortController();
    const req = request({ text: "Synthetic private sentence", lang: "ps" }, controller.signal);
    const response = await handlers.POST({ request: req });
    assert.equal(response.status, 200);
    privateResponse(response);
    assert.equal(await response.text(), "synthetic audio");
    assert.equal(calls.length, 1);
    assert.doesNotMatch(calls[0].url, /Synthetic|sentence/);
    assert.deepEqual(JSON.parse(calls[0].opts.body), {
      text: "Synthetic private sentence",
      model_id: "eleven_v3",
      language_code: "ps",
    });
    assert.equal(calls[0].opts.cache, "no-store");
    assert.equal(calls[0].opts.signal, req.signal);
    controller.abort();
    assert.equal(calls[0].opts.signal.aborted, true);
    const aborted = await handlers.POST({
      request: request({ text: "x", lang: "ps" }, controller.signal),
    });
    assert.equal(aborted.status, 499);
    privateResponse(aborted);
    assert.equal(calls.length, 1);
  }));

test("Pashto failure responses never expose upstream bodies, thrown secrets or configuration", () =>
  fixture(async (handlers, calls, controls) => {
    for (const fail of [
      async () => new Response("synthetic-private-provider-secret", { status: 429 }),
      async () => {
        throw new Error("synthetic-private-provider-secret");
      },
    ]) {
      controls.provider = fail;
      const response = await handlers.POST({
        request: request({ text: "synthetic-private", lang: "ps" }),
      });
      assert.ok([500, 502].includes(response.status));
      privateResponse(response);
      assert.doesNotMatch(await response.text(), /synthetic-private|provider-secret/);
    }
    delete process.env.ELEVEN_API_KEY;
    const response = await handlers.POST({ request: request({ text: "x", lang: "ps" }) });
    assert.equal(response.status, 503);
    privateResponse(response);
  }));

test("Pashto missing/cross origin, untrusted forwarding and oversized streams fail before spending", () =>
  fixture(async (handlers, calls, c) => {
    for (const origin of [null, "https://outside.invalid"]) {
      const req = request({ text: "Synthetic", lang: "ps" });
      if (origin === null) req.headers.delete("Origin");
      else req.headers.set("Origin", origin);
      const response = await handlers.POST({ request: req });
      assert.equal(response.status, 403);
      privateResponse(response);
    }
    const forged = request({ text: "Synthetic", lang: "ps" });
    forged.headers.delete("x-vercel-forwarded-for");
    forged.headers.set("x-forwarded-for", "192.0.2.99");
    const denied = await handlers.POST({ request: forged });
    assert.equal(denied.status, 503);
    privateResponse(denied);
    const large = request(" ".repeat(4097));
    assert.equal(large.headers.get("Content-Length"), null);
    const tooLarge = await handlers.POST({ request: large });
    assert.equal(tooLarge.status, 413);
    privateResponse(tooLarge);
    const advertised = request("{}");
    advertised.headers.set("Content-Length", "4097");
    assert.equal((await handlers.POST({ request: advertised })).status, 413);
    assert.equal(c.budgetCalls.length, 0);
    assert.equal(calls.length, 0);
  }));

test("Pashto durable minute/hour/global denials and unavailable storage never contact provider", () =>
  fixture(async (handlers, calls, c) => {
    for (const [index, retry] of [
      [0, 60],
      [1, 3600],
      [2, 3600],
    ]) {
      let step = 0;
      c.budget = async () => Response.json(step++ !== index);
      const response = await handlers.POST({ request: request({ text: "Synthetic", lang: "ps" }) });
      assert.equal(response.status, 429);
      assert.equal(response.headers.get("Retry-After"), String(retry));
      privateResponse(response);
    }
    for (const fail of [
      async () => new Response("unavailable", { status: 503 }),
      async () => {
        throw new Error("synthetic storage failure");
      },
      async () => new Response("invalid-json"),
    ]) {
      c.budget = fail;
      const response = await handlers.POST({ request: request({ text: "Synthetic", lang: "ps" }) });
      assert.equal(response.status, 503);
      privateResponse(response);
    }
    c.budget = async () => Response.json(true);
    const controller = new AbortController();
    c.budget = async () => {
      controller.abort();
      return Response.json(true);
    };
    const response = await handlers.POST({
      request: request({ text: "Synthetic", lang: "ps" }, controller.signal),
    });
    assert.equal(response.status, 499);
    assert.equal(calls.length, 0);
  }));
