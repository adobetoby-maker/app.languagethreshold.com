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
  const dir = mkdtempSync(resolve("node_modules/.cache/evidence-reviewer-"));
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
        contents: `export {Route} from '@/routes/api.exams';export {teamAdminClient} from '@/lib/team-server';export {evidenceReviewerFetch} from '@/lib/evidence-reviewer-fetch';export {evidenceReviewerStatus} from '@/lib/assessments/reviewer-status';export {attemptAccess} from '@/lib/assessments/server';`,
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
const reviewer = { user_id: actor };
const unavailable = (e) => e.status === 503 && e.message === "Reviewer status could not be loaded.";
const learner = "33333333-3333-4333-8333-333333333333",
  attemptId = "44444444-4444-4444-8444-444444444444",
  checkpointId = "55555555-5555-4555-8555-555555555555",
  enrollmentId = "66666666-6666-4666-8666-666666666666";
const track = {
  module_id: row.module_id,
  target_language: row.target_language,
  instruction_language: row.instruction_language,
};
const enrollment = {
  ...track,
  id: enrollmentId,
  scope: "personal",
  user_id: learner,
  organization_id: null,
};
function ordinary(input, init, overrides = {}) {
  const path = new URL(String(input)).pathname;
  const values = {
    team_members: null,
    assessment_attempts: {
      id: attemptId,
      checkpoint_id: checkpointId,
      form_snapshot: { definition: { items: [] } },
    },
    assessment_checkpoints: { id: checkpointId, enrollment_id: enrollmentId },
    assessment_enrollments: enrollment,
    assessment_review_requests: { id: "claimed" },
    ...overrides,
  };
  const key = path.split("/").at(-1);
  if (!(key in values)) return;
  const data = values[key];
  return Response.json(
    new Headers(init?.headers).get("accept")?.includes("vnd.pgrst.object")
      ? data
      : data
        ? [data]
        : [],
  );
}
function client(a, handler, overrides) {
  return a.client(async (input, init) => ordinary(input, init, overrides) ?? handler(input, init));
}
test("reviewer track and limit-one eligibility retain exact active actor filters and no-store owned transport", () =>
  fixture(async (a) => {
    for (const selected of [track, undefined]) {
      let calls = 0;
      const c = client(a, async (input, init) => {
        calls++;
        const u = new URL(String(input));
        assert.equal(u.pathname, "/rest/v1/assessment_reviewers");
        assert.equal(u.searchParams.get("select"), "user_id");
        assert.equal(u.searchParams.get("user_id"), "eq." + actor);
        assert.equal(u.searchParams.get("active"), "eq.true");
        assert.equal([...u.searchParams.keys()].length, selected ? 6 : 4);
        if (selected)
          for (const [k, v] of Object.entries(track))
            assert.equal(u.searchParams.get(k), "eq." + v);
        else assert.equal(u.searchParams.get("limit"), "1");
        assert.ok(init.signal);
        assert.equal(init.cache, "no-store");
        assert.equal(init.redirect, "error");
        return Response.json([reviewer]);
      });
      assert.equal(await a.evidenceReviewerStatus(c.db, actor, selected), true);
      assert.equal(calls, 1);
      const empty = client(a, async () => Response.json([]));
      assert.equal(await a.evidenceReviewerStatus(empty.db, actor, selected), false);
    }
    const c = client(a, async () => Response.json([reviewer]));
    assert.equal((await a.attemptAccess(c.db, actor, attemptId, true)).enrollment.user_id, learner);
    for (const overrides of [
      { assessment_review_requests: null },
      { assessment_enrollments: { ...enrollment, scope: "team" } },
      { assessment_enrollments: { ...enrollment, user_id: actor } },
    ]) {
      let registry = 0;
      const denied = client(
        a,
        async () => {
          registry++;
          return Response.json([reviewer]);
        },
        overrides,
      );
      await assert.rejects(
        a.attemptAccess(denied.db, actor, attemptId, true),
        (e) => e.status === 403,
      );
      assert.equal(registry, 0);
    }
    const absent = client(a, async () => Response.json([]));
    await assert.rejects(
      a.attemptAccess(absent.db, actor, attemptId, true),
      (e) => e.status === 403 && e.message === "Personal assessment access required.",
    );
  }));
