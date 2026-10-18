import assert from "node:assert/strict";
import test from "node:test";
import { loadModule } from "./helpers/bundle.mjs";
const unavailable = "Cleanup status is temporarily unavailable. Try again.",
  cancelled = "Cleanup status request cancelled.";
const defer = () => {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
};
async function fixture(run) {
  const api = await loadModule("src/lib/assessments/cleanup-schedule-server.ts", {
    stubs: [/^@tanstack\/react-start\/server-only$/],
  });
  const savedSet = setTimeout,
    savedClear = clearTimeout,
    timers = new Map();
  globalThis.setTimeout = (fn, ms, ...args) => {
    if (![8000, 15000].includes(ms)) return savedSet(fn, ms, ...args);
    const token = { ms, unref() {} };
    timers.set(token, fn);
    return token;
  };
  globalThis.clearTimeout = (t) => {
    if (timers.has(t)) timers.delete(t);
    else savedClear(t);
  };
  const until = async (check) => {
    for (let i = 0; i < 100 && !check(); i++) await new Promise((r) => savedSet(r, 1));
    assert.ok(check());
  };
  function setup() {
    const owner = new AbortController(),
      request = new Request("https://fixture.invalid/api/exam-cleanup?view=status", {
        headers: { Authorization: "Bearer synthetic" },
        signal: owner.signal,
      });
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
    const c = {
      clients: 0,
      auth: 0,
      owner: 0,
      history: 0,
      writes: 0,
      authResult: async () => ({
        data: { user: { id: "synthetic", email: "fixture@example.invalid" } },
        error: null,
      }),
      roleResult: async () => ({ data: { role: "owner" }, error: null }),
      historyResult: async () => ({ data: [], error: null }),
    };
    const db = {
      auth: {
        getUser: async () => {
          c.auth++;
          return c.authResult();
        },
      },
      rpc() {
        c.writes++;
        throw Error("Unexpected work claim");
      },
      storage: {
        getBucket() {
          c.writes++;
          throw Error("Unexpected storage");
        },
      },
      from(table) {
        if (table === "platform_admin_roles") {
          c.owner++;
          return {
            select() {
              return this;
            },
            eq() {
              return this;
            },
            maybeSingle: () => c.roleResult(),
          };
        }
        assert.equal(table, "assessment_cleanup_runs");
        c.history++;
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          order() {
            return this;
          },
          limit: () => c.historyResult(),
        };
      },
    };
    const start = () =>
      api.handleCleanup(request, {}, (fetcher, authRequest) => {
        c.clients++;
        assert.equal(typeof fetcher, "function");
        assert.equal(authRequest, request);
        return db;
      });
    return { owner, request, listeners, c, start };
  }
  try {
    await run({
      setup,
      until,
      expire(ms) {
        for (const [token, fn] of [...timers]) if (token.ms === ms) fn();
      },
      timers,
      api,
    });
    assert.equal(timers.size, 0);
  } finally {
    globalThis.setTimeout = savedSet;
    globalThis.clearTimeout = savedClear;
  }
}
test("actual cleanup status separates owner denial from auth/config/owner/history unavailability", () =>
  fixture(async ({ setup, api }) => {
    for (const phase of ["auth", "owner", "history", "denied", "success"]) {
      const x = setup();
      if (phase === "auth")
        x.c.authResult = async () => {
          throw Error("SYNTHETIC_PRIVATE auth detail");
        };
      if (phase === "owner")
        x.c.roleResult = async () => ({ error: Error("SYNTHETIC_PRIVATE owner session detail") });
      if (phase === "history")
        x.c.historyResult = async () => ({ error: Error("SYNTHETIC_PRIVATE history detail") });
      if (phase === "denied")
        x.c.roleResult = async () => ({ data: { role: "admin" }, error: null });
      const r = await x.start(),
        body = await r.json();
      assert.equal(r.status, phase === "success" ? 200 : phase === "denied" ? 403 : 503);
      if (phase === "success") {
        assert.equal(body.health, "not_observed");
        assert.equal(body.executionEnabled, false);
      } else
        assert.deepEqual(body, {
          error: phase === "denied" ? "Platform owner access required." : unavailable,
        });
      assert.equal(r.headers.get("cache-control"), "private, no-store");
      assert.equal(r.headers.get("referrer-policy"), "no-referrer");
      assert.equal(x.c.writes, 0);
      assert.equal(x.listeners.size, 0);
      if (["auth", "owner", "denied"].includes(phase)) assert.equal(x.c.history, 0);
    }
    const x = setup();
    const failed = await api.handleCleanup(x.request, {}, () => {
      throw Error("SYNTHETIC_PRIVATE config");
    });
    assert.equal(failed.status, 503);
    assert.deepEqual(await failed.json(), { error: unavailable });
    assert.equal(x.c.writes, 0);
  }));
