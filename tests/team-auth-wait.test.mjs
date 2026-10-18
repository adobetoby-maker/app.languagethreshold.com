import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
async function fixture(run) {
  const dir = mkdtempSync(resolve("node_modules/.cache/team-auth-wait-"));
  const savedSet = setTimeout,
    savedClear = clearTimeout;
  try {
    await build({
      stdin: {
        contents: `export * from ${JSON.stringify(resolve("src/lib/team-server.ts"))};export {Route} from '@/routes/api.team-entitlement';export {c} from 'controls';`,
        resolveDir: process.cwd(),
      },
      outfile: join(dir, "case.mjs"),
      bundle: true,
      format: "esm",
      platform: "node",
      packages: "external",
      logLevel: "silent",
      plugins: [
        {
          name: "controlled-auth-transport",
          setup(b) {
            b.onResolve(
              { filter: /^(controls|@\/lib\/team-server|@tanstack\/react-router)$/ },
              () => ({ path: "controls", namespace: "controls" }),
            );
            b.onLoad({ filter: /.*/, namespace: "controls" }, () => ({
              resolveDir: process.cwd(),
              contents: `export * from ${JSON.stringify(resolve("src/lib/team-server.ts"))};export const c={db:null};export const teamAdminClient=()=>c.db;export const createFileRoute=()=>c=>c;`,
            }));
          },
        },
      ],
    });
    const api = await import(join(dir, "case.mjs")),
      timers = new Map();
    assert.equal(api.TEAM_AUTH_WAIT_MS, 15000);
    globalThis.setTimeout = (fn, ms, ...args) => {
      if (ms !== 15000) return savedSet(fn, ms, ...args);
      const token = { unref() {} };
      timers.set(token, fn);
      return token;
    };
    globalThis.clearTimeout = (token) => {
      if (timers.has(token)) timers.delete(token);
      else savedClear(token);
    };
    function request(auth = true) {
      const owner = new AbortController();
      const req = new Request("https://fixture.invalid/api/team-entitlement", {
        headers: auth ? { Authorization: "Bearer synthetic-auth-token" } : {},
        signal: owner.signal,
      });
      const listeners = new Set(),
        add = req.signal.addEventListener.bind(req.signal),
        remove = req.signal.removeEventListener.bind(req.signal);
      req.signal.addEventListener = (kind, fn, options) => {
        if (kind === "abort") listeners.add(fn);
        add(kind, fn, options);
      };
      req.signal.removeEventListener = (kind, fn, options) => {
        if (kind === "abort") listeners.delete(fn);
        remove(kind, fn, options);
      };
      return { owner, req, listeners };
    }
    await run({
      ...api,
      request,
      timers,
      expire() {
        for (const fn of [...timers.values()]) fn();
      },
      async until(check) {
        for (let i = 0; i < 100 && !check(); i++) await new Promise((r) => savedSet(r, 1));
        assert.ok(check());
      },
    });
    assert.equal(timers.size, 0);
  } finally {
    globalThis.setTimeout = savedSet;
    globalThis.clearTimeout = savedClear;
    rmSync(dir, { recursive: true, force: true });
  }
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
}
const user = { id: "synthetic-user", email: "fixture@example.invalid" };
test("actual team auth success preserves SDK token/user and releases timer/listener", () =>
  fixture(async ({ authenticatedTeamUser, request }) => {
    const { req, listeners } = request();
    let calls = 0;
    const result = await authenticatedTeamUser(req, {
      auth: {
        getUser: async (token) => {
          calls++;
          assert.equal(token, "synthetic-auth-token");
          return { data: { user }, error: null };
        },
      },
    });
    assert.equal(result, user);
    assert.equal(calls, 1);
    assert.equal(listeners.size, 0);
  }));
test("missing bearer and already-aborted team auth start no SDK work", () =>
  fixture(async ({ authenticatedTeamUser, request }) => {
    let calls = 0;
    const db = {
      auth: {
        getUser: async () => {
          calls++;
          throw Error("unexpected");
        },
      },
    };
    for (const aborted of [false, true]) {
      const { req, owner, listeners } = request(!aborted ? false : true);
      if (aborted) owner.abort();
      await assert.rejects(
        authenticatedTeamUser(req, db),
        (e) => e.status === (aborted ? 499 : 403),
      );
      assert.equal(listeners.size, 0);
    }
    assert.equal(calls, 0);
  }));
