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
  const dir = mkdtempSync(resolve("node_modules/.cache/reviewer-budget-"));
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
        contents: `export {Route} from '@/routes/api.exam-reviewers';export {assessmentBudget} from '@/lib/assessments/budget';`,
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
const target = "33333333-3333-4333-8333-333333333333";
const valid = {
  userId: target,
  moduleId: "roofing",
  target: "Spanish",
  native: "English",
  kind: "response",
  active: true,
  expectedRevision: 0,
  reason: "Synthetic handoff fixture only",
  requestId: "44444444-4444-4444-8444-444444444444",
  confirmScope: true,
};
const unavailable = (e) =>
  e.status === 503 && e.message === "Assessment request controls are unavailable.";
function request(owner = new AbortController(), method = "GET") {
  return new Request("https://app.invalid/api/exam-reviewers?module=roofing", {
    method,
    headers: {
      Origin: "https://app.invalid",
      Authorization: "Bearer synthetic",
      "Content-Type": "application/json",
    },
    signal: owner.signal,
    ...(method === "POST" ? { body: JSON.stringify(valid) } : {}),
  });
}
const tick = (a) => new Promise((r) => a.old.set(r, 0));
function quotaOnly(handler) {
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "https://fixture.invalid/rest/v1/rpc/consume_speaking_request");
    return handler(input, init);
  };
}
function routeTransport(
  events,
  quota,
  mutation = async () => Response.json({ syntheticAcknowledgement: true }),
) {
  globalThis.fetch = async (input, init) => {
    const path = new URL(String(input)).pathname;
    events.push(path);
    if (path === "/auth/v1/user") return Response.json(user);
    if (path === "/rest/v1/platform_admin_roles") return Response.json([{ role: "owner" }]);
    if (path === "/rest/v1/rpc/consume_speaking_request") return quota(input, init);
    if (path === "/rest/v1/rpc/assessment_manage_reviewer") return mutation(input, init);
    assert.ok(
      [
        "assessment_reviewers",
        "assessment_content_reviewers",
        "assessment_reviewer_admin_events",
      ].some((t) => path.endsWith("/" + t)),
    );
    return Response.json([]);
  };
}
test("request-bound assessment budgets preserve hashed quota namespaces, limits, window, one dispatch and legacy success/denial", () =>
  fixture(async (a) => {
    const hashes = new Set();
    for (const [action, limit] of [
      ["reviewer_admin_read", 30],
      ["reviewer_admin_write", 30],
      ["save", 90],
      ["history_export", 2],
      ["speech_upload", 3],
      ["start", 6],
    ]) {
      let calls = 0;
      quotaOnly(async (_, init) => {
        calls++;
        assert.equal(init.method, "POST");
        assert.equal(init.cache, "no-store");
        assert.ok(init.signal);
        assert.equal(init.signal.aborted, false);
        const body = JSON.parse(init.body);
        assert.match(body.p_bucket_hash, /^[0-9a-f]{64}$/);
        assert.equal(body.p_request_limit, limit);
        assert.equal(body.p_window_seconds, 60);
        hashes.add(body.p_bucket_hash);
        return Response.json(true);
      });
      await a.assessmentBudget(actor, action, request());
      assert.equal(calls, 1);
    }
    assert.equal(hashes.size, 6);
    quotaOnly(async () => Response.json(true));
    await a.assessmentBudget(actor, "reviewer_admin_write");
    quotaOnly(async () => Response.json(false));
    await assert.rejects(
      a.assessmentBudget(actor, "reviewer_admin_write"),
      (e) => e.status === 429 && e.message === "Please wait a minute before trying again.",
    );
  }));
