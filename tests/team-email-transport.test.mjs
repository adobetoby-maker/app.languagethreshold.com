import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { execFileSync } from "node:child_process";
mkdirSync(resolve("node_modules/.cache"), { recursive: true });
const dir = mkdtempSync(resolve("node_modules/.cache/team-email-transport-"));
let api;
try {
  await build({
    entryPoints: [resolve("src/lib/team-server.ts")],
    outfile: join(dir, "helper.mjs"),
    bundle: true,
    format: "esm",
    platform: "node",
    packages: "external",
    logLevel: "silent",
    plugins: process.env.LT_TEAM_EMAIL_BASELINE
      ? [
          {
            name: "historical-helper",
            setup(b) {
              b.onLoad({ filter: /\/src\/lib\/team-server\.ts$/ }, () => ({
                contents: execFileSync(
                  "git",
                  ["show", `${process.env.LT_TEAM_EMAIL_BASELINE}:src/lib/team-server.ts`],
                  { encoding: "utf8" },
                ),
                loader: "ts",
                resolveDir: resolve("src/lib"),
              }));
            },
          },
        ]
      : [],
  });
  api = await import(join(dir, "helper.mjs"));
} finally {
  rmSync(dir, { recursive: true, force: true });
}
async function fixture(run) {
  const saved = {
    fetch: globalThis.fetch,
    controller: globalThis.AbortController,
    set: setTimeout,
    clear: clearTimeout,
    error: console.error,
    env: Object.fromEntries(["RESEND_API_KEY", "TEAM_FROM_EMAIL"].map((k) => [k, process.env[k]])),
  };
  const c = {
    timers: new Map(),
    listeners: new Set(),
    calls: [],
    logs: [],
    resolve: null,
    preexpire: false,
  };
  globalThis.AbortController = class extends saved.controller {
    constructor() {
      super();
      const add = this.signal.addEventListener.bind(this.signal);
      const remove = this.signal.removeEventListener.bind(this.signal);
      this.signal.addEventListener = (type, listener, options) => {
        if (type === "abort") c.listeners.add(listener);
        return add(type, listener, options);
      };
      this.signal.removeEventListener = (type, listener, options) => {
        if (type === "abort") c.listeners.delete(listener);
        return remove(type, listener, options);
      };
    }
  };
  process.env.RESEND_API_KEY = "fixture-email-only";
  process.env.TEAM_FROM_EMAIL = "fixture@example.invalid";
  globalThis.setTimeout = (fn, ms, ...args) => {
    if (ms !== 15000) return saved.set(fn, ms, ...args);
    const key = { unref() {} };
    c.timers.set(key, fn);
    if (c.preexpire) fn();
    return key;
  };
  globalThis.clearTimeout = (key) => {
    if (c.timers.has(key)) c.timers.delete(key);
    else saved.clear(key);
  };
  console.error = (...args) => c.logs.push(args);
  globalThis.fetch = (url, init) => {
    c.calls.push({ url, init });
    return c.fetch(url, init);
  };
  c.fetch = async () => new Response(null, { status: 202 });
  try {
    await run(c);
    assert.equal(c.listeners.size, 0, "Owned abort listener released");
  } finally {
    if (c.resolve) c.resolve(new Response(null, { status: 202 }));
    globalThis.fetch = saved.fetch;
    globalThis.AbortController = saved.controller;
    globalThis.setTimeout = saved.set;
    globalThis.clearTimeout = saved.clear;
    console.error = saved.error;
    for (const [k, v] of Object.entries(saved.env)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}
const send = () =>
  api.sendTeamEmail("recipient@example.invalid", "Synthetic subject", "Synthetic text");
const fixed = "Team email delivery could not be confirmed. Check your workspace before retrying.";
async function unavailable(p) {
  await assert.rejects(p, (error) => {
    assert.equal(error.message, fixed);
    assert.ok(error instanceof api.TeamOperationError);
    assert.equal(error.status, 503);
    assert.equal(error.cause, undefined);
    return true;
  });
}
test("missing mail configuration does not dispatch or allocate a deadline", () =>
  fixture(async (c) => {
    for (const key of ["RESEND_API_KEY", "TEAM_FROM_EMAIL"]) {
      const saved = process.env[key];
      delete process.env[key];
      await assert.rejects(
        send(),
        (error) =>
          error instanceof api.TeamOperationError &&
          error.message === "Team email is not configured." &&
          error.status === 503,
      );
      process.env[key] = saved;
    }
    assert.equal(c.calls.length, 0);
    assert.equal(c.timers.size, 0);
    assert.deepEqual(c.logs, []);
  }));
test("accepted email posts once to the fixed service and disposes unneeded response bytes", () =>
  fixture(async (c) => {
    let cancelled = 0;
    c.fetch = async () =>
      new Response(
        new ReadableStream({
          cancel() {
            cancelled++;
            return new Promise(() => {});
          },
        }),
        { status: 202 },
      );
    assert.equal(await send(), undefined);
    assert.equal(c.calls.length, 1);
    const { url, init } = c.calls[0];
    assert.equal(url, "https://api.resend.com/emails");
    assert.equal(init.method, "POST");
    assert.equal(init.redirect, "error");
    assert.equal(init.cache, "no-store");
    assert.ok(init.signal instanceof AbortSignal);
    assert.equal(init.signal.aborted, false);
    assert.equal(init.headers.Authorization, "Bearer fixture-email-only");
    assert.deepEqual(JSON.parse(init.body), {
      from: "fixture@example.invalid",
      to: ["recipient@example.invalid"],
      subject: "Synthetic subject",
      text: "Synthetic text",
    });
    assert.equal(cancelled, 1);
    assert.equal(c.timers.size, 0);
    assert.deepEqual(c.logs, []);
  }));
test("non-success HTTP is fixed and response bodies are never read or retried", () =>
  fixture(async (c) => {
    for (const status of [301, 400, 401, 429, 500]) {
      let cancelled = 0;
      c.fetch = async () =>
        new Response(
          new ReadableStream({
            start(x) {
              x.enqueue(new TextEncoder().encode("PRIVATE provider diagnostic"));
            },
            cancel() {
              cancelled++;
            },
          }),
          { status },
        );
      const before = c.calls.length;
      await unavailable(send());
      assert.equal(c.calls.length, before + 1);
      assert.equal(cancelled, 1);
      assert.equal(c.timers.size, 0);
    }
    assert.deepEqual(c.logs, []);
  }));
test("sync throws and async private or malformed transport rejections never escape or log", () =>
  fixture(async (c) => {
    for (const value of [
      Error("PRIVATE transport credential context"),
      {
        get message() {
          throw Error("PRIVATE getter");
        },
      },
      "PRIVATE raw rejection",
    ]) {
      c.fetch = () => {
        throw value;
      };
      await unavailable(send());
      c.fetch = async () => {
        throw value;
      };
      await unavailable(send());
    }
    assert.equal(c.calls.length, 6);
    assert.equal(c.timers.size, 0);
    assert.deepEqual(c.logs, []);
  }));
test("deadline settles even when transport ignores abort and late headers cannot resend", () =>
  fixture(async (c) => {
    let dispatched;
    c.dispatched = new Promise((resolve) => {
      dispatched = resolve;
    });
    c.fetch = () =>
      new Promise((resolve) => {
        c.resolve = resolve;
        dispatched();
      });
    const pending = send();
    await c.dispatched;
    assert.equal(c.calls.length, 1);
    assert.equal(c.timers.size, 1);
    for (const fire of [...c.timers.values()]) fire();
    await unavailable(pending);
    assert.equal(c.calls[0].init.signal.aborted, true);
    assert.equal(c.timers.size, 0);
    let cancelled = 0;
    c.resolve(
      new Response(
        new ReadableStream({
          cancel() {
            cancelled++;
            return new Promise(() => {});
          },
        }),
        { status: 202 },
      ),
    );
    c.resolve = null;
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(cancelled, 1);
    assert.equal(c.calls.length, 1);
    assert.deepEqual(c.logs, []);
  }));
test("deadline before dispatch prevents sending and late rejection is fully observed", () =>
  fixture(async (c) => {
    c.preexpire = true;
    await unavailable(send());
    assert.equal(c.calls.length, 0);
    assert.equal(c.timers.size, 0);
    c.preexpire = false;
    let dispatched, rejectLate;
    const started = new Promise((resolve) => {
      dispatched = resolve;
    });
    c.fetch = () =>
      new Promise((_, reject) => {
        rejectLate = reject;
        dispatched();
      });
    const pending = send();
    await started;
    for (const fire of [...c.timers.values()]) fire();
    await unavailable(pending);
    rejectLate(Error("PRIVATE late network rejection"));
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(c.calls.length, 1);
    assert.equal(c.timers.size, 0);
    assert.deepEqual(c.logs, []);
  }));
