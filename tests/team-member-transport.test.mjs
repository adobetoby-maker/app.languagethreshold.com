import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { build } from "esbuild";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
const org = "11111111-1111-4111-8111-111111111111",
  actor = "22222222-2222-4222-8222-222222222222";
const row = { role: "admin", status: "active", display_name: "Synthetic member" };
async function fixture(run) {
  mkdirSync(resolve("node_modules/.cache"), { recursive: true });
  const dir = mkdtempSync(resolve("node_modules/.cache/team-member-"));
  const old = {
    fetch: globalThis.fetch,
    set: setTimeout,
    clear: clearTimeout,
    env: [process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY],
  };
  const timers = new Map(),
    resources = [];
  try {
    await build({
      stdin: {
        contents: `export {Route} from '@/routes/api.team'; export {teamAdminClient,memberRole,requireTeamAdmin} from '@/lib/team-server';export {teamMemberFetch} from '@/lib/team-member-fetch';`,
        resolveDir: process.cwd(),
      },
      outfile: join(dir, "api.mjs"),
      bundle: true,
      format: "esm",
      platform: "node",
      packages: "external",
      logLevel: "silent",
      plugins: [
        ...(process.env.LT_TEAM_MEMBER_BASELINE
          ? [
              {
                name: "baseline-helper",
                setup(b) {
                  b.onLoad({ filter: /\/src\/lib\/team-server\.ts$/ }, (args) => ({
                    contents: execFileSync(
                      "git",
                      ["show", `${process.env.LT_TEAM_MEMBER_BASELINE}:src/lib/team-server.ts`],
                      { encoding: "utf8" },
                    ),
                    loader: "ts",
                    resolveDir: resolve("src/lib"),
                  }));
                },
              },
            ]
          : []),
        {
          name: "shell",
          setup(b) {
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
    for (const [i, k] of ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"].entries()) {
      if (old.env[i] === undefined) delete process.env[k];
      else process.env[k] = old.env[i];
    }
    rmSync(dir, { recursive: true, force: true });
  }
}
const unavailable = (e) =>
  e.status === 503 && e.message === "Company access could not be confirmed. Please try again.";
test("exact membership read keeps actor filters, bounded signal/no-store and valid role semantics", () =>
  fixture(async (a) => {
    let calls = 0;
    const c = a.client(async (input, init) => {
      calls++;
      const u = new URL(String(input));
      assert.equal(u.searchParams.get("organization_id"), "eq." + org);
      assert.equal(u.searchParams.get("user_id"), "eq." + actor);
      assert.ok(init.signal);
      assert.equal(init.cache, "no-store");
      assert.equal(init.redirect, "error");
      return Response.json([row]);
    });
    assert.deepEqual(await a.requireTeamAdmin(c.db, org, actor), row);
    assert.equal(calls, 1);
    for (const value of [[], null, [{ ...row, status: "inactive" }]]) {
      const x = a.client(async () => Response.json(value));
      assert.equal(await a.memberRole(x.db, org, actor), null);
    }
    const learner = a.client(async () => Response.json([{ ...row, role: "learner" }]));
    await assert.rejects(a.requireTeamAdmin(learner.db, org, actor), (e) => e.status === 403);
  }));
test("membership 503/redirect/private failures dispatch once and expose fixed guidance", () =>
  fixture(async (a) => {
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
      await assert.rejects(a.memberRole(c.db, org, actor), unavailable);
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
      await assert.rejects(a.memberRole(c.db, org, actor), unavailable);
    }
  }));
test("membership rejects oversized, invalid UTF8/JSON and unexpected/cardinality/role shapes", () =>
  fixture(async (a) => {
    for (const value of [
      [{ ...row, display_name: "x".repeat(32768) }],
      [{ ...row, secret: "PRIVATE" }],
      [row, row],
      [{ ...row, role: "superuser" }],
      [{ ...row, status: "unknown" }],
      [{ ...row, display_name: null }],
    ]) {
      const c = a.client(async () => Response.json(value));
      await assert.rejects(a.memberRole(c.db, org, actor), unavailable);
    }
    for (const body of ["{", new Uint8Array([0xc3, 0x28])]) {
      const c = a.client(async () => new Response(body));
      await assert.rejects(a.memberRole(c.db, org, actor), unavailable);
    }
  }));
test("abort and deadline settle ignored transport; late bodies are disposed and no permission returns", () =>
  fixture(async (a) => {
    for (const mode of ["abort", "deadline"]) {
      let release,
        start,
        disposed = 0;
      const began = new Promise((r) => (start = r));
      const c = a.client(
        () =>
          new Promise((r) => {
            release = r;
            start();
          }),
      );
      const pending = a.requireTeamAdmin(c.db, org, actor);
      const checked = assert.rejects(pending, (e) =>
        mode === "abort" ? e.status === 499 : unavailable(e),
      );
      await began;
      if (mode === "abort") c.owner.abort();
      else {
        assert.equal(a.timers.size, 1);
        [...a.timers.values()][0]();
      }
      await checked;
      release(
        new Response(
          new ReadableStream({
            cancel() {
              disposed++;
            },
          }),
        ),
      );
      await new Promise((r) => a.old.set(r, 0));
      assert.equal(disposed, 1);
    }
    let calls = 0;
    const pre = a.client(async () => {
      calls++;
      return Response.json([row]);
    });
    pre.owner.abort();
    await assert.rejects(a.requireTeamAdmin(pre.db, org, actor), (e) => e.status === 499);
    assert.equal(calls, 0);
  }));
test("deadline covers stalled body and cancels reader without waiting for cancel completion", () =>
  fixture(async (a) => {
    let bodyStarted,
      cancelled = 0;
    const started = new Promise((r) => (bodyStarted = r));
    const c = a.client(
      async () =>
        new Response(
          new ReadableStream({
            pull() {
              bodyStarted();
            },
            cancel() {
              cancelled++;
              return new Promise(() => {});
            },
          }),
        ),
    );
    const pending = assert.rejects(a.memberRole(c.db, org, actor), unavailable);
    await started;
    [...a.timers.values()][0]();
    await pending;
    assert.equal(cancelled, 1);
  }));
test("actual onboarding abort during membership prevents all subsequent reads/writes", () =>
  fixture(async (a) => {
    let release, start;
    const began = new Promise((r) => (start = r));
    const owner = new AbortController(),
      events = [];
    globalThis.fetch = async (input, init) => {
      const p = new URL(String(input)).pathname;
      events.push(p);
      if (p === "/auth/v1/user")
        return Response.json({ id: actor, email: "fixture@example.invalid" });
      if (p === "/rest/v1/team_members") {
        start();
        return new Promise((r) => (release = r));
      }
      throw Error("Unexpected work after permission");
    };
    const request = new Request("https://app.invalid/api/team", {
      method: "POST",
      headers: { Origin: "https://app.invalid", Authorization: "Bearer synthetic-user" },
      signal: owner.signal,
      body: JSON.stringify({ action: "onboarding", orgId: org, step: 2 }),
    });
    const operation = a.Route.server.handlers.POST({ request });
    await began;
    owner.abort();
    await new Promise((r) => a.old.set(r, 0));
    release(Response.json([row]));
    const response = await operation;
    assert.equal(response.status, 499);
    await new Promise((r) => a.old.set(r, 0));
    assert.deepEqual(events, ["/auth/v1/user", "/rest/v1/team_members"]);
  }));
test("adapter forwards unrelated queries, methods and projects unchanged even after departure", () =>
  fixture(async (a) => {
    const owner = new AbortController();
    owner.abort();
    for (const url of [
      "https://other.invalid/rest/v1/team_members?select=role,status,display_name&organization_id=eq.x&user_id=eq.y",
      "https://fixture.invalid/rest/v1/team_members?select=role,status",
      "https://fixture.invalid/rest/v1/team_members?select=role,status,display_name&organization_id=eq.x&user_id=eq.y&limit=1",
    ]) {
      const init = { method: "GET" };
      const fetcher = a.teamMemberFetch("https://fixture.invalid", owner.signal, async (i, j) => {
        assert.equal(i, url);
        assert.equal(j, init);
        return Response.json([]);
      });
      await fetcher(url, init);
    }
    const url =
        "https://fixture.invalid/rest/v1/team_members?select=role,status,display_name&organization_id=eq.x&user_id=eq.y",
      init = { method: "PATCH", body: "{}" };
    await a.teamMemberFetch("https://fixture.invalid", owner.signal, async (i, j) => {
      assert.equal(i, url);
      assert.equal(j, init);
      return Response.json([]);
    })(url, init);
  }));
test("two request clients keep independent membership cancellation and response scopes", () =>
  fixture(async (a) => {
    let releaseA, releaseB, startedA, startedB;
    const first = new Promise((r) => (startedA = r)),
      second = new Promise((r) => (startedB = r));
    const ca = a.client(
      () =>
        new Promise((r) => {
          releaseA = r;
          startedA();
        }),
    );
    const cb = a.client(
      () =>
        new Promise((r) => {
          releaseB = r;
          startedB();
        }),
    );
    const pa = assert.rejects(a.requireTeamAdmin(ca.db, org, actor), (e) => e.status === 499);
    const pb = a.requireTeamAdmin(cb.db, org, "other-synthetic-actor");
    await Promise.all([first, second]);
    ca.owner.abort();
    await pa;
    releaseB(Response.json([{ ...row, display_name: "Second request" }]));
    assert.equal((await pb).display_name, "Second request");
    releaseA(Response.json([row]));
    await new Promise((r) => a.old.set(r, 0));
  }));
