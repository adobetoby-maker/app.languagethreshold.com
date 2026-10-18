import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
const tick = () => new Promise((r) => setImmediate(r));
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
};
const request = (signal) =>
  new Request("https://fixture.invalid/api/mission-tts", {
    method: "POST",
    headers: {
      Origin: "https://fixture.invalid",
      Authorization: "Bearer synthetic-token",
      "x-vercel-forwarded-for": "192.0.2.37",
    },
    signal,
  });
async function fixture(run) {
  const dir = mkdtempSync(resolve("node_modules/.cache/speech-preflight-"));
  const saved = {
    fetch: globalThis.fetch,
    set: globalThis.setTimeout,
    clear: globalThis.clearTimeout,
  };
  const keys = [
    "SUPABASE_URL",
    "SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "VERCEL_ENV",
  ];
  const env = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  const c = {
    requests: [],
    timers: new Map(),
    provider: async (url) =>
      url.includes("/auth/")
        ? Response.json({ id: "synthetic-a" })
        : url.includes("attestations")
          ? Response.json([{ attested_at: "2026-08-13T12:00:00.000Z" }])
          : Response.json(true),
    expire() {
      for (const fn of [...this.timers.values()]) fn();
    },
    async until(predicate) {
      for (let i = 0; i < 100 && !predicate(); i++) await new Promise((r) => saved.set(r, 1));
      assert.ok(predicate());
    },
  };
  try {
    const outfile = join(dir, "scope.mjs");
    await build({
      stdin: {
        contents: `export * from './src/lib/speech-preflight';export * from './src/lib/speaking-security';export * from './src/lib/learning-generation-security';`,
        resolveDir: process.cwd(),
      },
      outfile,
      bundle: true,
      format: "esm",
      platform: "node",
      logLevel: "silent",
    });
    const m = await import(outfile);
    process.env.SUPABASE_URL = "https://budget-store.invalid";
    process.env.SUPABASE_PUBLISHABLE_KEY = "synthetic-public";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "synthetic-service";
    process.env.VERCEL_ENV = "preview";
    globalThis.setTimeout = (fn, ms, ...args) => {
      if (ms !== m.SPEECH_PREFLIGHT_TIMEOUT_MS) return saved.set(fn, ms, ...args);
      const token = { unref() {} };
      c.timers.set(token, fn);
      return token;
    };
    globalThis.clearTimeout = (token) => {
      if (c.timers.has(token)) c.timers.delete(token);
      else saved.clear(token);
    };
    globalThis.fetch = async (url, opts) => {
      c.requests.push({ url: String(url), opts });
      return c.provider(String(url), opts);
    };
    await run(m, c);
    assert.equal(c.timers.size, 0);
  } finally {
    globalThis.fetch = saved.fetch;
    globalThis.setTimeout = saved.set;
    globalThis.clearTimeout = saved.clear;
    for (const key of keys) {
      if (env[key] === undefined) delete process.env[key];
      else process.env[key] = env[key];
    }
    rmSync(dir, { recursive: true, force: true });
  }
}
test("speech preflight keeps one deadline across real IP/auth/age/user helpers and preserves current contracts", () =>
  fixture(async (m, c) => {
    const incoming = new AbortController(),
      req = request(incoming.signal);
    const value = await m.withSpeechPreflight(req, async (signal) => {
      assert.equal((await m.enforceSpeakingPreAuthRateLimit(req, signal)).allowed, true);
      const timer = [...c.timers.keys()][0];
      assert.ok(timer);
      const principal = await m.authenticateSpeakingRequest(req, signal);
      assert.deepEqual(principal, { userId: "synthetic-a" });
      assert.equal(await m.hasSpeakingAgeAttestation(principal.userId, signal), true);
      assert.equal(
        (await m.enforceSpeakingRateLimit(principal.userId, "tts", 30, signal)).allowed,
        true,
      );
      assert.equal([...c.timers.keys()][0], timer);
      return "admitted";
    });
    assert.equal(value, "admitted");
    assert.equal(c.requests.length, 4);
    assert.ok(
      c.requests.every(
        (r) => r.opts.signal && !r.opts.signal.aborted && r.opts.cache === "no-store",
      ),
    );
    assert.equal(c.timers.size, 0);
    assert.deepEqual(
      c.requests
        .filter((r) => r.url.includes("/rpc/"))
        .map((r) => JSON.parse(r.opts.body).p_request_limit),
      [40, 30],
    );
    incoming.abort();
    assert.ok(c.requests.every((r) => !r.opts.signal.aborted));
  }));
test("speech preflight deadline rejects stalled auth and disposes late headers without admitting another stage", () =>
  fixture(async (m, c) => {
    const transport = deferred();
    c.provider = () => transport.promise;
    let admitted = 0;
    const pending = m.withSpeechPreflight(request(), async (signal) => {
      await m.authenticateSpeakingRequest(request(), signal);
      admitted++;
    });
    assert.equal(c.requests.length, 1);
    c.expire();
    await assert.rejects(pending, (e) => e.status === 503);
    assert.equal(c.requests[0].opts.signal.aborted, true);
    let cancelled = 0;
    transport.resolve(
      new Response(
        new ReadableStream({
          cancel() {
            cancelled++;
          },
        }),
      ),
    );
    await tick();
    assert.equal(cancelled, 1);
    assert.equal(admitted, 0);
  }));
test("speech abort during HMAC work prevents counter fetch and cannot cancel a later admission", () =>
  fixture(async (m, c) => {
    const incoming = new AbortController();
    let action;
    const pending = m.withSpeechPreflight(
      request(incoming.signal),
      (signal) => (action = m.consumeServerRequestBudget("synthetic", "a", 30, 60, signal)),
    );
    incoming.abort();
    await assert.rejects(pending, (e) => e.status === 499);
    await action.catch(() => {});
    assert.equal(c.requests.length, 0);
    assert.equal(
      await m.withSpeechPreflight(request(), (signal) =>
        m.consumeServerRequestBudget("synthetic", "b", 30, 60, signal),
      ),
      true,
    );
    assert.equal(c.requests.length, 1);
    assert.equal(c.requests[0].opts.signal.aborted, false);
  }));
test("speech late budget JSON after cancellation cannot spend the next hourly counter", () =>
  fixture(async (m, c) => {
    const json = deferred();
    c.provider = async () => ({ ok: true, json: () => json.promise });
    const incoming = new AbortController();
    const pending = m.withSpeechPreflight(request(incoming.signal), (signal) =>
      m.checkLearningGenerationBudget(request(), "speech", signal),
    );
    await c.until(() => c.requests.length === 1);
    incoming.abort();
    await assert.rejects(pending, (e) => e.status === 499);
    json.resolve(true);
    await tick();
    assert.equal(c.requests.length, 1);
    assert.equal(c.requests[0].opts.signal.aborted, true);
  }));
test("speech late consent JSON cannot open user-budget or provider work after expiry", () =>
  fixture(async (m, c) => {
    const json = deferred();
    c.provider = async () => ({ ok: true, json: () => json.promise });
    let next = 0;
    const pending = m.withSpeechPreflight(request(), async (signal) => {
      if (await m.hasSpeakingAgeAttestation("synthetic-a", signal)) {
        next++;
        await m.enforceSpeakingRateLimit("synthetic-a", "tts", 30, signal);
      }
    });
    assert.equal(c.requests.length, 1);
    c.expire();
    await assert.rejects(pending, (e) => e.status === 503);
    json.resolve([{ attested_at: "2026-08-13T12:00:00.000Z" }]);
    await tick();
    assert.equal(next, 0);
    assert.equal(c.requests.length, 1);
  }));
