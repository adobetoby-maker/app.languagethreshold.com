import test from "node:test";
import assert from "node:assert/strict";
import { loadModule } from "./helpers/bundle.mjs";
const { teamAssessmentInsights } = await loadModule("src/lib/assessments/team-insights-server.ts", {
  stubs: [/^@tanstack\/react-start\/server-only$/],
});
const { lessonReviewSnapshot, lessonReviewFingerprint } = await loadModule(
  "src/lib/lesson-review.ts",
);
async function fixture() {
  const snapshot = lessonReviewSnapshot("roofing", "Spanish", "English"),
    fingerprint = await lessonReviewFingerprint(snapshot);
  const rows = {
    team_members: { role: "admin", status: "active" },
    assessment_releases: [
      {
        id: "fictional-release",
        module_id: "roofing",
        target_language: "Spanish",
        instruction_language: "English",
        status: "verified",
        lesson_manifest: { reviewed: true, lessonSnapshotFingerprint: fingerprint },
      },
    ],
    assessment_lesson_snapshots: { snapshot_text: JSON.stringify(snapshot), fingerprint },
    assessment_forms: [
      {
        id: "fictional-form",
        version: "v1",
        rubric_version: "r1",
        definition: {
          items: [1, 2, 3].map((n) => ({
            id: `i${n}`,
            objectiveId: `roofing.lesson.${n}`,
            skill: "recall",
            maximum: 1,
            accepted: ["private-fixture-answer"],
          })),
        },
      },
    ],
  };
  const seen = [],
    rpcCalls = [];
  const db = {
    from(table) {
      seen.push(table);
      const result = () => ({ data: rows[table], error: null });
      const query = {
        select() {
          return query;
        },
        eq() {
          return query;
        },
        order() {
          return query;
        },
        limit() {
          return Promise.resolve(result());
        },
        maybeSingle() {
          return Promise.resolve(result());
        },
      };
      return query;
    },
    async rpc(name, args) {
      rpcCalls.push({ name, args });
      return {
        data: {
          status: "available",
          learners: Array.from({ length: 5 }, (_, i) => ({
            learnerId: `fictional-${i}`,
            attemptState: "completed",
            evidence: rows.assessment_forms[0].definition.items.map((item) => ({
              itemId: item.id,
              objectiveId: item.objectiveId,
              skill: item.skill,
              maximum: item.maximum,
              points: 1,
              state: "scored",
              source: "deterministic",
            })),
          })),
        },
        error: null,
      };
    },
  };
  return { rows, db, seen, rpcCalls };
}
const run = (f) =>
  teamAssessmentInsights(f.db, "admin", "team", "roofing", "Spanish", "English", "entrance");
test("insights reject members/nonmembers before any release or evidence query", async () => {
  for (const role of [
    null,
    { role: "learner", status: "active" },
    { role: "admin", status: "inactive" },
  ]) {
    const f = await fixture();
    f.rows.team_members = role;
    await assert.rejects(run(f), (error) => error.status === 403);
    assert.deepEqual(f.seen, ["team_members"]);
    assert.deepEqual(f.rpcCalls, []);
  }
});
test("draft or stale content produces readiness state without querying learner evidence", async () => {
  for (const state of ["draft", "stale", "no-form"]) {
    const f = await fixture();
    if (state === "draft") f.rows.assessment_releases = [];
    if (state === "stale") f.rows.assessment_lesson_snapshots.fingerprint = "stale";
    if (state === "no-form") f.rows.assessment_forms = [];
    const result = await run(f);
    assert.equal(result.status, "content_pending");
    assert.equal(result.learnerCount, null);
    assert.deepEqual(result.items, []);
    assert.deepEqual(f.rpcCalls, []);
  }
});
test("reviewed same-version evidence emits only protected aggregate metadata", async () => {
  const f = await fixture(),
    result = await run(f);
  assert.equal(result.status, "available");
  assert.equal(result.formVersion, "v1");
  assert.equal(result.items.find((row) => row.id === "skill:recall").meanScore, 100);
  assert.deepEqual(f.rpcCalls, [
    {
      name: "assessment_team_insight_evidence",
      args: { p_actor: "admin", p_org: "team", p_form: "fictional-form" },
    },
  ]);
  for (const marker of [
    "fictional-0",
    "private-fixture-answer",
    "accepted",
    "evidence",
    "learnerId",
  ])
    assert.equal(JSON.stringify(result).includes(marker), false);
});
test("missing objective mapping cannot be reported as learner weakness", async () => {
  const f = await fixture();
  f.rows.assessment_forms[0].definition.items[0].objectiveId = "different-module.lesson.1";
  await assert.rejects(run(f), (error) => error.status === 503);
  assert.deepEqual(f.rpcCalls, []);
});

test("same-language insight scopes are invalid rather than missing curriculum", async () => {
  for (const [target, native] of [
    ["Spanish", "Spanish"],
    ["Chinese", "Chinese (Simplified)"],
  ]) {
    const f = await fixture();
    await assert.rejects(
      teamAssessmentInsights(f.db, "admin", "team", "roofing", target, native, "entrance"),
      (error) => error.status === 400,
    );
    assert.deepEqual(f.seen, ["team_members"]);
  }
});
