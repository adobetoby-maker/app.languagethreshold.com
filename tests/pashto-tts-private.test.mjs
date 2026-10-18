import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";

async function fixture(run) {
  const dir = mkdtempSync(resolve("node_modules/.cache/private-tts-"));
  const savedFetch = globalThis.fetch,
    savedKey = process.env.ELEVEN_API_KEY;
  const calls = [];
  process.env.ELEVEN_API_KEY = "synthetic-only";
  globalThis.fetch = async (url, opts) => {
    calls.push({ url, opts });
    return new Response("synthetic audio");
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
    await run(Route.server.handlers, calls);
  } finally {
    globalThis.fetch = savedFetch;
    if (savedKey === undefined) delete process.env.ELEVEN_API_KEY;
    else process.env.ELEVEN_API_KEY = savedKey;
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
    headers: { "Content-Type": "application/json" },
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
  fixture(async (handlers) => {
    for (const fail of [
      async () => new Response("synthetic-private-provider-secret", { status: 429 }),
      async () => {
        throw new Error("synthetic-private-provider-secret");
      },
    ]) {
      globalThis.fetch = fail;
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
