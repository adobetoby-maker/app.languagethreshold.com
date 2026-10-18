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
const catalog = () =>
  Response.json({
    voices: [
      {
        name: "es-US-Standard-A",
        languageCodes: ["es-US"],
        ssmlGender: "FEMALE",
        naturalSampleRateHertz: 24000,
      },
    ],
  });
const body = {
  text: "synthetic-private-google-text",
  voiceName: "es-US-Standard-A",
  languageCode: "es-US",
  speakingRate: 1.2,
  usage: "learning",
};
function request(data = body, signal) {
  return new Request("https://fixture.invalid/api/mission-tts", {
    method: "POST",
    headers: { Origin: "https://fixture.invalid", "Content-Type": "application/json" },
    body: JSON.stringify(data),
    signal,
  });
}
function catalogRequest(signal, headers = { "x-vercel-forwarded-for": "192.0.2.37" }) {
  return new Request("https://fixture.invalid/api/mission-tts?languageCode=es-US", {
    signal,
    headers,
  });
}
async function fixture(run) {
  const dir = mkdtempSync(resolve("node_modules/.cache/google-tts-route-"));
  const saved = {
    fetch: globalThis.fetch,
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
    log: console.log,
    error: console.error,
    enabled: process.env.GOOGLE_CLOUD_TTS_ENABLED,
    key: process.env.GOOGLE_CLOUD_TTS_API_KEY,
  };
  const c = {
    shutdown: new AbortController(),
    operations: new Set(),
    requests: [],
    timers: new Map(),
    logs: [],
    sentry: [],
    gates: [],
    catalogCounters: [],
    catalogBudget: async () => true,
    principal: { userId: "synthetic-a" },
    age: true,
    catalog,
    synthesis: () => Response.json({ audioContent: btoa("synthetic-audio") }),
    expire() {
      for (const fn of [...this.timers.values()]) fn();
    },
  };
  try {
    const outfile = join(dir, "route.mjs");
    await build({
      stdin: {
        contents: `export {Route} from './src/routes/api.mission-tts';export {controls} from 'fixture';`,
        resolveDir: process.cwd(),
      },
      outfile,
      bundle: true,
      format: "esm",
      platform: "node",
      logLevel: "silent",
      plugins: [
        {
          name: "guards",
          setup(b) {
            b.onResolve({ filter: /^(fixture|@tanstack\/react-router)$/ }, (args) => ({
              path: args.path,
              namespace: "fixture",
            }));
            b.onResolve(
              { filter: /^(?:\.\.\/lib\/|\.\/)(speaking-security(?:\.ts)?|sentry)$/ },
              (args) => ({
                path: args.path,
                namespace: "fixture",
              }),
            );
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              contents: `export const controls=globalThis.__googleSpeechFixture;export const createFileRoute=()=>x=>x;export const initSentry=()=>{};export const Sentry={captureException:e=>controls.sentry.push(String(e))};export const isStrictSameOrigin=r=>r.headers.get('Origin')===new URL(r.url).origin;export const consumeServerRequestBudget=async(...args)=>{controls.catalogCounters.push(args);return controls.catalogBudget(...args)};export const enforceSpeakingPreAuthRateLimit=async()=>{controls.gates.push('ip');return {allowed:true}};export const authenticateSpeakingRequest=async()=>{controls.gates.push('auth');return controls.authHook?controls.authHook():controls.principal};export const hasSpeakingAgeAttestation=async()=>{controls.gates.push('age');return controls.ageHook?controls.ageHook():controls.age};export const enforceSpeakingRateLimit=async()=>{controls.gates.push('user');return {allowed:true}};`,
            }));
          },
        },
      ],
    });
    globalThis.__googleSpeechFixture = c;
    const m = await import(outfile);
    globalThis.setTimeout = (fn, ms, ...args) => {
      if (ms !== 45000 && ms !== 10000 && ms !== 15000) return saved.setTimeout(fn, ms, ...args);
      const timer = { ms, unref() {} };
      c.timers.set(timer, fn);
      return timer;
    };
    globalThis.clearTimeout = (timer) => {
      if (c.timers.has(timer)) c.timers.delete(timer);
      else saved.clearTimeout(timer);
    };
    console.log = (...args) => c.logs.push(args.map(String).join(" "));
    console.error = console.log;
    process.env.GOOGLE_CLOUD_TTS_ENABLED = "true";
    process.env.GOOGLE_CLOUD_TTS_API_KEY = "synthetic-google-key";
    globalThis.fetch = async (url, opts) => {
      c.requests.push({ url: String(url), opts });
      return String(url).includes("/voices?") ? c.catalog(url, opts) : c.synthesis(url, opts);
    };
    const handlers = Object.fromEntries(
      Object.entries(m.Route.server.handlers).map(([method, handler]) => [
        method,
        ({ request }) => {
          const owned = new Request(request, {
            signal: AbortSignal.any([request.signal, c.shutdown.signal]),
          });
          const operation = handler({ request: owned });
          c.operations.add(operation);
          void operation.then(
            () => c.operations.delete(operation),
            () => c.operations.delete(operation),
          );
          return operation;
        },
      ]),
    );
    await run(handlers, c);
    assert.equal(c.timers.size, 0, "all owned deadlines released");
  } finally {
    c.shutdown.abort();
    await Promise.allSettled([...c.operations]);
    delete globalThis.__googleSpeechFixture;
    globalThis.fetch = saved.fetch;
    globalThis.setTimeout = saved.setTimeout;
    globalThis.clearTimeout = saved.clearTimeout;
    console.log = saved.log;
    console.error = saved.error;
    for (const [name, value] of [
      ["GOOGLE_CLOUD_TTS_ENABLED", saved.enabled],
      ["GOOGLE_CLOUD_TTS_API_KEY", saved.key],
    ]) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    rmSync(dir, { recursive: true, force: true });
  }
}
test("Google route retains exact synthesis contract, existing gates and public catalog reuse", () =>
  fixture(async (h, c) => {
    const response = await h.POST({ request: request() });
    assert.equal(response.status, 200);
    assert.equal(await response.text(), "synthetic-audio");
    assert.match(response.headers.get("cache-control"), /no-store/);
    assert.deepEqual(c.gates, ["ip", "auth", "user"]);
    assert.equal(c.requests.length, 2);
    assert.deepEqual(JSON.parse(c.requests[1].opts.body), {
      input: { text: body.text },
      voice: { languageCode: body.languageCode, name: body.voiceName },
      audioConfig: { audioEncoding: "MP3", speakingRate: 1.2 },
    });
    assert.ok(c.requests.every((r) => r.opts.cache === "no-store" && r.opts.signal));
    const second = await h.POST({ request: request({ ...body, usage: "mission" }) });
    assert.equal(second.status, 200);
    await second.arrayBuffer();
    assert.equal(c.requests.length, 3);
    assert.ok(c.gates.includes("age"));
    const capabilities = await h.GET({
      request: catalogRequest(),
    });
    assert.equal((await capabilities.json()).ready, true);
    assert.equal(c.requests.length, 3);
    assert.doesNotMatch(
      JSON.stringify(c.logs),
      /synthetic-private-google-text|synthetic-google-key/,
    );
  }));
