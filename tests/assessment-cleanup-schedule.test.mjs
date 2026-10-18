import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadModule } from "./helpers/bundle.mjs";
import { assessmentCleanupSchedule } from "../scripts/assessment-cleanup-schedule.mjs";
import { cleanupRunHealth } from "../src/lib/assessments/cleanup-run.ts";
const secret = "local-fixture-secret-32-bytes-only-not-a-real-key";
const load = () =>
  loadModule("src/lib/assessments/cleanup-schedule-server.ts", {
    stubs: [/^@tanstack\/react-start\/server-only$/],
  });
const request = (token = secret, path = "") =>
  new Request("https://example.test/api/exam-cleanup" + path, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
function fixture({ busy = false, claimError = false, finishError = false, role = "owner" } = {}) {
  const calls = [];
  const db = {
    rpc: async (name, args) => {
      calls.push([name, args]);
      if (name === "assessment_begin_cleanup_run")
        return { data: busy ? null : args.p_id, error: null };
      if (name === "assessment_claim_speech_cleanup")
        return { data: [], error: claimError ? { message: "fixture" } : null };
      return { data: null, error: finishError ? { message: "fixture" } : null };
    },
    storage: {
      getBucket: async () => {
        calls.push(["storage"]);
        return { data: { public: false, file_size_limit: 4194304 }, error: null };
      },
    },
    auth: {
      getUser: async () => ({
        data: { user: { id: "fixture-owner", email: "fixture@example.invalid" } },
        error: null,
      }),
    },
    from: (table) => {
      const q = {
        select() {
          return q;
        },
        eq() {
          return q;
        },
        abortSignal() {
          return q;
        },
        retry() {
          return q;
        },
        maybeSingle: async () => ({ data: { role }, error: null }),
        order() {
          return q;
        },
        limit: async () => ({ data: [], error: null }),
      };
      return q;
    },
  };
  return { db, calls };
}
test("a cleanup schedule is absent by default and needs explicit rollout, execution and strong secret", () => {
  assert.deepEqual(assessmentCleanupSchedule({}), {});
  assert.throws(
    () => assessmentCleanupSchedule({ LT_ASSESSMENT_CLEANUP_SCHEDULE: "enabled" }),
    /requires/,
  );
  assert.throws(
    () =>
      assessmentCleanupSchedule({
        LT_ASSESSMENT_CLEANUP_SCHEDULE: "enabled",
        LT_ASSESSMENT_CLEANUP_EXECUTION: "enabled",
        CRON_SECRET: "short",
      }),
    /requires/,
  );
  const env = {
    LT_ASSESSMENT_CLEANUP_SCHEDULE: "enabled",
    LT_ASSESSMENT_CLEANUP_EXECUTION: "enabled",
    CRON_SECRET: secret,
  };
  assert.deepEqual(assessmentCleanupSchedule(env), {
    crons: [{ path: "/api/exam-cleanup", schedule: "15 0 * * *" }],
  });
  assert.throws(
    () => assessmentCleanupSchedule({ ...env, LT_DEPLOYMENT_STAGE: "preview" }),
    /preview/,
  );
});
test("staging deployment cannot target production or skip production-domain assignment", () => {
  const scripts = JSON.parse(readFileSync("package.json", "utf8")).scripts;
  assert.doesNotMatch(scripts["deploy:stage"], /--prod|--skip-domain/);
  assert.match(scripts["deploy:stage"], /build:stage/);
  assert.match(scripts["deploy:prod"], /--prod/);
});
test("operator authorization rejects missing, wrong, short and mismatched-byte tokens", async () => {
  const { cleanupCronAuthorized } = await load();
  assert.equal(cleanupCronAuthorized(request(), secret), true);
  for (const [token, key] of [
    [null, secret],
    ["wrong", secret],
    [secret, undefined],
    ["short", "short"],
    ["é".repeat(32), "a".repeat(32)],
  ])
    assert.equal(cleanupCronAuthorized(request(token), key), false);
});
test("unauthorized and disabled cron requests never construct a database or claim work", async () => {
  const { handleCleanup } = await load();
  const db = () => {
    throw new Error("must not construct db");
  };
  assert.equal((await handleCleanup(request(null), {}, db)).status, 401);
  assert.equal((await handleCleanup(request(), { CRON_SECRET: secret }, db)).status, 503);
});
test("an enabled authenticated empty invocation records actual run start and finish", async () => {
  const { handleCleanup } = await load();
  const f = fixture();
  const r = await handleCleanup(
    request(),
    { CRON_SECRET: secret, LT_ASSESSMENT_CLEANUP_EXECUTION: "enabled" },
    () => f.db,
  );
  assert.equal(r.status, 200);
  assert.equal((await r.json()).selected, 0);
  assert.equal(r.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(
    f.calls.filter((c) => c[0] !== "storage").map((c) => c[0]),
    [
      "assessment_begin_cleanup_run",
      "assessment_claim_speech_cleanup",
      "assessment_finish_cleanup_run",
    ],
  );
});
test("another live cleanup lease produces a busy response without touching storage", async () => {
  const { handleCleanup } = await load();
  const f = fixture({ busy: true });
  const r = await handleCleanup(
    request(),
    { CRON_SECRET: secret, LT_ASSESSMENT_CLEANUP_EXECUTION: "enabled" },
    () => f.db,
  );
  assert.equal(r.status, 202);
  assert.equal(f.calls.length, 1);
});
test("worker and run-finalization errors cannot return success", async () => {
  const { handleCleanup } = await load();
  for (const opts of [{ claimError: true }, { finishError: true }]) {
    const f = fixture(opts);
    assert.equal(
      (
        await handleCleanup(
          request(),
          { CRON_SECRET: secret, LT_ASSESSMENT_CLEANUP_EXECUTION: "enabled" },
          () => f.db,
        )
      ).status,
      503,
    );
  }
});
test("run-history access requires the platform owner, not a team administrator", async () => {
  const { handleCleanup } = await load();
  const denied = await handleCleanup(
    request("jwt", "?view=status"),
    {},
    () => fixture({ role: "admin" }).db,
  );
  assert.equal(denied.status, 403);
  const allowed = await handleCleanup(request("jwt", "?view=status"), {}, () => fixture().db);
  assert.equal(allowed.status, 200);
  assert.equal((await allowed.json()).health, "not_observed");
});
test("health distinguishes absent, operator-only, running, failed and overdue scheduled invocations", () => {
  const now = Date.parse("2026-10-16T12:00:00Z");
  const run = {
    source: "scheduled_endpoint",
    status: "succeeded",
    started_at: "2026-10-16T00:15:00Z",
    finished_at: "2026-10-16T00:15:10Z",
  };
  assert.equal(cleanupRunHealth([], now), "not_observed");
  assert.equal(cleanupRunHealth([{ ...run, source: "operator" }], now), "not_observed");
  assert.equal(cleanupRunHealth([run], now), "healthy");
  assert.equal(cleanupRunHealth([{ ...run, status: "failed" }], now), "attention");
  assert.equal(cleanupRunHealth([{ ...run, finished_at: "2026-10-14T00:00:00Z" }], now), "overdue");
  assert.equal(
    cleanupRunHealth([{ ...run, status: "running", started_at: "2026-10-16T11:59:00Z" }], now),
    "running",
  );
  assert.equal(
    cleanupRunHealth([{ ...run, status: "running", started_at: "2026-10-16T11:50:00Z" }], now),
    "attention",
  );
});
