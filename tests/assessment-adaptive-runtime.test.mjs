import assert from "node:assert/strict";
import test from "node:test";
import { loadModule } from "./helpers/bundle.mjs";
import { routingFixture } from "./helpers/routing-fixture.mjs";
import { supportCheckFixture } from "./helpers/support-check-fixture.mjs";
const stubs = [/^@tanstack\/react-start\/server-only$/];
const { adaptivePreviewRuntimeEnabled, adaptiveFormAvailable, adaptiveReadyForms } =
  await loadModule("src/lib/assessments/runtime-server.ts", { stubs });
const { listEnrollments, readinessCatalog } = await loadModule("src/lib/assessments/server.ts", {
  stubs,
});
async function capability(run, value = "true", stage = "preview") {
  const keys = ["LT_EXAMS_ADAPTIVE_RUNTIME_ENABLED", "VERCEL_ENV"],
    old = keys.map((key) => process.env[key]);
  process.env.LT_EXAMS_ADAPTIVE_RUNTIME_ENABLED = value;
  process.env.VERCEL_ENV = stage;
  try {
    return await run();
  } finally {
    keys.forEach((key, i) => {
      if (old[i] === undefined) delete process.env[key];
      else process.env[key] = old[i];
    });
  }
}
function formRow(id = "local-form", checkpoint = "entrance") {
  const { form } = routingFixture();
  form.id = id;
  form.checkpoint = checkpoint;
  form.status = "verified";
  for (const item of form.items.filter((item) => item.audioRequired))
    item.audioAsset = { sha256: "a".repeat(64), bytes: 32, mime: "audio/wav" };
  return {
    id,
    release_id: "controlled-release",
    checkpoint,
    purpose: "module",
    status: "verified",
    calibrated: true,
    version: form.version,
    rubric_version: form.rubricVersion,
    definition: form,
  };
}
const context = {
  program_scope: "full_module",
  target_language: "Spanish",
  instruction_language: "English",
};
const releases = [
  { id: "controlled-release", target_language: "Spanish", instruction_language: "English" },
];

test("runtime capability is exact, Preview-only and default-off readiness performs no extra bank reads", async () => {
  for (const [value, stage] of [
    ["false", "preview"],
    ["TRUE", "preview"],
    ["", "preview"],
    ["true", "production"],
    ["true", "development"],
  ])
    await capability(
      async () => {
        assert.equal(adaptivePreviewRuntimeEnabled(), false);
        assert.equal(adaptiveFormAvailable(formRow(), context, "entrance"), false);
        const ready = await adaptiveReadyForms(
          {
            from() {
              assert.fail("Disabled capability must not read definitions");
            },
          },
          releases,
        );
        assert.equal(ready.size, 0);
      },
      value,
      stage,
    );
});

test("adaptive availability requires exact reviewed whole-form identity/pair/scope, valid policy and clips", async () =>
  capability(async () => {
    assert.equal(adaptiveFormAvailable(formRow(), context, "entrance"), true);
    for (const mode of [
      "status",
      "calibration",
      "id",
      "version",
      "rubric",
      "pair",
      "checkpoint",
      "null",
      "policy",
      "unused-rubric",
      "clip",
      "scope",
      "empty-version",
      "empty-rubric",
    ]) {
      const row = formRow(),
        enrollment = { ...context };
      if (mode === "status") row.definition.status = "draft";
      if (mode === "calibration") row.calibrated = false;
      if (mode === "id") row.id = "changed";
      if (mode === "version") row.version = "changed";
      if (mode === "rubric") row.rubric_version = "changed";
      if (mode === "pair") enrollment.target_language = "French";
      if (mode === "checkpoint") row.definition.checkpoint = "day45";
      if (mode === "null") row.definition.routing = null;
      if (mode === "policy") row.definition.routing.minimumEvidence = 999;
      if (mode === "unused-rubric") {
        row.definition.items.at(-1).type = "production";
        delete row.definition.items.at(-1).rubric;
      }
      if (mode === "clip")
        delete row.definition.items.find((item) => item.audioRequired).audioAsset;
      if (mode === "scope") enrollment.program_scope = "support_units";
      if (mode === "empty-version") row.version = row.definition.version = "";
      if (mode === "empty-rubric") row.rubric_version = row.definition.rubricVersion = " ";
      assert.equal(adaptiveFormAvailable(row, enrollment, "entrance"), false, mode);
    }
  }));

test("adaptive readiness discovers metadata then reads at most ten private definitions per batch and emits only availability", async () =>
  capability(async () => {
    const f = await supportCheckFixture();
    f.rows.assessment_forms = Array.from({ length: 25 }, (_, i) => formRow(`local-form-${i}`));
    const ready = await adaptiveReadyForms(f.db, releases);
    assert.deepEqual([...ready], ["controlled-release:entrance"]);
    assert.deepEqual(
      f.queries
        .filter((q) => q.columns.includes(",definition"))
        .map((q) => q.filters.find(([name]) => name === "id")[1].length),
      [10, 10, 5],
    );
    assert.equal(f.queries[0].columns, "id,release_id,checkpoint");
    assert.ok(!JSON.stringify([...ready]).includes("private-fixture-answer"));
  }));

test("readiness fails closed without partial availability on later storage errors, duplicate rows or discovery limits", async () =>
  capability(async () => {
    for (const mode of ["late-error", "duplicate", "limit"]) {
      const f = await supportCheckFixture();
      f.rows.assessment_forms = Array.from({ length: mode === "limit" ? 601 : 12 }, (_, i) =>
        formRow(`local-form-${i}`),
      );
      if (mode === "duplicate") f.rows.assessment_forms[1].id = f.rows.assessment_forms[0].id;
      if (mode === "late-error") {
        const from = f.db.from;
        let reads = 0;
        f.db.from = (table) => {
          const q = from(table),
            select = q.select;
          q.select = (columns) => {
            if (columns.includes(",definition") && ++reads === 2)
              f.errors.assessment_forms = { message: "Synthetic later batch error" };
            return select(columns);
          };
          return q;
        };
      }
      await assert.rejects(adaptiveReadyForms(f.db, releases), { status: 503 }, mode);
    }
  }));

test("catalog and owned overview use the same gated adaptive readiness while keeping private forms out of responses", async () =>
  capability(async () => {
    const f = await supportCheckFixture();
    f.enrollment.program_scope = "full_module";
    f.rows.assessment_forms = ["entrance", "day45", "day90"].map((cp) =>
      formRow(`local-${cp}`, cp),
    );
    const overview = await listEnrollments(f.db, "learner");
    assert.ok(overview.enrollments[0].checkpoints.every((cp) => cp.ready === true));
    const tracks = await readinessCatalog(f.db, "Spanish", "English"),
      roofing = tracks.find((row) => row.moduleId === "roofing");
    assert.equal(roofing.calibrated, true);
    assert.equal(roofing.status, "verified");
    assert.ok(!JSON.stringify({ overview, tracks }).includes("private-fixture-answer"));
    await capability(async () => {
      const hidden = await listEnrollments(f.db, "learner");
      assert.ok(hidden.enrollments[0].checkpoints.every((cp) => cp.ready === false));
    }, "false");
  }));