test("team auth deadline discards ignored late SDK success without private continuation", () =>
  fixture(async ({ authenticatedTeamUser, request, expire, until }) => {
    const { req, listeners } = request(),
      sdk = deferred();
    let calls = 0,
      privateCalls = 0;
    const pending = (async () => {
      const value = await authenticatedTeamUser(req, {
        auth: {
          getUser: () => {
            calls++;
            return sdk.promise;
          },
        },
      });
      privateCalls++;
      return value;
    })();
    await until(() => calls === 1);
    expire();
    await assert.rejects(pending, (e) => e.status === 503);
    assert.equal(listeners.size, 0);
    sdk.resolve({ data: { user }, error: null });
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(privateCalls, 0);
    assert.equal(calls, 1);
  }));
test("team auth disconnect discards ignored late SDK failure and clears resources", () =>
  fixture(async ({ authenticatedTeamUser, request, until }) => {
    const { req, owner, listeners } = request(),
      sdk = deferred();
    let calls = 0,
      privateCalls = 0;
    const pending = (async () => {
      const value = await authenticatedTeamUser(req, {
        auth: {
          getUser: () => {
            calls++;
            return sdk.promise;
          },
        },
      });
      privateCalls++;
      return value;
    })();
    await until(() => calls === 1);
    owner.abort();
    await assert.rejects(pending, (e) => e.status === 499);
    assert.equal(listeners.size, 0);
    sdk.reject(Error("PRIVATE late SDK failure"));
    await new Promise((r) => queueMicrotask(r));
    assert.equal(privateCalls, 0);
  }));
test("team auth preserves expired-session denial and fixes SDK rejection diagnostics", () =>
  fixture(async ({ authenticatedTeamUser, request, scopedTeamError }) => {
    for (const [lookup, status] of [
      [async () => ({ data: { user: null }, error: { message: "PRIVATE SDK error" } }), 403],
      [
        async () => {
          throw Error("PRIVATE transport detail");
        },
        503,
      ],
    ]) {
      const { req, listeners } = request();
      let caught;
      try {
        await authenticatedTeamUser(req, { auth: { getUser: lookup } });
      } catch (error) {
        caught = error;
      }
      assert.equal(caught.status, status);
      const response = scopedTeamError(caught);
      assert.equal(response.status, status);
      assert.doesNotMatch(await response.text(), /PRIVATE/);
      assert.equal(listeners.size, 0);
    }
  }));
test("actual entitlement handler stops database reads after auth deadline or disconnect", () =>
  fixture(async ({ Route, c, request, expire, until }) => {
    {
      const { req, owner, listeners } = request();
      let calls = 0,
        reads = 0;
      c.db = {
        auth: {
          getUser: async () => {
            calls++;
            return { data: { user }, error: null };
          },
        },
        from() {
          reads++;
          throw Error("Unexpected private read");
        },
      };
      owner.abort();
      const response = await Route.server.handlers.GET({ request: req });
      assert.equal(calls, 0);
      assert.equal(reads, 0);
      assert.equal(response.status, 499);
      assert.equal(listeners.size, 0);
    }
    for (const reason of ["timeout", "incoming"]) {
      const { req, owner, listeners } = request(),
        sdk = deferred();
      let calls = 0,
        reads = 0;
      c.db = {
        auth: {
          getUser: () => {
            calls++;
            return sdk.promise;
          },
        },
        from() {
          reads++;
          throw Error("Unexpected private read");
        },
      };
      const pending = Route.server.handlers.GET({ request: req });
      await until(() => calls === 1);
      if (reason === "timeout") expire();
      else owner.abort();
      const response = await pending;
      assert.equal(response.status, reason === "timeout" ? 503 : 499);
      assert.match(response.headers.get("cache-control"), /private.*no-store/);
      assert.equal(listeners.size, 0);
      sdk.resolve({ data: { user }, error: null });
      await Promise.resolve();
      await Promise.resolve();
      assert.equal(reads, 0);
    }
  }));