test("Google catalog, synthesis and thrown failures never enter diagnostics with private provider details", () =>
  fixture(async (h, c) => {
    const secret = body.text + " synthetic-google-key";
    c.catalog = () => new Response(secret, { status: 503 });
    const caps = await h.GET({
      request: catalogRequest(),
    });
    assert.equal((await caps.json()).ready, false);
    c.catalog = catalog;
    c.synthesis = () => new Response(secret, { status: 400 });
    const denied = await h.POST({ request: request() });
    assert.equal(denied.status, 502);
    assert.doesNotMatch(await denied.text(), /synthetic-private/);
    c.synthesis = () => {
      const error = new Error(secret);
      error.name = secret;
      throw error;
    };
    assert.equal((await h.POST({ request: request() })).status, 502);
    assert.equal(c.sentry.length, 0);
    assert.doesNotMatch(
      JSON.stringify(c.logs),
      /synthetic-private-google-text|synthetic-google-key/,
    );
  }));
test("Google deadline spans catalog and synthesis without resetting and disposes late headers", () =>
  fixture(async (h, c) => {
    const voices = deferred(),
      audio = deferred();
    c.catalog = () => voices.promise;
    c.synthesis = () => audio.promise;
    const pending = h.POST({ request: request() });
    await tick();
    assert.equal(c.requests.length, 1);
    const timer = [...c.timers.keys()][0];
    assert.ok(timer);
    voices.resolve(catalog());
    await tick();
    assert.equal(c.requests.length, 2);
    assert.equal([...c.timers.keys()][0], timer);
    c.expire();
    const response = await pending;
    assert.equal(response.status, 504);
    assert.match(response.headers.get("cache-control"), /no-store/);
    assert.equal(c.requests[1].opts.signal.aborted, true);
    let cancelled = 0;
    audio.resolve(
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
    assert.equal(c.requests.length, 2);
  }));
test("Google cancellation interrupts partial JSON and releases a reader whose cancel promise stalls", () =>
  fixture(async (h, c) => {
    let cancelled = 0;
    const upstream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"audioContent":"'));
      },
      cancel() {
        cancelled++;
        return new Promise(() => {});
      },
    });
    c.synthesis = () => new Response(upstream);
    const incoming = new AbortController();
    const pending = h.POST({ request: request(body, incoming.signal) });
    await tick();
    assert.equal(c.requests.length, 2);
    incoming.abort();
    const response = await pending;
    assert.equal(response.status, 499);
    assert.equal(c.requests[1].opts.signal.aborted, true);
    assert.equal(cancelled, 1);
    assert.equal(upstream.locked, false);
    assert.match(response.headers.get("cache-control"), /no-store/);
  }));