test("adopted budget failures/JSON/UTF8/byte overflow are fixed503 with one quota call; nontrue JSON retains429", () =>
  fixture(async (a) => {
    for (const response of [
      () => Response.json({ message: "PRIVATE" }, { status: 503 }),
      () => new Response("{"),
      () => new Response(new Uint8Array([0xff])),
      () => new Response("true" + " ".repeat(1024)),
      () => new Response("true", { headers: { "Content-Length": "1025" } }),
    ]) {
      let calls = 0;
      quotaOnly(async () => {
        calls++;
        return response();
      });
      await assert.rejects(
        a.assessmentBudget(actor, "reviewer_admin_write", request()),
        unavailable,
      );
      assert.equal(calls, 1);
    }
    for (const data of [false, {}, "true", null]) {
      quotaOnly(async () => Response.json(data));
      await assert.rejects(
        a.assessmentBudget(actor, "reviewer_admin_write", request()),
        (e) => e.status === 429,
      );
    }
  }));
test("quota header deadline/disconnect settle even ignored abort and dispose late body without replay", () =>
  fixture(async (a) => {
    for (const mode of ["abort", "deadline"]) {
      let began,
        release,
        signal,
        cancelled = 0,
        calls = 0;
      const started = new Promise((r) => (began = r)),
        owner = new AbortController();
      quotaOnly((_, init) => {
        calls++;
        signal = init.signal;
        began();
        return new Promise((r) => (release = r));
      });
      const pending = assert.rejects(
        a.assessmentBudget(actor, "reviewer_admin_write", request(owner)),
        (e) => (mode === "abort" ? e.status === 499 : unavailable(e)),
      );
      await started;
      assert.equal(a.timers.size, 1);
      if (mode === "abort") owner.abort();
      else [...a.timers.values()][0]();
      await pending;
      assert.equal(signal.aborted, true);
      release(
        new Response(
          new ReadableStream({
            cancel() {
              cancelled++;
              return new Promise(() => {});
            },
          }),
        ),
      );
      await tick(a);
      assert.equal(cancelled, 1);
      assert.equal(calls, 1);
    }
  }));
test("quota body phase deadline cancels stalled reader without waiting and cleans request listeners", () =>
  fixture(async (a) => {
    let began,
      cancelled = 0;
    const started = new Promise((r) => (began = r)),
      r = request();
    const listeners = new Set(),
      add = r.signal.addEventListener.bind(r.signal),
      remove = r.signal.removeEventListener.bind(r.signal);
    r.signal.addEventListener = (k, f, o) => {
      if (k === "abort") listeners.add(f);
      add(k, f, o);
    };
    r.signal.removeEventListener = (k, f, o) => {
      if (k === "abort") listeners.delete(f);
      remove(k, f, o);
    };
    quotaOnly(
      async () =>
        new Response(
          new ReadableStream({
            pull() {
              began();
            },
            cancel() {
              cancelled++;
              return new Promise(() => {});
            },
          }),
        ),
    );
    const pending = assert.rejects(
      a.assessmentBudget(actor, "reviewer_admin_write", r),
      unavailable,
    );
    await started;
    [...a.timers.values()][0]();
    await pending;
    assert.equal(cancelled, 1);
    assert.equal(listeners.size, 0);
  }));
test("preaborted and independent request budget waits cannot share cancellation or dispatch after departure", () =>
  fixture(async (a) => {
    let calls = 0;
    quotaOnly(async () => {
      calls++;
      return Response.json(true);
    });
    const owner = new AbortController();
    owner.abort();
    await assert.rejects(
      a.assessmentBudget(actor, "reviewer_admin_write", request(owner)),
      (e) => e.status === 499,
    );
    assert.equal(calls, 0);
    const handoff = new AbortController();
    quotaOnly(async (_, init) => {
      init.signal.addEventListener("abort", () => handoff.abort(), { once: true });
      return Response.json(true);
    });
    await assert.rejects(
      a.assessmentBudget(actor, "reviewer_admin_write", request(handoff)),
      (e) => e.status === 499,
    );

    const ca = new AbortController(),
      cb = new AbortController(),
      releases = [];
    let began;
    const started = new Promise((r) => (began = r));
    quotaOnly(
      (_, init) =>
        new Promise((r) => {
          releases.push({ release: r, signal: init.signal });
          if (releases.length === 2) began();
        }),
    );
    const pa = assert.rejects(
        a.assessmentBudget(actor, "reviewer_admin_read", request(ca)),
        (e) => e.status === 499,
      ),
      pb = a.assessmentBudget(target, "reviewer_admin_read", request(cb));
    await started;
    ca.abort();
    await pa;
    const stopped = releases.filter((item) => item.signal.aborted),
      live = releases.filter((item) => !item.signal.aborted);
    assert.equal(stopped.length, 1);
    assert.equal(live.length, 1);
    live[0].release(Response.json(true));
    await pb;
    stopped[0].release(Response.json(true));
    await tick(a);
  }));
