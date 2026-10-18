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
  const dir = mkdtempSync(resolve("node_modules/.cache/assessment-budget-adoption-"));
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
        contents: `export {Route as exams} from '@/routes/api.exams';export {Route as plans} from '@/routes/api.exam-plans';export {Route as content} from '@/routes/api.exam-content';`,
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
            if (process.env.LT_ASSESSMENT_QUOTA_BASELINE)
              b.onLoad(
                { filter: /\/src\/routes\/api\.(exams|exam-plans|exam-content)\.ts$/ },
                (args) => ({
                  contents: execFileSync(
                    "git",
                    [
                      "show",
                      process.env.LT_ASSESSMENT_QUOTA_BASELINE +
                        ":src/routes/" +
                        args.path.split("/").at(-1),
                    ],
                    { encoding: "utf8" },
                  ),
                  loader: "ts",
                  resolveDir: resolve(args.path, ".."),
                }),
              );
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
const id = "33333333-3333-4333-8333-333333333333",
  requestId = "44444444-4444-4444-8444-444444444444";
const ack = { action: "speech_reviewed", evidenceId: id, requestId, listened: true };
const goals = {
  action: "save_goals",
  enrollmentId: id,
  topics: [],
  offlinePreferred: false,
  expectedRevision: 0,
  requestId,
};
const cases = [
  { route: "exams", query: "action=review_queue" },
  { route: "exams", query: "action=checkpoint_history&checkpoint=" + id },
  { route: "exams", query: "action=speech_status&attempt=" + id },
  { route: "exams", query: "action=speech_playback&evidence=" + id },
  { route: "exams", query: "action=listening&attempt=" + id + "&item=fixture" },
  {
    route: "exams",
    query:
      "action=team_insights&org=" +
      id +
      "&module=roofing&target=Spanish&native=English&checkpoint=entrance",
  },
  { route: "exams", query: "" },
  {
    route: "exams",
    query: "action=speech_upload",
    method: "POST",
    body: "synthetic unused upload",
  },
  { route: "exams", query: "", method: "POST", body: ack },
  { route: "plans", query: "action=unknown" },
  { route: "plans", query: "action=history_export&enrollment=" + id, holdAt: 2 },
  { route: "plans", query: "", method: "POST", body: goals },
  { route: "content", query: "" },
  { route: "content", query: "", method: "POST", body: {} },
];
const paths = { exams: "exams", plans: "exam-plans", content: "exam-content" };
function req(c, owner = new AbortController(), headers = {}) {
  return new Request("https://app.invalid/api/" + paths[c.route] + (c.query ? "?" + c.query : ""), {
    method: c.method ?? "GET",
    headers: {
      Origin: "https://app.invalid",
      Authorization: "Bearer synthetic",
      "Content-Type": "application/json",
      ...headers,
    },
    signal: owner.signal,
    ...(c.method === "POST"
      ? { body: typeof c.body === "string" ? c.body : JSON.stringify(c.body) }
      : {}),
  });
}
const tick = (a) => new Promise((r) => a.old.set(r, 0));
function transport(events, owner, quota, { ownerRole = true, mutation } = {}) {
  let quotaCalls = 0;
  globalThis.fetch = async (input, init) => {
    const u = new URL(String(input)),
      path = u.pathname;
    assert.equal(u.origin, "https://fixture.invalid");
    events.push({ path, afterAbort: owner.signal.aborted });
    if (path === "/auth/v1/user") return Response.json(user);
    if (path === "/rest/v1/platform_admin_roles")
      return Response.json(ownerRole ? [{ role: "owner" }] : []);
    if (path === "/rest/v1/assessment_content_reviewers") return Response.json([]);
    if (path === "/rest/v1/rpc/consume_speaking_request") return quota(++quotaCalls, input, init);
    if (path === "/rest/v1/assessment_enrollments")
      return Response.json([{ id, scope: "personal", user_id: actor, organization_id: null }]);
    if (path === "/rest/v1/rpc/assessment_review_queue") return Response.json({ requests: [] });
    if (path === "/rest/v1/assessment_reviewers") return Response.json([]);
    if (path === "/rest/v1/assessment_releases") return Response.json([]);
    if (
      path === "/rest/v1/rpc/assessment_ack_speech_review" ||
      path === "/rest/v1/rpc/assessment_save_goals"
    )
      return mutation
        ? mutation(input, init)
        : Response.json(path.endsWith("assessment_save_goals") ? 1 : true);
    return Response.json({ message: "PRIVATE deliberate synthetic stop" }, { status: 400 });
  };
}
async function cancelled(a, c, mode = "abort") {
  const owner = new AbortController(),
    events = [];
  let began,
    release,
    signal,
    settled = false;
  const started = new Promise((r) => (began = r));
  transport(events, owner, (n, _, init) => {
    if (n < (c.holdAt ?? 1)) return Response.json(true);
    signal = init.signal;
    began();
    return new Promise((r) => (release = r));
  });
  const pending = a[c.route].server.handlers[c.method ?? "GET"]({ request: req(c, owner) }).finally(
    () => (settled = true),
  );
  await started;
  if (mode === "abort") owner.abort();
  else {
    assert.equal(a.timers.size, 1);
    [...a.timers.values()][0]();
  }
  await tick(a);
  const settledBeforeRelease = settled;
  release(Response.json(true));
  const response = await pending;
  assert.ok(
    settledBeforeRelease,
    "owned quota wait must settle before late headers; calls=" + JSON.stringify(events),
  );
  assert.equal(response.status, mode === "abort" ? 499 : 503, c.route + ":" + c.query);
  assert.deepEqual(await response.json(), {
    error:
      mode === "abort"
        ? "Assessment request cancelled."
        : "Assessment request controls are unavailable.",
  });
  assert.equal(signal.aborted, true);
  assert.equal(
    events.some((e) => e.afterAbort),
    false,
  );
  return events;
}
test("all fourteen adopted assessment quota callsites stop before late quota permits release downstream work", () =>
  fixture(async (a) => {
    for (const c of cases) await cancelled(a, c);
  }));
