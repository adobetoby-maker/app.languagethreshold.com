import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
const actor = "22222222-2222-4222-8222-222222222222";
const row = {
  module_id: "roofing",
  target_language: "Spanish",
  instruction_language: "English",
  kind: "domain",
};
const user = {
  id: actor,
  email: "fixture@example.invalid",
  email_confirmed_at: "2026-01-01T00:00:00Z",
};
async function fixture(run) {
  mkdirSync(resolve("node_modules/.cache"), { recursive: true });
  const dir = mkdtempSync(resolve("node_modules/.cache/content-grant-"));
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
  const timers = new Map(),
    resources = [];
  try {
    await build({
      stdin: {
        contents: `export {Route} from '@/routes/api.exam-content';export {teamAdminClient} from '@/lib/team-server';export {teamContentGrantsFetch} from '@/lib/team-content-grants-fetch';export {contentPrivileges,contentTrackAllowed} from '@/lib/assessments/content-server';`,
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
      if (ms !== 8000) return old.set(fn, ms, ...args);
      const t = { unref() {} };
      timers.set(t, fn);
      return t;
    };
    globalThis.clearTimeout = (t) => {
      if (!timers.delete(t)) old.clear(t);
    };
    function client(fetcher) {
      const owner = new AbortController();
      const request = new Request("https://app.invalid/api/team", { signal: owner.signal });
      const listeners = new Set(),
        add = request.signal.addEventListener.bind(request.signal),
        remove = request.signal.removeEventListener.bind(request.signal);
      request.signal.addEventListener = (kind, fn, opts) => {
        if (kind === "abort") listeners.add(fn);
        add(kind, fn, opts);
      };
      request.signal.removeEventListener = (kind, fn, opts) => {
        if (kind === "abort") listeners.delete(fn);
        remove(kind, fn, opts);
      };
      resources.push({ owner, listeners });
      return { owner, request, db: api.teamAdminClient(fetcher, request) };
    }
    await run({ ...api, client, timers, old });
    assert.equal(timers.size, 0);
    for (const r of resources) assert.equal(r.listeners.size, 0);
  } finally {
    for (const r of resources) r.owner.abort();
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
function client(a, handler) {
  return a.client(async (input, init) => {
    const path = new URL(String(input)).pathname;
    if (path === "/rest/v1/platform_admin_roles") return Response.json([]);
    assert.equal(path, "/rest/v1/assessment_content_reviewers");
    return handler(input, init);
  });
}
const unavailable = (e) =>
  e.status === 503 && e.message === "Content permissions could not be checked.";
test("active content grants retain exact actor/projection and matching-track authorization", () =>
  fixture(async (a) => {
    let calls = 0;
    const c = client(a, async (input, init) => {
      calls++;
      const u = new URL(String(input));
      assert.equal(u.searchParams.get("user_id"), "eq." + actor);
      assert.equal(u.searchParams.get("active"), "eq.true");
      assert.equal(
        u.searchParams.get("select"),
        "module_id,target_language,instruction_language,kind",
      );
      assert.ok(init.signal);
      assert.equal(init.cache, "no-store");
      assert.equal(init.redirect, "error");
      return Response.json([row]);
    });
    const p = await a.contentPrivileges(c.db, user);
    assert.equal(p.owner, false);
    assert.equal(p.registeredOwner, false);
    assert.deepEqual(p.grants, [row]);
    assert.ok(a.contentTrackAllowed(p, row));
    assert.equal(a.contentTrackAllowed(p, { ...row, module_id: "another-module" }), false);
    assert.equal(a.contentTrackAllowed(p, { ...row, target_language: "French" }), false);
    assert.equal(calls, 1);
    const empty = client(a, async () => Response.json([]));
    assert.deepEqual((await a.contentPrivileges(empty.db, user)).grants, []);
  }));
test("content grant HTTP/private failures dispatch once and keep existing fixed guidance", () =>
  fixture(async (a) => {
    for (const status of [301, 401, 403, 429, 500, 503]) {
      let calls = 0,
        cancelled = 0;
      const c = client(a, async () => {
        calls++;
        return new Response(
          new ReadableStream({
            cancel() {
              cancelled++;
            },
          }),
          { status },
        );
      });
      await assert.rejects(a.contentPrivileges(c.db, user), unavailable);
      assert.equal(calls, 1);
      assert.equal(cancelled, 1);
    }
    for (const fail of [
      () => {
        throw Error("PRIVATE");
      },
      () => Promise.reject({ message: "PRIVATE" }),
    ]) {
      const c = client(a, fail);
      await assert.rejects(a.contentPrivileges(c.db, user), unavailable);
    }
  }));
test("grant wire budget and strict projection reject excess, malformed, non-array and invalid-kind results", () =>
  fixture(async (a) => {
    for (const value of [
      null,
      row,
      [{ ...row, private: "synthetic" }],
      [{ ...row, kind: "evidence" }],
      [{ ...row, module_id: 0 }],
      [{ ...row, target_language: null }],
    ]) {
      const c = client(a, async () => Response.json(value));
      await assert.rejects(a.contentPrivileges(c.db, user), unavailable);
    }
    for (const body of [
      JSON.stringify([row]) + " ".repeat(128 * 1024),
      "{",
      new Uint8Array([0xc3, 0x28]),
    ]) {
      const c = client(a, async () => new Response(body));
      await assert.rejects(a.contentPrivileges(c.db, user), unavailable);
    }
  }));
test("after owner reads finish, cancellation/deadline settle ignored grant headers and dispose late data", () =>
  fixture(async (a) => {
    for (const mode of ["abort", "deadline"]) {
      let release,
        start,
        cancelled = 0;
      const began = new Promise((r) => (start = r)),
        c = client(
          a,
          () =>
            new Promise((r) => {
              release = r;
              start();
            }),
        );
      const result = assert.rejects(a.contentPrivileges(c.db, user), (e) =>
        mode === "abort" ? e.status === 499 : unavailable(e),
      );
      await began;
      await new Promise((r) => a.old.set(r, 0));
      assert.equal(a.timers.size, 1);
      if (mode === "abort") c.owner.abort();
      else [...a.timers.values()][0]();
      await result;
      release(
        new Response(
          new ReadableStream({
            cancel() {
              cancelled++;
            },
          }),
        ),
      );
      await new Promise((r) => a.old.set(r, 0));
      assert.equal(cancelled, 1);
    }
    let calls = 0;
    const c = a.client(async () => {
      calls++;
      return Response.json([row]);
    });
    c.owner.abort();
    await assert.rejects(a.contentPrivileges(c.db, user), (e) => e.status === 499);
    assert.equal(calls, 0);
  }));
test("grant deadline covers stalled body without waiting for reader cancellation completion", () =>
  fixture(async (a) => {
    let start,
      cancelled = 0;
    const began = new Promise((r) => (start = r)),
      c = client(
        a,
        async () =>
          new Response(
            new ReadableStream({
              pull() {
                start();
              },
              cancel() {
                cancelled++;
                return new Promise(() => {});
              },
            }),
          ),
      );
    const result = assert.rejects(a.contentPrivileges(c.db, user), unavailable);
    await began;
    await new Promise((r) => a.old.set(r, 0));
    assert.equal(a.timers.size, 1);
    [...a.timers.values()][0]();
    await result;
    assert.equal(cancelled, 1);
  }));
test("actual content catalog stops before budget and private catalog read when the scoped grant loses its request", () =>
  fixture(async (a) => {
    let release, start;
    const began = new Promise((r) => (start = r)),
      owner = new AbortController(),
      events = [];
    globalThis.fetch = async (input, init) => {
      const path = new URL(String(input)).pathname;
      events.push(path);
      if (path === "/auth/v1/user") return Response.json(user);
      if (path === "/rest/v1/platform_admin_roles") return Response.json([]);
      if (path === "/rest/v1/assessment_content_reviewers") {
        assert.ok(init.signal);
        start();
        return new Promise((r) => (release = r));
      }
      throw Error("Unexpected work after content grant");
    };
    const request = new Request("https://app.invalid/api/exam-content", {
      headers: { Authorization: "Bearer synthetic-user" },
      signal: owner.signal,
    });
    const operation = a.Route.server.handlers.GET({ request });
    await began;
    await new Promise((r) => a.old.set(r, 0));
    owner.abort();
    await new Promise((r) => a.old.set(r, 0));
    release(Response.json([row]));
    const response = await operation;
    assert.equal(response.status, 499);
    assert.deepEqual(await response.json(), { error: "Assessment request cancelled." });
    assert.equal(events[0], "/auth/v1/user");
    assert.deepEqual(
      events.slice(1).sort(),
      [
        "/rest/v1/platform_admin_roles",
        "/rest/v1/platform_admin_roles",
        "/rest/v1/assessment_content_reviewers",
      ].sort(),
    );
  }));
test("only the exact active-user grant read is selected; admin projections and writes pass through", () =>
  fixture(async (a) => {
    const owner = new AbortController();
    owner.abort();
    const base = "https://fixture.invalid/rest/v1/assessment_content_reviewers";
    for (const [url, init] of [
      [
        base +
          "?select=module_id,target_language,instruction_language,kind&user_id=eq.x&active=eq.false",
        { method: "GET" },
      ],
      [base + "?select=user_id,module_id,kind&user_id=eq.x&active=eq.true", { method: "GET" }],
      [
        base +
          "?select=module_id,target_language,instruction_language,kind&user_id=eq.x&active=eq.true",
        { method: "PATCH", body: "{}" },
      ],
      [
        base.replace("fixture.invalid", "other.invalid") +
          "?select=module_id,target_language,instruction_language,kind&user_id=eq.x&active=eq.true",
        { method: "GET" },
      ],
    ]) {
      await a.teamContentGrantsFetch("https://fixture.invalid", owner.signal, async (i, j) => {
        assert.equal(i, url);
        assert.equal(j, init);
        return Response.json([]);
      })(url, init);
    }
  }));
test("concurrent content-grant clients keep scope and cancellation independent", () =>
  fixture(async (a) => {
    let releaseA, releaseB, startA, startB;
    const first = new Promise((r) => (startA = r)),
      second = new Promise((r) => (startB = r));
    const ca = client(
        a,
        () =>
          new Promise((r) => {
            releaseA = r;
            startA();
          }),
      ),
      cb = client(
        a,
        () =>
          new Promise((r) => {
            releaseB = r;
            startB();
          }),
      );
    const pa = assert.rejects(a.contentPrivileges(ca.db, user), (e) => e.status === 499),
      pb = a.contentPrivileges(cb.db, user);
    await Promise.all([first, second]);
    await new Promise((r) => a.old.set(r, 0));
    ca.owner.abort();
    await pa;
    releaseB(Response.json([{ ...row, target_language: "French" }]));
    const other = await pb;
    assert.equal(other.grants[0].target_language, "French");
    releaseA(Response.json([row]));
    await new Promise((r) => a.old.set(r, 0));
  }));