test("Google bounded JSON and decoded audio reject oversized or invalid provider results", () =>
  fixture(async (h, c) => {
    let cancelled = 0;
    c.synthesis = () =>
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array(3 * 1024 * 1024));
            controller.enqueue(new Uint8Array(3 * 1024 * 1024 + 1));
          },
          cancel() {
            cancelled++;
          },
        }),
      );
    assert.equal((await h.POST({ request: request() })).status, 502);
    assert.equal(cancelled, 1);
    for (const audioContent of [
      { unexpected: true },
      "not!base64",
      btoa("a".repeat(4 * 1024 * 1024 + 1)),
    ]) {
      c.synthesis = () => Response.json({ audioContent });
      const response = await h.POST({ request: request() });
      assert.equal(response.status, 502);
      assert.doesNotMatch(await response.text(), /synthetic-private/);
    }
  }));
test("Google body-read deadline aborts a stalled provider JSON stream", () =>
  fixture(async (h, c) => {
    let cancelled = 0;
    c.synthesis = () =>
      new Response(
        new ReadableStream({
          cancel() {
            cancelled++;
          },
        }),
      );
    const pending = h.POST({ request: request() });
    await tick();
    assert.equal(c.requests.length, 2);
    c.expire();
    assert.equal((await pending).status, 504);
    assert.equal(cancelled, 1);
    assert.equal(c.requests[1].opts.signal.aborted, true);
  }));
test("Google auth, age-attestation and origin denial still precede provider requests", () =>
  fixture(async (h, c) => {
    c.principal = null;
    assert.equal((await h.POST({ request: request() })).status, 401);
    c.principal = { userId: "synthetic-a" };
    c.age = false;
    assert.equal((await h.POST({ request: request({ ...body, usage: "mission" }) })).status, 403);
    const cross = request();
    cross.headers.set("Origin", "https://outside.invalid");
    assert.equal((await h.POST({ request: cross })).status, 403);
    assert.equal(c.requests.length, 0);
    process.env.GOOGLE_CLOUD_TTS_ENABLED = "false";
    const response = await h.GET({
      request: catalogRequest(),
    });
    assert.equal((await response.json()).ready, false);
    assert.equal(c.requests.length, 0);
  }));

