import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
const actor = "22222222-2222-4222-8222-222222222222";
const user = {
  id: actor,
  email: "fixture@example.invalid",
  email_confirmed_at: "2026-01-01T00:00:00Z",
};
async function fixture(run) {
  mkdirSync(resolve("node_modules/.cache"), { recursive: true });
  const dir = mkdtempSync(resolve("node_modules/.cache/reviewer-admin-input-"));
  const old = {
    fetch: globalThis.fetch,
    set: setTimeout,
    clear: clearTimeout,
    env: [
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      process.env.PLATFORM_OWNER_EMAIL,
    ],
  };
  const timers = new Map();
  try {
    await build({
      stdin: {
        contents: `export {Route} from '@/routes/api.exam-reviewers';`,
        resolveDir: process.cwd(),
      },
      outfile: join(dir, "api.mjs"),
      bundle: true,
      format: "esm",
      platform: "node",
      packages: "external",
      logLevel: "silent",
      plugins: [
        {
          name: "shell",
          setup(b) {
            if (process.env.LT_REVIEWER_ADMIN_BASELINE)
              b.onLoad({ filter: /\/src\/routes\/api\.exam-reviewers\.ts$/ }, (args) => ({
                contents: execFileSync(
                  "git",
                  [
                    "show",
                    process.env.LT_REVIEWER_ADMIN_BASELINE + ":src/routes/api.exam-reviewers.ts",
                  ],
                  { encoding: "utf8" },
                ),
                loader: "ts",
                resolveDir: resolve(args.path, ".."),
              }));
            b.onResolve({ filter: /^@tanstack\/react-start\/server-only$/ }, () => ({
              path: "server-only",
              namespace: "server-only",
            }));
            b.onLoad({ filter: /.*/, namespace: "server-only" }, () => ({ contents: "" }));
            b.onResolve({ filter: /^@tanstack\/react-router$/ }, () => ({
              path: "shell",
              namespace: "shell",
            }));
            b.onLoad({ filter: /.*/, namespace: "shell" }, () => ({
              contents: "export const createFileRoute=()=>config=>config;",
            }));
          },
        },
      ],
    });
    const api = await import(join(dir, "api.mjs"));
    process.env.SUPABASE_URL = "https://fixture.invalid";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "synthetic-key";
    delete process.env.PLATFORM_OWNER_EMAIL;
    globalThis.setTimeout = (fn, ms, ...args) => {
      if (ms !== 10000) return old.set(fn, ms, ...args);
      const t = { unref() {} };
      timers.set(t, fn);
      return t;
    };
    globalThis.clearTimeout = (t) => {
      if (!timers.delete(t)) old.clear(t);
    };
    await run({ ...api, timers, old });
    assert.equal(timers.size, 0);
  } finally {
    globalThis.fetch = old.fetch;
    globalThis.setTimeout = old.set;
    globalThis.clearTimeout = old.clear;
    for (const [i, k] of [
      "SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
      "PLATFORM_OWNER_EMAIL",
    ].entries()) {
      if (old.env[i] === undefined) delete process.env[k];
      else process.env[k] = old.env[i];
    }
    rmSync(dir, { recursive: true, force: true });
  }
}
const valid = {
  userId: actor,
  moduleId: "roofing",
  target: "Spanish",
  native: "English",
  kind: "response",
  active: true,
  expectedRevision: 0,
  reason: "Synthetic qualification fixture only",
  requestId: "33333333-3333-4333-8333-333333333333",
  confirmScope: true,
};
function transport(events, role = "owner") {
  globalThis.fetch = async (input, init) => {
    const path = new URL(String(input)).pathname;
    events.push(path);
    if (path === "/auth/v1/user") return Response.json(user);
    if (path === "/rest/v1/platform_admin_roles") return Response.json(role ? [{ role }] : []);
    if (path === "/rest/v1/rpc/consume_speaking_request") return Response.json(true);
    if (path === "/rest/v1/rpc/assessment_manage_reviewer")
      return Response.json({ fixtureAcknowledgement: true });
    throw Error("Unexpected synthetic work");
  };
}
function req(body = JSON.stringify(valid), headers = {}, signal) {
  return new Request("https://app.invalid/api/exam-reviewers", {
    method: "POST",
    headers: {
      Origin: "https://app.invalid",
      Authorization: "Bearer synthetic",
      "Content-Type": "application/json",
      ...headers,
    },
    body,
    signal,
    ...(body instanceof ReadableStream ? { duplex: "half" } : {}),
  });
}
const call = (a, request) => a.Route.server.handlers.POST({ request });
async function check(response, status) {
  assert.equal(response.status, status);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("cdn-cache-control"), "no-store");
  assert.equal(response.headers.get("vercel-cdn-cache-control"), "no-store");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  const body = await response.json();
  assert.equal(JSON.stringify(body).includes("PRIVATE"), false);
  return body;
}
test("invalid reviewer input and origin stop before Auth, registered-owner lookup and quota", () =>
  fixture(async (a) => {
    const events = [];
    transport(events);
    for (const [body, headers, status] of [
      ["PRIVATE invalid JSON", {}, 400],
      [new Uint8Array([0xff]), {}, 400],
      ["{}", {}, 400],
      [JSON.stringify({ ...valid, confirmScope: false }), {}, 400],
      [JSON.stringify({ ...valid, extra: "PRIVATE" }), {}, 400],
      [JSON.stringify(valid), { Origin: "https://foreign.invalid" }, 403],
      [JSON.stringify(valid), { Origin: "" }, 403],
      [JSON.stringify(valid), { "Content-Length": String(16385) }, 413],
      [JSON.stringify({ reason: "é".repeat(9000) }), {}, 413],
    ]) {
      await check(await call(a, req(body, headers)), status);
      assert.deepEqual(events, []);
    }
  }));
