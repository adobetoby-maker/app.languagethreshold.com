import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
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
  const dir = mkdtempSync(resolve("node_modules/.cache/reviewer-admin-read-"));
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
        contents: `export {Route} from '@/routes/api.exam-reviewers';export {readReviewerAdministration,reviewerAdminReadFetch,REVIEWER_ADMIN_LISTS} from '@/lib/assessments/reviewer-admin-read';`,
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
const target = "33333333-3333-4333-8333-333333333333",
  eventId = "44444444-4444-4444-8444-444444444444";
const grant = {
  user_id: target,
  module_id: "roofing",
  target_language: "Spanish",
  instruction_language: "English",
  active: true,
  revision: 1,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};
const content = { ...grant, kind: "domain" };
const event = {
  id: eventId,
  actor_id: actor,
  target_id: target,
  module_id: "roofing",
  target_language: "Spanish",
  instruction_language: "English",
  kind: "response",
  active: true,
  revision: 1,
  reason: "Synthetic reviewer qualification reason",
  created_at: "2026-01-01T00:00:00Z",
};
const rows = {
  assessment_reviewers: grant,
  assessment_content_reviewers: content,
  assessment_reviewer_admin_events: event,
};
const unavailable = (e) =>
  e.status === 503 && e.message === "Reviewer administration could not be loaded.";
function req(owner = new AbortController()) {
  return new Request("https://app.invalid/api/exam-reviewers?module=roofing", {
    signal: owner.signal,
  });
}
function transport(a, handler) {
  return async (input, init) => {
    const u = new URL(String(input)),
      table = u.pathname.split("/").at(-1);
    assert.equal(u.origin, "https://fixture.invalid");
    assert.ok(table in a.REVIEWER_ADMIN_LISTS);
    return handler(table, u, init);
  };
}
const tick = (a) => new Promise((r) => a.old.set(r, 0));
test("parallel reviewer lists retain exact module/account/projection/order/limits and output semantics", () =>
  fixture(async (a) => {
    for (const filter of [null, target]) {
      const events = [];
      const result = await a.readReviewerAdministration(
        req(),
        "roofing",
        filter,
        transport(a, async (table, u, init) => {
          const spec = a.REVIEWER_ADMIN_LISTS[table];
          events.push(table);
          assert.equal(u.searchParams.get("module_id"), "eq.roofing");
          assert.equal(u.searchParams.get("select"), spec.projection);
          assert.equal(u.searchParams.get("limit"), String(spec.limit));
          assert.equal(u.searchParams.get("order"), spec.order);
          assert.equal(u.searchParams.get(spec.filter), filter ? "eq." + filter : null);
          assert.ok(init.signal);
          assert.equal(init.cache, "no-store");
          assert.equal(init.redirect, "error");
          return Response.json([rows[table]]);
        }),
      );
      assert.equal(events.length, 3);
      assert.deepEqual(result, {
        grants: [{ ...grant, kind: "response" }, content],
        events: [event],
        limited: false,
        eventLimit: 50,
      });
    }
    const maximum = await a.readReviewerAdministration(
      req(),
      "roofing",
      null,
      transport(a, async (table) =>
        Response.json(
          Array.from({ length: a.REVIEWER_ADMIN_LISTS[table].limit }, (_, i) => ({
            ...rows[table],
            ...(table === "assessment_reviewer_admin_events"
              ? {}
              : { user_id: `${i.toString(16).padStart(8, "0")}-2222-4222-8222-222222222222` }),
          })),
        ),
      ),
    );
    assert.equal(maximum.grants.length, 800);
    assert.equal(maximum.events.length, 50);
    assert.equal(maximum.limited, true);
  }));