test("exams/plans/content GET and POST quota waits settle owned deadlines without later work", () =>
  fixture(async (a) => {
    for (const c of [cases[0], cases[8], cases[9], cases[11], cases[12], cases[13]])
      await cancelled(a, c, "deadline");
  }));
test("each assessment API uses bounded quota JSON and fixed503 on excess/invalid service replies without retry", () =>
  fixture(async (a) => {
    for (const c of [cases[0], cases[9], cases[12]])
      for (const bad of ["true" + " ".repeat(1024), "{", new Uint8Array([0xff])]) {
        const owner = new AbortController(),
          events = [];
        let calls = 0;
        transport(events, owner, async () => {
          calls++;
          return new Response(bad);
        });
        const response = await a[c.route].server.handlers.GET({ request: req(c, owner) });
        assert.equal(response.status, 503);
        assert.deepEqual(await response.json(), {
          error: "Assessment request controls are unavailable.",
        });
        assert.equal(calls, 1);
        assert.equal(
          events.filter(
            (e) =>
              ![
                "/auth/v1/user",
                "/rest/v1/platform_admin_roles",
                "/rest/v1/assessment_content_reviewers",
                "/rest/v1/rpc/consume_speaking_request",
              ].includes(e.path),
          ).length,
          0,
        );
      }
  }));
test("normal permits retain queue eligibility, plan revision, content owner view and existing invalid command denial", () =>
  fixture(async (a) => {
    for (const [c, status, expected] of [
      [cases[0], 200, { requests: [], eligible: false }],
      [cases[8], 200, { acknowledged: true }],
      [cases[9], 400, { error: "Unknown plan view." }],
      [cases[11], 200, { revision: 1 }],
      [
        cases[12],
        200,
        {
          releases: [],
          forms: [],
          releaseLimit: 200,
          formLimit: 1000,
          owner: true,
          registeredOwner: true,
        },
      ],
      [cases[13], 400, { error: "Check the content reference, review and confirmation." }],
    ]) {
      const owner = new AbortController(),
        events = [];
      transport(events, owner, async () => Response.json(true));
      const response = await a[c.route].server.handlers[c.method ?? "GET"]({
        request: req(c, owner),
      });
      assert.equal(response.status, status);
      assert.deepEqual(await response.json(), expected);
    }
  }));