test("actual reviewer GET/POST stop before lists/update when the pending quota loses its request", () =>
  fixture(async (a) => {
    for (const method of ["GET", "POST"]) {
      const owner = new AbortController(),
        events = [];
      let began, release, quotaSignal;
      const started = new Promise((r) => (began = r));
      routeTransport(events, (_, init) => {
        quotaSignal = init.signal;
        began();
        return new Promise((r) => (release = r));
      });
      const pending = a.Route.server.handlers[method]({ request: request(owner, method) });
      await started;
      owner.abort();
      const response = await pending;
      assert.equal(response.status, 499);
      assert.deepEqual(await response.json(), { error: "Assessment request cancelled." });
      assert.equal(quotaSignal.aborted, true);
      release(Response.json(true));
      await tick(a);
      assert.deepEqual(events, [
        "/auth/v1/user",
        "/rest/v1/platform_admin_roles",
        "/rest/v1/platform_admin_roles",
        "/rest/v1/rpc/consume_speaking_request",
      ]);
    }
  }));
test("actual reviewer quota denial/service failure prevents permission mutation and normal permit retains exact RPC input", () =>
  fixture(async (a) => {
    for (const [body, status] of [
      [false, 429],
      [true, 200],
    ]) {
      const events = [],
        mutations = [];
      routeTransport(
        events,
        async () => Response.json(body),
        async (_, init) => {
          mutations.push(JSON.parse(init.body));
          return Response.json({ syntheticAcknowledgement: true });
        },
      );
      const response = await a.Route.server.handlers.POST({
        request: request(new AbortController(), "POST"),
      });
      assert.equal(response.status, status);
      assert.equal(mutations.length, body ? 1 : 0);
      if (body)
        assert.deepEqual(mutations, [
          {
            p_actor: actor,
            p_user: target,
            p_module: "roofing",
            p_target: "Spanish",
            p_native: "English",
            p_kind: "response",
            p_active: true,
            p_expected: 0,
            p_reason: valid.reason,
            p_request: valid.requestId,
          },
        ]);
    }
    const events = [];
    routeTransport(events, async () => Response.json({ message: "PRIVATE" }, { status: 503 }));
    const failure = await a.Route.server.handlers.POST({
      request: request(new AbortController(), "POST"),
    });
    assert.equal(failure.status, 503);
    assert.deepEqual(await failure.json(), {
      error: "Assessment request controls are unavailable.",
    });
    assert.equal(
      events.some((p) => p.endsWith("assessment_manage_reviewer")),
      false,
    );
  }));
test("a permission update already dispatched keeps its acknowledgement/request-ID outcome and is never replayed", () =>
  fixture(async (a) => {
    const owner = new AbortController(),
      events = [];
    let began, release;
    const started = new Promise((r) => (began = r));
    routeTransport(
      events,
      async () => Response.json(true),
      (_, init) => {
        assert.equal(init.signal, undefined);
        began();
        return new Promise((r) => (release = r));
      },
    );
    const pending = a.Route.server.handlers.POST({ request: request(owner, "POST") });
    await started;
    owner.abort();
    release(Response.json({ syntheticAcknowledgement: true }));
    const response = await pending;
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { syntheticAcknowledgement: true });
    assert.equal(events.filter((p) => p.endsWith("assessment_manage_reviewer")).length, 1);
  }));
