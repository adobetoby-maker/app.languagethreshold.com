import test from "node:test";
import assert from "node:assert/strict";
import { loadModule } from "./helpers/bundle.mjs";
import { routingFixture } from "./helpers/routing-fixture.mjs";
const { teamAssessmentInsights } = await loadModule("src/lib/assessments/team-insights-server.ts", {
  stubs: [/^@tanstack\/react-start\/server-only$/],
});
const { lessonReviewSnapshot, lessonReviewFingerprint } = await loadModule(
  "src/lib/lesson-review.ts",
);
const { currentLessonReviewSnapshot } = await loadModule("src/lib/lesson-review-server.ts", {
  stubs: [/^@tanstack\/react-start\/server-only$/],
});
async function fixture() {
  const snapshot = currentLessonReviewSnapshot("roofing", "Spanish", "English"),
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
        retry(enabled) {
          assert.equal(enabled, false);
          return this;
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

async function adaptiveFixture() {
  const f = await fixture(),
    { form } = routingFixture(),
    row = f.rows.assessment_forms[0];
  form.id = row.id;
  form.version = row.version;
  form.rubricVersion = row.rubric_version;
  for (const item of form.items) {
    item.objectiveId = item.id.startsWith("core-")
      ? `roofing.lesson.${item.id.at(-1)}`
      : "roofing.lesson.4";
  }
  row.definition = form;
  const learners = Array.from({ length: 5 }, (_, index) => ({
    learnerId: `fictional-${index}`,
    attemptState: "completed",
    evidence: [
      ...form.items
        .filter((item) => form.routing.coreItemIds.includes(item.id))
        .map((item) => ({
          itemId: item.id,
          objectiveId: item.objectiveId,
          skill: item.skill,
          maximum: item.maximum,
          points: 1,
          state: "scored",
          source: "human",
        })),
      {
        itemId: form.routing.branches[index % 3].itemIds[0],
        objectiveId: "roofing.lesson.4",
        skill: "recognition",
        maximum: 1,
        points: 0,
        state: "scored",
        source: "human",
      },
    ],
  }));
  f.db.rpc = async (name, args) => {
    f.rpcCalls.push({ name, args });
    return { data: { status: "available", learners }, error: null };
  };
  return { ...f, form, learners };
}

test("adaptive team patterns use the shared core without inventing missing unused branches", async () => {
  const f = await adaptiveFixture(),
    report = await run(f);
  assert.equal(report.status, "available");
  assert.equal(report.evidenceScope, "fixed_core");
  assert.equal(report.learnerCount, 5);
  const skills = report.items.filter((item) => item.kind === "skill");
  assert.equal(skills.length, 6);
  assert.ok(skills.every((item) => item.meanScore === 100 && item.counts.scored === 5));
  assert.ok(!report.items.some((item) => item.objectiveId === "roofing.lesson.4"));
  for (const marker of [
    "coreItemIds",
    "branch-band",
    "private-fixture-answer",
    "accepted",
    "learnerId",
    "fictional-0",
  ])
    assert.ok(!JSON.stringify(report).includes(marker), marker);
});

test("different adaptive branch results cannot change a fixed-core cohort pattern", async () => {
  const f = await adaptiveFixture(),
    before = await run(f);
  for (const learner of f.learners) {
    learner.evidence.at(-1).itemId = "branch-more-evidence";
    learner.evidence.at(-1).points = 1;
    learner.evidence.at(-1).objectiveId = "roofing.lesson.5";
  }
  assert.deepEqual(await run(f), before);
});

test("unavailable core evidence stays insufficient and small review categories remain suppressed", async () => {
  const missing = await adaptiveFixture();
  for (const learner of missing.learners) {
    const row = learner.evidence.find((item) => item.itemId === "core-listening-1");
    row.state = "not_assessed";
    row.points = null;
  }
  const missingReport = await run(missing),
    listening = missingReport.items.find((item) => item.id === "skill:listening");
  assert.equal(listening.meanScore, null);
  assert.equal(listening.counts.insufficient_coverage, 5);
  const review = await adaptiveFixture(),
    row = review.learners[0].evidence[0];
  row.state = "needs_review";
  row.points = null;
  const cell = (await run(review)).items.find((item) => item.id === "skill:recognition");
  assert.equal(cell.visibility, "suppressed");
  assert.equal(cell.counts, null);
  assert.equal(cell.meanScore, null);
});

test("adaptive insight policy, version and all-branch mappings fail closed before learner evidence", async () => {
  for (const change of [
    (f) => (f.form.routing = null),
    (f) => (f.form.version = "wrong-version"),
    (f) => (f.form.rubricVersion = "wrong-rubric"),
    (f) => (f.form.checkpoint = "day90"),
    (f) => (f.form.targetLanguage = "French"),
    (f) => (f.form.routing.coreItemIds[0] = "missing-core"),
    (f) => (f.form.routing.bands[0].maximumPercent = 99),
    (f) => (f.form.items.at(-1).objectiveId = "different-module.lesson.1"),
  ]) {
    const f = await adaptiveFixture();
    change(f);
    await assert.rejects(run(f), { status: 503 });
    assert.equal(f.rpcCalls.length, 0);
  }
});
