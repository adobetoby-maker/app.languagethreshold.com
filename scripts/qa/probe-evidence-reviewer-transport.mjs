/** Historical SDK evidence-reviewer probe. All data and HTTP operations are synthetic. */
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdirSync, mkdtempSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
const baseline = process.env.LT_EVIDENCE_REVIEWER_BASELINE;
assert.ok(baseline, "Historical probe requires LT_EVIDENCE_REVIEWER_BASELINE=52f0e3b.");
const actor = "22222222-2222-4222-8222-222222222222",
  learner = "33333333-3333-4333-8333-333333333333",
  attemptId = "44444444-4444-4444-8444-444444444444",
  checkpointId = "55555555-5555-4555-8555-555555555555",
  enrollmentId = "66666666-6666-4666-8666-666666666666";
const user = { id: actor, email: "reviewer@example.invalid" };
const enrollment = {
  id: enrollmentId,
  scope: "personal",
  organization_id: null,
  user_id: learner,
  module_id: "roofing",
  target_language: "Spanish",
  instruction_language: "English",
};
const attempt = {
  id: attemptId,
  checkpoint_id: checkpointId,
  form_snapshot: { definition: { items: [] } },
  submitted_at: null,
};
const sourcePaths = [
  "src/lib/team-server.ts",
  "src/lib/assessments/server.ts",
  "src/routes/api.exams.ts",
];
const source = new Map(
  sourcePaths.map((p) => [
    resolve(p),
    execFileSync("git", ["show", `${baseline}:${p}`], { encoding: "utf8" }),
  ]),
);
const vars = ["SUPABASE_URL", "VITE_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
  original = {
    fetch: globalThis.fetch,
    error: console.error,
    env: vars.map((k) => process.env[k]),
  };
const pending = [];
let logs = 0,
  unexpected = 0;
mkdirSync(resolve("node_modules/.cache"), { recursive: true });
const dir = mkdtempSync(resolve("node_modules/.cache/evidence-reviewer-probe-"));
try {
  await build({
    stdin: {
      contents: `export {Route} from '@/routes/api.exams';export {teamAdminClient} from '@/lib/team-server';export {attemptAccess} from '@/lib/assessments/server';`,
      resolveDir: process.cwd(),
    },
    outfile: join(dir, "probe.mjs"),
    bundle: true,
    format: "esm",
    platform: "node",
    packages: "external",
    logLevel: "silent",
    plugins: [
      {
        name: "historical-shell",
        setup(b) {
          b.onLoad(
            {
              filter: /\/src\/(lib\/team-server|lib\/assessments\/server|routes\/api\.exams)\.ts$/,
            },
            (args) => ({
              contents: source.get(args.path),
              loader: "ts",
              resolveDir: resolve(args.path, ".."),
            }),
          );
          b.onResolve({ filter: /^@tanstack\/react-start\/server-only$/ }, () => ({
            path: "server-only",
            namespace: "empty",
          }));
          b.onLoad({ filter: /.*/, namespace: "empty" }, () => ({ contents: "" }));
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
  const api = await import(join(dir, "probe.mjs"));
  process.env.SUPABASE_URL = "https://reviewer-fixture.invalid";
  process.env.VITE_SUPABASE_URL = "https://reviewer-fixture.invalid";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "synthetic-project-key";
  console.error = () => logs++;
  globalThis.fetch = () => {
    unexpected++;
    throw Error("Unexpected global transport");
  };
  function row(init, data) {
    return Response.json(
      new Headers(init?.headers).get("accept")?.includes("vnd.pgrst.object") ? data : [data],
    );
  }
  function ordinary(input, init) {
    const url = new URL(String(input));
    assert.equal(url.origin, "https://reviewer-fixture.invalid");
    if (url.pathname === "/rest/v1/assessment_attempts") return row(init, attempt);
    if (url.pathname === "/rest/v1/assessment_checkpoints")
      return row(init, { id: checkpointId, enrollment_id: enrollmentId });
    if (url.pathname === "/rest/v1/assessment_enrollments") return row(init, enrollment);
    if (url.pathname === "/rest/v1/assessment_review_requests")
      return row(init, { id: "77777777-7777-4777-8777-777777777777" });
    return null;
  }
  function client(reviewer) {
    const owner = new AbortController(),
      request = new Request("https://fixture.invalid/api/exams", { signal: owner.signal });
    return {
      owner,
      db: api.teamAdminClient(async (input, init) => {
        const response = ordinary(input, init);
        if (response) return response;
        assert.equal(new URL(String(input)).pathname, "/rest/v1/assessment_reviewers");
        return reviewer(input, init);
      }, request),
    };
  }
  let selected;
  const normal = client(async (input, init) => {
    selected = { url: new URL(String(input)), init };
    return Response.json([{ user_id: actor }]);
  });
  const context = await api.attemptAccess(normal.db, actor, attemptId, true);
  assert.equal(context.enrollment.user_id, learner);
  for (const [key, value] of Object.entries({
    select: "user_id",
    user_id: "eq." + actor,
    module_id: "eq.roofing",
    target_language: "eq.Spanish",
    instruction_language: "eq.English",
    active: "eq.true",
  }))
    assert.equal(selected.url.searchParams.get(key), value);
  assert.equal(selected.init.signal, undefined);
  assert.equal(selected.init.cache, undefined);
  const large = client(async () =>
    Response.json([{ user_id: actor, syntheticUnexpectedData: "x".repeat(300 * 1024) }]),
  );
  await api.attemptAccess(large.db, actor, attemptId, true);
  const retryHeaders = [];
  const failed = client(async (input, init) => {
    retryHeaders.push(new Headers(init.headers).get("x-retry-count"));
    return Response.json(
      { code: "SYNTHETIC_ERROR", message: "PRIVATE synthetic diagnostic" },
      { status: 503, headers: { "Retry-After": "0" } },
    );
  });
  await assert.rejects(
    api.attemptAccess(failed.db, actor, attemptId, true),
    (e) => e.status === 403 && e.message === "Personal assessment access required.",
  );
  assert.deepEqual(retryHeaders, [null, "1", "2", "3"]);
  let release,
    start,
    complete = false;
  const began = new Promise((r) => (start = r)),
    late = client(
      () =>
        new Promise((r) => {
          release = r;
          start();
        }),
    );
  const waiting = api
    .attemptAccess(late.db, actor, attemptId, true)
    .finally(() => (complete = true));
  void waiting.catch(() => {});
  pending.push({
    owner: late.owner,
    release: () => release?.(Response.json([{ user_id: actor }])),
    promise: waiting,
  });
  await began;
  late.owner.abort();
  await new Promise((r) => setImmediate(r));
  assert.equal(complete, false);
  release(Response.json([{ user_id: actor }]));
  await waiting;
  async function route(mode) {
    const owner = new AbortController(),
      events = [];
    let release, start;
    const began = new Promise((r) => (start = r));
    globalThis.fetch = async (input, init) => {
      const url = new URL(String(input)),
        method = init?.method ?? "GET";
      assert.equal(url.origin, "https://reviewer-fixture.invalid");
      events.push({
        path: url.pathname,
        method,
        afterAbort: owner.signal.aborted,
        signalPresent: !!init.signal,
      });
      if (url.pathname === "/auth/v1/user") return Response.json(user);
      if (mode === "attempt") {
        const response = ordinary(input, init);
        if (response) return response;
        if (url.pathname === "/rest/v1/assessment_responses")
          return Response.json(
            { code: "SYNTHETIC_STOP", message: "Stop after recorded mock response read" },
            { status: 400 },
          );
      }
      if (url.pathname === "/rest/v1/rpc/consume_speaking_request") return Response.json(true);
      if (url.pathname === "/rest/v1/rpc/assessment_review_queue")
        return Response.json({ requests: [] });
      if (url.pathname === "/rest/v1/assessment_reviewers") {
        start();
        return new Promise((r) => (release = r));
      }
      unexpected++;
      throw Error("Unexpected synthetic operation");
    };
    const request = new Request(
      mode === "attempt"
        ? `https://fixture.invalid/api/exams?action=attempt&attempt=${attemptId}&review=1`
        : "https://fixture.invalid/api/exams?action=review_queue",
      { headers: { Authorization: "Bearer synthetic-user-token" }, signal: owner.signal },
    );
    const operation = api.Route.server.handlers.GET({ request });
    pending.push({
      owner,
      release: () => release?.(Response.json([{ user_id: actor }])),
      promise: operation,
    });
    let timer;
    try {
      await Promise.race([
        began,
        new Promise(
          (_, reject) =>
            (timer = setTimeout(() => reject(Error("Synthetic registry did not dispatch")), 5000)),
        ),
      ]);
    } finally {
      clearTimeout(timer);
    }
    owner.abort();
    release(Response.json([{ user_id: actor }]));
    const response = await operation,
      body = await response.json();
    if (mode === "attempt") {
      assert.equal(response.status, 503);
      assert.equal(body.error, "Saved responses could not be loaded.");
      assert.deepEqual(
        events.filter((e) => e.afterAbort).map((e) => e.path),
        ["/rest/v1/assessment_responses"],
      );
    } else {
      assert.equal(response.status, 200);
      assert.equal(body.eligible, true);
      assert.deepEqual(body.requests, []);
    }
    return {
      status: response.status,
      eligible: body.eligible ?? null,
      callsAfterAbort: events.filter((e) => e.afterAbort),
    };
  }
  const attemptRoute = await route("attempt"),
    queueRoute = await route("queue");
  assert.equal(unexpected, 0);
  assert.equal(logs, 0);
  const report = {
    testedAt: new Date().toISOString(),
    sourceCommit: execFileSync("git", ["rev-parse", baseline], { encoding: "utf8" }).trim(),
    runtimeApplicationCommit: process.env.LT_QA_STAGE_COMMIT ?? null,
    installedSdk: JSON.parse(readFileSync("node_modules/@supabase/postgrest-js/package.json"))
      .version,
    observations: {
      exactActorTrackActiveProjectionCorrect: true,
      reviewerSignalPresent: false,
      explicitNoStore: false,
      oversizedUnexpectedFixtureBytesAccepted: 300 * 1024,
      transient503Dispatches: retryHeaders.length,
      retryHeaders,
      serviceFailureReportedAsExisting403: true,
      abortDuringExactReviewerReadDidNotSettle: true,
      lateReviewerStillReturnedContext: true,
      actualAttemptRoute: attemptRoute,
      actualQueueRoute: queueRoute,
      unexpectedNetworkCalls: unexpected,
      sdkConsoleErrorCalls: logs,
    },
    sourceHashes: Object.fromEntries(
      sourcePaths.map((p) => [
        p,
        createHash("sha256")
          .update(source.get(resolve(p)))
          .digest("hex"),
      ]),
    ),
    limits: [
      "Historical production source and installed SDK with synthetic project/Auth/claim/enrollment/reviewer/HTTP data only. No real evidence, grants, assignments, claim, budget-counter, form, score, certificate, role, provider, financial, schema/policy/schedule or cleanup operation.",
      "The actual attempt GET reaches one mock saved-response query after request departure; that mock deliberately returns400 to stop serialization. No private response or question is returned. Queue mock has no requests and late registry returns eligible=true after cancellation; queue RPC happens before registry wait and is not demonstrated prevented or bounded here.",
      "These are request-lifecycle/resource/service-guidance findings, not evidence of tenant authorization bypass, attacker control or real data leakage. Normal exact user/track/active and claimed personal-request checks are present. The transient503 path denies access but misreports it as403.",
      "This historical defect probe must not become a required test preserving late authorization. No application change/deployment in the probe. Next repair should bound both exact-track and limit-one eligibility reads, disable their retries, preserve org-specific queue and personal-sharing/self-review rules, and keep broader private reads/RPCs/admin lists separate.",
    ],
  };
  writeFileSync(
    process.env.LT_QA_REPORT_PATH ?? join(dir, "historical-evidence-reviewer-probe.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({ observations: report.observations, installedSdk: report.installedSdk }),
  );
} finally {
  for (const p of pending) {
    p.owner.abort();
    p.release();
  }
  await Promise.allSettled(pending.map((p) => p.promise));
  globalThis.fetch = original.fetch;
  console.error = original.error;
  for (const [i, k] of vars.entries()) {
    if (original.env[i] === undefined) delete process.env[k];
    else process.env[k] = original.env[i];
  }
  rmSync(dir, { recursive: true, force: true });
}