test("actual cleanup status preabort constructs no SDK and auth departure starts no owner/history work", () =>
  fixture(async ({ setup, until, expire }) => {
    for (const phase of ["preabort", "deadline", "disconnect"]) {
      const x = setup(),
        gate = defer();
      x.c.authResult = () => gate.promise;
      if (phase === "preabort") x.owner.abort();
      const pending = x.start();
      if (phase !== "preabort") {
        await until(() => x.c.auth === 1);
        if (phase === "deadline") expire(15000);
        else x.owner.abort();
      }
      const r = await pending;
      assert.equal(r.status, phase === "deadline" ? 503 : 499);
      assert.deepEqual(await r.json(), { error: phase === "deadline" ? unavailable : cancelled });
      assert.equal(x.c.clients, phase === "preabort" ? 0 : 1);
      assert.equal(x.c.owner, 0);
      assert.equal(x.c.history, 0);
      assert.equal(x.listeners.size, 0);
      gate.resolve({
        data: { user: { id: "late", email: "fixture@example.invalid" } },
        error: null,
      });
      await Promise.resolve();
      assert.equal(x.c.owner, 0);
      assert.equal(x.c.writes, 0);
    }
  }));
test("actual cleanup owner-check deadline/disconnect discard late permission and never read history", () =>
  fixture(async ({ setup, until, expire }) => {
    for (const phase of ["deadline", "disconnect"]) {
      const x = setup(),
        gate = defer();
      x.c.roleResult = () => gate.promise;
      const pending = x.start();
      await until(() => x.c.owner === 1);
      if (phase === "deadline") expire(8000);
      else x.owner.abort();
      const r = await pending;
      assert.equal(r.status, phase === "deadline" ? 503 : 499);
      assert.deepEqual(await r.json(), { error: phase === "deadline" ? unavailable : cancelled });
      gate.resolve({ data: { role: "owner" }, error: null });
      await Promise.resolve();
      await Promise.resolve();
      assert.equal(x.c.history, 0);
      assert.equal(x.listeners.size, 0);
      assert.equal(x.c.writes, 0);
    }
  }));
test("actual cleanup history deadline/disconnect suppress late private result and clear owned waits", () =>
  fixture(async ({ setup, until, expire }) => {
    for (const phase of ["deadline", "disconnect"]) {
      const x = setup(),
        gate = defer();
      x.c.historyResult = () => gate.promise;
      const pending = x.start();
      await until(() => x.c.history === 2);
      if (phase === "deadline") expire(8000);
      else x.owner.abort();
      const r = await pending;
      assert.equal(r.status, phase === "deadline" ? 503 : 499);
      assert.deepEqual(await r.json(), { error: phase === "deadline" ? unavailable : cancelled });
      gate.resolve({ data: [{ source: "SYNTHETIC_PRIVATE" }], error: null });
      await Promise.resolve();
      await Promise.resolve();
      assert.equal(x.listeners.size, 0);
      assert.equal(x.c.writes, 0);
    }
  }));
