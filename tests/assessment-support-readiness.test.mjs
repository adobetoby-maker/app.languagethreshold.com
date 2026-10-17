import assert from "node:assert/strict";
import test from "node:test";
import { loadModule } from "./helpers/bundle.mjs";
import { supportCheckFixture } from "./helpers/support-check-fixture.mjs";
const { listEnrollments, supportingChecks } = await loadModule("src/lib/assessments/server.ts", {
  stubs: [/^@tanstack\/react-start\/server-only$/],
});

test("targeted overview uses pinned before/after checks without substituting full-module exams or exposing keys", async () => {
  const f = await supportCheckFixture();
  f.forms.push(
    ...["entrance", "day45", "day90"].map((checkpoint) => ({
      id: `module-${checkpoint}`,
      release_id: f.cap.release_id,
      checkpoint,
      purpose: "module",
      status: "verified",
      calibrated: true,
    })),
  );
  const report = await listEnrollments(f.db, "learner");
  assert.deepEqual(
    report.enrollments[0].checkpoints.map((cp) => cp.ready),
    [true, false, true],
  );
  const text = JSON.stringify(report);
  assert.doesNotMatch(
    text,
    /CONTROLLED_PRIVATE|acceptedAnswers|controlled-before|controlled-after/,
  );
  assert.ok(
    f.queries
      .find((q) => q.table === "assessment_forms" && q.columns.includes("definition"))
      .filters.some(([column, ids]) => column === "id" && ids.length === 2),
  );
  f.forms[0].status = "retired";
  assert.deepEqual(
    (await listEnrollments(f.db, "learner")).enrollments[0].checkpoints.map((cp) => cp.ready),
    [false, false, true],
  );
});

test("full-module support enrollments keep their three module exams, independent of targeted forms", async () => {
  const f = await supportCheckFixture();
  f.enrollment.program_scope = "full_module";
  f.forms.push(
    ...["entrance", "day45", "day90"].map((checkpoint) => ({
      id: `module-${checkpoint}`,
      release_id: f.cap.release_id,
      checkpoint,
      purpose: "module",
      status: "verified",
      calibrated: true,
    })),
  );
  const report = await listEnrollments(f.db, "learner");
  assert.deepEqual(
    report.enrollments[0].checkpoints.map((cp) => cp.ready),
    [true, true, true],
  );
  assert.equal(
    f.queries.some((q) => q.table === "assessment_support_capabilities"),
    false,
  );
});

test("a missing unit, substituted capability/form/release or foreign snapshot cannot advertise targeted readiness", async () => {
  for (const mutate of [
    (f) => f.forms[0].definition.items.pop(),
    (f) => (f.forms[0].support_capability_id = "different-cap"),
    (f) => (f.forms[0].purpose = "module"),
    (f) => (f.forms[0].release_id = "different-release"),
    (f) => (f.cap.before_form_id = "different-form"),
    (f) => (f.cap.status = "retired"),
    (f) => (f.assignment.capability_snapshot.version = "old"),
    (f) => (f.assignment.capability_snapshot.moduleId = "landscaper"),
    (f) => (f.assignment.capability_snapshot.targetLanguage = "French"),
    (f) => (f.assignment.capability_snapshot.lessonIds = ["roofing.lesson.99"]),
    (f) => {
      f.cap.lesson_ids = ["roofing.lesson.99"];
      f.assignment.capability_snapshot.lessonIds = ["roofing.lesson.99"];
      f.forms[0].definition.items = [{ objectiveId: "roofing.lesson.99" }];
    },
    (f) => (f.assignment.user_id = "another-learner"),
    (f) => (f.assignment.organization_id = "another-team"),
    (f) => (f.assignment.status = "paused"),
    (f) => f.rows.assessment_support_assignments.push(structuredClone(f.assignment)),
  ]) {
    const f = await supportCheckFixture();
    mutate(f);
    assert.equal(
      (await listEnrollments(f.db, "learner")).enrollments[0].checkpoints[0].ready,
      false,
    );
  }
});

test("unreviewed lessons and failed support metadata reads remain unavailable without hiding the failure", async () => {
  const f = await supportCheckFixture();
  f.rows.assessment_releases[0].lesson_manifest.reviewed = false;
  assert.equal(
    (await listEnrollments(f.db, "learner")).enrollments[0].checkpoints.some((cp) => cp.ready),
    false,
  );
  for (const table of [
    "assessment_support_capabilities",
    "assessment_support_assignments",
    "assessment_forms",
  ]) {
    const broken = await supportCheckFixture();
    broken.errors[table] = { message: "controlled failure" };
    await assert.rejects(listEnrollments(broken.db, "learner"), (error) => error.status === 503);
  }
  const bounded = await supportCheckFixture();
  await assert.rejects(
    supportingChecks(bounded.db, Array(51).fill(bounded.enrollment)),
    (error) => error.status === 503,
  );
});

test("actor denial precedes support reads and QA access cannot turn a draft form into official readiness", async () => {
  const f = await supportCheckFixture();
  await assert.rejects(listEnrollments(f.db, "outsider"), (error) => error.status === 403);
  assert.equal(f.queries.length, 0);
  const old = process.env.LT_EXAMS_PILOT_USER_IDS;
  process.env.LT_EXAMS_PILOT_USER_IDS = "learner";
  try {
    f.forms[0].status = "draft";
    f.forms[0].calibrated = false;
    const cp = (await listEnrollments(f.db, "learner")).enrollments[0].checkpoints[0];
    assert.equal(cp.ready, false);
    assert.equal(cp.pilotReady, true);
  } finally {
    if (old === undefined) delete process.env.LT_EXAMS_PILOT_USER_IDS;
    else process.env.LT_EXAMS_PILOT_USER_IDS = old;
  }
});

test("unsupported routing cannot advertise official or QA readiness in module or targeted overviews", async () => {
  for (const targeted of [true, false]) for (const routing of [null, { schema: 1 }, { schema: 99 }]) {
    const f = await supportCheckFixture();
    if (!targeted) {
      f.enrollment.program_scope = "full_module";
      for (const form of f.forms) form.purpose = "module";
    }
    for (const form of f.forms) form.definition.routing = routing;
    const report = await listEnrollments(f.db, "learner");
    for (const checkpoint of report.enrollments[0].checkpoints) {
      assert.equal(checkpoint.ready, false);
      assert.equal(checkpoint.pilotReady, false);
    }
  }
});