test("reviewer HTTP/private failures dispatch once and remain fixed service failures instead of permission denials", () =>
  fixture(async (a) => {
    for (const selected of [track, undefined])
      for (const status of [301, 401, 403, 429, 500, 503]) {
        let calls = 0,
          cancels = 0;
        const c = client(a, async () => {
          calls++;
          return new Response(
            new ReadableStream({
              cancel() {
                cancels++;
              },
            }),
            { status },
          );
        });
        await assert.rejects(a.evidenceReviewerStatus(c.db, actor, selected), unavailable);
        assert.equal(calls, 1);
        assert.equal(cancels, 1);
      }
    const failed = client(a, async () => {
      throw Error("PRIVATE");
    });
    await assert.rejects(a.attemptAccess(failed.db, actor, attemptId, true), unavailable);
  }));
test("reviewer wire budget, UTF8, projection, actor and cardinality reject malformed service data", () =>
  fixture(async (a) => {
    for (const selected of [track, undefined]) {
      for (const data of [
        [{ ...reviewer, private: "x" }],
        [{ user_id: learner }],
        [reviewer, reviewer],
        [{ user_id: 0 }],
        ...(!selected ? [reviewer, null] : []),
      ]) {
        const c = client(a, async () => Response.json(data));
        await assert.rejects(a.evidenceReviewerStatus(c.db, actor, selected), unavailable);
      }
      for (const data of [
        JSON.stringify([reviewer]) + " ".repeat(4096),
        "{",
        new Uint8Array([0xc3, 0x28]),
      ]) {
        const c = client(a, async () => new Response(data));
        await assert.rejects(a.evidenceReviewerStatus(c.db, actor, selected), unavailable);
      }
    }
    for (const data of [reviewer, null]) {
      const c = client(a, async () => Response.json(data));
      assert.equal(await a.evidenceReviewerStatus(c.db, actor, track), !!data);
    }
  }));
test("reviewer cancellation/deadline settles ignored headers and cancels late bodies without releasing access", () =>
  fixture(async (a) => {
    for (const selected of [track, undefined])
      for (const mode of ["abort", "deadline"]) {
        let start,
          release,
          cancels = 0;
        const began = new Promise((r) => (start = r));
        const c = client(
          a,
          () =>
            new Promise((r) => {
              release = r;
              start();
            }),
        );
        const done = assert.rejects(a.evidenceReviewerStatus(c.db, actor, selected), (e) =>
          mode === "abort" ? e.status === 499 : unavailable(e),
        );
        await began;
        assert.equal(a.timers.size, 1);
        if (mode === "abort") c.owner.abort();
        else [...a.timers.values()][0]();
        await done;
        release(
          new Response(
            new ReadableStream({
              cancel() {
                cancels++;
              },
            }),
          ),
        );
        await new Promise((r) => a.old.set(r, 0));
        assert.equal(cancels, 1);
      }
    let calls = 0;
    const c = client(a, async () => {
      calls++;
      return Response.json([reviewer]);
    });
    c.owner.abort();
    await assert.rejects(a.evidenceReviewerStatus(c.db, actor, track), (e) => e.status === 499);
    assert.equal(calls, 0);
  }));
test("reviewer deadline covers stalled body without waiting for cancellation completion", () =>
  fixture(async (a) => {
    let start,
      cancels = 0;
    const began = new Promise((r) => (start = r));
    const c = client(
      a,
      async () =>
        new Response(
          new ReadableStream({
            pull() {
              start();
            },
            cancel() {
              cancels++;
              return new Promise(() => {});
            },
          }),
        ),
    );
    const done = assert.rejects(a.evidenceReviewerStatus(c.db, actor, track), unavailable);
    await began;
    [...a.timers.values()][0]();
    await done;
    assert.equal(cancels, 1);
  }));