test("reviewer list failures have one dispatch per list and fixed service guidance", () =>
  fixture(async (a) => {
    for (const status of [301, 401, 403, 429, 500, 503]) {
      const counts = {},
        cancelled = [];
      await assert.rejects(
        a.readReviewerAdministration(
          req(),
          "roofing",
          null,
          transport(a, async (table) => {
            counts[table] = (counts[table] ?? 0) + 1;
            return new Response(
              new ReadableStream({
                cancel() {
                  cancelled.push(table);
                },
              }),
              { status, headers: { "Retry-After": "0" } },
            );
          }),
        ),
        unavailable,
      );
      assert.deepEqual(Object.values(counts), [1, 1, 1]);
      assert.equal(cancelled.length, 3);
    }
    await assert.rejects(
      a.readReviewerAdministration(
        req(),
        "roofing",
        null,
        transport(a, async () => {
          throw Error("PRIVATE");
        }),
      ),
      unavailable,
    );
  }));
test("reviewer list response schemas reject extra fields, wrong module/account, cardinality and malformed UTF8/JSON", () =>
  fixture(async (a) => {
    for (const table of Object.keys(rows)) {
      const spec = a.REVIEWER_ADMIN_LISTS[table];
      for (const data of [
        null,
        rows[table],
        [{ ...rows[table], private: "synthetic" }],
        [{ ...rows[table], module_id: "other" }],
        [{ ...rows[table], [spec.filter]: actor }],
        Array.from({ length: spec.limit + 1 }, () => rows[table]),
      ]) {
        await assert.rejects(
          a.readReviewerAdministration(
            req(),
            "roofing",
            target,
            transport(a, async (t) => Response.json(t === table ? data : [rows[t]])),
          ),
          unavailable,
        );
      }
      for (const bad of [
        "{",
        new Uint8Array([0xff]),
        JSON.stringify([rows[table]]) + " ".repeat(spec.bytes),
      ]) {
        await assert.rejects(
          a.readReviewerAdministration(
            req(),
            "roofing",
            null,
            transport(a, async (t) => (t === table ? new Response(bad) : Response.json([rows[t]]))),
          ),
          unavailable,
        );
      }
    }
  }));
test("reviewer phase abort/deadline settles ignored headers and disposes all late bodies", () =>
  fixture(async (a) => {
    for (const mode of ["abort", "deadline"]) {
      const owner = new AbortController(),
        releases = [];
      let began,
        cancels = 0;
      const started = new Promise((r) => (began = r));
      const pending = assert.rejects(
        a.readReviewerAdministration(
          req(owner),
          "roofing",
          null,
          transport(
            a,
            () =>
              new Promise((r) => {
                releases.push(r);
                if (releases.length === 3) began();
              }),
          ),
        ),
        (e) => (mode === "abort" ? e.status === 499 : unavailable(e)),
      );
      await started;
      assert.equal(a.timers.size, 1);
      if (mode === "abort") owner.abort();
      else [...a.timers.values()][0]();
      await pending;
      for (const release of releases)
        release(
          new Response(
            new ReadableStream({
              cancel() {
                cancels++;
              },
            }),
          ),
        );
      await tick(a);
      assert.equal(cancels, 3);
    }
    const owner = new AbortController();
    owner.abort();
    let calls = 0;
    await assert.rejects(
      a.readReviewerAdministration(req(owner), "roofing", null, async () => {
        calls++;
        return Response.json([]);
      }),
      (e) => e.status === 499,
    );
    assert.equal(calls, 0);
  }));
test("shared list deadline covers all response bodies and removes request listeners without waiting on cancellation", () =>
  fixture(async (a) => {
    let began,
      cancelled = 0;
    const started = new Promise((r) => (began = r)),
      request = req();
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
    const pending = assert.rejects(
      a.readReviewerAdministration(
        request,
        "roofing",
        null,
        transport(a, async (table) =>
          table === "assessment_reviewer_admin_events"
            ? new Response(
                new ReadableStream({
                  pull() {
                    began();
                  },
                  cancel() {
                    cancelled++;
                    return new Promise(() => {});
                  },
                }),
              )
            : Response.json([rows[table]]),
        ),
      ),
      unavailable,
    );
    await started;
    assert.equal(a.timers.size, 1);
    [...a.timers.values()][0]();
    await pending;
    assert.equal(cancelled, 1);
    assert.equal(listeners.size, 0);
  }));