test("Google immediate catalog cancellation is settled before another request can populate public cache", () =>
  fixture(async (h, c) => {
    const incoming = new AbortController();
    c.catalog = () => {
      incoming.abort();
      return catalog();
    };
    const response = await h.GET({
      request: catalogRequest(incoming.signal),
    });
    assert.equal((await response.json()).ready, false);
    assert.equal(c.requests.length, 1);
    assert.equal(c.requests[0].opts.signal.aborted, true);
    c.catalog = catalog;
    const current = await h.GET({
      request: catalogRequest(),
    });
    assert.equal((await current.json()).ready, true);
    assert.equal(c.requests.length, 2);
  }));

test("Google malformed/oversized input and stalled uploads fail before IP/auth counters or provider", () =>
  fixture(async (h, c) => {
    const headers = { Origin: "https://fixture.invalid", "Content-Type": "application/json" };
    for (const [raw, status] of [
      ["{", 400],
      [JSON.stringify({ ...body, padding: "x".repeat(16 * 1024) }), 413],
      [JSON.stringify({ ...body, text: "x".repeat(1201) }), 400],
    ]) {
      const response = await h.POST({
        request: new Request("https://fixture.invalid/api/mission-tts", {
          method: "POST",
          headers,
          body: raw,
        }),
      });
      assert.equal(response.status, status);
      assert.match(response.headers.get("cache-control"), /no-store/);
    }
    let cancelled = 0;
    const source = new ReadableStream({
      cancel() {
        cancelled++;
        return new Promise(() => {});
      },
    });
    const pending = h.POST({
      request: new Request("https://fixture.invalid/api/mission-tts", {
        method: "POST",
        headers,
        body: source,
        duplex: "half",
      }),
    });
    await tick();
    assert.equal([...c.timers.keys()][0]?.ms, 10000);
    c.expire();
    const response = await pending;
    assert.equal(response.status, 408);
    assert.match(response.headers.get("cache-control"), /no-store/);
    assert.equal(cancelled, 1);
    assert.equal(c.gates.length, 0);
    assert.equal(c.requests.length, 0);
  }));

test("Google departed auth and expired consent preflight cannot admit late work or affect a later request", () =>
  fixture(async (h, c) => {
    const auth = deferred();
    c.authHook = () => auth.promise;
    const incoming = new AbortController();
    const pending = h.POST({ request: request(body, incoming.signal) });
    await tick();
    assert.deepEqual(c.gates, ["ip", "auth"]);
    assert.equal([...c.timers.keys()][0]?.ms, 15000);
    incoming.abort();
    assert.equal((await pending).status, 499);
    auth.resolve({ userId: "synthetic-a" });
    await tick();
    assert.deepEqual(c.gates, ["ip", "auth"]);
    assert.equal(c.requests.length, 0);
    c.authHook = undefined;
    const current = await h.POST({ request: request() });
    assert.equal(current.status, 200);
    await current.arrayBuffer();
    assert.equal(c.requests.length, 2);
    const age = deferred();
    c.ageHook = () => age.promise;
    const offset = c.gates.length;
    const expired = h.POST({ request: request({ ...body, usage: "mission" }) });
    await tick();
    assert.deepEqual(c.gates.slice(offset), ["ip", "auth", "age"]);
    c.expire();
    assert.equal((await expired).status, 503);
    age.resolve(true);
    await tick();
    assert.deepEqual(c.gates.slice(offset), ["ip", "auth", "age"]);
    assert.equal(c.requests.length, 2);
  }));

test("Google cold public catalog denial stops provider and exposes only fixed retry guidance", () =>
  fixture(async (h, c) => {
    for (const stop of [1, 2, 3]) {
      c.catalogCounters.length = 0;
      c.catalogBudget = async () => c.catalogCounters.length !== stop;
      const response = await h.GET({ request: catalogRequest() });
      assert.equal(response.status, 429);
      assert.equal(response.headers.get("retry-after"), stop === 1 ? "60" : "3600");
      assert.match(response.headers.get("cache-control"), /no-store/);
      assert.deepEqual(await response.json(), {
        error: "Google voice catalog is temporarily unavailable.",
      });
      assert.equal(c.catalogCounters.length, stop);
      assert.equal(c.requests.length, 0);
    }
    c.catalogBudget = async () => {
      throw new Error("synthetic-private-detail");
    };
    const failed = await h.GET({ request: catalogRequest() });
    assert.equal(failed.status, 503);
    assert.doesNotMatch(await failed.text(), /synthetic-private-detail/);
    assert.equal(c.requests.length, 0);
  }));
