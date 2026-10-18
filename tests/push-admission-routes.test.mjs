import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
const tick = () => new Promise((r) => setImmediate(r));
const defer = () => {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
};
const context = {
  version: 1,
  language: "Spanish",
  topicTitle: null,
  lastPracticeDate: null,
  mission: null,
  trip: null,
  stack: null,
};
const value = { action: "sync-context", context };
function req(body = value, signal, headers = {}) {
  return new Request("https://fixture.invalid/api/push", {
    method: "POST",
    headers: { Origin: "https://fixture.invalid", "Content-Type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
    signal,
  });
}
function privateHeaders(r) {
  assert.match(r.headers.get("cache-control"), /private.*no-store/);
  assert.equal(r.headers.get("cdn-cache-control"), "no-store");
  assert.equal(r.headers.get("vercel-cdn-cache-control"), "no-store");
  assert.equal(r.headers.get("x-content-type-options"), "nosniff");
}
async function fixture(run) {
  const dir = mkdtempSync(resolve("node_modules/.cache/push-admission-"));
  const original = { set: setTimeout, clear: clearTimeout };
  let c;
  try {
    const outfile = join(dir, "case.mjs");
    await build({
      stdin: {
        contents: `export {Route} from './src/routes/api.push';export {c} from 'fixture';`,
        resolveDir: process.cwd(),
      },
      outfile,
      bundle: true,
      format: "esm",
      platform: "node",
      logLevel: "silent",
      plugins: [
        {
          name: "fixture",
          setup(b) {
            b.onResolve(
              {
                filter:
                  /^(@tanstack\/react-router|@\/lib\/speaking-security|@\/lib\/push-server|fixture)$/,
              },
              () => ({ path: "fixture", namespace: "fixture" }),
            );
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              contents: `export const c={gates:[],writes:[],reads:[],timers:new Map(),ops:[],ip:async()=>({allowed:true}),auth:async()=>({userId:'synthetic-a'}),budget:async()=>({allowed:true}),storage:async()=>Response.json([])};
 export const createFileRoute=()=>x=>x;
 export const isStrictSameOrigin=r=>r.headers.get('origin')===new URL(r.url).origin;
 export const enforceSpeakingPreAuthRateLimit=async(r,s)=>{c.gates.push(['ip',s]);return c.ip(r,s)};
 export const authenticateSpeakingRequest=async(r,s)=>{c.gates.push(['auth',s]);return c.auth(r,s)};
 export const enforceSpeakingRateLimit=async(u,k,n,s)=>{c.gates.push(['budget',s,u,k,n]);return c.budget(u,k,n,s)};
 export const pushSupabase=async(p,o)=>{(o?.method?c.writes:c.reads).push({path:p,options:o});return c.storage(p,o)};
 export const pushServerConfigured=()=>true,webPushPublicKey=()=>'synthetic-public-key',validTimeZone=x=>x==='UTC',hashPushEndpoint=async()=> 'synthetic-hash';`,
            }));
          },
        },
      ],
    });
    const m = await import(outfile);
    c = m.c;
    c.shutdown = new AbortController();
    globalThis.setTimeout = (fn, ms, ...args) => {
      if (ms !== 10000 && ms !== 15000) return original.set(fn, ms, ...args);
      const token = {};
      c.timers.set(token, { fn, ms });
      return token;
    };
    globalThis.clearTimeout = (t) => {
      if (c.timers.has(t)) c.timers.delete(t);
      else original.clear(t);
    };
    c.expire = (ms) => {
      for (const v of [...c.timers.values()]) if (v.ms === ms) v.fn();
    };
    const invoke = (method, request) => {
      const p = m.Route.server.handlers[method]({ request });
      c.ops.push(p);
      return p;
    };
    c.rawPost = (request) => invoke("POST", request);
    c.post = (body = value, signal = c.shutdown.signal, headers) =>
      invoke("POST", req(body, signal, headers));
    c.get = (signal = c.shutdown.signal) =>
      invoke("GET", new Request("https://fixture.invalid/api/push", { signal }));
    await run(c);
    assert.equal(c.timers.size, 0);
  } finally {
    c?.shutdown.abort();
    if (c) await Promise.allSettled(c.ops);
    globalThis.setTimeout = original.set;
    globalThis.clearTimeout = original.clear;
    rmSync(dir, { recursive: true, force: true });
  }
}
test("push input and origin denials precede counters/auth/storage and suppress private details", () =>
  fixture(async (c) => {
    for (const [body, headers, status] of [
      [value, { Origin: "https://outside.invalid" }, 403],
      ["{", {}, 400],
      [{ invalid: "synthetic-private-detail" }, {}, 400],
      [{ ...value, padding: "x".repeat(16384) }, {}, 413],
    ]) {
      const r = await c.post(body, c.shutdown.signal, headers);
      assert.equal(r.status, status);
      privateHeaders(r);
      assert.doesNotMatch(await r.text(), /synthetic-private-detail/);
    }
    assert.equal(c.gates.length, 0);
    assert.equal(c.writes.length, 0);
    // A structurally valid body exactly at the byte boundary still reaches existing sync-context behavior.
    const raw = JSON.stringify({ ...value, padding: "" });
    const exact = JSON.stringify({ ...value, padding: "x".repeat(16384 - Buffer.byteLength(raw)) });
    assert.equal(Buffer.byteLength(exact), 16384);
    const r = await c.post(exact);
    assert.equal(r.status, 200);
    assert.equal(c.writes.length, 1);
    assert.equal(c.gates[2][3], "push");
    assert.equal(c.gates[2][4], 30);
    privateHeaders(r);
  }));