test("actual cleanup status factory/installed SDK preserve auth headers and fixed owner/read failures", () =>
  fixture(async ({ api }) => {
    const names = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "PLATFORM_OWNER_EMAIL"],
      saved = names.map((n) => process.env[n]),
      savedFetch = globalThis.fetch,
      savedError = console.error;
    let logs = 0;
    try {
      process.env.SUPABASE_URL = "https://synthetic.invalid";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "synthetic-key";
      process.env.PLATFORM_OWNER_EMAIL = "";
      console.error = () => logs++;
      for (const phase of [
        "success",
        "denied",
        "auth-service",
        "owner-service",
        "history-service",
      ]) {
        const calls = [];
        globalThis.fetch = async (input, init) => {
          const url = new URL(input instanceof Request ? input.url : String(input));
          assert.equal(url.origin, "https://synthetic.invalid");
          calls.push(url.pathname);
          const headers = new Headers(init?.headers);
          if (url.pathname === "/auth/v1/user") {
            assert.equal(headers.get("Authorization"), "Bearer synthetic");
            assert.equal(headers.get("apikey"), "synthetic-key");
            assert.equal(init.cache, "no-store");
            assert.ok(init.signal instanceof AbortSignal);
            return phase === "auth-service"
              ? Response.json({ message: "SYNTHETIC_PRIVATE" }, { status: 503 })
              : Response.json({ id: "synthetic", email: "fixture@example.invalid" });
          }
          assert.ok(init.signal instanceof AbortSignal);
          if (url.pathname === "/rest/v1/platform_admin_roles")
            return phase === "owner-service"
              ? Response.json({ message: "SYNTHETIC_PRIVATE" }, { status: 400 })
              : Response.json({ role: phase === "denied" ? "admin" : "owner" });
          assert.equal(url.pathname, "/rest/v1/assessment_cleanup_runs");
          assert.equal(init.method, "GET");
          return phase === "history-service"
            ? Response.json({ message: "SYNTHETIC_PRIVATE" }, { status: 400 })
            : Response.json([]);
        };
        const request = new Request("https://fixture.invalid/api/exam-cleanup?view=status", {
          headers: { Authorization: "Bearer synthetic" },
        });
        const r = await api.handleCleanup(request, {});
        assert.equal(r.status, phase === "success" ? 200 : phase === "denied" ? 403 : 503);
        const body = await r.json();
        if (phase === "success") {
          assert.equal(body.executionEnabled, false);
          assert.equal(body.health, "not_observed");
        } else
          assert.deepEqual(body, {
            error: phase === "denied" ? "Platform owner access required." : unavailable,
          });
        assert.equal(calls.filter((p) => p === "/auth/v1/user").length, 1);
        assert.equal(
          calls.filter((p) => p === "/rest/v1/assessment_cleanup_runs").length,
          ["success", "history-service"].includes(phase) ? 2 : 0,
        );
      }
      assert.equal(logs, 0);
    } finally {
      globalThis.fetch = savedFetch;
      console.error = savedError;
      names.forEach((name, i) => {
        if (saved[i] === undefined) delete process.env[name];
        else process.env[name] = saved[i];
      });
    }
  }));
test("actual cleanup SDK owner/history departure aborts supplied fetch signals and discards ignored responses", () =>
  fixture(async ({ api, until, expire }) => {
    const names = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "PLATFORM_OWNER_EMAIL"],
      saved = names.map((n) => process.env[n]),
      savedFetch = globalThis.fetch;
    let pending, gate;
    try {
      process.env.SUPABASE_URL = "https://synthetic.invalid";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "synthetic-key";
      process.env.PLATFORM_OWNER_EMAIL = "";
      for (const phase of ["owner-deadline", "history-disconnect"]) {
        gate = defer();
        let signal,
          history = 0;
        globalThis.fetch = async (input, init) => {
          const url = new URL(String(input));
          assert.equal(url.origin, "https://synthetic.invalid");
          if (url.pathname === "/auth/v1/user")
            return Response.json({ id: "synthetic", email: "fixture@example.invalid" });
          if (url.pathname === "/rest/v1/platform_admin_roles") {
            if (phase === "owner-deadline") {
              signal = init.signal;
              return gate.promise;
            }
            return Response.json({ role: "owner" });
          }
          assert.equal(url.pathname, "/rest/v1/assessment_cleanup_runs");
          history++;
          signal = init.signal;
          return gate.promise;
        };
        const owner = new AbortController(),
          request = new Request("https://fixture.invalid/api/exam-cleanup?view=status", {
            headers: { Authorization: "Bearer synthetic" },
            signal: owner.signal,
          });
        pending = api.handleCleanup(request, {});
        await until(() => !!signal && (phase === "owner-deadline" || history === 2));
        if (phase === "owner-deadline") expire(8000);
        else owner.abort();
        const r = await pending;
        assert.equal(r.status, phase === "owner-deadline" ? 503 : 499);
        assert.deepEqual(await r.json(), {
          error: phase === "owner-deadline" ? unavailable : cancelled,
        });
        assert.equal(signal.aborted, true);
        gate.resolve(
          phase === "owner-deadline" ? Response.json({ role: "owner" }) : Response.json([]),
        );
        await new Promise((r) => setTimeout(r, 5));
        assert.equal(history, phase === "owner-deadline" ? 0 : 2);
        pending = null;
      }
    } finally {
      gate?.resolve(Response.json([]));
      if (pending) await pending.catch(() => {});
      globalThis.fetch = savedFetch;
      names.forEach((name, i) => {
        if (saved[i] === undefined) delete process.env[name];
        else process.env[name] = saved[i];
      });
    }
  }));