test("Google public catalog cache and disabled configuration avoid counters; explicit foreign origins never reach admission", () =>
  fixture(async (h, c) => {
    for (const headers of [
      { Origin: "https://outside.invalid" },
      { "sec-fetch-site": "cross-site" },
    ]) {
      assert.equal((await h.GET({ request: catalogRequest(undefined, headers) })).status, 403);
    }
    assert.equal((await h.GET({ request: catalogRequest(undefined, {}) })).status, 503);
    assert.equal(c.catalogCounters.length, 0);
    assert.equal(c.requests.length, 0);
    process.env.GOOGLE_CLOUD_TTS_ENABLED = "false";
    assert.equal(
      (await (await h.GET({ request: catalogRequest(undefined, {}) })).json()).ready,
      false,
    );
    assert.equal(c.catalogCounters.length, 0);
    process.env.GOOGLE_CLOUD_TTS_ENABLED = "true";
    assert.equal((await (await h.GET({ request: catalogRequest() })).json()).ready, true);
    assert.equal(c.catalogCounters.length, 3);
    assert.equal(c.requests.length, 1);
    c.catalogBudget = async () => {
      throw new Error("cache should not spend");
    };
    assert.equal(
      (await (await h.GET({ request: catalogRequest(undefined, {}) })).json()).ready,
      true,
    );
    assert.equal(c.catalogCounters.length, 3);
    assert.equal(c.requests.length, 1);
    assert.equal(
      (await h.GET({ request: catalogRequest(undefined, { Origin: "https://outside.invalid" }) }))
        .status,
      403,
    );
    assert.equal(c.requests.length, 1);
  }));
test("Google expired public catalog admission cannot open provider or later counters; next request is independent", () =>
  fixture(async (h, c) => {
    const pendingBudget = deferred();
    c.catalogBudget = () => pendingBudget.promise;
    const pending = h.GET({ request: catalogRequest() });
    assert.equal(c.catalogCounters.length, 1);
    c.expire();
    const denied = await pending;
    assert.equal(denied.status, 503);
    assert.equal(c.catalogCounters[0][4].aborted, true);
    pendingBudget.resolve(true);
    await tick();
    assert.equal(c.catalogCounters.length, 1);
    assert.equal(c.requests.length, 0);
    c.catalogBudget = async () => true;
    const current = await h.GET({ request: catalogRequest() });
    assert.equal((await current.json()).ready, true);
    assert.equal(c.catalogCounters.length, 4);
    assert.equal(c.requests.length, 1);
  }));

test("Google expired catalog cache requires fresh admission and incoming abort is request-local", () =>
  fixture(async (h, c) => {
    assert.equal((await (await h.GET({ request: catalogRequest() })).json()).ready, true);
    const now = Date.now;
    try {
      Date.now = () => now() + 6 * 60 * 60 * 1000 + 1;
      c.catalogBudget = async () => false;
      assert.equal((await h.GET({ request: catalogRequest() })).status, 429);
      assert.equal(c.requests.length, 1);
      const incoming = new AbortController(),
        deferredBudget = deferred();
      c.catalogBudget = () => deferredBudget.promise;
      const pending = h.GET({ request: catalogRequest(incoming.signal) });
      incoming.abort();
      assert.equal((await pending).status, 499);
      deferredBudget.resolve(true);
      await tick();
      assert.equal(c.requests.length, 1);
      c.catalogBudget = async () => true;
      assert.equal((await (await h.GET({ request: catalogRequest() })).json()).ready, true);
      assert.equal(c.requests.length, 2);
    } finally {
      Date.now = now;
    }
  }));
