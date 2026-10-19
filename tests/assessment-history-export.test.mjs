import test from "node:test";
import assert from "node:assert/strict";
import { loadModule } from "./helpers/bundle.mjs";
import { assessmentAuditSummary } from "../src/lib/assessments/audit.ts";
const { assessmentHistoryCsv } = await loadModule("src/lib/assessments/history-export-server.ts", {
  stubs: [/^@tanstack\/react-start\/server-only$/],
});
const id = (n) => `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
function fixture(count = 503) {
  const records = Array.from({ length: count }, (_, n) => ({
    id: id(n + 1),
    actor_id: "learner",
    action: "attempt.saved",
    created_at: "2026-10-16T12:00:00Z",
    detail: {
      reason: "Recorded reason",
      answer: "private-answer-marker",
      payloadHash: "private-hash-marker",
    },
  })).reverse();
  const state = {
    records,
    scope: "team",
    owner: "learner",
    roleCalls: 0,
    eventCalls: 0,
    queries: [],
    assignments: [],
    failPage: 0,
    revoke: false,
  };
  const db = {
    from(table) {
      const filters = {},
        settings = { limit: 0, after: null, ids: null };
      const query = {
        select() {
          return query;
        },
        eq(key, value) {
          filters[key] = value;
          return query;
        },
        order() {
          return query;
        },
        limit(n) {
          settings.limit = n;
          return query;
        },
        or(value) {
          settings.after = value.match(/id.lt.([a-f0-9-]+)/)?.[1];
          assert.ok(settings.after);
          return query;
        },
        in(key, values) {
          settings.ids = values;
          return query;
        },
        retry(enabled) { assert.equal(enabled, false); return this; },
        async maybeSingle() {
          if (table === "assessment_enrollments")
            return {
              data: {
                id: "plan",
                module_id: "roofing",
                scope: state.scope,
                user_id: state.owner,
                organization_id: state.scope === "team" ? "team" : null,
                instruction_language: "English",
                target_language: "Spanish",
                timezone: "America/Denver",
              },
              error: null,
            };
          if (table === "team_members") {
            state.roleCalls++;
            return {
              data:
                state.revoke && state.roleCalls > 1 ? null : { role: "admin", status: "active" },
              error: null,
            };
          }
          throw new Error("Unexpected single " + table);
        },
        then(resolve, reject) {
          return Promise.resolve()
            .then(() => {
              state.queries.push({ table, filters: { ...filters }, settings: { ...settings } });
              if (table === "assessment_events") {
                state.eventCalls++;
                if (state.failPage === state.eventCalls)
                  return { data: null, error: { message: "read failed" } };
                return {
                  data: state.records
                    .filter((row) => !settings.after || row.id < settings.after)
                    .slice(0, settings.limit),
                  error: null,
                };
              }
              if (table === "assessment_support_assignments")
                return {
                  data: state.assignments.filter(
                    (row) =>
                      row.enrollment_id === filters.enrollment_id && settings.ids.includes(row.id),
                  ),
                  error: null,
                };
              throw new Error("Unexpected table " + table);
            })
            .then(resolve, reject);
        },
      };
      return query;
    },
  };
  return { db, state };
}
test("audit whitelist captures assignment decisions, source attempts and previous status without raw payload", () => {
  const value = assessmentAuditSummary(
    {
      id: "event",
      actor_id: "other",
      action: "support.changed",
      created_at: "date",
      detail: {
        before: "active",
        status: "paused",
        sourceAttemptId: "source",
        assignmentId: "assignment",
        result: { decision: "approved", recommendationId: "rec" },
        suggestedLesson: 4,
        focusWays: ["hear", "write", "raw-secret"],
        answer: "private-marker",
        payloadHash: "private-hash",
      },
    },
    "actor",
  );
  assert.equal(value.previousState, "active");
  assert.equal(value.state, "paused");
  assert.equal(value.attemptId, "source");
  assert.equal(value.assignmentId, "assignment");
  assert.deepEqual(value.focusWays, ["hear", "write"]);
  assert.equal(JSON.stringify(value).includes("private-"), false);
  assert.equal(JSON.stringify(value).includes("raw-secret"), false);
});
test("history export reads beyond the visible page and keeps equal-time events exactly once", async () => {
  const f = fixture();
  const result = await assessmentHistoryCsv(f.db, "admin", "plan");
  assert.equal(result.eventCount, 503);
  assert.equal(result.csv.split("\r\n").length, 504);
  assert.equal(f.state.eventCalls, 2);
  assert.equal(f.state.roleCalls, 2);
  assert.ok(f.state.queries.every((query) => query.filters.enrollment_id === "plan"));
  assert.equal(result.csv.includes("private-answer-marker"), false);
  assert.equal(result.csv.includes("private-hash-marker"), false);
  for (const row of f.state.records) assert.equal(result.csv.split(`"${row.id}"`).length - 1, 1);
});
test("export joins only this plan's frozen assignment snapshot, not a foreign assignment", async () => {
  const f = fixture(2);
  f.state.records[0].detail = {
    assignmentId: "own",
    before: "active",
    status: "completed",
    reason: "=SUM(A1)",
  };
  f.state.records[1].detail = { assignmentId: "foreign" };
  f.state.assignments = [
    {
      id: "own",
      enrollment_id: "plan",
      capability_snapshot: {
        moduleId: "construction-safety",
        title: "Reviewed support",
        lessonIds: ["construction-safety.lesson.2"],
        rawSecret: "private-snapshot",
      },
      mode: "units",
      primary_weekly_minutes: 100,
      support_weekly_minutes: 20,
      support_cap_percent: 20,
    },
    {
      id: "foreign",
      enrollment_id: "other-plan",
      capability_snapshot: { title: "foreign-title-secret" },
    },
  ];
  const result = await assessmentHistoryCsv(f.db, "admin", "plan");
  assert.match(result.csv, /construction-safety.lesson.2/);
  assert.match(result.csv, /Frozen approval snapshot/);
  assert.match(result.csv, /Unavailable in this plan/);
  assert.match(result.csv, /'=SUM\(A1\)/);
  for (const marker of ["private-snapshot", "foreign-title-secret"])
    assert.equal(result.csv.includes(marker), false);
});
test("personal ownership and membership revocation are checked before returning any file", async () => {
  const own = fixture(0);
  own.state.scope = "personal";
  await assert.rejects(
    assessmentHistoryCsv(own.db, "admin", "plan"),
    (error) => error.status === 403,
  );
  assert.equal(own.state.eventCalls, 0);
  const revoked = fixture(2);
  revoked.state.revoke = true;
  await assert.rejects(
    assessmentHistoryCsv(revoked.db, "admin", "plan"),
    (error) => error.status === 403,
  );
  assert.equal(revoked.state.roleCalls, 2);
});
test("a later page error or over-limit history returns no partial CSV", async () => {
  const failed = fixture(503);
  failed.state.failPage = 2;
  await assert.rejects(
    assessmentHistoryCsv(failed.db, "admin", "plan"),
    (error) => error.status === 503 && /No partial file/.test(error.message),
  );
  const large = fixture(10001);
  await assert.rejects(
    assessmentHistoryCsv(large.db, "admin", "plan"),
    (error) => error.status === 413,
  );
  assert.equal(large.state.eventCalls, 20);
});
test("cancellation before a read and empty history do not invent events", async () => {
  const canceled = fixture(3),
    controller = new AbortController();
  controller.abort();
  await assert.rejects(
    assessmentHistoryCsv(canceled.db, "admin", "plan", controller.signal),
    (error) => error.name === "AbortError",
  );
  assert.equal(canceled.state.eventCalls, 0);
  const empty = fixture(0),
    result = await assessmentHistoryCsv(empty.db, "admin", "plan");
  assert.equal(result.eventCount, 0);
  assert.equal(result.through, null);
  assert.equal(result.csv.split("\r\n").length, 1);
});