test("actual registered-owner GET returns499 after list departure, while its prior budget call remains separate", () =>
  fixture(async (a) => {
    const owner = new AbortController(),
      events = [],
      releases = [];
    let began;
    const started = new Promise((r) => (began = r));
    globalThis.fetch = async (input, init) => {
      const path = new URL(String(input)).pathname;
      events.push({ path, afterAbort: owner.signal.aborted });
      if (path === "/auth/v1/user") return Response.json(user);
      if (path === "/rest/v1/platform_admin_roles") return Response.json([{ role: "owner" }]);
      if (path === "/rest/v1/rpc/consume_speaking_request") return Response.json(true);
      assert.ok(Object.keys(rows).some((t) => path.endsWith("/" + t)));
      assert.ok(init.signal);
      return new Promise((r) => {
        releases.push(r);
        if (releases.length === 3) began();
      });
    };
    const pending = a.Route.server.handlers.GET({
      request: new Request("https://app.invalid/api/exam-reviewers?module=roofing&user=" + target, {
        headers: { Authorization: "Bearer synthetic" },
        signal: owner.signal,
      }),
    });
    await started;
    owner.abort();
    const response = await pending;
    assert.equal(response.status, 499);
    assert.deepEqual(await response.json(), { error: "Assessment request cancelled." });
    assert.equal(events.filter((e) => e.path.endsWith("consume_speaking_request")).length, 1);
    assert.equal(
      events.some((e) => e.afterAbort),
      false,
    );
    for (const release of releases) release(Response.json([]));
    await tick(a);
  }));
test("reviewer list adapter passes unrelated projects, filters, projections, row limits and mutations through unchanged", () =>
  fixture(async (a) => {
    const owner = new AbortController();
    owner.abort();
    const spec = a.REVIEWER_ADMIN_LISTS.assessment_reviewers;
    for (const change of [
      { select: "*" },
      { limit: "200" },
      { order: "user_id.desc" },
      { extra: "eq.private" },
      { active: "eq.true" },
      { method: "PATCH" },
      { host: "other.invalid" },
    ]) {
      const u = new URL(
        "https://" + (change.host ?? "fixture.invalid") + "/rest/v1/assessment_reviewers",
      );
      for (const [k, v] of Object.entries({
        select: spec.projection,
        module_id: "eq.roofing",
        order: spec.order,
        limit: String(spec.limit),
        ...change,
      }))
        if (k !== "host" && k !== "method") u.searchParams.set(k, v);
      const init = { method: change.method ?? "GET" };
      let calls = 0;
      await a.reviewerAdminReadFetch("https://fixture.invalid", owner.signal, async (i, j) => {
        calls++;
        assert.equal(i, u.href);
        assert.equal(j, init);
        return Response.json([]);
      })(u.href, init);
      assert.equal(calls, 1);
    }
  }));
test("independent list phases keep request cancellation separate and bounded Unicode history remains readable", () =>
  fixture(async (a) => {
    const first = new AbortController(),
      releases = [];
    let began;
    const started = new Promise((r) => (began = r));
    const pa = assert.rejects(
      a.readReviewerAdministration(
        req(first),
        "roofing",
        null,
        transport(
          a,
          () =>
            new Promise((r) => {
              releases.push(r);
              if (releases.length === 3) began();
            }),
        ),
      ),
      (e) => e.status === 499,
    );
    await started;
    const other = a.readReviewerAdministration(
      req(),
      "roofing",
      target,
      transport(a, async (table) =>
        Response.json([
          {
            ...rows[table],
            ...(table === "assessment_reviewer_admin_events"
              ? { reason: "𐐀".repeat(2000), kind: "legacy-kind" }
              : {}),
          },
        ]),
      ),
    );
    first.abort();
    await pa;
    const history = await other;
    assert.equal(history.events[0].reason.length, 4000);
    assert.equal(history.events[0].kind, "legacy-kind");
    for (const release of releases) release(Response.json([]));
    await tick(a);
  }));
