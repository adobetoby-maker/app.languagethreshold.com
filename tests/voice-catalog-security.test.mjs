import assert from "node:assert/strict";
import test from "node:test";
import { createHmac } from "node:crypto";
import {
  checkVoiceCatalogBudget,
  VOICE_CATALOG_LIMITS,
  voiceCatalogOriginDenied,
} from "../src/lib/voice-catalog-security.ts";
const req = (
  headers = { "x-vercel-forwarded-for": "192.0.2.37" },
  url = "https://fixture.invalid/api/mission-tts",
) => new Request(url, { headers });
async function fixture(run) {
  const fetch = globalThis.fetch;
  const keys = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "VERCEL_ENV", "NODE_ENV"];
  const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  const c = { calls: [], provider: async () => Response.json(true) };
  process.env.SUPABASE_URL = "https://budget-store.invalid";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "synthetic-catalog-secret";
  process.env.VERCEL_ENV = "preview";
  process.env.NODE_ENV = "production";
  globalThis.fetch = async (url, opts) => {
    c.calls.push({ url, opts, body: JSON.parse(opts.body) });
    return c.provider(url, opts);
  };
  try {
    await run(c);
  } finally {
    globalThis.fetch = fetch;
    for (const k of keys)
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
  }
}
test("public catalog permits normal missing-Origin GETs and denies explicit foreign browser origins", () => {
  assert.equal(voiceCatalogOriginDenied(req()), false);
  for (const headers of [
    { Origin: "https://fixture.invalid" },
    { "Sec-Fetch-Site": "same-origin" },
    { "Sec-Fetch-Site": "none" },
  ])
    assert.equal(voiceCatalogOriginDenied(req(headers)), false);
  for (const headers of [
    { Origin: "https://outside.invalid" },
    { Origin: "null" },
    { "Sec-Fetch-Site": "cross-site" },
    { "Sec-Fetch-Site": "same-site" },
  ])
    assert.equal(voiceCatalogOriginDenied(req(headers)), true);
});
test("catalog budgets require a canonical platform IP; fallback forwarding cannot choose its bucket", () =>
  fixture(async (c) => {
    for (const headers of [
      {},
      { "x-forwarded-for": "192.0.2.37" },
      { "x-real-ip": "192.0.2.37" },
      { "x-vercel-forwarded-for": "malformed" },
      { Origin: "https://outside.invalid" },
    ]) {
      const denied = await checkVoiceCatalogBudget(req(headers), new AbortController().signal);
      assert.equal(denied.status, headers.Origin ? 403 : 503);
    }
    assert.equal(c.calls.length, 0);
    process.env.NODE_ENV = "development";
    assert.equal(
      await checkVoiceCatalogBudget(
        req({}, "http://localhost/api/mission-tts"),
        new AbortController().signal,
      ),
      null,
    );
    assert.equal(c.calls.length, 3);
  }));
test("catalog uses independent stage-scoped hashed minute/hour/global pools and exact existing RPC contracts", () =>
  fixture(async (c) => {
    assert.deepEqual(VOICE_CATALOG_LIMITS, { minute: 20, ipHour: 120, globalHour: 600 });
    const incoming = new AbortController();
    assert.equal(await checkVoiceCatalogBudget(req(), incoming.signal), null);
    const expected = [
      ["ip-minute", "192.0.2.37", 20, 60],
      ["ip-hour", "192.0.2.37", 120, 3600],
      ["all-hour", "all", 600, 3600],
    ];
    assert.equal(c.calls.length, 3);
    for (let i = 0; i < 3; i++) {
      const [suffix, value, limit, window] = expected[i];
      const hash = createHmac("sha256", "synthetic-catalog-secret")
        .update(`language-threshold:speaking:v1:google-voice-catalog:v1:preview:${suffix}:${value}`)
        .digest("hex");
      assert.deepEqual(c.calls[i].body, {
        p_bucket_hash: hash,
        p_request_limit: limit,
        p_window_seconds: window,
      });
      assert.equal(c.calls[i].opts.cache, "no-store");
      assert.equal(c.calls[i].opts.signal.aborted, false);
      assert.doesNotMatch(JSON.stringify(c.calls[i].body), /192\.0\.2\.37|google-voice/);
    }
    process.env.VERCEL_ENV = "production";
    assert.equal(await checkVoiceCatalogBudget(req(), incoming.signal), null);
    assert.notEqual(c.calls[0].body.p_bucket_hash, c.calls[3].body.p_bucket_hash);
  }));
test("catalog denial or unavailable/oversized storage short-circuits later counters", () =>
  fixture(async (c) => {
    for (let stop = 1; stop <= 3; stop++) {
      c.calls.length = 0;
      c.provider = async () => Response.json(c.calls.length !== stop);
      assert.deepEqual(await checkVoiceCatalogBudget(req(), new AbortController().signal), {
        status: 429,
        retryAfter: stop === 1 ? 60 : 3600,
      });
      assert.equal(c.calls.length, stop);
    }
    for (const provider of [
      async () => {
        throw new Error("synthetic-private-detail");
      },
      async () => new Response("true" + " ".repeat(1024)),
    ]) {
      c.calls.length = 0;
      c.provider = provider;
      assert.deepEqual(await checkVoiceCatalogBudget(req(), new AbortController().signal), {
        status: 503,
        retryAfter: 60,
      });
      assert.equal(c.calls.length, 1);
    }
  }));