test("false quota results keep429 and prevent protected follow-on work across all three APIs", () =>
  fixture(async (a) => {
    for (const c of [cases[0], cases[8], cases[9], cases[11], cases[12], cases[13]]) {
      const owner = new AbortController(),
        events = [];
      transport(events, owner, async () => Response.json(false));
      const response = await a[c.route].server.handlers[c.method ?? "GET"]({
        request: req(c, owner),
      });
      assert.equal(response.status, 429);
      assert.deepEqual(await response.json(), {
        error: "Please wait a minute before trying again.",
      });
      assert.equal(
        events.some(
          (e) =>
            e.path.includes("assessment_ack_speech") ||
            e.path.includes("assessment_save_goals") ||
            e.path.includes("assessment_releases") ||
            e.path.includes("assessment_review_queue"),
        ),
        false,
      );
    }
  }));
test("history export has separately owned plan-read and export quotas; cancellation cannot release CSV work", () =>
  fixture(async (a) => {
    const events = await cancelled(a, cases[10]);
    assert.equal(events.filter((e) => e.path.endsWith("consume_speaking_request")).length, 2);
    assert.equal(events.filter((e) => e.path.endsWith("assessment_enrollments")).length, 1);
    assert.equal(
      events.some((e) => e.path.includes("assessment_history_export")),
      false,
    );
  }));
test("independent APIs keep request cancellation separate and already-dispatched acknowledgements unchanged", () =>
  fixture(async (a) => {
    // Independent requests use one global mock HTTP dispatcher, selected by distinct HMAC bucket hashes.
    const ca = new AbortController(),
      cb = new AbortController(),
      releases = [];
    let began;
    const started = new Promise((r) => (began = r));
    globalThis.fetch = async (input, init) => {
      const p = new URL(String(input)).pathname;
      if (p === "/auth/v1/user") return Response.json(user);
      assert.equal(p, "/rest/v1/rpc/consume_speaking_request");
      return new Promise((r) => {
        releases.push({ release: r, signal: init.signal });
        if (releases.length === 2) began();
      });
    };
    const pa = a.exams.server.handlers.GET({ request: req(cases[0], ca) }),
      pb = a.plans.server.handlers.GET({ request: req(cases[9], cb) });
    await started;
    ca.abort();
    assert.equal((await pa).status, 499);
    assert.equal(releases[1].signal.aborted, false);
    releases[1].release(Response.json(true));
    assert.equal((await pb).status, 400);
    releases[0].release(Response.json(true));
    await tick(a);
    for (const c of [cases[8], cases[11]]) {
      const owner = new AbortController(),
        events = [];
      let start, release;
      const began = new Promise((r) => (start = r));
      transport(events, owner, async () => Response.json(true), {
        mutation: (_, init) => {
          assert.equal(init.signal, undefined);
          start();
          return new Promise((r) => (release = r));
        },
      });
      const pending = a[c.route].server.handlers.POST({ request: req(c, owner) });
      await began;
      owner.abort();
      release(Response.json(c.route === "plans" ? 1 : true));
      assert.equal((await pending).status, 200);
      assert.equal(
        events.filter(
          (e) =>
            e.path.endsWith("assessment_ack_speech_review") ||
            e.path.endsWith("assessment_save_goals"),
        ).length,
        1,
      );
    }
  }));
test("missing bearer, unassigned content and nonquota invalid attempt reads retain their existing early gates", () =>
  fixture(async (a) => {
    for (const c of [cases[0], cases[9], cases[12]]) {
      const owner = new AbortController(),
        events = [];
      transport(events, owner, async () => {
        throw Error("Unexpected quota");
      });
      const response = await a[c.route].server.handlers.GET({
        request: req(c, owner, { Authorization: "" }),
      });
      assert.equal(response.status, 403);
      assert.deepEqual(events, []);
    }
    const owner = new AbortController(),
      events = [];
    transport(
      events,
      owner,
      async () => {
        throw Error("Unexpected quota");
      },
      { ownerRole: false },
    );
    assert.equal(
      (await a.content.server.handlers.GET({ request: req(cases[12], owner) })).status,
      403,
    );
    assert.equal(
      events.some((e) => e.path.endsWith("consume_speaking_request")),
      false,
    );
    const denied = [];
    transport(denied, owner, async () => {
      throw Error("Unexpected quota");
    });
    assert.equal(
      (
        await a.exams.server.handlers.GET({
          request: req({ route: "exams", query: "action=attempt&attempt=invalid" }, owner),
        })
      ).status,
      400,
    );
    assert.equal(
      denied.some((e) => e.path.endsWith("consume_speaking_request")),
      false,
    );
  }));