test("push partial input deadline and cancellation release owned body before admission", () =>
  fixture(async (c) => {
    for (const abort of [false, true]) {
      let cancelled = 0;
      const stream = new ReadableStream({
        start(x) {
          x.enqueue(new TextEncoder().encode("{"));
        },
        cancel() {
          cancelled++;
        },
      });
      const controller = new AbortController();
      const request = new Request("https://fixture.invalid/api/push", {
        method: "POST",
        headers: { Origin: "https://fixture.invalid" },
        body: stream,
        duplex: "half",
        signal: controller.signal,
      });
      const owned = request.body;
      // Build a streamed request through the same actual handler exposed by the fixture.
      const result = c.rawPost(request);
      await tick();
      if (abort) controller.abort();
      else c.expire(10000);
      const r = await result;
      assert.equal(r.status, abort ? 499 : 408);
      assert.equal(owned.locked, false);
      assert.equal(cancelled, 1);
      privateHeaders(r);
    }
    assert.equal(c.gates.length, 0);
    assert.equal(c.writes.length, 0);
  }));
test("push admission timeout and owner abort stop ignored late auth and user-budget work before writes", () =>
  fixture(async (c) => {
    for (const gate of ["auth", "budget"])
      for (const abort of [false, true]) {
        const d = defer();
        c[gate] = () => d.promise;
        const controller = new AbortController();
        const p = c.post(value, controller.signal);
        await tick();
        if (abort) controller.abort();
        else c.expire(15000);
        const r = await p;
        assert.equal(r.status, abort ? 499 : 503);
        privateHeaders(r);
        d.resolve(gate === "auth" ? { userId: "synthetic-a" } : { allowed: true });
        await tick();
        assert.equal(c.writes.length, 0);
        c[gate] = async () => (gate === "auth" ? { userId: "synthetic-a" } : { allowed: true });
      }
    const r = await c.post();
    assert.equal(r.status, 200);
    assert.equal(c.writes.length, 1);
  }));
test("push settings reads share admission signal, bound bytes and validate settings without writes", () =>
  fixture(async (c) => {
    const cases = [
      [[{ enabled: true, reminder_hour: 7, timezone: "UTC" }], 200],
      [[{ enabled: "true" }], 503],
      [[{ reminder_hour: 99 }], 503],
      [[{}, {}], 503],
    ];
    for (const [rows, status] of cases) {
      c.storage = async () => Response.json(rows);
      const r = await c.get();
      assert.equal(r.status, status);
      privateHeaders(r);
      if (status === 200)
        assert.deepEqual(await r.json(), {
          configured: true,
          enabled: true,
          reminderHour: 7,
          timezone: "UTC",
          publicKey: "synthetic-public-key",
        });
    }
    c.storage = async () => new Response(" ".repeat(16385));
    const r = await c.get();
    assert.equal(r.status, 503);
    assert.doesNotMatch(await r.text(), /\.\.\.|SyntaxError/);
    assert.equal(c.reads[0].options.cache, "no-store");
    assert.ok(c.reads[0].options.signal instanceof AbortSignal);
    assert.equal(c.writes.length, 0);
  }));
test("push settings timeout disposes late headers and partial bodies; gate failures stay fixed and independent", () =>
  fixture(async (c) => {
    let cancelled = 0;
    const d = defer();
    c.storage = () => d.promise;
    const p = c.get();
    await tick();
    c.expire(15000);
    assert.equal((await p).status, 503);
    d.resolve(
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
    let stream;
    c.storage = async () =>
      new Response(
        (stream = new ReadableStream({
          start(x) {
            x.enqueue(new TextEncoder().encode("["));
          },
          cancel() {
            cancelled++;
            return new Promise(() => {});
          },
        })),
      );
    const next = c.get();
    await tick();
    c.expire(15000);
    assert.equal((await next).status, 503);
    assert.equal(stream.locked, false);
    c.ip = async () => ({ allowed: false, misconfigured: true });
    assert.equal((await c.get()).status, 503);
    c.ip = async () => ({ allowed: false });
    assert.equal((await c.get()).status, 429);
    c.ip = async () => ({ allowed: true });
    c.auth = async () => null;
    assert.equal((await c.get()).status, 401);
    c.auth = async () => ({ userId: "synthetic-a" });
    c.storage = async () => Response.json([]);
    assert.equal((await c.get()).status, 200);
    assert.equal(c.writes.length, 0);
  }));