test("actual attempt and personal queue GET return499 after registry departure; org queue retains its RPC authorization", () =>
  fixture(async (a) => {
    for (const mode of ["attempt", "queue", "org"]) {
      let start, release;
      const began = new Promise((r) => (start = r)),
        owner = new AbortController(),
        events = [];
      globalThis.fetch = async (input, init) => {
        const path = new URL(String(input)).pathname;
        events.push({ path, afterAbort: owner.signal.aborted });
        if (path === "/auth/v1/user") return Response.json(user);
        if (mode === "attempt") {
          const response = ordinary(input, init);
          if (response) return response;
        }
        if (path === "/rest/v1/rpc/consume_speaking_request") return Response.json(true);
        if (path === "/rest/v1/rpc/assessment_review_queue") return Response.json({ requests: [] });
        assert.equal(path, "/rest/v1/assessment_reviewers");
        assert.ok(init.signal);
        start();
        return new Promise((r) => (release = r));
      };
      const url =
        mode === "attempt"
          ? `https://app.invalid/api/exams?action=attempt&attempt=${attemptId}&review=1`
          : `https://app.invalid/api/exams?action=review_queue${mode === "org" ? "&org=" + enrollmentId : ""}`;
      const operation = a.Route.server.handlers.GET({
        request: new Request(url, {
          headers: { Authorization: "Bearer synthetic" },
          signal: owner.signal,
        }),
      });
      if (mode === "org") {
        const response = await operation;
        assert.equal(response.status, 200);
        assert.equal((await response.json()).eligible, true);
        assert.equal(
          events.some((e) => e.path.includes("assessment_reviewers")),
          false,
        );
        continue;
      }
      await began;
      owner.abort();
      // The response must settle before the ignored transport returns.
      const response = await operation;
      assert.equal(response.status, 499);
      assert.deepEqual(await response.json(), { error: "Assessment request cancelled." });
      release(Response.json([reviewer]));
      await new Promise((r) => a.old.set(r, 0));
      assert.equal(
        events.some((e) => e.afterAbort),
        false,
      );
      assert.equal(
        events.some((e) => e.path.includes("assessment_responses")),
        false,
      );
      if (mode === "queue")
        assert.ok(events.some((e) => e.path.endsWith("assessment_review_queue")));
    }
  }));
test("unrelated projects, admin projections, inactive lookups, extra filters and writes pass through unchanged", () =>
  fixture(async (a) => {
    const owner = new AbortController();
    owner.abort();
    const base = "https://fixture.invalid/rest/v1/assessment_reviewers";
    for (const [query, method, host] of [
      ["select=*&user_id=eq.x&active=eq.true&limit=1", "GET"],
      ["select=user_id&user_id=eq.x&active=eq.false&limit=1", "GET"],
      ["select=user_id&user_id=eq.x&active=eq.true&limit=1&extra=x", "GET"],
      ["select=user_id&user_id=eq.x&active=eq.true&limit=1", "PATCH"],
      ["select=user_id&user_id=eq.x&active=eq.true&limit=1", "GET", "other.invalid"],
      [
        "select=user_id&user_id=eq.x&active=eq.true&module_id=eq.x&target_language=eq.x&extra=eq.x",
        "GET",
      ],
    ]) {
      const input = base.replace("fixture.invalid", host ?? "fixture.invalid") + "?" + query,
        init = { method };
      let calls = 0;
      await a.evidenceReviewerFetch("https://fixture.invalid", owner.signal, async (i, j) => {
        calls++;
        assert.equal(i, input);
        assert.equal(j, init);
        return Response.json([]);
      })(input, init);
      assert.equal(calls, 1);
    }
  }));
test("independent reviewer clients do not share cancellation or actor scope", () =>
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
    const pa = assert.rejects(
        a.evidenceReviewerStatus(ca.db, actor, track),
        (e) => e.status === 499,
      ),
      pb = a.evidenceReviewerStatus(cb.db, learner);
    await Promise.all([first, second]);
    ca.owner.abort();
    await pa;
    releaseB(Response.json([{ user_id: learner }]));
    assert.equal(await pb, true);
    releaseA(Response.json([reviewer]));
    await new Promise((r) => a.old.set(r, 0));
  }));
