import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
const org = "11111111-1111-4111-8111-111111111111",
  actor = "22222222-2222-4222-8222-222222222222";
const row = { role: "owner" };
const user = {
  id: actor,
  email: "fixture@example.invalid",
  email_confirmed_at: "2026-01-01T00:00:00Z",
};
async function fixture(run) {
  mkdirSync(resolve("node_modules/.cache"), { recursive: true });
  const dir = mkdtempSync(resolve("node_modules/.cache/team-owner-"));
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
        contents: `export {Route} from '@/routes/api.platform'; export {teamAdminClient,requirePlatformOwner,readPlatformRole} from '@/lib/team-server';export {teamOwnerFetch} from '@/lib/team-owner-fetch';export {contentPrivileges,requireRegisteredAssessmentOwner} from '@/lib/assessments/content-server';`,
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
const unavailable = (e) =>
  e.status === 503 && e.message === "Owner access could not be confirmed. Please try again.";
test("owner projection and actor filters are bounded; confirmed-email fallback retains its original rules", () =>
  fixture(async (a) => {
    let calls = 0;
    const c = a.client(async (input, init) => {
      calls++;
      const u = new URL(String(input));
      assert.equal(u.pathname, "/rest/v1/platform_admin_roles");
      assert.equal(u.searchParams.get("user_id"), "eq." + actor);
      assert.equal(u.searchParams.get("select"), "role");
      assert.ok(init.signal);
      assert.equal(init.cache, "no-store");
      assert.equal(init.redirect, "error");
      return Response.json([row]);
    });
    await a.requirePlatformOwner(c.db, user);
    assert.equal(calls, 1);
    for (const data of [[], null, [{ role: "support" }]]) {
      const x = a.client(async () => Response.json(data));
      await assert.rejects(a.requirePlatformOwner(x.db, user), (e) => e.status === 403);
    }
    process.env.PLATFORM_OWNER_EMAIL = "  FIXTURE@example.invalid ";
    const fallback = a.client(async () => Response.json([{ role: "support" }]));
    await a.requirePlatformOwner(fallback.db, user);
    await assert.rejects(
      a.requirePlatformOwner(fallback.db, { ...user, email_confirmed_at: null }),
      (e) => e.status === 403,
    );
    await assert.rejects(
      a.requirePlatformOwner(fallback.db, { ...user, email: "another@example.invalid" }),
      (e) => e.status === 403,
    );
  }));
test("owner HTTP/private failures dispatch once, dispose bodies and expose fixed service guidance", () =>
  fixture(async (a) => {
    process.env.PLATFORM_OWNER_EMAIL = user.email;
    for (const status of [301, 401, 403, 429, 500, 503]) {
      let calls = 0,
        cancelled = 0;
      const c = a.client(async () => {
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
      await assert.rejects(a.requirePlatformOwner(c.db, user), unavailable);
      assert.equal(calls, 1);
      assert.equal(cancelled, 1);
    }
    for (const fail of [
      () => {
        throw Error("PRIVATE");
      },
      () => Promise.reject({ message: "PRIVATE" }),
    ]) {
      const c = a.client(fail);
      await assert.rejects(a.requirePlatformOwner(c.db, user), unavailable);
    }
  }));
test("owner responses reject oversized, unknown, duplicate and malformed UTF8/JSON fields", () =>
  fixture(async (a) => {
    for (const value of [
      [{ ...row, extra: "x".repeat(4096) }],
      [{ ...row, private: "fixture" }],
      [row, row],
      [{ role: "admin" }],
      [{ role: null }],
    ]) {
      const c = a.client(async () => Response.json(value));
      await assert.rejects(a.requirePlatformOwner(c.db, user), unavailable);
    }
    for (const body of [
      JSON.stringify([row]) + " ".repeat(4096),
      "{",
      new Uint8Array([0xc3, 0x28]),
    ]) {
      const c = a.client(async () => new Response(body));
      await assert.rejects(a.requirePlatformOwner(c.db, user), unavailable);
    }
  }));
test("departure/deadline settle ignored owner transport and dispose late headers", () =>
  fixture(async (a) => {
    for (const mode of ["abort", "deadline"]) {
      let release,
        start,
        cancelled = 0;
      const began = new Promise((r) => (start = r));
      const c = a.client(
        () =>
          new Promise((r) => {
            release = r;
            start();
          }),
      );
      const result = assert.rejects(a.requirePlatformOwner(c.db, user), (e) =>
        mode === "abort" ? e.status === 499 : unavailable(e),
      );
      await began;
      if (mode === "abort") c.owner.abort();
      else {
        assert.equal(a.timers.size, 1);
        [...a.timers.values()][0]();
      }
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
    await assert.rejects(a.requirePlatformOwner(c.db, user), (e) => e.status === 499);
    assert.equal(calls, 0);
  }));
test("an enclosing owner/history phase abort is respected and stalled bodies cannot hold permission", () =>
  fixture(async (a) => {
    const phase = new AbortController();
    let start,
      cancelled = 0,
      transportSignal;
    const began = new Promise((r) => (start = r));
    const c = a.client(async (input, init) => {
      transportSignal = init.signal;
      return new Response(
        new ReadableStream({
          pull() {
            start();
          },
          cancel() {
            cancelled++;
            return new Promise(() => {});
          },
        }),
      );
    });
    const result = assert.rejects(a.requirePlatformOwner(c.db, user, phase.signal), unavailable);
    await began;
    phase.abort();
    await result;
    assert.ok(transportSignal.aborted);
    assert.equal(cancelled, 1);
  }));
test("actual platform route stops before module update and audit when owner lookup loses its request", () =>
  fixture(async (a) => {
    let release, start;
    const began = new Promise((r) => (start = r)),
      owner = new AbortController(),
      events = [];
    globalThis.fetch = async (input) => {
      const path = new URL(String(input)).pathname;
      events.push(path);
      if (path === "/auth/v1/user") return Response.json(user);
      if (path === "/rest/v1/platform_admin_roles") {
        start();
        return new Promise((r) => (release = r));
      }
      throw Error("Unexpected operation after owner lookup");
    };
    const request = new Request("https://app.invalid/api/platform", {
      method: "POST",
      headers: { Origin: "https://app.invalid", Authorization: "Bearer synthetic-user" },
      signal: owner.signal,
      body: JSON.stringify({
        action: "module_request_update",
        requestId: org,
        status: "submitted",
        ownerNote: "Synthetic audit fixture",
      }),
    });
    const operation = a.Route.server.handlers.POST({ request });
    await began;
    owner.abort();
    await new Promise((r) => a.old.set(r, 0));
    release(Response.json([row]));
    const response = await operation;
    assert.equal(response.status, 499);
    assert.deepEqual(events, ["/auth/v1/user", "/rest/v1/platform_admin_roles"]);
  }));
test("repeated content/registered-owner role checks share request bounds and preserve registered-role policy", () =>
  fixture(async (a) => {
    for (const kind of ["contentPrivileges", "requireRegisteredAssessmentOwner"]) {
      let count = 0,
        start,
        release;
      const began = new Promise((r) => (start = r));
      const c = a.client(async (input, init) => {
        const path = new URL(String(input)).pathname;
        if (path === "/rest/v1/assessment_content_reviewers") return Response.json([]);
        assert.equal(path, "/rest/v1/platform_admin_roles");
        assert.ok(init.signal);
        count++;
        if (count === 1) return Response.json([row]);
        start();
        return new Promise((r) => (release = r));
      });
      const result = assert.rejects(a[kind](c.db, user), (e) => e.status === 499);
      await began;
      c.owner.abort();
      await result;
      release(Response.json([row]));
      await new Promise((r) => a.old.set(r, 0));
      assert.equal(count, 2);
    }
    process.env.PLATFORM_OWNER_EMAIL = user.email;
    const c = a.client(async (input) =>
      Response.json(
        new URL(String(input)).pathname === "/rest/v1/platform_admin_roles"
          ? [{ role: "support" }]
          : [],
      ),
    );
    const privileges = await a.contentPrivileges(c.db, user);
    assert.equal(privileges.owner, true);
    assert.equal(privileges.registeredOwner, false);
    await assert.rejects(
      a.requireRegisteredAssessmentOwner(c.db, user),
      (e) =>
        e.status === 403 &&
        e.message === "A registered platform owner role is required to manage reviewer access.",
    );
  }));
test("owner transport selects only its exact read and keeps concurrent clients independent", () =>
  fixture(async (a) => {
    const owner = new AbortController();
    owner.abort();
    for (const [url, init] of [
      [
        "https://other.invalid/rest/v1/platform_admin_roles?select=role&user_id=eq.x",
        { method: "GET" },
      ],
      [
        "https://fixture.invalid/rest/v1/platform_admin_roles?select=role&user_id=eq.x&limit=1",
        { method: "GET" },
      ],
      [
        "https://fixture.invalid/rest/v1/platform_admin_roles?select=role&user_id=eq.x",
        { method: "POST", body: "{}" },
      ],
    ]) {
      await a.teamOwnerFetch("https://fixture.invalid", owner.signal, async (i, j) => {
        assert.equal(i, url);
        assert.equal(j, init);
        return Response.json([]);
      })(url, init);
    }
    let releaseA, releaseB, startA, startB;
    const one = new Promise((r) => (startA = r)),
      two = new Promise((r) => (startB = r));
    const ca = a.client(
        () =>
          new Promise((r) => {
            releaseA = r;
            startA();
          }),
      ),
      cb = a.client(
        () =>
          new Promise((r) => {
            releaseB = r;
            startB();
          }),
      );
    const pa = assert.rejects(a.requirePlatformOwner(ca.db, user), (e) => e.status === 499),
      pb = a.requirePlatformOwner(cb.db, user);
    await Promise.all([one, two]);
    ca.owner.abort();
    await pa;
    releaseB(Response.json([row]));
    await pb;
    releaseA(Response.json([row]));
    await new Promise((r) => a.old.set(r, 0));
  }));