test("streamed reviewer overflow cancels without waiting for cancellation completion or database access", () =>
  fixture(async (a) => {
    const events = [];
    transport(events);
    let cancelled = 0;
    const body = new ReadableStream({
      start(c) {
        c.enqueue(new Uint8Array(8192));
        c.enqueue(new Uint8Array(8193));
      },
      cancel() {
        cancelled++;
        return new Promise(() => {});
      },
    });
    const request = req(body);
    await check(await call(a, request), 413);
    assert.equal(cancelled, 1);
    assert.equal(request.body.locked, false);
    assert.deepEqual(events, []);
  }));
test("stalled reviewer input deadline returns408 before SDK and releases its reader", () =>
  fixture(async (a) => {
    const events = [];
    transport(events);
    let cancelled = 0;
    const request = req(
      new ReadableStream({
        cancel() {
          cancelled++;
          return new Promise(() => {});
        },
      }),
    );
    const pending = call(a, request);
    await new Promise((r) => a.old.set(r, 0));
    assert.equal(a.timers.size, 1);
    [...a.timers.values()][0]();
    assert.deepEqual(await check(await pending, 408), {
      error: "The reviewer upload took too long. Please try again.",
    });
    assert.equal(cancelled, 1);
    assert.equal(request.body.locked, false);
    assert.deepEqual(events, []);
  }));
test("pending and already cancelled reviewer bodies return499 without SDK work or retained listeners", () =>
  fixture(async (a) => {
    for (const preabort of [true, false]) {
      const events = [];
      transport(events);
      const owner = new AbortController();
      let cancelled = 0;
      if (preabort) owner.abort();
      const request = req(
        new ReadableStream({
          cancel() {
            cancelled++;
            return new Promise(() => {});
          },
        }),
        {},
        owner.signal,
      );
      const listeners = new Set(),
        add = request.signal.addEventListener.bind(request.signal),
        remove = request.signal.removeEventListener.bind(request.signal);
      request.signal.addEventListener = (k, f, o) => {
        if (k === "abort") listeners.add(f);
        add(k, f, o);
      };
      request.signal.removeEventListener = (k, f, o) => {
        if (k === "abort") listeners.delete(f);
        remove(k, f, o);
      };
      const pending = call(a, request);
      if (!preabort) owner.abort();
      assert.deepEqual(await check(await pending, 499), { error: "Assessment request cancelled." });
      assert.equal(cancelled, 1);
      assert.equal(request.body.locked, false);
      assert.equal(listeners.size, 0);
      assert.deepEqual(events, []);
    }
  }));
test("valid maximum escaped Unicode reason retains exact owner guard and one unchanged mutation RPC", () =>
  fixture(async (a) => {
    const events = [];
    transport(events);
    const value = { ...valid, reason: "é".repeat(2000) },
      text = JSON.stringify(value).replaceAll("é", "\\u00e9");
    assert.ok(text.length > 12000 && text.length < 16384);
    const request = req(
      new ReadableStream({
        start(c) {
          const bytes = new TextEncoder().encode(text);
          c.enqueue(bytes.slice(0, 100));
          c.enqueue(bytes.slice(100));
          c.close();
        },
      }),
    );
    const captured = [];
    const original = globalThis.fetch;
    globalThis.fetch = async (i, j) => {
      if (new URL(String(i)).pathname.endsWith("assessment_manage_reviewer"))
        captured.push(JSON.parse(j.body));
      return original(i, j);
    };
    assert.deepEqual(await check(await call(a, request), 200), { fixtureAcknowledgement: true });
    assert.deepEqual(events, [
      "/auth/v1/user",
      "/rest/v1/platform_admin_roles",
      "/rest/v1/platform_admin_roles",
      "/rest/v1/rpc/consume_speaking_request",
      "/rest/v1/rpc/assessment_manage_reviewer",
    ]);
    assert.deepEqual(captured, [
      {
        p_actor: actor,
        p_user: actor,
        p_module: "roofing",
        p_target: "Spanish",
        p_native: "English",
        p_kind: "response",
        p_active: true,
        p_expected: 0,
        p_reason: value.reason,
        p_request: value.requestId,
      },
    ]);
    assert.equal(request.body.locked, false);
  }));
test("valid reviewer input still requires actual bearer and registered owner; no budget or mutation on denial", () =>
  fixture(async (a) => {
    const events = [];
    transport(events);
    await check(await call(a, req(JSON.stringify(valid), { Authorization: "" })), 403);
    assert.deepEqual(events, []);
    transport(events, "support");
    await check(await call(a, req()), 403);
    assert.equal(events.includes("/rest/v1/rpc/consume_speaking_request"), false);
    assert.equal(events.includes("/rest/v1/rpc/assessment_manage_reviewer"), false);
  }));
