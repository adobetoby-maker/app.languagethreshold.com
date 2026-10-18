import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
const user = { id: "synthetic-user", email: "fixture@example.invalid" };
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
};
async function fixture(run) {
  const dir = mkdtempSync(resolve("node_modules/.cache/team-auth-fetch-"));
  const saved = {
    fetch: globalThis.fetch,
    error: console.error,
    set: setTimeout,
    clear: clearTimeout,
  };
  const names = ["SUPABASE_URL", "VITE_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
  const env = names.map((n) => process.env[n]);
  const timers = new Map();
  let globalCalls = 0,
    logs = 0;
  try {
    await build({
      entryPoints: [resolve("src/lib/team-server.ts")],
      outfile: join(dir, "helper.mjs"),
      bundle: true,
      format: "esm",
      platform: "node",
      packages: "external",
      logLevel: "silent",
    });
    const api = await import(join(dir, "helper.mjs"));
    process.env.SUPABASE_URL = "https://synthetic.invalid";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "synthetic-project-key";
    globalThis.fetch = async () => {
      globalCalls++;
      throw Error("Unexpected global transport");
    };
    console.error = () => logs++;
    globalThis.setTimeout = (fn, ms, ...args) => {
      if (ms !== 15000) return saved.set(fn, ms, ...args);
      const token = { unref() {} };
      timers.set(token, fn);
      return token;
    };
    globalThis.clearTimeout = (t) => {
      if (timers.has(t)) timers.delete(t);
      else saved.clear(t);
    };
    const until = async (check) => {
      for (let i = 0; i < 100 && !check(); i++) await new Promise((r) => saved.set(r, 1));
      assert.ok(check());
    };
    function client(fetcher, mode = "team") {
      const owner = new AbortController();
      const request = new Request("https://fixture.invalid/api/team", {
        signal: owner.signal,
        headers: { Authorization: "Bearer synthetic-user-token" },
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
      const db = api.teamAdminClient(fetcher, request);
      return {
        owner,
        request,
        db,
        listeners,
        lookup: () =>
          mode === "assessment"
            ? api.authenticatedAssessmentUser(request, db)
            : api.authenticatedTeamUser(request, db),
      };
    }
    await run({
      ...api,
      client,
      until,
      timers,
      expire() {
        for (const fn of [...timers.values()]) fn();
      },
    });
    assert.equal(globalCalls, 0);
    assert.equal(logs, 0);
    assert.equal(timers.size, 0);
  } finally {
    globalThis.fetch = saved.fetch;
    console.error = saved.error;
    globalThis.setTimeout = saved.set;
    globalThis.clearTimeout = saved.clear;
    names.forEach((n, i) => {
      if (env[i] === undefined) delete process.env[n];
      else process.env[n] = env[i];
    });
    rmSync(dir, { recursive: true, force: true });
  }
}
const unavailable = (e) =>
  e.status === 503 && e.message === "Sign-in could not be confirmed. Please try again.";
test("actual installed SDK auth adapter preserves JWT/key/user, no-store and exact 256KiB JSON", () =>
  fixture(async ({ client }) => {
    let calls = 0,
      signal;
    const base = JSON.stringify({ ...user, padding: "" });
    const payload = JSON.stringify({
      ...user,
      padding: "x".repeat(256 * 1024 - Buffer.byteLength(base)),
    });
    assert.equal(Buffer.byteLength(payload), 256 * 1024);
    const c = client(async (input, init) => {
      calls++;
      assert.equal(String(input), "https://synthetic.invalid/auth/v1/user");
      assert.equal(init.method, "GET");
      assert.equal(init.cache, "no-store");
      signal = init.signal;
      assert.ok(signal instanceof AbortSignal);
      const h = new Headers(init.headers);
      assert.equal(h.get("Authorization"), "Bearer synthetic-user-token");
      assert.equal(h.get("apikey"), "synthetic-project-key");
      return new Response(payload);
    });
    const result = await c.lookup();
    assert.equal(result.email, user.email);
    assert.equal(calls, 1);
    assert.equal(c.listeners.size, 0);
    assert.equal(signal.aborted, false);
  }));
test("actual SDK adapter rejects advertised/actual excess, invalid UTF8 and malformed JSON without logger", () =>
  fixture(async ({ client }) => {
    for (const kind of ["advertised", "actual", "utf8", "json"]) {
      let cancel = 0;
      const bytes =
        kind === "actual"
          ? new TextEncoder().encode(JSON.stringify({ ...user, padding: "x".repeat(256 * 1024) }))
          : kind === "utf8"
            ? new Uint8Array([255])
            : new TextEncoder().encode(kind === "advertised" ? JSON.stringify(user) : "{");
      const response = new Response(
        new ReadableStream({
          start(c) {
            c.enqueue(bytes);
            c.close();
          },
          cancel() {
            cancel++;
          },
        }),
        { headers: kind === "advertised" ? { "content-length": String(256 * 1024 + 1) } : {} },
      );
      const c = client(async () => response);
      await assert.rejects(c.lookup(), unavailable);
      assert.equal(c.listeners.size, 0);
      assert.equal(response.body.locked, false);
      if (kind === "advertised") assert.equal(cancel, 1);
    }
  }));
test("actual SDK adapter distinguishes credential denials from service/error failures without logging", () =>
  fixture(async ({ client }) => {
    for (const status of [401, 403, 429, 500, 503]) {
      let cancel = 0;
      const response = new Response(
        new ReadableStream({
          cancel() {
            cancel++;
            return new Promise(() => {});
          },
        }),
        { status },
      );
      const c = client(async () => response);
      await assert.rejects(c.lookup(), (e) =>
        status === 401 || status === 403
          ? e.status === 403 && e.message === "Your session has expired. Sign in again."
          : unavailable(e),
      );
      assert.equal(cancel, 1);
      assert.equal(c.listeners.size, 0);
    }
    const c = client(async () => {
      throw Error("SYNTHETIC_PRIVATE_TRANSPORT");
    });
    await assert.rejects(c.lookup(), unavailable);
    assert.equal(c.listeners.size, 0);
  }));
test("actual SDK auth transport deadline aborts signal and disposes ignored late headers", () =>
  fixture(async ({ client, until, expire }) => {
    const gate = deferred();
    let signal,
      cancel = 0;
    const c = client(async (_, init) => {
      signal = init.signal;
      return gate.promise;
    });
    const pending = c.lookup();
    await until(() => !!signal);
    expire();
    await assert.rejects(pending, unavailable);
    assert.equal(signal.aborted, true);
    const response = new Response(
      new ReadableStream({
        cancel() {
          cancel++;
          return new Promise(() => {});
        },
      }),
    );
    gate.resolve(response);
    await until(() => cancel === 1);
    await until(() => c.listeners.size === 0);
    assert.equal(response.body.locked, false);
  }));
test("actual SDK auth request abort stops body wait and unlocks reader despite nonsettling cancel", () =>
  fixture(async ({ client, until }) => {
    let signal,
      cancel = 0;
    const response = new Response(
      new ReadableStream({
        start(c) {
          c.enqueue(new TextEncoder().encode("{"));
        },
        cancel() {
          cancel++;
          return new Promise(() => {});
        },
      }),
    );
    const c = client(async (_, init) => {
      signal = init.signal;
      return response;
    });
    const pending = c.lookup();
    await until(() => response.body.locked);
    c.owner.abort();
    await assert.rejects(pending, (e) => e.status === 499);
    await until(() => c.listeners.size === 0);
    assert.equal(signal.aborted, true);
    assert.equal(cancel, 1);
    assert.equal(response.body.locked, false);
  }));
test("actual SDK auth preabort prevents dispatch and deadline stops body stalled after headers", () =>
  fixture(async ({ client, until, expire }) => {
    let calls = 0;
    const pre = client(async () => {
      calls++;
      return Response.json(user);
    });
    pre.owner.abort();
    await assert.rejects(pre.lookup(), (e) => e.status === 499);
    assert.equal(calls, 0);
    assert.equal(pre.listeners.size, 0);
    let cancel = 0,
      signal;
    const response = new Response(
      new ReadableStream({
        cancel() {
          cancel++;
          return new Promise(() => {});
        },
      }),
    );
    const c = client(async (_, init) => {
      signal = init.signal;
      return response;
    });
    const pending = c.lookup();
    await until(() => response.body.locked);
    expire();
    await assert.rejects(pending, unavailable);
    await until(() => c.listeners.size === 0);
    assert.equal(cancel, 1);
    assert.equal(signal.aborted, true);
    assert.equal(response.body.locked, false);
  }));
test("actual SDK business POST retains method/body/headers and does not inherit auth cancellation", () =>
  fixture(async ({ client }) => {
    let calls = 0;
    const c = client(async (input, init) => {
      calls++;
      assert.equal(String(input), "https://synthetic.invalid/rest/v1/platform_audit_events");
      assert.equal(init.method, "POST");
      assert.equal(init.signal, undefined);
      assert.equal(init.cache, undefined);
      assert.deepEqual(JSON.parse(init.body), { action: "synthetic-only" });
      assert.equal(new Headers(init.headers).get("apikey"), "synthetic-project-key");
      return new Response(null, { status: 201 });
    });
    c.owner.abort();
    const result = await c.db.from("platform_audit_events").insert({ action: "synthetic-only" });
    assert.equal(result.error, null);
    assert.equal(calls, 1);
    assert.equal(c.listeners.size, 0);
  }));
test("auth fetch exact URL/method selection passes unrelated requests through by identity", () =>
  fixture(async () => {
    const dir = mkdtempSync(resolve("node_modules/.cache/team-auth-selection-"));
    try {
      await build({
        entryPoints: [resolve("src/lib/team-auth-fetch.ts")],
        outfile: join(dir, "adapter.mjs"),
        bundle: true,
        format: "esm",
        platform: "node",
        logLevel: "silent",
      });
      const { teamAuthFetch } = await import(join(dir, "adapter.mjs"));
      const owner = new AbortController();
      owner.abort();
      for (const [url, method] of [
        ["https://other.invalid/auth/v1/user", "GET"],
        ["https://synthetic.invalid/auth/v1/user?other=1", "GET"],
        ["https://synthetic.invalid/auth/v1/user", "POST"],
        ["https://synthetic.invalid/auth/v1/token", "POST"],
      ]) {
        const input = new Request(url, { method }),
          init = { headers: { "x-synthetic": "test" } };
        const response = new Response("passed");
        let calls = 0;
        const adapter = teamAuthFetch("https://synthetic.invalid", owner.signal, async (a, b) => {
          calls++;
          assert.equal(a, input);
          assert.equal(b, init);
          return response;
        });
        assert.equal(await adapter(input, init), response);
        assert.equal(calls, 1);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }));
test("actual installed SDK assessment auth preserves success/denials and owns cancellation guidance", () =>
  fixture(async ({ client, until }) => {
    const success = client(async () => Response.json(user), "assessment");
    assert.equal((await success.lookup()).email, user.email);
    assert.equal(success.listeners.size, 0);
    for (const status of [401, 503]) {
      const c = client(async () => new Response(null, { status }), "assessment");
      await assert.rejects(c.lookup(), (e) => e.status === (status === 401 ? 403 : 503));
      assert.equal(c.listeners.size, 0);
    }
    let signal;
    const c = client(async (_, init) => {
      signal = init.signal;
      return new Promise(() => {});
    }, "assessment");
    const pending = c.lookup();
    await until(() => !!signal);
    c.owner.abort();
    await assert.rejects(
      pending,
      (e) => e.status === 499 && e.message === "Assessment request cancelled.",
    );
    await until(() => c.listeners.size === 0);
    assert.equal(signal.aborted, true);
    let calls = 0;
    const pre = client(async () => {
      calls++;
      return Response.json(user);
    }, "assessment");
    pre.owner.abort();
    await assert.rejects(
      pre.lookup(),
      (e) => e.status === 499 && e.message === "Assessment request cancelled.",
    );
    assert.equal(calls, 0);
    assert.equal(pre.listeners.size, 0);
  }));
